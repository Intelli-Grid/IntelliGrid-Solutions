import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
    {
        clerkId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        firstName: String,
        lastName: String,
        username: {
            type: String,
            unique: true,
            sparse: true,
        },
        avatar: String,
        subscription: {
            tier: {
                type: String,
                enum: ['Free', 'Basic', 'Premium', 'Enterprise'],
                default: 'Free',
            },
            status: {
                type: String,
                enum: ['active', 'inactive', 'cancelled', 'expired'],
                default: 'active',
            },
            startDate: Date,
            endDate: Date,
            autoRenew: {
                type: Boolean,
                default: false,
            },
        },
        role: {
            type: String,
            enum: ['user', 'premium', 'admin'],
            default: 'user',
        },
        profile: {
            bio: String,
            website: String,
            location: String,
            company: String,
        },
        stats: {
            toolsViewed: {
                type: Number,
                default: 0,
            },
            toolsFavorited: {
                type: Number,
                default: 0,
            },
            reviewsWritten: {
                type: Number,
                default: 0,
            },
            referrals: {
                type: Number,
                default: 0,
            },
        },
        referralCode: {
            type: String,
            unique: true,
            sparse: true,
        },
        referredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLoginAt: Date,
    },
    {
        timestamps: true,
    }
)

// Indexes
userSchema.index({ email: 1 })
userSchema.index({ clerkId: 1 })
userSchema.index({ 'subscription.tier': 1, 'subscription.status': 1 })

const User = mongoose.model('User', userSchema)

export default User
