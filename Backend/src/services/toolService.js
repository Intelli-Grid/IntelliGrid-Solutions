import mongoose from 'mongoose'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js'
import ApiError from '../utils/ApiError.js'
import ClaimRequest from '../models/ClaimRequest.js'
import emailService from './emailService.js'
import { syncToolToAlgolia, deleteToolFromAlgolia, toolsIndex } from '../config/algolia.js'
import { invalidateCache } from '../middleware/cache.js'

/**
 * Tool Service - Business logic for tools
 */
class ToolService {
    /**
     * Get all tools with pagination, filtering, and sorting
     */
    async getAllTools(options = {}) {
        const {
            page = 1,
            limit = 20,
            category,
            pricing,
            platform,
            audience,
            isFeatured,
            isTrending,
            isNew,
            affiliateStatus,
            status = 'active',
            sort = '-createdAt',
        } = options

        const skip = (page - 1) * limit

        // Build query — always exclude soft-deleted tools and dead links
        const query = { status, isActive: { $ne: false }, linkStatus: { $ne: 'dead' } }

        let resolvedCategoryId = null
        if (category) {
            if (mongoose.Types.ObjectId.isValid(category)) {
                query.category = category
                resolvedCategoryId = category
            } else {
                const categoryDoc = await Category.findOne({
                    $or: [{ slug: category }, { name: category }],
                })

                if (categoryDoc) {
                    query.category = categoryDoc._id
                    resolvedCategoryId = categoryDoc._id.toString()
                } else {
                    return {
                        tools: [],
                        pagination: { page, limit, total: 0, pages: 0 },
                    }
                }
            }
        }

        // ── Category-smart default sort ───────────────────────────────────────
        // Only apply smart sort when the caller hasn't explicitly specified one
        // AND a category filter is active.
        if (sort === '-createdAt' && resolvedCategoryId) {
            const catDoc = await Category.findById(resolvedCategoryId).select('slug name').lean()
            const catSlug = (catDoc?.slug || catDoc?.name || '').toLowerCase()

            if (catSlug.includes('chatbot') || catSlug.includes('assistant')) {
                sort = '-trendingScore'
            } else if (catSlug.includes('image') || catSlug.includes('art') || catSlug.includes('design')) {
                sort = '-ratings.average'
            } else if (catSlug.includes('developer') || catSlug.includes('code') || catSlug.includes('coding')) {
                sort = '-views'
            } else if (catSlug.includes('productivity') || catSlug.includes('workflow')) {
                sort = '-weeklyBookmarks'
            } else if (catSlug.includes('education') || catSlug.includes('learning')) {
                sort = '-ratings.average'
            }
        }
        // ─────────────────────────────────────────────────────────────────────
        if (pricing) query.pricing = pricing
        // platform filter — matches against the platforms array
        if (platform) query.platforms = platform
        // audience filter — matches against audienceTags array
        if (audience) query.audienceTags = audience
        if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true' || isFeatured === true
        if (isTrending !== undefined) query.isTrending = isTrending === 'true' || isTrending === true
        if (isNew !== undefined) query.isNew = isNew === 'true' || isNew === true
        if (affiliateStatus) query.affiliateStatus = affiliateStatus

        // Execute query
        const [tools, total] = await Promise.all([
            Tool.find(query)
                .populate('category', 'name slug')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Tool.countDocuments(query),
        ])

        return {
            tools,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        }
    }

    /**
     * Get tool by ID
     */
    async getToolById(id) {
        const tool = await Tool.findById(id)
            .populate('category', 'name slug')
            .lean()

        if (!tool) {
            throw ApiError.notFound('Tool not found')
        }

        return tool
    }

    /**
     * Get tool by slug
     */
    async getToolBySlug(slug) {
        const tool = await Tool.findOne({ slug, status: 'active', isActive: { $ne: false } })
            .populate('category', 'name slug')
            .lean()

        if (!tool) {
            throw ApiError.notFound('Tool not found')
        }

        return tool
    }

    /**
     * Search tools using Algolia
     */
    async searchTools(query, options = {}) {
        const {
            page = 0,
            hitsPerPage = 20,
            filters = '',
        } = options

        try {
            const result = await toolsIndex.search(query, {
                page,
                hitsPerPage,
                filters,
            })

            return {
                hits: result.hits,
                total: result.nbHits,
                pages: result.nbPages,
                page: result.page,
            }
        } catch (error) {
            console.error('Algolia search error:', error)
            throw ApiError.internal('Search failed')
        }
    }

    /**
     * Get trending tools
     */
    async getTrendingTools(limit = 10) {
        // Prefer trendingScore; fall back to views if not yet computed
        const tools = await Tool.find({ status: 'active', isActive: { $ne: false } })
            .populate('category', 'name slug')
            .sort({ trendingScore: -1, views: -1 })
            .limit(limit)
            .lean()

        return tools
    }

    /**
     * Get featured tools
     */
    async getFeaturedTools(limit = 10) {
        const tools = await Tool.find({ status: 'active', isFeatured: true, isActive: { $ne: false } })
            .populate('category', 'name slug')
            .sort('-ratings.average -views')
            .limit(limit)
            .lean()

        return tools
    }

    /**
     * Get tools by category
     */
    async getToolsByCategory(categorySlug, options = {}) {
        const { page = 1, limit = 20, sort = '-createdAt' } = options

        // Find category
        const category = await Category.findOne({ slug: categorySlug })
        if (!category) {
            throw ApiError.notFound('Category not found')
        }

        const skip = (page - 1) * limit

        const [tools, total] = await Promise.all([
            Tool.find({ category: category._id, status: 'active', isActive: { $ne: false } })
                .populate('category', 'name slug')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Tool.countDocuments({ category: category._id, status: 'active', isActive: { $ne: false } }),
        ])

        return {
            category,
            tools,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        }
    }

    /**
     * Increment view count
     */
    async incrementViews(toolId) {
        await Tool.findByIdAndUpdate(toolId, { $inc: { views: 1 } })
    }

    /**
     * Create tool (admin)
     */
    async createTool(toolData) {
        const tool = await Tool.create(toolData)

        // Non-blocking: don't await Algolia — a slow Algolia response shouldn't
        // fail or delay the API response. Errors are logged only.
        syncToolToAlgolia(tool).catch(err => console.error('Algolia sync error (createTool):', err))

        // Keep Category.toolCount in sync
        if (tool.category) {
            Category.findByIdAndUpdate(tool.category, { $inc: { toolCount: 1 } })
                .catch(err => console.error('Category toolCount increment error:', err))
        }

        // Invalidate cache
        await invalidateCache('cache:/api/v1/tools*')

        return tool
    }

    /**
     * Update tool (admin)
     */
    async updateTool(id, updates) {
        // Capture old category before update so we can fix toolCount if it changed
        const oldTool = await Tool.findById(id).select('category').lean()

        const tool = await Tool.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        })

        if (!tool) {
            throw ApiError.notFound('Tool not found')
        }

        // Non-blocking Algolia sync
        syncToolToAlgolia(tool).catch(err => console.error('Algolia sync error (updateTool):', err))

        // If category changed, adjust toolCount on both old and new categories
        const oldCatId = oldTool?.category?.toString()
        const newCatId = tool.category?.toString()
        if (oldCatId && newCatId && oldCatId !== newCatId) {
            Category.findByIdAndUpdate(oldCatId, { $inc: { toolCount: -1 } })
                .catch(err => console.error('Category toolCount decrement error:', err))
            Category.findByIdAndUpdate(newCatId, { $inc: { toolCount: 1 } })
                .catch(err => console.error('Category toolCount increment error:', err))
        }

        // Invalidate cache
        await invalidateCache('cache:/api/v1/tools*')

        return tool
    }

    /**
     * Delete tool (admin)
     */
    async deleteTool(id) {
        const tool = await Tool.findByIdAndDelete(id)

        if (!tool) {
            throw ApiError.notFound('Tool not found')
        }

        // Non-blocking Algolia delete
        deleteToolFromAlgolia(id).catch(err => console.error('Algolia delete error (deleteTool):', err))

        // Keep Category.toolCount in sync
        if (tool.category) {
            Category.findByIdAndUpdate(tool.category, { $inc: { toolCount: -1 } })
                .catch(err => console.error('Category toolCount decrement error:', err))
        }

        // Invalidate cache
        await invalidateCache('cache:/api/v1/tools*')

        return tool
    }

    /**
     * Get related tools — returns 4 enriched buckets for the tool detail page:
     *   alsoViewed    — same category, sorted by views
     *   pairsWellWith — share integrationTags
     *   alternatives  — share alternativeTo entries
     *   cheaperOptions — same category, Free or Freemium pricing
     */
    async getRelatedTools(toolId, limit = 3) {
        const tool = await Tool.findById(toolId)
            .select('category integrationTags alternativeTo name pricing slug')
            .lean()
        if (!tool) {
            throw ApiError.notFound('Tool not found')
        }

        const baseFilter = { _id: { $ne: tool._id }, status: 'active', isActive: { $ne: false } }

        const [alsoViewed, pairsWellWith, alternatives, cheaperOptions] = await Promise.all([
            // 1. Also viewed — same category
            Tool.find({ ...baseFilter, category: tool.category })
                .populate('category', 'name slug')
                .sort({ views: -1 })
                .limit(limit)
                .lean(),

            // 2. Pairs well with — shared integrationTags
            tool.integrationTags?.length
                ? Tool.find({
                    ...baseFilter,
                    integrationTags: { $in: tool.integrationTags },
                })
                    .populate('category', 'name slug')
                    .sort({ trendingScore: -1, views: -1 })
                    .limit(limit)
                    .lean()
                : Promise.resolve([]),

            // 3. Alternatives — shared alternativeTo entries
            tool.alternativeTo?.length
                ? Tool.find({
                    ...baseFilter,
                    alternativeTo: { $in: tool.alternativeTo },
                })
                    .populate('category', 'name slug')
                    .sort({ ratings: -1 })
                    .limit(limit)
                    .lean()
                : Promise.resolve([]),

            // 4. Cheaper options — same category + free/freemium
            ['Paid', 'Unknown'].includes(tool.pricing)
                ? Tool.find({
                    ...baseFilter,
                    category: tool.category,
                    pricing: { $in: ['Free', 'Freemium'] },
                })
                    .populate('category', 'name slug')
                    .sort({ ratings: -1, views: -1 })
                    .limit(limit)
                    .lean()
                : Promise.resolve([]),
        ])

        return { alsoViewed, pairsWellWith, alternatives, cheaperOptions }
    }
    /**
     * Compare tools
     */
    async compareTools(slugs) {
        if (!slugs || slugs.length < 2) {
            throw ApiError.badRequest('At least two tools are required for comparison')
        }

        const tools = await Tool.find({
            slug: { $in: slugs },
            status: 'active',
            isActive: { $ne: false },
        })
            .populate('category', 'name slug')
            .lean()

        // Create a map to return tools in the requested order if needed, 
        // or just return the list found.
        return tools
    }

    /**
     * Claim tool
     */
    async claimTool(toolId, claimData, userId = null) {
        const tool = await Tool.findById(toolId)
        if (!tool) {
            throw ApiError.notFound('Tool not found')
        }

        // Check if already claimed by this email
        const existingClaim = await ClaimRequest.findOne({
            tool: toolId,
            email: claimData.email,
        })

        if (existingClaim) {
            throw ApiError.badRequest('You have already submitted a claim for this tool.')
        }

        const claim = await ClaimRequest.create({
            tool: toolId,
            user: userId,
            ...claimData,
        })

        // Send email
        emailService.sendClaimVerificationEmail(claim, tool).catch(console.error)

        return claim
    }
    /**
     * Get tools by owner
     */
    async getToolsByOwner(userId) {
        const tools = await Tool.find({ owner: userId })
            .populate('category', 'name slug')
            .sort('-createdAt')
            .lean()

        return tools
    }

    /**
     * Get "Hot Right Now" — top 8 tools by trendingScore computed in last 48h.
     * Used for the homepage hot strip and /api/v1/tools/hot endpoint.
     */
    async getHotTools(limit = 8) {
        const tools = await Tool.find({ status: 'active', isActive: { $ne: false }, trendingScore: { $gt: 0 } })
            .populate('category', 'name slug')
            .sort({ trendingScore: -1 })
            .limit(limit)
            .select('name slug shortDescription logo pricing trendingScore weeklyViews isFeatured isNew isTrending ratings category')
            .lean()

        // If trendingScore is not yet populated for any tools, fall back to views-based
        if (tools.length < 4) {
            return Tool.find({ status: 'active', isActive: { $ne: false } })
                .populate('category', 'name slug')
                .sort({ views: -1 })
                .limit(limit)
                .select('name slug shortDescription logo pricing views isFeatured isNew isTrending ratings category')
                .lean()
        }

        return tools
    }

    /**
     * Get alternatives to a named tool
     * GET /api/v1/tools/alternatives/:toolName
     * Queries tools where alternativeTo array contains the tool name (case-insensitive).
     */
    async getAlternatives(toolName, options = {}) {
        const { limit = 20, page = 1, pricing } = options
        const skip = (page - 1) * limit

        // Case-insensitive regex match against the alternativeTo array
        const nameRegex = new RegExp(toolName.replace(/[-_]/g, '[ -_]'), 'i')
        const query = {
            status: 'active',
            isActive: { $ne: false },
            linkStatus: { $ne: 'dead' },
            alternativeTo: { $regex: nameRegex },
        }
        if (pricing) query.pricing = pricing

        const [tools, total] = await Promise.all([
            Tool.find(query)
                .populate('category', 'name slug')
                .sort({ enrichmentScore: -1, 'ratings.average': -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Tool.countDocuments(query),
        ])

        return {
            targetTool: toolName,
            tools,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        }
    }

    /**
     * Get tools by use-case tag
     * GET /api/v1/tools/use-case/:tag
     */
    async getToolsByUseCase(tag, options = {}) {
        const { limit = 24, page = 1, pricing } = options
        const skip = (page - 1) * limit

        const tagRegex = new RegExp(tag.replace(/-/g, '[ -]'), 'i')
        const query = {
            status: 'active',
            isActive: { $ne: false },
            linkStatus: { $ne: 'dead' },
            useCaseTags: { $regex: tagRegex },
        }
        if (pricing) query.pricing = pricing

        const [tools, total] = await Promise.all([
            Tool.find(query)
                .populate('category', 'name slug')
                .sort({ enrichmentScore: -1, 'ratings.average': -1, views: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Tool.countDocuments(query),
        ])

        return {
            tag,
            tools,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        }
    }

    /**
     * Get tools by industry tag
     * GET /api/v1/tools/industry/:tag
     */
    async getToolsByIndustry(tag, options = {}) {
        const { limit = 24, page = 1, pricing } = options
        const skip = (page - 1) * limit

        const tagRegex = new RegExp(tag.replace(/-/g, '[ -]'), 'i')
        const query = {
            status: 'active',
            isActive: { $ne: false },
            linkStatus: { $ne: 'dead' },
            industryTags: { $regex: tagRegex },
        }
        if (pricing) query.pricing = pricing

        const [tools, total] = await Promise.all([
            Tool.find(query)
                .populate('category', 'name slug')
                .sort({ enrichmentScore: -1, 'ratings.average': -1, views: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Tool.countDocuments(query),
        ])

        return {
            tag,
            tools,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        }
    }

    /**
     * Submit a claim request for a tool
     * @param {string} toolId
     * @param {object} claimData
     * @param {string} userId (optional)
     */
    async claimTool(toolId, claimData, userId = null) {
        const { email, role, verificationInfo } = claimData

        const tool = await Tool.findById(toolId)
        if (!tool) {
            throw ApiError.notFound('Tool not found')
        }

        if (tool.isVerified || tool.claimedBy) {
            throw ApiError.badRequest('This tool has already been claimed')
        }

        // Check for existing pending claim
        const existingClaim = await ClaimRequest.findOne({
            tool: toolId,
            email: email.toLowerCase(),
            status: 'pending'
        })
        
        if (existingClaim) {
            throw ApiError.badRequest('A pending claim request from this email already exists')
        }

        const claim = await ClaimRequest.create({
            tool: toolId,
            user: userId,
            email: email.toLowerCase(),
            role,
            verificationInfo,
            status: 'pending'
        })

        // Notify admins about new claim request
        try {
            await emailService.sendAdminNotification(
                'New Tool Claim Request',
                `User ${email} (${role}) requested to claim ${tool.name}. Verification info: ${verificationInfo || 'None'}`
            )
        } catch (e) {
            console.error('Failed to notify admins of claim request:', e)
        }

        return claim
    }
}

export default new ToolService()
