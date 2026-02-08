import express from 'express'
import { exportUserData, deleteUserData, getUserDataSummary } from '../controllers/gdprController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// All GDPR routes require authentication
router.use(requireAuth)

// Get user data summary
router.get('/summary', getUserDataSummary)

// Export user data (GDPR right to data portability)
router.get('/export', exportUserData)

// Delete user data (GDPR right to erasure)
router.delete('/delete', deleteUserData)

export default router
