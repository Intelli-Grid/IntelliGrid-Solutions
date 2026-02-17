import mongoose from 'mongoose'
import slugify from 'slugify'

const collectionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a name for your collection'],
            trim: true,
            maxlength: [100, 'Name cannot execute 100 characters'],
        },
        slug: {
            type: String,
            unique: true,
            index: true,
        },
        description: {
            type: String,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        tools: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Tool',
            },
        ],
        isPublic: {
            type: Boolean,
            default: true,
        },
        views: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
)

// Generate slug before saving
collectionSchema.pre('save', function (next) {
    if (!this.isModified('name')) {
        next()
        return
    }
    this.slug = slugify(this.name, { lower: true, strict: true }) + '-' + Math.floor(Math.random() * 1000)
    next()
})

const Collection = mongoose.model('Collection', collectionSchema)

export default Collection
