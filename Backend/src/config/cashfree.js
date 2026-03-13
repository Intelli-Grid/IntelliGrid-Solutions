import dotenv from 'dotenv'
import crypto from 'crypto'

dotenv.config()

/**
 * Cashfree Configuration
 * Supports both TEST and PRODUCTION environments.
 * Set CASHFREE_ENV=PROD in Railway env vars before launch.
 */
const cashfreeConfig = {
    appId: process.env.CASHFREE_APP_ID,
    secretKey: process.env.CASHFREE_SECRET_KEY,
    environment: process.env.CASHFREE_ENV || 'PROD', // PROD for production — never fallback to TEST on live server
    apiVersion: '2023-08-01',
}

/**
 * Get Cashfree API base URL based on environment
 * @returns {string} Base URL (PROD vs sandbox)
 */
export const getCashfreeBaseUrl = () => {
    const env = (cashfreeConfig.environment || 'TEST').toUpperCase()
    const isProd = env === 'PROD' || env === 'PRODUCTION' || env === 'LIVE'
    
    return isProd
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg'
}

/**
 * Generate Cashfree request authorization headers
 * @returns {object} Authorization headers
 */
export const getCashfreeHeaders = () => {
    return {
        'x-client-id': cashfreeConfig.appId,
        'x-client-secret': cashfreeConfig.secretKey,
        'x-api-version': cashfreeConfig.apiVersion,
        'Content-Type': 'application/json',
    }
}

/**
 * Verify Cashfree webhook signature using HMAC-SHA256.
 * ✅ Bug #2b Fix: was always returning true — now performs real signature verification.
 *
 * Cashfree sends:
 *   x-webhook-signature  — base64(HMAC-SHA256(timestamp + rawBody, secretKey))
 *   x-webhook-timestamp  — unix timestamp string
 *
 * @param {string} signature - Value of x-webhook-signature header
 * @param {string} timestamp - Value of x-webhook-timestamp header
 * @param {string} rawBody   - Raw request body as string (MUST be the raw string, not parsed JSON)
 * @returns {boolean} Whether signature is valid
 */
export const verifyCashfreeWebhook = (signature, timestamp, rawBody) => {
    try {
        if (!signature || !timestamp || !rawBody) {
            console.warn('⚠️  Cashfree webhook: missing signature, timestamp, or body')
            return false
        }

        const secret = cashfreeConfig.secretKey
        if (!secret) {
            console.error('❌ CASHFREE_SECRET_KEY not set — cannot verify Cashfree webhook signature')
            return false
        }

        // Cashfree signature = HMAC-SHA256(timestamp + rawBody, secretKey) → base64
        const signedPayload = timestamp + rawBody
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(signedPayload)
            .digest('base64')

        const isValid = expectedSignature === signature
        if (!isValid) {
            console.warn('⚠️  Cashfree webhook signature verification FAILED')
            console.warn('   Expected:', expectedSignature)
            console.warn('   Got:     ', signature)
        }
        return isValid
    } catch (error) {
        console.error('❌ Cashfree webhook verification error:', error.message)
        return false
    }
}

export default cashfreeConfig
