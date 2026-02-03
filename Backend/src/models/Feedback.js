import mongoose from 'mongoose'

const feedbackSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        email: String,
        type: {
            type: String,
            enum: ['bug', 'feature', 'improvement', 'general'],
            required: true,
        },
        subject: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
        },
        status: {
            type: String,
            enum: ['new', 'in_progress', 'resolved', 'closed'],
            default: 'new',
        },
        attachments: [String],
        metadata: {
            userAgent: String,
            url: String,
            browser: String,
        },
        adminNotes: String,
        resolvedAt: Date,
    },
    {
        timestamps: true,
    }
)

feedbackSchema.index({ status: 1, priority: 1 })
feedbackSchema.index({ user: 1, createdAt: -1 })

const Feedback = mongoose.model('Feedback', feedbackSchema)

export default Feedback
