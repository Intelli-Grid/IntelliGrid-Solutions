import User from '../models/User.js'
import Favorite from '../models/Favorite.js'
import Review from '../models/Review.js'
import Order from '../models/Order.js'
import Collection from '../models/Collection.js'
import Submission from '../models/Submission.js'
import ClaimRequest from '../models/ClaimRequest.js'
import ApiError from '../utils/ApiError.js'
import { nanoid } from 'nanoid'
import emailService from './emailService.js'
import { isFeatureEnabled } from './featureFlags.js'

/**
 * User Service - Business logic for users
 */
class UserService {
    /**
     * Create user from Clerk webhook
     */
    async createUser(clerkData) {
        const email = clerkData.email_addresses[0]?.email_address

        // Check if user exists by email
        let user = await User.findOne({ email })

        if (user) {
            // User exists, link new Clerk ID and update details
            user.clerkId = clerkData.id
            if (clerkData.first_name) user.firstName = clerkData.first_name
            if (clerkData.last_name) user.lastName = clerkData.last_name
            if (clerkData.image_url) user.avatar = clerkData.image_url
            await user.save()
            console.log(`Updated existing user ${email} with new Clerk ID`)
        } else {
            // Create new user
            user = await User.create({
                clerkId: clerkData.id,
                email,
                firstName: clerkData.first_name,
                lastName: clerkData.last_name,
                username: clerkData.username,
                avatar: clerkData.image_url,
                role: clerkData.public_metadata?.role || 'USER',
                referralCode: nanoid(10),
            })

            // ── REVERSE TRIAL (feature-flag gated) ──────────────────────────────────────
            // When REVERSE_TRIAL flag is ON: new users start on Pro for 14 days.
            // When OFF: new users start on Free tier (zero disruption).
            const reverseTrialEnabled = await isFeatureEnabled('REVERSE_TRIAL')

            if (reverseTrialEnabled) {
                const trialEndDate = new Date()
                trialEndDate.setDate(trialEndDate.getDate() + 14)

                await User.findByIdAndUpdate(user._id, {
                    'subscription.tier': 'Pro',
                    'subscription.status': 'active',
                    'subscription.startDate': new Date(),
                    'subscription.endDate': trialEndDate,
                    'subscription.reverseTrial.active': true,
                    'subscription.reverseTrial.startDate': new Date(),
                    'subscription.reverseTrial.endDate': trialEndDate,
                    'subscription.reverseTrial.converted': false,
                })

                // Send trial welcome email (async — don't block response)
                emailService.sendTrialWelcomeEmail(user, trialEndDate).catch((error) =>
                    console.error('Failed to send trial welcome email:', error)
                )

                console.log(`✅ Reverse trial activated for new user: ${email} (ends ${trialEndDate.toISOString()})`)
            } else {
                // No trial — send the standard welcome email (fire-and-forget)
                emailService.sendWelcomeEmail(user).catch((error) =>
                    console.error('Failed to send welcome email:', error)
                )
                console.log(`ℹ️  New user on Free tier — welcome email queued: ${email}`)
            }
        }

        return user
    }

    /**
     * Get user by Clerk ID
     */
    async getUserByClerkId(clerkId) {
        const user = await User.findOne({ clerkId })

        if (!user) {
            throw ApiError.notFound('User not found')
        }

        return user
    }

    /**
     * Get user profile
     */
    async getUserProfile(userId) {
        const user = await User.findById(userId).select('-__v -clerkId -subscription.paypalSubscriptionId')

        if (!user) {
            throw ApiError.notFound('User not found')
        }

        return user
    }

    /**
     * Update user profile
     */
    async updateUserProfile(userId, updates) {
        // avatar, email, and role are allowed when called from Clerk webhook (authController)
        const allowedUpdates = ['firstName', 'lastName', 'username', 'profile', 'avatar', 'email', 'role']
        const filteredUpdates = {}

        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key]
            }
        })

        const user = await User.findByIdAndUpdate(
            userId,
            filteredUpdates,
            { new: true, runValidators: true }
        )

        if (!user) {
            throw ApiError.notFound('User not found')
        }

        return user
    }

    /**
     * Get user stats
     */
    async getUserStats(userId) {
        const user = await User.findById(userId)

        if (!user) {
            throw ApiError.notFound('User not found')
        }

        const [favoritesCount, reviewsCount, ordersCount] = await Promise.all([
            Favorite.countDocuments({ user: userId }),
            Review.countDocuments({ user: userId }),
            Order.countDocuments({ user: userId, status: 'completed' }),
        ])

        return {
            subscription: user.subscription,
            stats: {
                ...user.stats,
                favoritesCount,
                reviewsCount,
                ordersCount,
            },
            joinedAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
        }
    }

    /**
     * Get user favorites
     */
    async getUserFavorites(userId, options = {}) {
        const { page = 1, limit = 20 } = options
        const skip = (page - 1) * limit

        const [favorites, total] = await Promise.all([
            Favorite.find({ user: userId })
                .populate({
                    path: 'tool',
                    select: 'name slug shortDescription officialUrl ratings views category',
                    populate: { path: 'category', select: 'name slug' },
                })
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .lean(),
            Favorite.countDocuments({ user: userId }),
        ])

        return {
            favorites,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        }
    }

    /**
     * Add favorite
     */
    async addFavorite(userId, toolId) {
        // Check user subscription and limits
        const user = await User.findById(userId)
        if (!user) {
            throw ApiError.notFound('User not found')
        }

        // Limit for free users: 10 favorites max
        // Includes 'Pro' (trial users) so they have unlimited access during trial
        const PAID_TIERS = ['Basic', 'Pro', 'Premium', 'Business', 'Enterprise']
        const isPaidSubscriber = PAID_TIERS.includes(user.subscription?.tier) && user.subscription?.status === 'active'

        if (!isPaidSubscriber) {
            const count = await Favorite.countDocuments({ user: userId })
            if (count >= 10) {
                // Machine-readable code — frontend uses this to trigger the upgrade nudge
                throw ApiError.forbidden('FAVORITES_LIMIT_REACHED')
            }
        }

        // Check if already favorited
        const existing = await Favorite.findOne({ user: userId, tool: toolId })

        if (existing) {
            throw ApiError.conflict('Tool already in favorites')
        }

        const favorite = await Favorite.create({ user: userId, tool: toolId })

        // Update user stats
        await User.findByIdAndUpdate(userId, {
            $inc: { 'stats.toolsFavorited': 1 },
        })

        return favorite
    }

    /**
     * Remove favorite — finds by userId + toolId (not favorite _id)
     */
    async removeFavorite(userId, toolId) {
        const favorite = await Favorite.findOneAndDelete({
            tool: toolId,
            user: userId,
        })

        if (!favorite) {
            throw ApiError.notFound('Favorite not found')
        }

        // Update user stats
        await User.findByIdAndUpdate(userId, {
            $inc: { 'stats.toolsFavorited': -1 },
        })

        return favorite
    }

    /**
     * Update last login
     */
    async updateLastLogin(userId) {
        await User.findByIdAndUpdate(userId, { lastLoginAt: new Date() })
    }

    /**
     * Add a tool to the user's view history.
     * Removes any duplicate entry for the tool first, then prepends the new
     * entry. The array is capped at 50 items via $slice so the document never
     * grows unbounded.
     */
    async addToHistory(userId, toolId) {
        // Step 1: remove any existing entry for this tool (dedup)
        await User.findByIdAndUpdate(userId, {
            $pull: { viewHistory: { tool: toolId } },
        })

        // Step 2: prepend new entry and cap at 50
        await User.findByIdAndUpdate(userId, {
            $push: {
                viewHistory: {
                    $each: [{ tool: toolId, viewedAt: new Date() }],
                    $position: 0,
                    $slice: 50,
                },
            },
        })
    }

    /**
     * Fetch the user's view history, populated with tool details.
     * Returns entries newest-first, limited to `limit` (max 50).
     */
    async getHistory(userId, limit = 20) {
        const user = await User.findById(userId)
            .select('viewHistory')
            .populate({
                path: 'viewHistory.tool',
                select: 'name slug shortDescription logo screenshotUrl pricing ratings category isTrending isNew trendingScore',
                populate: { path: 'category', select: 'name slug' },
            })
            .lean()

        if (!user) return []

        // Filter out any entries where the tool was deleted from DB
        const history = (user.viewHistory || [])
            .filter(entry => entry.tool != null)
            .slice(0, limit)

        return history
    }

    /**
     * Delete user — cascades all owned data (GDPR-compliant)
     */
    async deleteUser(userId) {
        const user = await User.findByIdAndDelete(userId)

        if (!user) {
            throw ApiError.notFound('User not found')
        }

        // Full cascade: auth data, social, purchases, content
        await Promise.all([
            Favorite.deleteMany({ user: userId }),
            Review.deleteMany({ user: userId }),
            Order.deleteMany({ user: userId }),
            Collection.deleteMany({ owner: userId }),
            Submission.deleteMany({ 'submittedBy.user': userId }),
            ClaimRequest.deleteMany({ user: userId }),
        ])

        return user
    }
}

export default new UserService()
