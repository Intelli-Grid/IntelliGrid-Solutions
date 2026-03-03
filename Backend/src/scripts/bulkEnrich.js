/**
 * bulkEnrich.js
 * One-time script to AI-enrich all IntelliGrid tools using Groq.
 *
 * Run from the Backend/ directory:
 *   node src/scripts/bulkEnrich.js
 *
 * Features:
 *   - Processes tools sorted by enrichmentScore ASC (worst first)
 *   - 2.5s delay between tools → stays well under Groq 30 req/min limit
 *   - Resumes from where it left off if interrupted (checks lastEnrichedAt)
 *   - Logs failures to a JSON file for re-run
 *   - Progress saved every 100 tools
 *
 * Estimated runtime: ~4,125 tools × 2.5s = ~172 minutes (~3 hours)
 * Groq free tier: 6,000 req/day → split across 2 days if needed
 *   Day 1: 2,400 tools (2,400 × 2.5s = 100 mins)
 *   Day 2: remaining tools
 *
 * To limit to N tools per day, set MAX_TOOLS_PER_RUN below.
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Tool from '../models/Tool.js'
import { enrichTool } from '../services/enrichmentService.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Config ────────────────────────────────────────────────────────────────────
const DELAY_MS = 2500           // ms between Groq calls (24 req/min — safe under 30 req/min limit)
const MAX_TOOLS_PER_RUN = 2400  // set to Infinity to process all in one run
const BATCH_LOG_INTERVAL = 50   // print progress every N tools
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

    // Load previously failed tool IDs (for selective re-run)
    let previousFailures = []
    if (fs.existsSync(FAILURES_FILE)) {
        try {
            previousFailures = JSON.parse(fs.readFileSync(FAILURES_FILE, 'utf-8'))
            console.log(`ℹ️  Found ${previousFailures.length} previously failed tools — will re-try them first`)
        } catch (_) { }
    }

    // Build query: tools not yet enriched in this pipeline version
    // Using lastEnrichedAt OR enrichmentScore < 20 as the filter
    const query = {
        status: 'active',
        isActive: { $ne: false },
        $or: [
            { lastEnrichedAt: { $exists: false } },
            { lastEnrichedAt: null },
            { enrichmentScore: { $lt: 30 } },
        ],
    }

    const total = await Tool.countDocuments(query)
    console.log(`\n📊 Tools to enrich: ${Math.min(total, MAX_TOOLS_PER_RUN)} (of ${total} matching query)`)
    console.log(`⏱  Estimated time: ~${Math.round(Math.min(total, MAX_TOOLS_PER_RUN) * DELAY_MS / 60000)} minutes`)
    console.log(`🚦 Starting in 3 seconds... Press Ctrl+C to stop safely.\n`)
    await sleep(3000)

    // Fetch tools sorted by enrichmentScore ASC (worst first = highest priority)
    const tools = await Tool.find(query)
        .sort({ enrichmentScore: 1, lastEnriched: 1 })
        .limit(MAX_TOOLS_PER_RUN)
        .lean()

    let succeeded = 0
    let failed = 0
    let skipped = 0
    const failures = []
    const startTime = Date.now()

    for (let i = 0; i < tools.length; i++) {
        const tool = tools[i]

        // Progress log
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
                if (process.env.VERBOSE === 'true') {
                    console.log(`  ✅ [${i + 1}] ${tool.name} → score: ${result.score}`)
                }
            } else {
                failed++
                failures.push({ id: tool._id.toString(), name: tool.name, reason: result.reason })
                console.warn(`  ⚠️  [${i + 1}] ${tool.name} — ${result.reason}`)
            }
        } catch (err) {
            failed++
            failures.push({ id: tool._id.toString(), name: tool.name, reason: err.message })
            console.error(`  ❌ [${i + 1}] ${tool.name} — unexpected:`, err.message)
        }

        // Save failures file every 100 tools (in case of crash)
        if (i > 0 && i % 100 === 0) {
            fs.writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2))
        }

        // Rate-limit delay (skip after last tool)
        if (i < tools.length - 1) {
            await sleep(DELAY_MS)
        }
    }

    // Final failure log write
    if (failures.length > 0) {
        fs.writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2))
        console.log(`\n📝 Failure log saved to: ${FAILURES_FILE}`)
    }

    const totalElapsed = ((Date.now() - startTime) / 60000).toFixed(1)
    console.log(`\n═════════════════════════════════════`)
    console.log(`✅ BULK ENRICHMENT COMPLETE`)
    console.log(`  Total processed: ${tools.length}`)
    console.log(`  Succeeded:       ${succeeded} (${Math.round(succeeded / tools.length * 100)}%)`)
    console.log(`  Failed:          ${failed}`)
    console.log(`  Skipped:         ${skipped}`)
    console.log(`  Time elapsed:    ${totalElapsed} minutes`)
    console.log(`═════════════════════════════════════\n`)

    await mongoose.disconnect()
    process.exit(0)
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
