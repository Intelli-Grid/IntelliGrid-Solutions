/**
 * bulkScreenshot.js
 * One-time script to capture and upload screenshots for all enriched tools.
 *
 * Run AFTER bulkEnrich.js has completed:
 *   node src/scripts/bulkScreenshot.js
 *
 * Strategy:
 *   - Only processes tools that have been Groq-enriched (enrichmentScore > 0)
 *     and don't have a screenshot yet (screenshotUrl is empty)
 *   - Captures at 1280x800 viewport using local Chrome
 *   - Uploads to Cloudinary as WebP (auto-optimised)
 *   - Saves the CDN URL + timestamp back to MongoDB
 *   - Syncs updated tool to Algolia
 *   - 3s delay between tools to avoid rate limits and memory leaks
 *   - Logs failures to logs/screenshot-failures.json for selective re-run
 *
 * Estimated time: ~3,000 tools × 3s = ~2.5 hours
 * Cloudinary free tier: 25GB — enough for ~25,000 screenshots
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js'
import { captureAndUploadScreenshot, closeBrowser } from '../services/screenshotService.js'
import { syncToolToAlgolia } from '../config/algolia.js'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FAILURES_FILE = path.join(__dirname, '../../logs/screenshot-failures.json')
const DELAY_MS = 3000          // 3s between captures
const BATCH_LOG_INTERVAL = 10  // log summary every N tools
const VERBOSE = true

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

async function main() {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    const logsDir = path.join(__dirname, '../../logs')
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })

    // Only process enriched tools without a screenshot
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

    const total = await Tool.countDocuments(query)
    console.log(`\n📸 Tools needing screenshots: ${total}`)
    console.log(`⏱  Estimated time: ~${Math.round(total * DELAY_MS / 60000)} minutes`)
    console.log(`🚦 Starting in 3 seconds... Ctrl+C to stop safely.\n`)
    await sleep(3000)

    const tools = await Tool.find(query)
        .sort({ enrichmentScore: -1 }) // highest quality tools first
        .lean()

    let succeeded = 0
    let failed = 0
    const failures = []
    const startTime = Date.now()

    for (let i = 0; i < tools.length; i++) {
        const tool = tools[i]

        // Progress summary
        if (i > 0 && i % BATCH_LOG_INTERVAL === 0) {
            const elapsed = ((Date.now() - startTime) / 60000).toFixed(1)
            const eta = ((tools.length - i) * DELAY_MS / 60000).toFixed(1)
            console.log(
                `  📦 ${i}/${tools.length} | ✅ ${succeeded} | ❌ ${failed}` +
                ` | ⏱ ${elapsed}m elapsed | ~${eta}m remaining`
            )
        }

        try {
            const result = await captureAndUploadScreenshot(tool)

            if (result.url) {
                // Save URL + timestamp to MongoDB
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
                if (updated) {
                    syncToolToAlgolia(updated).catch(() => { })
                }

                succeeded++
                if (VERBOSE) {
                    console.log(`  ✅ [${i + 1}] ${tool.name}`)
                    console.log(`       → ${result.url}`)
                }
            } else {
                failed++
                failures.push({ id: tool._id.toString(), name: tool.name, url: tool.officialUrl || tool.websiteUrl, error: result.error })
                if (VERBOSE) {
                    console.warn(`  ⚠️  [${i + 1}] ${tool.name} — ${result.error}`)
                }
            }

        } catch (err) {
            failed++
            failures.push({ id: tool._id.toString(), name: tool.name, error: err.message })
            console.error(`  ❌ [${i + 1}] ${tool.name} — unexpected:`, err.message)
        }

        // Save failure log every 50 tools
        if (i > 0 && i % 50 === 0 && failures.length > 0) {
            fs.writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2))
        }

        if (i < tools.length - 1) {
            await sleep(DELAY_MS)
        }
    }

    // Final cleanup
    await closeBrowser()

    if (failures.length > 0) {
        fs.writeFileSync(FAILURES_FILE, JSON.stringify(failures, null, 2))
        console.log(`\n📝 Failure log saved to: ${FAILURES_FILE}`)
    }

    const totalElapsed = ((Date.now() - startTime) / 60000).toFixed(1)
    const processedCount = succeeded + failed
    console.log(`\n═════════════════════════════════════`)
    console.log(`📸 BULK SCREENSHOT COMPLETE`)
    console.log(`  Total processed: ${processedCount}`)
    console.log(`  Uploaded:        ${succeeded} (${processedCount > 0 ? Math.round(succeeded / processedCount * 100) : 0}%)`)
    console.log(`  Failed:          ${failed}`)
    console.log(`  Time elapsed:    ${totalElapsed} minutes`)
    console.log(`═════════════════════════════════════\n`)

    await mongoose.disconnect()
    process.exit(0)
}

main().catch(err => {
    console.error('Fatal error:', err)
    closeBrowser().finally(() => process.exit(1))
})
