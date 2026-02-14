import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Category from '../src/models/Category.js'
import slugify from 'slugify'

dotenv.config()

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('✅ MongoDB Connected')
    } catch (error) {
        console.error('❌ Connection Error:', error)
        process.exit(1)
    }
}

const seed = async () => {
    await connectDB()

    try {
        const categories = [
            'News',
            'Uncategorized',
            'Developer Tools',
            'Design',
            'Writing',
            'Marketing'
        ]

        for (const name of categories) {
            const slug = slugify(name, { lower: true })
            const exists = await Category.findOne({ slug })

            if (exists) {
                console.log(`ℹ️ Category "${name}" already exists.`)
            } else {
                const cat = await Category.create({
                    name,
                    slug,
                    description: `${name} tools and resources`,
                    icon: 'Code' // Default icon
                })
                console.log(`✅ Created Category: "${name}" (ID: ${cat._id})`)
            }
        }

        console.log('✅ Seeding complete.')
        process.exit(0)
    } catch (error) {
        console.error('❌ Seeding failed:', error)
        process.exit(1)
    }
}

seed()
