/**
 * enrichmentCron.js
 * Runs Mon / Wed / Fri at 08:00 UTC (3× per week).
 *
 * Tasks per run:
 *  1. AI-enrich a priority batch of 50 tools (lowest enrichmentScore first)
 *  2. Compute full weighted trendingScore for ALL active tools
 *  3. Reset isTrending flag — mark top 20 by trendingScore as trending
 *  4. Reset isNew flag on tools older than 30 days
 *  5. Flag stale tools (70+ days since last enrichment) as needsEnrichment
 *  6. [Monday only] Reset weekly view/bookmark counters
 *
 * trendingScore formula:
 *   (weeklyViews × 2.0)
 * + (weeklyBookmarks × 3.5)
 * + (recentReviews × 4.0)   ← reviews in last 14 days
 * + (enrichmentScore × 0.3)  ← quality signal
 * + (isFeatured ? 10 : 0)
 * + (isNew ? 8 : 0)
 * - (daysSinceEnriched × 0.1) ← staleness penalty
 */

import cron from 'node-cron'
import Tool from '../models/Tool.js'
import Review from '../models/Review.js'
import { enrichTool, getEnrichmentBatch } from '../services/enrichmentService.js'

const BATCH_SIZE = 50
const ENRICHMENT_DELAY_MS = 2500  // 24 req/min — safe under Groq 30 req/min free tier
const CRON_SCHEDULE = '0 8 * * 1,3,5'  // Mon, Wed, Fri at 08:00 UTC
const DAILY_SCORE_SCHEDULE = '0 3 * * *' // Daily at 3:00 AM UTC — recompute scores

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// ─────────────────────────────────────────────────────────────────────────────
// Core: Weighted trendingScore computation
// ─────────────────────────────────────────────────────────────────────────────
export async function computeAndSaveTrendingScores() {
    const start = Date.now()

    // Get review counts per tool for the last 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const recentReviewCounts = await Review.aggregate([
        { $match: { createdAt: { $gte: fourteenDaysAgo } } },
        { $group: { _id: '$toolId', count: { $sum: 1 } } },
    ])
    const reviewMap = Object.fromEntries(recentReviewCounts.map(r => [r._id.toString(), r.count]))

    // Fetch all active tools with only the fields needed for scoring
    const allTools = await Tool.find({ isActive: { $ne: false }, status: 'active' })
        .select('_id weeklyViews weeklyBookmarks enrichmentScore isFeatured isNew lastEnrichedAt')
        .lean()

    const now = Date.now()

    const bulkOps = allTools.map(t => {
        const daysSinceEnriched = t.lastEnrichedAt
            ? Math.floor((now - new Date(t.lastEnrichedAt).getTime()) / (1000 * 60 * 60 * 24))
            : 999 // never enriched = high staleness penalty

        const recentReviews = reviewMap[t._id.toString()] || 0

        const rawScore =
            (t.weeklyViews || 0) * 2.0
            + (t.weeklyBookmarks || 0) * 3.5
            + recentReviews * 4.0
            + (t.enrichmentScore || 0) * 0.3
            + (t.isFeatured ? 10 : 0)
            + (t.isNew ? 8 : 0)
            - Math.min(daysSinceEnriched * 0.1, 20) // cap staleness penalty at -20

        const trendingScore = Math.max(0, Math.round(rawScore))

        return {
            updateOne: {
                filter: { _id: t._id },
                update: { $set: { trendingScore } },
            },
        }
    })

    if (bulkOps.length > 0) {
        await Tool.bulkWrite(bulkOps, { ordered: false })
    }

    // Mark top 20 by trendingScore as isTrending
    await Tool.updateMany({ isActive: { $ne: false } }, { $set: { isTrending: false } })
    const top20 = await Tool.find({ isActive: { $ne: false }, status: 'active' })
        .sort({ trendingScore: -1 })
        .limit(20)
        .select('_id')
        .lean()

    if (top20.length > 0) {
        await Tool.updateMany(
            { _id: { $in: top20.map(t => t._id) } },
            { $set: { isTrending: true } }
        )
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`✅ [trendingScore] Computed for ${bulkOps.length} tools, marked ${top20.length} trending — ${elapsed}s`)

    return { processed: bulkOps.length, trending: top20.length }
}

// ─────────────────────────────────────────────────────────────────────────────
// Enrichment cron — Mon/Wed/Fri at 08:00 UTC
// ─────────────────────────────────────────────────────────────────────────────
export function startEnrichmentCron() {
    cron.schedule(CRON_SCHEDULE, async () => {
        console.log('🔄 [enrichmentCron] Starting scheduled enrichment run...')
        const runStart = Date.now()

        try {
            // ── Task 1: AI enrichment batch ──────────────────────────────────
            const batch = await getEnrichmentBatch(BATCH_SIZE)

            if (batch.length === 0) {
                console.log('[enrichmentCron] No tools need enrichment — database is fresh ✅')
            } else {
                console.log(`[enrichmentCron] Enriching ${batch.length} tools...`)
                let batchSucceeded = 0, batchFailed = 0

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
                console.log(`✅ [enrichmentCron] Batch done: ${batchSucceeded} ok, ${batchFailed} failed`)
            }

            // ── Task 2: trendingScore + isTrending ──────────────────────────
            await computeAndSaveTrendingScores()

            // ── Task 3: Reset isNew for tools older than 30 days ────────────
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            const expiredResult = await Tool.updateMany(
                { isNew: true, createdAt: { $lt: thirtyDaysAgo } },
                { $set: { isNew: false } }
            )
            if (expiredResult.modifiedCount > 0) {
                console.log(`✅ [enrichmentCron] Cleared isNew for ${expiredResult.modifiedCount} tools`)
            }

            // ── Task 4: Flag stale tools ─────────────────────────────────────
            const staleDate = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000)
            const staleResult = await Tool.updateMany(
                {
                    status: 'active',
                    isActive: { $ne: false },
                    $or: [{ lastEnrichedAt: { $lt: staleDate } }, { lastEnriched: { $lt: staleDate } }],
                },
                { $set: { needsEnrichment: true } }
            )
            if (staleResult.modifiedCount > 0) {
                console.log(`✅ [enrichmentCron] Flagged ${staleResult.modifiedCount} stale tools`)
            }

            // ── Task 5: [Monday only] Reset weekly counters ──────────────────
            if (new Date().getDay() === 1) {
                await Tool.updateMany(
                    { isActive: { $ne: false } },
                    { $set: { weeklyViews: 0, weeklyBookmarks: 0 } }
                )
                console.log('✅ [enrichmentCron] Weekly counters reset (Monday)')
            }

            const elapsed = ((Date.now() - runStart) / 1000).toFixed(1)
            console.log(`✅ [enrichmentCron] Full run complete in ${elapsed}s`)

        } catch (err) {
            console.error('[enrichmentCron] Run failed:', err.message)
        }
    })

    // Also run trendingScore computation daily at 3AM (lightweight, no Groq calls)
    cron.schedule(DAILY_SCORE_SCHEDULE, async () => {
        console.log('📊 [trendingScore] Daily score recompute starting...')
        try {
            await computeAndSaveTrendingScores()
        } catch (err) {
            console.error('[trendingScore] Daily recompute failed:', err.message)
        }
    })

    console.log(`📅 [enrichmentCron] Scheduled — enrichment Mon/Wed/Fri 08:00 UTC, trendingScore daily 03:00 UTC`)
}
