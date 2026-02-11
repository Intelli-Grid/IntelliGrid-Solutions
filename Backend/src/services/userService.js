import User from '../models/User.js'
import Favorite from '../models/Favorite.js'
import Review from '../models/Review.js'
import Order from '../models/Order.js'
import ApiError from '../utils/ApiError.js'
import { nanoid } from 'nanoid'

import emailService from './emailService.js'

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
                referralCode: nanoid(10),
            })

            // Send welcome email (async, don't block response) - only for new users
            emailService.sendWelcomeEmail(user).catch((error) =>
                console.error('Failed to send welcome email:', error)
            )
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
        const user = await User.findById(userId).select('-__v')

        if (!user) {
            throw ApiError.notFound('User not found')
        }

        return user
    }

    /**
     * Update user profile
     */
    async updateUserProfile(userId, updates) {
        const allowedUpdates = ['firstName', 'lastName', 'username', 'profile']
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
     * Remove favorite
     */
    async removeFavorite(userId, favoriteId) {
        const favorite = await Favorite.findOneAndDelete({
            _id: favoriteId,
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
     * Delete user
     */
    async deleteUser(userId) {
        const user = await User.findByIdAndDelete(userId)

        if (!user) {
            throw ApiError.notFound('User not found')
        }

        // Clean up user data
        await Promise.all([
            Favorite.deleteMany({ user: userId }),
            Review.deleteMany({ user: userId }),
        ])

        return user
    }
}

export default new UserService()
