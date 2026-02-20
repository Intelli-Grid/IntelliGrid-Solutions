import express from 'express'
import authController from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

/**
 * Raw body capture middleware for Clerk webhook only.
 * Svix signature verification MUST receive the exact bytes from the wire —
 * if we let express.json() parse first and then re-stringify, the signature fails.
 */
const captureRawBody = express.raw({ type: '*/*' })

// Get current user (requires auth)
router.get('/me', requireAuth, authController.getCurrentUser)

// Sync user with database (requires auth)
router.post('/sync', requireAuth, authController.syncUser)

// Clerk webhook (raw body required for Svix signature verification)
// captureRawBody MUST come before authController.clerkWebhook
router.post('/webhooks/clerk', captureRawBody, authController.clerkWebhook)

export default router
