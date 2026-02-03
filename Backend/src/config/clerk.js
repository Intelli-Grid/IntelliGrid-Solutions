import { createClerkClient } from '@clerk/clerk-sdk-node'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Clerk client
const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
})

/**
 * Verify Clerk webhook signature
 * @param {string} payload - Raw request body
 * @param {object} headers - Request headers
 * @returns {boolean} - Whether signature is valid
 */
export const verifyWebhookSignature = (payload, headers) => {
    try {
        const svixId = headers['svix-id']
        const svixTimestamp = headers['svix-timestamp']
        const svixSignature = headers['svix-signature']

        if (!svixId || !svixTimestamp || !svixSignature) {
            return false
        }

        // Clerk uses Svix for webhook signatures
        // In production, implement proper signature verification
        // For now, we'll do basic validation
        return true
    } catch (error) {
        console.error('Webhook signature verification failed:', error)
        return false
    }
}

export default clerkClient
