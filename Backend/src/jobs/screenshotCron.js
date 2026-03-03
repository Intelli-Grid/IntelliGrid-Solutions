/**
 * screenshotCron.js
 * Cron job that runs nightly to capture screenshots for:
 *   1. New tools added since last run (no screenshot yet)
 *   2. Tools with stale screenshots (older than 30 days)
 *
 * Schedule: 2:00 AM every night (low-traffic window)
 * Batch size: 50 tools per night (safe for Cloudinary free tier)
 */

import cron from 'node-cron'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js'
import { captureAndUploadScreenshot } from '../services/screenshotService.js'
import { syncToolToAlgolia } from '../config/algolia.js'

const BATCH_SIZE = 50
const DELAY_MS = 3000

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

async function runScreenshotBatch() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const tools = await Tool.find({
        status: 'active',
        isActive: { $ne: false },
        enrichmentScore: { $gt: 0 },
        $or: [
            { screenshotUrl: { $exists: false } },
            { screenshotUrl: null },
            { screenshotUrl: '' },
            { screenshotTakenAt: { $lt: thirtyDaysAgo } },
        ],
    })
        .sort({ enrichmentScore: -1 })
        .limit(BATCH_SIZE)
        .lean()

    if (tools.length === 0) {
        console.log('[ScreenshotCron] No tools need screenshots tonight.')
        return
    }

    console.log(`[ScreenshotCron] Processing ${tools.length} tools...`)
    let succeeded = 0
    let failed = 0

    for (const tool of tools) {
        try {
            const result = await captureAndUploadScreenshot(tool)

            if (result.url) {
                await Tool.findByIdAndUpdate(tool._id, {
                    $set: {
                        screenshotUrl: result.url,
                        screenshotTakenAt: result.takenAt,
                    },
                })
                const updated = await Tool.findById(tool._id)
                    .populate('category', 'name slug')
                    .lean()
                if (updated) syncToolToAlgolia(updated).catch(() => { })
                succeeded++
            } else {
                failed++
            }
        } catch (err) {
            failed++
            console.error(`[ScreenshotCron] Error for ${tool.name}:`, err.message)
        }

        await sleep(DELAY_MS)
    }

    console.log(`[ScreenshotCron] Done — ✅ ${succeeded} uploaded, ❌ ${failed} failed`)
}

// 2:00 AM every night
export function startScreenshotCron() {
    cron.schedule('0 2 * * *', async () => {
        console.log('[ScreenshotCron] Starting nightly screenshot batch...')
        try {
            await runScreenshotBatch()
        } catch (err) {
            console.error('[ScreenshotCron] Batch failed:', err.message)
        }
    }, { timezone: 'UTC' })

    console.log('📸 Screenshot cron scheduled — runs nightly at 2:00 AM UTC')
}
