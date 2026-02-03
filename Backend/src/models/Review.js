import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
    {
        tool: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tool',
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        rating: {
            type: Number,
            required: [true, 'Rating is required'],
            min: 1,
            max: 5,
        },
        title: {
            type: String,
            required: [true, 'Review title is required'],
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        content: {
            type: String,
            required: [true, 'Review content is required'],
            maxlength: [2000, 'Content cannot exceed 2000 characters'],
        },
        pros: [String],
        cons: [String],
        isVerified: {
            type: Boolean,
            default: false,
        },
        helpful: {
            type: Number,
            default: 0,
        },
        notHelpful: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
    },
    {
        timestamps: true,
    }
)

// Compound index to ensure one review per user per tool
reviewSchema.index({ tool: 1, user: 1 }, { unique: true })
reviewSchema.index({ tool: 1, status: 1 })

const Review = mongoose.model('Review', reviewSchema)

export default Review
