import express from 'express'
import clerkClient from '../config/clerk.js'
import Tool from '../models/Tool.js'
import Review from '../models/Review.js'
import User from '../models/User.js'
import Order from '../models/Order.js'
import ClaimRequest from '../models/ClaimRequest.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import emailService from '../services/emailService.js'

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
            clerkClient.users.getUserList({ limit: 1 }).then(result => result.totalCount),
            Review.countDocuments(),
            Review.countDocuments({ status: 'pending' }),
            Order.countDocuments(),
            Order.countDocuments({ status: 'failed' }),
            User.countDocuments({ 'subscription.status': 'active', 'subscription.tier': { $ne: 'Free' } }) // Assuming User model imported
        ])

        const totalRevenueResult = await Order.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount.total' } } }
        ])

        res.json({
            success: true,
            stats: {
                totalTools: toolsCount,
                pendingTools: pendingToolsCount,
                totalUsers: usersCount,
                totalReviews: reviewsCount,
                pendingReviews: flaggedReviewsCount, // Use pending count here
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
 * @route   PUT /api/v1/admin/tools/:id/approve
 * @desc    Approve a pending tool
 * @access  Admin only
 */
router.put('/tools/:id/approve', async (req, res) => {
    try {
        const tool = await Tool.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    status: 'active',
                    approvedAt: new Date(),
                    // approvedBy: req.auth.userId // req.auth might not be populated if auth middleware isn't used explicitly here, but route is protected in app.js? No, usually middleware is applied in router. 
                    // Wait, app.use('/api/v1/admin', adminRoutes) in app.js doesn't have auth middleware!
                    // I should add auth middleware to these routes or in app.js.
                    // For now, let's keep it simple and assume auth middleware is applied or will be applied. 
                    // Actually, looking at toolRoutes, middleware is applied per route. 
                    // adminRoutes doesn't seem to import/use middleware yet.
                }
            },
            { new: true }
        )

        if (!tool) {
            return res.status(404).json({
                success: false,
                message: 'Tool not found'
            })
        }

        res.json({
            success: true,
            message: 'Tool approved successfully'
        })
    } catch (error) {
        console.error('Tool approval error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to approve tool'
        })
    }
})

/**
 * @route   DELETE /api/v1/admin/tools/:id
 * @desc    Delete a tool
 * @access  Admin only
 */
router.delete('/tools/:id', async (req, res) => {
    try {
        const tool = await Tool.findByIdAndDelete(req.params.id)

        if (!tool) {
            return res.status(404).json({
                success: false,
                message: 'Tool not found'
            })
        }

        res.json({
            success: true,
            message: 'Tool deleted successfully'
        })
    } catch (error) {
        console.error('Tool deletion error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to delete tool'
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
 * @desc    Approve a pending review
 * @access  Admin only
 */
router.put('/reviews/:id/approve', async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    status: 'approved',
                    moderatedAt: new Date(),
                    // moderatedBy: req.auth.userId
                }
            },
            { new: true }
        )

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            })
        }

        res.json({
            success: true,
            message: 'Review approved successfully'
        })
    } catch (error) {
        console.error('Review approval error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to approve review'
        })
    }
})

/**
 * @route   PUT /api/v1/admin/reviews/:id/reject
 * @desc    Reject a pending review
 * @access  Admin only
 */
router.put('/reviews/:id/reject', async (req, res) => {
    try {
        const review = await Review.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    status: 'rejected',
                    moderatedAt: new Date(),
                }
            },
            { new: true }
        )

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found'
            })
        }

        res.json({
            success: true,
            message: 'Review rejected successfully'
        })
    } catch (error) {
        console.error('Review rejection error:', error)
        res.status(500).json({
            success: false,
            message: 'Failed to reject review'
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

// Claim Management Routes
router.get('/claims/pending', async (req, res) => {
    try {
        const claims = await ClaimRequest.find({ status: 'pending' })
            .populate('tool', 'name slug')
            .populate('user', 'firstName lastName email avatar')
            .sort({ createdAt: -1 })

        res.json({
            success: true,
            claims
        })
    } catch (error) {
        console.error('Pending claims error:', error)
        res.status(500).json({ success: false, message: 'Failed to fetch pending claims' })
    }
})

router.put('/claims/:id/approve', async (req, res) => {
    try {
        const claim = await ClaimRequest.findById(req.params.id)
        if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' })

        // Find user 
        const User = (await import('../models/User.js')).default
        let userId = claim.user

        if (!userId) {
            const user = await User.findOne({ email: claim.email })
            if (!user) return res.status(400).json({ success: false, message: 'User not registered with this email' })
            userId = user._id
        }

        // Update Tool
        await Tool.findByIdAndUpdate(claim.tool, { isVerified: true, owner: userId })

        // Update Claim
        claim.status = 'approved'
        claim.reviewedAt = new Date()

        // Admin user logic skipped for brevity/simplicity, can add later if needed for audit

        await claim.save()

        res.json({ success: true, message: 'Claim approved' })
    } catch (error) {
        console.error('Claim approval error:', error)
        res.status(500).json({ success: false, message: 'Failed to approve claim' })
    }
})

router.put('/claims/:id/reject', async (req, res) => {
    try {
        const claim = await ClaimRequest.findByIdAndUpdate(
            req.params.id,
            { status: 'rejected', reviewedAt: new Date() },
            { new: true }
        )
        if (!claim) return res.status(404).json({ success: false, message: 'Claim not found' })

        res.json({ success: true, message: 'Claim rejected' })
    } catch (error) {
        console.error('Claim rejection error:', error)
        res.status(500).json({ success: false, message: 'Failed to reject claim' })
    }
})


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

export default router

