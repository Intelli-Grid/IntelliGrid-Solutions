import Subscriber from '../models/Subscriber.js'
import emailService from '../services/emailService.js'
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

class NewsletterController {
    /**
     * Subscribe to newsletter
     * POST /api/v1/newsletter/subscribe
     */
    subscribe = asyncHandler(async (req, res) => {
        const { email, source = 'website' } = req.body

        if (!email) {
            throw new ApiError(400, 'Email is required')
        }

        // 1. Check if already exists
        const existingSubscriber = await Subscriber.findOne({ email })
        if (existingSubscriber) {
            if (!existingSubscriber.isActive) {
                // Reactivate
                existingSubscriber.isActive = true
                await existingSubscriber.save()

                // Ensure synced with Brevo
                await emailService.addSubscriber(email, { SOURCE: source })

                return res.status(200).json(new ApiResponse(200, existingSubscriber, 'Welcome back! You have been resubscribed.'))
            }
            // Already active
            return res.status(200).json(new ApiResponse(200, existingSubscriber, 'You are already subscribed!'))
        }

        // 2. Create new subscriber
        const newSubscriber = await Subscriber.create({
            email,
            source
        })

        // 3. Add to Brevo
        // We do this asynchronously/await but it shouldn't block main response too much? 
        // Sync is better for feedback if Brevo fails (e.g. invalid email).
        const brevoResult = await emailService.addSubscriber(email, { SOURCE: source })

        if (!brevoResult) {
            // Note: If Brevo fails, we might still want to keep them in DB or rollback?
            // For now, keep in DB but log error.
            console.warn(`Failed to add ${email} to Brevo list.`)
        }

        res.status(201).json(new ApiResponse(201, newSubscriber, 'Successfully subscribed to the newsletter!'))
    })

    /**
     * Unsubscribe
     * POST /api/v1/newsletter/unsubscribe
     */
    unsubscribe = asyncHandler(async (req, res) => {
        const { email } = req.body

        if (!email) {
            throw new ApiError(400, 'Email is required')
        }

        const subscriber = await Subscriber.findOne({ email })
        if (!subscriber) {
            throw new ApiError(404, 'Subscriber not found')
        }

        subscriber.isActive = false
        await subscriber.save()

        // TODO: Remove from Brevo list or update attribute?
        // emailService.removeSubscriber(email) // Not implemented yet

        res.status(200).json(new ApiResponse(200, null, 'You have been unsubscribed.'))
    })
}

export default new NewsletterController()
