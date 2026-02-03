import mongoose from 'mongoose'

const submissionSchema = new mongoose.Schema(
    {
        toolName: {
            type: String,
            required: true,
            trim: true,
        },
        officialUrl: {
            type: String,
            required: true,
        },
        shortDescription: {
            type: String,
            required: true,
        },
        fullDescription: String,
        category: String,
        pricing: String,
        features: [String],
        submittedBy: {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            email: String,
            name: String,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        reviewNotes: String,
        reviewedAt: Date,
        approvedTool: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tool',
        },
    },
    {
        timestamps: true,
    }
)

submissionSchema.index({ status: 1, createdAt: -1 })
submissionSchema.index({ 'submittedBy.user': 1 })

const Submission = mongoose.model('Submission', submissionSchema)

export default Submission
