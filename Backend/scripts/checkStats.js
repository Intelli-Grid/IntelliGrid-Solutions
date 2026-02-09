/**
 * Check Database Statistics for AI Tools
 * Run with: node scripts/checkStats.js
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('✅ MongoDB connected')
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error)
        process.exit(1)
    }
}

const toolSchema = new mongoose.Schema({
    name: String,
    slug: String,
    updatedAt: Date,
    createdAt: { type: Date, default: Date.now }
})

const Tool = mongoose.model('Tool', toolSchema)

async function checkStats() {
    await connectDB()

    const totalTools = await Tool.countDocuments()

    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const newTools = await Tool.countDocuments({ createdAt: { $gte: oneDayAgo } })
    const updatedTools = await Tool.countDocuments({ updatedAt: { $gte: oneDayAgo } })

    console.log('\n📊 AI Tools Database Stats:')
    console.log('─────────────────────────────')
    console.log(`📦 Total Tools:       ${totalTools}`)
    console.log(`🆕 Added (24h):       ${newTools}`)
    console.log(`🔄 Updated (24h):     ${updatedTools}`)
    console.log('─────────────────────────────')

    if (newTools === 0 && updatedTools === 0) {
        console.log('⚠️  No activity in the last 24 hours. Check if the automation script ran successfully.')
    } else {
        console.log('✅ Database is active and updating!')
    }

    process.exit(0)
}

checkStats()
