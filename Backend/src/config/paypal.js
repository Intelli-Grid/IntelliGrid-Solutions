/**
 * paypal.js — PayPal API integration
 *
 * Uses PayPal's REST API v1/v2 directly via axios.
 * The legacy `paypal-rest-sdk` package was removed because it depended on
 * the abandoned `request` library, which contained unfixable high-severity
 * vulnerabilities (qs, tough-cookie, form-data).
 *
 * This module exposes a drop-in replacement surface matching what
 * paymentService.js previously used from paypal-rest-sdk:
 *   paypal.payment.create(json, callback)
 *   paypal.payment.execute(paymentId, { payer_id }, callback)
 *
 * Plus the standalone exports:
 *   getPayPalAccessToken()
 *   verifyPayPalWebhook(headers, body)
 */
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the correct PayPal API base URL for the current environment.
 */
const getBaseUrl = () => {
    const mode = process.env.PAYPAL_MODE || 'sandbox'
    return mode === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com'
}

/**
 * Get a short-lived OAuth2 access token from PayPal.
 * @returns {Promise<string>} Bearer token
 */
export const getPayPalAccessToken = async () => {
    const response = await axios.post(
        `${getBaseUrl()}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
            auth: {
                username: process.env.PAYPAL_CLIENT_ID,
                password: process.env.PAYPAL_CLIENT_SECRET,
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
    )
    return response.data.access_token
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify PayPal webhook signature using PayPal's verification API.
 * ✅ Real cryptographic verification — not a stub.
 *
 * @param {object}        headers - Request headers from PayPal
 * @param {string|object} body    - Raw request body (string) or parsed object
 * @returns {Promise<boolean>}
 */
export const verifyPayPalWebhook = async (headers, body) => {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID

    if (!webhookId) {
        console.error('❌ PAYPAL_WEBHOOK_ID not set — cannot verify PayPal webhook signature')
        return false
    }

    try {
        const accessToken = await getPayPalAccessToken()

        const response = await axios.post(
            `${getBaseUrl()}/v1/notifications/verify-webhook-signature`,
            {
                auth_algo: headers['paypal-auth-algo'],
                cert_url: headers['paypal-cert-url'],
                transmission_id: headers['paypal-transmission-id'],
                transmission_sig: headers['paypal-transmission-sig'],
                transmission_time: headers['paypal-transmission-time'],
                webhook_id: webhookId,
                webhook_event: typeof body === 'string' ? JSON.parse(body) : body,
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        )

        const isValid = response.data.verification_status === 'SUCCESS'
        if (!isValid) {
            console.warn('⚠️  PayPal webhook verification FAILED:', response.data)
        }
        return isValid
    } catch (error) {
        console.error('❌ PayPal webhook verification error:', error.response?.data || error.message)
        return false
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Drop-in replacement for paypal-rest-sdk's payment API
// Used by paymentService.js
// ─────────────────────────────────────────────────────────────────────────────

const paypalService = {
    payment: {
        /**
         * Create a PayPal payment (v1/payments API — compatible with old SDK shape)
         * @param {object}   json      - PayPal payment JSON
         * @param {Function} callback  - (error, payment) callback
         */
        create: async (json, callback) => {
            try {
                const token = await getPayPalAccessToken()
                const response = await axios.post(
                    `${getBaseUrl()}/v1/payments/payment`,
                    json,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                )
                callback(null, response.data)
            } catch (error) {
                const err = error.response?.data || error
                console.error('❌ PayPal payment.create error:', err)
                callback(err, null)
            }
        },

        /**
         * Execute (capture) a PayPal payment
         * @param {string}   paymentId   - Payment ID from create
         * @param {object}   executeData - { payer_id }
         * @param {Function} callback    - (error, payment) callback
         */
        execute: async (paymentId, executeData, callback) => {
            try {
                const token = await getPayPalAccessToken()
                const response = await axios.post(
                    `${getBaseUrl()}/v1/payments/payment/${paymentId}/execute`,
                    executeData,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                )
                callback(null, response.data)
            } catch (error) {
                const err = error.response?.data || error
                console.error('❌ PayPal payment.execute error:', err)
                callback(err, null)
            }
        },
    },
}

// ─────────────────────────────────────────────────────────────────────────────
// PayPal Subscriptions API v2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a PayPal subscription using the Subscriptions API v2.
 *
 * Requires a pre-created Billing Plan ID (created once in the PayPal dashboard
 * or via createBillingPlan() below).
 *
 * @param {string} planId    - PayPal Billing Plan ID (e.g. P-XXXXXXXXX)
 * @param {string} userId    - Our internal MongoDB user ID (stored in custom_id for webhook lookup)
 * @param {string} returnUrl - Frontend URL after PayPal approval
 * @param {string} cancelUrl - Frontend URL if user cancels
 * @returns {Promise<{subscriptionId: string, approveUrl: string}>}
 */
export const createPayPalSubscription = async (planId, userId, returnUrl, cancelUrl) => {
    const token = await getPayPalAccessToken()

    const response = await axios.post(
        `${getBaseUrl()}/v1/billing/subscriptions`,
        {
            plan_id: planId,
            custom_id: userId.toString(), // stored on every webhook event for user lookup
            application_context: {
                brand_name: 'IntelliGrid',
                locale: 'en-US',
                shipping_preference: 'NO_SHIPPING',
                user_action: 'SUBSCRIBE_NOW',
                return_url: returnUrl,
                cancel_url: cancelUrl,
            },
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
            },
        }
    )

    const subscription = response.data
    const approveLink = subscription.links?.find(l => l.rel === 'approve')

    if (!approveLink) {
        throw new Error('PayPal subscription created but no approve URL returned')
    }

    return {
        subscriptionId: subscription.id,
        approveUrl: approveLink.href,
        status: subscription.status,
    }
}

/**
 * Cancel a PayPal subscription via the Subscriptions API v2.
 *
 * @param {string} subscriptionId - PayPal subscription ID (e.g. I-XXXXXXXXX)
 * @param {string} reason         - Cancellation reason string shown to PayPal
 * @returns {Promise<void>}
 */
export const cancelPayPalSubscription = async (subscriptionId, reason = 'User requested cancellation') => {
    const token = await getPayPalAccessToken()

    await axios.post(
        `${getBaseUrl()}/v1/billing/subscriptions/${subscriptionId}/cancel`,
        { reason },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    )
}

/**
 * Get details of a PayPal subscription (useful for webhook verification cross-check).
 *
 * @param {string} subscriptionId
 * @returns {Promise<object>} PayPal subscription details
 */
export const getPayPalSubscription = async (subscriptionId) => {
    const token = await getPayPalAccessToken()
    const response = await axios.get(
        `${getBaseUrl()}/v1/billing/subscriptions/${subscriptionId}`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        }
    )
    return response.data
}

export default paypalService

