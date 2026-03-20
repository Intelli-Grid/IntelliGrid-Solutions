/**
 * importEnrichmentData.js
 * CLI script — imports Browse AI CSV export into MongoDB Tool documents.
 *
 * Usage:
 *   node src/scripts/importEnrichmentData.js ./exports/futurepedia_writing.csv
 *
 * CSV expected columns (from Browse AI Futurepedia robot):
 *   name, description, pricing, pros, cons, rating, official_url, futurepedia_url
 *   - pros and cons should be pipe-separated strings: "Pro 1|Pro 2|Pro 3"
 *
 * Behaviour:
 * - Matches tools in DB by name (case-insensitive) OR officialUrl (domain match)
 * - Only updates fields that are currently empty — never overwrites manual data
 * - Uses Groq to normalise shortDescription when the field is empty
 * - Calculates enrichmentScore after update
 * - Tools not found in DB are logged for review — NOT auto-added
 *
 * Run from Backend/ directory with MONGODB_URI and GROQ_API_KEY in your .env
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import fs from 'fs'
import { parse } from 'csv-parse/sync'
import Groq from 'groq-sdk'
import Tool from '../models/Tool.js'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const MONGODB_URI = process.env.MONGODB_URI
const GROQ_DELAY_MS = 600   // ~1.6 req/s — stays under 30 RPM free Groq tier

const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Robust JSON parser — handles Groq wrapping response in markdown code fences.
 */
function parseJSON(content) {
    try { return JSON.parse(content) } catch { }
    const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenced) { try { return JSON.parse(fenced[1]) } catch { } }
    const braced = content.match(/\{[\s\S]*\}/)
    if (braced) { try { return JSON.parse(braced[0]) } catch { } }
    return null
}

/**
 * Use Groq to normalise a raw Futurepedia description into clean IntelliGrid format.
 * Returns { shortDescription, fullDescription } or null if Groq fails.
 */
export async function normalizeImportedDescription(rawDescription, toolName) {
    if (!groq || !rawDescription?.trim()) return null

    const prompt = `You are an editor for IntelliGrid, an AI tools discovery platform.
Given this raw description of an AI tool called "${toolName}", rewrite it and extract structured data.

Return ONLY valid JSON with no markdown, no preamble:
{
  "shortDescription": "One sentence, max 25 words, what the tool does",
  "fullDescription": "2-3 sentences, neutral tone, includes primary use case and key benefit",
  "primaryUseCase": "Main task this tool accomplishes",
  "targetUser": "Who benefits most (e.g. 'content marketers', 'developers')",
  "pricingTier": "free|freemium|paid|contact_for_pricing"
}

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
        console.error(`  ⚠️  Groq normalise failed for "${toolName}":`, err.message)
        return null
    }
}

/**
 * Calculate enrichment score 0-100 based on field completeness.
 * Add/remove fields here to tune what counts as "complete".
 */
function calculateEnrichmentScore(tool) {
    let score = 0
    if (tool.shortDescription) score += 15
    if (tool.fullDescription) score += 15
    if (tool.pros?.length >= 2) score += 15
    if (tool.cons?.length >= 1) score += 10
    if (tool.seoContent?.useCases?.length >= 2) score += 15
    if (tool.logo) score += 10
    if (tool.pricing && tool.pricing !== 'Unknown') score += 10
    if (tool.affiliateUrl) score += 10
    return Math.min(score, 100)
}

/**
 * Extract domain from a URL for fuzzy matching.
 * e.g. "https://www.jasper.ai/signup" → "jasper.ai"
 */
function extractDomain(url) {
    if (!url) return ''
    try {
        const u = new URL(url.startsWith('http') ? url : `https://${url}`)
        return u.hostname.replace(/^www\./, '').toLowerCase()
    } catch {
        return url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function importEnrichmentCSV(csvFilePath) {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI is not set. Add it to your .env file.')
        process.exit(1)
    }

    if (!fs.existsSync(csvFilePath)) {
        console.error(`❌ File not found: ${csvFilePath}`)
        process.exit(1)
    }

    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    const fileContent = fs.readFileSync(csvFilePath, 'utf8')
    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    })

    console.log(`📦 Processing ${records.length} records from: ${csvFilePath}\n`)

    let matched = 0
    let enriched = 0
    let skipped = 0
    const noMatchLog = []

    for (const record of records) {
        const rawName = record.name?.trim()
        const rawUrl = record.official_url?.trim() || record.url?.trim()
        const rawDomain = extractDomain(rawUrl)

        if (!rawName && !rawDomain) {
            skipped++
            continue
        }

        // Step 1: Try to find matching tool by name OR officialUrl domain
        const orConditions = []
        if (rawName) orConditions.push({ name: new RegExp(`^${rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })
        if (rawDomain) orConditions.push({ officialUrl: new RegExp(rawDomain.replace(/\./g, '\\.'), 'i') })

        const tool = await Tool.findOne({ $or: orConditions }).lean()

        if (!tool) {
            noMatchLog.push(`${rawName || rawDomain} (${rawUrl || 'no URL'})`)
            skipped++
            continue
        }

        matched++

        // Step 2: Build update — only populate currently empty fields
        const updates = {}

        // Pros: pipe-separated in CSV → array
        if (!tool.pros?.length && record.pros?.trim()) {
            updates.pros = record.pros.split('|').map(p => p.trim()).filter(Boolean)
        }

        // Cons: pipe-separated in CSV → array
        if (!tool.cons?.length && record.cons?.trim()) {
            updates.cons = record.cons.split('|').map(c => c.trim()).filter(Boolean)
        }

        // Futurepedia rating
        if (!tool.futurepediaRating && record.rating?.trim()) {
            const parsed = parseFloat(record.rating)
            if (!isNaN(parsed)) updates.futurepediaRating = parsed
        }

        // Futurepedia source URL
        if (!tool.futurepediaUrl && record.futurepedia_url?.trim()) {
            updates.futurepediaUrl = record.futurepedia_url.trim()
        }

        // Short description — normalise via Groq if tool's is empty or very short
        const rawDesc = record.description?.trim()
        if (rawDesc && (!tool.shortDescription || tool.shortDescription.length < 30)) {
            const normalized = await normalizeImportedDescription(rawDesc, tool.name)
            if (normalized?.shortDescription) {
                updates.shortDescription = normalized.shortDescription
            }
            if (normalized?.fullDescription && !tool.fullDescription) {
                updates.fullDescription = normalized.fullDescription
            }
            // Respect Groq rate limits
            await sleep(GROQ_DELAY_MS)
        }

        // Only commit if there's something to update
        if (Object.keys(updates).length > 0) {
            updates.lastEnrichedAt = new Date()
            updates.dataSource = tool.dataSource === 'manual' ? 'futurepedia' : 'mixed'
            updates.needsEnrichment = false  // Clear the flag now that we've enriched it

            // Recalculate enrichment score with merged data
            updates.enrichmentScore = calculateEnrichmentScore({ ...tool, ...updates })

            await Tool.findByIdAndUpdate(tool._id, { $set: updates })
            enriched++
            console.log(`  ✅ Enriched: ${tool.name} (score: ${tool.enrichmentScore} → ${updates.enrichmentScore})`)
        } else {
            console.log(`  ⏭️  Skipped (already complete): ${tool.name}`)
        }
    }

    // Summary
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`📊 Import Complete`)
    console.log(`   Total rows:  ${records.length}`)
    console.log(`   Matched:     ${matched}`)
    console.log(`   Enriched:    ${enriched}`)
    console.log(`   No match:    ${skipped}`)

    if (noMatchLog.length > 0) {
        console.log(`\n⚠️  No DB match found for these tools (review manually):`)
        noMatchLog.forEach(name => console.log(`   - ${name}`))
    }

    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
}

// ── Entry point ───────────────────────────────────────────────────────────────
const csvPath = process.argv[2]
if (!csvPath) {
    console.error('Usage: node src/scripts/importEnrichmentData.js <path-to-csv>')
    console.error('Example: node src/scripts/importEnrichmentData.js ./exports/futurepedia_writing.csv')
    process.exit(1)
}

importEnrichmentCSV(csvPath).catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
