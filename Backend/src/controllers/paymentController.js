import paymentService from '../services/paymentService.js'
import { verifyPayPalWebhook } from '../config/paypal.js'
import { verifyCashfreeWebhook } from '../config/cashfree.js'
import WebhookLog from '../models/WebhookLog.js'
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

/**
 * Payment Controller - Handle payment requests
 */
class PaymentController {
    /**
     * Create PayPal order
     * POST /api/v1/payment/paypal/create-order
     */
    createPayPalOrder = asyncHandler(async (req, res) => {
        const { plan } = req.body

        // Map plan to tier and duration
        let tier, duration
        if (plan === 'pro_monthly') {
            tier = 'pro'
            duration = 'monthly'
        } else if (plan === 'pro_yearly') {
            tier = 'pro'
            duration = 'yearly'
        } else {
            throw ApiError.badRequest('Invalid plan selected')
        }

        const result = await paymentService.createPayPalOrder(req.user._id, {
            tier,
            duration,
        })

        res.status(201).json(
            new ApiResponse(201, result, 'PayPal order created successfully')
        )
    })

    /**
     * Capture PayPal payment
     * POST /api/v1/payment/paypal/capture
     */
    capturePayPalPayment = asyncHandler(async (req, res) => {
        const { paymentId, payerId } = req.body

        const result = await paymentService.capturePayPalPayment(paymentId, payerId)

        res.status(200).json(
            new ApiResponse(200, result, 'Payment captured successfully')
        )
    })

    /**
     * Create Cashfree order
     * POST /api/v1/payment/cashfree/create-order
     */
    createCashfreeOrder = asyncHandler(async (req, res) => {
        const { plan } = req.body

        // Map plan to tier and duration
        let tier, duration
        if (plan === 'pro_monthly') {
            tier = 'pro'
            duration = 'monthly'
        } else if (plan === 'pro_yearly') {
            tier = 'pro'
            duration = 'yearly'
        } else {
            throw ApiError.badRequest('Invalid plan selected')
        }

        const result = await paymentService.createCashfreeOrder(req.user._id, {
            tier,
            duration,
        })

        res.status(201).json(
            new ApiResponse(201, result, 'Cashfree order created successfully')
        )
    })

    /**
     * Verify Cashfree payment
     * POST /api/v1/payment/cashfree/verify
     */
    verifyCashfreePayment = asyncHandler(async (req, res) => {
        const { orderId } = req.body

        const result = await paymentService.verifyCashfreePayment(orderId)

        res.status(200).json(
            new ApiResponse(200, result, 'Payment verified successfully')
        )
    })

    /**
     * PayPal webhook handler
     * POST /api/v1/payment/webhooks/paypal
     */
    paypalWebhook = asyncHandler(async (req, res) => {
        // Log webhook
        await WebhookLog.create({
            source: 'paypal',
            eventType: req.body.event_type,
            payload: req.body,
            headers: req.headers,
            status: 'received',
        })

        // Verify webhook
        const isValid = await verifyPayPalWebhook(req.headers, req.body)

        if (!isValid) {
            throw ApiError.unauthorized('Invalid webhook signature')
        }

        const { event_type, resource } = req.body

        try {
            switch (event_type) {
                case 'PAYMENT.SALE.COMPLETED':
                    console.log('✅ PayPal payment completed:', resource.id)
                    // Handle payment completion
                    break

                case 'PAYMENT.SALE.REFUNDED':
                    console.log('⚠️  PayPal payment refunded:', resource.id)
                    // Handle refund
                    break

                default:
                    console.log('⚠️  Unhandled PayPal webhook:', event_type)
            }

            res.status(200).json({ received: true })
        } catch (error) {
            console.error('PayPal webhook error:', error)
            res.status(500).json({ error: 'Webhook processing failed' })
        }
    })

    /**
     * Cashfree webhook handler
     * POST /api/v1/payment/webhooks/cashfree
     */
    cashfreeWebhook = asyncHandler(async (req, res) => {
        // Log webhook
        await WebhookLog.create({
            source: 'cashfree',
            eventType: req.body.type,
            payload: req.body,
            headers: req.headers,
            status: 'received',
        })

        // Verify webhook
        const signature = req.headers['x-webhook-signature']
        const timestamp = req.headers['x-webhook-timestamp']
        const isValid = verifyCashfreeWebhook(signature, timestamp, req.body)

        if (!isValid) {
            throw ApiError.unauthorized('Invalid webhook signature')
        }

        const { type, data } = req.body

        try {
            switch (type) {
                case 'PAYMENT_SUCCESS_WEBHOOK':
                    console.log('✅ Cashfree payment success:', data.order.order_id)
                    // Handle payment success
                    break

                case 'PAYMENT_FAILED_WEBHOOK':
                    console.log('❌ Cashfree payment failed:', data.order.order_id)
                    // Handle payment failure
                    break

                default:
                    console.log('⚠️  Unhandled Cashfree webhook:', type)
            }

            res.status(200).json({ received: true })
        } catch (error) {
            console.error('Cashfree webhook error:', error)
            res.status(500).json({ error: 'Webhook processing failed' })
        }
    })
}

export default new PaymentController()
