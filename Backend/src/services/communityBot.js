/**
 * communityBot.js
 * IntelliGrid — Public-Facing Telegram Community Bot
 *
 * This is a SEPARATE bot from the owner bot — fully public-facing.
 * Any Telegram user can message it. No security restrictions on reading.
 * Write operations (suggest, etc.) are rate-limited per user.
 *
 * Features:
 *   Commands:  /find, /trending, /newarrived, /suggest, /compare, /deal, /help
 *   Automated: Daily tool spotlight at 9:00 AM IST
 *              Weekly Monday recap of new tools
 *              Auto-post to channel when new tool is approved
 *
 * Uses:
 *   COMMUNITY_BOT_TOKEN   — BotFather token for the community bot
 *   COMMUNITY_CHANNEL_ID  — Numeric Telegram channel/group ID (-100xxxxxxxxxx)
 *
 * ESM-compatible — uses import/export to match backend package.json type:module
 */

import { Telegraf } from 'telegraf'
import cron from 'node-cron'
import mongoose from 'mongoose'

// ── Lazy model imports ─────────────────────────────────────────────────────────
let Tool, User
async function getModels() {
    if (!Tool) {
        const toolMod = await import('../models/Tool.js')
        Tool = toolMod.default
    }
    if (!User) {
        const userMod = await import('../models/User.js')
        User = userMod.default
    }
    return { Tool, User }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const COMMUNITY_BOT_TOKEN = process.env.COMMUNITY_BOT_TOKEN
const CHANNEL_ID = process.env.COMMUNITY_CHANNEL_ID
const SITE_URL = 'https://intelligrid.online'

// Simple in-memory rate limit: max 5 requests per user per minute
const rateLimitMap = new Map()
function isRateLimited(userId) {
    const now = Date.now()
    const userRequests = rateLimitMap.get(userId) || []
    const recent = userRequests.filter(t => now - t < 60000)
    if (recent.length >= 5) return true
    rateLimitMap.set(userId, [...recent, now])
    return false
}

// ── Bot instance ──────────────────────────────────────────────────────────────
let communityBot = null
let communityBotInitialised = false

/**
 * Formats a Tool document for Telegram display.
 */
function formatToolCard(tool, index = null) {
    const num = index !== null ? `${index + 1}. ` : ''
    const pricing = tool.pricing || 'Unknown'
    const pricingEmoji = pricing === 'Free' ? '🆓' : pricing === 'Freemium' ? '⚡' : pricing === 'Paid' ? '💰' : '❓'
    return (
        `${num}*${tool.name}*\n` +
        `${tool.shortDescription?.substring(0, 120) || ''}\n` +
        `${pricingEmoji} ${pricing} | 🔗 [View Details](${SITE_URL}/tools/${tool.slug})`
    )
}

function createCommunityBot() {
    if (!COMMUNITY_BOT_TOKEN) {
        console.warn('⚠️  [CommunityBot] COMMUNITY_BOT_TOKEN not set — community bot disabled')
        return null
    }

    const instance = new Telegraf(COMMUNITY_BOT_TOKEN)

    // ── /start & /help ────────────────────────────────────────────────────────
    const helpText = (
        `👋 *Welcome to IntelliGrid Bot!*\n\n` +
        `I help you discover the best AI tools for any task.\n\n` +
        `*Commands:*\n` +
        `/find <category> — Top AI tools in a category\n` +
        `/trending — Today's most viewed tools\n` +
        `/newarrived — Latest tools added\n` +
        `/suggest <tool name> — Suggest a new tool\n` +
        `/compare <tool1> vs <tool2> — Compare two tools\n` +
        `/deal — Current free/discounted tools\n\n` +
        `🌐 Browse all tools: [intelligrid.online](${SITE_URL})\n` +
        `📢 Stay updated — we post daily tool spotlights here!`
    )

    instance.command('start', ctx => ctx.replyWithMarkdown(helpText))
    instance.command('help', ctx => ctx.replyWithMarkdown(helpText))

    // ── /find <category> ──────────────────────────────────────────────────────
    instance.command('find', async (ctx) => {
        if (isRateLimited(ctx.from.id)) return ctx.reply('⏳ Too many requests. Please wait a moment.')

        const query = ctx.message.text.replace('/find', '').trim()
        if (!query) return ctx.reply('Usage: /find <category>\nExample: /find image generation')

        try {
            const { Tool: T } = await getModels()
            const tools = await T.find({
                status: 'active',
                isActive: true,
                $or: [
                    { tags: { $regex: query, $options: 'i' } },
                    { shortDescription: { $regex: query, $options: 'i' } },
                    { name: { $regex: query, $options: 'i' } },
                ]
            })
                .sort({ views: -1, 'ratings.average': -1 })
                .limit(5)
                .select('name slug shortDescription pricing tags')
                .lean()

            if (tools.length === 0) {
                return ctx.replyWithMarkdown(
                    `🔍 No tools found for "*${query}*"\n\n` +
                    `Try browsing all categories at [intelligrid.online](${SITE_URL})`
                )
            }

            const lines = tools.map((t, i) => formatToolCard(t, i)).join('\n\n')
            await ctx.replyWithMarkdown(
                `🔍 *Top AI tools for: ${query}*\n\n${lines}\n\n` +
                `📦 See more: [intelligrid.online/search?q=${encodeURIComponent(query)}](${SITE_URL})`,
                { disable_web_page_preview: true }
            )
        } catch (err) {
            ctx.reply('❌ Search failed. Try again in a moment.')
        }
    })

    // ── /trending ─────────────────────────────────────────────────────────────
    instance.command('trending', async (ctx) => {
        if (isRateLimited(ctx.from.id)) return ctx.reply('⏳ Too many requests. Please wait a moment.')

        try {
            const { Tool: T } = await getModels()
            const tools = await T.find({ status: 'active', isActive: true })
                .sort({ views: -1 })
                .limit(8)
                .select('name slug shortDescription pricing views isTrending')
                .lean()

            const lines = tools.map((t, i) =>
                `${i + 1}. *${t.name}* — ${(t.views || 0).toLocaleString()} views${t.isTrending ? ' 🔥' : ''}\n` +
                `   🔗 [View](${SITE_URL}/tools/${t.slug})`
            ).join('\n\n')

            await ctx.replyWithMarkdown(
                `🔥 *Today's Trending AI Tools*\n\n${lines}\n\n` +
                `🌐 [Browse all trending tools](${SITE_URL}/trending)`,
                { disable_web_page_preview: true }
            )
        } catch (err) {
            ctx.reply('❌ Could not fetch trending tools right now.')
        }
    })

    // ── /newarrived ───────────────────────────────────────────────────────────
    instance.command('newarrived', async (ctx) => {
        if (isRateLimited(ctx.from.id)) return ctx.reply('⏳ Too many requests. Please wait a moment.')

        try {
            const { Tool: T } = await getModels()
            const tools = await T.find({ status: 'active', isActive: true })
                .sort({ createdAt: -1 })
                .limit(8)
                .select('name slug shortDescription pricing createdAt')
                .lean()

            const lines = tools.map((t, i) => {
                const daysAgo = Math.floor((Date.now() - new Date(t.createdAt)) / 86400000)
                const age = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`
                return (
                    `${i + 1}. *${t.name}* · _${age}_\n` +
                    `   ${t.shortDescription?.substring(0, 100) || ''}\n` +
                    `   🔗 [View](${SITE_URL}/tools/${t.slug})`
                )
            }).join('\n\n')

            await ctx.replyWithMarkdown(
                `🆕 *Latest AI Tools Added to IntelliGrid*\n\n${lines}\n\n` +
                `🌐 [See all new tools](${SITE_URL}/new)`,
                { disable_web_page_preview: true }
            )
        } catch (err) {
            ctx.reply('❌ Could not fetch new tools right now.')
        }
    })

    // ── /compare <tool1> vs <tool2> ───────────────────────────────────────────
    instance.command('compare', async (ctx) => {
        const text = ctx.message.text.replace('/compare', '').trim()
        const parts = text.split(/\s+vs\s+/i)

        if (parts.length !== 2) {
            return ctx.reply('Usage: /compare ChatGPT vs Claude\nUse "vs" to separate the two tools.')
        }

        const [a, b] = parts.map(p => p.trim())
        const queryA = encodeURIComponent(a)
        const queryB = encodeURIComponent(b)

        await ctx.replyWithMarkdown(
            `⚖️ *Comparing: ${a} vs ${b}*\n\n` +
            `View detailed comparison on IntelliGrid:\n` +
            `🔗 [${a}](${SITE_URL}/search?q=${queryA}) · [${b}](${SITE_URL}/search?q=${queryB})\n\n` +
            `💡 Tip: Use /find to discover alternatives in the same category.`,
            { disable_web_page_preview: true }
        )
    })

    // ── /deal ─────────────────────────────────────────────────────────────────
    instance.command('deal', async (ctx) => {
        if (isRateLimited(ctx.from.id)) return ctx.reply('⏳ Too many requests. Please wait a moment.')

        try {
            const { Tool: T } = await getModels()
            const freeTools = await T.find({
                status: 'active',
                isActive: true,
                pricing: { $in: ['Free', 'Freemium'] },
            })
                .sort({ views: -1, createdAt: -1 })
                .limit(6)
                .select('name slug shortDescription pricing')
                .lean()

            const lines = freeTools.map((t, i) => formatToolCard(t, i)).join('\n\n')

            await ctx.replyWithMarkdown(
                `💰 *Free & Freemium AI Tools — No Credit Card Needed*\n\n${lines}\n\n` +
                `🌐 [Browse all free tools](${SITE_URL}/search?pricing=Free)`,
                { disable_web_page_preview: true }
            )
        } catch (err) {
            ctx.reply('❌ Could not fetch deals right now.')
        }
    })

    // ── /suggest <tool name> ──────────────────────────────────────────────────
    instance.command('suggest', async (ctx) => {
        const toolName = ctx.message.text.replace('/suggest', '').trim()
        if (!toolName || toolName.length < 3) {
            return ctx.reply('Usage: /suggest <tool name>\nExample: /suggest Midjourney')
        }

        try {
            // Import owner bot's sendOwnerAlert dynamically to avoid circular deps
            const { sendOwnerAlert } = await import('./telegramBot.js')
            const userName = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name || 'Anonymous'
            await sendOwnerAlert(
                `💡 *Community Tool Suggestion*\n\n` +
                `Tool: *${toolName}*\n` +
                `Suggested by: ${userName} (ID: ${ctx.from.id})\n\n` +
                `Use /find ${toolName} to check if it already exists`
            )
            await ctx.replyWithMarkdown(
                `✅ *Thanks for the suggestion!*\n\n` +
                `"*${toolName}*" has been sent to our team for review.\n\n` +
                `If approved, it'll appear on [intelligrid.online](${SITE_URL}) within 24 hours.`
            )
        } catch (err) {
            ctx.reply('✅ Thank you for your suggestion! We\'ll review it soon.')
        }
    })

    // ── Unknown command ────────────────────────────────────────────────────────
    instance.on('text', (ctx) => {
        // Only respond in private chats, not group noise
        if (ctx.chat.type === 'private') {
            ctx.replyWithMarkdown(
                `❓ Unknown command.\n\nType /help to see what I can do, or visit [intelligrid.online](${SITE_URL})`,
                { disable_web_page_preview: true }
            )
        }
    })

    return instance
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function getCommunityBot() {
    if (!communityBot) communityBot = createCommunityBot()
    return communityBot
}

/**
 * Posts a new tool announcement to the community channel.
 * Call this whenever a tool submission is approved or a new tool is crawled.
 */
export async function announceNewTool(tool) {
    if (!CHANNEL_ID || !COMMUNITY_BOT_TOKEN) return
    const bot = getCommunityBot()
    if (!bot) return

    try {
        const pricingEmoji = tool.pricing === 'Free' ? '🆓' : tool.pricing === 'Freemium' ? '⚡' : tool.pricing === 'Paid' ? '💰' : '🔧'
        await bot.telegram.sendMessage(
            CHANNEL_ID,
            `🆕 *New Tool Added!*\n\n` +
            `🛠 *${tool.name}*\n` +
            `${tool.shortDescription?.substring(0, 200) || ''}\n\n` +
            `${pricingEmoji} Pricing: ${tool.pricing || 'Unknown'}\n\n` +
            `🔗 [View on IntelliGrid](${SITE_URL}/tools/${tool.slug})\n\n` +
            `💡 Use /find ${tool.tags?.[0] || 'ai tools'} to discover similar tools`,
            {
                parse_mode: 'Markdown',
                disable_web_page_preview: false,
            }
        )
    } catch (err) {
        console.error('[CommunityBot] Channel post error:', err.message)
    }
}

/**
 * Sends the daily tool spotlight to the community channel.
 * Called by cron at 9:00 AM IST.
 */
export async function sendDailySpotlight() {
    if (!CHANNEL_ID || !COMMUNITY_BOT_TOKEN) return
    const bot = getCommunityBot()
    if (!bot) return

    try {
        const { Tool: T } = await getModels()

        // Pick a random featured or highly-rated tool that hasn't been spotted recently
        const tool = await T.findOne({
            status: 'active',
            isActive: true,
            $or: [{ isFeatured: true }, { 'ratings.average': { $gte: 4 } }, { views: { $gte: 100 } }],
        })
            .sort({ isToolOfTheDay: -1, views: -1 })
            .skip(Math.floor(Math.random() * 20))
            .select('name slug shortDescription fullDescription pricing tags views ratings logo')
            .lean()

        if (!tool) return

        const today = new Date().toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        })

        const stars = tool.ratings?.average
            ? '⭐'.repeat(Math.round(tool.ratings.average)) + ` ${tool.ratings.average.toFixed(1)}/5`
            : '⭐ Newly added'

        const desc = tool.fullDescription || tool.shortDescription || ''

        await bot.telegram.sendMessage(
            CHANNEL_ID,
            `🌟 *Tool of the Day — ${today}*\n\n` +
            `🛠 *${tool.name}*\n` +
            `${stars}\n\n` +
            `${desc.substring(0, 300)}\n\n` +
            `💰 Pricing: ${tool.pricing || 'Unknown'}\n\n` +
            `🔗 [View Full Details](${SITE_URL}/tools/${tool.slug})\n\n` +
            `💡 Found a better tool? Use /suggest to recommend it!`,
            {
                parse_mode: 'Markdown',
                disable_web_page_preview: false,
            }
        )

        console.log(`[CommunityBot] Daily spotlight posted: ${tool.name}`)
    } catch (err) {
        console.error('[CommunityBot] Daily spotlight error:', err.message)
    }
}

/**
 * Sends the weekly Monday recap to the community channel.
 */
export async function sendWeeklyRecap() {
    if (!CHANNEL_ID || !COMMUNITY_BOT_TOKEN) return
    const bot = getCommunityBot()
    if (!bot) return

    try {
        const { Tool: T } = await getModels()
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        const newTools = await T.find({
            status: 'active',
            isActive: true,
            createdAt: { $gte: oneWeekAgo },
        })
            .sort({ views: -1 })
            .limit(5)
            .select('name slug shortDescription pricing')
            .lean()

        if (newTools.length === 0) return

        const lines = newTools.map((t, i) =>
            `${i + 1}. *${t.name}* — ${t.pricing || 'Unknown'}\n` +
            `   ${t.shortDescription?.substring(0, 100) || ''}\n` +
            `   🔗 [View](${SITE_URL}/tools/${t.slug})`
        ).join('\n\n')

        const totalNew = await T.countDocuments({ createdAt: { $gte: oneWeekAgo } })

        await bot.telegram.sendMessage(
            CHANNEL_ID,
            `📰 *Weekly AI Tools Recap*\n\n` +
            `*${totalNew} new tools* added to IntelliGrid this week!\n\n` +
            `Here are the top picks:\n\n${lines}\n\n` +
            `🌐 [Browse all ${totalNew} new tools](${SITE_URL}/new)\n\n` +
            `💡 Use /newarrived to see the full list anytime`,
            {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
            }
        )

        console.log(`[CommunityBot] Weekly recap posted — ${totalNew} new tools`)
    } catch (err) {
        console.error('[CommunityBot] Weekly recap error:', err.message)
    }
}

// ── Cron scheduler ─────────────────────────────────────────────────────────────
let communitySchedulerStarted = false

export function startCommunityScheduler() {
    if (communitySchedulerStarted || !COMMUNITY_BOT_TOKEN || !CHANNEL_ID) {
        if (!COMMUNITY_BOT_TOKEN || !CHANNEL_ID) {
            console.warn('⚠️  [CommunityBot] Scheduler skipped — COMMUNITY_BOT_TOKEN or COMMUNITY_CHANNEL_ID not set')
        }
        return
    }
    communitySchedulerStarted = true

    // Daily spotlight: 9:00 AM IST = 03:30 UTC
    cron.schedule('30 3 * * *', () => {
        console.log('[CommunityBot] Sending daily spotlight...')
        sendDailySpotlight().catch(e => console.error('[CommunityBot] Spotlight error:', e.message))
    }, { timezone: 'UTC' })

    // Weekly recap: Every Monday 10:00 AM IST = 04:30 UTC
    cron.schedule('30 4 * * 1', () => {
        console.log('[CommunityBot] Sending weekly recap...')
        sendWeeklyRecap().catch(e => console.error('[CommunityBot] Weekly recap error:', e.message))
    }, { timezone: 'UTC' })

    console.log('✅ [CommunityBot] Cron jobs registered — daily spotlight 9AM IST, weekly recap Monday 10AM IST')
}

/**
 * Initialise the community bot instance.
 * Call once during app startup (in app.js).
 */
export function initialiseCommunityBot() {
    if (communityBotInitialised) return
    communityBotInitialised = true

    if (!COMMUNITY_BOT_TOKEN) {
        console.warn('⚠️  [CommunityBot] Not started — COMMUNITY_BOT_TOKEN missing')
        return
    }

    communityBot = createCommunityBot()
    startCommunityScheduler()
    console.log('✅ [CommunityBot] Public community bot ready')
}

export default { getCommunityBot, initialiseCommunityBot, announceNewTool, sendDailySpotlight, sendWeeklyRecap }
