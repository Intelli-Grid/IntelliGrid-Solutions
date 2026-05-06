/**
 * Stack.js — Workflow Stacks model (v2.5.0)
 *
 * A Stack is a named, ordered collection of AI tools representing a
 * complete workflow (e.g. "YouTube Creator Pipeline", "Solo Dev Stack").
 *
 * Schema decisions:
 *  - tools[] is ordered — index 0 is the first step in the workflow.
 *  - Each tool entry carries a optional `note` so creators can explain
 *    why they chose that specific tool for that step.
 *  - isPublic: private stacks are only visible to their owner.
 *  - views / saves / clones: lightweight social proof metrics.
 *  - slug: URL-safe handle auto-derived from name + owner at save time.
 *  - tags: free-form, searchable labels (max 10).
 */
import mongoose from 'mongoose'

const stackToolSchema = new mongoose.Schema(
    {
        tool: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tool',
            required: true,
        },
        // Short human note about WHY this tool is in this step (max 200 chars)
        note: {
            type: String,
            trim: true,
            maxlength: [200, 'Tool note must be 200 characters or less'],
            default: '',
        },
        // Step order (0-indexed). Stored explicitly so re-ordering is safe.
        order: {
            type: Number,
            default: 0,
        },
    },
    { _id: false }
)

const stackSchema = new mongoose.Schema(
    {
        // Identity
        name: {
            type: String,
            required: [true, 'Stack name is required'],
            trim: true,
            maxlength: [80, 'Stack name must be 80 characters or less'],
        },
        slug: {
            type: String,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description must be 500 characters or less'],
            default: '',
        },

        // Ownership
        // clerkId is the Clerk user ID — stored to avoid User model lookup on public reads
        clerkId: {
            type: String,
            required: true,
            index: true,
        },
        // Optional denormalised display name so public cards don't need a User join
        creatorName: {
            type: String,
            default: '',
        },
        creatorAvatar: {
            type: String,
            default: '',
        },

        // Tools in workflow order
        tools: {
            type: [stackToolSchema],
            validate: [
                {
                    validator: function (arr) { return arr.length >= 1 },
                    message: 'A stack must contain at least 1 tool',
                },
                {
                    validator: function (arr) { return arr.length <= 20 },
                    message: 'A stack can contain at most 20 tools',
                },
            ],
        },

        // Use-case / category label (freeform, e.g. "Content Creation", "Dev")
        useCase: {
            type: String,
            trim: true,
            maxlength: [60, 'Use case label must be 60 characters or less'],
            default: '',
        },

        // Tags for discovery (max 10)
        tags: {
            type: [String],
            default: [],
            validate: {
                validator: function (arr) { return arr.length <= 10 },
                message: 'A stack can have at most 10 tags',
            },
        },

        // Visibility
        isPublic: {
            type: Boolean,
            default: true,
        },

        // Social proof counters
        views: { type: Number, default: 0 },
        saves: { type: Number, default: 0 },   // "bookmarked" by other users
        clones: { type: Number, default: 0 },  // "forked" to own account

        // Editorial highlight — set by admin only
        isFeatured: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
)

// ─────────────────────────────────────────────────────────────────────────────
// Auto-generate slug before every save
// Format: <sanitised-name>-<short-clerkId-suffix>
// The suffix prevents collisions between two stacks with the same name by
// different users without needing a DB round-trip uniqueness check.
// ─────────────────────────────────────────────────────────────────────────────
stackSchema.pre('save', function (next) {
    if (!this.isModified('name') && this.slug) return next()
    const base = this.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')   // strip non-alphanumeric (except space/dash)
        .replace(/\s+/g, '-')            // spaces → dashes
        .replace(/-+/g, '-')             // collapse multiple dashes
        .slice(0, 50)
    // Take last 6 chars of clerkId as collision-prevention suffix
    const suffix = (this.clerkId || '').slice(-6)
    this.slug = suffix ? `${base}-${suffix}` : base
    next()
})

// ─────────────────────────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────────────────────────

// Public discovery feed — most viewed public stacks first
stackSchema.index({ isPublic: 1, views: -1 })

// Featured stacks pinned to top of public feed
stackSchema.index({ isFeatured: -1, isPublic: 1, createdAt: -1 })

// User's own stacks — newest first
stackSchema.index({ clerkId: 1, createdAt: -1 })

// Tag browsing
stackSchema.index({ tags: 1, isPublic: 1 })

const Stack = mongoose.model('Stack', stackSchema)
export default Stack
