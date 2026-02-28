import stackAdvisorService from '../services/stackAdvisorService.js'
import asyncHandler from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'

/**
 * POST /api/stack-advisor/recommend
 * Body: { role, useCases, existing, budget }
 * Auth: requireAuth + requireProOrTrial
 */
export const getRecommendations = asyncHandler(async (req, res) => {
    const { role, useCases = [], existing = [], budget = 'any' } = req.body
    const userId = req.user._id.toString()

    if (!role) {
        throw ApiError.badRequest('role is required')
    }

    const validRoles = [
        'developer', 'designer', 'marketer', 'writer', 'researcher',
        'sales', 'operations', 'educator', 'data_scientist', 'entrepreneur',
    ]
    if (!validRoles.includes(role)) {
        throw ApiError.badRequest(`Invalid role. Must be one of: ${validRoles.join(', ')}`)
    }

    if (!Array.isArray(useCases) || useCases.length > 5) {
        throw ApiError.badRequest('useCases must be an array with up to 5 items')
    }

    const validBudgets = ['free', 'paid', 'any']
    if (!validBudgets.includes(budget)) {
        throw ApiError.badRequest('budget must be free, paid, or any')
    }

    const result = await stackAdvisorService.getRecommendations(
        { role, useCases, existing, budget },
        userId
    )

    res.status(200).json({ success: true, data: result })
})

/**
 * GET /api/stack-advisor/history
 * Auth: requireAuth
 */
export const getStackHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id.toString()
    const history = await stackAdvisorService.getStackHistory(userId)
    res.status(200).json({ success: true, data: history })
})

/**
 * DELETE /api/stack-advisor/history/:stackId
 * Auth: requireAuth
 */
export const deleteStack = asyncHandler(async (req, res) => {
    const { stackId } = req.params
    const userId = req.user._id.toString()

    if (!stackId) {
        throw ApiError.badRequest('stackId is required')
    }

    await stackAdvisorService.deleteStack(userId, stackId)
    res.status(200).json({ success: true, message: 'Stack deleted' })
})
