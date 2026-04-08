import cron from 'node-cron'
import Tool from '../models/Tool.js'
import { getBot } from '../services/telegramBot.js'

export const startCommunityCrons = () => {
    console.log('⏰ Starting Community Crons...')

    // 1. Tool of the Day — Daily at 03:30 UTC (9:00 AM IST)
    cron.schedule('30 3 * * *', async () => {
        try {
            if (!process.env.TELEGRAM_COMMUNITY_CHANNEL_ID) return

            const b = getBot()
            if (!b) return

            // Pick the highest-quality new tool added in the last 24 hours
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
            const tool = await Tool.findOne({
                status: 'active',
                isActive: true,
                createdAt: { $gte: yesterday },
            })
                .sort({ enrichmentScore: -1, views: -1 })
                .populate('category')

            // Fallback: if no new tools today, pick best overall
            const featuredTool = tool || await Tool.findOne({ status: 'active', isActive: true })
                .sort({ enrichmentScore: -1 })
                .populate('category')

            if (!featuredTool) return

            const channelMsg =
                `🌟 *Tool of the Day*\n\n` +
                `🔥 *${featuredTool.name}*\n` +
                `${featuredTool.shortDescription}\n\n` +
                `🏷 Category: ${featuredTool.category?.name || 'Various'}\n` +
                `💰 Pricing: ${featuredTool.pricing}\n` +
                (featuredTool.enrichmentScore ? `📊 Quality Score: ${featuredTool.enrichmentScore}/100\n` : '') +
                `\n👉 [Explore on IntelliGrid](https://www.intelligrid.online/tool/${featuredTool.slug})\n\n` +
                `@IntelliGrid_Official`

            await b.telegram.sendMessage(process.env.TELEGRAM_COMMUNITY_CHANNEL_ID, channelMsg, { parse_mode: 'Markdown', disable_web_page_preview: false })
            console.log(`✅ [CRON] Tool of the Day posted: ${featuredTool.name} (score: ${featuredTool.enrichmentScore})`)
        } catch (err) {
            console.error('❌ [CRON] Tool of the day error:', err)
        }
    }, { timezone: 'UTC' })

    // 2. Weekly Top 5 Digest — Sunday at 04:30 UTC (10:00 AM IST)
    cron.schedule('30 4 * * 0', async () => {
        try {
            if (!process.env.TELEGRAM_COMMUNITY_CHANNEL_ID) return

            const b = getBot()
            if (!b) return

            // Pick best 5 new tools from this week (by enrichmentScore, then views)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            const tools = await Tool.find({
                status: 'active',
                isActive: true,
                createdAt: { $gte: weekAgo },
            })
                .sort({ enrichmentScore: -1, views: -1 })
                .limit(5)

            // Fallback: if fewer than 3 tools this week, use top tools overall
            const digestTools = tools.length >= 3 ? tools :
                await Tool.find({ status: 'active', isActive: true })
                    .sort({ enrichmentScore: -1, views: -1 })
                    .limit(5)

            if (digestTools.length === 0) return

            let channelMsg = `🌟 *IntelliGrid Weekly Digest*\nDiscover the top new AI tools this week:\n\n`
            digestTools.forEach((t, i) => {
                channelMsg += `${i+1}. *${t.name}*\n${t.shortDescription}\n🔗 [Explore](https://www.intelligrid.online/tool/${t.slug})\n\n`
            })
            channelMsg += `👉 Discover all tools at [IntelliGrid.online](https://www.intelligrid.online)\n\n@IntelliGrid_Official`
            
            await b.telegram.sendMessage(process.env.TELEGRAM_COMMUNITY_CHANNEL_ID, channelMsg, { parse_mode: 'Markdown', disable_web_page_preview: true })
            console.log(`✅ [CRON] Weekly digest posted.`)
        } catch (err) {
            console.error('❌ [CRON] Weekly digest error:', err)
        }
    }, { timezone: 'UTC' })
}
