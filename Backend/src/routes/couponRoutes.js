import express from 'express'
import Coupon from '../models/Coupon.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import asyncHandler from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'

const router = express.Router()

// ─── Fixed routes first ───────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/coupons/validate
 * @desc    Validate a coupon code and return discount info
 * @access  Authenticated
 */
router.post('/validate', requireAuth, asyncHandler(async (req, res) => {
    const { code, planId } = req.body
    if (!code) throw ApiError.badRequest('Coupon code is required')

    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), isActive: true })

    if (!coupon) {
        return res.status(404).json({ success: false, message: 'Invalid or expired coupon code' })
    }

    // Check expiry
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
        return res.status(400).json({ success: false, message: 'This coupon has expired' })
    }

    // Check usage limit (null = unlimited)
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' })
    }

    // Check applicable plans
    if (coupon.applicablePlans?.length > 0 && planId) {
        // planId may come in as 'BASIC', 'PRO', 'ENTERPRISE' or a Stripe price ID
        const planUpper = planId?.toUpperCase()
        const matches = coupon.applicablePlans.some(p =>
            planUpper.includes(p)
        )
        if (!matches) {
            return res.status(400).json({ success: false, message: 'This coupon is not valid for the selected plan' })
        }
    }

    res.json({
        success: true,
        coupon: {
            code: coupon.code,
            description: coupon.description,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            maxDiscount: coupon.maxDiscount,
        },
        message: `Coupon applied: ${coupon.discountType === 'percentage' ? `${coupon.discountValue}% off` : `$${coupon.discountValue} off`}`,
    })
}))

/**
 * @route   GET /api/v1/coupons (admin)
 * @desc    List all coupons
 * @access  Admin
 */
router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean()
    res.json({ success: true, coupons })
}))

/**
 * @route   POST /api/v1/coupons (admin)
 * @desc    Create a new coupon
 * @access  Admin
 */
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const {
        code, description, discountType, discountValue,
        maxDiscount, minPurchase, applicablePlans,
        maxUses, expiresAt, isActive,
    } = req.body

    if (!code || !discountType || discountValue === undefined) {
        throw ApiError.badRequest('code, discountType, and discountValue are required')
    }

    // Check for duplicate code
    const existing = await Coupon.findOne({ code: code.toUpperCase().trim() })
    if (existing) throw ApiError.conflict(`Coupon code "${code.toUpperCase()}" already exists`)

    const coupon = await Coupon.create({
        code: code.toUpperCase().trim(),
        description,
        discountType,
        discountValue: Number(discountValue),
        maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
        minPurchase: minPurchase ? Number(minPurchase) : 0,
        applicablePlans: applicablePlans || [],
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: isActive !== false,
        createdBy: req.user._id,
    })

    res.status(201).json({ success: true, coupon })
}))

// ─── Parameterised routes ─────────────────────────────────────────────────────

/**
 * @route   PATCH /api/v1/coupons/:id (admin)
 * @desc    Toggle active status or update coupon
 * @access  Admin
 */
router.patch('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    if (!coupon) throw ApiError.notFound('Coupon not found')
    res.json({ success: true, coupon })
}))

/**
 * @route   DELETE /api/v1/coupons/:id (admin)
 * @desc    Delete a coupon
 * @access  Admin
 */
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const coupon = await Coupon.findByIdAndDelete(req.params.id)
    if (!coupon) throw ApiError.notFound('Coupon not found')
    res.json({ success: true, message: 'Coupon deleted' })
}))

export default router
