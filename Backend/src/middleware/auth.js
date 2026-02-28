import { verifyToken } from '@clerk/express'
import clerkClient from '../config/clerk.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import User from '../models/User.js'

/**
 * Verify Clerk JWT and authenticate user
 *
 * BUG-10 fix: Removed clerkClient.users.getUser() from the hot path.
 * Clerk JWTs already contain `sub` (clerkId) — we use it directly for a DB lookup.
 * The Clerk API call is only made when we need to CREATE a new user record,
 * which is a one-time occurrence per user, not on every request.
 */
export const requireAuth = asyncHandler(async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError.unauthorized('No token provided')
        }

        const token = authHeader.split(' ')[1]

        // Verify token with Clerk (local JWKS verification — no network call)
        const authorizedParties = [
            'https://www.intelligrid.online',
            'https://intelligrid.online',
            'https://admin.intelligrid.online',
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:5174',
        ]
        const session = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY, authorizedParties })

        if (!session) {
            throw ApiError.unauthorized('Invalid token')
        }

        // Try to find user in our DB by clerkId (JWT sub claim)
        let user = await User.findOne({ clerkId: session.sub })

        if (!user) {
            // First time this Clerk user hits our API — fetch their profile once
            // to populate firstName, lastName, email, avatar in the DB.
            const clerkUser = await clerkClient.users.getUser(session.sub)
            if (!clerkUser) {
                throw ApiError.unauthorized('User not found in Clerk')
            }
            user = await User.create({
                clerkId: clerkUser.id,
                email: clerkUser.emailAddresses[0]?.emailAddress,
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
                avatar: clerkUser.imageUrl,
            })
        }

        // Attach MongoDB user to request — avoid attaching clerkUser to not leak data
        req.user = user

        next()
    } catch (error) {
        if (error instanceof ApiError) {
            throw error
        }
        throw ApiError.unauthorized('Authentication failed')
    }
})

/**
 * Require premium subscription — updated to include new tiers
 */
export const requirePremium = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw ApiError.unauthorized('Authentication required')
    }

    const premiumTiers = ['Basic', 'Pro', 'Premium', 'Business', 'Enterprise']

    if (!premiumTiers.includes(req.user.subscription?.tier)) {
        throw ApiError.forbidden('Premium subscription required')
    }

    next()
})

/**
 * Require Pro-level access (paid or active trial)
 * Used for gating features like AI Stack Advisor.
 * Returns machine-readable code so the frontend nudge can fire.
 */
export const requireProOrTrial = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw ApiError.unauthorized('Authentication required')
    }

    const PRO_TIERS = ['Basic', 'Pro', 'Premium', 'Business', 'Enterprise']
    const tier = req.user.subscription?.tier
    const status = req.user.subscription?.status

    if (!PRO_TIERS.includes(tier) || status !== 'active') {
        throw ApiError.forbidden('PRO_FEATURE_REQUIRED')
    }

    next()
})

/**
 * Require admin role (supports both legacy 'admin' and new RBAC roles)
 */
export const requireAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw ApiError.unauthorized('Authentication required')
    }

    const role = req.user.role
    // Accept legacy 'admin' AND Clerk-dashboard-set 'ADMIN' AND new RBAC roles
    const adminRoles = ['admin', 'ADMIN', 'MODERATOR', 'TRUSTED_OPERATOR', 'SUPERADMIN']

    if (!adminRoles.includes(role)) {
        throw ApiError.forbidden('Admin access required')
    }

    next()
})

/**
 * Optional authentication (doesn't throw error if no token)
 * BUG-10 fix: Same as requireAuth — removed Clerk API call from the hot path.
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1]
            const authorizedParties = [
                'https://www.intelligrid.online',
                'https://intelligrid.online',
                'https://admin.intelligrid.online',
                'http://localhost:5173',
                'http://localhost:3000',
                'http://localhost:5174',
            ]
            const session = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY, authorizedParties })

            if (session) {
                // DB-only lookup — no Clerk API call on the hot path
                const user = await User.findOne({ clerkId: session.sub })
                if (user) {
                    req.user = user
                }
            }
        }
    } catch (error) {
        // Silently fail for optional auth
        console.log('Optional auth failed:', error.message || error)
    }

    next()
})
