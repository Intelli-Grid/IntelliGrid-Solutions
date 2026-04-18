import express from 'express'
import clerkClient from '../config/clerk.js'
import Tool from '../models/Tool.js'
import Review from '../models/Review.js'
import User from '../models/User.js'
import Order from '../models/Order.js'
import ClaimRequest from '../models/ClaimRequest.js'
import FeaturedListing from '../models/FeaturedListing.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import emailService from '../services/emailService.js'
import toolService from '../services/toolService.js'
import reviewService from '../services/reviewService.js'
import linkValidationService from '../services/linkValidationService.js'
import discoveryScheduler from '../services/discoveryScheduler.js'
import { enqueueTools } from '../services/discoveryQueue.js'
import { enrichTool, getEnrichmentBatch } from '../services/enrichmentService.js'
import { computeAndSaveTrendingScores } from '../jobs/enrichmentCron.js'

const router = express.Router()

// Protect all admin routes
router.use(requireAuth, requireAdmin)

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get admin dashboard statistics
 * @access  Admin only
 */
router.get('/stats', async (req, res) => {
    try {
        const [
            toolsCount,
            pendingToolsCount,
            usersCount,
            reviewsCount,
            flaggedReviewsCount,
            paymentsCount,
            failedPaymentsCount,
            totalActiveSubs
        ] = await Promise.all([
            Tool.countDocuments(),
            Tool.countDocuments({ status: 'pending' }),
            // Use local MongoDB count — faster, always consistent, no Clerk API rate limit risk
            User.countDocuments(),
            Review.countDocuments(),
            Review.countDocuments({ status: 'pending' }),
            Order.countDocuments(),
            Order.countDocuments({ status: 'failed' }),
            User.countDocuments({ 'subscription.status': 'active', 'subscription.tier': { $ne: 'Free' } })
        ])

        const totalRevenueResult = await Order.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$normalizedAmountUSD' } } }  // use normalised USD — avoids mixing USD + INR amounts
        ])

        res.json({
            success: true,
            stats: {
                totalTools: toolsCount,
                pendingTools: pendingToolsCount,
                totalUsers: usersCount,
                totalReviews: reviewsCount,
                pendingReviews: flaggedReviewsCount,
                totalPayments: paymentsCount,
                failedPayments: failedPaymentsCount,
                totalRevenue: totalRevenueResult[0]?.total || 0,
                activeProUsers: totalActiveSubs
            }
        })
    } catch (error) {
        console.error('Admin stats error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admin statistics'
        })
    }
})

/**
 * @route   GET /api/v1/admin/tools/pending
 * @desc    Get pending tools for approval
 * @access  Admin only
 */
router.get('/tools/pending', async (req, res) => {
    try {
        const pendingTools = await Tool.find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean()

        res.json({
            success: true,
            tools: pendingTools
        })
    } catch (error) {
        console.error('Pending tools error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending tools'
        })
    }
})

/**
 * @route   PATCH /api/v1/admin/tools/bulk-affiliate-status
 * @desc    Batch-update affiliate fields on multiple tools at once.
 *          Used by admin to work through 20-tool batches from the affiliate status filter.
 * @body    { toolIds: string[], affiliateStatus, affiliateNetwork?, commissionType?, commissionRate? }
 * @access  Admin only
 */
router.patch('/tools/bulk-affiliate-status', async (req, res) => {
    try {
        const { toolIds, affiliateStatus, affiliateNetwork, commissionType, commissionRate } = req.body

        if (!toolIds?.length) {
            return res.status(400).json({ success: false, message: 'toolIds array is required' })
        }

        const VALID_STATUSES = ['not_started', 'pending', 'approved', 'rejected', 'not_available']
        if (!VALID_STATUSES.includes(affiliateStatus)) {
            return res.status(400).json({
                success: false,
                message: `affiliateStatus must be one of: ${VALID_STATUSES.join(', ')}`
            })
        }

        const update = { affiliateStatus, affiliateLastVerified: new Date() }
        if (affiliateNetwork) update.affiliateNetwork = affiliateNetwork
        if (commissionType) update.commissionType = commissionType
        if (commissionRate) update.commissionRate = commissionRate

        const result = await Tool.updateMany(
            { _id: { $in: toolIds } },
            { $set: update }
        )

        console.log(`[Admin] Bulk affiliate status update: ${result.modifiedCount} tools set to "${affiliateStatus}" by ${req.user?.email}`)

        res.json({
            success: true,
            updated: result.modifiedCount,
            message: `Updated ${result.modifiedCount} tool(s) to affiliate status: ${affiliateStatus}`
        })
    } catch (error) {
        console.error('Bulk affiliate status error:', error)
        res.status(500).json({ success: false, message: 'Failed to update affiliate statuses' })
    }
})

/**
 * @route   GET /api/v1/admin/tools/enrichment-stats
 * @desc    Get enrichment score distribution + stale + needsEnrichment counts for the Enrichment tab
 * @access  Admin only
 */
router.get('/tools/enrichment-stats', async (req, res) => {
    try {
        const staleDate = new Date()
        staleDate.setDate(staleDate.getDate() - 90)

        const [fullyEnriched, partial, notEnriched, stale, needsEnrichmentCount, staleTools] = await Promise.all([
            Tool.countDocuments({ enrichmentScore: { $gte: 80 }, status: 'active' }),
            Tool.countDocuments({ enrichmentScore: { $gte: 30, $lt: 80 }, status: 'active' }),
            Tool.countDocuments({ enrichmentScore: { $lt: 30 }, status: 'active' }),
            Tool.countDocuments({
                $or: [
                    { lastEnrichedAt: { $lt: staleDate } },
                    { lastEnrichedAt: null },
                ],
                status: 'active',
            }),
            Tool.countDocuments({ needsEnrichment: true, status: 'active' }),
            // Top 20 stale tools sorted by views (most traffic = most urgent)
            Tool.find({ needsEnrichment: true, status: 'active' })
                .sort({ views: -1 })
                .limit(20)
                .select('name slug views enrichmentScore lastEnrichedAt')
                .lean(),
        ])

        res.json({
            success: true,
            stats: { fullyEnriched, partial, notEnriched, stale, needsEnrichmentCount },
            staleTools,
        })
    } catch (error) {
        console.error('Enrichment stats error:', error)
        res.status(500).json({ success: false, message: 'Failed to fetch enrichment stats' })
    }
})

/**
 * @route   PUT /api/v1/admin/tools/:id/approve
 * @desc    Approve a pending tool — syncs to Algolia via toolService
 * @access  Admin only
 */
router.put('/tools/:id/approve', async (req, res) => {
    try {
        const tool = await toolService.updateTool(req.params.id, {
            status: 'active',
            isActive: true,
            approvedAt: new Date(),
            approvedBy: req.user._id,
        })

        res.json({
            success: true,
            message: 'Tool approved successfully',
            tool: { _id: tool._id, name: tool.name, status: tool.status }
        })

        // Fire-and-forget tweet — runs AFTER response is sent
        import('../services/twitterService.js')
            .then(async ({ tweetNewTool }) => {
                const { default: ToolModel } = await import('../models/Tool.js')
                const populated = await ToolModel.findById(tool._id).populate('category', 'name').lean()
                if (populated) await tweetNewTool(populated)
            })
            .catch(err => console.error('[Approve] Tweet error (non-fatal):', err.message))

    } catch (error) {
        console.error('Tool approval error:', error)
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to approve tool'
        })
    }
})

/**
 * @route   DELETE /api/v1/admin/tools/:id
 * @desc    Delete a tool (Algolia + cache invalidation included)
 * @access  Admin only
 */
router.delete('/tools/:id', async (req, res) => {
    try {
        await toolService.deleteTool(req.params.id)
        res.json({
            success: true,
            message: 'Tool deleted successfully'
        })
    } catch (error) {
        console.error('Tool deletion error:', error)
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to delete tool'
        })
    }
})

/**
 * @route   POST /api/v1/admin/tools/:id/invite
 * @desc    Send claim invitation to tool owner
 * @access  Admin only
 */
router.post('/tools/:id/invite', async (req, res) => {
    try {
        const { contactEmail } = req.body
        const tool = await Tool.findById(req.params.id)

        if (!tool) {
            return res.status(404).json({ success: false, message: 'Tool not found' })
        }

        const emailToSend = contactEmail || tool.contactEmail
        if (!emailToSend) {
            return res.status(400).json({ success: false, message: 'Contact email is required' })
        }

        const sent = await emailService.sendClaimInvitation(tool, emailToSend)
        if (!sent) {
            throw new Error('Email sending failed')
        }

        res.json({
            success: true,
            message: `Invitation sent successfully to ${emailToSend}`
        })
    } catch (error) {
        console.error('Invitation error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to send invitation email'
        })
    }
})

/**
 * @route   GET /api/v1/admin/reviews/pending
 * @desc    Get pending reviews for moderation
 * @access  Admin only
 */
router.get('/reviews/pending', async (req, res) => {
    try {
        const pendingReviews = await Review.find({ status: 'pending' })
            .populate('user', 'firstName lastName email')
            .populate('tool', 'name')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean()

        res.json({
            success: true,
            reviews: pendingReviews
        })
    } catch (error) {
        console.error('Pending reviews error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending reviews'
        })
    }
})

/**
 * @route   PUT /api/v1/admin/reviews/:id/approve
 * @desc    Approve a pending review — recalculates Tool.ratings.average via reviewService
 * @access  Admin only
 */
router.put('/reviews/:id/approve', async (req, res) => {
    try {
        await reviewService.moderateReview(req.params.id, 'approved')
        res.json({ success: true, message: 'Review approved successfully' })
    } catch (error) {
        console.error('Review approval error:', error)
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to approve review'
        })
    }
})

/**
 * @route   PUT /api/v1/admin/reviews/:id/reject
 * @desc    Reject a pending review — updates status only (no rating recalc needed)
 * @access  Admin only
 */
router.put('/reviews/:id/reject', async (req, res) => {
    try {
        await reviewService.moderateReview(req.params.id, 'rejected')
        res.json({ success: true, message: 'Review rejected successfully' })
    } catch (error) {
        console.error('Review rejection error:', error)
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to reject review'
        })
    }
})

/**
 * @route   GET /api/v1/admin/payments
 * @desc    Get all payments with optional status filter, populated user info
 * @access  Admin only
 */
router.get('/payments', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query
        const query = status ? { status } : {}

        const payments = await Order.find(query)
            .populate('user', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .lean()

        const total = await Order.countDocuments(query)

        res.json({
            success: true,
            payments,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / parseInt(limit))
            }
        })
    } catch (error) {
        console.error('Payments fetch error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payments'
        })
    }
})

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with search and pagination
 * @access  Admin only
 */
router.get('/users', async (req, res) => {
    try {
        const { search, page = 1, limit = 20 } = req.query
        const query = {}

        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ]
        }

        const users = await User.find(query)
            .select('-clerkId -__v -subscription.paypalSubscriptionId')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean()

        const total = await User.countDocuments(query)

        res.json({
            success: true,
            users,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Users fetch error:', error)
        res.status(500).json({ success: false, message: 'Failed to fetch users' })
    }
})

/**
 * @route   POST /api/v1/admin/users/:id/subscription
 * @desc    Manually override a user's subscription (activate, downgrade, cancel).
 *          Used by support when a payment gateway is unavailable or for dispute resolutions.
 * @body    { action: 'activate'|'downgrade'|'cancel', tier?: string, duration?: 'monthly'|'yearly' }
 * @access  Admin only
 */
router.post('/users/:id/subscription', async (req, res) => {
    try {
        const { action, tier = 'Premium', duration = 'monthly' } = req.body

        if (!['activate', 'downgrade', 'cancel'].includes(action)) {
            return res.status(400).json({ success: false, message: "action must be 'activate', 'downgrade', or 'cancel'" })
        }

        const user = await User.findById(req.params.id)
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })

        // Map tier names to User model enum values (same logic as paymentService)
        const TIER_MAP = {
            pro: 'Pro', Pro: 'Pro', premium: 'Pro', Premium: 'Pro',   // aligned with paymentService.activateSubscription
            basic: 'Basic', Basic: 'Basic',
            enterprise: 'Enterprise', Enterprise: 'Enterprise',
            free: 'Free', Free: 'Free',
        }

        let update = {}

        if (action === 'activate') {
            const normalizedTier = TIER_MAP[tier] || 'Premium'
            const startDate = new Date()
            const endDate = new Date()
            if (duration === 'yearly') {
                endDate.setFullYear(endDate.getFullYear() + 1)
            } else {
                endDate.setMonth(endDate.getMonth() + 1)
            }
            update = {
                'subscription.tier': normalizedTier,
                'subscription.status': 'active',
                'subscription.startDate': startDate,
                'subscription.endDate': endDate,
                'subscription.autoRenew': false, // manual overrides don't auto-renew
            }
            // Sync tier to Clerk publicMetadata — non-fatal if Clerk is unavailable
            if (user.clerkId) {
                clerkClient.users.updateUser(user.clerkId, {
                    publicMetadata: {
                        subscriptionTier: normalizedTier,
                        subscriptionStatus: 'active',
                        subscriptionEndDate: endDate.toISOString(),
                    }
                }).catch(err => console.error(`[Admin Override] Clerk sync failed for ${user.clerkId}:`, err.message))
            }
        } else if (action === 'downgrade') {
            update = {
                'subscription.tier': 'Free',
                'subscription.status': 'active',
                'subscription.autoRenew': false,
            }
            if (user.clerkId) {
                clerkClient.users.updateUser(user.clerkId, {
                    publicMetadata: { subscriptionTier: 'Free', subscriptionStatus: 'active' }
                }).catch(err => console.error(`[Admin Override] Clerk sync failed for ${user.clerkId}:`, err.message))
            }
        } else if (action === 'cancel') {
            update = {
                'subscription.status': 'cancelled',
                'subscription.autoRenew': false,
            }
            if (user.clerkId) {
                clerkClient.users.updateUser(user.clerkId, {
                    publicMetadata: { subscriptionStatus: 'cancelled' }
                }).catch(err => console.error(`[Admin Override] Clerk sync failed for ${user.clerkId}:`, err.message))
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            update,
            { new: true, select: 'firstName lastName email subscription role' }
        )

        console.log(`[Admin Override] ${req.user.email} performed '${action}' on user ${user.email}`)

        res.json({
            success: true,
            message: `Subscription ${action}d successfully for ${updatedUser.email}`,
            subscription: updatedUser.subscription
        })
    } catch (error) {
        console.error('Subscription override error:', error)
        res.status(500).json({ success: false, message: 'Failed to override subscription' })
    }
})

// ─────────────────────────────────────────────────────────────────────────────
// System Health
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/admin/system
 * @desc    Get system health and performance metrics
 * @access  Admin only
 */
router.get('/system', async (req, res) => {
    try {
        const startTime = Date.now()

        // Database status
        const mongoose = (await import('mongoose')).default
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'

        // Memory usage
        const mem = process.memoryUsage()
        const memUsedMB = Math.round(mem.heapUsed / 1024 / 1024)
        const memTotalMB = Math.round(mem.heapTotal / 1024 / 1024)

        // Uptime
        const uptimeSeconds = Math.floor(process.uptime())
        const uptimeDays = Math.floor(uptimeSeconds / 86400)
        const uptimeHours = Math.floor((uptimeSeconds % 86400) / 3600)
        const uptimeMins = Math.floor((uptimeSeconds % 3600) / 60)

        // Quick DB ping for latency
        let dbLatencyMs = null
        try {
            const pingStart = Date.now()
            await mongoose.connection.db.admin().ping()
            dbLatencyMs = Date.now() - pingStart
        } catch (_) { /* ignore */ }

        // Counts for context
        const [toolCount, userCount, reviewCount] = await Promise.all([
            Tool.countDocuments(),
            User.countDocuments(),
            Review.countDocuments()
        ])

        res.json({
            success: true,
            system: {
                status: dbStatus === 'connected' ? 'operational' : 'degraded',
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version,
                uptime: { days: uptimeDays, hours: uptimeHours, minutes: uptimeMins, totalSeconds: uptimeSeconds },
                memory: { usedMB: memUsedMB, totalMB: memTotalMB, percentUsed: Math.round((memUsedMB / memTotalMB) * 100) },
                services: {
                    database: { status: dbStatus, latencyMs: dbLatencyMs },
                    api: { status: 'operational', latencyMs: Date.now() - startTime }
                },
                database: {
                    tools: toolCount,
                    users: userCount,
                    reviews: reviewCount
                }
            }
        })
    } catch (error) {
        console.error('System health error:', error)
        res.status(500).json({ success: false, message: 'Failed to fetch system health' })
    }
})

// ─────────────────────────────────────────────────────────────────────────────
// Discovery Queue Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/admin/discovery/pending
 * @desc    List auto-discovered tools awaiting admin approval
 * @access  Admin only
 */
router.get('/discovery/pending', async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query
        const skip = (parseInt(page) - 1) * parseInt(limit)

        const [tools, total] = await Promise.all([
            Tool.find({ status: 'pending', sourceFoundBy: { $in: ['scraper', 'producthunt', 'twitter', 'hacker-news'] } })
                .select('name slug officialUrl shortDescription logo pricing hasFreeTier sourceFoundBy sourceUrl createdAt category')
                .populate('category', 'name slug')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Tool.countDocuments({ status: 'pending', sourceFoundBy: { $in: ['scraper', 'producthunt', 'twitter', 'hacker-news'] } }),
        ])

        res.json({
            success: true,
            tools,
            pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
        })
    } catch (error) {
        console.error('Discovery pending error:', error)
        res.status(500).json({ success: false, message: 'Failed to fetch pending discovered tools' })
    }
})

/**
 * @route   POST /api/v1/admin/discovery/trigger
 * @desc    Manually trigger a discovery run from the admin panel
 * @access  Admin only
 */
router.post('/discovery/trigger', async (req, res) => {
    try {
        const { daysBack = 1 } = req.body

        // Run async — don't await so it doesn't timeout the HTTP request
        discoveryScheduler.runDiscovery(Math.min(parseInt(daysBack) || 1, 30))
            .catch(err => console.error('[Admin] Discovery trigger error:', err))

        res.json({
            success: true,
            message: `Discovery run started (last ${daysBack} day(s)). Check pending queue in 1–2 minutes.`,
        })
    } catch (error) {
        console.error('Discovery trigger error:', error)
        res.status(500).json({ success: false, message: 'Failed to trigger discovery run' })
    }
})

/**
 * @route   DELETE /api/v1/admin/discovery/discard/:id
 * @desc    Discard (hard-delete) a discovered tool that failed review
 * @access  Admin only
 */
router.delete('/discovery/discard/:id', async (req, res) => {
    try {
        const tool = await Tool.findOneAndDelete({
            _id: req.params.id,
            status: 'pending',  // Safety: only discard pending tools
        })
        if (!tool) return res.status(404).json({ success: false, message: 'Pending tool not found' })
        res.json({ success: true, message: `Discarded "${tool.name}"` })
    } catch (error) {
        console.error('Discovery discard error:', error)
        res.status(500).json({ success: false, message: 'Failed to discard tool' })
    }
})

// ─────────────────────────────────────────────────────────────────────────────
// Link Health Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/admin/link-health
 * @desc    Get link validation stats — live/dead/redirected counts, health rate
 * @access  Admin only
 */
router.get('/link-health', async (req, res) => {
    try {
        const stats = await linkValidationService.getStats()
        res.json({ success: true, linkHealth: stats })
    } catch (error) {
        console.error('Link health stats error:', error)
        res.status(500).json({ success: false, message: 'Failed to fetch link health stats' })
    }
})

/**
 * @route   GET /api/v1/admin/link-health/dead
 * @desc    List soft-deleted (dead) tools for admin review before purge
 * @access  Admin only
 */
router.get('/link-health/dead', async (req, res) => {
    try {
        const { page = 1, limit = 50 } = req.query
        const skip = (parseInt(page) - 1) * parseInt(limit)

        const [tools, total] = await Promise.all([
            Tool.find({ linkStatus: 'dead', isActive: false })
                .select('name slug officialUrl lastLinkCheck createdAt')
                .sort({ lastLinkCheck: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Tool.countDocuments({ linkStatus: 'dead', isActive: false }),
        ])

        res.json({
            success: true,
            tools,
            pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
        })
    } catch (error) {
        console.error('Dead tools fetch error:', error)
        res.status(500).json({ success: false, message: 'Failed to fetch dead tools' })
    }
})

/**
 * @route   POST /api/v1/admin/link-health/restore/:id
 * @desc    Restore a soft-deleted tool back to active (override if incorrectly flagged dead)
 * @access  Admin only
 */
router.post('/link-health/restore/:id', async (req, res) => {
    try {
        const tool = await Tool.findByIdAndUpdate(
            req.params.id,
            { $set: { isActive: true, linkStatus: 'live', lastLinkCheck: new Date() } },
            { new: true }
        )
        if (!tool) return res.status(404).json({ success: false, message: 'Tool not found' })
        res.json({ success: true, message: `Tool "${tool.name}" restored to active`, tool })
    } catch (error) {
        console.error('Tool restore error:', error)
        res.status(500).json({ success: false, message: 'Failed to restore tool' })
    }
})

// ─────────────────────────────────────────────────────────────────────────────
// Featured Listings (Vendor Sponsorships) — IMPL-13
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/v1/admin/featured-listings
 * @desc   Get all featured listings (active + expired) with pagination
 */
router.get('/featured-listings', async (req, res) => {
    try {
        const { page = 1, limit = 20, activeOnly = 'false' } = req.query
        const query = activeOnly === 'true' ? { isActive: true } : {}

        const [listings, total] = await Promise.all([
            FeaturedListing.find(query)
                .populate('tool', 'name slug logo isFeatured featuredTier')
                .populate('createdBy', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip((parseInt(page) - 1) * parseInt(limit))
                .limit(parseInt(limit))
                .lean(),
            FeaturedListing.countDocuments(query),
        ])

        res.json({
            success: true,
            listings,
            pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
        })
    } catch (error) {
        console.error('Featured listings fetch error:', error)
        res.status(500).json({ success: false, message: 'Failed to fetch featured listings' })
    }
})

/**
 * @route  POST /api/v1/admin/featured-listings
 * @desc   Create a new featured vendor listing
 * @body   { toolId, tier, startDate, endDate, vendorName, vendorEmail, monthlyRate, notes }
 */
router.post('/featured-listings', async (req, res) => {
    try {
        const { toolId, tier, startDate, endDate, vendorName, vendorEmail, monthlyRate = 0, notes } = req.body

        if (!toolId || !tier || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'toolId, tier, startDate, endDate are required' })
        }
        if (!['standard', 'premium'].includes(tier)) {
            return res.status(400).json({ success: false, message: "tier must be 'standard' or 'premium'" })
        }

        const tool = await Tool.findById(toolId)
        if (!tool) return res.status(404).json({ success: false, message: 'Tool not found' })

        const listing = await FeaturedListing.create({
            tool: toolId,
            tier,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            vendorName,
            vendorEmail,
            monthlyRate,
            notes,
            createdBy: req.user._id,
            isActive: true,
        })

        // Mark the tool as featured at the specified tier
        await Tool.findByIdAndUpdate(toolId, {
            isFeatured: true,
            featuredTier: tier,
        })

        console.log(`[Featured] Admin ${req.user.email} created ${tier} listing for "${tool.name}"`)

        res.status(201).json({ success: true, listing })
    } catch (error) {
        console.error('Featured listing create error:', error)
        res.status(500).json({ success: false, message: 'Failed to create featured listing' })
    }
})

/**
 * @route  PATCH /api/v1/admin/featured-listings/:id
 * @desc   Update an existing listing (tier, dates, notes, vendor info)
 */
router.patch('/featured-listings/:id', async (req, res) => {
    try {
        const allowed = ['tier', 'startDate', 'endDate', 'vendorName', 'vendorEmail', 'monthlyRate', 'notes']
        const update = {}
        for (const key of allowed) {
            if (req.body[key] !== undefined) update[key] = req.body[key]
        }

        const listing = await FeaturedListing.findByIdAndUpdate(
            req.params.id,
            { $set: update },
            { new: true }
        ).populate('tool', 'name slug')

        if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' })

        // If tier changed, sync to the tool
        if (update.tier && listing.isActive) {
            await Tool.findByIdAndUpdate(listing.tool._id, { featuredTier: update.tier })
        }

        res.json({ success: true, listing })
    } catch (error) {
        console.error('Featured listing update error:', error)
        res.status(500).json({ success: false, message: 'Failed to update listing' })
    }
})

/**
 * @route  DELETE /api/v1/admin/featured-listings/:id
 * @desc   Deactivate (soft-delete) a featured listing + un-feature the tool
 */
router.delete('/featured-listings/:id', async (req, res) => {
    try {
        const listing = await FeaturedListing.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        )
        if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' })

        // Check if the tool has any other active listings before un-featuring
        const otherActive = await FeaturedListing.countDocuments({
            tool: listing.tool,
            isActive: true,
            _id: { $ne: listing._id },
        })
        if (otherActive === 0) {
            await Tool.findByIdAndUpdate(listing.tool, { isFeatured: false, featuredTier: null })
        }

        res.json({ success: true, message: 'Listing deactivated and tool un-featured' })
    } catch (error) {
        console.error('Featured listing deactivate error:', error)
        res.status(500).json({ success: false, message: 'Failed to deactivate listing' })
    }
})

/**
 * @route  POST /api/v1/admin/featured-listings/expire-stale
 * @desc   Manually expire all listings past their endDate (cron also handles this)
 */
router.post('/featured-listings/expire-stale', async (req, res) => {
    try {
        const now = new Date()
        const expired = await FeaturedListing.find({ isActive: true, endDate: { $lt: now } })

        let count = 0
        for (const listing of expired) {
            listing.isActive = false
            await listing.save()

            const otherActive = await FeaturedListing.countDocuments({
                tool: listing.tool,
                isActive: true,
                _id: { $ne: listing._id },
            })
            if (otherActive === 0) {
                await Tool.findByIdAndUpdate(listing.tool, { isFeatured: false, featuredTier: null })
            }
            count++
        }

        res.json({ success: true, message: `Expired ${count} stale listing(s)` })
    } catch (error) {
        console.error('Expire stale listings error:', error)
        res.status(500).json({ success: false, message: 'Failed to expire stale listings' })
    }
})

// ─────────────────────────────────────────────────────────────────────────────
// Feature Flags Admin API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/v1/admin/feature-flags
 * @desc   List all feature flags with current enabled state
 * @access Admin only
 */
router.get('/feature-flags', async (req, res) => {
    try {
        const { getAllFlags } = await import('../services/featureFlags.js')
        const flags = await getAllFlags()
        res.json({ success: true, flags })
    } catch (err) {
        console.error('Feature flags list error:', err)
        res.status(500).json({ success: false, message: 'Failed to fetch feature flags' })
    }
})

/**
 * @route  PATCH /api/v1/admin/feature-flags/:key
 * @desc   Enable/disable a feature flag (and optionally set role-based access)
 * @body   { enabled: boolean, enabledForRoles?: string[], description?: string }
 * @access Admin only
 */
router.patch('/feature-flags/:key', async (req, res) => {
    try {
        const { updateFlag } = await import('../services/featureFlags.js')
        const flagKey = req.params.key.toUpperCase()
        const updates = req.body

        if (typeof updates.enabled !== 'boolean' && updates.enabledForRoles === undefined && updates.description === undefined) {
            return res.status(400).json({ success: false, message: 'No valid fields to update. Provide enabled, enabledForRoles, or description.' })
        }

        const flag = await updateFlag(flagKey, updates)

        console.log(`[FeatureFlag] Admin ${req.user.email} set "${flagKey}" enabled=${flag.enabled}`)
        res.json({ success: true, flag })
    } catch (err) {
        console.error('Feature flag update error:', err)
        res.status(500).json({ success: false, message: 'Failed to update feature flag' })
    }
})

/**
 * @route  POST /api/v1/admin/feature-flags/seed
 * @desc   Idempotent seed — inserts all standard flags if they don't exist.
 *         Safe to call multiple times. Existing flags are NOT overwritten.
 * @access Admin only (SUPERADMIN recommended)
 */
router.post('/feature-flags/seed', async (req, res) => {
    try {
        const FeatureFlag = (await import('../models/FeatureFlag.js')).default
        const DEFAULT_FLAGS = [
            { key: 'REVERSE_TRIAL', enabled: false, description: '14-day Pro trial on signup' },
            { key: 'NEW_PRICING_TIERS', enabled: false, description: '3-tier pricing page rebuild with annual toggle' },
            { key: 'AI_STACK_ADVISOR', enabled: false, description: 'Groq AI tool recommendations (with hallucination guard)' },
            { key: 'CONTEXTUAL_NUDGES', enabled: false, description: 'Upgrade nudge panels triggered by user actions' },
            { key: 'VENDOR_LISTINGS', enabled: false, description: 'B2B vendor featured listing programme' },
            { key: 'NEWSLETTER_SIGNUP', enabled: false, description: 'Newsletter opt-in forms and Brevo delivery' },
            { key: 'ONBOARDING_EMAILS', enabled: false, description: '14-day email onboarding sequence post-signup' },
            { key: 'AFFILIATE_TRACKING', enabled: false, description: 'Affiliate click tracking + redirect layer' },
            { key: 'FEATURED_LISTINGS', enabled: false, description: 'Sponsored tool placements on homepage (paid B2B slots)' },
            { key: 'PROGRAMMATIC_SEO', enabled: false, description: 'Groq-expanded tool pages with FAQ + use case content' },
            { key: 'ANNUAL_PRICING_V2', enabled: false, description: 'Annual pricing with "4 months free" framing' },
            { key: 'CANCELLATION_RESCUE', enabled: false, description: 'Exit-intent interstitial on subscription cancel' },
        ]

        const results = []
        for (const flag of DEFAULT_FLAGS) {
            const result = await FeatureFlag.findOneAndUpdate(
                { key: flag.key },
                { $setOnInsert: flag },
                { upsert: true, new: true }
            )
            results.push({ key: result.key, wasInserted: result.createdAt > new Date(Date.now() - 5000) })
        }

        res.json({ success: true, message: `Seeded ${DEFAULT_FLAGS.length} feature flags`, results })
    } catch (err) {
        console.error('Feature flags seed error:', err)
        res.status(500).json({ success: false, message: 'Failed to seed feature flags' })
    }
})


// ─── Claim Requests ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/claims
 * List all claim requests, newest first, with pagination.
 * Query params: status (pending|approved|rejected), page, limit
 */
router.get('/claims', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query
        const filter = {}
        if (status) filter.status = status

        const skip = (parseInt(page) - 1) * parseInt(limit)

        const [claims, total] = await Promise.all([
            ClaimRequest.find(filter)
                .populate('tool', 'name slug logo officialUrl')
                .populate('user', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            ClaimRequest.countDocuments(filter),
        ])

        res.json({
            success: true,
            data: { claims, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } },
        })
    } catch (err) {
        console.error('Admin claims list error:', err)
        res.status(500).json({ success: false, message: 'Failed to fetch claims' })
    }
})

/**
 * PUT /api/v1/admin/claims/:id/approve
 * Approve a claim — marks the tool as verified and sets claimedBy.
 */
router.put('/claims/:id/approve', async (req, res) => {
    try {
        const claim = await ClaimRequest.findById(req.params.id)
            .populate('tool', 'name slug officialUrl')

        if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' })
        if (claim.status !== 'pending') return res.status(400).json({ success: false, message: `Claim is already ${claim.status}` })

        claim.status = 'approved'
        claim.reviewedBy = req.user._id
        claim.reviewedAt = new Date()
        await claim.save()

        // Mark the tool as verified and store the claimant's user ID
        await Tool.findByIdAndUpdate(claim.tool._id, {
            $set: {
                isVerified: true,
                claimedBy: claim.user || null,
                verifiedAt: new Date(),
            },
        })

        // Notify claimant by email (fire-and-forget)
        emailService.sendClaimResult(claim.email, claim.tool.name, 'approved').catch(() => { })

        res.json({ success: true, message: `Claim approved — ${claim.tool.name} is now verified.` })
    } catch (err) {
        console.error('Admin claim approve error:', err)
        res.status(500).json({ success: false, message: 'Failed to approve claim' })
    }
})

/**
 * PUT /api/v1/admin/claims/:id/reject
 * Reject a claim with an optional reason.
 */
router.put('/claims/:id/reject', async (req, res) => {
    try {
        const { reason = '' } = req.body
        const claim = await ClaimRequest.findById(req.params.id)
            .populate('tool', 'name slug')

        if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' })
        if (claim.status !== 'pending') return res.status(400).json({ success: false, message: `Claim is already ${claim.status}` })

        claim.status = 'rejected'
        claim.reviewedBy = req.user._id
        claim.reviewedAt = new Date()
        await claim.save()

        // Notify claimant by email (fire-and-forget)
        emailService.sendClaimResult(claim.email, claim.tool.name, 'rejected', reason).catch(() => { })

        res.json({ success: true, message: 'Claim rejected.' })
    } catch (err) {
        console.error('Admin claim reject error:', err)
        res.status(500).json({ success: false, message: 'Failed to reject claim' })
    }
})

/**
 * POST /api/v1/admin/enrichment/force-reset-all
 * @desc  One-time pre-launch helper.
 *        Resets lastEnrichedAt + enrichmentScore on ALL active tools so that
 *        bulkEnrich.js (and the cron) will re-process every single tool,
 *        including ones "enriched" during the initial data import months ago.
 *
 *        SAFETY: Only clears enrichment metadata — never touches name, slug,
 *        description, pricing, logo, officialUrl, or any other content fields.
 *
 *        Optional: pass { categorySlug: "image-generation" } to reset only
 *        tools in a specific category (phased approach).
 *
 * @body  { confirm: "FORCE_RESET_ALL", categorySlug?: string }
 * @access Admin only
 */
router.post('/enrichment/force-reset-all', async (req, res) => {
    try {
        const { confirm, categorySlug } = req.body

        // Require explicit confirmation string to prevent accidental calls
        if (confirm !== 'FORCE_RESET_ALL') {
            return res.status(400).json({
                success: false,
                message: 'Must send { confirm: "FORCE_RESET_ALL" } in request body to proceed. This is a destructive metadata operation.',
            })
        }

        // Build filter — default to all active tools
        const filter = { status: 'active', isActive: { $ne: false } }

        // Optional: target a single category for phased resets (safer for very large datasets)
        if (categorySlug) {
            const mongoose = (await import('mongoose')).default
            const cat = await mongoose.model('Category').findOne({ slug: categorySlug }).select('_id').lean()
            if (!cat) {
                return res.status(404).json({
                    success: false,
                    message: `Category with slug "${categorySlug}" not found. Aborting reset.`,
                })
            }
            filter.category = cat._id
        }

        const matched = await Tool.countDocuments(filter)

        const result = await Tool.updateMany(filter, {
            $set: {
                lastEnrichedAt: null,
                enrichmentScore: 0,
                needsEnrichment: true,
            },
            $unset: {
                enrichmentVersion: '',
                enrichmentSource: '',
            },
        })

        console.log(
            `[Admin] force-reset-all: enrichment metadata cleared on ${result.modifiedCount} tools` +
            (categorySlug ? ` (category: ${categorySlug})` : ' (all active tools)') +
            ` — requested by ${req.user?.email || 'admin'}`
        )

        res.json({
            success: true,
            message: `Reset enrichment metadata on ${result.modifiedCount} tools. Run bulkEnrich.js locally to begin re-enrichment.`,
            matched,
            modified: result.modifiedCount,
            nextStep: 'Run: node src/scripts/bulkEnrich.js from the Backend/ directory',
        })

    } catch (err) {
        console.error('[Admin] force-reset-all error:', err.message)
        res.status(500).json({ success: false, message: 'Failed to reset enrichment metadata.' })
    }
})

/**
 * POST /api/v1/admin/enrichment/trigger
 * Kick off an enrichment run without waiting for the cron.
 * Accepts optional { batchSize, priority } in the request body.
 */
router.post('/enrichment/trigger', async (req, res) => {
    try {
        const { batchSize = 50, priority = 'score' } = req.body

        // Fire-and-forget — import dynamically to avoid circular deps
        import('../jobs/enrichmentCron.js')
            .then(mod => {
                const fn = mod.runEnrichmentCheck || mod.default?.runEnrichmentCheck
                if (typeof fn === 'function') {
                    fn({ batchSize: Math.min(parseInt(batchSize) || 50, 200), priority })
                        .catch(err => console.error('[Admin] enrichment trigger error:', err.message))
                }
            })
            .catch(err => console.error('[Admin] enrichment import error:', err.message))

        res.json({ success: true, message: `Enrichment run started for up to ${batchSize} tools` })
    } catch (err) {
        console.error('[Admin] enrichment trigger error:', err.message)
        res.status(500).json({ success: false, message: 'Failed to trigger enrichment' })
    }
})

/**
 * GET /api/v1/admin/affiliate/report
 * Affiliate click breakdown by tool, for the AffiliateDashboard.
 * Query params: from (ISO date), to (ISO date)
 */
router.get('/affiliate/report', async (req, res) => {
    try {
        const { from, to } = req.query
        const sinceDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const untilDate = to ? new Date(to) : new Date()

        // Top 20 tools by affiliate click volume (via Tool.visits field or aggregate on Tool)
        const topTools = await Tool.find({
            status: 'active',
            affiliateStatus: { $in: ['approved', 'active'] },
            affiliateUrl: { $exists: true, $ne: '' },
        })
            .sort({ views: -1 })
            .limit(20)
            .select('name slug logo views affiliateUrl affiliateNetwork commissionRate affiliateStatus')
            .lean()

        // Summary counts
        const [totalAffiliate, totalActive, needsAttention] = await Promise.all([
            Tool.countDocuments({ affiliateStatus: { $in: ['approved', 'active'] } }),
            Tool.countDocuments({ affiliateStatus: 'active', affiliateUrl: { $exists: true, $ne: '' } }),
            Tool.countDocuments({ affiliateStatus: 'pending' }),
        ])

        // Pipeline breakdown by network
        const byNetwork = await Tool.aggregate([
            { $match: { affiliateStatus: { $in: ['approved', 'active', 'pending'] } } },
            { $group: { _id: '$affiliateNetwork', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ])

        res.json({
            success: true,
            report: {
                summary: { totalAffiliate, totalActive, needsAttention },
                topTools,
                byNetwork,
                period: { from: sinceDate, to: untilDate },
            },
        })
    } catch (err) {
        console.error('[Admin] Affiliate report error:', err.message)
        res.status(500).json({ success: false, message: 'Failed to generate affiliate report' })
    }
})

/**
 * @route   GET /api/v1/admin/activity/recent
 * @desc    Real-time activity feed — last 20 events across tools, reviews, orders, users
 * @access  Admin only
 */
router.get('/activity/recent', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 50)
        const since = req.query.since
            ? new Date(req.query.since)
            : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // default: last 7 days

        const [newTools, newReviews, newOrders, newUsers] = await Promise.all([
            Tool.find({ createdAt: { $gte: since } })
                .sort({ createdAt: -1 })
                .limit(limit)
                .select('name slug status createdAt logo')
                .lean(),
            Review.find({ createdAt: { $gte: since } })
                .sort({ createdAt: -1 })
                .limit(limit)
                .select('toolId rating status createdAt comment')
                .populate('toolId', 'name slug')
                .lean(),
            Order.find({ createdAt: { $gte: since } })
                .sort({ createdAt: -1 })
                .limit(limit)
                .select('userId status amount.total currency createdAt plan')
                .lean(),
            User.find({ createdAt: { $gte: since } })
                .sort({ createdAt: -1 })
                .limit(limit)
                .select('email firstName lastName createdAt subscription.tier')
                .lean(),
        ])

        // Merge into unified timeline and sort by createdAt desc
        const events = [
            ...newTools.map(t => ({ type: 'tool_submitted', ts: t.createdAt, data: { name: t.name, slug: t.slug, status: t.status, logo: t.logo } })),
            ...newReviews.map(r => ({ type: 'review_posted', ts: r.createdAt, data: { tool: r.toolId?.name, rating: r.rating, status: r.status } })),
            ...newOrders.map(o => ({ type: 'payment', ts: o.createdAt, data: { amount: o.amount?.total, currency: o.currency, plan: o.plan, status: o.status } })),
            ...newUsers.map(u => ({ type: 'user_signed_up', ts: u.createdAt, data: { email: u.email, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() } })),
        ]
            .sort((a, b) => new Date(b.ts) - new Date(a.ts))
            .slice(0, limit)

        res.json({ success: true, events, since, count: events.length })
    } catch (err) {
        console.error('[Admin] Activity feed error:', err.message)
        res.status(500).json({ success: false, message: 'Failed to fetch activity feed' })
    }
})

export default router

