import User from '../models/User.js'
import { clerkClient } from '@clerk/clerk-sdk-node'

// Export user data (GDPR compliance)
export const exportUserData = async (req, res) => {
    try {
        const userId = req.userId // From auth middleware

        // Get user data from MongoDB
        const user = await User.findOne({ clerkUserId: userId }).lean()

        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        // Get user data from Clerk
        let clerkData = null
        try {
            clerkData = await clerkClient.users.getUser(userId)
        } catch (error) {
            console.error('Error fetching Clerk data:', error)
        }

        // Compile all user data
        const userData = {
            exportDate: new Date().toISOString(),
            exportType: 'GDPR Data Export',
            personalInformation: {
                clerkUserId: user.clerkUserId,
                email: user.email,
                name: user.name,
                profilePicture: user.profilePicture,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            subscription: {
                plan: user.subscriptionPlan,
                expiry: user.subscriptionExpiry,
                paymentMethod: user.paymentMethod,
            },
            favorites: user.favorites,
            clerkData: clerkData ? {
                emailAddresses: clerkData.emailAddresses,
                firstName: clerkData.firstName,
                lastName: clerkData.lastName,
                createdAt: clerkData.createdAt,
                updatedAt: clerkData.updatedAt,
            } : null,
        }

        res.json({
            success: true,
            data: userData,
            message: 'User data exported successfully',
        })
    } catch (error) {
        console.error('Export user data error:', error)
        res.status(500).json({ error: 'Failed to export user data' })
    }
}

// Delete user data (GDPR compliance)
export const deleteUserData = async (req, res) => {
    try {
        const userId = req.userId // From auth middleware

        // Get user data
        const user = await User.findOne({ clerkUserId: userId })

        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        // Check if user has active subscription
        const hasActiveSubscription = user.subscriptionPlan !== 'Free' &&
            user.subscriptionExpiry &&
            new Date(user.subscriptionExpiry) > new Date()

        if (hasActiveSubscription) {
            return res.status(400).json({
                error: 'Please cancel your active subscription before deleting your account',
                subscriptionPlan: user.subscriptionPlan,
                subscriptionExpiry: user.subscriptionExpiry,
            })
        }

        // Delete user from MongoDB
        await User.deleteOne({ clerkUserId: userId })

        // Delete user from Clerk
        try {
            await clerkClient.users.deleteUser(userId)
        } catch (error) {
            console.error('Error deleting Clerk user:', error)
            // Continue even if Clerk deletion fails
        }

        res.json({
            success: true,
            message: 'User data deleted successfully',
            deletedAt: new Date().toISOString(),
        })
    } catch (error) {
        console.error('Delete user data error:', error)
        res.status(500).json({ error: 'Failed to delete user data' })
    }
}

// Get user data summary (for account settings)
export const getUserDataSummary = async (req, res) => {
    try {
        const userId = req.userId

        const user = await User.findOne({ clerkUserId: userId }).lean()

        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }

        const summary = {
            accountCreated: user.createdAt,
            lastUpdated: user.updatedAt,
            dataCategories: {
                personalInfo: true,
                subscriptionData: user.subscriptionPlan !== 'Free',
                favorites: user.favorites && user.favorites.length > 0,
            },
            dataSize: {
                favorites: user.favorites ? user.favorites.length : 0,
            },
        }

        res.json({
            success: true,
            data: summary,
        })
    } catch (error) {
        console.error('Get user data summary error:', error)
        res.status(500).json({ error: 'Failed to get user data summary' })
    }
}
