import express from 'express'
import reviewController from '../controllers/reviewController.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { validationRules, validate } from '../middleware/validate.js'

const router = express.Router()

// Public route - get reviews for a tool
router.get(
    '/tool/:toolId',
    validationRules.objectId('toolId'),
    validate,
    reviewController.getReviews
)

// Protected routes - require authentication
router.post(
    '/',
    requireAuth,
    validationRules.createReview(),
    validate,
    reviewController.createReview
)

router.put(
    '/:id',
    requireAuth,
    validationRules.objectId('id'),
    validate,
    reviewController.updateReview
)

router.delete(
    '/:id',
    requireAuth,
    validationRules.objectId('id'),
    validate,
    reviewController.deleteReview
)

router.post(
    '/:id/helpful',
    requireAuth,
    validationRules.objectId('id'),
    validate,
    reviewController.markHelpful
)

// Admin routes
router.get(
    '/pending',
    requireAuth,
    requireAdmin,
    reviewController.getPendingReviews
)

router.put(
    '/:id/moderate',
    requireAuth,
    requireAdmin,
    validationRules.objectId('id'),
    validate,
    reviewController.moderateReview
)

export default router
