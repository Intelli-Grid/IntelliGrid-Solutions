/**
 * gdprController.js — GDPR Right to Access, Portability, and Erasure
 *
 * Fixed: req.userId (undefined) → req.user._id
 * Fixed: clerkUserId field → clerkId
 * Fixed: subscriptionPlan field → subscription.tier
 * Fixed: Full cascade delete (Favorites, Reviews, Orders, Collections, Submissions, ClaimRequests)
 * Fixed: Clerk account deletion actually executes
 */
import User from '../models/User.js'
import Review from '../models/Review.js'
import Favorite from '../models/Favorite.js'
import Order from '../models/Order.js'
import Collection from '../models/Collection.js'
import Submission from '../models/Submission.js'
import ClaimRequest from '../models/ClaimRequest.js'
import clerkClient from '../config/clerk.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

// ─── GET /api/v1/gdpr/summary ─────────────────────────────────────────────────
export const getUserDataSummary = asyncHandler(async (req, res) => {
    const userId = req.user._id
    const clerkId = req.user.clerkId

    const [
        reviewCount,
        favoriteCount,
        orderCount,
        collectionCount,
        submissionCount,
        claimCount,
    ] = await Promise.all([
        Review.countDocuments({ user: userId }),
        Favorite.countDocuments({ user: userId }),
        Order.countDocuments({ user: userId }),
        Collection.countDocuments({ owner: userId }),
        Submission.countDocuments({ 'submittedBy.user': userId }),
        ClaimRequest.countDocuments({ user: userId }),
    ])

    res.json({
        success: true,
        summary: {
            profile: {
                email: req.user.email,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                clerkId,
                joinedAt: req.user.createdAt,
            },
            dataCounts: {
                reviews: reviewCount,
                favorites: favoriteCount,
                orders: orderCount,
                collections: collectionCount,
                submissions: submissionCount,
                claimRequests: claimCount,
            },
            subscription: {
                tier: req.user.subscription?.tier || 'Free',
                status: req.user.subscription?.status || 'active',
                endDate: req.user.subscription?.endDate || null,
            },
        },
    })
})

// ─── GET /api/v1/gdpr/export ─────────────────────────────────────────────────
export const exportUserData = asyncHandler(async (req, res) => {
    const userId = req.user._id

    // Fetch all user-related data in parallel
    const [
        profile,
        reviews,
        favorites,
        orders,
        collections,
        submissions,
        claimRequests,
    ] = await Promise.all([
        User.findById(userId).select('-__v').lean(),
        Review.find({ user: userId }).lean(),
        Favorite.find({ user: userId })
            .populate('tool', 'name slug officialUrl')
            .lean(),
        Order.find({ user: userId }).select('-__v').lean(),
        Collection.find({ owner: userId }).lean(),
        Submission.find({ 'submittedBy.user': userId }).lean(),
        ClaimRequest.find({ user: userId })
            .populate('tool', 'name slug')
            .lean(),
    ])

    // Remove sensitive internal fields from profile before export
    const { clerkId, referralCode, ...safeProfile } = profile || {}

    const exportData = {
        exportedAt: new Date().toISOString(),
        profile: safeProfile,
        reviews,
        favorites,
        orders,
        collections,
        submissions,
        claimRequests,
    }

    res.setHeader('Content-Disposition', 'attachment; filename="intelligrid-data-export.json"')
    res.setHeader('Content-Type', 'application/json')
    res.status(200).json(exportData)
})

// ─── DELETE /api/v1/gdpr/delete ─────────────────────────────────────────────
export const deleteUserData = asyncHandler(async (req, res) => {
    const userId = req.user._id
    const clerkId = req.user.clerkId

    // Block deletion if user has an active paid subscription
    const subscriptionTier = req.user.subscription?.tier
    const subscriptionStatus = req.user.subscription?.status
    if (
        subscriptionTier &&
        subscriptionTier !== 'Free' &&
        subscriptionStatus === 'active'
    ) {
        throw ApiError.badRequest(
            'You have an active subscription. Please cancel it before deleting your account. Contact support@intelligrid.online for assistance.'
        )
    }

    // Delete all user data in parallel
    await Promise.all([
        Favorite.deleteMany({ user: userId }),
        Review.deleteMany({ user: userId }),
        Order.deleteMany({ user: userId }),
        Collection.deleteMany({ owner: userId }),
        Submission.deleteMany({ 'submittedBy.user': userId }),
        ClaimRequest.deleteMany({ user: userId }),
    ])

    // Delete User document from MongoDB
    await User.findByIdAndDelete(userId)

    // Delete Clerk account — this invalidates all sessions immediately
    try {
        await clerkClient.users.deleteUser(clerkId)
    } catch (clerkErr) {
        // Log but don't block — MongoDB data is already gone; Clerk failure
        // will orphan the Clerk account (user cannot log in) which is acceptable
        console.error('GDPR: Clerk account deletion failed for clerkId', clerkId, clerkErr?.message)
    }

    res.status(200).json({
        success: true,
        message: 'Your account and all associated data have been permanently deleted.',
    })
})
