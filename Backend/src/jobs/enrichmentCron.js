/**
 * enrichmentCron.js
 * Runs every Monday at 08:00 server time.
 *
 * Tasks:
 * 1. Flag tools not enriched in 90+ days as needsEnrichment: true
 *    (sorted by views DESC so highest-traffic tools are prioritised)
 * 2. Reset isTrending flag on all tools, then mark top-20 by views as trending
 *    (replaces any manual trending flags with data-driven signals each week)
 * 3. Reset isNew flag on tools older than 30 days
 *    (keeps the "New This Week" homepage section accurate)
 */

import cron from 'node-cron'
import Tool from '../models/Tool.js'

export function startEnrichmentCron() {
    // Run every Monday at 08:00 server time
    cron.schedule('0 8 * * 1', async () => {
        console.log('🔄 [enrichmentCron] Starting weekly enrichment maintenance...')

        try {
            // ── Task 1: Flag stale tools for re-enrichment ────────────────────
            const staleDate = new Date()
            staleDate.setDate(staleDate.getDate() - 90)

            const staleTools = await Tool.find({
                $or: [
                    { lastEnriched: { $lt: staleDate } },
                    { lastEnriched: null },
                ],
                isActive: true,
                status: 'active',
            })
                .sort({ views: -1 })          // Prioritise most-visited tools
                .limit(50)
                .select('_id name slug views lastEnriched')
                .lean()

            if (staleTools.length > 0) {
                const staleIds = staleTools.map(t => t._id)
                await Tool.updateMany(
                    { _id: { $in: staleIds } },
                    { $set: { needsEnrichment: true } }
                )
                console.log(`✅ [enrichmentCron] Flagged ${staleTools.length} stale tools for re-enrichment`)
            } else {
                console.log('✅ [enrichmentCron] No stale tools found — all data is fresh')
            }

            // ── Task 2: Update isTrending flags based on real view data ───────
            // Reset all tools to not trending
            await Tool.updateMany(
                { isActive: true },
                { $set: { isTrending: false } }
            )

            // Mark top-20 by views as trending
            const trendingTools = await Tool.find({ isActive: true, status: 'active' })
                .sort({ views: -1 })
                .limit(20)
                .select('_id')
                .lean()

            if (trendingTools.length > 0) {
                await Tool.updateMany(
                    { _id: { $in: trendingTools.map(t => t._id) } },
                    { $set: { isTrending: true } }
                )
                console.log(`✅ [enrichmentCron] Updated isTrending for top ${trendingTools.length} tools`)
            }

            // ── Task 3: Reset isNew for tools older than 30 days ─────────────
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const expiredNewResult = await Tool.updateMany(
                { isNew: true, createdAt: { $lt: thirtyDaysAgo } },
                { $set: { isNew: false } }
            )

            if (expiredNewResult.modifiedCount > 0) {
                console.log(`✅ [enrichmentCron] Cleared isNew flag from ${expiredNewResult.modifiedCount} tools older than 30 days`)
            }

            // Mark tools created in last 30 days as isNew (in case they weren't set on creation)
            const recentResult = await Tool.updateMany(
                { createdAt: { $gte: thirtyDaysAgo }, isNew: false, isActive: true, status: 'active' },
                { $set: { isNew: true } }
            )

            if (recentResult.modifiedCount > 0) {
                console.log(`✅ [enrichmentCron] Marked ${recentResult.modifiedCount} recently added tools as isNew`)
            }

            console.log('✅ [enrichmentCron] Weekly enrichment maintenance complete')
        } catch (err) {
            console.error('[enrichmentCron] Error:', err.message)
        }
    })

    console.log('📅 [enrichmentCron] Scheduled — runs every Monday at 08:00')
}
