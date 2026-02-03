import mongoose from 'mongoose'

const achievementSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: [
                'first_review',
                'review_master',
                'tool_explorer',
                'early_adopter',
                'referral_champion',
                'premium_member',
                'community_contributor',
            ],
        },
        title: {
            type: String,
            required: true,
        },
        description: String,
        icon: String,
        points: {
            type: Number,
            default: 0,
        },
        unlockedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
)

achievementSchema.index({ user: 1, type: 1 }, { unique: true })
achievementSchema.index({ user: 1, unlockedAt: -1 })

const Achievement = mongoose.model('Achievement', achievementSchema)

export default Achievement
