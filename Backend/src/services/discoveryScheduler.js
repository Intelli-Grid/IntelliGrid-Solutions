/**
 * discoveryScheduler.js — Batch 4E
 *
 * Cron service that orchestrates the daily tool discovery pipeline:
 *   - Daily at 08:00 UTC: fetch from Product Hunt (last 1 day)
 *   - Weekly Monday 09:00 UTC: broader 7-day fetch to catch any missed tools
 *
 * All discovered tools go into the BullMQ queue → processed async by the worker.
 * No tool touches the DB directly from this file.
 */

import cron from 'node-cron'
import mongoose from 'mongoose'
import { fetchProductHuntTools, mapPHTool } from './productHuntScraper.js'
import { enqueueTools, initDiscoveryQueue } from './discoveryQueue.js'

class DiscoveryScheduler {
    /**
     * Run a full discovery sweep from all enabled sources.
     * @param {number} daysBack - How many days to look back
     */
    async runDiscovery(daysBack = 1) {
        if (mongoose.connection.readyState !== 1) {
            console.warn('[DiscoveryScheduler] DB not connected — skipping run')
            return
        }

        console.log(`🔍 [DiscoveryScheduler] Starting discovery run (last ${daysBack} day(s))...`)

        const allTools = []

        // Source 1: Product Hunt
        try {
            const phPosts = await fetchProductHuntTools(daysBack)
            const phTools = phPosts
                .filter(p => p.website || p.url)
                .map(mapPHTool)
            allTools.push(...phTools)
            console.log(`[DiscoveryScheduler] Product Hunt: ${phTools.length} tools found`)
        } catch (err) {
            console.error('[DiscoveryScheduler] Product Hunt error:', err.message)
        }

        // Future sources can be added here:
        // Source 2: There's An AI For That RSS (Batch 5+)
        // Source 3: Twitter/X hashtag search (Batch 5+)

        if (allTools.length === 0) {
            console.log('[DiscoveryScheduler] No new tools discovered this run')
            return
        }

        // Enqueue ALL discovered tools for async processing
        await enqueueTools(allTools)
        console.log(`✅ [DiscoveryScheduler] ${allTools.length} tools queued for processing`)
    }

    /**
     * Start cron schedules.
     */
    startScheduler() {
        // Initialise BullMQ queue + worker
        initDiscoveryQueue()

        console.log('🔍 Discovery Scheduler initialised (node-cron: daily + weekly)')

        // Daily at 08:00 UTC — fetch yesterday's Product Hunt AI launches
        cron.schedule('0 8 * * *', async () => {
            console.log('⏰ [CRON] Daily discovery run...')
            await this.runDiscovery(1).catch(err =>
                console.error('[DiscoveryScheduler] Daily run error:', err)
            )
        }, { timezone: 'UTC' })

        // Monday 09:00 UTC — catch any tools missed during the week
        cron.schedule('0 9 * * 1', async () => {
            console.log('⏰ [CRON] Weekly broader discovery run (7 days)...')
            await this.runDiscovery(7).catch(err =>
                console.error('[DiscoveryScheduler] Weekly run error:', err)
            )
        }, { timezone: 'UTC' })
    }
}

export default new DiscoveryScheduler()
