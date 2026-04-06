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
        // Vendor listing tier — only set when isFeatured is true
        featuredTier: {
            type: String,
            enum: ['standard', 'premium', null],
            default: null,
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
        // REMOVED - using top-level only
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

        // ── Batch 3 — Affiliate management fields ──────────────────────────────
        affiliateNetwork: {
            // Which affiliate network the link is registered through
            type: String,
            enum: ['partnerstack', 'impact', 'shareasale', 'cj', 'appsumo', 'direct', 'none'],
            default: 'none',
        },
        commissionType: {
            // Revenue model for this affiliate program
            type: String,
            enum: ['recurring', 'one_time', 'hybrid', 'tiered', 'none'],
            default: 'none',
        },
        commissionRate: {
            // Human-readable rate e.g. "30%", "$25 flat", "20% recurring"
            type: String,
            default: null,
        },
        cookieDuration: {
            // Days the affiliate cookie lasts — 30, 60, 90, 365
            type: Number,
            default: null,
        },
        affiliateStatus: {
            // Current registration status for this tool's affiliate program
            type: String,
            enum: ['not_started', 'pending', 'approved', 'rejected', 'not_available'],
            default: 'not_started',
        },
        affiliateProgramUrl: {
            // URL to the affiliate dashboard login for this specific program
            type: String,
            default: null,
        },
        affiliateLastVerified: {
            // Last time the affiliate link was confirmed working
            type: Date,
            default: null,
        },
        affiliateNotes: {
            // Special terms, restrictions, or application reminders
            type: String,
            default: null,
        },

        // ── Batch 4 — Enrichment source fields ─────────────────────────────────
        isNew: {
            // True when tool was added to IntelliGrid within the last 30 days
            type: Boolean,
            default: false,
        },
        futurepediaUrl: {
            // Source page URL on futurepedia.io
            type: String,
            default: null,
        },
        taaftUrl: {
            // Source page URL on theresanaiforthat.com
            type: String,
            default: null,
        },
        taaftSavesCount: {
            // Community save count from TAAFT — social proof signal
            type: Number,
            default: 0,
        },
        futurepediaRating: {
            // Numeric rating from Futurepedia (e.g. 4.2)
            type: Number,
            default: null,
        },
        pros: {
            // Scraped from Futurepedia — distinct from seoContent.pros (Groq-generated)
            type: [String],
            default: [],
        },
        cons: {
            // Scraped from Futurepedia — distinct from seoContent.cons (Groq-generated)
            type: [String],
            default: [],
        },
        taskTags: {
            // TAAFT task-based tags — SEO gold (e.g. "remove background from image")
            type: [String],
            default: [],
        },

        enrichmentScore: {
            // 0-100 completeness score: shortDesc + fullDesc + pros + cons + useCases + logo + pricing + affiliateUrl
            type: Number,
            default: 0,
        },
        dataSource: {
            // Primary data origin for this tool record
            type: String,
            enum: ['manual', 'futurepedia', 'taaft', 'groq', 'mixed'],
            default: 'manual',
        },
        needsEnrichment: {
            // Flagged by enrichmentCron when data is stale (90+ days without update)
            type: Boolean,
            default: false,
        },
        pricingPageUrl: {
            type: String,
            trim: true,
        },
        targetAudience: {
            // e.g. ['developers', 'marketers', 'designers']
            type: [String],
            default: [],
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

        // ── Programmatic SEO content (Phase 4) ─────────────────────────────────
        // Generated by Groq LLM, cached here to avoid re-generating on every page view.
        // Only populated when the PROGRAMMATIC_SEO feature flag is ON and the
        // admin triggers a generation run (or via the seo-content API route).
        seoContent: {
            faqs: [{
                question: String,
                answer: String,
            }],
            useCases: [{
                title: String,
                description: String,
            }],
            pros: [String],
            cons: [String],
            verdict: String,           // 1-sentence editorial summary
            generatedAt: Date,
        },

        // ── Enrichment Pipeline Fields (Phase 5 — Groq + Scraper) ──────────────

        // Platform availability
        platforms: [{
            type: String,
            enum: ['Web', 'iOS', 'Android', 'Chrome Extension', 'Firefox Extension',
                'API', 'Desktop (Mac)', 'Desktop (Windows)', 'Discord Bot', 'Slack App', 'VS Code Extension'],
        }],

        // Granular task-based tagging (e.g. "write blog posts", "transcribe audio")
        useCaseTags: {
            type: [String],
            default: [],
        },

        // Audience segments (e.g. "Marketers", "Developers", "Students")
        audienceTags: {
            type: [String],
            default: [],
        },

        // Industry verticals (e.g. "Healthcare", "Finance", "Education")
        industryTags: {
            type: [String],
            default: [],
        },

        // Integration ecosystem (e.g. "Zapier", "Notion", "Slack")
        integrationTags: {
            type: [String],
            default: [],
        },

        // Key feature bullet points (3-6 specific, factual feature statements)
        keyFeatures: {
            type: [String],
            default: [],
        },

        // Concrete use-case examples (e.g. "Use this tool to write newsletters 3x faster")
        useCaseExamples: {
            type: [String],
            default: [],
        },

        // Long-form SEO description (150-300 words, Groq-generated, distinct from fullDescription)
        longDescription: {
            type: String,
            default: '',
        },

        // Screenshot media
        screenshotUrl: {
            type: String,
            default: '',
        },
        screenshotTakenAt: {
            type: Date,
            default: null,
        },

        // YouTube demo/tutorial embed URL (https://www.youtube.com/embed/{videoId})
        videoEmbedUrl: {
            type: String,
            default: '',
        },

        // Names of well-known tools this is an alternative to (enables /alternatives/:slug pages)
        alternativeTo: {
            type: [String],
            default: [],
        },

        // Social presence
        twitterHandle: {
            type: String,
            default: '',
            trim: true,
        },

        // Engagement counters (reset weekly by trendingCron)
        weeklyViews: {
            type: Number,
            default: 0,
        },
        weeklyBookmarks: {
            type: Number,
            default: 0,
        },
        totalBookmarks: {
            type: Number,
            default: 0,
        },

        // Computed trending score (weeklyViews + weeklyBookmarks × weight × enrichmentBonus)
        trendingScore: {
            type: Number,
            default: 0,
        },

        // Enrichment pipeline tracking
        enrichmentVersion: {
            // Incremented on each successful enrichment pass
            type: Number,
            default: 0,
        },
        lastEnrichedAt: {
            // Alias/upgrade of lastEnriched — enrichmentCron writes here
            type: Date,
            default: null,
        },
        enrichmentSource: {
            // Which pipeline version generated the data (e.g. "groq-v1", "manual", "pipeline-v2")
            type: String,
            default: '',
        },
        humanVerified: {
            // Admin-confirmed data accuracy — adds 5 bonus points to enrichmentScore
            type: Boolean,
            default: false,
        },
        dataQualityFlags: {
            // Automated quality issue flags (e.g. "missing_screenshot", "website_unreachable")
            type: [String],
            default: [],
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
// Batch 3 — affiliate management indexes
toolSchema.index({ affiliateStatus: 1, affiliateNetwork: 1 }) // admin affiliate batch filter
// Batch 4 — enrichment indexes
toolSchema.index({ isNew: 1, status: 1 })                     // "New This Week" homepage query
toolSchema.index({ enrichmentScore: 1 })                      // enrichment queue sort
toolSchema.index({ needsEnrichment: 1, views: -1 })           // re-enrichment cron priority
// Phase 5 — enrichment pipeline indexes
toolSchema.index({ lastEnrichedAt: 1, enrichmentScore: 1 })   // bulk enrichment priority queue
toolSchema.index({ trendingScore: -1, status: 1 })            // trending sort
toolSchema.index({ useCaseTags: 1 })                          // use-case SEO page queries
toolSchema.index({ audienceTags: 1 })                         // audience filter queries
toolSchema.index({ alternativeTo: 1 })                        // alternatives SEO page queries
toolSchema.index({ pricing: 1, status: 1 })                   // pricing filter on /tools page
toolSchema.index({ hasFreeTier: 1, status: 1 })               // free tools filter
toolSchema.index({ platforms: 1, status: 1 })                 // platform filter
toolSchema.index({ integrationTags: 1 })                      // integration filter
toolSchema.index({ linkStatus: 1, status: 1 })                // dead link audit queries

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
