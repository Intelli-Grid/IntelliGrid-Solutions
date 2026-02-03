import mongoose from 'mongoose'

const abTestExposureSchema = new mongoose.Schema(
    {
        testName: {
            type: String,
            required: true,
            index: true,
        },
        variant: {
            type: String,
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        sessionId: String,
        metadata: mongoose.Schema.Types.Mixed,
    },
    {
        timestamps: true,
    }
)

abTestExposureSchema.index({ testName: 1, user: 1 })
abTestExposureSchema.index({ testName: 1, variant: 1 })

const AbTestExposure = mongoose.model('AbTestExposure', abTestExposureSchema)

export default AbTestExposure
