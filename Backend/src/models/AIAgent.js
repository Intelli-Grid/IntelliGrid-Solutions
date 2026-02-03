import mongoose from 'mongoose'

const aiAgentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            required: true,
            enum: ['chatbot', 'assistant', 'analyzer', 'recommender', 'other'],
        },
        description: String,
        configuration: mongoose.Schema.Types.Mixed,
        model: {
            provider: String,
            modelName: String,
            version: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        usage: {
            totalRequests: {
                type: Number,
                default: 0,
            },
            successfulRequests: {
                type: Number,
                default: 0,
            },
            failedRequests: {
                type: Number,
                default: 0,
            },
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
)

aiAgentSchema.index({ type: 1, isActive: 1 })

const AIAgent = mongoose.model('AIAgent', aiAgentSchema)

export default AIAgent
