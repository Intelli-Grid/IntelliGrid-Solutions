import { Router } from 'express'
import { requireAuth, requireProOrTrial } from '../middleware/auth.js'
import {
    getRecommendations,
    getStackHistory,
    deleteStack,
} from '../controllers/stackAdvisorController.js'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// POST /api/stack-advisor/recommend — Pro/trial users only
router.post('/recommend', requireProOrTrial, getRecommendations)

// GET /api/stack-advisor/history — any authenticated user (to see their history)
router.get('/history', getStackHistory)

// DELETE /api/stack-advisor/history/:stackId
router.delete('/history/:stackId', deleteStack)

export default router
