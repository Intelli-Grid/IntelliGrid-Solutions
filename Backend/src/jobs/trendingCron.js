// Backend/src/jobs/trendingCron.js
// Runs daily at 03:00 UTC.
// 1. Recomputes trending tools (top 10 by trendingScore / views)
// 2. Selects the Tool of the Day — a curated daily spotlight pick shown on the homepage

import cron from 'node-cron'
import Tool from '../models/Tool.js'

// ── Tool of the Day Selection ──────────────────────────────────────────────────
// Picks a tool that:
//   - Is active and enriched (enrichmentScore >= 40)
//   - Has a logo and short description
//   - Was NOT already the TOTD today (toolOfDayDate is not today)
// Priority: highest trendingScore among qualified tools, excluding yesterday's pick
async function selectToolOfTheDay() {
    try {
        const todayStart = new Date()
        todayStart.setUTCHours(0, 0, 0, 0)

        // Reset any tools that were TOTD yesterday but not today
        await Tool.updateMany(
            {
                isToolOfTheDay: true,
                toolOfDayDate: { $lt: todayStart },
            },
            {
                $set: { isToolOfTheDay: false },
            }
        )

        // Check if a tool is already selected for today
        const alreadySelected = await Tool.findOne({
            isToolOfTheDay: true,
            toolOfDayDate: { $gte: todayStart },
        }).lean()

        if (alreadySelected) {
            console.log(`[TrendingCron] ⭐ Tool of the Day already set: ${alreadySelected.name}`)
            return alreadySelected
        }

        // Pick the best qualified tool not already used today
        const candidate = await Tool.findOne({
            status: 'active',
            isActive: { $ne: false },
            logo: { $exists: true, $ne: '' },
            shortDescription: { $exists: true, $ne: '' },
            enrichmentScore: { $gte: 40 },
            // Exclude tools picked in the last 7 days to ensure variety
            $or: [
                { toolOfDayDate: null },
                { toolOfDayDate: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
            ],
        })
            .sort({ trendingScore: -1, 'ratings.average': -1, views: -1 })
            .select('_id name slug')
            .lean()

        if (!candidate) {
            console.log('[TrendingCron] ⚠️ No qualified Tool of the Day candidate found')
            return null
        }

        await Tool.findByIdAndUpdate(candidate._id, {
            $set: {
                isToolOfTheDay: true,
                toolOfDayDate: new Date(),
            },
        })

        console.log(`[TrendingCron] ⭐ Tool of the Day selected: ${candidate.name}`)
        return candidate
    } catch (err) {
        console.error('[TrendingCron] ❌ Tool of the Day selection failed:', err.message)
        return null
    }
}

// ── Trending Tools Update ──────────────────────────────────────────────────────
async function runTrendingUpdate() {
    console.log('🔄 [Jobs] Running trending tools update cron...')
    try {
        // First, reset all tools to not trending
        await Tool.updateMany({}, { $set: { isTrending: false } })

        // Find top tools by trendingScore (or views, etc.)
        const topTools = await Tool.find({ status: 'active', isActive: { $ne: false } })
            .sort({ trendingScore: -1, views: -1 })
            .limit(10)
            .select('_id')
            .lean()

        const topToolIds = topTools.map(t => t._id)

        // Set those to trending
        if (topToolIds.length > 0) {
            await Tool.updateMany(
                { _id: { $in: topToolIds } },
                { $set: { isTrending: true } }
            )
        }

        console.log(`✅ [Jobs] Trending cron completed. Marked ${topToolIds.length} tools as trending.`)
    } catch (error) {
        console.error('❌ [Jobs] Error in trending cron:', error.message)
    }
}

// ── Combined Daily Job ─────────────────────────────────────────────────────────
export const startTrendingCron = () => {
    // Run every day at 03:00 UTC
    cron.schedule('0 3 * * *', async () => {
        await runTrendingUpdate()
        await selectToolOfTheDay()
    }, { timezone: 'UTC' })

    console.log('✅ Trending Cron Scheduled (03:00 UTC daily — trending + Tool of the Day)')
}

// Export for manual trigger from War Room UI
export { selectToolOfTheDay }
