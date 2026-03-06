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

// View history routes
// POST — called on every tool page load (fire-and-forget from frontend)
router.post('/history/:toolId', userController.addToHistory)

// GET — fetches the user's recent history for the Dashboard
router.get('/history', userController.getHistory)

export default router
