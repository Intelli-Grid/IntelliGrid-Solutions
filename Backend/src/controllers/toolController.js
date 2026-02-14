import toolService from '../services/toolService.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'

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
            isFeatured: req.query.isFeatured,
            isTrending: req.query.isTrending,
            sort: req.query.sort || '-createdAt',
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
        const tool = await toolService.updateTool(req.params.id, req.body)

        res.status(200).json(
            new ApiResponse(200, tool, 'Tool updated successfully')
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
}

export default new ToolController()
