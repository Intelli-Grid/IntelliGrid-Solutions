import mongoose from 'mongoose'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js'
import ApiError from '../utils/ApiError.js'
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
        console.log('DEBUG: getAllTools options:', JSON.stringify(options))
        const {
            page = 1,
            limit = 20,
            category,
            pricing,
            isFeatured,
            isTrending,
            status = 'active',
            sort = '-createdAt',
        } = options

        const skip = (page - 1) * limit

        // Build query
        const query = { status }

        if (category) {
            if (mongoose.Types.ObjectId.isValid(category)) {
                query.category = category
            } else {
                const categoryDoc = await Category.findOne({
                    $or: [{ slug: category }, { name: category }],
                })

                if (categoryDoc) {
                    query.category = categoryDoc._id
                } else {
                    return {
                        tools: [],
                        pagination: {
                            page,
                            limit,
                            total: 0,
                            pages: 0,
                        },
                    }
                }
            }
        }
        if (pricing) query.pricing = pricing
        if (isFeatured !== undefined) query.isFeatured = isFeatured
        if (isTrending !== undefined) query.isTrending = isTrending

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
        const tool = await Tool.findOne({ slug, status: 'active' })
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
        // Get tools sorted by views (most popular)
        const tools = await Tool.find({ status: 'active' })
            .populate('category', 'name slug')
            .sort('-views -ratings.average')
            .limit(limit)
            .lean()

        return tools
    }

    /**
     * Get featured tools
     */
    async getFeaturedTools(limit = 10) {
        const tools = await Tool.find({ status: 'active', isFeatured: true })
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
            Tool.find({ category: category._id, status: 'active' })
                .populate('category', 'name slug')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Tool.countDocuments({ category: category._id, status: 'active' }),
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

        // Sync to Algolia
        await syncToolToAlgolia(tool)

        // Invalidate cache
        await invalidateCache('cache:/api/v1/tools*')

        return tool
    }

    /**
     * Update tool (admin)
     */
    async updateTool(id, updates) {
        const tool = await Tool.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        })

        if (!tool) {
            throw ApiError.notFound('Tool not found')
        }

        // Sync to Algolia
        await syncToolToAlgolia(tool)

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

        // Remove from Algolia
        await deleteToolFromAlgolia(id)

        // Invalidate cache
        await invalidateCache('cache:/api/v1/tools*')

        return tool
    }
}

export default new ToolService()
