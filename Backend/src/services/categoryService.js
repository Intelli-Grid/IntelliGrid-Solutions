import Category from '../models/Category.js'
import Tool from '../models/Tool.js'
import ApiError from '../utils/ApiError.js'
import { invalidateCache } from '../middleware/cache.js'

/**
 * Category Service - Business logic for categories
 */
class CategoryService {
    /**
     * Get all categories
     */
    async getAllCategories(options = {}) {
        const { isActive = true } = options

        const query = isActive !== undefined ? { isActive } : {}

        const categories = await Category.find(query)
            .sort('order name')
            .lean()

        // Add tool count for each category
        const categoriesWithCount = await Promise.all(
            categories.map(async (category) => {
                const toolCount = await Tool.countDocuments({
                    category: category._id,
                    status: 'active',
                })
                return { ...category, toolCount }
            })
        )

        return categoriesWithCount
    }

    /**
     * Get category by slug
     */
    async getCategoryBySlug(slug) {
        const category = await Category.findOne({ slug }).lean()

        if (!category) {
            throw ApiError.notFound('Category not found')
        }

        // Get tool count
        const toolCount = await Tool.countDocuments({
            category: category._id,
            status: 'active',
        })

        return { ...category, toolCount }
    }

    /**
     * Create category (admin)
     */
    async createCategory(categoryData) {
        const category = await Category.create(categoryData)

        // Invalidate cache
        await invalidateCache('cache:/api/v1/categories*')

        return category
    }

    /**
     * Update category (admin)
     */
    async updateCategory(id, updates) {
        const category = await Category.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        })

        if (!category) {
            throw ApiError.notFound('Category not found')
        }

        // Invalidate cache
        await invalidateCache('cache:/api/v1/categories*')

        return category
    }

    /**
     * Delete category (admin)
     */
    async deleteCategory(id) {
        // Check if category has tools
        const toolCount = await Tool.countDocuments({ category: id })

        if (toolCount > 0) {
            throw ApiError.badRequest(
                `Cannot delete category with ${toolCount} tools. Please reassign tools first.`
            )
        }

        const category = await Category.findByIdAndDelete(id)

        if (!category) {
            throw ApiError.notFound('Category not found')
        }

        // Invalidate cache
        await invalidateCache('cache:/api/v1/categories*')

        return category
    }
}

export default new CategoryService()
