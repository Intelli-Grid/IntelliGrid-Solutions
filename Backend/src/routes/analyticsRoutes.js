import express from 'express'
import analyticsService from '../services/analyticsService.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = express.Router()

// Track event (requires authentication)
router.post(
    '/track',
    requireAuth,
    asyncHandler(async (req, res) => {
        await analyticsService.trackEvent({
            ...req.body,
            user: req.user._id,
        })

        res.status(200).json(
            new ApiResponse(200, null, 'Event tracked successfully')
        )
    })
)

// Get dashboard analytics (admin only)
router.get(
    '/dashboard',
    requireAuth,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const { startDate, endDate } = req.query

        const analytics = await analyticsService.getDashboardAnalytics({
            startDate,
            endDate,
        })

        res.status(200).json(
            new ApiResponse(200, analytics, 'Analytics retrieved successfully')
        )
    })
)

export default router
