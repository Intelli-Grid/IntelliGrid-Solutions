import cron from 'node-cron'
import Tool from '../models/Tool.js'

export const startTrendingCron = () => {
    // Run every day at 03:00 UTC
    cron.schedule('0 3 * * *', async () => {
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
    })
    console.log('✅ Trending Cron Scheduled')
}
