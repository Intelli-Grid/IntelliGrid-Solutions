import express from 'express'
import paymentController from '../controllers/paymentController.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

// Payment status (requires authentication)
router.get(
    '/status',
    requireAuth,
    paymentController.getPaymentStatus
)

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

// PayPal Subscriptions API v2 — recurring billing
router.post(
    '/paypal/create-subscription',
    requireAuth,
    paymentController.createPayPalSubscription
)

router.post(
    '/paypal/cancel-subscription',
    requireAuth,
    paymentController.cancelPayPalSubscription
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

// Webhook routes (no authentication — verified by signature)
router.post('/webhooks/paypal', paymentController.paypalWebhook)

router.post('/webhooks/cashfree', paymentController.cashfreeWebhook)

export default router
