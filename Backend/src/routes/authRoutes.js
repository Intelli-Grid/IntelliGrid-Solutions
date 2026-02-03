import express from 'express'
import authController from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Get current user (requires auth)
router.get('/me', requireAuth, authController.getCurrentUser)

// Sync user with database (requires auth)
router.post('/sync', requireAuth, authController.syncUser)

// Clerk webhook (no auth required)
router.post('/webhooks/clerk', authController.clerkWebhook)

export default router
