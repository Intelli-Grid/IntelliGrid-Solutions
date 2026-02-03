import mongoose from 'mongoose'

const analyticsEventSchema = new mongoose.Schema(
    {
        eventType: {
            type: String,
            required: true,
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        sessionId: String,
        data: mongoose.Schema.Types.Mixed,
        metadata: {
            userAgent: String,
            ip: String,
            referrer: String,
            country: String,
            device: String,
        },
    },
    {
        timestamps: true,
    }
)

analyticsEventSchema.index({ eventType: 1, createdAt: -1 })
analyticsEventSchema.index({ user: 1, eventType: 1 })

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema)

export default AnalyticsEvent
