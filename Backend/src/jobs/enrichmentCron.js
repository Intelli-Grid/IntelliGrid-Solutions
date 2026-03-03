/**
 * enrichmentCron.js
 * Runs Mon / Wed / Fri at 08:00 UTC (3× per week).
 *
 * Tasks per run:
 *  1. AI-enrich a priority batch of 50 tools (lowest enrichmentScore first)
 *  2. Reset isTrending on all tools, mark top-20 by views as trending
 *  3. Compute trendingScore for all active tools
 *  4. Reset isNew flag on tools older than 30 days
 *  5. Flag stale tools (70+ days since last enrichment) as needsEnrichment
 */

import cron from 'node-cron'
import Tool from '../models/Tool.js'
import { enrichTool, getEnrichmentBatch } from '../services/enrichmentService.js'

const BATCH_SIZE = 50
const ENRICHMENT_DELAY_MS = 2500  // 24 req/min — safe under Groq 30 req/min free tier
const CRON_SCHEDULE = '0 8 * * 1,3,5'  // Mon, Wed, Fri at 08:00 UTC

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function startEnrichmentCron() {
    cron.schedule(CRON_SCHEDULE, async () => {
        console.log('🔄 [enrichmentCron] Starting scheduled enrichment run...')
        const runStart = Date.now()

        try {
            // ── Task 1: AI enrichment batch ──────────────────────────────────────
            console.log(`[enrichmentCron] Fetching priority batch of ${BATCH_SIZE} tools...`)
            const batch = await getEnrichmentBatch(BATCH_SIZE)

            if (batch.length === 0) {
                console.log('[enrichmentCron] No tools need enrichment — database is fresh ✅')
            } else {
                console.log(`[enrichmentCron] Enriching ${batch.length} tools...`)
                let batchSucceeded = 0
                let batchFailed = 0

                for (let i = 0; i < batch.length; i++) {
                    const tool = batch[i]
                    try {
                        const result = await enrichTool(tool)
                        if (result.success) {
                            batchSucceeded++
                            console.log(`  ✅ [${i + 1}/${batch.length}] ${tool.name} → score: ${result.score}`)
                        } else {
                            batchFailed++
                            console.warn(`  ⚠️  [${i + 1}/${batch.length}] ${tool.name} — ${result.reason}`)
                        }
                    } catch (err) {
                        batchFailed++
                        console.error(`  ❌ Error enriching ${tool.name}:`, err.message)
                    }

                    if (i < batch.length - 1) await sleep(ENRICHMENT_DELAY_MS)
                }

                console.log(`✅ [enrichmentCron] Enrichment batch done: ${batchSucceeded} ok, ${batchFailed} failed`)
            }

            // ── Task 2: Reset + recompute isTrending ────────────────────────────
            await Tool.updateMany(
                { isActive: { $ne: false } },
                { $set: { isTrending: false } }
            )

            const trendingTools = await Tool.find({ isActive: { $ne: false }, status: 'active' })
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

            // ── Task 3: Compute trendingScore for all active tools ───────────────
            // trendingScore = (weeklyViews × 1 + weeklyBookmarks × 3) × (1 + enrichmentScore/100 × 0.2)
            const allTools = await Tool.find({ isActive: { $ne: false }, status: 'active' })
                .select('_id weeklyViews weeklyBookmarks enrichmentScore')
                .lean()

            const bulkOps = allTools.map(t => {
                const viewWeight = 1.0
                const bookmarkWeight = 3.0
                const qualityBonus = ((t.enrichmentScore || 0) / 100) * 0.2
                const trendingScore = Math.round(
                    ((t.weeklyViews || 0) * viewWeight + (t.weeklyBookmarks || 0) * bookmarkWeight) * (1 + qualityBonus)
                )
                return {
                    updateOne: {
                        filter: { _id: t._id },
                        update: {
                            $set: { trendingScore },
                            // Reset weekly counters each Monday
                        },
                    },
                }
            })

            if (bulkOps.length > 0) {
                await Tool.bulkWrite(bulkOps)
                console.log(`✅ [enrichmentCron] Computed trendingScore for ${bulkOps.length} tools`)
            }

            // Reset weeklyViews + weeklyBookmarks on Mondays only (day 1 = Monday)
            const today = new Date()
            if (today.getDay() === 1) {
                await Tool.updateMany(
                    { isActive: { $ne: false } },
                    { $set: { weeklyViews: 0, weeklyBookmarks: 0 } }
                )
                console.log('✅ [enrichmentCron] Weekly view/bookmark counters reset (Monday)')
            }

            // ── Task 4: Reset isNew for tools older than 30 days ────────────────
            const thirtyDaysAgo = new Date()
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

            const expiredResult = await Tool.updateMany(
                { isNew: true, createdAt: { $lt: thirtyDaysAgo } },
                { $set: { isNew: false } }
            )
            if (expiredResult.modifiedCount > 0) {
                console.log(`✅ [enrichmentCron] Cleared isNew for ${expiredResult.modifiedCount} tools`)
            }

            // ── Task 5: Flag stale tools ─────────────────────────────────────────
            const staleDate = new Date()
            staleDate.setDate(staleDate.getDate() - 70)

            const staleResult = await Tool.updateMany(
                {
                    status: 'active',
                    isActive: { $ne: false },
                    $or: [
                        { lastEnrichedAt: { $lt: staleDate } },
                        { lastEnriched: { $lt: staleDate } },
                    ],
                },
                { $set: { needsEnrichment: true } }
            )
            if (staleResult.modifiedCount > 0) {
                console.log(`✅ [enrichmentCron] Flagged ${staleResult.modifiedCount} stale tools`)
            }

            const elapsed = ((Date.now() - runStart) / 1000).toFixed(1)
            console.log(`✅ [enrichmentCron] Run complete in ${elapsed}s`)

        } catch (err) {
            console.error('[enrichmentCron] Run failed:', err.message)
        }
    })

    console.log(`📅 [enrichmentCron] Scheduled — runs Mon/Wed/Fri at 08:00 UTC (${CRON_SCHEDULE})`)
}
