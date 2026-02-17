import mongoose from 'mongoose'

const subscriberSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, 'Please provide an email address'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email address',
            ],
        },
        source: {
            type: String,
            default: 'website', // e.g., 'footer', 'popup', 'blog'
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        preferences: {
            weeklyDigest: { type: Boolean, default: true },
            newTools: { type: Boolean, default: true },
            marketing: { type: Boolean, default: true }
        }
    },
    {
        timestamps: true,
    }
)

const Subscriber = mongoose.model('Subscriber', subscriberSchema)

export default Subscriber
