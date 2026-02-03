import mongoose from 'mongoose'

const abTestConversionSchema = new mongoose.Schema(
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
        conversionType: {
            type: String,
            required: true,
        },
        value: Number,
        metadata: mongoose.Schema.Types.Mixed,
    },
    {
        timestamps: true,
    }
)

abTestConversionSchema.index({ testName: 1, variant: 1, conversionType: 1 })
abTestConversionSchema.index({ user: 1, testName: 1 })

const AbTestConversion = mongoose.model('AbTestConversion', abTestConversionSchema)

export default AbTestConversion
