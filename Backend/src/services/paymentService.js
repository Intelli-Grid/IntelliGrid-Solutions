import paypal from '../config/paypal.js'
import axios from 'axios'
import { getCashfreeBaseUrl, getCashfreeHeaders } from '../config/cashfree.js'
import Order from '../models/Order.js'
import User from '../models/User.js'
import Coupon from '../models/Coupon.js'
import ApiError from '../utils/ApiError.js'
import { nanoid } from 'nanoid'
import emailService from './emailService.js'

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
                        coupon: couponMeta?.couponId || null,
                        paymentGateway: 'paypal',
                        status: 'pending',
                    })

                    // Increment coupon usedCount only after gateway order is confirmed
                    if (couponMeta?.couponId) {
                        await Coupon.findByIdAndUpdate(couponMeta.couponId, { $inc: { usedCount: 1 } })
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
                        // Update order status
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
                            // Update user subscription
                            await this.activateSubscription(order.user._id, order.subscription)

                            // Send confirmation emails (async)
                            const subscriptionDetails = {
                                tier: order.subscription.tier,
                                duration: order.subscription.duration,
                                amount: `${order.amount.currency} ${order.amount.total}`,
                                nextBillingDate: new Date(Date.now() + (order.subscription.duration === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toLocaleDateString()
                            }

                            const paymentReceipt = {
                                id: payment.id,
                                createdAt: order.createdAt,
                                planName: `${order.subscription.tier} ${order.subscription.duration}`,
                                method: 'PayPal',
                                amount: `${order.amount.currency} ${order.amount.total}`
                            }

                            emailService.sendSubscriptionConfirmation(order.user, subscriptionDetails)
                                .catch(err => console.error('Failed to send subscription email:', err))

                            emailService.sendPaymentReceipt(order.user, paymentReceipt)
                                .catch(err => console.error('Failed to send receipt email:', err))
                        }

                        resolve({ payment, order })
                    }
                }
            )
        })
    }

    /**
     * Create Cashfree order
     */
    async createCashfreeOrder(userId, subscriptionData, couponMeta = null) {
        const { tier, duration } = subscriptionData

        // Calculate amount (INR for Cashfree)
        const pricing = this.getSubscriptionPricing(tier, duration, 'INR')

        // Apply coupon discount if present
        let finalAmount = pricing.amount
        let discountAmount = 0
        if (couponMeta) {
            if (couponMeta.discountType === 'percentage') {
                discountAmount = finalAmount * (couponMeta.discountValue / 100)
                if (couponMeta.maxDiscount) discountAmount = Math.min(discountAmount, couponMeta.maxDiscount)
            } else {
                // Fixed discount — treat as USD-equivalent ×83 for INR rough conversion
                discountAmount = couponMeta.discountValue * 83
            }
            finalAmount = Math.max(0, +(finalAmount - discountAmount).toFixed(2))
        }

        const orderData = {
            order_id: `order_${nanoid(16)}`,
            order_amount: finalAmount,
            order_currency: 'INR',
            customer_details: {
                customer_id: userId.toString(),
                customer_phone: '9999999999',
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

            console.log('Cashfree API Response:', JSON.stringify(response.data, null, 2))

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
                coupon: couponMeta?.couponId || null,
                paymentGateway: 'cashfree',
                status: 'pending',
            })

            // Increment coupon usedCount only after gateway order is confirmed
            if (couponMeta?.couponId) {
                await Coupon.findByIdAndUpdate(couponMeta.couponId, { $inc: { usedCount: 1 } })
            }

            const paymentSessionId = response.data.payment_session_id
            const orderId = response.data.order_id
            const cashfreeBase = getCashfreeBaseUrl()
            const checkoutUrl = `${cashfreeBase}/pay/${paymentSessionId}`

            return {
                orderId,
                paymentSessionId,
                payment_session_id: paymentSessionId,
                payment_link: checkoutUrl,
                paymentUrl: checkoutUrl,
                order,
            }
        } catch (error) {
            console.error('Cashfree order creation error:', error.response?.data || error.message)
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

            // Update order in database
            // Update order in database
            const order = await Order.findOneAndUpdate(
                { orderId },
                {
                    status: paymentStatus === 'PAID' ? 'completed' : 'failed',
                    'paymentDetails.transactionId': response.data.cf_order_id,
                },
                { new: true }
            ).populate('user')

            if (order && paymentStatus === 'PAID') {
                // Update user subscription
                await this.activateSubscription(order.user._id, order.subscription)

                // Send Emails
                const subscriptionDetails = {
                    tier: order.subscription.tier,
                    duration: order.subscription.duration,
                    amount: `${order.amount.currency} ${order.amount.total}`,
                    nextBillingDate: new Date(Date.now() + (order.subscription.duration === 'monthly' ? 30 : 365) * 24 * 60 * 60 * 1000).toLocaleDateString()
                }

                const paymentReceipt = {
                    id: response.data.cf_order_id || orderId,
                    createdAt: order.createdAt,
                    planName: `${order.subscription.tier} ${order.subscription.duration}`,
                    method: 'Cashfree',
                    amount: `${order.amount.currency} ${order.amount.total}`
                }

                emailService.sendSubscriptionConfirmation(order.user, subscriptionDetails)
                    .catch(err => console.error('Failed to send subscription email:', err))

                emailService.sendPaymentReceipt(order.user, paymentReceipt)
                    .catch(err => console.error('Failed to send receipt email:', err))
            }

            return { payment: response.data, order }
        } catch (error) {
            console.error('Cashfree verification error:', error)
            throw ApiError.internal('Failed to verify Cashfree payment')
        }
    }

    /**
     * Activate user subscription
     */
    async activateSubscription(userId, subscriptionData) {
        const { tier, duration } = subscriptionData

        // Map payment plan names → User model enum values
        // User.subscription.tier only accepts: 'Free' | 'Basic' | 'Premium' | 'Enterprise'
        const TIER_MAP = {
            'pro': 'Premium',
            'Pro': 'Premium',
            'premium': 'Premium',
            'basic': 'Basic',
            'Basic': 'Basic',
            'enterprise': 'Enterprise',
            'Enterprise': 'Enterprise',
            'free': 'Free',
            'Free': 'Free',
        }
        const normalizedTier = TIER_MAP[tier] || 'Premium'

        const startDate = new Date()
        const endDate = new Date()

        if (duration === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1)
        } else if (duration === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1)
        }

        await User.findByIdAndUpdate(userId, {
            'subscription.tier': normalizedTier,
            'subscription.status': 'active',
            'subscription.startDate': startDate,
            'subscription.endDate': endDate,
            'subscription.autoRenew': true,
        })

        console.log(`✅ Subscription activated for user ${userId}: ${tier} → ${normalizedTier} (${duration})`)
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
            pro: { monthly: 9, yearly: 89 },
        }

        const pricingINR = {
            free: { monthly: 0, yearly: 0 },
            pro: { monthly: 999, yearly: 8999 },
        }

        const pricing = currency === 'INR' ? pricingINR : pricingUSD

        if (!pricing[tier] || !pricing[tier][duration]) {
            throw new Error(`Invalid tier (${tier}) or duration (${duration})`)
        }

        return {
            amount: pricing[tier][duration],
            tier,
            duration,
            currency,
        }
    }

    /**
     * Apply coupon to an existing order (legacy endpoint — kept for backwards compat)
     * Prefer resolveCoupon() at order-creation time instead.
     */
    async applyCoupon(orderId, couponCode) {
        const order = await Order.findById(orderId)
        if (!order) throw ApiError.notFound('Order not found')

        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true })
        if (!coupon) throw ApiError.notFound('Invalid coupon code')

        const now = new Date()
        if (coupon.expiresAt && now > coupon.expiresAt) {
            throw ApiError.badRequest('Coupon has expired')
        }
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
            throw ApiError.badRequest('Coupon usage limit reached')
        }

        let discount = 0
        if (coupon.discountType === 'percentage') {
            discount = (order.amount.subtotal * coupon.discountValue) / 100
            if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount)
        } else {
            discount = coupon.discountValue
        }

        order.amount.discount = discount
        order.amount.total = Math.max(0, order.amount.subtotal - discount)
        order.coupon = coupon._id
        await order.save()

        await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } })

        return order
    }
}

export default new PaymentService()
