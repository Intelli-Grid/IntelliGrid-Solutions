/**
 * expandToolPages.js
 * Backend batch script — IMPL GROUP 8, STEP 8.1
 *
 * Expands tool pages with AI-generated SEO content using Groq.
 * Adds: useCases, faqs, alternativeNames, targetRoles
 *
 * Run: node src/scripts/expandToolPages.js
 * Safe to re-run — skips tools with seoExpanded: true
 * Process 50 tools per run to respect Groq rate limits (30 RPM free tier).
 *
 * Usage:
 *   node src/scripts/expandToolPages.js           — expand next 50 unexpanded
 *   node src/scripts/expandToolPages.js --reset   — clear seoExpanded flag on all (re-expansion)
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import Groq from 'groq-sdk'
import Tool from '../models/Tool.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const BATCH_SIZE = 50
const DELAY_MS = 1200     // ~0.83 req/s → stays under 60 RPM free tier

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Robust JSON parser — handles Groq wrapping response in markdown code fences.
 */
function parseJSON(content) {
    // Attempt 1: direct parse
    try { return JSON.parse(content) } catch { }
    // Attempt 2: extract from ```json ... ``` block
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenced) { try { return JSON.parse(fenced[1]) } catch { } }
    // Attempt 3: find first outermost { ... }
    const braced = content.match(/\{[\s\S]*\}/)
    if (braced) { try { return JSON.parse(braced[0]) } catch { } }
    throw new Error('Could not parse JSON from Groq response')
}

async function expandTool(tool) {
    const prompt = `You are writing structured SEO content for an AI directory listing.
Tool name: ${tool.name}
Short description: ${tool.shortDescription?.slice(0, 300) || 'An AI tool'}
Category: ${tool.category?.name || 'AI'}
Pricing: ${tool.pricing || 'Unknown'}

Return ONLY valid JSON with this exact structure and no additional text:
{
  "useCases": ["string","string","string","string","string"],
  "faqs": [
    {"question": "string", "answer": "string"},
    {"question": "string", "answer": "string"},
    {"question": "string", "answer": "string"},
    {"question": "string", "answer": "string"},
    {"question": "string", "answer": "string"}
  ],
  "alternativeNames": ["string","string"],
  "targetRoles": ["string","string","string","string"]
}

Rules:
- useCases: concrete, action-oriented (e.g. "Generate product descriptions at scale")
- faqs: questions real users actually ask, practical answers under 80 words each
- alternativeNames: how people search for this (e.g. "ChatGPT alternative", "AI writing tool")
- targetRoles: job titles who benefit most (e.g. "content marketer", "SaaS founder")
- Keep all answers factual based on the description. Do not invent features.`

    const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 900,
        temperature: 0.15,
    })

    const content = response.choices[0]?.message?.content || ''
    return parseJSON(content)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
    const resetMode = process.argv.includes('--reset')

    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✓ Connected to MongoDB')

    if (resetMode) {
        const result = await Tool.updateMany(
            { seoExpanded: true },
            { $unset: { seoExpanded: '', seoExpandedAt: '' } }
        )
        console.log(`Reset seoExpanded flag on ${result.modifiedCount} tools. Disconnecting.`)
        await mongoose.disconnect()
        return
    }

    const tools = await Tool.find({ seoExpanded: { $ne: true }, isActive: true })
        .populate('category', 'name')
        .select('name shortDescription category pricing slug')
        .limit(BATCH_SIZE)
        .lean()

    if (tools.length === 0) {
        console.log('✅ All tools already expanded. Run with --reset to re-expand.')
        await mongoose.disconnect()
        return
    }

    console.log(`\nExpanding ${tools.length} tools (batch of ${BATCH_SIZE})...\n`)

    let success = 0
    let failed = 0

    for (const tool of tools) {
        try {
            const seoData = await expandTool(tool)

            await Tool.findByIdAndUpdate(tool._id, {
                $set: {
                    seoUseCases: seoData.useCases || [],
                    seoFaqs: seoData.faqs || [],
                    seoAlternativeNames: seoData.alternativeNames || [],
                    seoTargetRoles: seoData.targetRoles || [],
                    seoExpanded: true,
                    seoExpandedAt: new Date(),
                },
            })

            success++
            console.log(`  ✓ [${success + failed}/${tools.length}] ${tool.name}`)
        } catch (err) {
            failed++
            console.error(`  ✗ [${success + failed}/${tools.length}] ${tool.name} — ${err.message}`)
        }

        // Rate limit: pause between each call
        if (success + failed < tools.length) {
            await sleep(DELAY_MS)
        }
    }

    const remaining = await Tool.countDocuments({ seoExpanded: { $ne: true }, isActive: true })

    console.log(`\n${'─'.repeat(50)}`)
    console.log(`Batch complete — ✓ ${success} expanded  ✗ ${failed} failed`)
    console.log(`${remaining} tools still await expansion.`)
    if (remaining > 0) {
        console.log('Run the script again to process the next batch.')
    } else {
        console.log('🎉 All tools fully expanded!')
    }

    await mongoose.disconnect()
}

run().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
})

// ── Named exports for use by importEnrichmentData.js ─────────────────────────
// These functions are NOT part of the main CLI run() — they are imported by the
// CSV import pipeline to leverage the same Groq client and helpers.

/**
 * Normalise a raw Futurepedia description string into structured IntelliGrid format.
 * Returns { shortDescription, fullDescription, primaryUseCase, targetUser, pricingTier }
 * Returns null if Groq fails or rawDescription is empty.
 *
 * @param {string} rawDescription - Raw text from Browse AI export
 * @param {string} toolName - Tool name for prompt context
 */
export async function normalizeImportedDescription(rawDescription, toolName) {
    if (!rawDescription?.trim()) return null

    const prompt = `You are an editor for IntelliGrid, an AI tools discovery platform.
Given this raw description of an AI tool called "${toolName}", rewrite it into clean structured data.

Return ONLY valid JSON with no markdown, no preamble:
{
  "shortDescription": "One sentence, max 25 words, what the tool does",
  "fullDescription": "2-3 sentences, neutral tone, includes primary use case and key benefit",
  "primaryUseCase": "Main task this tool accomplishes",
  "targetUser": "Who benefits most (e.g. content marketers, developers, designers)",
  "pricingTier": "free|freemium|paid|contact_for_pricing"
}

Rules:
- shortDescription must be factual, not marketing language
- fullDescription must not repeat shortDescription word-for-word
- Do not invent features not mentioned in the raw description

Raw description: ${rawDescription.slice(0, 800)}`

    try {
        const response = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 400,
        })
        const text = response.choices[0]?.message?.content?.trim() || ''
        return parseJSON(text)
    } catch (err) {
        console.error(`[normalizeImportedDescription] Groq failed for "${toolName}":`, err.message)
        return null
    }
}

/**
 * Process an array of scraped tool records through normalizeImportedDescription(),
 * respecting Groq rate limits with a 600ms inter-request delay.
 *
 * @param {Array<{ name: string, rawDescription: string }>} tools
 * @returns {Array<{ name, normalized }>}
 */
export async function enrichImportedBatch(tools) {
    const results = []
    for (const tool of tools) {
        const normalized = await normalizeImportedDescription(tool.rawDescription, tool.name)
        results.push({ name: tool.name, normalized })
        if (results.length < tools.length) {
            await sleep(600)   // 600ms delay keeps us under free-tier Groq rate limit
        }
    }
    return results
}

