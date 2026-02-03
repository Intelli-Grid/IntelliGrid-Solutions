import mongoose from 'mongoose'

const webhookLogSchema = new mongoose.Schema(
    {
        source: {
            type: String,
            required: true,
            enum: ['clerk', 'paypal', 'cashfree', 'algolia', 'other'],
        },
        eventType: {
            type: String,
            required: true,
        },
        payload: mongoose.Schema.Types.Mixed,
        headers: mongoose.Schema.Types.Mixed,
        status: {
            type: String,
            enum: ['received', 'processing', 'success', 'failed'],
            default: 'received',
        },
        error: String,
        processedAt: Date,
    },
    {
        timestamps: true,
    }
)

webhookLogSchema.index({ source: 1, eventType: 1, createdAt: -1 })
webhookLogSchema.index({ status: 1 })

const WebhookLog = mongoose.model('WebhookLog', webhookLogSchema)

export default WebhookLog
