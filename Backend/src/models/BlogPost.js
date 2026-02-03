import mongoose from 'mongoose'

const blogPostSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },
        excerpt: String,
        content: {
            type: String,
            required: true,
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        featuredImage: String,
        category: String,
        tags: [String],
        status: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
        },
        views: {
            type: Number,
            default: 0,
        },
        publishedAt: Date,
    },
    {
        timestamps: true,
    }
)

blogPostSchema.index({ slug: 1 })
blogPostSchema.index({ status: 1, publishedAt: -1 })

const BlogPost = mongoose.model('BlogPost', blogPostSchema)

export default BlogPost
