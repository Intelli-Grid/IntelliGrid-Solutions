import express from 'express'
import collectionController from '../controllers/collectionController.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js' // Assuming existing
import { check } from 'express-validator' // Or use existing validationRules

const router = express.Router()

// Public routes
router.get('/public', collectionController.getPublicCollections)
router.get('/me', requireAuth, collectionController.getMyCollections) // Must be before /:id
router.get('/:id', optionalAuth, collectionController.getCollectionById)

// Protected routes
router.use(requireAuth)

router.post(
    '/',
    [
        check('name').not().isEmpty().withMessage('Name is required'),
        validate
    ],
    collectionController.createCollection
)



router.put('/:id', collectionController.updateCollection)
router.delete('/:id', collectionController.deleteCollection)

router.post(
    '/:id/tools',
    [
        check('toolId').isMongoId().withMessage('Valid Tool ID is required'),
        validate
    ],
    collectionController.addTool
)

router.delete('/:id/tools/:toolId', collectionController.removeTool)

export default router
