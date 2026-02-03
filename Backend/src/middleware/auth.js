import clerkClient from '../config/clerk.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import User from '../models/User.js'

/**
 * Verify Clerk JWT and authenticate user
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError.unauthorized('No token provided')
        }

        const token = authHeader.split(' ')[1]

        // Verify token with Clerk
        const session = await clerkClient.verifyToken(token)

        if (!session) {
            throw ApiError.unauthorized('Invalid token')
        }

        // Get user from Clerk
        const clerkUser = await clerkClient.users.getUser(session.sub)

        if (!clerkUser) {
            throw ApiError.unauthorized('User not found')
        }

        // Find or create user in database
        let user = await User.findOne({ clerkId: clerkUser.id })

        if (!user) {
            // Create user if doesn't exist
            user = await User.create({
                clerkId: clerkUser.id,
                email: clerkUser.emailAddresses[0]?.emailAddress,
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
                avatar: clerkUser.imageUrl,
            })
        }

        // Attach user to request
        req.user = user
        req.clerkUser = clerkUser

        next()
    } catch (error) {
        if (error instanceof ApiError) {
            throw error
        }
        throw ApiError.unauthorized('Authentication failed')
    }
})

/**
 * Require premium subscription
 */
export const requirePremium = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw ApiError.unauthorized('Authentication required')
    }

    const premiumTiers = ['Premium', 'Enterprise']

    if (!premiumTiers.includes(req.user.subscription.tier)) {
        throw ApiError.forbidden('Premium subscription required')
    }

    next()
})

/**
 * Require admin role
 */
export const requireAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw ApiError.unauthorized('Authentication required')
    }

    if (req.user.role !== 'admin') {
        throw ApiError.forbidden('Admin access required')
    }

    next()
})

/**
 * Optional authentication (doesn't throw error if no token)
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1]
            const session = await clerkClient.verifyToken(token)

            if (session) {
                const clerkUser = await clerkClient.users.getUser(session.sub)
                const user = await User.findOne({ clerkId: clerkUser.id })

                if (user) {
                    req.user = user
                    req.clerkUser = clerkUser
                }
            }
        }
    } catch (error) {
        // Silently fail for optional auth
        console.log('Optional auth failed:', error.message)
    }

    next()
})
