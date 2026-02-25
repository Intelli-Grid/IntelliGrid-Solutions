import mongoose from 'mongoose'
import slugify from 'slugify'
import Favorite from './Favorite.js'
import Review from './Review.js'

const toolSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Tool name is required'],
            trim: true,
            maxlength: [200, 'Tool name cannot exceed 200 characters'],
        },
        slug: {
            type: String,
            unique: true,
            lowercase: true,
            index: true,
        },
        officialUrl: {
            type: String,
            required: [true, 'Official URL is required'],
            trim: true,
        },
        sourceUrl: {
            // Populated by CSV import pipeline; not required for community submissions
            type: String,
            trim: true,
        },
        shortDescription: {
            type: String,
            required: [true, 'Short description is required'],
            maxlength: [500, 'Short description cannot exceed 500 characters'],
        },
        fullDescription: {
            // Optional — community submissions may use shortDescription only
            type: String,
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        },
        tags: [{
            type: String,
            trim: true,
        }],
        pricing: {
            type: String,
            enum: ['Free', 'Freemium', 'Paid', 'Trial', 'Unknown'],
            default: 'Unknown',
        },
        features: [{
            type: String,
        }],
        ratings: {
            average: {
                type: Number,
                default: 0,
                min: 0,
                max: 5,
            },
            count: {
                type: Number,
                default: 0,
            },
        },
        views: {
            type: Number,
            default: 0,
        },
        favorites: {
            type: Number,
            default: 0,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        isToolOfTheDay: {
            type: Boolean,
            default: false,
        },
        isTrending: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['active', 'pending', 'rejected', 'archived'],
            default: 'active',
        },
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        // Top-level image fields (used by ToolCard, SimilarTools, SEO)
        logo: {
            type: String,
            trim: true,
        },
        screenshots: [{
            type: String,
            trim: true,
        }],
        // Metadata sub-document (kept for backward compatibility)
        metadata: {
            logo: String,
            screenshots: [String],
            videoUrl: String,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        contactEmail: {
            type: String,
            trim: true,
            lowercase: true,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        // ── Link health & freshness (Batch 1 — added for validation pipeline) ──
        linkStatus: {
            type: String,
            enum: ['live', 'dead', 'redirected', 'unknown'],
            default: 'unknown',
            index: true,
        },
        lastLinkCheck: {
            type: Date,
            default: null,
        },
        // isActive is the soft-delete flag. false = hidden from all public queries.
        // Use this instead of hard-deleting until you are 100% sure a tool is gone.
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        sourceFoundBy: {
            type: String,
            enum: ['manual', 'scraper', 'producthunt', 'twitter', 'hacker-news', 'submission', 'csv-import'],
            default: 'manual',
        },

        // ── Batch 2 — Schema enrichment fields ──
        affiliateUrl: {
            // Monetisation: override officialUrl with tracked affiliate link
            type: String,
            trim: true,
        },
        pricingPageUrl: {
            type: String,
            trim: true,
        },
        targetAudience: {
            // e.g. 'developers', 'marketers', 'designers'
            type: String,
            trim: true,
            maxlength: 100,
        },
        launchedAt: {
            // When the tool itself publicly launched (not when added to IntelliGrid)
            type: Date,
            default: null,
        },
        hasFreeTier: {
            type: Boolean,
            default: null,   // null = unknown, true/false = confirmed
        },
        startingPrice: {
            // Human-readable string e.g. "$9/mo", "Free", "$0.001 / 1K tokens"
            type: String,
            trim: true,
            maxlength: 50,
        },
        metaTitle: {
            // Override auto-generated SEO title for this tool page
            type: String,
            trim: true,
            maxlength: 70,
        },
        metaDescription: {
            // Override auto-generated SEO description for this tool page
            type: String,
            trim: true,
            maxlength: 160,
        },
        lastMetaUpdate: {
            // Timestamp of last time metadata was refreshed (by scraper or admin)
            type: Date,
            default: null,
        },
        verifiedAt: {
            // Timestamp when an admin manually verified this tool’s data
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
)

// Generate slug before saving
toolSchema.pre('save', function (next) {
    if (!this.slug) {
        this.slug = slugify(this.name, { lower: true, strict: true })
    }
    next()
})

// Indexes for search optimization
toolSchema.index({ name: 'text', shortDescription: 'text', fullDescription: 'text' })
toolSchema.index({ category: 1, status: 1 })
toolSchema.index({ status: 1, isFeatured: 1 })          // featured active tools
toolSchema.index({ status: 1, isTrending: 1 })          // trending active tools
toolSchema.index({ status: 1, views: -1 })              // most viewed active tools
toolSchema.index({ status: 1, createdAt: -1 })          // latest active tools
// Batch 1 — link-validation pipeline indexes
toolSchema.index({ isActive: 1, status: 1, createdAt: -1 }) // primary list query
toolSchema.index({ linkStatus: 1, lastLinkCheck: 1 })        // stale-link cron query
toolSchema.index({ isActive: 1, linkStatus: 1 })             // purge-dead-tools query

/**
 * ✅ Cascade Delete Hook
 * When a Tool document is deleted (findOneAndDelete / deleteOne),
 * automatically remove all associated Favorites and Reviews to prevent
 * orphaned documents in MongoDB.
 */
toolSchema.post('findOneAndDelete', async function (doc) {
    if (!doc) return
    try {
        const toolId = doc._id
        const [favResult, revResult] = await Promise.all([
            Favorite.deleteMany({ tool: toolId }),
            Review.deleteMany({ tool: toolId }),
        ])
        console.log(`🗑️  Cascade delete for tool ${doc.slug}: removed ${favResult.deletedCount} favorites, ${revResult.deletedCount} reviews`)
    } catch (error) {
        console.error('❌ Cascade delete error for tool:', doc._id, error.message)
    }
})

toolSchema.post('deleteOne', { document: true, query: false }, async function () {
    try {
        const toolId = this._id
        const [favResult, revResult] = await Promise.all([
            Favorite.deleteMany({ tool: toolId }),
            Review.deleteMany({ tool: toolId }),
        ])
        console.log(`🗑️  Cascade delete (deleteOne) tool ${toolId}: ${favResult.deletedCount} favorites, ${revResult.deletedCount} reviews`)
    } catch (error) {
        console.error('❌ Cascade deleteOne error:', error.message)
    }
})

const Tool = mongoose.model('Tool', toolSchema)

export default Tool
