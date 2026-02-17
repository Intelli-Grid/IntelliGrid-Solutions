import express from 'express'
import newsletterController from '../controllers/newsletterController.js'
import validationMiddleware from '../middlewares/validation.middleware.js'
import { body } from 'express-validator'

const router = express.Router()

// Validation Chain
const subscribeValidation = [
    body('email').isEmail().withMessage('Please provide a valid email address'),
    validationMiddleware
]

// Routes
router.post('/subscribe', subscribeValidation, newsletterController.subscribe)
router.post('/unsubscribe', newsletterController.unsubscribe)

export default router
