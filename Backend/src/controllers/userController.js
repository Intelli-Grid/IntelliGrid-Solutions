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
}

export default new UserController()
