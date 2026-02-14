import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Tool from '../src/models/Tool.js'
import Category from '../src/models/Category.js'

dotenv.config()

const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB...')
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('✅ MongoDB Connected')
    } catch (error) {
        console.error('❌ Connection Error:', error.message)
        process.exit(1)
    }
}

const fixData = async () => {
    await connectDB()

    try {
        console.log('🔍 Scanning for tools with invalid category data (String vs ObjectId)...')

        // Bypass Mongoose casting by using the native collection driver
        // BSON Type 2 = String. We are looking for tools where category is stored as a string.
        const toolsCollection = mongoose.connection.collection('tools')
        const badTools = await toolsCollection.find({ category: { $type: 2 } }).toArray()

        if (badTools.length === 0) {
            console.log('✅ No bad data found! All tools have valid ObjectId categories.')
            process.exit(0)
        }

        console.log(`⚠️ Found ${badTools.length} tools with corrupted category data.`)

        for (const tool of badTools) {
            console.log(`\n🔧 Fixing Tool: "${tool.name}" (ID: ${tool._id})`)
            console.log(`   Current Category Value: "${tool.category}"`)

            // 1. Try to find the category by exact name or slug
            const catName = tool.category
            let category = await Category.findOne({
                $or: [{ name: catName }, { slug: catName }]
            })

            // 2. If not found, just pick the first valid category in DB (fallback)
            if (!category) {
                console.log(`   ❌ Category "${catName}" not found in DB. Fetching fallback...`)
                category = await Category.findOne()
            }

            if (category) {
                // 3. Update the tool with the valid ObjectId
                await toolsCollection.updateOne(
                    { _id: tool._id },
                    { $set: { category: category._id } }
                )
                console.log(`   ✅ UPDATED to Category ID: ${category._id} (${category.name})`)
            } else {
                console.log('   ❌ CRITICAL: No categories exist in the database. Cannot fix.')
            }
        }

        console.log('\n✨ All repairs completed.')
        process.exit(0)

    } catch (error) {
        console.error('❌ Fix failed:', error)
        process.exit(1)
    }
}

fixData()
