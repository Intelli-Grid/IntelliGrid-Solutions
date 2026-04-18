/**
 * bulkEnrich.js
 * One-time script to AI-enrich all IntelliGrid tools using Groq.
 *
 * Run from the Backend/ directory:
 *   node src/scripts/bulkEnrich.js
 *
 * Multi-key rotation:
 *   Add keys to .env as GROQ_API_KEY, GROQ_API_KEY_2 ... GROQ_API_KEY_9
 *   The script auto-rotates when a key hits its daily 500k token limit.
 *
 * Estimated runtime per key:
 *   ~336 tools/key/day (500k tokens ÷ ~1,488 tokens/tool)
 *   3 keys = ~1,000 tools/day
 *   9 keys = ~3,000 tools = full enrichment in 1 run
 *
 * Resume: run the script again — already-enriched tools are skipped.
 * groq_failed tools from previous runs are automatically retried.
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js' // must import to register schema
import { enrichTool, DailyTokenLimitError } from '../services/enrichmentService.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Config ────────────────────────────────────────────────────────────────────
const DELAY_MS = 2500           // ms between Groq calls (24 req/min — safe under 30 req/min limit)
const MAX_TOOLS_PER_RUN = Infinity  // process as many as keys allow
const BATCH_LOG_INTERVAL = 10   // print summary every N tools
const VERBOSE = true            // log every tool result
const FAILURES_FILE = path.join(__dirname, '../../logs/enrichment-failures.json')
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Ensure logs directory exists
    const logsDir = path.join(__dirname, '../../logs')
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })

    // Count configured API keys upfront
    const keyCount = [
        process.env.GROQ_API_KEY,
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_API_KEY_3,
        process.env.GROQ_API_KEY_4,
        process.env.GROQ_API_KEY_5,
        process.env.GROQ_API_KEY_6,
        process.env.GROQ_API_KEY_7,
        process.env.GROQ_API_KEY_8,
        process.env.GROQ_API_KEY_9,
        process.env.GROQ_API_KEY_10,
    ].filter(Boolean).length
    console.log(`🔑 ${keyCount} Groq API key(s) configured → ~${keyCount * 336} tools possible this run`)

    // Query: tools that have NOT been enriched yet OR previously failed with groq_failed
    // BUG FIX: removed isActive:{ $ne: false } — newly crawled pending tools have
    // isActive:false by default and were being silently skipped on every run.
    const query = {
        status: { $in: ['active', 'pending'] }, // include pending so imported tools get enriched
        $or: [
            { lastEnrichedAt: { $exists: false } },
            { lastEnrichedAt: null },
            { enrichmentScore: { $lt: 30 } },
            { dataQualityFlags: 'groq_failed' },  // retry previously failed tools
        ],
    }

    const total = await Tool.countDocuments(query)
    const toProcess = MAX_TOOLS_PER_RUN === Infinity ? total : Math.min(total, MAX_TOOLS_PER_RUN)
    console.log(`\n📊 Tools to enrich: ${toProcess} (of ${total} matching query)`)
    console.log(`⏱  Estimated time with ${keyCount} key(s): ~${Math.round(toProcess * DELAY_MS / keyCount / 60000)} minutes`)
    console.log(`🚦 Starting in 3 seconds... Press Ctrl+C to stop safely.\n`)
    await sleep(3000)

    // Fetch tools: groq_failed first, then by lowest enrichmentScore
    const tools = await Tool.find(query)
        .sort({ dataQualityFlags: -1, enrichmentScore: 1, lastEnrichedAt: 1 })
        .limit(MAX_TOOLS_PER_RUN === Infinity ? 999999 : MAX_TOOLS_PER_RUN)
        .lean()

    let succeeded = 0
    let failed = 0
    let allKeysExhausted = false
    const failures = []
    const startTime = Date.now()

    let isShuttingDown = false
    process.on('SIGTERM', () => {
        console.log('\n🛑 SIGTERM received — finishing current tool and shutting down gracefully...')
        isShuttingDown = true
    })

    for (let i = 0; i < tools.length; i++) {
        const tool = tools[i]

        // Progress summary every BATCH_LOG_INTERVAL tools
        if (i > 0 && i % BATCH_LOG_INTERVAL === 0) {
            const elapsed = ((Date.now() - startTime) / 60000).toFixed(1)
            const eta = ((tools.length - i) * DELAY_MS / 60000).toFixed(1)
            console.log(
                `  📦 ${i}/${tools.length} | ✅ ${succeeded} | ❌ ${failed}` +
                ` | ⏱ ${elapsed}m elapsed | ~${eta}m remaining`
            )
        }

        try {
            const result = await enrichTool(tool)

            if (result.success) {
                succeeded++
                if (VERBOSE) {
                    console.log(`  ✅ [${i + 1}] ${tool.name} → score: ${result.score}`)
                }
            } else {
                failed++
                failures.push({ id: tool._id.toString(), name: tool.name, reason: result.reason })
                if (VERBOSE) {
                    console.warn(`  ⚠️  [${i + 1}] ${tool.name} — ${result.reason}`)
                }
            }

        } catch (err) {
            // All Groq keys have hit their daily limit — stop cleanly
            if (err instanceof DailyTokenLimitError || err.code === 'daily_limit') {
                console.log(`\n🛑 All ${keyCount} Groq API key(s) hit daily token limit.`)
                console.log(`   ✅ ${succeeded} tools enriched this run.`)
                console.log(`   Re-run the script tomorrow (or add more keys to .env) to continue.\n`)
                allKeysExhausted = true
                break
            }

            failed++
            failures.push({ id: tool._id.toString(), name: tool.name, reason: err.message })
            console.error(`  ❌ [${i + 1}] ${tool.name} — unexpected:`, err.message)
        }

        // Save failures file every 100 tools (crash recovery)
        if (i > 0 && i % 100 === 0) {
            fs.writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2))
        }

        // Rate-limit delay (skip after last tool)
        if (i < tools.length - 1 && !allKeysExhausted && !isShuttingDown) {
            await sleep(DELAY_MS)
        }

        console.log(`PROGRESS:processed:${i + 1}:total:${toProcess}`)

        if (isShuttingDown) {
            console.log('\n🛑 Stopping loop due to SIGTERM')
            break
        }
    }

    // Final failure log
    if (failures.length > 0) {
        fs.writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2))
        console.log(`\n📝 Failure log saved to: ${FAILURES_FILE}`)
    }

    const totalElapsed = ((Date.now() - startTime) / 60000).toFixed(1)
    const processedCount = succeeded + failed
    console.log(`\n═════════════════════════════════════`)
    if (allKeysExhausted) {
        console.log(`🛑 STOPPED — Daily key limit reached`)
    } else {
        console.log(`✅ BULK ENRICHMENT COMPLETE`)
    }
    console.log(`  Total processed: ${processedCount}`)
    console.log(`  Succeeded:       ${succeeded} (${processedCount > 0 ? Math.round(succeeded / processedCount * 100) : 0}%)`)
    console.log(`  Failed:          ${failed}`)
    console.log(`  Time elapsed:    ${totalElapsed} minutes`)

    if (allKeysExhausted) {
        console.log(`\n  💡 To add more capacity, add to .env:`)
        console.log(`     GROQ_API_KEY_2=gsk_...`)
        console.log(`     GROQ_API_KEY_3=gsk_...`)
        console.log(`     Create free accounts at: https://console.groq.com`)
    }
    console.log(`═════════════════════════════════════\n`)

    await mongoose.disconnect()
    process.exit(0)
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
