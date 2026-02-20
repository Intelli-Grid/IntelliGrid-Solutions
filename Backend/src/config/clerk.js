/**
 * clerk.js — Clerk authentication configuration
 *
 * Migrated from the EOL @clerk/clerk-sdk-node to @clerk/express
 * per Clerk's deprecation notice (January 10 2025).
 *
 * Docs: https://clerk.com/docs/references/express/overview
 */
import { createClerkClient } from '@clerk/express'
import { Webhook } from 'svix'
import dotenv from 'dotenv'

dotenv.config()

// ── Clerk client (used to look up users, verify tokens, etc.) ─────────────────
const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
})

// ── Webhook verification ──────────────────────────────────────────────────────

/**
 * Verify a Clerk webhook signature using Svix.
 * ✅ Security fix: replaced stub that always returned true.
 *
 * IMPORTANT: The route must use express.raw({ type: '*/* ' }) BEFORE this is
    * called so that req.body is a raw Buffer, not a parsed JSON object.
 * Re - serialising the body breaks the Svix HMAC check.
 *
 * @param { Buffer | string } rawBody - Raw request body
    * @param { object } headers - Full request headers
        * @returns { { valid: boolean, payload: object | null, error: string | null } }
 */
export const verifyWebhookSignature = (rawBody, headers) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET

    if (!secret) {
        console.error('❌ CLERK_WEBHOOK_SECRET is not set — webhook cannot be verified')
        return { valid: false, payload: null, error: 'CLERK_WEBHOOK_SECRET not configured' }
    }

    const svixId = headers['svix-id']
    const svixTimestamp = headers['svix-timestamp']
    const svixSignature = headers['svix-signature']

    if (!svixId || !svixTimestamp || !svixSignature) {
        console.warn('⚠️  Clerk webhook missing Svix headers — rejecting')
        return { valid: false, payload: null, error: 'Missing Svix headers' }
    }

    try {
        const wh = new Webhook(secret)
        const payload = wh.verify(
            typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8'),
            {
                'svix-id': svixId,
                'svix-timestamp': svixTimestamp,
                'svix-signature': svixSignature,
            }
        )
        return { valid: true, payload, error: null }
    } catch (err) {
        console.error('❌ Clerk webhook verification failed:', err.message)
        return { valid: false, payload: null, error: err.message }
    }
}

export default clerkClient
