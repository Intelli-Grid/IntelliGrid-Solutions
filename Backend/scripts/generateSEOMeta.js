/**
 * generateSEOMeta.js — Batch 5
 *
 * Uses GPT-4o-mini to generate missing or weak SEO fields for all tools:
 *   - metaTitle      (≤70 chars) — if blank or not set
 *   - metaDescription (≤160 chars) — if blank or not set
 *   - shortDescription (≤300 chars) — only if ≤ 20 chars (effectively blank)
 *
 * Run in batches; never overwrites fields that already have good content.
 * Costs ~$0.001 per tool. For 3,690 tools ≈ $3.69 total.
 *
 * Usage:
 *   node scripts/generateSEOMeta.js                 # all tools missing meta
 *   node scripts/generateSEOMeta.js --limit 100      # first 100 only (test run)
 *   node scripts/generateSEOMeta.js --force          # regenerate ALL, even set ones
 *   node scripts/generateSEOMeta.js --dry-run        # preview only, no DB writes
 */

import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import axios from 'axios'
import mongoose from 'mongoose'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

import connectDB from '../src/config/database.js'
import Tool from '../src/models/Tool.js'
import '../src/models/Category.js'   // register Category schema for populate

// ── Config ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const LIMIT = (() => { const a = args.find(a => a.startsWith('--limit')); return a ? parseInt(a.split('=')[1] || args[args.indexOf(a) + 1]) : 0 })()
const FORCE = args.includes('--force')
const DRY_RUN = args.includes('--dry-run')
// ── Provider config — supports OpenAI and Groq (free) ────────────────────────
// Priority: GROQ_API_KEY > OPENAI_API_KEY
// Groq is free (no billing), uses same API format, just different URL + model
const PROVIDERS = {
    groq: {
        name: 'Groq (llama-3.3-70b — FREE)',
        apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        envKey: 'GROQ_API_KEY',
        jsonMode: false,  // Groq: use prompt instruction instead of response_format
    },
    openai: {
        name: 'OpenAI (gpt-4o-mini)',
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        envKey: 'OPENAI_API_KEY',
        jsonMode: true,
    },
}

function detectProvider() {
    if (process.env.GROQ_API_KEY) return { ...PROVIDERS.groq, key: process.env.GROQ_API_KEY }
    if (process.env.OPENAI_API_KEY) return { ...PROVIDERS.openai, key: process.env.OPENAI_API_KEY }
    return null
}

const PROVIDER = detectProvider()
const GPT_MODEL = PROVIDER?.model || 'llama-3.3-70b-versatile'
const CONCURRENCY = 1      // Groq free tier: 30 RPM — serial is safest
const REQUEST_DELAY = 2100   // ms between requests (~28 RPM, within 30 RPM limit)
const REPORT_PATH = path.join(__dirname, `../reports/seo-meta-${Date.now()}.csv`)

function pLimit(n) {
    let running = 0
    const queue = []
    function next() {
        if (running >= n || !queue.length) return
        running++
        const { fn, resolve, reject } = queue.shift()
        fn().then(resolve, reject).finally(() => { running--; next() })
    }
    return fn => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next() })
}

// ── GPT call with retry ───────────────────────────────────────────────────────
async function generateMeta(tool, attempt = 1) {
    const categoryName = typeof tool.category === 'object' ? tool.category?.name : null
    const existingDesc = tool.shortDescription || ''
    const currentPricing = tool.pricing || 'Unknown'

    const userPrompt = `Tool: ${tool.name}
Category: ${categoryName || 'AI Tool'}
Pricing: ${currentPricing}${tool.startingPrice ? ` (from ${tool.startingPrice})` : ''}
Description: "${existingDesc}"

Write SEO metadata. Return ONLY a JSON object with these keys:
- metaTitle: string under 65 chars (what the tool does, not just name)
- metaDescription: string under 155 chars (problem solved + who it's for)
- shortDescription: string under 200 chars or null if existing is already good`

    try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 25000)

        const body = {
            model: GPT_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are an SEO expert for an AI tools directory. Always respond with valid json only.',
                },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: 300,
            temperature: 0.3,
        }

        // json_object mode: OpenAI supports it reliably; Groq uses prompt instruction
        if (PROVIDER?.jsonMode) {
            body.response_format = { type: 'json_object' }
        }

        const res = await fetch(PROVIDER.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PROVIDER.key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        })

        clearTimeout(timer)

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            if (res.status === 429 && attempt <= 5) {
                // Exponential backoff: 5s, 10s, 20s, 40s, 80s
                const wait = 5000 * attempt
                process.stdout.write(`\r  ⏳ Rate limited — waiting ${wait / 1000}s (attempt ${attempt}/5)...`)
                await new Promise(r => setTimeout(r, wait))
                return generateMeta(tool, attempt + 1)
            }
            console.error(`  ❌ GPT ${res.status} for "${tool.name}": ${err.error?.message || res.statusText}`)
            return null
        }

        const data = await res.json()
        const raw = data.choices[0]?.message?.content
        // Groq sometimes wraps response in ```json ``` fence — strip it
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
        const parsed = JSON.parse(cleaned)

        return {
            metaTitle: (parsed.metaTitle || '').slice(0, 70) || null,
            metaDescription: (parsed.metaDescription || '').slice(0, 160) || null,
            shortDescription: (parsed.shortDescription || '').slice(0, 300) || null,
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            console.error(`  ⏱  Timeout for "${tool.name}" — skipping`)
        } else {
            console.error(`  ❌ GPT error for "${tool.name}": ${err.message}`)
        }
        return null
    }
}


// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log(`\n🔍 IntelliGrid SEO Meta Generator — Batch 5`)
    console.log(`   Provider: ${PROVIDER.name}`)
    console.log(`   Model: ${GPT_MODEL} | Concurrency: ${CONCURRENCY}`)
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'} | Force: ${FORCE}`)
    if (LIMIT) console.log(`   Limit: ${LIMIT} tools`)
    console.log('─'.repeat(55))

    if (!PROVIDER) {
        console.error('❌ No AI provider key found in .env')
        console.error('   Set GROQ_API_KEY (free) or OPENAI_API_KEY (paid)')
        console.error('   Get a free Groq key at: https://console.groq.com')
        process.exit(1)
    }

    await connectDB()

    // Build query — skip tools that already have both meta fields (unless --force)
    const query = FORCE
        ? { status: 'active', isActive: { $ne: false } }
        : {
            status: 'active',
            isActive: { $ne: false },
            $or: [
                { metaTitle: { $exists: false } },
                { metaTitle: null },
                { metaTitle: '' },
                { metaDescription: { $exists: false } },
                { metaDescription: null },
                { metaDescription: '' },
            ],
        }

    let toolsQuery = Tool.find(query)
        .select('_id name slug officialUrl shortDescription category pricing startingPrice metaTitle metaDescription')
        .populate('category', 'name')
        .sort({ createdAt: -1 })

    if (LIMIT) toolsQuery = toolsQuery.limit(LIMIT)

    const tools = await toolsQuery.lean()
    const total = tools.length

    if (total === 0) {
        console.log('✅ All tools already have SEO meta. Use --force to regenerate.')
        process.exit(0)
    }

    console.log(`\n📊 Found ${total} tools to process`)
    console.log(`   Estimated cost: ~$${(total * 0.001).toFixed(3)} (gpt-4o-mini)\n`)

    const limit = pLimit(CONCURRENCY)
    const results = []
    let processed = 0
    let skipped = 0
    let errors = 0

    const start = Date.now()

    await Promise.all(
        tools.map(tool =>
            limit(async () => {
                const meta = await generateMeta(tool)
                // Throttle to stay within Groq free-tier 30 RPM limit
                await new Promise(r => setTimeout(r, REQUEST_DELAY))
                processed++

                if (!meta) {
                    errors++
                    results.push({ id: tool._id, name: tool.name, status: 'error' })
                    return
                }

                // Build the update object — only write fields that need updating
                const update = {}
                const now = new Date()

                if (meta.metaTitle && (FORCE || !tool.metaTitle)) {
                    update.metaTitle = meta.metaTitle
                }
                if (meta.metaDescription && (FORCE || !tool.metaDescription)) {
                    update.metaDescription = meta.metaDescription
                }
                // Only update shortDescription if current one is very weak (≤20 chars)
                if (meta.shortDescription && (FORCE || (tool.shortDescription || '').length <= 20)) {
                    update.shortDescription = meta.shortDescription
                }
                update.lastMetaUpdate = now

                if (Object.keys(update).length <= 1) {
                    // Only lastMetaUpdate — nothing meaningful changed
                    skipped++
                    results.push({ id: tool._id, name: tool.name, status: 'skipped', reason: 'already good' })
                } else if (!DRY_RUN) {
                    await Tool.updateOne({ _id: tool._id }, { $set: update })
                    results.push({ id: tool._id, name: tool.name, status: 'updated', ...update })
                } else {
                    results.push({ id: tool._id, name: tool.name, status: 'dry-run', ...meta })
                }

                // Progress indicator
                if (processed % 50 === 0 || processed === total) {
                    const elapsed = ((Date.now() - start) / 1000).toFixed(0)
                    const rate = (processed / (Date.now() - start) * 1000).toFixed(1)
                    process.stdout.write(
                        `\r  Progress: ${processed}/${total} | ` +
                        `Updated: ${results.filter(r => r.status === 'updated').length} | ` +
                        `Errors: ${errors} | ${rate} tools/s | ${elapsed}s elapsed   `
                    )
                }
            })
        )
    )

    const updated = results.filter(r => r.status === 'updated').length
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)

    console.log(`\n\n✅ Complete in ${elapsed}s`)
    console.log(`   Updated:  ${updated}`)
    console.log(`   Skipped:  ${skipped} (already had good meta)`)
    console.log(`   Errors:   ${errors}`)

    // Write CSV report
    if (!DRY_RUN) {
        const dir = path.join(__dirname, '../reports')
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

        const header = 'id,name,status,metaTitle,metaDescription\n'
        const rows = results.map(r =>
            `"${r.id}","${(r.name || '').replace(/"/g, '""')}","${r.status}","${(r.metaTitle || '').replace(/"/g, '""')}","${(r.metaDescription || '').replace(/"/g, '""')}"`
        ).join('\n')

        fs.writeFileSync(REPORT_PATH, header + rows)
        console.log(`\n📄 Report saved: ${REPORT_PATH}`)
    }

    console.log(`\n💡 Next: Run "npm run sync-algolia" to push updated descriptions to search index\n`)
    await mongoose.disconnect()
    process.exit(0)
}

main().catch(err => {
    console.error('❌ Fatal error:', err)
    process.exit(1)
})
