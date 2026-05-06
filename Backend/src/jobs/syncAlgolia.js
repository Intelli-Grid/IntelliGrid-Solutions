/**
 * syncAlgolia.js
 * v2.5.0 — Weekly full Algolia resync safety net.
 *
 * Purpose: Some enrichment scripts and admin actions update MongoDB directly
 * without calling syncToolToAlgolia (e.g. bulk enrichment, manual DB edits).
 * This cron ensures all active tools are eventually synced to Algolia even
 * if individual real-time syncs were skipped or failed.
 *
 * Schedule: Every Saturday at 01:00 UTC
 * Uses batches of 100 with 500ms buffer to stay within Algolia rate limits.
 */

import cron from 'node-cron'
import Tool from '../models/Tool.js'
import { syncToolToAlgolia } from '../config/algolia.js'

const BATCH_SIZE = 100
const BATCH_DELAY_MS = 500

/**
 * Run a full Algolia resync immediately (used by the cron and can be
 * called directly for a manual backfill after major schema changes).
 */
export async function runAlgoliaFullResync() {
    console.log('[AlgoliaResync] Starting full resync...')
    const startTime = Date.now()

    try {
        const tools = await Tool.find({
            status: { $in: ['active', 'auto_approved'] },
            isActive: { $ne: false },
        })
            .populate('category', 'name slug')
            .lean()

        if (tools.length === 0) {
            console.log('[AlgoliaResync] No active tools found — nothing to sync.')
            return { synced: 0, errors: 0 }
        }

        let synced = 0
        let errors = 0

        for (let i = 0; i < tools.length; i += BATCH_SIZE) {
            const batch = tools.slice(i, i + BATCH_SIZE)

            const results = await Promise.allSettled(
                batch.map(tool => syncToolToAlgolia(tool))
            )

            results.forEach((result, idx) => {
                if (result.status === 'fulfilled') {
                    synced++
                } else {
                    errors++
                    console.warn(
                        `[AlgoliaResync] Sync failed for tool ${batch[idx]?.slug || batch[idx]?._id}:`,
                        result.reason?.message || result.reason
                    )
                }
            })

            // Rate-limit buffer between batches — only needed for multi-batch runs
            if (tools.length > BATCH_SIZE && i + BATCH_SIZE < tools.length) {
                await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
            }

            const progress = Math.min(i + BATCH_SIZE, tools.length)
            console.log(`[AlgoliaResync] Progress: ${progress}/${tools.length} tools processed`)
        }

        const elapsed = Math.round((Date.now() - startTime) / 1000)
        console.log(`[AlgoliaResync] ✅ Done — synced: ${synced}, errors: ${errors}, time: ${elapsed}s`)

        return { synced, errors }

    } catch (err) {
        console.error('[AlgoliaResync] Fatal error during resync:', err.message)
        throw err
    }
}

/**
 * Register the weekly Algolia resync cron.
 * Call this once in server.js inside the app.listen callback.
 */
export function startAlgoliaResyncCron() {
    // Every Saturday at 01:00 UTC
    cron.schedule('0 1 * * 6', async () => {
        console.log('[AlgoliaResync] Weekly cron triggered (Saturday 01:00 UTC)')
        try {
            await runAlgoliaFullResync()
        } catch (err) {
            console.error('[AlgoliaResync] Cron run failed:', err.message)
        }
    }, {
        timezone: 'UTC',
    })

    console.log('[AlgoliaResync] Weekly resync cron registered — runs Saturday 01:00 UTC')
}
