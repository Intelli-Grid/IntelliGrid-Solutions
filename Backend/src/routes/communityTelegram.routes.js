/**
 * communityTelegram.routes.js
 * Webhook endpoint for the IntelliGrid Public Community Bot.
 *
 * Telegram sends a POST to this route for every message sent to the community bot.
 * We immediately return 200 OK to Telegram, then process the update asynchronously
 * to prevent Telegram from retrying the request.
 *
 * Route: POST /api/v1/telegram/community-webhook
 *
 * IMPORTANT: This route must NOT be protected by Clerk auth middleware —
 * Telegram sends unauthenticated requests.
 */

import express from 'express'
import { getCommunityBot } from '../services/communityBot.js'

const router = express.Router()

router.post('/community-webhook', (req, res) => {
    // Always acknowledge immediately — Telegram will retry on 4xx/5xx
    res.sendStatus(200)

    // Process asynchronously — never let processing delay the 200 response
    Promise.resolve().then(async () => {
        try {
            const bot = getCommunityBot()
            if (!bot) return
            await bot.handleUpdate(req.body)
        } catch (err) {
            // Never crash the server on Telegram processing errors
            console.error('[CommunityBot] Webhook processing error:', err.message)
        }
    })
})

export default router
