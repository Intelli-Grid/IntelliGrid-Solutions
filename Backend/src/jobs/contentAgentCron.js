// Backend/src/jobs/contentAgentCron.js
// War Room — Content Agent (Phase 2)
// Runs every night at midnight UTC.
// Reads the top failed search terms (count >= 3, no blog drafted yet),
// generates SEO blog posts via OpenAI, saves them as drafts,
// and queues them for human approval before publishing.

import cron from 'node-cron'
import OpenAI from 'openai'
import FailedSearch from '../models/FailedSearch.js'
import BlogPost from '../models/BlogPost.js'
import Tool from '../models/Tool.js'
import User from '../models/User.js'
import { agentLog, queueForApproval, setAgentStatus } from '../services/agentOrchestrator.js'

// ── OpenAI client — lazy, initialised on first run ──────────────────────────
let _openai = null
function getOpenAI() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables')
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

/**
 * Slugify a title into a URL-safe slug + timestamp suffix to ensure uniqueness.
 * @param {string} title
 * @returns {string}
 */
function makeSlug(title) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 60)
  return `${base}-${Date.now()}`
}

/**
 * Find the admin user to use as the blog post author.
 * Falls back to SUPERADMIN if no 'admin' role user exists.
 * @returns {Promise<import('mongoose').Document|null>}
 */
async function getAdminAuthor() {
  const adminUser = await User.findOne({
    role: { $in: ['admin', 'SUPERADMIN'] },
  }).lean()
  return adminUser
}

/**
 * Generate a blog post for a failed search term using OpenAI.
 * @param {string} term - The failed search term
 * @param {Array} relatedTools - Tools already in the DB matching this topic
 * @returns {Promise<{title: string, content: string}>}
 */
async function generateBlogPost(term, relatedTools) {
  const openai = getOpenAI()
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  const toolList =
    relatedTools.length > 0
      ? relatedTools
          .map(
            (t) =>
              `- **${t.name}**: ${t.shortDescription} (https://www.intelligrid.online/tools/${t.slug})`
          )
          .join('\n')
      : 'No specific tools found yet — encourage readers to explore the full directory.'

  const termCapitalized = term.charAt(0).toUpperCase() + term.slice(1)

  const systemPrompt = `You are a content writer for IntelliGrid (intelligrid.online), an AI tool discovery platform.
Write SEO-optimised blog posts that are genuinely helpful, informative, and link back to IntelliGrid tool pages.
Always link to IntelliGrid tool pages using the format: https://www.intelligrid.online/tools/{slug}
Tone: professional but conversational. Avoid clickbait. Write for developers and knowledge workers.
Format output in clean Markdown.`

  const userPrompt = `Write a blog post titled "Top AI Tools for ${termCapitalized}" targeting users who searched for "${term}" on our platform and found no results.

Include these IntelliGrid tools if relevant:
${toolList}

Post format:
- Title: Top AI Tools for ${termCapitalized}
- Introduction (2 short paragraphs explaining the use case)
- One H2 section per tool (100–150 words each, include the IntelliGrid link)
- If fewer than 3 tools are listed, include a section on "How to find more ${term} tools on IntelliGrid"
- Conclusion with a call to action to explore intelligrid.online
- Total length: 600–900 words
- Include the exact phrase "${term}" naturally 2–3 times`

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 1800,
    temperature: 0.7,
  })

  const content = completion.choices[0]?.message?.content || ''
  const title = `Top AI Tools for ${termCapitalized}`
  return { title, content }
}

/**
 * Main content agent run function.
 * Exported so it can be triggered manually from the War Room UI.
 */
export async function runContentAgent() {
  // Guard against concurrent runs
  if (runContentAgent._running) {
    await agentLog('content', '⚠️ Content agent already running — skipping trigger', 'warning')
    return
  }

  runContentAgent._running = true
  setAgentStatus('content', 'running')

  const stats = { processed: 0, drafted: 0, skipped: 0, errors: 0 }
  const maxPostsPerNight = parseInt(process.env.AGENT_MAX_BLOG_POSTS_PER_NIGHT) || 5
  const minFailedCount = parseInt(process.env.AGENT_BLOG_MIN_FAILED_COUNT) || 3

  try {
    await agentLog('content', '🖊️ Content agent starting nightly run', 'info')

    // Verify OpenAI is configured before doing anything
    if (!process.env.OPENAI_API_KEY) {
      await agentLog('content', '❌ OPENAI_API_KEY not set — content agent skipped', 'error')
      return
    }

    // Find the admin user for blog post authorship
    const adminAuthor = await getAdminAuthor()
    if (!adminAuthor) {
      await agentLog('content', '❌ No admin user found in DB — cannot create blog posts', 'error')
      return
    }

    // Step 1: Find top un-drafted failed search terms
    const targets = await FailedSearch.find({
      blogPostDrafted: false,
      count: { $gte: minFailedCount },
    })
      .sort({ count: -1 })
      .limit(maxPostsPerNight)
      .lean()

    if (targets.length === 0) {
      await agentLog(
        'content',
        `💤 No failed search terms with count >= ${minFailedCount}. Sleeping until tomorrow.`,
        'info'
      )
      return
    }

    await agentLog(
      'content',
      `📋 Found ${targets.length} search term(s) to draft blog posts for`,
      'info',
      { terms: targets.map((t) => t.term) }
    )

    // Step 2: Process each term
    for (const target of targets) {
      stats.processed++
      try {
        await agentLog('content', `✍️ Drafting blog post for: "${target.term}"`, 'info')

        // Find related tools already in the DB
        const relatedTools = await Tool.find({
          status: 'active',
          isActive: { $ne: false },
          $or: [
            { tags: { $regex: target.term, $options: 'i' } },
            { shortDescription: { $regex: target.term, $options: 'i' } },
            { name: { $regex: target.term, $options: 'i' } },
            { useCaseTags: { $regex: target.term, $options: 'i' } },
          ],
        })
          .select('name shortDescription officialUrl slug')
          .limit(5)
          .lean()

        // Generate the blog post via OpenAI
        const { title, content } = await generateBlogPost(target.term, relatedTools)
        const slug = makeSlug(title)

        // Save as draft BlogPost
        const post = await BlogPost.create({
          title,
          slug,
          content,
          excerpt: `Discover the best AI tools for ${target.term} — curated by IntelliGrid.`,
          author: adminAuthor._id,
          tags: [target.term, 'ai tools', 'productivity', 'guide'],
          category: 'AI Tools Guide',
          status: 'draft',
        })

        // Mark the search term as drafted so we don't re-draft it
        await FailedSearch.findByIdAndUpdate(target._id, {
          blogPostDrafted: true,
          blogPostId: post._id,
        })

        // Queue for human approval — never auto-publish
        await queueForApproval({
          agentName: 'content',
          actionType: 'publish_blog_post',
          title: `Publish blog post: "${title}"`,
          description:
            `Auto-drafted from ${target.count} failed searches for "${target.term}".\n` +
            `Related tools found: ${relatedTools.length}\n` +
            `Preview slug: /blog/${slug}\n\n` +
            `First 300 chars:\n${content.slice(0, 300)}...`,
          payload: {
            postId: post._id.toString(),
            postSlug: slug,
            postTitle: title,
            searchTerm: target.term,
          },
        })

        await agentLog(
          'content',
          `✅ Blog draft ready: "${title}"`,
          'success',
          { slug, postId: post._id.toString() }
        )

        stats.drafted++
      } catch (err) {
        stats.errors++
        await agentLog(
          'content',
          `❌ Failed to draft post for "${target.term}": ${err.message}`,
          'error'
        )
        console.error(`[ContentAgent] Error for term "${target.term}":`, err.message)
      }
    }

    // Final summary
    const summary = `✅ Content agent complete — Drafted: ${stats.drafted}/${stats.processed}, Errors: ${stats.errors}`
    await agentLog('content', summary, 'success', stats)

    if (stats.drafted > 0) {
      try {
        const { sendOwnerMessage } = await import('../services/telegramBot.js')
        await sendOwnerMessage(
          `✍️ *Content Agent Complete*\n` +
          `Drafted *${stats.drafted} blog post(s)* awaiting your review.\n\n` +
          `🔍 Based on your users' failed searches.\n` +
          `Approve at: https://www.intelligrid.online/admin/war-room`
        )
      } catch (_) {
        // Telegram failure is non-critical
      }
    }
  } catch (err) {
    stats.errors++
    await agentLog('content', `❌ Content agent fatal error: ${err.message}`, 'error')
    console.error('[ContentAgent] Fatal error:', err)
  } finally {
    runContentAgent._running = false
    setAgentStatus('content', stats.errors > 0 ? 'error' : 'idle')
  }

  return stats
}
runContentAgent._running = false

// ── Cron Registration ───────────────────────────────────────────────────────
// Runs every night at midnight UTC
// Only activates when WAR_ROOM_ENABLED=true
let contentScheduled = false

export function startContentAgentCron() {
  if (contentScheduled) return
  contentScheduled = true

  if (process.env.WAR_ROOM_ENABLED !== 'true') {
    console.log('⚠️  [ContentAgent] Disabled (set WAR_ROOM_ENABLED=true to activate)')
    return
  }

  cron.schedule(
    '0 0 * * *',
    () => {
      runContentAgent().catch((err) =>
        console.error('[ContentAgent] Unhandled cron error:', err.message)
      )
    },
    { timezone: 'UTC' }
  )

  console.log('✅ [ContentAgent] Scheduled — daily at 00:00 UTC')
}
