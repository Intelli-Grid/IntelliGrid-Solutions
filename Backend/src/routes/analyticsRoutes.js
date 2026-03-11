import express from 'express'
import analyticsService from '../services/analyticsService.js'
import { getRevenueAnalytics, getUserGrowthAnalytics, getToolAnalytics } from '../controllers/analyticsController.js'
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'
import ClickEvent from '../models/ClickEvent.js'
import Tool from '../models/Tool.js'

const router = express.Router()

// Track event (optional authentication)
router.post(
    '/track',
    optionalAuth,
    asyncHandler(async (req, res) => {
        const metadata = {
            ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            ...req.body.metadata,
        }

        await analyticsService.trackEvent({
            ...req.body,
            user: req.user?._id,
            metadata,
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

// Get revenue analytics (admin only)
router.get('/revenue', requireAuth, requireAdmin, getRevenueAnalytics)

// Get user growth analytics (admin only)
router.get('/user-growth', requireAuth, requireAdmin, getUserGrowthAnalytics)

// Get tool analytics (admin only)
router.get('/tools', requireAuth, requireAdmin, getToolAnalytics)

// ── Affiliate Click Analytics ─────────────────────────────────────────────────
/**
 * @route   GET /api/v1/analytics/affiliate-clicks
 * @desc    Aggregate affiliate click data by network, top tools, and daily timeline
 * @query   startDate, endDate, network
 * @access  Admin only
 */
router.get(
    '/affiliate-clicks',
    requireAuth,
    requireAdmin,
    asyncHandler(async (req, res) => {
        const { startDate, endDate, network } = req.query

        // Build date range match — only look at affiliate clicks
        const match = { wasAffiliate: true }
        if (startDate || endDate) {
            match.createdAt = {}
            if (startDate) match.createdAt.$gte = new Date(startDate)
            if (endDate) match.createdAt.$lte = new Date(endDate)
        }
        if (network) match.affiliateNetwork = network

        const [byNetwork, byTool, timeline, totals] = await Promise.all([
            // Clicks grouped by affiliate network
            ClickEvent.aggregate([
                { $match: match },
                { $group: { _id: '$affiliateNetwork', clicks: { $sum: 1 } } },
                { $sort: { clicks: -1 } },
            ]),
            // Top 20 tools by affiliate clicks
            ClickEvent.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: '$toolId',
                        clicks: { $sum: 1 },
                        network: { $first: '$affiliateNetwork' },
                        commissionType: { $first: '$commissionType' },
                    },
                },
                { $sort: { clicks: -1 } },
                { $limit: 20 },
                {
                    $lookup: {
                        from: 'tools',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'tool',
                    },
                },
                { $unwind: { path: '$tool', preserveNullAndEmpty: true } },
                {
                    $project: {
                        clicks: 1,
                        network: 1,
                        commissionType: 1,
                        toolSlug: '$tool.slug',
                        toolName: '$tool.name',
                        commissionRate: '$tool.commissionRate',
                    },
                },
            ]),
            // Daily timeline (last 30 days if no date range specified)
            ClickEvent.aggregate([
                {
                    $match: startDate || endDate ? match : {
                        ...match,
                        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                    },
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        clicks: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            // Summary totals
            Promise.all([
                ClickEvent.countDocuments(match),
                Tool.countDocuments({ affiliateStatus: 'approved' }),
            ]),
        ])

        const [totalClicks, approvedLinksCount] = totals
        const topNetwork = byNetwork[0]?._id || 'none'

        res.status(200).json(
            new ApiResponse(200, {
                totalClicks,
                approvedLinksCount,
                topNetwork,
                byNetwork,
                byTool,
                timeline,
            }, 'Affiliate click analytics retrieved successfully')
        )
    })
)

export default router

