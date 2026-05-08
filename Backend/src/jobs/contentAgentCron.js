// Backend/src/jobs/contentAgentCron.js
// Content Agent — nightly SEO blog post drafting.
// Runs daily at 00:00 UTC (scheduled in app.js).
//
// Flow:
//   1. Query FailedSearch for terms with count >= AGENT_BLOG_MIN_FAILED_COUNT
//   2. For each term, call Groq to generate a structured SEO blog post draft
//   3. Save draft BlogPost (status: 'draft') to MongoDB
//   4. Queue a PendingAction for admin approval before publishing
//   5. Mark the FailedSearch term as "processed" (blogPostDrafted: true)
//
// Nothing publishes without an admin clicking Approve in the War Room UI.

import cron from 'node-cron'
import FailedSearch from '../models/FailedSearch.js'
import BlogPost from '../models/BlogPost.js'
import User from '../models/User.js'
import { agentLog, queueForApproval, setAgentStatus } from '../services/agentOrchestrator.js'
import { groqComplete } from '../services/groqClient.js'

const AGENT_NAME = 'content'
const MIN_FAILED_COUNT = parseInt(process.env.AGENT_BLOG_MIN_FAILED_COUNT || '3', 10)
const MAX_POSTS_PER_NIGHT = parseInt(process.env.AGENT_MAX_BLOG_POSTS_PER_NIGHT || '5', 10)

// ── Blog Post Prompt ─────────────────────────────────────────────────────────

function buildBlogPrompt(searchTerm) {
    return `You are an expert AI tools content writer for IntelliGrid, a directory of AI tools.
Write a comprehensive, SEO-optimised blog post about the search term: "${searchTerm}"

This search term was queried by real users who found zero results on IntelliGrid.
Your post should address what they were looking for and recommend relevant AI tools.

REQUIREMENTS:
- Tone: professional, helpful, informative (no fluff, no filler)
- Length: 600-900 words
- Structure: Use H2 and H3 markdown headings
- SEO: Include the search term naturally in title, first paragraph, and at least 2 headings
- Include: what the category of tool does, who it is for, what to look for when choosing one
- End with a call to action to explore IntelliGrid for the best tools in this category

FORMAT: Return plain markdown only. No code fences. Start directly with the H1 title.
The first line must be: # <SEO title that includes "${searchTerm}">
The second line must be blank.
Then the post body.`
}

function buildMetaPrompt(searchTerm, bodyPreview) {
    return `Given this blog post about "${searchTerm}", return ONLY a JSON object.
No markdown, no backticks, no explanation.

Post preview (first 400 chars):
${bodyPreview}

Return exactly:
{
  "slug": "<url-friendly slug, lowercase, hyphens only, 50 chars max>",
  "metaTitle": "<SEO title, 60 chars max, includes '${searchTerm}'>",
  "metaDescription": "<compelling 150 char meta description>",
  "tags": ["<3-5 relevant tags>"],
  "excerpt": "<2-sentence compelling excerpt for blog index pages>"
}`
}

// ── Core runner ──────────────────────────────────────────────────────────────

export async function runContentAgent() {
    // Prevent concurrent runs
    const { getAgentRegistry } = await import('../services/agentOrchestrator.js')
    if (getAgentRegistry()[AGENT_NAME]?.status === 'running') {
        await agentLog(AGENT_NAME, '⚠️ Already running — skipped duplicate trigger', 'warning')
        return
    }

    setAgentStatus(AGENT_NAME, 'running')
    await agentLog(AGENT_NAME, '🚀 Content Agent starting — scanning failed searches', 'info')

    let drafted = 0
    let skipped = 0
    let errors = 0

    try {
        // Step 1: Find unprocessed failed searches above threshold
        const failedTerms = await FailedSearch.find({
            count: { $gte: MIN_FAILED_COUNT },
            blogPostDrafted: { $ne: true },
        })
            .sort({ count: -1 })
            .limit(MAX_POSTS_PER_NIGHT)
            .lean()

        if (failedTerms.length === 0) {
            await agentLog(AGENT_NAME, `ℹ️ No qualifying failed searches (threshold: ${MIN_FAILED_COUNT})`, 'info')
            setAgentStatus(AGENT_NAME, 'idle')
            return
        }

        await agentLog(
            AGENT_NAME,
            `📋 Found ${failedTerms.length} qualifying terms — drafting up to ${MAX_POSTS_PER_NIGHT} posts`,
            'info'
        )

        // Step 2: Resolve a system author (all agent-drafted posts need an author)
        let authorId = null
        try {
            const adminUser = await User.findOne({
                role: { $in: ['admin', 'ADMIN', 'SUPERADMIN'] },
                isActive: { $ne: false },
            }).select('_id').lean()
            authorId = adminUser?._id || null
        } catch (userErr) {
            await agentLog(AGENT_NAME, `⚠️ Could not resolve admin author: ${userErr.message}`, 'warning')
        }

        if (!authorId) {
            await agentLog(AGENT_NAME, '❌ No admin user found — cannot draft blog posts (author required)', 'error')
            setAgentStatus(AGENT_NAME, 'error')
            return
        }

        // Step 3: Draft a post for each qualifying term
        for (const term of failedTerms) {
            const searchTerm = term.term  // FailedSearch uses `term` field

            try {
                await agentLog(AGENT_NAME, `✍️ Drafting post for: "${searchTerm}" (${term.count} searches)`, 'info')

                // Guard: skip if a draft already exists for this term
                const existing = await BlogPost.findOne({
                    title: { $regex: searchTerm, $options: 'i' },
                }).select('_id').lean()

                if (existing) {
                    await agentLog(AGENT_NAME, `⏭️ Post already exists for "${searchTerm}" — skipping`, 'info')
                    await FailedSearch.findByIdAndUpdate(term._id, {
                        blogPostDrafted: true,
                        blogPostId: existing._id,
                    })
                    skipped++
                    continue
                }

                // Generate post body via Groq
                const body = await groqComplete(buildBlogPrompt(searchTerm), {
                    max_tokens: 1800,
                    temperature: 0.35,
                })

                if (!body || body.length < 200) {
                    throw new Error('Groq returned insufficient content')
                }

                // Generate SEO meta fields
                let meta = null
                try {
                    const metaRaw = await groqComplete(
                        buildMetaPrompt(searchTerm, body.substring(0, 400)),
                        { max_tokens: 400, temperature: 0.1 }
                    )
                    const cleaned = metaRaw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
                    meta = JSON.parse(cleaned)
                } catch (_) {
                    // Meta generation is non-fatal — use fallbacks below
                }

                // Extract title from first H1 line
                const titleLine = body.split('\n')[0].replace(/^#+\s*/, '').trim()
                const postContent = body.split('\n').slice(2).join('\n').trim()  // skip H1 + blank line

                // Build a unique slug to avoid collisions
                const baseSlug = (meta?.slug || searchTerm)
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '')
                    .substring(0, 50)
                const slug = `${baseSlug}-${Date.now().toString(36)}`

                // Save draft to MongoDB (using `content` field — the BlogPost schema field name)
                const post = await BlogPost.create({
                    title: titleLine || `Best AI Tools for ${searchTerm}`,
                    slug,
                    content: postContent,  // BlogPost schema uses `content`, not `body`
                    excerpt: meta?.excerpt
                        || body.split('\n').find(l => l.trim().length > 80 && !l.startsWith('#'))?.trim()
                        || '',
                    metaTitle: meta?.metaTitle || titleLine,
                    metaDescription: meta?.metaDescription || '',
                    tags: meta?.tags || [searchTerm],
                    author: authorId,
                    status: 'draft',
                })

                // Mark FailedSearch as processed using its actual field name
                await FailedSearch.findByIdAndUpdate(term._id, {
                    blogPostDrafted: true,
                    blogPostId: post._id,
                })

                // Queue for admin approval in War Room
                await queueForApproval({
                    agentName: AGENT_NAME,
                    actionType: 'publish_blog_post',
                    title: `Blog draft: "${titleLine || searchTerm}"`,
                    description: [
                        `Search term: "${searchTerm}" (${term.count} failed searches)`,
                        `Post slug: /blog/${slug}`,
                        `Word count: ~${body.split(/\s+/).length}`,
                        '',
                        'Preview (first 500 chars):',
                        body.substring(0, 500),
                        '...',
                        '',
                        'Approving this will publish the post to the live blog.',
                    ].join('\n'),
                    payload: {
                        postId: post._id.toString(),
                        postTitle: titleLine,
                        postSlug: slug,
                        searchTerm,
                        failedCount: term.count,
                    },
                })

                drafted++
                await agentLog(
                    AGENT_NAME,
                    `✅ Draft created: "${titleLine}" → queued for approval`,
                    'success',
                    { postId: post._id.toString(), slug, searchTerm }
                )

                // Brief pause between Groq calls to stay within TPM limits
                await new Promise(r => setTimeout(r, 3000))

            } catch (termErr) {
                errors++
                await agentLog(
                    AGENT_NAME,
                    `❌ Failed to draft post for "${searchTerm}": ${termErr.message}`,
                    'error',
                    { searchTerm }
                )
            }
        }

        const summary = `Content run complete — drafted: ${drafted}, skipped: ${skipped}, errors: ${errors}`
        await agentLog(AGENT_NAME, `🏁 ${summary}`, 'success')
        setAgentStatus(AGENT_NAME, 'idle')

    } catch (err) {
        const msg = `Content Agent crashed: ${err.message}`
        console.error(`[ContentAgent] ${msg}`)
        await agentLog(AGENT_NAME, `❌ ${msg}`, 'error').catch(() => {})
        setAgentStatus(AGENT_NAME, 'error')
    }
}

// ── Cron schedule ────────────────────────────────────────────────────────────

export function startContentAgentCron() {
    if (process.env.WAR_ROOM_ENABLED !== 'true') {
        console.log('[ContentAgent] WAR_ROOM_ENABLED is not true — cron not scheduled')
        return
    }

    // Every day at midnight UTC
    cron.schedule('0 0 * * *', () => {
        console.log('[ContentAgent] Cron triggered — running content agent')
        runContentAgent().catch(err =>
            console.error('[ContentAgent] Cron error:', err.message)
        )
    }, { timezone: 'UTC' })

    console.log('[ContentAgent] ✅ Cron scheduled — daily at 00:00 UTC')
}
