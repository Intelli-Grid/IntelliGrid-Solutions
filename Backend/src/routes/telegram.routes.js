/**
 * telegram.routes.js
 * IntelliGrid — Telegram Webhook Route
 *
 * Telegram sends every message/callback_query to this endpoint via HTTPS POST.
 * The route is intentionally NOT behind any auth middleware — Telegram doesn't
 * send auth headers. Security is enforced inside the bot via OWNER_TELEGRAM_ID
 * check in telegramBot.js.
 *
 * Mount in app.js:
 *   app.use('/api/v1/telegram', telegramRoutes)
 *
 * Register the webhook once on Telegram's servers (replace <BOT_TOKEN>):
 *   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
 *     -H "Content-Type: application/json" \
 *     -d '{"url":"https://backend.intelligrid.online/api/v1/telegram/webhook"}'
 */

import express from 'express'
import { getBot } from '../services/telegramBot.js'

const router = express.Router()

/**
 * POST /api/v1/telegram/webhook
 * Receives Telegram update objects and forwards them to the bot handler.
 * Always responds 200 immediately — Telegram re-sends if it gets anything else.
 */
router.post('/webhook', express.json(), (req, res) => {
    const secret = req.headers['x-telegram-bot-api-secret-token']
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
        console.warn(`[TelegramBot] Unauthorized webhook attempt: invalid secret token`)
        return res.status(403).json({ error: 'Forbidden' })
    }

    // Always acknowledge immediately so Telegram doesn't retry
    res.sendStatus(200)

    const b = getBot()
    if (!b) return // Bot disabled (missing env vars) — silently ignore

    try {
        b.handleUpdate(req.body)
    } catch (err) {
        console.error('[TelegramBot] handleUpdate error:', err.message)
    }
})

/**
 * GET /api/v1/telegram/status
 * Quick health check for the Telegram integration.
 * Returns whether the bot token and owner ID are configured.
 * Admin-use only — no sensitive data exposed.
 */
router.get('/status', (req, res) => {
    const hasToken = !!process.env.TELEGRAM_BOT_TOKEN
    const hasOwner = !!process.env.OWNER_TELEGRAM_ID
    res.json({
        status: hasToken && hasOwner ? 'active' : 'disabled',
        token_configured: hasToken,
        owner_configured: hasOwner,
        webhook_url: `https://backend.intelligrid.online/api/v1/telegram/webhook`,
    })
})

export default router
