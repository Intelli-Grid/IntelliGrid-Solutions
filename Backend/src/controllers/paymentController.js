import paymentService from '../services/paymentService.js'
import { verifyPayPalWebhook, getPayPalSubscription } from '../config/paypal.js'
import { verifyCashfreeWebhook } from '../config/cashfree.js'
import WebhookLog from '../models/WebhookLog.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Coupon from '../models/Coupon.js'
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

// ── Module-level constants (BUG-11 fix: was copy-pasted 3x) ─────────────────────
// Maps our plan keys to { tier, duration } — used by create-order + create-subscription routes
const PLAN_MAP = {
    'pro_monthly': { tier: 'pro', duration: 'monthly' },
    'pro_yearly': { tier: 'pro', duration: 'yearly' },
    'basic_monthly': { tier: 'basic', duration: 'monthly' },
    'basic_yearly': { tier: 'basic', duration: 'yearly' },
    'enterprise_monthly': { tier: 'enterprise', duration: 'monthly' },
    'enterprise_yearly': { tier: 'enterprise', duration: 'yearly' },
}

// Maps PayPal Billing Plan IDs (from env vars) back to { tier, duration }
// Used in webhook handlers to determine what plan was being billed
const getPlanIdMap = () => ({
    [process.env.PAYPAL_PLAN_BASIC_MONTHLY]: { tier: 'basic', duration: 'monthly' },
    [process.env.PAYPAL_PLAN_BASIC_YEARLY]: { tier: 'basic', duration: 'yearly' },
    [process.env.PAYPAL_PLAN_PRO_MONTHLY]: { tier: 'pro', duration: 'monthly' },
    [process.env.PAYPAL_PLAN_PRO_YEARLY]: { tier: 'pro', duration: 'yearly' },
    [process.env.PAYPAL_PLAN_ENTERPRISE_MONTHLY]: { tier: 'enterprise', duration: 'monthly' },
    [process.env.PAYPAL_PLAN_ENTERPRISE_YEARLY]: { tier: 'enterprise', duration: 'yearly' },
})

/**
 * Resolve and validate a coupon code at order-creation time.
 * Returns coupon metadata (discountType, discountValue, maxDiscount, couponId)
 * or null if no couponCode was provided.
 * Throws ApiError.badRequest if the code is provided but invalid.
 */
async function resolveCoupon(couponCode, planId) {
    if (!couponCode) return null

    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim(), isActive: true })
    if (!coupon) throw ApiError.badRequest('Invalid or inactive coupon code')

    // Expiry check
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
        throw ApiError.badRequest('This coupon has expired')
    }

    // Usage limit check
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        throw ApiError.badRequest('This coupon has reached its usage limit')
    }

    // Plan applicability check
    if (coupon.applicablePlans?.length > 0 && planId) {
        const planUpper = planId.toUpperCase()  // e.g. PRO_MONTHLY
        const matches = coupon.applicablePlans.some(p => planUpper.includes(p))
        if (!matches) throw ApiError.badRequest('This coupon is not valid for the selected plan')
    }

    return {
        couponId: coupon._id,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount || null,
    }
}

/**
 * Payment Controller - Handle payment requests
 */
class PaymentController {
    /**
     * Create PayPal order
     * POST /api/v1/payment/paypal/create-order
     */
    createPayPalOrder = asyncHandler(async (req, res) => {
        const { plan, couponCode } = req.body

        // Uses module-level PLAN_MAP constant
        const planData = PLAN_MAP[plan]
        if (!planData) throw ApiError.badRequest('Invalid plan selected')
        const { tier, duration } = planData

        // Resolve coupon discount (if provided)
        const couponMeta = await resolveCoupon(couponCode, plan)

        const result = await paymentService.createPayPalOrder(
            req.user._id,
            { tier, duration },
            couponMeta
        )

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
     * Create PayPal Subscription (Subscriptions API v2 — recurring billing)
     * POST /api/v1/payment/paypal/create-subscription
     */
    createPayPalSubscription = asyncHandler(async (req, res) => {
        const { plan } = req.body

        const planData = PLAN_MAP[plan]
        if (!planData) throw ApiError.badRequest('Invalid plan selected')

        const result = await paymentService.createPayPalSubscription(
            req.user._id,
            planData
        )

        res.status(201).json(
            new ApiResponse(201, result, 'PayPal subscription created successfully')
        )
    })

    /**
     * Cancel PayPal Subscription — user-initiated
     * POST /api/v1/payment/paypal/cancel-subscription
     */
    cancelPayPalSubscription = asyncHandler(async (req, res) => {
        await paymentService.cancelUserPayPalSubscription(req.user._id)

        res.status(200).json(
            new ApiResponse(200, {}, 'Subscription cancellation requested. You will retain access until the end of your billing period.')
        )
    })

    /**
     * Create Cashfree order
     * POST /api/v1/payment/cashfree/create-order
     */
    createCashfreeOrder = asyncHandler(async (req, res) => {
        const { plan, couponCode, customerPhone } = req.body

        // Uses module-level PLAN_MAP constant
        const planData = PLAN_MAP[plan]
        if (!planData) throw ApiError.badRequest('Invalid plan selected')
        const { tier, duration } = planData

        // Resolve coupon discount (if provided)
        const couponMeta = await resolveCoupon(couponCode, plan)

        const result = await paymentService.createCashfreeOrder(
            req.user._id,
            { tier, duration, customerPhone },
            couponMeta
        )

        res.status(201).json(
            new ApiResponse(201, result, 'Cashfree order created successfully')
        )
    })

    /**
     * Verify Cashfree payment (called by frontend after redirect)
     * POST /api/v1/payment/cashfree/verify
     */
    verifyCashfreePayment = asyncHandler(async (req, res) => {
        const { orderId } = req.body

        if (!orderId) {
            throw ApiError.badRequest('orderId is required')
        }

        // ✅ Idempotency check — prevent double-processing the same order
        const existingOrder = await Order.findOne({ orderId, status: 'completed' })
        if (existingOrder) {
            return res.status(200).json(
                new ApiResponse(200, {
                    success: true,
                    order: existingOrder,
                    amount: existingOrder.amount,
                    alreadyProcessed: true,
                }, 'Payment already verified')
            )
        }

        const result = await paymentService.verifyCashfreePayment(orderId)

        res.status(200).json(
            new ApiResponse(200, result, 'Payment verified successfully')
        )
    })

    /**
     * Get payment/subscription status
     * GET /api/v1/payment/status
     */
    getPaymentStatus = asyncHandler(async (req, res) => {
        const user = await User.findById(req.user._id).select('subscription')

        if (!user) {
            throw ApiError.notFound('User not found')
        }

        const recentOrder = await Order.findOne({ user: req.user._id })
            .sort({ createdAt: -1 })
            .select('orderId status paymentGateway amount createdAt')
            .lean()

        res.status(200).json(
            new ApiResponse(200, {
                subscription: user.subscription,
                latestOrder: recentOrder || null,
            }, 'Payment status retrieved')
        )
    })

    /**
     * PayPal Webhook Handler
     * POST /api/v1/payment/webhooks/paypal
     * BUG-14 fix: express.raw() applied in paymentRoutes.js — req.body is a Buffer.
     * Raw string passed to verifyPayPalWebhook so signature is checked against
     * the exact bytes PayPal signed, not a re-serialised JS object.
     */
    paypalWebhook = asyncHandler(async (req, res) => {
        // express.raw() gives us a Buffer — parse it ourselves
        const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body)
        let parsedBody
        try {
            parsedBody = JSON.parse(rawBody)
        } catch {
            console.error('❌ PayPal webhook: invalid JSON body')
            return res.status(400).json({ error: 'Invalid JSON body' })
        }

        const eventType = parsedBody.event_type || 'UNKNOWN'
        const transmissionId = req.headers['paypal-transmission-id']

        // ── Deduplication: prevent double-processing the same webhook ───────
        if (transmissionId) {
            const existing = await WebhookLog.findOne({ 'headers.paypal-transmission-id': transmissionId })
            if (existing && existing.status === 'processed') {
                console.log(`⚠️  Duplicate PayPal webhook ignored: ${transmissionId}`)
                return res.status(200).json({ received: true, duplicate: true })
            }
        }

        // ── Log the incoming webhook ─────────────────────────────────────────
        const log = await WebhookLog.create({
            source: 'paypal',
            eventType,
            payload: parsedBody,
            headers: req.headers,
            status: 'received',
        })

        // ── Verify signature using raw string (exact bytes PayPal signed) ────
        const isValid = await verifyPayPalWebhook(req.headers, rawBody)
        if (!isValid) {
            await WebhookLog.findByIdAndUpdate(log._id, { status: 'signature_failed' })
            console.error(`❌ PayPal webhook signature failed for event: ${eventType}`)
            return res.status(200).json({ received: true, verified: false })
        }

        const { event_type, resource } = parsedBody

        try {
            switch (event_type) {

                // ── One-time / subscription payment ──────────────────────────────────
                // PayPal v1 API fires PAYMENT.SALE.COMPLETED
                // PayPal v2 API fires PAYMENT.CAPTURE.COMPLETED
                // Both are handled identically — v2 falls through to v1 handler.
                case 'PAYMENT.CAPTURE.COMPLETED':
                case 'PAYMENT.SALE.COMPLETED': {
                    // For SUBSCRIPTION payments this fires too — resource.billing_agreement_id
                    // is set. For one-time payments resource.billing_agreement_id is absent.
                    const isSubscriptionPayment = !!resource.billing_agreement_id

                    if (isSubscriptionPayment) {
                        // Subscription payment confirmed — activate using plan_id reverse map
                        // (BUG-04 fix: was using unreliable timing-window heuristic)
                        const subscriptionId = resource.billing_agreement_id
                        const user = await User.findOne({ 'subscription.paypalSubscriptionId': subscriptionId })

                        if (user) {
                            // Fetch subscription from PayPal to get the plan_id
                            let subDetails = null
                            try { subDetails = await getPayPalSubscription(subscriptionId) } catch (_) { /* non-fatal */ }

                            // Use plan_id reverse map — same reliable approach as BILLING.SUBSCRIPTION.RENEWED
                            const PLAN_ID_MAP = getPlanIdMap()
                            const planData = (subDetails?.plan_id && PLAN_ID_MAP[subDetails.plan_id])
                                || { tier: 'pro', duration: 'monthly' }  // safe fallback

                            await paymentService.activateSubscription(user._id, planData, subscriptionId)
                            console.log(`🔄 Subscription payment extended for ${user.email} — plan: ${planData.tier}/${planData.duration}`)
                        } else {
                            console.warn(`⚠️  PAYMENT.SALE.COMPLETED: no user found for subscription ${subscriptionId}`)
                        }
                    } else {
                        // Legacy one-time payment — update order status if still pending
                        if (resource.id) {
                            await Order.findOneAndUpdate(
                                { 'paymentDetails.transactionId': resource.id, status: 'pending' },
                                { status: 'completed' }
                            )
                        }
                    }
                    break
                }

                // ── Subscription lifecycle events ──────────────────────────────────────

                case 'BILLING.SUBSCRIPTION.ACTIVATED': {
                    // Fired when user approves the subscription after redirect.
                    // This is when we activate the user's account.
                    const subscriptionId = resource.id
                    const userId = resource.custom_id  // set during createPayPalSubscription

                    console.log(`✅ PayPal subscription activated: ${subscriptionId} for user ${userId}`)

                    if (userId) {
                        // Determine tier/duration from the plan_id of the activated subscription
                        // Look up User to infer plan from plan_id → env var reverse map
                        const PLAN_ID_MAP = getPlanIdMap()
                        const planData = PLAN_ID_MAP[resource.plan_id] || { tier: 'pro', duration: 'monthly' }

                        await paymentService.activateSubscription(userId, planData, subscriptionId)

                        // Send welcome email (non-fatal)
                        const user = await User.findById(userId)
                        if (user) {
                            const emailPayload = {
                                tier: planData.tier,
                                duration: planData.duration,
                                amount: 'See PayPal receipt',
                                nextBillingDate: new Date(
                                    Date.now() + (planData.duration === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
                                ).toLocaleDateString()
                            }
                            import('../services/emailService.js').then(m =>
                                m.default.sendSubscriptionConfirmation(user, emailPayload)
                                    .catch(e => console.error('Welcome email error:', e))
                            )
                        }
                    }
                    break
                }

                // PayPal v1 fires BILLING.SUBSCRIPTION.RENEWED after each successful charge.
                // PayPal v2 / dashboard fires BILLING.SUBSCRIPTION.UPDATED for the same event.
                // Both extend the subscription end date — v2 name falls through to v1 handler.
                case 'BILLING.SUBSCRIPTION.UPDATED':
                case 'BILLING.SUBSCRIPTION.RENEWED': {
                    // PayPal auto-renewed — extend the user's endDate using plan_id reverse map
                    const subscriptionId = resource.id
                    const userId = resource.custom_id

                    console.log(`🔄 PayPal subscription renewed/updated: ${subscriptionId}`)

                    if (userId) {
                        const PLAN_ID_MAP = getPlanIdMap()
                        const planData = PLAN_ID_MAP[resource.plan_id] || { tier: 'pro', duration: 'monthly' }
                        await paymentService.activateSubscription(userId, planData, subscriptionId)
                    }
                    break
                }

                case 'BILLING.SUBSCRIPTION.SUSPENDED':
                case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
                case 'PAYMENT.SALE.DENIED': {
                    const subscriptionId = resource.id || resource.billing_agreement_id
                    const userId = resource.custom_id

                    console.warn(`⚠️  PayPal payment failed/suspended: ${subscriptionId} for user ${userId}`)

                    if (userId) {
                        await User.findByIdAndUpdate(userId, {
                            'subscription.status': 'inactive',
                            'subscription.autoRenew': false,
                        })
                        // Send payment failed email (non-fatal)
                        const user = await User.findById(userId)
                        if (user) {
                            import('../services/emailService.js').then(m =>
                                m.default.sendPaymentFailure(user, { orderId: subscriptionId })
                                    .catch(e => console.error('Payment fail email error:', e))
                            )
                        }
                    }
                    if (resource.id && event_type === 'PAYMENT.SALE.DENIED') {
                         await Order.findOneAndUpdate(
                             { 'paymentDetails.transactionId': resource.id, status: 'pending' },
                             { status: 'failed' }
                         )
                    }
                    break
                }

                case 'BILLING.SUBSCRIPTION.CANCELLED': {
                    // User or admin cancelled the subscription (via PayPal or our API)
                    const subscriptionId = resource.id
                    const userId = resource.custom_id

                    console.log(`⚠️  PayPal subscription cancelled: ${subscriptionId} for user ${userId}`)

                    if (userId) {
                        await User.findByIdAndUpdate(userId, {
                            'subscription.status': 'cancelled',
                            'subscription.autoRenew': false,
                            'subscription.paypalSubscriptionId': null,
                        })
                        console.log(`↩️  User ${userId} subscription marked cancelled`)
                    }
                    break
                }

                case 'BILLING.SUBSCRIPTION.EXPIRED': {
                    const userId = resource.custom_id
                    if (userId) {
                        await User.findByIdAndUpdate(userId, {
                            'subscription.tier': 'Free',
                            'subscription.status': 'expired',
                            'subscription.autoRenew': false,
                            'subscription.paypalSubscriptionId': null,
                        })
                        console.log(`↩️  PayPal subscription expired for user ${userId} — downgraded to Free`)
                    }
                    break
                }

                // PayPal v1 fires PAYMENT.SALE.REFUNDED, v2 fires PAYMENT.CAPTURE.REFUNDED.
                // resource.sale_id (v1) or resource.id (v2) both hold the transaction ref.
                case 'PAYMENT.CAPTURE.REFUNDED':
                case 'PAYMENT.SALE.REFUNDED': {
                    const refundRef = resource.sale_id || resource.id
                    console.log('⚠️  PayPal payment refunded:', refundRef)
                    if (refundRef) {
                        await Order.findOneAndUpdate(
                            { 'paymentDetails.transactionId': refundRef },
                            { status: 'refunded' }
                        )
                    }
                    break
                }

                default:
                    console.log(`ℹ️  Unhandled PayPal webhook: ${event_type}`)
            }

            await WebhookLog.findByIdAndUpdate(log._id, { status: 'processed' })
            res.status(200).json({ received: true })
        } catch (error) {
            console.error('❌ PayPal webhook processing error:', error)
            await WebhookLog.findByIdAndUpdate(log._id, { status: 'error', error: error.message })
            res.status(500).json({ error: 'Webhook processing failed' })
        }
    })

    /**
     * Cashfree Webhook Handler
     * POST /api/v1/payment/webhooks/cashfree
     * BUG-14 fix: express.raw() applied in paymentRoutes.js — req.body is a Buffer.
     * BUG-13 fix: idempotency guard uses cf_payment_id against processed WebhookLogs.
     */
    cashfreeWebhook = asyncHandler(async (req, res) => {
        // express.raw() gives us a Buffer — parse it ourselves
        const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body)
        let parsedBody
        try {
            parsedBody = JSON.parse(rawBody)
        } catch {
            console.error('❌ Cashfree webhook: invalid JSON body')
            return res.status(400).json({ error: 'Invalid JSON body' })
        }

        const eventType = parsedBody.type || 'UNKNOWN'

        // Handle test webhooks from Cashfree dashboard
        if (!parsedBody.type || parsedBody.test === true) {
            console.log('✅ Cashfree test webhook received')
            return res.status(200).json({ received: true, message: 'Test webhook accepted' })
        }

        // ── Deduplication (BUG-13 fix): use Cashfree's cf_payment_id ────────
        const cfPaymentId = parsedBody.data?.payment?.cf_payment_id?.toString()
        if (cfPaymentId) {
            const existing = await WebhookLog.findOne({
                source: 'cashfree',
                'payload.data.payment.cf_payment_id': cfPaymentId,
                status: 'processed'
            })
            if (existing) {
                console.log(`⚠️  Duplicate Cashfree webhook ignored: cf_payment_id=${cfPaymentId}`)
                return res.status(200).json({ received: true, duplicate: true })
            }
        }

        // ── Log the incoming webhook ─────────────────────────────────────────
        const log = await WebhookLog.create({
            source: 'cashfree',
            eventType,
            payload: parsedBody,
            headers: req.headers,
            status: 'received',
        })

        // ── Verify HMAC-SHA256 signature using raw body string ───────────────
        const signature = req.headers['x-webhook-signature']
        const timestamp = req.headers['x-webhook-timestamp']

        const isValid = verifyCashfreeWebhook(signature, timestamp, rawBody)
        if (!isValid) {
            await WebhookLog.findByIdAndUpdate(log._id, { status: 'signature_failed' })
            console.error(`❌ Cashfree webhook signature failed for event: ${eventType}`)
            return res.status(200).json({ received: true, verified: false })
        }

        const { type, data } = parsedBody

        try {
            switch (type) {
                case 'PAYMENT_SUCCESS_WEBHOOK': {
                    const orderId = data?.order?.order_id
                    console.log('✅ Cashfree payment success webhook:', orderId)
                    if (orderId) {
                        // Verify via service (idempotent)
                        await paymentService.verifyCashfreePayment(orderId)
                    }
                    break
                }

                case 'PAYMENT_FAILED_WEBHOOK': {
                    const orderId = data?.order?.order_id
                    console.log('❌ Cashfree payment failed:', orderId)
                    if (orderId) {
                        await Order.findOneAndUpdate(
                            { orderId, status: 'pending' },
                            { status: 'failed' }
                        )
                    }
                    break
                }

                case 'PAYMENT_USER_DROPPED_WEBHOOK': {
                    const orderId = data?.order?.order_id
                    console.log('⚠️  Cashfree payment dropped by user:', orderId)
                    if (orderId) {
                        await Order.findOneAndUpdate(
                            { orderId, status: 'pending' },
                            { status: 'cancelled' }
                        )
                    }
                    break
                }

                default:
                    console.log(`ℹ️  Unhandled Cashfree webhook: ${type}`)
            }

            await WebhookLog.findByIdAndUpdate(log._id, { status: 'processed' })
            res.status(200).json({ received: true })
        } catch (error) {
            console.error('❌ Cashfree webhook processing error:', error)
            await WebhookLog.findByIdAndUpdate(log._id, { status: 'error', error: error.message })
            res.status(500).json({ error: 'Webhook processing failed' })
        }
    })
}

export default new PaymentController()
