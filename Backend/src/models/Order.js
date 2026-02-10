import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            required: true,
            unique: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        subscription: {
            tier: {
                type: String,
                enum: ['free', 'pro'],
                required: true,
            },
            duration: {
                type: String,
                enum: ['monthly', 'yearly'],
                required: true,
            },
        },
        amount: {
            currency: {
                type: String,
                default: 'USD',
            },
            total: {
                type: Number,
                required: true,
            },
            subtotal: Number,
            discount: Number,
            tax: Number,
        },
        paymentGateway: {
            type: String,
            enum: ['paypal', 'cashfree'],
            required: true,
        },
        paymentDetails: {
            transactionId: String,
            paymentMethod: String,
            payerId: String,
        },
        coupon: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon',
        },
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
            default: 'pending',
        },
        metadata: mongoose.Schema.Types.Mixed,
    },
    {
        timestamps: true,
    }
)

orderSchema.index({ user: 1, status: 1 })
// orderId is already indexed by unique: true
orderSchema.index({ createdAt: -1 })

const Order = mongoose.model('Order', orderSchema)

export default Order
