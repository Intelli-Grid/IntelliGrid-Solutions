import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        description: String,
        discountType: {
            type: String,
            enum: ['percentage', 'fixed'],
            required: true,
        },
        discountValue: {
            type: Number,
            required: true,
            min: 0,
        },
        // For percentage discounts – cap the discount at this value in $
        maxDiscount: Number,
        // INR-native fixed discount amount for Cashfree payments.
        // If null, paymentService falls back to discountValue × 83 conversion.
        discountValueINR: {
            type: Number,
            default: null,
        },
        // INR cap for percentage discounts (mirrors maxDiscount in rupees)
        maxDiscountINR: {
            type: Number,
            default: null,
        },
        // Minimum purchase amount to apply coupon
        minPurchase: {
            type: Number,
            default: 0,
        },
        // Which subscription plans this applies to. Empty = all plans.
        applicablePlans: [{
            type: String,
            enum: ['BASIC', 'PRO', 'ENTERPRISE'],
        }],
        // Max number of total times this coupon can be used
        maxUses: {
            type: Number,
            default: null, // null = unlimited
        },
        // How many times this coupon has been used
        usedCount: {
            type: Number,
            default: 0,
        },
        // Optional expiry date — null = never expires
        expiresAt: {
            type: Date,
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
)

// Indexes for fast lookup
couponSchema.index({ code: 1 })           // already unique, but explicit
couponSchema.index({ isActive: 1 })
couponSchema.index({ expiresAt: 1 })

const Coupon = mongoose.model('Coupon', couponSchema)

export default Coupon
