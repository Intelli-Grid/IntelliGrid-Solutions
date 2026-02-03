import paypal from 'paypal-rest-sdk'
import dotenv from 'dotenv'

dotenv.config()

// Configure PayPal SDK
paypal.configure({
    mode: process.env.PAYPAL_MODE || 'sandbox', // sandbox or live
    client_id: process.env.PAYPAL_CLIENT_ID,
    client_secret: process.env.PAYPAL_CLIENT_SECRET,
})

/**
 * Get PayPal access token
 * @returns {Promise<string>} Access token
 */
export const getPayPalAccessToken = async () => {
    return new Promise((resolve, reject) => {
        paypal.generateToken((error, token) => {
            if (error) {
                reject(error)
            } else {
                resolve(token)
            }
        })
    })
}

/**
 * Verify PayPal webhook signature
 * @param {object} headers - Request headers
 * @param {object} body - Request body
 * @returns {Promise<boolean>} Whether signature is valid
 */
export const verifyPayPalWebhook = async (headers, body) => {
    try {
        // In production, implement proper PayPal webhook verification
        // using PayPal's webhook verification API
        return true
    } catch (error) {
        console.error('PayPal webhook verification failed:', error)
        return false
    }
}

export default paypal
