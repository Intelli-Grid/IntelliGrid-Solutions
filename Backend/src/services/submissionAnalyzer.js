// Backend/src/services/submissionAnalyzer.js
// War Room — Submission Intelligence Agent (Phase 2)
// Called non-blocking after a new Submission is created.
// Scores quality 0-100 via GPT-4o-mini, updates the Submission doc,
// and queues approval actions for high-quality and low-quality submissions.

import OpenAI from 'openai'
import Submission from '../models/Submission.js'
import { agentLog, queueForApproval, setAgentStatus } from './agentOrchestrator.js'

// ── OpenAI client — lazy init ────────────────────────────────────────────────
let _openai = null
function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set')
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

/**
 * Analyse a new tool submission using GPT-4o-mini.
 * Updates the Submission doc with the score, then queues approval actions.
 *
 * Call this AFTER creating the Submission document — non-blocking, fire-and-forget.
 *
 * @param {import('mongoose').Document} submission - The created Submission doc
 */
export async function analyzeSubmission(submission) {
  try {
    setAgentStatus('submission', 'running')
    await agentLog(
      'submission',
      `📥 Analyzing new submission: ${submission.toolName}`,
      'info',
      { submissionId: submission._id.toString(), url: submission.officialUrl }
    )

    if (!process.env.OPENAI_API_KEY) {
      await agentLog('submission', '⚠️ OPENAI_API_KEY not set — submission analysis skipped', 'warning')
      setAgentStatus('submission', 'idle')
      return
    }

    const openai = getOpenAI()
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    const minScore = parseInt(process.env.AGENT_MIN_SCORE_APPROVE) || 70

    // ── Build the analysis prompt ────────────────────────────────────────────
    const prompt = `You are a quality evaluator for IntelliGrid, an AI tools discovery directory.

Evaluate this AI tool submission and return a JSON object with EXACTLY these fields:
{
  "qualityScore": <number 0-100>,
  "isLegitimate": <boolean>,
  "category": "<one of: Writing, Image, Coding, Video, Audio, Productivity, Research, Marketing, Design, Data, Developer Tools, Other>",
  "summary": "<1-2 sentence honest assessment of the tool's quality and fit for an AI directory>",
  "recommendedAction": "<approve | review | reject>",
  "rejectionReason": "<short reason if reject, otherwise null>"
}

Scoring guide:
- 80-100: Clearly useful AI tool, good description, legitimate URL, real product
- 60-79: Decent tool, minor gaps (thin description, niche use case)
- 40-59: Questionable fit, vague description, or unclear if AI-powered
- 0-39: Spam, broken URL, non-AI tool, or clearly low quality

Tool submission details:
- Name: ${submission.toolName}
- URL: ${submission.officialUrl}
- Short description: ${submission.shortDescription}
- Full description: ${submission.fullDescription || 'Not provided'}
- Category: ${submission.category || 'Not specified'}
- Pricing: ${submission.pricing || 'Not specified'}
- Submitted by: ${submission.submittedBy?.name || 'Anonymous'} (${submission.submittedBy?.email || 'no email'})

Return ONLY the JSON object, no other text, no markdown fences.`

    // ── Call OpenAI ──────────────────────────────────────────────────────────
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const rawContent = completion.choices[0]?.message?.content || '{}'
    let analysis
    try {
      analysis = JSON.parse(rawContent)
    } catch {
      await agentLog(
        'submission',
        `⚠️ Failed to parse OpenAI response for "${submission.toolName}"`,
        'warning',
        { raw: rawContent.slice(0, 200) }
      )
      setAgentStatus('submission', 'idle')
      return
    }

    const {
      qualityScore = 50,
      isLegitimate = true,
      category = 'Other',
      summary = '',
      recommendedAction = 'review',
      rejectionReason = null,
    } = analysis

    // ── Update Submission doc with agent scores ───────────────────────────────
    await Submission.findByIdAndUpdate(submission._id, {
      agentScore: qualityScore,
      agentNotes: summary,
      agentRecommendation: recommendedAction,
      agentCategory: category,
      agentProcessedAt: new Date(),
    })

    const levelMap = { approve: 'success', review: 'warning', reject: 'warning' }
    await agentLog(
      'submission',
      `📊 Score: ${qualityScore}/100 — ${recommendedAction.toUpperCase()} — ${submission.toolName}`,
      levelMap[recommendedAction] || 'info',
      { score: qualityScore, recommendedAction, category, isLegitimate }
    )

    // ── High quality: queue welcome email for one-click sending ───────────────
    const submitterEmail = submission.submittedBy?.email
    if (qualityScore >= minScore && isLegitimate && submitterEmail) {
      await queueForApproval({
        agentName: 'submission',
        actionType: 'send_welcome_email',
        title: `Send welcome email to ${submission.toolName} founder`,
        description:
          `Quality score: ${qualityScore}/100\n` +
          `Category: ${category}\n` +
          `Assessment: ${summary}\n\n` +
          `Recipient: ${submitterEmail}`,
        payload: {
          to: submitterEmail,
          subject: `Your tool "${submission.toolName}" has been received — IntelliGrid`,
          html: buildWelcomeEmailHtml(submission.toolName, category),
          submissionId: submission._id.toString(),
        },
      })
    }

    // ── Very low quality: queue rejection for one-click confirm ───────────────
    if (qualityScore < 30 || !isLegitimate) {
      await queueForApproval({
        agentName: 'submission',
        actionType: 'reject_submission',
        title: `Reject submission: ${submission.toolName}`,
        description:
          `Quality score: ${qualityScore}/100\n` +
          `Legitimate: ${isLegitimate}\n` +
          `Reason: ${rejectionReason || 'Did not meet quality standards'}\n\n` +
          `Assessment: ${summary}`,
        payload: {
          submissionId: submission._id.toString(),
          submissionName: submission.toolName,
          reason: rejectionReason || 'Did not meet quality standards',
        },
      })
    }

    setAgentStatus('submission', 'idle')
  } catch (err) {
    await agentLog(
      'submission',
      `❌ Submission analyzer error for "${submission.toolName}": ${err.message}`,
      'error'
    )
    setAgentStatus('submission', 'error')
    console.error('[SubmissionAnalyzer] Error:', err.message)
  }
}

/**
 * Build the HTML for a welcome email sent to a high-quality submission founder.
 * @param {string} toolName
 * @param {string} category
 * @returns {string}
 */
function buildWelcomeEmailHtml(toolName, category) {
  return `
<div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0d0d1a;color:#fff;padding:32px;border-radius:16px">
  <h2 style="color:#a78bfa;margin-bottom:8px">Your Submission Was Received! 🎉</h2>
  <p style="color:#9ca3af">
    Thanks for submitting <strong style="color:#fff">${toolName}</strong> to IntelliGrid — 
    the AI tools discovery platform trusted by developers and knowledge workers worldwide.
  </p>
  <div style="background:#1a1a2e;border-radius:12px;padding:16px;margin:20px 0">
    <p style="margin:0;color:#6b7280;font-size:14px">Tool submitted</p>
    <p style="margin:4px 0 0;color:#fff;font-size:18px;font-weight:600">${toolName}</p>
    <p style="margin:4px 0 0;color:#a78bfa;font-size:13px">Category: ${category}</p>
  </div>
  <p style="color:#9ca3af">
    Our team will review it shortly. You'll receive an update once it goes live on the platform.
  </p>
  <a href="https://www.intelligrid.online"
     style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
    Explore IntelliGrid
  </a>
  <p style="color:#4b5563;font-size:12px;margin-top:24px">— The IntelliGrid Team</p>
</div>
  `.trim()
}
