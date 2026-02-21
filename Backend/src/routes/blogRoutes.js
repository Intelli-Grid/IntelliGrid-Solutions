import express from 'express'
import BlogPost from '../models/BlogPost.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import asyncHandler from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'

const router = express.Router()

// ─── Fixed/Admin routes FIRST (before /:slug) ────────────────────────────────

/**
 * @route   GET /api/v1/blog/admin/all (admin)
 * @desc    Get all posts including drafts
 * @access  Admin
 * NOTE: Must come BEFORE /:slug to avoid Express treating "admin" as a slug.
 */
router.get('/admin/all', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query
    const query = status && status !== 'all' ? { status } : {}
    const posts = await BlogPost.find(query)
        .populate('author', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .select('-content')
        .lean()
    const total = await BlogPost.countDocuments(query)
    res.json({
        success: true,
        posts,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    })
}))

/**
 * @route   GET /api/v1/blog
 * @desc    Get published blog posts (paginated)
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
    const { page = 1, limit = 12, category, tag } = req.query
    const query = { status: 'published' }
    if (category) query.category = category
    if (tag) query.tags = tag

    const posts = await BlogPost.find(query)
        .populate('author', 'firstName lastName imageUrl')
        .sort({ publishedAt: -1 })
        .skip((page - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .select('-content') // Don't send full content in listing
        .lean()

    const total = await BlogPost.countDocuments(query)
    const categories = await BlogPost.distinct('category', { status: 'published' })

    res.json({
        success: true,
        posts,
        categories,
        pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
        },
    })
}))

/**
 * @route   POST /api/v1/blog (admin)
 * @desc    Create a new blog post
 * @access  Admin
 */
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const { title, slug, excerpt, content, category, tags, featuredImage, status } = req.body
    if (!title || !content) throw ApiError.badRequest('title and content are required')

    const autoSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now()

    const post = await BlogPost.create({
        title,
        slug: autoSlug,
        excerpt,
        content,
        category,
        tags: tags || [],
        featuredImage,
        author: req.user._id,
        status: status || 'draft',
        publishedAt: status === 'published' ? new Date() : undefined,
    })

    res.status(201).json({ success: true, post })
}))

// ─── Parameterised routes LAST ────────────────────────────────────────────────

/**
 * @route   GET /api/v1/blog/:slug
 * @desc    Get single blog post by slug
 * @access  Public
 */
router.get('/:slug', asyncHandler(async (req, res) => {
    const post = await BlogPost.findOne({ slug: req.params.slug, status: 'published' })
        .populate('author', 'firstName lastName imageUrl')
        .lean()

    if (!post) throw ApiError.notFound('Blog post not found')

    // Increment view count
    await BlogPost.findByIdAndUpdate(post._id, { $inc: { views: 1 } })

    // Fetch related posts (same category, exclude current)
    const related = await BlogPost.find({
        status: 'published',
        category: post.category,
        _id: { $ne: post._id },
    })
        .select('title slug excerpt featuredImage publishedAt category')
        .limit(3)
        .lean()

    res.json({ success: true, post, related })
}))

/**
 * @route   PUT /api/v1/blog/:id (admin)
 * @desc    Update a blog post
 * @access  Admin
 */
router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const update = { ...req.body }
    if (update.status === 'published') {
        update.publishedAt = update.publishedAt || new Date()
    }
    const post = await BlogPost.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
    if (!post) throw ApiError.notFound('Blog post not found')
    res.json({ success: true, post })
}))

/**
 * @route   DELETE /api/v1/blog/:id (admin)
 * @desc    Delete a blog post
 * @access  Admin
 */
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const post = await BlogPost.findByIdAndDelete(req.params.id)
    if (!post) throw ApiError.notFound('Blog post not found')
    res.json({ success: true, message: 'Blog post deleted' })
}))

export default router
