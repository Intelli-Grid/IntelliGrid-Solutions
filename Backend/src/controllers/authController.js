import userService from '../services/userService.js'
import { verifyWebhookSignature } from '../config/clerk.js'
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

/**
 * Auth Controller - Handle authentication requests
 */
class AuthController {
    /**
     * Get current user
     * GET /api/v1/auth/me
     */
    getCurrentUser = asyncHandler(async (req, res) => {
        const user = await userService.getUserProfile(req.user._id)

        res.status(200).json(
            new ApiResponse(200, user, 'User retrieved successfully')
        )
    })

    /**
     * Sync user with database
     * POST /api/v1/auth/sync
     */
    syncUser = asyncHandler(async (req, res) => {
        // User is already attached to req by auth middleware
        // Update last login
        await userService.updateLastLogin(req.user._id)

        res.status(200).json(
            new ApiResponse(200, req.user, 'User synced successfully')
        )
    })

    /**
     * Clerk webhook handler
     * POST /api/v1/auth/webhooks/clerk
     */
    clerkWebhook = asyncHandler(async (req, res) => {
        // Verify webhook signature
        const isValid = verifyWebhookSignature(
            JSON.stringify(req.body),
            req.headers
        )

        if (!isValid) {
            throw ApiError.unauthorized('Invalid webhook signature')
        }

        const { type, data } = req.body

        try {
            switch (type) {
                case 'user.created':
                    await userService.createUser(data)
                    console.log('✅ User created from Clerk webhook:', data.id)
                    break

                case 'user.updated':
                    const user = await userService.getUserByClerkId(data.id)
                    await userService.updateUserProfile(user._id, {
                        firstName: data.first_name,
                        lastName: data.last_name,
                        avatar: data.image_url,
                    })
                    console.log('✅ User updated from Clerk webhook:', data.id)
                    break

                case 'user.deleted':
                    const deletedUser = await userService.getUserByClerkId(data.id)
                    await userService.deleteUser(deletedUser._id)
                    console.log('✅ User deleted from Clerk webhook:', data.id)
                    break

                default:
                    console.log('⚠️  Unhandled Clerk webhook type:', type)
            }

            res.status(200).json({ received: true })
        } catch (error) {
            console.error('Clerk webhook error:', error)
            res.status(500).json({ error: 'Webhook processing failed' })
        }
    })
}

export default new AuthController()
