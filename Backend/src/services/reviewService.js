import Review from '../models/Review.js'
import Tool from '../models/Tool.js'
import User from '../models/User.js'
import ApiError from '../utils/ApiError.js'

/**
 * Review Service - Business logic for reviews
 */
class ReviewService {
    /**
     * Create review
     */
    async createReview(userId, reviewData) {
        const { tool, rating, title, content, pros, cons } = reviewData

        // Check if tool exists
        const toolExists = await Tool.findById(tool)
        if (!toolExists) {
            throw ApiError.notFound('Tool not found')
        }

        // Check if user already reviewed this tool
        const existingReview = await Review.findOne({ user: userId, tool })
        if (existingReview) {
            throw ApiError.conflict('You have already reviewed this tool')
        }

        // Create review
        const review = await Review.create({
            user: userId,
            tool,
            rating,
            title,
            content,
            pros,
            cons,
            status: 'pending', // Reviews need approval
        })

        // Update user stats
        await User.findByIdAndUpdate(userId, {
            $inc: { 'stats.reviewsWritten': 1 },
        })

        return review
    }

    /**
     * Get reviews for a tool
     */
    async getReviewsForTool(toolId, options = {}) {
        const { page = 1, limit = 10, status = 'approved' } = options
        const skip = (page - 1) * limit

        const [reviews, total] = await Promise.all([
            Review.find({ tool: toolId, status })
                .populate('user', 'firstName lastName avatar username')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .lean(),
            Review.countDocuments({ tool: toolId, status }),
        ])

        // Calculate rating distribution
        const ratingDistribution = await Review.aggregate([
            { $match: { tool: toolId, status: 'approved' } },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 },
                },
            },
        ])

        return {
            reviews,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            ratingDistribution,
        }
    }

    /**
     * Update review
     */
    async updateReview(reviewId, userId, updates) {
        const review = await Review.findOne({ _id: reviewId, user: userId })

        if (!review) {
            throw ApiError.notFound('Review not found')
        }

        // Only allow updating certain fields
        const allowedUpdates = ['rating', 'title', 'content', 'pros', 'cons']
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                review[key] = updates[key]
            }
        })

        // Reset status to pending after edit
        review.status = 'pending'

        await review.save()

        return review
    }

    /**
     * Delete review
     */
    async deleteReview(reviewId, userId) {
        const review = await Review.findOneAndDelete({ _id: reviewId, user: userId })

        if (!review) {
            throw ApiError.notFound('Review not found')
        }

        // Update user stats
        await User.findByIdAndUpdate(userId, {
            $inc: { 'stats.reviewsWritten': -1 },
        })

        // Update tool ratings
        await this.updateToolRatings(review.tool)

        return review
    }

    /**
     * Mark review as helpful
     */
    async markHelpful(reviewId, userId, isHelpful = true) {
        const review = await Review.findById(reviewId)

        if (!review) {
            throw ApiError.notFound('Review not found')
        }

        if (isHelpful) {
            review.helpful += 1
        } else {
            review.notHelpful += 1
        }

        await review.save()

        return review
    }

    /**
     * Moderate review (admin)
     */
    async moderateReview(reviewId, status, adminNotes = '') {
        const review = await Review.findByIdAndUpdate(
            reviewId,
            { status, reviewNotes: adminNotes },
            { new: true }
        )

        if (!review) {
            throw ApiError.notFound('Review not found')
        }

        // If approved, update tool ratings
        if (status === 'approved') {
            await this.updateToolRatings(review.tool)
        }

        return review
    }

    /**
     * Update tool ratings based on approved reviews
     */
    async updateToolRatings(toolId) {
        const reviews = await Review.find({ tool: toolId, status: 'approved' })

        if (reviews.length === 0) {
            await Tool.findByIdAndUpdate(toolId, {
                'ratings.average': 0,
                'ratings.count': 0,
            })
            return
        }

        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
        const average = totalRating / reviews.length

        await Tool.findByIdAndUpdate(toolId, {
            'ratings.average': Math.round(average * 10) / 10, // Round to 1 decimal
            'ratings.count': reviews.length,
        })
    }

    /**
     * Get pending reviews (admin)
     */
    async getPendingReviews(options = {}) {
        const { page = 1, limit = 20 } = options
        const skip = (page - 1) * limit

        const [reviews, total] = await Promise.all([
            Review.find({ status: 'pending' })
                .populate('user', 'firstName lastName email')
                .populate('tool', 'name slug')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .lean(),
            Review.countDocuments({ status: 'pending' }),
        ])

        return {
            reviews,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        }
    }
}

export default new ReviewService()
