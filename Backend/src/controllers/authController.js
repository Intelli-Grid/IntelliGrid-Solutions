import userService from '../services/userService.js'
import { verifyWebhookSignature } from '../config/clerk.js'
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

/**
 * Auth Controller — handles authentication and Clerk webhook events
 */
class AuthController {
    /**
     * Get current authenticated user
     * GET /api/v1/auth/me
     */
    getCurrentUser = asyncHandler(async (req, res) => {
        const user = await userService.getUserProfile(req.user._id)

        res.status(200).json(
            new ApiResponse(200, user, 'User retrieved successfully')
        )
    })

    /**
     * Sync user with database (called on login)
     * POST /api/v1/auth/sync
     */
    syncUser = asyncHandler(async (req, res) => {
        await userService.updateLastLogin(req.user._id)

        res.status(200).json(
            new ApiResponse(200, req.user, 'User synced successfully')
        )
    })

    /**
     * Clerk webhook handler
     * POST /api/v1/auth/webhooks/clerk
     *
     * ✅ Security fix: uses real Svix HMAC verification via verifyWebhookSignature().
     *    Requires raw body — the route uses express.raw() before this handler.
     *
     * Note: req.body here is a Buffer (from express.raw()), not a parsed object.
     */
    clerkWebhook = asyncHandler(async (req, res) => {
        // req.body is a raw Buffer from express.raw({ type: '*/*' })
        const rawBody = req.body

        // ── Verify Svix signature ─────────────────────────────────────────────
        const { valid, payload, error } = verifyWebhookSignature(rawBody, req.headers)

        if (!valid) {
            console.error('❌ Clerk webhook signature rejected:', error)
            // Return 200 to stop Clerk retrying for genuine auth failures;
            // return 400 for structural failures so Clerk knows something is wrong.
            return res.status(400).json({
                received: false,
                error: error || 'Invalid webhook signature',
            })
        }

        // payload is the verified, parsed Clerk event object
        const { type, data } = payload

        console.log(`📩 Clerk webhook received: ${type} | user: ${data?.id}`)

        try {
            switch (type) {
                case 'user.created': {
                    // Upsert: Clerk may retry, so handle duplicate gracefully
                    const existing = await userService.getUserByClerkId(data.id).catch(() => null)
                    if (!existing) {
                        await userService.createUser(data)
                        console.log('✅ User created from Clerk webhook:', data.id)
                    } else {
                        console.log('ℹ️  user.created received but user already exists:', data.id)
                    }
                    break
                }

                case 'user.updated': {
                    const user = await userService.getUserByClerkId(data.id).catch(() => null)
                    if (user) {
                        await userService.updateUserProfile(user._id, {
                            firstName: data.first_name || '',
                            lastName: data.last_name || '',
                            avatar: data.image_url || '',
                            // Sync primary email if changed
                            email: data.email_addresses?.find(e => e.id === data.primary_email_address_id)?.email_address,
                        })
                        console.log('✅ User updated from Clerk webhook:', data.id)
                    } else {
                        // User doesn't exist yet — create them (handles race conditions)
                        await userService.createUser(data)
                        console.log('✅ User auto-created on user.updated (race condition):', data.id)
                    }
                    break
                }

                case 'user.deleted': {
                    const userToDelete = await userService.getUserByClerkId(data.id).catch(() => null)
                    if (userToDelete) {
                        await userService.deleteUser(userToDelete._id)
                        console.log('✅ User deleted from Clerk webhook:', data.id)
                    } else {
                        console.log('ℹ️  user.deleted received but user not found (already deleted?):', data.id)
                    }
                    break
                }

                default:
                    console.log(`ℹ️  Unhandled Clerk webhook type: ${type}`)
            }

            res.status(200).json({ received: true })
        } catch (err) {
            console.error('❌ Clerk webhook processing error:', err)
            // Return 500 so Clerk retries the event
            res.status(500).json({ error: 'Webhook processing failed' })
        }
    })
}

export default new AuthController()
