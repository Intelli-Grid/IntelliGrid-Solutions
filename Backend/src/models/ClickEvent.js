import mongoose from 'mongoose'

/**
 * ClickEvent — affiliate click tracking
 *
 * Logs every outbound tool click that goes through /api/v1/tools/:slug/visit.
 * TTL index auto-expires events after 90 days to keep the collection lean.
 *
 * Used for:
 *   - Affiliate commission reconciliation
 *   - Tool engagement analytics (click-through rate)
 *   - Admin growth dashboard
 */
const clickEventSchema = new mongoose.Schema(
    {
        toolId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tool',
            required: true,
            index: true,
        },
        userId: {
            // null for anonymous visitors
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        // Where the click originated: 'tool_page', 'tool_card', 'search', 'comparison', 'stack_advisor'
        source: {
            type: String,
            default: 'tool_page',
            enum: ['tool_page', 'tool_card', 'search', 'comparison', 'stack_advisor', 'featured', 'newsletter'],
        },
        ip: { type: String },
        userAgent: { type: String },
        referrer: { type: String },
        // The URL the user was redirected to (affiliate link or officialUrl)
        destination: { type: String },
        // True if we redirected to an affiliate URL (not the direct tool URL)
        wasAffiliate: { type: Boolean, default: false },
    },
    { timestamps: true }
)

// Auto-expire click events after 90 days to keep collection lean
clickEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

// Compound index for analytics queries: clicks per tool per day
clickEventSchema.index({ toolId: 1, createdAt: -1 })

const ClickEvent = mongoose.model('ClickEvent', clickEventSchema)

export default ClickEvent
