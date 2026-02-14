#!/usr/bin/env node

/**
 * UPDATE TOOLS STATUS SCRIPT
 * Updates all active tools to 'published' status for sitemap generation
 */

import mongoose from 'mongoose'
import Tool from '../src/models/Tool.js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

console.log('🔧 UPDATING TOOLS STATUS')
console.log('='.repeat(60))
console.log('')

// Connect to MongoDB
try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Check current status
    const totalTools = await Tool.countDocuments()
    const publishedTools = await Tool.countDocuments({ status: 'published' })
    const activeTools = await Tool.countDocuments({ isActive: true })
    const pendingTools = await Tool.countDocuments({ status: 'pending' })

    console.log('\n📊 Current Status:')
    console.log(`   Total tools: ${totalTools}`)
    console.log(`   Published: ${publishedTools}`)
    console.log(`   Active: ${activeTools}`)
    console.log(`   Pending: ${pendingTools}`)

    // Update all active tools to published
    console.log('\n🔄 Updating all active tools to published status...')

    const result = await Tool.updateMany(
        { isActive: true },
        { $set: { status: 'published' } }
    )

    console.log(`\n✅ Updated ${result.modifiedCount} tools to published status`)

    // Verify update
    const newPublishedCount = await Tool.countDocuments({ status: 'published' })
    console.log(`✅ New published count: ${newPublishedCount}`)

    console.log('\n🎉 Status update complete!')
    console.log('\nNext step: Regenerate sitemap with:')
    console.log('   npm run generate-sitemap')

} catch (error) {
    console.error('❌ Error:', error.message)
} finally {
    await mongoose.disconnect()
    process.exit(0)
}
