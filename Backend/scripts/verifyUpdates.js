/**
 * Verification Script - Check Updated Tools
 * 
 * This script shows you exactly what was changed in the database
 * so you can verify before pushing to GitHub
 * 
 * Usage: node scripts/verifyUpdates.js
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import Tool from '../src/models/Tool.js'
import Category from '../src/models/Category.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('✅ MongoDB connected\n')
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error)
        process.exit(1)
    }
}

async function verifyUpdates() {
    console.log('🔍 VERIFICATION REPORT - Recent Database Updates\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    await connectDB()

    // 1. Check tools with logos
    const toolsWithLogos = await Tool.countDocuments({
        status: 'active',
        'metadata.logo': { $exists: true, $ne: '' }
    })

    const toolsWithoutLogos = await Tool.countDocuments({
        status: 'active',
        $or: [
            { 'metadata.logo': { $exists: false } },
            { 'metadata.logo': '' }
        ]
    })

    console.log('📊 LOGO COVERAGE:')
    console.log(`   ✅ Tools with Logos: ${toolsWithLogos}`)
    console.log(`   ❌ Tools without Logos: ${toolsWithoutLogos}`)
    console.log(`   📈 Coverage: ${((toolsWithLogos / (toolsWithLogos + toolsWithoutLogos)) * 100).toFixed(1)}%\n`)

    // 2. Check description quality
    const goodDescriptions = await Tool.countDocuments({
        status: 'active',
        shortDescription: { $exists: true, $regex: /^.{30,}$/ }
    })

    const poorDescriptions = await Tool.countDocuments({
        status: 'active',
        $or: [
            { shortDescription: { $exists: false } },
            { shortDescription: { $regex: /^.{0,29}$/ } }
        ]
    })

    console.log('📝 DESCRIPTION QUALITY:')
    console.log(`   ✅ Good Descriptions (>30 chars): ${goodDescriptions}`)
    console.log(`   ⚠️  Short Descriptions (<30 chars): ${poorDescriptions}\n`)

    // 3. Check category migration
    const validCategories = await Tool.countDocuments({
        status: 'active',
        category: { $type: 'objectId' }
    })

    const stringCategories = await Tool.countDocuments({
        status: 'active',
        category: { $type: 'string' }
    })

    console.log('🏷️  CATEGORY STATUS:')
    console.log(`   ✅ Valid ObjectId Categories: ${validCategories}`)
    console.log(`   ⚠️  String Categories (need migration): ${stringCategories}\n`)

    // 4. Sample recently updated tools
    console.log('📋 SAMPLE OF RECENTLY UPDATED TOOLS:\n')

    const recentlyUpdated = await Tool.find({
        status: 'active',
        'metadata.logo': { $exists: true, $ne: '' }
    })
        .sort({ updatedAt: -1 })
        .limit(10)
        .populate('category')
        .lean()

    recentlyUpdated.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}`)
        console.log(`   🔗 URL: ${tool.officialUrl}`)
        console.log(`   🖼️  Logo: ${tool.metadata?.logo ? '✅ Present' : '❌ Missing'}`)
        console.log(`   📝 Description: ${tool.shortDescription?.substring(0, 60)}...`)
        console.log(`   🏷️  Category: ${tool.category?.name || 'Not Set'}`)
        console.log(`   📅 Last Updated: ${new Date(tool.updatedAt).toLocaleString()}\n`)
    })

    // 5. Check for potential issues
    console.log('⚠️  POTENTIAL ISSUES:\n')

    const duplicateSlugs = await Tool.aggregate([
        { $group: { _id: '$slug', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $limit: 5 }
    ])

    if (duplicateSlugs.length > 0) {
        console.log(`   ⚠️  Found ${duplicateSlugs.length} duplicate slugs:`)
        duplicateSlugs.forEach(d => console.log(`      - ${d._id} (${d.count} occurrences)`))
    } else {
        console.log('   ✅ No duplicate slugs found')
    }

    const brokenUrls = await Tool.countDocuments({
        status: 'active',
        $or: [
            { officialUrl: { $exists: false } },
            { officialUrl: '' }
        ]
    })

    console.log(`   ${brokenUrls > 0 ? '⚠️' : '✅'} Tools with missing URLs: ${brokenUrls}`)

    // 6. Overall health score
    const totalActive = await Tool.countDocuments({ status: 'active' })
    const healthScore = (
        (toolsWithLogos / totalActive) * 40 +
        (goodDescriptions / totalActive) * 30 +
        (validCategories / totalActive) * 30
    ).toFixed(1)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`\n🎯 DATABASE HEALTH SCORE: ${healthScore}%\n`)

    if (healthScore >= 90) {
        console.log('✅ Excellent! Database is in great shape.')
    } else if (healthScore >= 70) {
        console.log('⚠️  Good, but could use more polishing.')
    } else {
        console.log('❌ Needs significant improvement.')
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    await mongoose.disconnect()
    process.exit(0)
}

verifyUpdates()
