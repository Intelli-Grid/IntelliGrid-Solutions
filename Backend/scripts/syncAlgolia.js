import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

// Load env vars BEFORE imports that use them
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

import mongoose from 'mongoose'
import algoliasearch from 'algoliasearch'

// Dynamic imports for modules that need env vars
const { default: connectDB } = await import('../src/config/database.js')
const { toolsIndex, configureToolsIndex } = await import('../src/config/algolia.js')
const { default: Tool } = await import('../src/models/Tool.js')
await import('../src/models/Category.js')   // register Category schema for populate

/**
 * Sync all tools to Algolia search index
 */
async function syncToolsToAlgolia() {
    try {
        console.log('🚀 Starting Algolia sync process...\n')

        // Connect to database
        await connectDB()

        // Configure Algolia index settings
        console.log('⚙️  Configuring Algolia index...')
        await configureToolsIndex()

        // Get all active tools — exclude soft-deleted (isActive: false)
        console.log('📊 Fetching tools from database...')
        const tools = await Tool.find({ status: 'active', isActive: { $ne: false } })
            .populate('category', 'name slug')
            .lean()
        console.log(`✅ Found ${tools.length} active tools\n`)

        if (tools.length === 0) {
            console.log('⚠️  No tools to sync')
            process.exit(0)
        }

        // Prepare tools for Algolia (include logo for search result display)
        console.log('🔄 Preparing tools for Algolia...')
        const algoliaObjects = tools.map(tool => ({
            objectID: tool._id.toString(),
            name: tool.name,
            slug: tool.slug,
            shortDescription: tool.shortDescription,
            fullDescription: tool.fullDescription,
            officialUrl: tool.officialUrl || '',
            // Image fields
            logo: tool.logo || tool.metadata?.logo || '',
            // Category — both ID (for faceting) and name (for search)
            category: tool.category?._id?.toString() || null,
            categoryName: tool.category?.name || null,
            tags: tool.tags || [],
            pricing: tool.pricing,
            ratings: {
                average: tool.ratings?.average || 0,
                count: tool.ratings?.count || 0,
            },
            views: tool.views || 0,
            favorites: tool.favorites || 0,
            isFeatured: tool.isFeatured || false,
            isTrending: tool.isTrending || false,
            status: tool.status,
            linkStatus: tool.linkStatus || 'unknown',
            isActive: tool.isActive !== false,
            // Batch 2 enrichment
            hasFreeTier: tool.hasFreeTier ?? null,
            startingPrice: tool.startingPrice || null,
            targetAudience: tool.targetAudience || null,
            launchedAt: tool.launchedAt || null,
            createdAt: tool.createdAt,
        }))

        // Sync to Algolia in batches
        const batchSize = 1000
        const batches = Math.ceil(algoliaObjects.length / batchSize)

        console.log(`📤 Syncing ${algoliaObjects.length} tools in ${batches} batch(es)...\n`)

        for (let i = 0; i < batches; i++) {
            const start = i * batchSize
            const end = Math.min((i + 1) * batchSize, algoliaObjects.length)
            const batch = algoliaObjects.slice(start, end)

            console.log(`   Batch ${i + 1}/${batches}: Syncing ${batch.length} tools...`)
            await toolsIndex.saveObjects(batch)
            console.log(`   ✅ Batch ${i + 1}/${batches} synced successfully`)
        }

        console.log('\n✨ Algolia sync complete!')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`📊 Total tools synced: ${algoliaObjects.length}`)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

        // Test search
        console.log('🔍 Testing search functionality...')
        const searchResult = await toolsIndex.search('AI', { hitsPerPage: 3 })
        console.log(`✅ Search test successful! Found ${searchResult.nbHits} results`)
        console.log('\n📝 Sample search results:')
        searchResult.hits.forEach((hit, index) => {
            console.log(`   ${index + 1}. ${hit.name}`)
            console.log(`      Slug: ${hit.slug}`)
            console.log(`      Rating: ${hit.ratings.average}/5 (${hit.ratings.count} reviews)`)
        })

        console.log('\n✅ Algolia integration ready!')
        process.exit(0)
    } catch (error) {
        console.error('❌ Error syncing to Algolia:', error)
        process.exit(1)
    }
}

// Run sync
syncToolsToAlgolia()
