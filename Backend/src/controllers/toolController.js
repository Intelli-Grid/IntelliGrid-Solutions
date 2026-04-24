import toolService from '../services/toolService.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { getRoleLevel } from '../middleware/rbac.js'

// BUG-07 fix: Whitelist allowed sort fields to prevent field enumeration attacks.
// Passing an arbitrary sort field (e.g. sort=subscription.paypalSubscriptionId) to
// Mongoose allows inferring private data through result ordering differences.
const ALLOWED_SORT_FIELDS = new Set([
    'views', '-views',
    'createdAt', '-createdAt',
    'ratings.average', '-ratings.average',
    'trendingScore', '-trendingScore',
    'name', '-name',
    'favorites', '-favorites',
    'enrichmentScore', '-enrichmentScore',
])

/**
 * Tool Controller - Handle tool-related requests
 */
class ToolController {
    /**
     * Get all tools
     * GET /api/v1/tools
     */
    getAllTools = asyncHandler(async (req, res) => {
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            category: req.query.category,
            pricing: req.query.pricing,
            platform: req.query.platform,      // e.g. "iOS", "API", "Chrome Extension"
            audience: req.query.audience,      // e.g. "Marketers", "Developers"
            isFeatured: req.query.isFeatured,
            isTrending: req.query.isTrending,
            isNew: req.query.isNew,                       // "New This Week" homepage filter
            affiliateStatus: req.query.affiliateStatus,  // Admin batch affiliate filter
            sort: ALLOWED_SORT_FIELDS.has(req.query.sort) ? req.query.sort : '-createdAt',
        }

        const result = await toolService.getAllTools(options)

        res.status(200).json(
            new ApiResponse(200, result, 'Tools retrieved successfully')
        )
    })

    /**
     * Get tool by ID
     * GET /api/v1/tools/:id
     */
    getToolById = asyncHandler(async (req, res) => {
        const tool = await toolService.getToolById(req.params.id)

        res.status(200).json(
            new ApiResponse(200, tool, 'Tool retrieved successfully')
        )
    })

    /**
     * Get tool by slug
     * GET /api/v1/tools/slug/:slug
     */
    getToolBySlug = asyncHandler(async (req, res) => {
        const tool = await toolService.getToolBySlug(req.params.slug)

        res.status(200).json(
            new ApiResponse(200, tool, 'Tool retrieved successfully')
        )
    })

    /**
     * Search tools
     * GET /api/v1/tools/search
     */
    searchTools = asyncHandler(async (req, res) => {
        const { q, page, hitsPerPage, filters } = req.query

        const options = {
            page: parseInt(page) || 0,
            hitsPerPage: parseInt(hitsPerPage) || 20,
            filters: filters || '',
        }

        const result = await toolService.searchTools(q || '', options)

        res.status(200).json(
            new ApiResponse(200, result, 'Search completed successfully')
        )
    })

    /**
     * Get trending tools
     * GET /api/v1/tools/trending
     */
    getTrendingTools = asyncHandler(async (req, res) => {
        const limit = parseInt(req.query.limit) || 10

        const tools = await toolService.getTrendingTools(limit)

        res.status(200).json(
            new ApiResponse(200, tools, 'Trending tools retrieved successfully')
        )
    })

    /**
     * Get featured tools
     * GET /api/v1/tools/featured
     */
    getFeaturedTools = asyncHandler(async (req, res) => {
        const limit = parseInt(req.query.limit) || 10

        const tools = await toolService.getFeaturedTools(limit)

        res.status(200).json(
            new ApiResponse(200, tools, 'Featured tools retrieved successfully')
        )
    })

    /**
     * Create tool (admin)
     * POST /api/v1/tools
     */
    createTool = asyncHandler(async (req, res) => {
        const tool = await toolService.createTool(req.body)

        res.status(201).json(
            new ApiResponse(201, tool, 'Tool created successfully')
        )
    })

    /**
     * Update tool (admin)
     * PUT /api/v1/tools/:id
     */
    updateTool = asyncHandler(async (req, res) => {
        const tool = await toolService.getToolById(req.params.id)

        // Check if user is authorized (any admin-level role OR tool owner)
        const isAdmin = getRoleLevel(req.user.role) >= getRoleLevel('MODERATOR')
        const isOwner = tool.owner && tool.owner.toString() === req.user._id.toString()

        if (!isAdmin && !isOwner) {
            throw new ApiError(403, 'You are not authorized to update this tool')
        }

        const updatedTool = await toolService.updateTool(req.params.id, req.body)

        res.status(200).json(
            new ApiResponse(200, updatedTool, 'Tool updated successfully')
        )
    })

    /**
     * Delete tool (admin)
     * DELETE /api/v1/tools/:id
     */
    deleteTool = asyncHandler(async (req, res) => {
        await toolService.deleteTool(req.params.id)

        res.status(200).json(
            new ApiResponse(200, null, 'Tool deleted successfully')
        )
    })

    /**
     * Increment tool views
     * POST /api/v1/tools/:id/view
     */
    incrementViews = asyncHandler(async (req, res) => {
        await toolService.incrementViews(req.params.id)

        res.status(200).json(
            new ApiResponse(200, null, 'View count incremented')
        )
    })

    /**
     * Get related tools
     * GET /api/v1/tools/:id/related
     */
    getRelatedTools = asyncHandler(async (req, res) => {
        const limit = parseInt(req.query.limit) || 3
        const tools = await toolService.getRelatedTools(req.params.id, limit)

        res.status(200).json(
            new ApiResponse(200, tools, 'Related tools retrieved successfully')
        )
    })
    /**
     * Compare tools
     * GET /api/v1/tools/compare?slugs=tool1,tool2
     */
    compareTools = asyncHandler(async (req, res) => {
        const { slugs } = req.query

        if (!slugs) {
            throw new ApiError(400, 'Slugs query parameter is required')
        }

        const slugArray = slugs.split(',').map(s => s.trim())
        const tools = await toolService.compareTools(slugArray)

        res.status(200).json(
            new ApiResponse(200, tools, 'Comparison data retrieved successfully')
        )
    })
    /**
     * Submit claim request
     * POST /api/v1/tools/:id/claim
     */
    submitClaimRequest = asyncHandler(async (req, res) => {
        const { id } = req.params
        const { email, role, verificationInfo } = req.body

        if (!email || !role) {
            throw new ApiError(400, 'Email and role are required to submit a claim')
        }

        const claim = await toolService.claimTool(
            id,
            { email, role, verificationInfo },
            req.user?._id // Pass user ID if authenticated
        )

        res.status(201).json(
            new ApiResponse(201, claim, 'Claim request submitted successfully. We will review it shortly.')
        )
    })
    /**
     * Get managed tools
     * GET /api/v1/tools/managed
     */
    getManagedTools = asyncHandler(async (req, res) => {
        const tools = await toolService.getToolsByOwner(req.user._id)

        res.status(200).json(
            new ApiResponse(200, tools, 'Managed tools retrieved successfully')
        )
    })

    /**
     * Get "Hot Right Now" tools
     * GET /api/v1/tools/hot
     */
    getHotTools = asyncHandler(async (req, res) => {
        const limit = parseInt(req.query.limit) || 8
        const tools = await toolService.getHotTools(limit)

        res.status(200).json(
            new ApiResponse(200, tools, 'Hot tools retrieved successfully')
        )
    })

    /**
     * Get alternatives to a named tool
     * GET /api/v1/tools/alternatives/:toolName
     */
    getAlternatives = asyncHandler(async (req, res) => {
        const { toolName } = req.params
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            pricing: req.query.pricing,
        }

        const result = await toolService.getAlternatives(toolName, options)

        res.status(200).json(
            new ApiResponse(200, result, `Alternatives to ${toolName} retrieved`)
        )
    })

    /**
     * Get tools by use-case tag
     * GET /api/v1/tools/use-case/:tag
     */
    getToolsByUseCase = asyncHandler(async (req, res) => {
        const { tag } = req.params
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 24,
            pricing: req.query.pricing,
        }

        const result = await toolService.getToolsByUseCase(tag, options)

        res.status(200).json(
            new ApiResponse(200, result, `Tools for use-case "${tag}" retrieved`)
        )
    })

    /**
     * Get tools by industry tag
     * GET /api/v1/tools/industry/:tag
     */
    getToolsByIndustry = asyncHandler(async (req, res) => {
        const { tag } = req.params
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 24,
            pricing: req.query.pricing,
        }

        const result = await toolService.getToolsByIndustry(tag, options)

        res.status(200).json(
            new ApiResponse(200, result, `Tools for industry "${tag}" retrieved`)
        )
    })
}

export default new ToolController()
