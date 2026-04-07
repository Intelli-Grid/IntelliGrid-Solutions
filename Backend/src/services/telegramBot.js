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
            `*Analytics*\n` +
            `/stats — Live platform stats\n` +
            `/users — User breakdown\n` +
            `/trending — Top trending tools today\n` +
            `/health — System health check\n\n` +
            `*Database*\n` +
            `/db\\_stats — DB overview\n` +
            `/sync\\_algolia — Force Algolia re-index\n` +
            `/enrichment\\_status — Enrichment progress\n` +
            `/start\\_enrichment — Trigger next 500 enrichments\n\n` +
            `*Users*\n` +
            `/user <email> — Look up a user\n` +
            `/grant\\_pro <email> — Assign Pro role\n` +
            `/revoke\\_pro <email> — Remove Pro role\n\n` +
            `*Content*\n` +
            `/submissions — Last 10 pending submissions\n`
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

    // ── /start_enrichment ─────────────────────────────────────────────────────
    instance.command('start_enrichment', async (ctx) => {
        try {
            await ctx.reply('⏳ Triggering enrichment job for next 500 tools...')
            // Dynamically import the enrichment service to avoid circular deps
            const enrichMod = await import('./enrichmentService.js')
            const result = await enrichMod.runEnrichmentBatch({ limit: 500 })
            await ctx.replyWithMarkdown(
                `✅ *Enrichment batch complete*\n\n` +
                `Processed: *${result?.processed || 'N/A'}*\n` +
                `Enriched: *${result?.enriched || 'N/A'}*\n` +
                `Errors: *${result?.errors || 0}*`
            )
        } catch (err) {
            ctx.reply(`❌ Enrichment error: ${err.message}`)
        }
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
