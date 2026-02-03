import express from 'express'
import { clerkClient } from '../config/clerk.js'

const router = express.Router()

/**
 * @route   GET /api/v1/admin/stats
 * @desc    Get admin dashboard statistics
 * @access  Admin only
 */
router.get('/stats', async (req, res) => {
    try {
        const [toolsCount, usersCount, reviewsCount, paymentsCount] = await Promise.all([
            req.app.locals.db.collection('tools').countDocuments(),
            clerkClient.users.getUserList({ limit: 1 }).then(result => result.totalCount),
            req.app.locals.db.collection('reviews').countDocuments(),
            req.app.locals.db.collection('payments').countDocuments(),
        ])

        const totalRevenue = await req.app.locals.db.collection('payments')
            .aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]).toArray()

        res.json({
            success: true,
            stats: {
                totalTools: toolsCount,
                totalUsers: usersCount,
                totalReviews: reviewsCount,
                totalPayments: paymentsCount,
                totalRevenue: totalRevenue[0]?.total || 0
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
        const pendingTools = await req.app.locals.db.collection('tools')
            .find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray()

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
        const result = await req.app.locals.db.collection('tools').updateOne(
            { _id: req.params.id },
            {
                $set: {
                    status: 'active',
                    approvedAt: new Date(),
                    approvedBy: req.auth.userId
                }
            }
        )

        if (result.matchedCount === 0) {
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
        const result = await req.app.locals.db.collection('tools').deleteOne({
            _id: req.params.id
        })

        if (result.deletedCount === 0) {
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
 * @route   GET /api/v1/admin/reviews/pending
 * @desc    Get pending reviews for moderation
 * @access  Admin only
 */
router.get('/reviews/pending', async (req, res) => {
    try {
        const pendingReviews = await req.app.locals.db.collection('reviews')
            .find({ status: 'pending' })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray()

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
        const result = await req.app.locals.db.collection('reviews').updateOne(
            { _id: req.params.id },
            {
                $set: {
                    status: 'approved',
                    moderatedAt: new Date(),
                    moderatedBy: req.auth.userId
                }
            }
        )

        if (result.matchedCount === 0) {
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
 * @route   GET /api/v1/admin/payments
 * @desc    Get all payments with filters
 * @access  Admin only
 */
router.get('/payments', async (req, res) => {
    try {
        const { status, limit = 50, page = 1 } = req.query
        const query = status ? { status } : {}

        const payments = await req.app.locals.db.collection('payments')
            .find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .toArray()

        const total = await req.app.locals.db.collection('payments').countDocuments(query)

        res.json({
            success: true,
            payments,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit)
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

export default router
