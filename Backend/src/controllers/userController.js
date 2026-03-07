import userService from '../services/userService.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'

/**
 * User Controller - Handle user-related requests
 */
class UserController {
    /**
     * Get user profile
     * GET /api/v1/user/profile
     */
    getProfile = asyncHandler(async (req, res) => {
        const user = await userService.getUserProfile(req.user._id)

        res.status(200).json(
            new ApiResponse(200, user, 'Profile retrieved successfully')
        )
    })

    /**
     * Update user profile
     * PUT /api/v1/user/profile
     */
    updateProfile = asyncHandler(async (req, res) => {
        const user = await userService.updateUserProfile(req.user._id, req.body)

        res.status(200).json(
            new ApiResponse(200, user, 'Profile updated successfully')
        )
    })

    /**
     * Get user stats
     * GET /api/v1/user/stats
     */
    getUserStats = asyncHandler(async (req, res) => {
        const stats = await userService.getUserStats(req.user._id)

        res.status(200).json(
            new ApiResponse(200, stats, 'Stats retrieved successfully')
        )
    })

    /**
     * Get user favorites
     * GET /api/v1/user/favorites
     */
    getFavorites = asyncHandler(async (req, res) => {
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
        }

        const result = await userService.getUserFavorites(req.user._id, options)

        res.status(200).json(
            new ApiResponse(200, result, 'Favorites retrieved successfully')
        )
    })

    /**
     * Add favorite
     * POST /api/v1/user/favorites
     */
    addFavorite = asyncHandler(async (req, res) => {
        const { toolId } = req.body

        const favorite = await userService.addFavorite(req.user._id, toolId)

        res.status(201).json(
            new ApiResponse(201, favorite, 'Tool added to favorites')
        )
    })

    /**
     * Remove favorite
     * DELETE /api/v1/user/favorites/:id
     */
    removeFavorite = asyncHandler(async (req, res) => {
        await userService.removeFavorite(req.user._id, req.params.id)

        res.status(200).json(
            new ApiResponse(200, null, 'Tool removed from favorites')
        )
    })

    /**
     * Record a tool view in the user's history (fire-and-forget safe)
     * POST /api/v1/user/history/:toolId
     *
     * - Removes any existing entry for this tool (dedup)
     * - Prepends new entry with current timestamp
     * - Slices to 50 most recent entries using $slice
     */
    addToHistory = asyncHandler(async (req, res) => {
        const { toolId } = req.params
        const userId = req.user._id

        await userService.addToHistory(userId, toolId)

        res.status(200).json(
            new ApiResponse(200, null, 'History updated')
        )
    })

    /**
     * Get user's view history (populated tool objects, newest first)
     * GET /api/v1/user/history
     */
    getHistory = asyncHandler(async (req, res) => {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50)
        const history = await userService.getHistory(req.user._id, limit)

        res.status(200).json(
            new ApiResponse(200, { history }, 'History retrieved successfully')
        )
    })

    /**
     * Get user's referral stats
     * GET /api/v1/user/referral-stats
     * Returns referralCode, totalReferred, converted (paid subscribers)
     */
    getReferralStats = asyncHandler(async (req, res) => {
        const User = (await import('../models/User.js')).default

        const user = await User.findById(req.user._id)
            .select('referralCode stats.referrals')
            .lean()

        const [totalReferred, converted] = await Promise.all([
            User.countDocuments({ referredBy: req.user._id }),
            User.countDocuments({
                referredBy: req.user._id,
                'subscription.tier': { $ne: 'Free' },
            }),
        ])

        res.status(200).json(
            new ApiResponse(200, {
                referralCode:   user?.referralCode || null,
                totalReferred,
                converted,
                referralLink:   user?.referralCode
                    ? `https://www.intelligrid.online/?ref=${user.referralCode}`
                    : null,
            }, 'Referral stats retrieved')
        )
    })
}

export default new UserController()
