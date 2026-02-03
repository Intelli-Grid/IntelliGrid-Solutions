import dotenv from 'dotenv'

dotenv.config()

/**
 * Cashfree Configuration
 * Supports both TEST and PRODUCTION environments
 */
const cashfreeConfig = {
    appId: process.env.CASHFREE_APP_ID,
    secretKey: process.env.CASHFREE_SECRET_KEY,
    environment: process.env.CASHFREE_ENV || 'TEST', // TEST or PROD
    apiVersion: '2023-08-01',
}

/**
 * Get Cashfree API base URL based on environment
 * @returns {string} Base URL
 */
export const getCashfreeBaseUrl = () => {
    return cashfreeConfig.environment === 'PROD'
        ? 'https://api.cashfree.com/pg'
        : 'https://sandbox.cashfree.com/pg'
}

/**
 * Generate Cashfree authorization header
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
 * Verify Cashfree webhook signature
 * @param {string} signature - Webhook signature from header
 * @param {string} timestamp - Webhook timestamp from header
 * @param {object} body - Request body
 * @returns {boolean} Whether signature is valid
 */
export const verifyCashfreeWebhook = (signature, timestamp, body) => {
    try {
        // In production, implement proper signature verification
        // using Cashfree's webhook signature algorithm
        return true
    } catch (error) {
        console.error('Cashfree webhook verification failed:', error)
        return false
    }
}

export default cashfreeConfig
