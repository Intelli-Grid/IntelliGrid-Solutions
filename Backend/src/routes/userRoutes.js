import express from 'express'
import userController from '../controllers/userController.js'
import { requireAuth } from '../middleware/auth.js'
import { validationRules, validate } from '../middleware/validate.js'

const router = express.Router()

// All user routes require authentication
router.use(requireAuth)

// Profile routes
router.get('/profile', userController.getProfile)

router.put(
    '/profile',
    validationRules.updateProfile(),
    validate,
    userController.updateProfile
)

// Stats route
router.get('/stats', userController.getUserStats)

// Favorites routes
router.get('/favorites', userController.getFavorites)

router.post('/favorites', userController.addFavorite)

router.delete(
    '/favorites/:id',
    validationRules.objectId('id'),
    validate,
    userController.removeFavorite
)

export default router
