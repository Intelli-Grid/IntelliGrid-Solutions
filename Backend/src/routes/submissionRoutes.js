import express from 'express'
import Submission from '../models/Submission.js'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import asyncHandler from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import emailService from '../services/emailService.js'

const router = express.Router()

/**
 * @route   POST /api/v1/submissions
 * @desc    Submit a new tool (public or authenticated)
 * @access  Public (optionally authenticated)
 */
router.post('/', asyncHandler(async (req, res) => {
    const {
        toolName, officialUrl, shortDescription, fullDescription,
        category, pricing, features, submitterName, submitterEmail
    } = req.body

    if (!toolName || !officialUrl || !shortDescription) {
        throw ApiError.badRequest('toolName, officialUrl, and shortDescription are required')
    }

    // Basic URL validation
    try { new URL(officialUrl) } catch { throw ApiError.badRequest('Invalid officialUrl') }

    // Check duplicate by URL
    const existing = await Submission.findOne({ officialUrl: officialUrl.trim() })
    if (existing) {
        return res.status(409).json({
            success: false,
            message: 'A tool with this URL has already been submitted',
        })
    }

    const submission = await Submission.create({
        toolName: toolName.trim(),
        officialUrl: officialUrl.trim(),
        shortDescription: shortDescription.trim(),
        fullDescription: fullDescription?.trim(),
        category,
        pricing,
        features: features || [],
        submittedBy: {
            user: req.user?._id || null,
            email: submitterEmail || req.user?.email,
            name: submitterName || (req.user ? `${req.user.firstName} ${req.user.lastName}`.trim() : 'Anonymous'),
        },
    })

    // Send confirmation email if we have an email
    const confirmEmail = submitterEmail || req.user?.email
    if (confirmEmail) {
        try {
            await emailService.sendEmail({
                to: confirmEmail,
                subject: 'Your Tool Submission Was Received — IntelliGrid',
                html: `
                    <div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0d0d1a;color:#fff;padding:32px;border-radius:16px">
                        <h2 style="color:#a78bfa;margin-bottom:8px">Submission Received! 🎉</h2>
                        <p style="color:#9ca3af">Thanks for submitting <strong style="color:#fff">${toolName}</strong> to IntelliGrid.</p>
                        <p style="color:#9ca3af">Our team will review it within 2–3 business days. You'll hear from us once it's reviewed.</p>
                        <div style="background:#1a1a2e;border-radius:12px;padding:16px;margin:20px 0">
                            <p style="margin:0;color:#6b7280;font-size:14px">Tool submitted:</p>
                            <p style="margin:4px 0 0;color:#fff;font-size:16px;font-weight:600">${toolName}</p>
                            <a href="${officialUrl}" style="color:#a78bfa;font-size:13px">${officialUrl}</a>
                        </div>
                        <p style="color:#6b7280;font-size:13px">— The IntelliGrid Team</p>
                    </div>
                `,
            })
        } catch (e) {
            console.error('Submission confirmation email failed:', e.message)
        }
    }

    res.status(201).json({
        success: true,
        message: 'Tool submitted successfully! We\'ll review it within 2–3 business days.',
        submissionId: submission._id,
    })
}))

/**
 * @route   GET /api/v1/submissions/mine
 * @desc    Get current user's submissions
 * @access  Authenticated
 */
router.get('/mine', requireAuth, asyncHandler(async (req, res) => {
    const submissions = await Submission.find({ 'submittedBy.user': req.user._id })
        .sort({ createdAt: -1 }).lean()
    res.json({ success: true, submissions })
}))

/**
 * @route   GET /api/v1/submissions (admin)
 * @desc    Get all submissions with filter
 * @access  Admin
 */
router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const { status = 'pending', page = 1, limit = 20 } = req.query
    const query = status === 'all' ? {} : { status }
    const submissions = await Submission.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean()
    const total = await Submission.countDocuments(query)
    res.json({ success: true, submissions, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } })
}))

/**
 * @route   PATCH /api/v1/submissions/:id/review (admin)
 * @desc    Approve or reject a submission
 * @access  Admin
 */
router.patch('/:id/review', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const { action, reviewNotes } = req.body // action: 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action)) throw ApiError.badRequest('action must be approve or reject')

    const submission = await Submission.findById(req.params.id)
    if (!submission) throw ApiError.notFound('Submission not found')

    submission.status = action === 'approve' ? 'approved' : 'rejected'
    submission.reviewedBy = req.user._id
    submission.reviewNotes = reviewNotes
    submission.reviewedAt = new Date()

    if (action === 'approve') {
        // Build a URL-safe, collision-safe slug
        const baseSlug = submission.toolName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')

        // Check for slug collision and append nanoid suffix if needed
        const { nanoid } = await import('nanoid')
        let slug = baseSlug
        const existing = await Tool.findOne({ slug })
        if (existing) slug = `${baseSlug}-${nanoid(6)}`

        // Map pricing string to Tool.pricing enum
        const PRICING_MAP = {
            free: 'Free', Free: 'Free',
            freemium: 'Freemium', Freemium: 'Freemium',
            paid: 'Paid', Paid: 'Paid',
            trial: 'Trial', Trial: 'Trial',
        }
        const pricingNorm = PRICING_MAP[submission.pricing] || 'Unknown'

        // Resolve category: find ObjectId by name if category is a string
        let categoryId = null
        if (submission.category) {
            const cat = await Category.findOne({
                name: { $regex: new RegExp(`^${submission.category}$`, 'i') },
            })
            categoryId = cat?._id || null
        }

        const tool = await Tool.create({
            name: submission.toolName,
            slug,
            officialUrl: submission.officialUrl,
            // sourceUrl is no longer required — fall back to officialUrl for submissions
            sourceUrl: submission.officialUrl,
            shortDescription: submission.shortDescription,
            // fullDescription is optional — fall back to shortDescription if not provided
            fullDescription: submission.fullDescription || submission.shortDescription,
            category: categoryId,
            pricing: pricingNorm,
            features: submission.features || [],
            status: 'active',
            submittedBy: submission.submittedBy?.user || null,
        })
        submission.approvedTool = tool._id
    }

    await submission.save()

    // Notify submitter
    const submitterEmail = submission.submittedBy?.email
    if (submitterEmail) {
        try {
            await emailService.sendEmail({
                to: submitterEmail,
                subject: action === 'approve'
                    ? `🎉 "${submission.toolName}" is now live on IntelliGrid!`
                    : `Update on your IntelliGrid submission: "${submission.toolName}"`,
                html: action === 'approve'
                    ? `<div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0d0d1a;color:#fff;padding:32px;border-radius:16px"><h2 style="color:#10b981">Your Tool Is Live! 🚀</h2><p style="color:#9ca3af"><strong style="color:#fff">${submission.toolName}</strong> has been approved and is now listed on IntelliGrid.</p><a href="https://www.intelligrid.online" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none">View on IntelliGrid</a></div>`
                    : `<div style="font-family:sans-serif;max-width:520px;margin:auto;background:#0d0d1a;color:#fff;padding:32px;border-radius:16px"><h2 style="color:#f59e0b">Submission Update</h2><p style="color:#9ca3af">Your submission for <strong style="color:#fff">${submission.toolName}</strong> was not approved at this time.</p>${reviewNotes ? `<p style="color:#6b7280;font-size:14px">Notes: ${reviewNotes}</p>` : ''}</div>`,
            })
        } catch (e) { console.error('Review notification email failed:', e.message) }
    }

    res.json({ success: true, submission })
}))

export default router
