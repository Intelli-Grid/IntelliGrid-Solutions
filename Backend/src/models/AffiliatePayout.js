import mongoose from 'mongoose'

const affiliatePayoutSchema = new mongoose.Schema(
    {
        affiliate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            default: 'USD',
        },
        period: {
            start: Date,
            end: Date,
        },
        referrals: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            order: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Order',
            },
            commission: Number,
        }],
        status: {
            type: String,
            enum: ['pending', 'processing', 'paid', 'failed'],
            default: 'pending',
        },
        paymentMethod: String,
        paymentDetails: mongoose.Schema.Types.Mixed,
        paidAt: Date,
    },
    {
        timestamps: true,
    }
)

affiliatePayoutSchema.index({ affiliate: 1, status: 1 })
affiliatePayoutSchema.index({ createdAt: -1 })

const AffiliatePayout = mongoose.model('AffiliatePayout', affiliatePayoutSchema)

export default AffiliatePayout
