/**
 * bulkScreenshot.js
 * Captures and uploads screenshots for all enriched tools that don't have one yet.
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 *   Full run (all tools):
 *     node src/scripts/bulkScreenshot.js
 *
 *   Process only N tools then stop (safe to stop-and-continue later):
 *     node src/scripts/bulkScreenshot.js --limit 200
 *
 *   Verbose off (quieter output):
 *     node src/scripts/bulkScreenshot.js --quiet
 *
 * ─── PAUSE / RESUME ──────────────────────────────────────────────────────────
 *   Pausing:
 *     - Press Ctrl+C at ANY time — the script will gracefully close the browser,
 *       write the failure log, and exit cleanly. No partial state is lost.
 *     - Or use --limit N to process a fixed batch and stop cleanly.
 *
 *   Resuming:
 *     - Just re-run the script. The MongoDB query skips all tools that already
 *       have a screenshotUrl, so only unprocessed tools are picked up.
 *     - Progress is always tracked by the DB state, not a file pointer.
 *
 * ─── ESTIMATED TIME ──────────────────────────────────────────────────────────
 *   ~3,000 tools × 4s = ~3.3 hours total
 *   Run in batches: --limit 200 (~13 min per batch)
 *
 * ─── FAILURE LOG ─────────────────────────────────────────────────────────────
 *   logs/screenshot-failures.json — re-runnable via --retry flag (future)
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Tool from '../models/Tool.js'
import { captureAndUploadScreenshot, closeBrowser } from '../services/screenshotService.js'
import { syncToolToAlgolia } from '../config/algolia.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOGS_DIR   = path.join(__dirname, '../../logs')
const FAIL_FILE  = path.join(LOGS_DIR, 'screenshot-failures.json')
const DELAY_MS   = 4000          // 4s between captures — gives sites time to load
const LOG_EVERY  = 10            // summary line every N tools

// ── Parse CLI flags ───────────────────────────────────────────────────────────
const args   = process.argv.slice(2)
const LIMIT  = (() => { const i = args.indexOf('--limit');  return i !== -1 ? parseInt(args[i + 1]) : Infinity })()
const QUIET  = args.includes('--quiet')
const log    = (...a) => { if (!QUIET) console.log(...a) }

// ── Graceful shutdown state ───────────────────────────────────────────────────
let stopping    = false
let globalFails = []

function writeFails() {
    if (globalFails.length === 0) return
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })
    fs.writeFileSync(FAIL_FILE, JSON.stringify(globalFails, null, 2))
    console.log(`\n📝 Failure log → ${FAIL_FILE}`)
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

// ── Graceful Ctrl+C ───────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
    if (stopping) return
    stopping = true
    console.log('\n\n⏸  Ctrl+C received — stopping gracefully...')
    writeFails()
    await closeBrowser()
    console.log('✅ Browser closed. Re-run the script to resume from where it left off.')
    console.log('   (Completed tools already have screenshotUrl saved in MongoDB — they will be skipped.)\n')
    await mongoose.disconnect()
    process.exit(0)
})

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    await mongoose.connect(process.env.MONGODB_URI)
    log('✅ Connected to MongoDB')

    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })

    // Load any existing failures from a previous run (so they accumulate)
    if (fs.existsSync(FAIL_FILE)) {
        try {
            globalFails = JSON.parse(fs.readFileSync(FAIL_FILE, 'utf8'))
            if (globalFails.length > 0) {
                log(`ℹ️  Loaded ${globalFails.length} existing failures from previous run.`)
            }
        } catch (_) { globalFails = [] }
    }

    // ── Query: only enriched tools without a screenshot ─────────────────────
    const query = {
        status: 'active',
        isActive: { $ne: false },
        enrichmentScore: { $gt: 0 },
        $or: [
            { screenshotUrl: { $exists: false } },
            { screenshotUrl: null },
            { screenshotUrl: '' },
        ],
    }

    const totalRemaining = await Tool.countDocuments(query)
    const toProcess      = LIMIT < Infinity ? Math.min(LIMIT, totalRemaining) : totalRemaining

    if (totalRemaining === 0) {
        console.log('\n🎉 All enriched tools already have screenshots. Nothing to do.\n')
        await mongoose.disconnect()
        process.exit(0)
    }

    console.log(`\n📸 Remaining tools needing screenshots: ${totalRemaining}`)
    if (LIMIT < Infinity) {
        console.log(`🎯 This run will process up to: ${LIMIT} tools (--limit flag)`)
    }
    console.log(`⏱  Estimated time for this run: ~${Math.round(toProcess * DELAY_MS / 60000)} minutes`)
    console.log(`\n💡 TIP: Press Ctrl+C at any time to pause safely.`)
    console.log(`        Re-run the script to continue from where you left off.\n`)
    console.log(`🚦 Starting in 3 seconds...\n`)
    await sleep(3000)

    // Fetch only what we need for this run
    const tools = await Tool.find(query)
        .sort({ enrichmentScore: -1, ratings: -1 }) // best quality first
        .limit(LIMIT < Infinity ? LIMIT : 0)         // 0 = no limit in Mongoose
        .select('_id name slug officialUrl websiteUrl')
        .lean()

    let succeeded = 0
    let failed    = 0
    const startTime = Date.now()

    for (let i = 0; i < tools.length; i++) {
        if (stopping) break

        const tool = tools[i]

        // Progress summary line
        if (i > 0 && i % LOG_EVERY === 0) {
            const elapsed = ((Date.now() - startTime) / 60000).toFixed(1)
            const eta     = ((tools.length - i) * DELAY_MS / 60000).toFixed(1)
            console.log(
                `  📦 ${i}/${tools.length} | ✅ ${succeeded} | ❌ ${failed}` +
                ` | ⏱ ${elapsed}m elapsed | ~${eta}m left`
            )
        }

        try {
            const result = await captureAndUploadScreenshot(tool)

            if (result.url) {
                await Tool.findByIdAndUpdate(tool._id, {
                    $set: {
                        screenshotUrl: result.url,
                        screenshotTakenAt: result.takenAt,
                    },
                })

                // Re-sync to Algolia (non-blocking)
                const updated = await Tool.findById(tool._id)
                    .populate('category', 'name slug')
                    .lean()
                if (updated) syncToolToAlgolia(updated).catch(() => {})

                succeeded++
                log(`  ✅ [${i + 1}] ${tool.name}`)
                log(`       → ${result.url}`)

            } else {
                failed++
                // Avoid duplicate failure entries across runs
                const existing = globalFails.findIndex(f => f.id === tool._id.toString())
                const entry = { id: tool._id.toString(), name: tool.name, url: tool.officialUrl || tool.websiteUrl, error: result.error }
                if (existing !== -1) globalFails[existing] = entry
                else globalFails.push(entry)

                log(`  ⚠️  [${i + 1}] ${tool.name} — ${result.error}`)
            }

        } catch (err) {
            failed++
            const entry = { id: tool._id.toString(), name: tool.name, error: err.message }
            const existing = globalFails.findIndex(f => f.id === tool._id.toString())
            if (existing !== -1) globalFails[existing] = entry
            else globalFails.push(entry)

            console.error(`  ❌ [${i + 1}] ${tool.name} — unexpected:`, err.message)
        }

        // Flush failure log every 50 tools
        if ((i + 1) % 50 === 0) writeFails()

        if (i < tools.length - 1 && !stopping) await sleep(DELAY_MS)
    }

    // ── Final summary ─────────────────────────────────────────────────────────
    await closeBrowser()
    writeFails()

    const totalElapsed  = ((Date.now() - startTime) / 60000).toFixed(1)
    const processedCount = succeeded + failed
    const remaining      = totalRemaining - succeeded

    console.log('\n═══════════════════════════════════════════')
    console.log('📸 BULK SCREENSHOT — SESSION COMPLETE')
    console.log(`   Processed this run:  ${processedCount}`)
    console.log(`   Uploaded:            ${succeeded}`)
    console.log(`   Failed:              ${failed}`)
    console.log(`   Still remaining:     ${Math.max(0, remaining)} tools without screenshots`)
    console.log(`   Time elapsed:        ${totalElapsed} minutes`)
    if (remaining > 0) {
        console.log(`\n💡 To continue: node src/scripts/bulkScreenshot.js`)
        if (LIMIT < Infinity) {
            console.log(`   Or:             node src/scripts/bulkScreenshot.js --limit ${LIMIT}`)
        }
    } else {
        console.log('\n🎉 All enriched tools now have screenshots!')
    }
    console.log('═══════════════════════════════════════════\n')

    await mongoose.disconnect()
    process.exit(0)
}

main().catch(err => {
    console.error('Fatal error:', err)
    writeFails()
    closeBrowser().finally(() => process.exit(1))
})
