/**
 * stackRoutes.js — Workflow Stacks API (v2.5.0)
 *
 * Public endpoints (no auth):
 *   GET  /api/v1/stacks             — paginated public stacks, sorted by views desc
 *   GET  /api/v1/stacks/featured    — isFeatured=true public stacks (homepage section)
 *   GET  /api/v1/stacks/:slug       — single public stack detail
 *   POST /api/v1/stacks/:id/view    — increment view counter (idempotent-ish, rate-limited by IP)
 *
 * Authenticated endpoints (Clerk JWT):
 *   GET    /api/v1/stacks/me         — current user's stacks (own + private)
 *   POST   /api/v1/stacks            — create stack
 *   PUT    /api/v1/stacks/:id        — update own stack
 *   DELETE /api/v1/stacks/:id        — delete own stack
 *   POST   /api/v1/stacks/:id/save   — toggle save (bookmark) on another user's stack
 *   POST   /api/v1/stacks/:id/clone  — fork stack to own account
 *
 * Admin endpoints (require admin role):
 *   PATCH  /api/v1/stacks/:id/feature   — toggle isFeatured
 *   DELETE /api/v1/stacks/:id/admin     — hard-delete any stack
 */
import express from 'express'
import Stack from '../models/Stack.js'
import Tool from '../models/Tool.js'
import { authenticate } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'

const router = express.Router()

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve and validate tool IDs supplied by the client.
 * Returns the normalised tools array ready for insertion into the Stack doc.
 *
 * @param {Array<{tool: string, note?: string, order?: number}>} rawTools
 * @returns {Promise<Array>}
 */
async function resolveTools(rawTools) {
    if (!Array.isArray(rawTools) || rawTools.length === 0) {
        throw Object.assign(new Error('A stack must contain at least 1 tool'), { statusCode: 400 })
    }
    if (rawTools.length > 20) {
        throw Object.assign(new Error('A stack can contain at most 20 tools'), { statusCode: 400 })
    }

    const ids = rawTools.map(t => t.tool || t)
    const found = await Tool.find({ _id: { $in: ids }, status: 'active' }).select('_id').lean()
    const validSet = new Set(found.map(t => t._id.toString()))

    const invalid = ids.filter(id => !validSet.has(id.toString()))
    if (invalid.length > 0) {
        throw Object.assign(
            new Error(`Invalid or inactive tool IDs: ${invalid.join(', ')}`),
            { statusCode: 422 }
        )
    }

    return rawTools.map((entry, idx) => ({
        tool: entry.tool || entry,
        note: (entry.note || '').trim().slice(0, 200),
        order: entry.order ?? idx,
    }))
}

/** Lightweight populate projection for list views */
const TOOL_LIST_PROJECT = 'name slug logo shortDescription pricing'
/** Full populate projection for detail view */
const TOOL_DETAIL_PROJECT = 'name slug logo shortDescription pricing ratings tags category'

// ─────────────────────────────────────────────────────────────────────────────
// Public Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/stacks
 * Paginated public stacks.
 * Query params: page, limit (max 50), tag, useCase
 */
router.get('/', async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
        const skip  = (page - 1) * limit

        const filter = { isPublic: true }
        if (req.query.tag)     filter.tags    = req.query.tag
        if (req.query.useCase) filter.useCase = new RegExp(req.query.useCase, 'i')

        const [stacks, total] = await Promise.all([
            Stack.find(filter)
                .sort({ isFeatured: -1, views: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('tools.tool', TOOL_LIST_PROJECT)
                .lean(),
            Stack.countDocuments(filter),
        ])

        return res.json({
            success: true,
            stacks,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit,
            },
        })
    } catch (err) {
        console.error('[Stacks] GET / error:', err.message)
        return res.status(err.statusCode || 500).json({ success: false, message: err.message })
    }
})

/**
 * GET /api/v1/stacks/featured
 * Returns isFeatured stacks for the homepage section (max 6, cached-friendly).
 */
router.get('/featured', async (req, res) => {
    try {
        const stacks = await Stack.find({ isPublic: true, isFeatured: true })
            .sort({ views: -1, createdAt: -1 })
            .limit(6)
            .populate('tools.tool', TOOL_LIST_PROJECT)
            .lean()

        return res.json({ success: true, stacks })
    } catch (err) {
        console.error('[Stacks] GET /featured error:', err.message)
        return res.status(500).json({ success: false, message: err.message })
    }
})

/**
 * GET /api/v1/stacks/me
 * Returns the authenticated user's own stacks (both public and private).
 * Must be placed before /:slug to prevent route shadowing.
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page) || 1)
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
        const skip  = (page - 1) * limit

        const filter = { clerkId: req.user.clerkId }

        const [stacks, total] = await Promise.all([
            Stack.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('tools.tool', TOOL_LIST_PROJECT)
                .lean(),
            Stack.countDocuments(filter),
        ])

        return res.json({
            success: true,
            stacks,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit,
            },
        })
    } catch (err) {
        console.error('[Stacks] GET /me error:', err.message)
        return res.status(500).json({ success: false, message: err.message })
    }
})

/**
 * GET /api/v1/stacks/:slug
 * Single stack detail — requires isPublic unless the requester is the owner.
 */
router.get('/:slug', async (req, res) => {
    try {
        const stack = await Stack.findOne({ slug: req.params.slug })
            .populate('tools.tool', TOOL_DETAIL_PROJECT)
            .lean()

        if (!stack) {
            return res.status(404).json({ success: false, message: 'Stack not found' })
        }
        if (!stack.isPublic) {
            // Allow owner — check Clerk header (optional auth)
            const clerkId = req.headers['x-clerk-user-id'] || req.query.clerkId
            if (!clerkId || clerkId !== stack.clerkId) {
                return res.status(403).json({ success: false, message: 'This stack is private' })
            }
        }

        return res.json({ success: true, stack })
    } catch (err) {
        console.error('[Stacks] GET /:slug error:', err.message)
        return res.status(500).json({ success: false, message: err.message })
    }
})

/**
 * POST /api/v1/stacks/:id/view
 * Increment view counter. No auth required — lightweight public signal.
 */
router.post('/:id/view', async (req, res) => {
    try {
        await Stack.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } })
        return res.json({ success: true })
    } catch (err) {
        // Non-critical — fail silently to the client
        return res.json({ success: true })
    }
})

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/stacks
 * Create a new stack.
 * Body: { name, description, tools, useCase, tags, isPublic }
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            name,
            description = '',
            tools: rawTools = [],
            useCase = '',
            tags = [],
            isPublic = true,
        } = req.body

        if (!name?.trim()) {
            return res.status(400).json({ success: false, message: 'Stack name is required' })
        }

        const tools = await resolveTools(rawTools)

        const stack = await Stack.create({
            name:         name.trim(),
            description:  description.trim().slice(0, 500),
            clerkId:      req.user.clerkId,
            creatorName:  req.user.name || '',
            creatorAvatar: req.user.imageUrl || '',
            tools,
            useCase:      useCase.trim().slice(0, 60),
            tags:         (Array.isArray(tags) ? tags : []).slice(0, 10).map(t => String(t).trim()),
            isPublic:     Boolean(isPublic),
        })

        return res.status(201).json({ success: true, stack })
    } catch (err) {
        console.error('[Stacks] POST / error:', err.message)
        return res.status(err.statusCode || 500).json({ success: false, message: err.message })
    }
})

/**
 * PUT /api/v1/stacks/:id
 * Update own stack. Only the owner can update.
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const stack = await Stack.findById(req.params.id)
        if (!stack) {
            return res.status(404).json({ success: false, message: 'Stack not found' })
        }
        if (stack.clerkId !== req.user.clerkId) {
            return res.status(403).json({ success: false, message: 'You can only edit your own stacks' })
        }

        const {
            name,
            description,
            tools: rawTools,
            useCase,
            tags,
            isPublic,
        } = req.body

        if (name !== undefined)        stack.name        = name.trim()
        if (description !== undefined) stack.description = description.trim().slice(0, 500)
        if (useCase !== undefined)     stack.useCase     = useCase.trim().slice(0, 60)
        if (tags !== undefined)        stack.tags        = (Array.isArray(tags) ? tags : []).slice(0, 10).map(t => String(t).trim())
        if (isPublic !== undefined)    stack.isPublic    = Boolean(isPublic)

        if (rawTools !== undefined) {
            stack.tools = await resolveTools(rawTools)
        }

        await stack.save()

        return res.json({ success: true, stack })
    } catch (err) {
        console.error('[Stacks] PUT /:id error:', err.message)
        return res.status(err.statusCode || 500).json({ success: false, message: err.message })
    }
})

/**
 * DELETE /api/v1/stacks/:id
 * Delete own stack.
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const stack = await Stack.findById(req.params.id)
        if (!stack) {
            return res.status(404).json({ success: false, message: 'Stack not found' })
        }
        if (stack.clerkId !== req.user.clerkId) {
            return res.status(403).json({ success: false, message: 'You can only delete your own stacks' })
        }

        await stack.deleteOne()
        return res.json({ success: true, message: 'Stack deleted' })
    } catch (err) {
        console.error('[Stacks] DELETE /:id error:', err.message)
        return res.status(500).json({ success: false, message: err.message })
    }
})

/**
 * POST /api/v1/stacks/:id/save
 * Toggle save (bookmark) on another user's public stack.
 * Returns { saved: true|false, saves: <new count> }
 *
 * NOTE: We store saved stacks on the User model's savedStacks[] array.
 * If that field does not exist yet, we increment/decrement the counter
 * directly on Stack. A future migration can add per-user saved lists.
 */
router.post('/:id/save', authenticate, async (req, res) => {
    try {
        const stack = await Stack.findById(req.params.id)
        if (!stack) {
            return res.status(404).json({ success: false, message: 'Stack not found' })
        }

        // Simple toggle on the saves counter — per-user list deferred to next iteration
        const User = (await import('../models/User.js')).default
        const user = await User.findOne({ clerkId: req.user.clerkId })
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' })
        }

        const bookmarkedStacks = user.bookmarkedStacks || []
        const alreadySaved = bookmarkedStacks.some(id => id.toString() === stack._id.toString())

        if (alreadySaved) {
            user.bookmarkedStacks = bookmarkedStacks.filter(id => id.toString() !== stack._id.toString())
            stack.saves = Math.max(0, stack.saves - 1)
        } else {
            user.bookmarkedStacks = [...bookmarkedStacks, stack._id]
            stack.saves += 1
        }

        await Promise.all([user.save(), stack.save()])

        return res.json({ success: true, saved: !alreadySaved, saves: stack.saves })
    } catch (err) {
        console.error('[Stacks] POST /:id/save error:', err.message)
        return res.status(500).json({ success: false, message: err.message })
    }
})

/**
 * POST /api/v1/stacks/:id/clone
 * Fork another user's public stack to the current user's account.
 */
router.post('/:id/clone', authenticate, async (req, res) => {
    try {
        const source = await Stack.findById(req.params.id)
        if (!source || !source.isPublic) {
            return res.status(404).json({ success: false, message: 'Stack not found or private' })
        }

        const cloned = await Stack.create({
            name:         `${source.name} (clone)`,
            description:  source.description,
            clerkId:      req.user.clerkId,
            creatorName:  req.user.name || '',
            creatorAvatar: req.user.imageUrl || '',
            tools:        source.tools,
            useCase:      source.useCase,
            tags:         source.tags,
            isPublic:     false,   // clones are private by default
        })

        // Increment clone counter on the original
        await Stack.findByIdAndUpdate(source._id, { $inc: { clones: 1 } })

        return res.status(201).json({ success: true, stack: cloned })
    } catch (err) {
        console.error('[Stacks] POST /:id/clone error:', err.message)
        return res.status(err.statusCode || 500).json({ success: false, message: err.message })
    }
})

// ─────────────────────────────────────────────────────────────────────────────
// Admin Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/stacks/:id/feature
 * Toggle isFeatured. Admin only.
 */
router.patch('/:id/feature', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const stack = await Stack.findById(req.params.id)
        if (!stack) {
            return res.status(404).json({ success: false, message: 'Stack not found' })
        }

        stack.isFeatured = !stack.isFeatured
        await stack.save()

        return res.json({
            success: true,
            isFeatured: stack.isFeatured,
            message: `Stack ${stack.isFeatured ? 'featured' : 'unfeatured'} successfully`,
        })
    } catch (err) {
        console.error('[Stacks] PATCH /:id/feature error:', err.message)
        return res.status(500).json({ success: false, message: err.message })
    }
})

/**
 * DELETE /api/v1/stacks/:id/admin
 * Hard delete any stack. Admin only.
 */
router.delete('/:id/admin', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const stack = await Stack.findByIdAndDelete(req.params.id)
        if (!stack) {
            return res.status(404).json({ success: false, message: 'Stack not found' })
        }
        return res.json({ success: true, message: `Stack "${stack.name}" deleted by admin` })
    } catch (err) {
        console.error('[Stacks] DELETE /:id/admin error:', err.message)
        return res.status(500).json({ success: false, message: err.message })
    }
})

export default router
