import mongoose from 'mongoose'

/**
 * ClickEvent — affiliate click tracking
 *
 * Logs every outbound tool click that goes through /api/v1/tools/slug/:slug/visit.
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

        // ── Affiliate metadata ─────────────────────────────────────────────────
        // Denormalized from Tool at click-time so analytics queries don't need joins.
        // These fields MUST be in the schema — Mongoose strict mode silently drops
        // any fields not declared here, which would break all affiliate analytics.
        affiliateNetwork: {
            // Which network processed this click (partnerstack, impact, etc.)
            type: String,
            enum: ['partnerstack', 'impact', 'shareasale', 'cj', 'appsumo', 'direct', 'none'],
            default: 'none',
        },
        affiliateStatus: {
            // The tool's affiliate approval status at the time of the click
            type: String,
            enum: ['not_started', 'pending', 'approved', 'rejected', 'not_available'],
            default: 'not_started',
        },
        commissionType: {
            // Revenue model so analytics can estimate commission impact
            type: String,
            enum: ['recurring', 'one_time', 'hybrid', 'tiered', 'none'],
            default: 'none',
        },
    },
    { timestamps: true }
)

// Auto-expire click events after 90 days to keep collection lean
clickEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

// Compound index for analytics queries: clicks per tool per day
clickEventSchema.index({ toolId: 1, createdAt: -1 })

// Affiliate analytics compound index — used by /analytics/affiliate-clicks aggregations
clickEventSchema.index({ wasAffiliate: 1, affiliateNetwork: 1, createdAt: -1 })

const ClickEvent = mongoose.model('ClickEvent', clickEventSchema)

export default ClickEvent
