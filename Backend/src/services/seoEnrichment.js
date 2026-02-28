/**
 * seoEnrichment.js
 *
 * Programmatic SEO content generation using Groq LLM.
 *
 * Generates per-tool:
 *   - 5 FAQ items (question + answer) → rendered as JSON-LD FAQ schema + accordion
 *   - 4 specific use cases (title + description)
 *   - 4 pros and 3 cons
 *   - 1 editorial verdict sentence
 *
 * Storage strategy:
 *   - Generated content is PERSISTED to the Tool.seoContent (MongoDB)
 *     so it survives Redis flushes and only costs one Groq call per tool.
 *   - Redis cache (24h TTL) sits in front of MongoDB for hot paths.
 *   - Stale content (>30 days) can be regenerated via the admin UI.
 *
 * Feature flag: PROGRAMMATIC_SEO
 *   - When OFF: the /seo-content endpoint returns { seoContent: null }
 *   - When ON: content is generated on first hit, served from cache/DB on subsequent hits
 */

import Groq from 'groq-sdk'
import Tool from '../models/Tool.js'
import redisClient from '../config/redis.js'
import { isFeatureEnabled } from './featureFlags.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const CACHE_PREFIX = 'seo_content:'
const CACHE_TTL = 86400          // 24 hours in Redis
const STALE_DAYS = 30            // Regenerate if older than 30 days

/**
 * Get or generate SEO content for a tool.
 *
 * @param {string} slug - Tool slug
 * @returns {Promise<object|null>} seoContent object or null if flag is off
 */
export async function getSeoContent(slug) {
    // ── 1. Check feature flag ────────────────────────────────────────────────
    const flagOn = await isFeatureEnabled('PROGRAMMATIC_SEO')
    if (!flagOn) return null

    const cacheKey = `${CACHE_PREFIX}${slug}`

    // ── 2. Try Redis cache ───────────────────────────────────────────────────
    if (redisClient?.isOpen) {
        const cached = await redisClient.get(cacheKey).catch(() => null)
        if (cached) return JSON.parse(cached)
    }

    // ── 3. Try MongoDB (already generated) ──────────────────────────────────
    const tool = await Tool.findOne({ slug, isActive: true })
        .select('name shortDescription fullDescription category tags seoContent')
        .populate('category', 'name')
        .lean()

    if (!tool) return null

    const staleThreshold = new Date()
    staleThreshold.setDate(staleThreshold.getDate() - STALE_DAYS)

    const hasFreshContent = tool.seoContent?.generatedAt &&
        new Date(tool.seoContent.generatedAt) > staleThreshold &&
        tool.seoContent?.faqs?.length > 0

    if (hasFreshContent) {
        // Cache it in Redis for 24h
        if (redisClient?.isOpen) {
            redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(tool.seoContent)).catch(() => { })
        }
        return tool.seoContent
    }

    // ── 4. Generate fresh content with Groq ──────────────────────────────────
    const generated = await generateWithGroq(tool)

    // ── 5. Persist to MongoDB ─────────────────────────────────────────────────
    await Tool.findOneAndUpdate(
        { slug },
        { $set: { seoContent: { ...generated, generatedAt: new Date() } } }
    )

    // ── 6. Cache in Redis ─────────────────────────────────────────────────────
    if (redisClient?.isOpen) {
        redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify({ ...generated, generatedAt: new Date() })).catch(() => { })
    }

    return generated
}

/**
 * Force-regenerate SEO content for a tool (admin action, bypasses cache/stale check).
 *
 * @param {string} slug - Tool slug
 * @returns {Promise<object>} Freshly generated seoContent
 */
export async function regenerateSeoContent(slug) {
    const tool = await Tool.findOne({ slug, isActive: true })
        .select('name shortDescription fullDescription category tags')
        .populate('category', 'name')
        .lean()

    if (!tool) throw new Error(`Tool not found: ${slug}`)

    const generated = await generateWithGroq(tool)

    await Tool.findOneAndUpdate(
        { slug },
        { $set: { seoContent: { ...generated, generatedAt: new Date() } } }
    )

    // Bust the Redis cache
    const cacheKey = `${CACHE_PREFIX}${slug}`
    if (redisClient?.isOpen) {
        await redisClient.del(cacheKey).catch(() => { })
        redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify({ ...generated, generatedAt: new Date() })).catch(() => { })
    }

    return { ...generated, generatedAt: new Date() }
}

// ── Internal: Call Groq and parse response ────────────────────────────────────
async function generateWithGroq(tool) {
    const categoryName = tool.category?.name || 'AI'
    const tags = (tool.tags || []).slice(0, 8).join(', ')
    const description = tool.fullDescription || tool.shortDescription || ''

    const systemPrompt = `You are an expert AI tools reviewer and SEO content writer for IntelliGrid.com — the world's largest AI tools directory. You write concise, accurate, helpful content that ranks well in Google and answers real user questions. Always respond with valid JSON only. No markdown code fences, no preamble, no explanation outside the JSON.`

    const userPrompt = `Tool: ${tool.name}
Category: ${categoryName}
Tags: ${tags}
Description: ${description}

Generate structured SEO content for this tool's detail page. Respond with this exact JSON:
{
  "faqs": [
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." }
  ],
  "useCases": [
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ],
  "pros": ["...", "...", "...", "..."],
  "cons": ["...", "...", "..."],
  "verdict": "One sentence editorial summary of who this tool is best for and what makes it stand out."
}

Rules:
- FAQs must be questions a real user would search for about this specific tool (e.g. "Is ${tool.name} free?", "How does ${tool.name} compare to ChatGPT?", "What can I use ${tool.name} for?")
- Each FAQ answer must be 2-4 sentences
- Use cases must be specific job roles or real scenarios (not vague)
- Pros/cons must be concrete and accurate — do not fabricate features
- Verdict must be one complete sentence, max 25 words`

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) throw new Error('Groq returned no content')

    let parsed
    try {
        parsed = JSON.parse(responseText)
    } catch {
        throw new Error('Groq returned invalid JSON for SEO content')
    }

    // Validate minimum structure — don't persist garbage
    if (!Array.isArray(parsed.faqs) || parsed.faqs.length === 0) {
        throw new Error('Groq response missing faqs array')
    }

    return {
        faqs: (parsed.faqs || []).slice(0, 5),
        useCases: (parsed.useCases || []).slice(0, 4),
        pros: (parsed.pros || []).slice(0, 5),
        cons: (parsed.cons || []).slice(0, 4),
        verdict: parsed.verdict || '',
    }
}
