/**
 * feedbackRoutes.js
 * POST /api/v1/feedback  — submit user feedback (suggestion | bug | praise)
 * GET  /api/v1/feedback  — admin: list all feedback (paginated)
 * PUT  /api/v1/feedback/:id/resolve — admin: mark as resolved
 */
import express from 'express'
import mongoose from 'mongoose'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import asyncHandler from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'

const router = express.Router()

// ── Inline schema (no separate model file needed for this simple entity) ──────
const feedbackSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },   // Clerk user ID
        type: { type: String, enum: ['suggestion', 'bug', 'praise'], default: 'suggestion' },
        message: { type: String, required: true, maxlength: 1000 },
        page: { type: String, default: '/' },
        status: { type: String, enum: ['open', 'resolved', 'wontfix'], default: 'open' },
        adminNote: { type: String, default: '' },
    },
    { timestamps: true }
)

const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema)

// POST /api/v1/feedback — authenticated users only
router.post('/', requireAuth, asyncHandler(async (req, res) => {
    const { type, message, page } = req.body

    if (!message || message.trim().length < 8) {
        throw ApiError.badRequest('Message must be at least 8 characters')
    }

    if (type && !['suggestion', 'bug', 'praise'].includes(type)) {
        throw ApiError.badRequest('Invalid feedback type')
    }

    const feedback = await Feedback.create({
        userId: req.user.clerkId || req.user._id.toString(),
        type: type || 'suggestion',
        message: message.trim().slice(0, 1000),
        page: (page || '/').slice(0, 200),
    })

    res.status(201).json({ success: true, id: feedback._id })
}))

// GET /api/v1/feedback — admin only
router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const { status, type, page = 1, limit = 30 } = req.query

    const filter = {}
    if (status && status !== 'all') filter.status = status
    if (type && type !== 'all') filter.type = type

    const [items, total] = await Promise.all([
        Feedback.find(filter)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .lean(),
        Feedback.countDocuments(filter),
    ])

    res.json({
        success: true,
        items,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    })
}))

// PUT /api/v1/feedback/:id/resolve — admin only
router.put('/:id/resolve', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const { status = 'resolved', adminNote = '' } = req.body

    if (!['resolved', 'wontfix', 'open'].includes(status)) {
        throw ApiError.badRequest('Invalid status value')
    }

    const feedback = await Feedback.findByIdAndUpdate(
        req.params.id,
        { status, adminNote },
        { new: true }
    )

    if (!feedback) throw ApiError.notFound('Feedback not found')

    res.json({ success: true, feedback })
}))

export default router
