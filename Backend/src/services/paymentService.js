import paypal, { createPayPalSubscription, cancelPayPalSubscription } from '../config/paypal.js'
import axios from 'axios'
import { getCashfreeBaseUrl, getCashfreeHeaders } from '../config/cashfree.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Coupon from '../models/Coupon.js'
import ApiError from '../utils/ApiError.js'
import { nanoid } from 'nanoid'
import emailService from './emailService.js'
import clerkClient from '../config/clerk.js'

/**
 * Payment Service - Business logic for payments
 */
class PaymentService {
    /**
     * Create PayPal order
     */
    async createPayPalOrder(userId, subscriptionData, couponMeta = null) {
        const { tier, duration } = subscriptionData

        const pricing = this.getSubscriptionPricing(tier, duration)

        // Apply coupon discount if present
        let finalAmount = pricing.amount
        let discountAmount = 0
        if (couponMeta) {
            if (couponMeta.discountType === 'percentage') {
                discountAmount = finalAmount * (couponMeta.discountValue / 100)
                if (couponMeta.maxDiscount) discountAmount = Math.min(discountAmount, couponMeta.maxDiscount)
            } else {
                discountAmount = couponMeta.discountValue
            }
            finalAmount = Math.max(0, +(finalAmount - discountAmount).toFixed(2))
        }

        const createPaymentJson = {
            intent: 'sale',
            payer: { payment_method: 'paypal' },
            redirect_urls: {
                return_url: `${process.env.FRONTEND_URL}/payment/success?method=paypal`,
                cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?method=paypal`,
            },
            transactions: [{
                item_list: {
                    items: [{
                        name: `${tier} Subscription - ${duration}`,
                        sku: `${tier.toLowerCase()}-${duration}`,
                        price: finalAmount.toString(),
                        currency: 'USD',
                        quantity: 1,
                    }],
                },
                amount: { currency: 'USD', total: finalAmount.toString() },
                description: `IntelliGrid ${tier} subscription (${duration})${couponMeta ? ' [coupon applied]' : ''}`,
                // custom is passed back in BILLING.SUBSCRIPTION.CANCELLED webhook
                custom: userId.toString(),
            }],
        }

        return new Promise((resolve, reject) => {
            paypal.payment.create(createPaymentJson, async (error, payment) => {
                if (error) {
                    console.error('PayPal order creation error:', error)
                    reject(ApiError.internal(`Failed to create PayPal order: ${JSON.stringify(error)}`))
                } else {
                    const order = await Order.create({
                        orderId: payment.id,
                        user: userId,
                        subscription: { tier, duration },
                        amount: {
                            currency: 'USD',
                            total: finalAmount,
                            subtotal: pricing.amount,
                            discount: discountAmount,
                        },
                        normalizedAmountUSD: finalAmount,
                        coupon: couponMeta?.couponId || null,
                        paymentGateway: 'paypal',
                        status: 'pending',
                    })

                    // Atomic coupon increment: only succeeds if usedCount < maxUses
                    // (or maxUses is null = unlimited). Prevents race conditions.
                    if (couponMeta?.couponId) {
                        const updated = await Coupon.findOneAndUpdate(
                            {
                                _id: couponMeta.couponId,
                                $or: [
                                    { maxUses: null },
                                    { $expr: { $lt: ['$usedCount', '$maxUses'] } }
                                ]
                            },
                            { $inc: { usedCount: 1 } }
                        )
                        // If no document was returned the coupon was exhausted between validation
                        // and order creation (race window). The order is already made; log it.
                        if (!updated) {
                            console.warn('Coupon exhausted between validation and order creation:', couponMeta.couponId)
                        }
                    }

                    const approvalUrl = payment.links.find(link => link.rel === 'approval_url')?.href
                    resolve({ orderId: payment.id, approvalUrl, order })
                }
            })
        })
    }

    /**
     * Capture PayPal payment
     */
    async capturePayPalPayment(paymentId, payerId) {
        return new Promise((resolve, reject) => {
            paypal.payment.execute(
                paymentId,
                { payer_id: payerId },
                async (error, payment) => {
                    if (error) {
                        console.error('PayPal capture error:', error)
                        reject(ApiError.internal('Failed to capture PayPal payment'))
                    } else {
                        // ── Guard: only proceed if PayPal approved the payment ──
                        if (payment.state !== 'approved') {
                            console.warn(`PayPal payment ${paymentId} not approved — state: ${payment.state}`)
                            resolve({
                                success: false,
                                message: `Payment was not approved by PayPal (state: ${payment.state}).`,
                                payment,
                            })
                            return
                        }

                        // Update order status
                        const order = await Order.findOneAndUpdate(
                            { orderId: paymentId },
                            {
                                status: 'completed',
                                'paymentDetails.transactionId': payment.transactions[0].related_resources[0].sale.id,
                                'paymentDetails.payerId': payerId,
                            },
                            { new: true }
                        ).populate('user')

                        if (order) {
                            // Activate user subscription
                            await this.activateSubscription(order.user._id, order.subscription)

                            const formattedAmount = order.amount.currency === 'INR'
                                ? `₹${order.amount.total.toLocaleString('en-IN')}`
                                : `$${order.amount.total.toFixed(2)}`

                            const subscriptionDetails = {
                                tier: order.subscription.tier,
                                duration: order.subscription.duration,
                                amount: formattedAmount,
                                nextBillingDate: new Date(Date.now() + (order.subscription.duration === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toLocaleDateString()
                            }

                            const paymentReceipt = {
                                id: payment.id,
                                createdAt: order.createdAt,
                                planName: `${order.subscription.tier} ${order.subscription.duration}`,
                                method: 'PayPal',
                                amount: formattedAmount
                            }

                            emailService.sendSubscriptionConfirmation(order.user, subscriptionDetails)
                                .catch(err => console.error('Failed to send subscription email:', err))

                            emailService.sendPaymentReceipt(order.user, paymentReceipt)
                                .catch(err => console.error('Failed to send receipt email:', err))
                        }

                        // ✅ Explicit success flag — frontend trusts only this
                        resolve({ success: true, payment, order, amount: order?.amount })
                    }
                }
            )
        })

    }

    /**
     * Create Cashfree order
     */
    async createCashfreeOrder(userId, subscriptionData, couponMeta = null) {
        const { tier, duration, customerPhone } = subscriptionData

        // Calculate amount (INR for Cashfree)
        const pricing = this.getSubscriptionPricing(tier, duration, 'INR')

        // Apply coupon discount if present
        let finalAmount = pricing.amount
        let discountAmount = 0
        if (couponMeta) {
            if (couponMeta.discountType === 'percentage') {
                // Percentage discounts are currency-agnostic — apply directly to INR amount
                discountAmount = finalAmount * (couponMeta.discountValue / 100)
                // maxDiscount on percentage coupons is always stored in USD; convert to INR
                if (couponMeta.maxDiscount) {
                    const maxDiscountINR = couponMeta.maxDiscountINR ?? Math.round(couponMeta.maxDiscount * 83)
                    discountAmount = Math.min(discountAmount, maxDiscountINR)
                }
            } else {
                // Fixed-amount discount: use explicit INR value if the coupon has one,
                // otherwise fall back to USD ×83 conversion until coupons are updated.
                discountAmount = (couponMeta.discountValueINR != null)
                    ? couponMeta.discountValueINR
                    : couponMeta.discountValue * 83
            }
            finalAmount = Math.max(0, +(finalAmount - discountAmount).toFixed(2))
        }

        // Fetch user to get a real phone number for Cashfree; fall back gracefully
        const userRecord = await User.findById(userId).select('email').lean()

        const orderData = {
            order_id: `order_${nanoid(16)}`,
            order_amount: finalAmount,
            order_currency: 'INR',
            customer_details: {
                customer_id: userId.toString(),
                customer_email: userRecord?.email || 'noreply@intelligrid.online',
                // Cashfree requires a 10-digit phone; use provided phone or fallback
                // '0000000000' is accepted by Cashfree PROD as a format-valid fallback.
                // '9999999999' is a known test placeholder explicitly rejected by Cashfree PROD API.
                // Best practice: collect the real phone on checkout (CheckoutPage.jsx phone input).
                customer_phone: customerPhone || '0000000000',
            },
            order_meta: {
                return_url: `${process.env.FRONTEND_URL}/payment/success?orderId={order_id}&method=cashfree`,
            },
        }

        try {
            const response = await axios.post(
                `${getCashfreeBaseUrl()}/orders`,
                orderData,
                { headers: getCashfreeHeaders() }
            )

            // Extract the key fields from Cashfree's response
            // payment_session_id is required for the checkout SDK / redirect URL
            const paymentSessionId = response.data.payment_session_id
            const orderId = response.data.order_id

            if (!paymentSessionId) {
                throw ApiError.internal('Cashfree did not return a payment_session_id. Check Cashfree API credentials.')
            }

            const order = await Order.create({
                orderId: response.data.order_id,
                user: userId,
                subscription: { tier, duration },
                amount: {
                    currency: 'INR',
                    total: finalAmount,
                    subtotal: pricing.amount,
                    discount: discountAmount,
                },
                normalizedAmountUSD: +(finalAmount / 83).toFixed(2),
                coupon: couponMeta?.couponId || null,
                paymentGateway: 'cashfree',
                status: 'pending',
            })

            // Atomic coupon increment: only succeeds if usedCount < maxUses
            if (couponMeta?.couponId) {
                const updated = await Coupon.findOneAndUpdate(
                    {
                        _id: couponMeta.couponId,
                        $or: [
                            { maxUses: null },
                            { $expr: { $lt: ['$usedCount', '$maxUses'] } }
                        ]
                    },
                    { $inc: { usedCount: 1 } }
                )
                if (!updated) {
                    console.warn('Coupon exhausted between validation and order creation:', couponMeta.couponId)
                }
            }

            // ✅ BUG-07 fix: Cashfree checkout URL uses payment checkout domain,
            // NOT the API base URL. getCashfreeBaseUrl() returns the API endpoint.
            const env = (process.env.CASHFREE_ENV || 'PROD').toUpperCase()
            const isProd = env === 'PROD' || env === 'PRODUCTION' || env === 'LIVE'

            const checkoutBase = isProd
                ? 'https://checkout.cashfree.com/pg'
                : 'https://sandbox.cashfree.com/pg'
            const checkoutUrl = `${checkoutBase}/pay/${paymentSessionId}`

            return {
                orderId,
                paymentSessionId,
                payment_session_id: paymentSessionId,
                payment_link: checkoutUrl,
                paymentUrl: checkoutUrl,
                order,
            }
        } catch (error) {
            console.error('Cashfree order creation error:', error.response?.data?.message || error.message)
            throw ApiError.internal(`Failed to create Cashfree order: ${error.response?.data?.message || error.message}`)
        }
    }

    /**
     * Verify Cashfree payment
     */
    async verifyCashfreePayment(orderId) {
        try {
            const response = await axios.get(
                `${getCashfreeBaseUrl()}/orders/${orderId}`,
                { headers: getCashfreeHeaders() }
            )

            const paymentStatus = response.data.order_status

            // Update order in database — mark failed if not PAID
            const order = await Order.findOneAndUpdate(
                { orderId },
                {
                    status: paymentStatus === 'PAID' ? 'completed' : 'failed',
                    'paymentDetails.transactionId': response.data.cf_order_id,
                },
                { new: true }
            ).populate('user')

            // ── Non-PAID path: return explicit failure so frontend shows error UI ──
            if (paymentStatus !== 'PAID') {
                const statusMessages = {
                    ACTIVE: 'Payment was not completed. Please try again.',
                    EXPIRED: 'Payment session expired. Please initiate a new payment.',
                    CANCELLED: 'Payment was cancelled. No charge was made.',
                }
                return {
                    success: false,
                    message: statusMessages[paymentStatus] || `Payment not completed (status: ${paymentStatus}). No charge was made.`,
                    status: paymentStatus,
                    order,
                }
            }

            // ── PAID path: activate subscription + send emails ──
            if (order) {
                await this.activateSubscription(order.user._id, order.subscription)

                const formattedAmount = order.amount.currency === 'INR'
                    ? `₹${order.amount.total.toLocaleString('en-IN')}`
                    : `$${order.amount.total.toFixed(2)}`

                const subscriptionDetails = {
                    tier: order.subscription.tier,
                    duration: order.subscription.duration,
                    amount: formattedAmount,
                    nextBillingDate: new Date(Date.now() + (order.subscription.duration === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toLocaleDateString()
                }

                const paymentReceipt = {
                    id: response.data.cf_order_id || orderId,
                    createdAt: order.createdAt,
                    planName: `${order.subscription.tier} ${order.subscription.duration}`,
                    method: 'Cashfree',
                    amount: formattedAmount
                }

                emailService.sendSubscriptionConfirmation(order.user, subscriptionDetails)
                    .catch(err => console.error('Failed to send subscription email:', err))

                emailService.sendPaymentReceipt(order.user, paymentReceipt)
                    .catch(err => console.error('Failed to send receipt email:', err))
            }

            // ✅ Explicit success flag — frontend should ONLY trust this field
            return { success: true, payment: response.data, order, amount: order?.amount }
        } catch (error) {
            console.error('Cashfree verification error:', error)
            throw ApiError.internal('Failed to verify Cashfree payment')
        }
    }

    /**
     * Create a PayPal recurring subscription (Subscriptions API v2)
     * Returns { subscriptionId, approveUrl } — frontend redirects user to approveUrl.
     * After approval PayPal sends BILLING.SUBSCRIPTION.ACTIVATED webhook which activates the sub.
     *
     * @param {string} userId          - MongoDB User _id
     * @param {object} subscriptionData - { tier, duration }
     * @returns {Promise<{subscriptionId, approveUrl}>}
     */
    async createPayPalSubscription(userId, subscriptionData) {
        const { tier, duration } = subscriptionData

        // ── Plan ID format guard ────────────────────────────────────────────────
        // PayPal Billing Plan IDs must start with 'P-'.
        // Product IDs start with 'PROD-' and CANNOT be used here.
        // If you see PROD- values in env vars, go to PayPal dashboard →
        // Products & Plans → click the product → create a Plan under it.
        // Copy the Plan ID (P-XXXX...) not the Product ID (PROD-XXXX...).
        const warnIfProductId = (envKey, value) => {
            if (value && !value.startsWith('P-')) {
                console.error(
                    `🚨 [PayPal] ${envKey}="${value}" looks like a PRODUCT ID (should start with P-). ` +
                    `Go to PayPal dashboard → Products & Plans → open the product → copy the PLAN ID.`
                )
            }
        }
        warnIfProductId('PAYPAL_PLAN_PRO_MONTHLY', process.env.PAYPAL_PLAN_PRO_MONTHLY)
        warnIfProductId('PAYPAL_PLAN_PRO_YEARLY', process.env.PAYPAL_PLAN_PRO_YEARLY)
        warnIfProductId('PAYPAL_PLAN_BASIC_MONTHLY', process.env.PAYPAL_PLAN_BASIC_MONTHLY)
        warnIfProductId('PAYPAL_PLAN_BASIC_YEARLY', process.env.PAYPAL_PLAN_BASIC_YEARLY)
        warnIfProductId('PAYPAL_PLAN_ENTERPRISE_MONTHLY', process.env.PAYPAL_PLAN_ENTERPRISE_MONTHLY)
        warnIfProductId('PAYPAL_PLAN_ENTERPRISE_YEARLY', process.env.PAYPAL_PLAN_ENTERPRISE_YEARLY)

        // Map our plan keys to PayPal Billing Plan IDs defined in env vars
        // These must be created ONCE in PayPal dashboard → Products & Plans
        // and stored as: PAYPAL_PLAN_BASIC_MONTHLY, PAYPAL_PLAN_BASIC_YEARLY, etc.
        const PLAN_ENV_MAP = {
            basic_monthly: process.env.PAYPAL_PLAN_BASIC_MONTHLY,
            basic_yearly: process.env.PAYPAL_PLAN_BASIC_YEARLY,
            pro_monthly: process.env.PAYPAL_PLAN_PRO_MONTHLY,
            pro_yearly: process.env.PAYPAL_PLAN_PRO_YEARLY,
            premium_monthly: process.env.PAYPAL_PLAN_PRO_MONTHLY,    // legacy alias
            premium_yearly: process.env.PAYPAL_PLAN_PRO_YEARLY,     // legacy alias
            business_monthly: process.env.PAYPAL_PLAN_BUSINESS_MONTHLY,
            business_yearly: process.env.PAYPAL_PLAN_BUSINESS_YEARLY,
            enterprise_monthly: process.env.PAYPAL_PLAN_ENTERPRISE_MONTHLY,
            enterprise_yearly: process.env.PAYPAL_PLAN_ENTERPRISE_YEARLY,
        }

        const planKey = `${tier.toLowerCase()}_${duration}`
        const paypalPlanId = PLAN_ENV_MAP[planKey]

        if (!paypalPlanId) {
            throw ApiError.badRequest(
                `No PayPal Billing Plan configured for ${tier} ${duration}. ` +
                `Set PAYPAL_PLAN_${tier.toUpperCase()}_${duration.toUpperCase()} in environment variables.`
            )
        }

        const returnUrl = `${process.env.FRONTEND_URL}/payment/success?method=paypal-subscription`
        const cancelUrl = `${process.env.FRONTEND_URL}/payment/cancel?method=paypal-subscription`

        try {
            const result = await createPayPalSubscription(paypalPlanId, userId, returnUrl, cancelUrl)
            console.log(`✅ PayPal subscription created: ${result.subscriptionId} for user ${userId}`)
            return result
        } catch (error) {
            console.error('PayPal subscription creation error:', error.response?.data || error.message)
            throw ApiError.internal(`Failed to create PayPal subscription: ${error.response?.data?.message || error.message}`)
        }
    }

    /**
     * Cancel an active PayPal subscription for a user.
     * Called when a user requests cancellation from the frontend.
     * PayPal will still send BILLING.SUBSCRIPTION.CANCELLED webhook — which is the
     * authoritative source of truth for downgrading the user's DB record.
     *
     * @param {string} userId - MongoDB User _id
     * @returns {Promise<void>}
     */
    async cancelUserPayPalSubscription(userId) {
        const user = await User.findById(userId).select('subscription email')
        if (!user) throw ApiError.notFound('User not found')

        const subscriptionId = user.subscription?.paypalSubscriptionId
        if (!subscriptionId) {
            throw ApiError.badRequest('No active PayPal subscription found for this user')
        }

        try {
            await cancelPayPalSubscription(subscriptionId, 'User requested cancellation via IntelliGrid dashboard')

            // Mark autoRenew off immediately in DB — user retains access until period ends
            // cancelledAt enables the win-back cron to target this user in 3 days
            await User.findByIdAndUpdate(userId, {
                'subscription.autoRenew': false,
                'subscription.cancelledAt': new Date(),
                'subscription.status': 'cancelled',
                winBackSent: false,   // reset so they can receive a future win-back if needed
            })

            console.log(`✅ PayPal subscription ${subscriptionId} cancel requested for user ${user.email}`)
        } catch (error) {
            console.error('PayPal subscription cancellation error:', error.response?.data || error.message)
            throw ApiError.internal(`Failed to cancel PayPal subscription: ${error.response?.data?.message || error.message}`)
        }
    }

    /**
     * Activate user subscription
     */
    async activateSubscription(userId, subscriptionData, paypalSubscriptionId = null) {
        const { tier, duration } = subscriptionData

        // Map payment plan names → User model tier enum values
        const TIER_MAP = {
            'pro': 'Pro', 'Pro': 'Pro',
            'premium': 'Pro', 'Premium': 'Pro',     // 'Premium' is legacy alias — map to 'Pro'
            'basic': 'Basic', 'Basic': 'Basic',
            'business': 'Business', 'Business': 'Business',
            'enterprise': 'Enterprise', 'Enterprise': 'Enterprise',
            'free': 'Free', 'Free': 'Free',
        }
        const normalizedTier = TIER_MAP[tier] || 'Pro'

        const startDate = new Date()
        const endDate = new Date()

        if (duration === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1)
        } else if (duration === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1)
        }

        // Build update — include paypalSubscriptionId if this is a recurring sub
        const subscriptionUpdate = {
            'subscription.tier': normalizedTier,
            'subscription.status': 'active',
            'subscription.startDate': startDate,
            'subscription.endDate': endDate,
            'subscription.autoRenew': paypalSubscriptionId ? true : false,
        }
        if (paypalSubscriptionId) {
            subscriptionUpdate['subscription.paypalSubscriptionId'] = paypalSubscriptionId
        }

        // Update MongoDB first — this is the source of truth
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            subscriptionUpdate,
            { new: true }
        )

        // If the user was on a reverse trial, mark it as converted so the cron
        // job does NOT downgrade them at trial end.
        await User.findByIdAndUpdate(userId, {
            $set: {
                'subscription.reverseTrial.active': false,
                'subscription.reverseTrial.converted': true,
            },
        })

        // Sync tier to Clerk publicMetadata so the JWT reflects the correct tier.
        // This powers any frontend logic that reads from the Clerk session.
        // Failure is non-fatal — MongoDB remains the authoritative source.
        if (updatedUser?.clerkId) {
            clerkClient.users.updateUser(updatedUser.clerkId, {
                publicMetadata: {
                    subscriptionTier: normalizedTier,
                    subscriptionStatus: 'active',
                    subscriptionEndDate: endDate.toISOString(),
                }
            }).catch(err => console.error(`Clerk metadata sync failed for user ${userId}:`, err.message))
        }

        console.log(`✅ Subscription activated for user ${userId}: ${tier} → ${normalizedTier} (${duration})${paypalSubscriptionId ? ` [PayPal sub: ${paypalSubscriptionId}]` : ''}`)
    }

    /**
     * Get subscription pricing
     * @param {string} tier - Subscription tier (free/pro)
     * @param {string} duration - Duration (monthly/yearly)
     * @param {string} currency - Currency code (USD/INR)
     */
    getSubscriptionPricing(tier, duration, currency = 'USD') {
        const pricingUSD = {
            free: { monthly: 0, yearly: 0 },
            pro: { monthly: 9.99, yearly: 79.99 },       // yearly saves 33% (4 months free)
            basic: { monthly: 4.99, yearly: 49.99 },
            business: { monthly: 39.00, yearly: 390.00 },
            enterprise: { monthly: 24.99, yearly: 249.99 },
        }

        const pricingINR = {
            free: { monthly: 0, yearly: 0 },
            pro: { monthly: 999, yearly: 7999 },
            basic: { monthly: 499, yearly: 4999 },
            business: { monthly: 3299, yearly: 32999 },
            enterprise: { monthly: 2499, yearly: 24999 },
        }

        const pricing = currency === 'INR' ? pricingINR : pricingUSD
        const tierKey = tier.toLowerCase()

        if (!pricing[tierKey] || pricing[tierKey][duration] === undefined) {
            throw new Error(`Invalid tier (${tier}) or duration (${duration}). Valid tiers: free, pro, basic, enterprise.`)
        }

        return {
            amount: pricing[tierKey][duration],
            tier,
            duration,
            currency,
        }
    }

}

export default new PaymentService()
