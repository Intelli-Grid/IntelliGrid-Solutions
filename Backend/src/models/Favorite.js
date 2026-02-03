import mongoose from 'mongoose'

const favoriteSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        tool: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Tool',
            required: true,
        },
    },
    {
        timestamps: true,
    }
)

// Compound index to ensure one favorite per user per tool
favoriteSchema.index({ user: 1, tool: 1 }, { unique: true })
favoriteSchema.index({ user: 1, createdAt: -1 })

const Favorite = mongoose.model('Favorite', favoriteSchema)

export default Favorite
