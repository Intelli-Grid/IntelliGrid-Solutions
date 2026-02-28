import mongoose from 'mongoose'

/**
 * FeaturedListing
 *
 * Tracks paid vendor listing deals — which tool is featured, at what tier,
 * how much was paid, and when the listing expires.
 * Admin uses this to manage the commercial featured placements.
 */
const featuredListingSchema = new mongoose.Schema(
    {
        tool: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tool',
            required: true,
            index: true,
        },
        tier: {
            type: String,
            enum: ['standard', 'premium'],
            required: true,
        },
        // Commercial details — who is paying and how much
        vendorName: { type: String, trim: true },
        vendorEmail: { type: String, trim: true, lowercase: true },
        monthlyRate: { type: Number, default: 0 },    // USD/month paid
        currency: { type: String, default: 'USD' },

        // Listing period
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true, index: true },

        // Status
        isActive: { type: Boolean, default: true, index: true },
        notes: { type: String, trim: true },

        // Who created/managed this listing
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
)

// Index for expiry cron and active listings queries
featuredListingSchema.index({ isActive: 1, endDate: 1 })

const FeaturedListing = mongoose.model('FeaturedListing', featuredListingSchema)
export default FeaturedListing
