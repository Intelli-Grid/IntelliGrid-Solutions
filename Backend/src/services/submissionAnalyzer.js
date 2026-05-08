// Backend/src/services/submissionAnalyzer.js
// Submission Agent — scores new tool submissions 0-100 using Groq LLaMA.
// Called as a fire-and-forget from submissionRoutes.js on every new submission.
// High-quality tools (>= AGENT_MIN_SCORE_APPROVE) are queued for welcome email.
// Low-quality tools (< 30) are queued for a polite rejection warning.
// All actions go into PendingAction — nothing is sent without admin approval.

import { groqJSON } from './groqClient.js'
import { agentLog, queueForApproval } from './agentOrchestrator.js'

const MIN_SCORE_APPROVE = parseInt(process.env.AGENT_MIN_SCORE_APPROVE || '70', 10)
const AGENT_NAME = 'submission'

/**
 * buildScoringPrompt — constructs the Groq prompt for quality scoring.
 */
function buildScoringPrompt(submission) {
    return `You are an AI tool directory curator scoring a new tool submission for quality.
Analyze this submission and return ONLY valid JSON — no markdown, no backticks, no explanation.

Tool Name: ${submission.toolName || 'Unknown'}
Website URL: ${submission.officialUrl || 'Not provided'}
Description: ${submission.shortDescription || submission.fullDescription || 'Not provided'}
Category: ${submission.category || 'Not specified'}
Pricing: ${submission.pricing || 'Not specified'}
Submitted by: ${submission.submittedBy?.email || 'Anonymous'}

Score this submission from 0 to 100 based on:
- name_clarity (0-20): Is the tool name clear and professional?
- description_quality (0-25): Is the description specific, non-generic, and informative?
- url_validity (0-20): Does the URL look like a real, live tool (not a placeholder)?
- category_fit (0-15): Does the tool fit a real AI tool category?
- uniqueness_signal (0-20): Does this appear to be a unique, non-duplicate tool?

Return EXACTLY this JSON (no extra fields):
{
  "totalScore": <integer 0-100>,
  "breakdown": {
    "name_clarity": <0-20>,
    "description_quality": <0-25>,
    "url_validity": <0-20>,
    "category_fit": <0-15>,
    "uniqueness_signal": <0-20>
  },
  "verdict": "<one of: excellent | good | borderline | poor>",
  "rejection_reason": "<brief reason if score < 50, empty string otherwise>",
  "suggested_tags": ["<2-4 relevant tags>"]
}`
}

/**
 * analyzeSubmission — main entry point.
 * Called from submissionRoutes.js as a non-blocking async task.
 *
 * @param {object} submission - The Mongoose Submission document
 */
export async function analyzeSubmission(submission) {
    try {
        await agentLog(
            AGENT_NAME,
            `🔍 Scoring submission: "${submission.toolName}"`,
            'info',
            { submissionId: submission._id?.toString() }
        )

        const prompt = buildScoringPrompt(submission)

        const result = await groqJSON(prompt, { max_tokens: 600, temperature: 0.1 }).catch(async (err) => {
            await agentLog(
                AGENT_NAME,
                `⚠️ Groq scoring failed: ${err.message}`,
                'warning',
                { submissionId: submission._id?.toString() }
            )
            return null
        })

        if (!result || typeof result.totalScore !== 'number') {
            await agentLog(
                AGENT_NAME,
                `⚠️ Could not score submission — invalid Groq response`,
                'warning',
                { submissionId: submission._id?.toString() }
            )
            return
        }

        const score = Math.max(0, Math.min(100, Math.round(result.totalScore)))

        // Persist score back to the Submission document
        try {
            const Submission = (await import('../models/Submission.js')).default
            await Submission.findByIdAndUpdate(submission._id, {
                agentScore: score,
                agentNotes: result.rejection_reason || '',
                agentRecommendation: score >= MIN_SCORE_APPROVE ? 'approve' : score < 30 ? 'reject' : 'review',
                agentProcessedAt: new Date(),
            })
        } catch (dbErr) {
            await agentLog(AGENT_NAME, `⚠️ Failed to persist score: ${dbErr.message}`, 'warning')
        }

        await agentLog(
            AGENT_NAME,
            `📊 Score: ${score}/100 (${result.verdict}) — "${submission.toolName}"`,
            score >= MIN_SCORE_APPROVE ? 'success' : score < 30 ? 'warning' : 'info',
            { submissionId: submission._id?.toString(), score, verdict: result.verdict }
        )

        // ── High quality: queue welcome email for admin approval ──────────────
        if (score >= MIN_SCORE_APPROVE) {
            await queueForApproval({
                agentName: AGENT_NAME,
                actionType: 'send_welcome_email',
                title: `Welcome email → ${submission.submittedBy?.email || 'submitter'} (score: ${score})`,
                description: [
                    `Tool: ${submission.toolName}`,
                    `Score: ${score}/100 — ${result.verdict}`,
                    `Breakdown: ${JSON.stringify(result.breakdown, null, 2)}`,
                    `Suggested tags: ${(result.suggested_tags || []).join(', ')}`,
                    '',
                    'Approving this will send a personalised welcome email to the submitter.',
                ].join('\n'),
                payload: {
                    to: submission.submittedBy?.email || '',
                    subject: `Your AI tool has been received — ${submission.toolName}`,
                    template: 'submission_welcome',
                    toolName: submission.toolName,
                    submissionId: submission._id?.toString(),
                    score,
                    suggestedTags: result.suggested_tags || [],
                },
            })

            await agentLog(
                AGENT_NAME,
                `✅ Welcome email queued for approval (score ${score} ≥ ${MIN_SCORE_APPROVE})`,
                'success'
            )
        }

        // ── Low quality: queue rejection for admin review ─────────────────────
        if (score < 30) {
            await queueForApproval({
                agentName: AGENT_NAME,
                actionType: 'reject_submission',
                title: `Low-quality submission flagged — score: ${score}/100`,
                description: [
                    `Tool: ${submission.toolName}`,
                    `Score: ${score}/100 — ${result.verdict}`,
                    `Reason: ${result.rejection_reason || 'Insufficient submission quality'}`,
                    `Breakdown: ${JSON.stringify(result.breakdown, null, 2)}`,
                    '',
                    'Approving this will mark the submission as rejected in the database.',
                ].join('\n'),
                payload: {
                    submissionId: submission._id?.toString(),
                    submissionName: submission.toolName,
                    reason: result.rejection_reason || 'Did not meet quality standards',
                    score,
                },
            })

            await agentLog(
                AGENT_NAME,
                `🚫 Low-quality submission queued for review (score ${score} < 30)`,
                'warning'
            )
        }

    } catch (err) {
        // Never throw — fire-and-forget analysis
        console.error('[SubmissionAgent] Unhandled error:', err.message)
        try {
            await agentLog(
                AGENT_NAME,
                `❌ Submission analysis crashed: ${err.message}`,
                'error',
                { submissionId: submission._id?.toString() }
            )
        } catch (_) {}
    }
}
