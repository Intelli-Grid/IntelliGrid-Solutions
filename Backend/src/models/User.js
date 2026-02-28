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
                // Free       — default. 10 favourites, 2 collections, compare 2 tools
                // Basic      — paid entry tier
                // Pro        — full paid tier (also used for reverse trial users)
                // Premium    — legacy alias for Pro (kept to avoid breaking existing records)
                // Business   — team tier
                // Enterprise — enterprise custom tier
                enum: ['Free', 'Basic', 'Pro', 'Premium', 'Business', 'Enterprise'],
                default: 'Free',
            },
            status: {
                type: String,
                enum: ['active', 'inactive', 'cancelled', 'expired'],
                default: 'active',
            },
            startDate: Date,
            endDate: Date,
            cancelledAt: Date,
            autoRenew: {
                type: Boolean,
                default: false,
            },
            // PayPal Subscriptions API v2 — stored so webhooks can look up the user
            paypalSubscriptionId: {
                type: String,
                default: null,
                index: true,
                sparse: true,
            },
            // Reverse-trial metadata — only populated during the 14-day free trial
            reverseTrial: {
                active: { type: Boolean, default: false },
                startDate: { type: Date, default: null },
                endDate: { type: Date, default: null },
                // true once the user pays — cron skips converted users
                converted: { type: Boolean, default: false },
                // Date the trial was downgraded back to Free
                downgradedAt: { type: Date, default: null },
            },
        },
        role: {
            type: String,
            // 4-tier RBAC system:
            // USER            → Regular registered user
            // MODERATOR       → Can manage tools/reviews in admin panel
            // TRUSTED_OPERATOR → Can access AI agent dashboard
            // SUPERADMIN      → Full access to everything (owner only)
            // Legacy values kept for backward compatibility during migration
            enum: ['user', 'premium', 'admin', 'USER', 'MODERATOR', 'TRUSTED_OPERATOR', 'SUPERADMIN'],
            default: 'USER',
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
        // AI Stack Advisor — stores the 10 most recent recommendation sets
        savedStacks: {
            type: [
                {
                    createdAt: { type: Date, default: Date.now },
                    input: { type: mongoose.Schema.Types.Mixed },
                    recommendations: { type: [mongoose.Schema.Types.Mixed] },
                },
            ],
            default: [],
        },
        // Win-back and cancellation tracking
        winBackSent: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
)

// Indexes
// email and clerkId are already indexed by unique: true
userSchema.index({ 'subscription.tier': 1, 'subscription.status': 1 })

const User = mongoose.model('User', userSchema)

export default User
