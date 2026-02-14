import express from 'express'
import toolController from '../controllers/toolController.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { validationRules, validate } from '../middleware/validate.js'
import cacheMiddleware from '../middleware/cache.js'

const router = express.Router()

// Public routes
router.get(
    '/',
    cacheMiddleware(600), // Cache for 10 minutes
    toolController.getAllTools
)

router.get(
    '/trending',
    cacheMiddleware(300), // Cache for 5 minutes
    toolController.getTrendingTools
)

router.get(
    '/featured',
    cacheMiddleware(300),
    toolController.getFeaturedTools
)

router.get(
    '/search',
    toolController.searchTools
)

router.get(
    '/slug/:slug',
    cacheMiddleware(600),
    toolController.getToolBySlug
)

router.get(
    '/:id',
    validationRules.objectId('id'),
    validate,
    cacheMiddleware(600),
    toolController.getToolById
)

router.post(
    '/:id/view',
    validationRules.objectId('id'),
    validate,
    toolController.incrementViews
)

// Admin routes
router.post(
    '/',
    requireAuth,
    requireAdmin,
    validationRules.createTool(),
    validate,
    toolController.createTool
)

router.put(
    '/:id',
    requireAuth,
    requireAdmin,
    validationRules.objectId('id'),
    validate,
    toolController.updateTool
)

router.delete(
    '/:id',
    requireAuth,
    requireAdmin,
    validationRules.objectId('id'),
    validate,
    toolController.deleteTool
)

export default router
