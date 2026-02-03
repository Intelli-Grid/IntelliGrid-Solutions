import express from 'express'
import categoryService from '../services/categoryService.js'
import toolService from '../services/toolService.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { validationRules, validate } from '../middleware/validate.js'
import cacheMiddleware from '../middleware/cache.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = express.Router()

// Get all categories
router.get(
    '/',
    cacheMiddleware(1800), // Cache for 30 minutes
    asyncHandler(async (req, res) => {
        const categories = await categoryService.getAllCategories()
        res.status(200).json(
            new ApiResponse(200, categories, 'Categories retrieved successfully')
        )
    })
)

// Get category by slug
router.get(
    '/:slug',
    cacheMiddleware(1800),
    asyncHandler(async (req, res) => {
        const category = await categoryService.getCategoryBySlug(req.params.slug)
        res.status(200).json(
            new ApiResponse(200, category, 'Category retrieved successfully')
        )
    })
)

// Get tools in category
router.get(
    '/:slug/tools',
    cacheMiddleware(600),
    asyncHandler(async (req, res) => {
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            sort: req.query.sort || '-createdAt',
        }

        const result = await toolService.getToolsByCategory(req.params.slug, options)
        res.status(200).json(
            new ApiResponse(200, result, 'Tools retrieved successfully')
        )
    })
)

// Admin routes
router.post(
    '/',
    requireAuth,
    requireAdmin,
    validationRules.createCategory(),
    validate,
    asyncHandler(async (req, res) => {
        const category = await categoryService.createCategory(req.body)
        res.status(201).json(
            new ApiResponse(201, category, 'Category created successfully')
        )
    })
)

router.put(
    '/:id',
    requireAuth,
    requireAdmin,
    validationRules.objectId('id'),
    validate,
    asyncHandler(async (req, res) => {
        const category = await categoryService.updateCategory(req.params.id, req.body)
        res.status(200).json(
            new ApiResponse(200, category, 'Category updated successfully')
        )
    })
)

router.delete(
    '/:id',
    requireAuth,
    requireAdmin,
    validationRules.objectId('id'),
    validate,
    asyncHandler(async (req, res) => {
        await categoryService.deleteCategory(req.params.id)
        res.status(200).json(
            new ApiResponse(200, null, 'Category deleted successfully')
        )
    })
)

export default router
