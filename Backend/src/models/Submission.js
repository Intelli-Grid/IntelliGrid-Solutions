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
        // ── War Room Agent Scoring Fields ─────────────────────────────────
        // Set by submissionAnalyzer.js after the Submission Agent analyses the tool
        agentScore: {
            type: Number,
            min: 0,
            max: 100,
            default: null,
        },
        agentNotes: {
            type: String,
            default: null,
        },
        agentRecommendation: {
            type: String,
            enum: ['approve', 'review', 'reject', null],
            default: null,
        },
        agentCategory: {
            type: String,
            default: null,
        },
        agentProcessedAt: {
            type: Date,
            default: null,
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
