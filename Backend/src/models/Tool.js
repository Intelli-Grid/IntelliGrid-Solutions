import mongoose from 'mongoose'
import slugify from 'slugify'

const toolSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Tool name is required'],
            trim: true,
            maxlength: [200, 'Tool name cannot exceed 200 characters'],
        },
        slug: {
            type: String,
            unique: true,
            lowercase: true,
            index: true,
        },
        officialUrl: {
            type: String,
            required: [true, 'Official URL is required'],
            trim: true,
        },
        sourceUrl: {
            type: String,
            required: [true, 'Source URL is required'],
            trim: true,
        },
        shortDescription: {
            type: String,
            required: [true, 'Short description is required'],
            maxlength: [500, 'Short description cannot exceed 500 characters'],
        },
        fullDescription: {
            type: String,
            required: [true, 'Full description is required'],
        },
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
        },
        tags: [{
            type: String,
            trim: true,
        }],
        pricing: {
            type: String,
            enum: ['Free', 'Freemium', 'Paid', 'Trial', 'Unknown'],
            default: 'Unknown',
        },
        features: [{
            type: String,
        }],
        ratings: {
            average: {
                type: Number,
                default: 0,
                min: 0,
                max: 5,
            },
            count: {
                type: Number,
                default: 0,
            },
        },
        views: {
            type: Number,
            default: 0,
        },
        favorites: {
            type: Number,
            default: 0,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        isToolOfTheDay: {
            type: Boolean,
            default: false,
        },
        isTrending: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['active', 'pending', 'rejected', 'archived'],
            default: 'active',
        },
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        metadata: {
            logo: String,
            screenshots: [String],
            videoUrl: String,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
)

// Generate slug before saving
toolSchema.pre('save', function (next) {
    if (!this.slug) {
        this.slug = slugify(this.name, { lower: true, strict: true })
    }
    next()
})

// Indexes for search optimization
toolSchema.index({ name: 'text', shortDescription: 'text', fullDescription: 'text' })
toolSchema.index({ category: 1, status: 1 })
toolSchema.index({ status: 1, isFeatured: 1 }) // Optimize featured active tools
toolSchema.index({ status: 1, isTrending: 1 }) // Optimize trending active tools
toolSchema.index({ status: 1, views: -1 }) // Optimize most viewed active tools
toolSchema.index({ status: 1, createdAt: -1 }) // Optimize latest active tools

const Tool = mongoose.model('Tool', toolSchema)

export default Tool
