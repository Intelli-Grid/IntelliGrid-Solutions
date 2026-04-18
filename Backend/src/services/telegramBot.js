/**
 * telegramBot.js
 * IntelliGrid — Telegram Owner Control Panel Bot
 *
 * A private bot that gives the platform owner full control over:
 *   - Live analytics (/stats, /revenue, /users, /trending, /health)
 *   - Database management (/db_stats, /sync_algolia, /enrichment_status)
 *   - User management (/user, /grant_pro, /revoke_pro)
 *   - Tool submissions (/submissions, approve/reject inline buttons)
 *   - Passive push alerts for payments, errors, new signups
 *
 * Security: ALL commands are silently ignored unless the sender's
 * Telegram user ID equals process.env.OWNER_TELEGRAM_ID.
 *
 * Uses ESM imports — matches the backend's "type":"module" package.json.
 */

import { Telegraf, Markup } from 'telegraf'
import mongoose from 'mongoose'

// ── Lazy model imports (avoids circular deps at boot) ─────────────────────────
let Tool, User, Submission

async function getModels() {
    if (!Tool) {
        const toolMod = await import('../models/Tool.js')
        const userMod = await import('../models/User.js')
        Tool = toolMod.default
        User = userMod.default
        try {
            const subMod = await import('../models/Submission.js')
            Submission = subMod.default
        } catch {
            Submission = null // Submission model may not exist yet
        }
    }
    return { Tool, User, Submission }
}

// ── Bot initialisation ────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const OWNER_ID = process.env.OWNER_TELEGRAM_ID

let bot = null
let botInitialised = false

function createBot() {
    if (!BOT_TOKEN || !OWNER_ID) {
        console.warn('⚠️  [TelegramBot] TELEGRAM_BOT_TOKEN or OWNER_TELEGRAM_ID not set — bot disabled')
        return null
    }

    const instance = new Telegraf(BOT_TOKEN)

    // ── Security middleware — drop all messages from non-owners ───────────────
    instance.use((ctx, next) => {
        const senderId = ctx.from?.id?.toString()
        if (senderId !== OWNER_ID.toString()) {
            // Silent drop — do not reply so bad actors learn nothing
            return
        }
        return next()
    })

    // ── /start ────────────────────────────────────────────────────────────────
    instance.command('start', (ctx) => {
        ctx.replyWithMarkdown(
            `🔐 *IntelliGrid Owner Panel*\n\n` +
            `Welcome back. All commands are live.\n\n` +
            `*📊 Analytics*\n` +
            `/stats — Live platform stats\n` +
            `/users — User breakdown\n` +
            `/trending — Top trending tools today\n` +
            `/health — System health check\n\n` +
            `*🗄 Database*\n` +
            `/db\\_stats — DB overview\n` +
            `/sync\\_algolia — Force Algolia re-index\n` +
            `/enrichment\\_status — Enrichment overview\n\n` +
            `*⚙️ Background Jobs (V2)*\n` +
            `/jobstatus — View all running/past jobs\n` +
            `/crawl <source> — Run Python crawler in background\n` +
            `/enrich — Run bulk enrichment via JobManager\n` +
            `/stopjob <id> — Gracefully stop a running job\n\n` +
            `*👥 Users*\n` +
            `/user <email> — Look up a user\n` +
            `/grant\\_pro <email> — Assign Pro role\n` +
            `/revoke\\_pro <email> — Remove Pro role\n\n` +
            `*📥 Content*\n` +
            `/submissions — Last 10 pending submissions\n` +
            `/reviewbatch — Review auto-staged tools (✅/❌)\n` +
            `/approvebatch — Bulk publish ALL staged tools\n\n` +
            `*📢 Community*\n` +
            `/publish <slug> — Post to channel\n` +
            `/announce <text> — Broadcast message\n` +
            `/digest — Send latest tools digest\n\n` +
            `*⚙️ System*\n` +
            `/cache — Redis status (NEW)\n` +
            `/logs — Log guidance (NEW)\n` +
            `/restart — App restart guidance (NEW)`
        )
    })

    // ── /stats ────────────────────────────────────────────────────────────────
    instance.command('stats', async (ctx) => {
        try {
            const { Tool: T, User: U } = await getModels()
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const [totalTools, totalUsers, proUsers, newToday, activeTools] = await Promise.all([
                T.countDocuments(),
                U.countDocuments(),
                U.countDocuments({ 'subscription.plan': { $in: ['pro', 'pro_yearly'] } }),
                U.countDocuments({ createdAt: { $gte: today } }),
                T.countDocuments({ status: 'active' }),
            ])

            const uptime = Math.floor(process.uptime())
            const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
            const dbState = mongoose.connection.readyState === 1 ? '🟢 Connected' : '🔴 Disconnected'

            await ctx.replyWithMarkdown(
                `📊 *IntelliGrid Live Stats*\n` +
                `📅 ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}\n\n` +
                `👥 Users: *${totalUsers.toLocaleString()}* (+${newToday} today)\n` +
                `⭐ Pro Users: *${proUsers}*\n` +
                `🛠 Total Tools: *${totalTools.toLocaleString()}*\n` +
                `✅ Active Tools: *${activeTools.toLocaleString()}*\n\n` +
                `⚡ Uptime: ${uptimeStr}\n` +
                `🗄 MongoDB: ${dbState}\n` +
                `🔑 Algolia: ${process.env.ALGOLIA_ADMIN_KEY ? '🟢 Configured' : '🔴 Missing'}\n` +
                `📧 Brevo: ${process.env.BREVO_API_KEY ? '🟢 Active' : '🔴 Missing'}`
            )
        } catch (err) {
            ctx.reply(`❌ Error fetching stats: ${err.message}`)
        }
    })

    // ── /health ───────────────────────────────────────────────────────────────
    instance.command('health', async (ctx) => {
        try {
            const dbState = mongoose.connection.readyState
            const dbStatus = dbState === 1 ? '🟢 Connected' : dbState === 2 ? '🟡 Connecting' : '🔴 Disconnected'
            const uptime = Math.floor(process.uptime())
            const mem = process.memoryUsage()

            await ctx.replyWithMarkdown(
                `🏥 *System Health*\n\n` +
                `🗄 MongoDB: ${dbStatus}\n` +
                `🔑 Algolia: ${process.env.ALGOLIA_ADMIN_KEY ? '🟢 Key set' : '🔴 Missing'}\n` +
                `🔒 Clerk: ${process.env.CLERK_SECRET_KEY ? '🟢 Active' : '🔴 Missing'}\n` +
                `💳 PayPal: ${process.env.PAYPAL_MODE || 'live'} mode\n` +
                `💳 Cashfree: ${process.env.CASHFREE_ENV || 'PROD'}\n\n` +
                `⏱ Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m\n` +
                `🧠 Heap Used: ${Math.round(mem.heapUsed / 1024 / 1024)} MB\n` +
                `🧠 RSS: ${Math.round(mem.rss / 1024 / 1024)} MB`
            )
        } catch (err) {
            ctx.reply(`❌ Health check error: ${err.message}`)
        }
    })

    // ── /publish ──────────────────────────────────────────────────────────────
    instance.command('publish', async (ctx) => {
        try {
            const args = ctx.message.text.split(' ')
            if (args.length < 2) return ctx.reply('Usage: /publish <slug>')
            const slug = args[1]
            
            const { Tool: T } = await getModels()
            const tool = await T.findOne({ slug, status: 'active' }).populate('category')
            if (!tool) return ctx.reply('❌ Tool not found or not active.')

            if (!process.env.TELEGRAM_COMMUNITY_CHANNEL_ID) {
                return ctx.reply('❌ TELEGRAM_COMMUNITY_CHANNEL_ID is not set.')
            }

            const channelMsg = `🚀 *New Tool on IntelliGrid*\n\n🔥 *${tool.name}*\n${tool.shortDescription}\n\n🏷 Category: ${tool.category?.name || 'Various'}\n💰 Pricing: ${tool.pricing}\n\n👉 [View on IntelliGrid](https://www.intelligrid.online/tool/${tool.slug})\n\n@IntelliGrid_Official`
            
            await instance.telegram.sendMessage(process.env.TELEGRAM_COMMUNITY_CHANNEL_ID, channelMsg, { parse_mode: 'Markdown', disable_web_page_preview: false })
            await ctx.reply(`✅ Successfully published ${tool.name} to community channel.`)
        } catch (err) {
            ctx.reply(`❌ Publish error: ${err.message}`)
        }
    })

    // ── /announce ─────────────────────────────────────────────────────────────
    instance.command('announce', async (ctx) => {
        try {
            const text = ctx.message.text.substring('/announce'.length).trim()
            if (!text) return ctx.reply('Usage: /announce <message>')

            if (!process.env.TELEGRAM_COMMUNITY_CHANNEL_ID) {
                return ctx.reply('❌ TELEGRAM_COMMUNITY_CHANNEL_ID is not set.')
            }

            const channelMsg = `📢 *IntelliGrid Announcement*\n\n${text}\n\n@IntelliGrid_Official`
            
            await instance.telegram.sendMessage(process.env.TELEGRAM_COMMUNITY_CHANNEL_ID, channelMsg, { parse_mode: 'Markdown' })
            await ctx.reply(`✅ Announcement sent.`)
        } catch (err) {
            ctx.reply(`❌ Announce error: ${err.message}`)
        }
    })

    // ── /digest ───────────────────────────────────────────────────────────────
    instance.command('digest', async (ctx) => {
        try {
            if (!process.env.TELEGRAM_COMMUNITY_CHANNEL_ID) {
                return ctx.reply('❌ TELEGRAM_COMMUNITY_CHANNEL_ID is not set.')
            }

            const { Tool: T } = await getModels()
            // Fetch top 5 recent tools
            const tools = await T.find({ status: 'active' }).sort({ createdAt: -1 }).limit(5)
            if (tools.length === 0) return ctx.reply('❌ No active tools to compile.')

            let channelMsg = `🌟 *IntelliGrid Weekly Digest*\nHere are the latest tools added this week:\n\n`
            tools.forEach((t, i) => {
                channelMsg += `${i+1}. *${t.name}* - ${t.shortDescription}\n🔗 [Explore](${t.officialUrl})\n\n`
            })
            channelMsg += `👉 Discover more tools at [IntelliGrid.online](https://www.intelligrid.online)`
            
            await instance.telegram.sendMessage(process.env.TELEGRAM_COMMUNITY_CHANNEL_ID, channelMsg, { parse_mode: 'Markdown', disable_web_page_preview: true })
            await ctx.reply(`✅ Digest sent.`)
        } catch (err) {
            ctx.reply(`❌ Digest error: ${err.message}`)
        }
    })

    // ── /dashboard ────────────────────────────────────────────────────────────
    instance.command('dashboard', async (ctx) => {
        try {
            const { Tool: T, User: U } = await getModels()
            const today = new Date(); today.setHours(0,0,0,0)
            const [totalTools, pendingTools, totalUsers, proUsers, newUsersToday] = await Promise.all([
                T.countDocuments({ status: 'active' }),
                T.countDocuments({ status: 'pending' }),
                U.countDocuments(),
                U.countDocuments({ 'subscription.plan': { $in: ['pro', 'pro_yearly'] }, 'subscription.status': 'active' }),
                U.countDocuments({ createdAt: { $gte: today } })
            ])
            const msg = `📊 *IntelliGrid Dashboard*\n━━━━━━━━━━━━━━━━━━━━━\n🛠 Active Tools: *${totalTools.toLocaleString()}*\n⏳ Pending Approval: *${pendingTools}*\n👥 Total Users: *${totalUsers.toLocaleString()}*\n⭐ Pro Subscribers: *${proUsers}*\n🆕 New Today: *${newUsersToday}*\n━━━━━━━━━━━━━━━━━━━━━`
            await ctx.replyWithMarkdown(msg)
        } catch (err) {
            ctx.reply(`❌ Dashboard error: ${err.message}`)
        }
    })

    // ── /revenue ──────────────────────────────────────────────────────────────
    instance.command('revenue', async (ctx) => {
        try {
            const { User: U } = await getModels()
            const today = new Date(); today.setHours(0,0,0,0)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            const [todayPro, weekPro, totalPro] = await Promise.all([
                U.countDocuments({ 'subscription.status': 'active', updatedAt: { $gte: today } }),
                U.countDocuments({ 'subscription.status': 'active', updatedAt: { $gte: weekAgo } }),
                U.countDocuments({ 'subscription.status': 'active', 'subscription.plan': { $in: ['pro', 'pro_yearly'] } }),
            ])
            const msg = `💰 *Revenue Overview*\n━━━━━━━━━━━━━━━\n⭐ Total Active Pro: *${totalPro}*\n📅 New Pro Today: *${todayPro}*\n📆 New Pro This Week: *${weekPro}*\n━━━━━━━━━━━━━━━`
            await ctx.replyWithMarkdown(msg)
        } catch (err) {
            ctx.reply(`❌ Revenue error: ${err.message}`)
        }
    })

    // ── /reviewbatch ──────────────────────────────────────────────────────────
    // Shows the first auto_approved tool with inline Accept/Reject buttons.
    // Owner taps through them one at a time. Each decision is immediate.
    instance.command('reviewbatch', async (ctx) => {
        try {
            const { Tool: T } = await getModels()
            const staged = await T.countDocuments({ status: 'auto_approved' })
            if (staged === 0) {
                return ctx.reply('ℹ️ No tools are staged for review.\nRun /approvebatch if you want to bulk-publish pending enriched tools.')
            }

            // Get the oldest staged tool for review
            const tool = await T.findOne({ status: 'auto_approved' })
                .sort({ stagedAt: 1 })
                .populate('category', 'name')
                .lean()

            if (!tool) return ctx.reply('❌ No staged tools found.')

            const remaining = staged
            const msg =
                `🔍 *Review Tool ${remaining} Remaining*\n` +
                `━━━━━━━━━━━━━━━━━\n` +
                `🔥 *${tool.name}*\n` +
                `🏷 Category: ${tool.category?.name || 'Unknown'}\n` +
                `💰 Pricing: ${tool.pricing}\n` +
                `📊 Score: ${tool.enrichmentScore || 'N/A'}\n\n` +
                `📝 ${tool.shortDescription}\n\n` +
                `🔗 [Visit Tool](${tool.officialUrl})`

            await ctx.replyWithMarkdown(msg, {
                disable_web_page_preview: true,
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback(`✅ Accept — Go Live`, `ratool_accept_${tool._id}`),
                        Markup.button.callback(`❌ Reject — Back to Pending`, `ratool_reject_${tool._id}`),
                    ],
                    [
                        Markup.button.callback(`⏭ Skip (keep staged)`, `ratool_skip_${tool._id}`),
                    ]
                ])
            })
        } catch (err) {
            ctx.reply(`❌ Review error: ${err.message}`)
        }
    })

    // ── Callback: inline button handler for /reviewbatch ────────────────────────
    instance.action(/^ratool_(accept|reject|skip)_(.+)$/, async (ctx) => {
        try {
            const action = ctx.match[1]  // accept | reject | skip
            const toolId = ctx.match[2]

            const { Tool: T } = await getModels()
            const tool = await T.findById(toolId)

            if (!tool) {
                await ctx.answerCbQuery('❌ Tool not found — may have already been processed.')
                return ctx.editMessageText('❌ Tool not found. It may have already been reviewed.')
            }

            if (action === 'accept') {
                await T.updateOne({ _id: toolId }, {
                    $set: { status: 'active', isActive: true, approvedAt: new Date(), approvedBy: 'owner-telegram' }
                })
                await ctx.answerCbQuery('✅ Accepted — Tool is now LIVE!')
                await ctx.editMessageText(`✅ *${tool.name}* is now LIVE on IntelliGrid!`, { parse_mode: 'Markdown' })
            } else if (action === 'reject') {
                await T.updateOne({ _id: toolId }, {
                    $set: { status: 'pending', isActive: false, rejectedAt: new Date(), dataQualityFlags: ['owner_rejected'] }
                })
                await ctx.answerCbQuery('❌ Rejected — Moved back to pending.')
                await ctx.editMessageText(`❌ *${tool.name}* moved back to pending.`, { parse_mode: 'Markdown' })
            } else {
                await ctx.answerCbQuery('⏭ Skipped.')
                await ctx.editMessageText(`⏭ *${tool.name}* skipped (still staged).`, { parse_mode: 'Markdown' })
            }

            // Auto-show next staged tool
            const remaining = await T.countDocuments({ status: 'auto_approved' })
            if (remaining > 0 && action !== 'skip') {
                await ctx.reply(`📥 ${remaining} tool(s) still awaiting review. Type /reviewbatch to continue.`)
            } else if (remaining === 0) {
                await ctx.reply('🎉 All staged tools have been reviewed! DB is clean.')
            }
        } catch (err) {
            await ctx.answerCbQuery('❌ Error: ' + err.message.slice(0, 50))
        }
    })

    // ── /approvebatch (updated: operates on auto_approved tools) ──────────────
    instance.command('approvebatch', async (ctx) => {
        try {
            const { Tool: T } = await getModels()
            // Target auto_approved tools (staged by autoApprove.js) — not raw pending
            const staged = await T.countDocuments({ status: 'auto_approved' })
            if (staged === 0) {
                return ctx.reply('ℹ️ No auto_approved tools to publish.\nRun autoApprove.js first, or use /reviewbatch for one-by-one.')
            }
            const result = await T.updateMany(
                { status: 'auto_approved' },
                { $set: { status: 'active', isActive: true, approvedAt: new Date(), approvedBy: 'owner-approvebatch', dataQualityFlags: [] } }
            )
            await ctx.reply(`✅ Bulk published ${result.modifiedCount} tools!\n💡 Run /sync_algolia to push to Algolia search.`)
        } catch (err) {
            ctx.reply(`❌ Batch approve error: ${err.message}`)
        }
    })

    // ── /approve_<submissionId> ───────────────────────────────────────────────
    // One-tap submission approval from the Telegram new-submission alert.
    // The submission._id is embedded in the alert as `/approve_<id>`.
    // Tapping it converts the Submission into a live Tool and sets status active.
    instance.hears(/^\/approve_([a-f0-9]{24})$/, async (ctx) => {
        try {
            // Lazy-import Submission model (not always loaded at boot)
            const { default: Submission } = await import('../models/Submission.js')
            const { Tool: T, Category: Cat } = await getModels()

            const submissionId = ctx.match[1]
            const sub = await Submission.findById(submissionId)

            if (!sub) {
                return ctx.reply(`❌ Submission \`${submissionId}\` not found. It may have already been approved or deleted.`, { parse_mode: 'Markdown' })
            }

            if (sub.status === 'approved') {
                return ctx.reply(`ℹ️ *${sub.toolName}* was already approved.`, { parse_mode: 'Markdown' })
            }

            // Resolve category ObjectId if a category slug was provided
            let categoryId = null
            if (sub.category) {
                const cat = await Cat.findOne({
                    $or: [{ slug: sub.category }, { name: new RegExp(`^${sub.category}$`, 'i') }]
                }).select('_id').lean()
                categoryId = cat?._id || null
            }

            // Create Tool from submission data
            const slug = sub.toolName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')

            const tool = await T.create({
                name: sub.toolName,
                slug: `${slug}-${Date.now().toString(36)}`,  // ensure uniqueness
                officialUrl: sub.officialUrl,
                shortDescription: sub.shortDescription,
                fullDescription: sub.fullDescription || sub.shortDescription,
                category: categoryId,
                pricing: sub.pricing || 'Free',
                features: sub.features || [],
                status: 'active',
                isActive: true,
                submittedBy: sub.submittedBy?.user || null,
                approvedBy: `owner-telegram-${ctx.from.id}`,
                approvedAt: new Date(),
                dataSource: 'user_submission',
            })

            // Mark submission as approved
            await Submission.findByIdAndUpdate(submissionId, {
                status: 'approved',
                reviewedAt: new Date(),
                toolRef: tool._id,
            })

            await ctx.reply(
                `✅ *${sub.toolName}* is now LIVE on IntelliGrid!\n\n` +
                `🔗 intelligrid.online/tool/${tool.slug}`,
                { parse_mode: 'Markdown' }
            )

            console.log(`[TelegramBot] Submission ${submissionId} approved by owner → tool ${tool._id}`)
        } catch (err) {
            console.error('[TelegramBot] /approve_ error:', err.message)
            ctx.reply(`❌ Approval failed: ${err.message.slice(0, 200)}`)
        }
    })

    // ── /cache, /logs, /restart ───────────────────────────────────────────────
    instance.command('cache', async (ctx) => {
        try {
            const redisModule = await import('../config/redis.js')
            const redisClient = redisModule.default || redisModule.redisClient
            if (!redisClient || !redisClient.isOpen) return ctx.reply('🔴 Redis disconnected or omitted')
            const memory = await redisClient.info('memory')
            const dbsize = await redisClient.dbSize()
            const usedMemoryMatch = memory.match(/used_memory_human:(.*)/)
            const usedMemory = usedMemoryMatch ? usedMemoryMatch[1].trim() : 'Unknown'
            await ctx.replyWithMarkdown(`🗄 *Redis Cache Status*\n\nStatus: 🟢 Connected\nKeys: *${dbsize}*\nMemory: *${usedMemory}*`)
        } catch (err) {
            ctx.reply(`❌ Cache error: ${err.message}`)
        }
    })
    
    instance.command('logs', async (ctx) => {
        await ctx.reply('ℹ️ System running on Render. Check live logs at: https://dashboard.render.com → intelligrid-backend → Logs')
    })
    
    instance.command('restart', async (ctx) => {
        await ctx.reply('⚠️ To restart: Render Dashboard → intelligrid-backend → Manual Deploy → Deploy latest commit.')
    })

    // ── /users ────────────────────────────────────────────────────────────────
    instance.command('users', async (ctx) => {
        try {
            const { User: U } = await getModels()
            const today = new Date(); today.setHours(0, 0, 0, 0)
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

            const [total, newToday, newWeek, pro, free] = await Promise.all([
                U.countDocuments(),
                U.countDocuments({ createdAt: { $gte: today } }),
                U.countDocuments({ createdAt: { $gte: weekAgo } }),
                U.countDocuments({ 'subscription.plan': { $in: ['pro', 'pro_yearly'] } }),
                U.countDocuments({ $or: [{ 'subscription.plan': 'free' }, { 'subscription.plan': { $exists: false } }] }),
            ])

            await ctx.replyWithMarkdown(
                `👥 *User Analytics*\n\n` +
                `Total: *${total.toLocaleString()}*\n` +
                `⭐ Pro: *${pro}*\n` +
                `🆓 Free: *${free}*\n\n` +
                `📈 New today: *${newToday}*\n` +
                `📈 New this week: *${newWeek}*\n`
            )
        } catch (err) {
            ctx.reply(`❌ Error: ${err.message}`)
        }
    })

    // ── /trending ─────────────────────────────────────────────────────────────
    instance.command('trending', async (ctx) => {
        try {
            const { Tool: T } = await getModels()
            const top = await T.find({ status: 'active' })
                .sort({ views: -1 })
                .limit(10)
                .select('name views weeklyViews isTrending')
                .lean()

            const lines = top.map((t, i) =>
                `${i + 1}. *${t.name}* — ${(t.views || 0).toLocaleString()} views${t.isTrending ? ' 🔥' : ''}`
            ).join('\n')

            await ctx.replyWithMarkdown(`🔥 *Top 10 Trending Tools*\n\n${lines}`)
        } catch (err) {
            ctx.reply(`❌ Error: ${err.message}`)
        }
    })

    // ── /db_stats ─────────────────────────────────────────────────────────────
    instance.command('db_stats', async (ctx) => {
        try {
            const { Tool: T } = await getModels()

            const [total, active, dead, enriched, unenriched, featured] = await Promise.all([
                T.countDocuments(),
                T.countDocuments({ status: 'active', isActive: { $ne: false } }),
                T.countDocuments({ linkStatus: 'dead' }),
                T.countDocuments({ isEnriched: true }),
                T.countDocuments({ $or: [{ isEnriched: false }, { isEnriched: { $exists: false } }] }),
                T.countDocuments({ isFeatured: true }),
            ])

            const enrichPct = total > 0 ? Math.round((enriched / total) * 100) : 0

            await ctx.replyWithMarkdown(
                `🗄 *Database Status*\n\n` +
                `📦 Total tools: *${total.toLocaleString()}*\n` +
                `✅ Active: *${active.toLocaleString()}*\n` +
                `💀 Dead URLs: *${dead}*\n` +
                `⭐ Featured: *${featured}*\n\n` +
                `🤖 Enriched: *${enriched}* (${enrichPct}%)\n` +
                `📋 Unenriched: *${unenriched}* remaining`
            )
        } catch (err) {
            ctx.reply(`❌ Error: ${err.message}`)
        }
    })

    // ── /enrichment_status ────────────────────────────────────────────────────
    instance.command('enrichment_status', async (ctx) => {
        try {
            const { Tool: T } = await getModels()

            const [total, enriched] = await Promise.all([
                T.countDocuments({ status: 'active' }),
                T.countDocuments({ status: 'active', isEnriched: true }),
            ])
            const remaining = total - enriched
            const pct = total > 0 ? Math.round((enriched / total) * 100) : 0
            const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10))

            await ctx.replyWithMarkdown(
                `🤖 *Enrichment Progress*\n\n` +
                `[${bar}] ${pct}%\n\n` +
                `✅ Enriched: *${enriched.toLocaleString()}*\n` +
                `📋 Remaining: *${remaining.toLocaleString()}*\n` +
                `📦 Total active: *${total.toLocaleString()}*\n\n` +
                `Use /start\\_enrichment to trigger next batch`
            )
        } catch (err) {
            ctx.reply(`❌ Error: ${err.message}`)
        }
    })

    // ── /start_enrichment (Deprecated) ────────────────────────────────────────
    instance.command('start_enrichment', async (ctx) => {
        await ctx.reply('⚠️ This command is deprecated. Please use /enrich to run enrichment through the JobManager.')
    })

    // ── /sync_algolia ─────────────────────────────────────────────────────────
    instance.command('sync_algolia', async (ctx) => {
        try {
            await ctx.reply('⏳ Starting Algolia re-index... This may take 1–2 minutes.')
            const { execSync } = await import('child_process')
            // Run the existing reindex script in background
            execSync('node src/scripts/reindexAlgolia.js', {
                cwd: process.cwd(),
                timeout: 180000,
                stdio: 'pipe',
            })
            await ctx.reply('✅ Algolia re-index complete. All active tools are now searchable.')
        } catch (err) {
            ctx.reply(`❌ Algolia sync error: ${err.message?.substring(0, 200)}`)
        }
    })

    // ── /user <email> ─────────────────────────────────────────────────────────
    instance.command('user', async (ctx) => {
        const parts = ctx.message.text.split(' ')
        const email = parts[1]?.toLowerCase()
        if (!email) return ctx.reply('Usage: /user <email>')

        try {
            const { User: U } = await getModels()
            const user = await U.findOne({ email }).lean()
            if (!user) return ctx.reply(`❌ No user found with email: ${email}`)

            const plan = user.subscription?.plan || 'free'
            const status = user.subscription?.status || 'none'
            const joined = user.createdAt ? new Date(user.createdAt).toDateString() : 'Unknown'

            await ctx.replyWithMarkdown(
                `👤 *User: ${user.email}*\n\n` +
                `Plan: *${plan}*\n` +
                `Sub status: ${status}\n` +
                `Role: ${user.role || 'user'}\n` +
                `Joined: ${joined}\n` +
                `Clerk ID: \`${user.clerkId || 'N/A'}\``
            )
        } catch (err) {
            ctx.reply(`❌ Error: ${err.message}`)
        }
    })

    // ── /grant_pro <email> ────────────────────────────────────────────────────
    instance.command('grant_pro', async (ctx) => {
        const parts = ctx.message.text.split(' ')
        const email = parts[1]?.toLowerCase()
        if (!email) return ctx.reply('Usage: /grant_pro <email>')

        try {
            const { User: U } = await getModels()
            const user = await U.findOne({ email })
            if (!user) return ctx.reply(`❌ No user found: ${email}`)

            user.subscription = {
                ...user.subscription,
                plan: 'pro',
                status: 'active',
                startDate: new Date(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                grantedBy: 'telegram_owner',
            }
            user.role = 'pro'
            await user.save()

            await ctx.replyWithMarkdown(`✅ *Pro granted* to ${email}\nPlan: pro | Expires: 1 year from today`)
        } catch (err) {
            ctx.reply(`❌ Error granting Pro: ${err.message}`)
        }
    })

    // ── /revoke_pro <email> ───────────────────────────────────────────────────
    instance.command('revoke_pro', async (ctx) => {
        const parts = ctx.message.text.split(' ')
        const email = parts[1]?.toLowerCase()
        if (!email) return ctx.reply('Usage: /revoke_pro <email>')

        try {
            const { User: U } = await getModels()
            const result = await U.updateOne(
                { email },
                { $set: { role: 'user', 'subscription.plan': 'free', 'subscription.status': 'cancelled' } }
            )
            if (result.matchedCount === 0) return ctx.reply(`❌ No user found: ${email}`)
            await ctx.reply(`✅ Pro revoked from ${email}. User is now on free plan.`)
        } catch (err) {
            ctx.reply(`❌ Error revoking Pro: ${err.message}`)
        }
    })

    // ── /submissions ──────────────────────────────────────────────────────────
    instance.command('submissions', async (ctx) => {
        try {
            const { Submission: S } = await getModels()
            if (!S) return ctx.reply('ℹ️ Submission model not available. Check Backend/src/models/Submission.js')

            const pending = await S.find({ status: 'pending' })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean()

            if (pending.length === 0) return ctx.reply('✅ No pending submissions.')

            for (const sub of pending) {
                await ctx.replyWithMarkdown(
                    `📥 *Tool Submission*\n\n` +
                    `🛠 Name: *${sub.name || 'Unknown'}*\n` +
                    `🔗 URL: ${sub.officialUrl || sub.url || 'N/A'}\n` +
                    `📧 By: ${sub.submittedBy || 'anonymous'}\n` +
                    `📅 ${sub.createdAt ? new Date(sub.createdAt).toDateString() : ''}`,
                    Markup.inlineKeyboard([
                        Markup.button.callback('✅ Approve', `approve_${sub._id}`),
                        Markup.button.callback('❌ Reject', `reject_${sub._id}`),
                    ])
                )
            }
        } catch (err) {
            ctx.reply(`❌ Error: ${err.message}`)
        }
    })

    // ── Inline button: Approve submission ─────────────────────────────────────
    instance.action(/^approve_(.+)$/, async (ctx) => {
        const id = ctx.match[1]
        try {
            const { Submission: S } = await getModels()
            await S?.findByIdAndUpdate(id, { status: 'approved', reviewedAt: new Date() })
            await ctx.answerCbQuery('✅ Approved!')
            await ctx.editMessageText(`✅ Submission *${id}* approved.`, { parse_mode: 'Markdown' })
        } catch (err) {
            await ctx.answerCbQuery(`❌ Error: ${err.message}`)
        }
    })

    // ── Inline button: Reject submission ──────────────────────────────────────
    instance.action(/^reject_(.+)$/, async (ctx) => {
        const id = ctx.match[1]
        try {
            const { Submission: S } = await getModels()
            await S?.findByIdAndUpdate(id, { status: 'rejected', reviewedAt: new Date() })
            await ctx.answerCbQuery('❌ Rejected.')
            await ctx.editMessageText(`❌ Submission *${id}* rejected.`, { parse_mode: 'Markdown' })
        } catch (err) {
            await ctx.answerCbQuery(`❌ Error: ${err.message}`)
        }
    })

    // ── /start_crawler (Deprecated) ───────────────────────────────────────────
    instance.command('start_crawler', async (ctx) => {
        await ctx.reply('⚠️ This command is deprecated. Please use `/crawl <source>` (e.g. `/crawl futurepedia`) to run via the persistent JobManager.', { parse_mode: 'Markdown' })
    })

    // ── /crawler_status ───────────────────────────────────────────────────────
    instance.command('crawler_status', async (ctx) => {
        try {
            const { Tool: T } = await getModels()
            const crawlerEnabled = process.env.CRAWLER_ENABLED === 'true'

            const [total, scraped, enriched] = await Promise.all([
                T.countDocuments({ status: 'active' }),
                T.countDocuments({ sourceFoundBy: 'scraper' }),
                T.countDocuments({ isEnriched: true, status: 'active' }),
            ])

            await ctx.replyWithMarkdown(
                `🕷 *Crawler Status*\n\n` +
                `Schedule: ${crawlerEnabled ? '🟢 Nightly 2AM IST' : '🔴 Disabled'}\n\n` +
                `📦 Total active: *${total.toLocaleString()}*\n` +
                `🤖 From scraper: *${scraped.toLocaleString()}*\n` +
                `✅ Enriched: *${enriched.toLocaleString()}*\n` +
                `📋 Unenriched: *${(total - enriched).toLocaleString()}*\n\n` +
                `Use /start\\_crawler all to trigger now`
            )
        } catch (err) {
            ctx.reply(`❌ Error: ${err.message}`)
        }
    })

    // ── V2 Job Management Commands ────────────────────────────────────────────
    instance.command('crawl', async (ctx) => {
        const parts = ctx.message.text.split(' ')
        const source = parts[1]?.toLowerCase()
        const validSources = ['futurepedia', 'taaft', 'aixploria', 'futuretools']

        if (!validSources.includes(source)) {
            return ctx.reply(`Usage: /crawl <source>\nValid: ${validSources.join(', ')}`)
        }

        try {
            const { startJob } = await import('./JobManager.js')
            await startJob(`crawler_${source}`)
            await ctx.reply(`🟢 Started crawler_${source}. Check /jobstatus for progress.`)
        } catch (err) {
            ctx.reply(`❌ Could not start crawler: ${err.message}`)
        }
    })

    instance.command('enrich', async (ctx) => {
        try {
            const { startJob } = await import('./JobManager.js')
            await startJob('enrichment')
            await ctx.reply(`🟢 Started bulk enrichment job. Check /jobstatus for progress.`)
        } catch (err) {
            ctx.reply(`❌ Could not start enrichment: ${err.message}`)
        }
    })

    instance.command('stopjob', async (ctx) => {
        const parts = ctx.message.text.split(' ')
        const jobId = parts[1]
        if (!jobId) return ctx.reply('Usage: /stopjob <jobId>')

        try {
            const { stopJob } = await import('./JobManager.js')
            await stopJob(jobId)
            await ctx.reply(`⏳ Sent SIGTERM to ${jobId}. Should stop shortly.`)
        } catch (err) {
            ctx.reply(`❌ Stop failed: ${err.message}`)
        }
    })

    instance.command('jobstatus', async (ctx) => {
        try {
            const { getAllJobStatuses } = await import('./JobManager.js')
            const jobs = await getAllJobStatuses()
            if (!jobs || jobs.length === 0) return ctx.reply('ℹ️ No jobs found in history.')

            let msg = `⚙️ *Background Jobs*\n\n`
            for (const j of jobs) {
                const icon = j.isRunning ? '🟢' : (j.status === 'failed' ? '🔴' : (j.status === 'completed' ? '✅' : '⚪'))
                msg += `${icon} *${j.jobId}*\n`
                msg += `   Status: ${j.status}\n`
                if (j.totalTools > 0) msg += `   Progress: ${j.toolsProcessed}/${j.totalTools}\n`
                else msg += `   Processed: ${j.toolsProcessed || 0}\n`
                msg += `\n`
            }
            await ctx.replyWithMarkdown(msg)
        } catch (err) {
            ctx.reply(`❌ Error fetching job status: ${err.message}`)
        }
    })

    // ── Unknown command fallback ───────────────────────────────────────────────
    instance.on('text', (ctx) => {
        ctx.reply('❓ Unknown command. Type /start to see all commands.')
    })


    return instance
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns the singleton bot instance.
 * Safe to call multiple times.
 */
export function getBot() {
    if (!bot) bot = createBot()
    return bot
}

/**
 * Send a push alert to the owner's Telegram chat.
 * Call this from payment webhooks, error handlers, etc.
 *
 * @param {string} message - Markdown-formatted message
 */
export async function sendOwnerAlert(message) {
    if (!OWNER_ID || !BOT_TOKEN) return
    try {
        const b = getBot()
        if (!b) return
        await b.telegram.sendMessage(OWNER_ID, message, { parse_mode: 'Markdown' })
    } catch (err) {
        // Never let Telegram errors crash the main app
        console.error('[TelegramBot] Alert send failed:', err.message)
    }
}

/**
 * Initialise the bot webhook on the given Express app.
 * Call once during app startup (in app.js).
 */
export function initialiseTelegramBot() {
    if (botInitialised) return
    botInitialised = true

    if (!BOT_TOKEN || !OWNER_ID) {
        console.warn('⚠️  [TelegramBot] Not started — TELEGRAM_BOT_TOKEN or OWNER_TELEGRAM_ID missing')
        return
    }

    bot = createBot()
    console.log('✅ [TelegramBot] Owner control panel bot ready')
}

export default { getBot, sendOwnerAlert, initialiseTelegramBot }
