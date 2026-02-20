import mongoose from 'mongoose'

const searchLogSchema = new mongoose.Schema(
    {
        query: {
            type: String,
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        sessionId: String,
        filters: mongoose.Schema.Types.Mixed,
        resultsCount: Number,
        clickedResults: [{
            tool: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Tool',
            },
            position: Number,
        }],
        metadata: {
            userAgent: String,
            ip: String,
        },
    },
    {
        timestamps: true,
    }
)

searchLogSchema.index({ query: 'text' })
searchLogSchema.index({ user: 1, createdAt: -1 })
searchLogSchema.index({ createdAt: -1 })

// ✅ Bug Fix: TTL index — auto-delete search logs after 90 days for data hygiene
searchLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

const SearchLog = mongoose.model('SearchLog', searchLogSchema)

export default SearchLog
