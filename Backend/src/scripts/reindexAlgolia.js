/**
 * reindexAlgolia.js
 * Full re-index of all active tools into Algolia after enrichment.
 * Run this after bulkEnrich.js completes to make enriched data searchable.
 *
 * Usage (from Backend/ directory):
 *   node src/scripts/reindexAlgolia.js
 *
 * Processes in batches of 500 (Algolia's saveObjects batch limit).
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js'
import { toolsIndex, configureToolsIndex } from '../config/algolia.js'

dotenv.config()

const BATCH_SIZE = 500

async function main() {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Step 1: Apply updated index settings first
    console.log('\n⚙️  Applying Algolia index settings...')
    await configureToolsIndex()

    // Step 2: Count tools to process
    const total = await Tool.countDocuments({ status: 'active', isActive: { $ne: false } })
    console.log(`\n📊 Tools to index: ${total}`)
    console.log(`  Processing in batches of ${BATCH_SIZE}...`)

    // Pre-load all categories for fast lookup
    const allCategories = await Category.find({}).lean()
    const categoryMap = Object.fromEntries(allCategories.map(c => [c._id.toString(), c]))

    let indexed = 0
    let failed = 0
    let skip = 0

    while (indexed + failed < total) {
        const tools = await Tool.find({ status: 'active', isActive: { $ne: false } })
            .skip(skip)
            .limit(BATCH_SIZE)
            .lean()

        if (tools.length === 0) break

        const algoliaObjects = tools.map(tool => {
            const cat = categoryMap[tool.category?.toString()]
            const categoryName = cat?.name || null

            return {
                objectID: tool._id.toString(),
                name: tool.name,
                slug: tool.slug,
                officialUrl: tool.officialUrl,
                shortDescription: tool.shortDescription,
                longDescription: tool.longDescription || '',
                fullDescription: tool.fullDescription || '',
                logo: tool.logo || tool.metadata?.logo || '',
                screenshotUrl: tool.screenshotUrl || '',
                category: tool.category?.toString() || null,
                categoryName,
                tags: tool.tags || [],
                useCaseTags: tool.useCaseTags || [],
                audienceTags: tool.audienceTags || [],
                industryTags: tool.industryTags || [],
                integrationTags: tool.integrationTags || [],
                keyFeatures: tool.keyFeatures || [],
                alternativeTo: tool.alternativeTo || [],
                pricing: tool.pricing || 'Unknown',
                hasFreeTier: tool.hasFreeTier ?? null,
                startingPrice: tool.startingPrice || '',
                platforms: tool.platforms || [],
                ratings: tool.ratings || { average: 0, count: 0 },
                views: tool.views || 0,
                weeklyViews: tool.weeklyViews || 0,
                favorites: tool.favorites || 0,
                totalBookmarks: tool.totalBookmarks || 0,
                trendingScore: tool.trendingScore || 0,
                isFeatured: tool.isFeatured || false,
                isTrending: tool.isTrending || false,
                isNew: tool.isNew || false,
                status: tool.status,
                linkStatus: tool.linkStatus || 'unknown',
                isActive: tool.isActive !== false,
                humanVerified: tool.humanVerified || false,
                enrichmentScore: tool.enrichmentScore || 0,
            }
        })

        try {
            await toolsIndex.saveObjects(algoliaObjects)
            indexed += tools.length
            skip += tools.length
            console.log(`  ✅ Indexed ${indexed}/${total}`)
        } catch (err) {
            failed += tools.length
            skip += tools.length
            console.error(`  ❌ Batch failed:`, err.message)
        }
    }

    console.log(`\n═════════════════════════════════════`)
    console.log(`✅ ALGOLIA RE-INDEX COMPLETE`)
    console.log(`  Total indexed: ${indexed}`)
    console.log(`  Failed:        ${failed}`)
    console.log(`═════════════════════════════════════\n`)

    await mongoose.disconnect()
    process.exit(0)
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
