
import mongoose from 'mongoose'

const claimRequestSchema = new mongoose.Schema(
    {
        tool: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tool',
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false, // user might not be logged in or registered yet
        },
        email: {
            type: String,
            required: [true, 'Work email is required'],
            trim: true,
            lowercase: true,
        },
        role: {
            type: String,
            required: [true, 'Role/Position is required'],
            trim: true,
        },
        verificationInfo: {
            type: String,
            required: false,
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
        reviewedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
)

// Index for getting pending requests quickly
claimRequestSchema.index({ status: 1, createdAt: -1 })
// Prevent spam from same email for same tool
claimRequestSchema.index({ tool: 1, email: 1 }, { unique: true })

const ClaimRequest = mongoose.model('ClaimRequest', claimRequestSchema)

export default ClaimRequest
