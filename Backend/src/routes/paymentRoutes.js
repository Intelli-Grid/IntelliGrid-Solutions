import express from 'express'
import paymentController from '../controllers/paymentController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// PayPal routes (require authentication)
router.post(
    '/paypal/create-order',
    requireAuth,
    paymentController.createPayPalOrder
)

router.post(
    '/paypal/capture',
    requireAuth,
    paymentController.capturePayPalPayment
)

// Cashfree routes (require authentication)
router.post(
    '/cashfree/create-order',
    requireAuth,
    paymentController.createCashfreeOrder
)

router.post(
    '/cashfree/verify',
    requireAuth,
    paymentController.verifyCashfreePayment
)

// Webhook routes (no authentication)
router.post('/webhooks/paypal', paymentController.paypalWebhook)

router.post('/webhooks/cashfree', paymentController.cashfreeWebhook)

export default router
