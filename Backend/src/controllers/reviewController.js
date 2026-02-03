import reviewService from '../services/reviewService.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'

/**
 * Review Controller - Handle review requests
 */
class ReviewController {
    /**
     * Get reviews for a tool
     * GET /api/v1/reviews/tool/:toolId
     */
    getReviews = asyncHandler(async (req, res) => {
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            status: req.query.status || 'approved',
        }

        const result = await reviewService.getReviewsForTool(
            req.params.toolId,
            options
        )

        res.status(200).json(
            new ApiResponse(200, result, 'Reviews retrieved successfully')
        )
    })

    /**
     * Create review
     * POST /api/v1/reviews
     */
    createReview = asyncHandler(async (req, res) => {
        const review = await reviewService.createReview(req.user._id, req.body)

        res.status(201).json(
            new ApiResponse(201, review, 'Review submitted successfully. It will be visible after approval.')
        )
    })

    /**
     * Update review
     * PUT /api/v1/reviews/:id
     */
    updateReview = asyncHandler(async (req, res) => {
        const review = await reviewService.updateReview(
            req.params.id,
            req.user._id,
            req.body
        )

        res.status(200).json(
            new ApiResponse(200, review, 'Review updated successfully')
        )
    })

    /**
     * Delete review
     * DELETE /api/v1/reviews/:id
     */
    deleteReview = asyncHandler(async (req, res) => {
        await reviewService.deleteReview(req.params.id, req.user._id)

        res.status(200).json(
            new ApiResponse(200, null, 'Review deleted successfully')
        )
    })

    /**
     * Mark review as helpful
     * POST /api/v1/reviews/:id/helpful
     */
    markHelpful = asyncHandler(async (req, res) => {
        const { isHelpful } = req.body

        const review = await reviewService.markHelpful(
            req.params.id,
            req.user._id,
            isHelpful
        )

        res.status(200).json(
            new ApiResponse(200, review, 'Feedback recorded successfully')
        )
    })

    /**
     * Moderate review (admin)
     * PUT /api/v1/reviews/:id/moderate
     */
    moderateReview = asyncHandler(async (req, res) => {
        const { status, notes } = req.body

        const review = await reviewService.moderateReview(
            req.params.id,
            status,
            notes
        )

        res.status(200).json(
            new ApiResponse(200, review, 'Review moderated successfully')
        )
    })

    /**
     * Get pending reviews (admin)
     * GET /api/v1/reviews/pending
     */
    getPendingReviews = asyncHandler(async (req, res) => {
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
        }

        const result = await reviewService.getPendingReviews(options)

        res.status(200).json(
            new ApiResponse(200, result, 'Pending reviews retrieved successfully')
        )
    })
}

export default new ReviewController()
