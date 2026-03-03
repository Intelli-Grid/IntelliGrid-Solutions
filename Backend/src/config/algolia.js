import algoliasearch from 'algoliasearch'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Algolia client
const algoliaClient = algoliasearch(
    process.env.ALGOLIA_APP_ID,
    process.env.ALGOLIA_ADMIN_KEY
)

// Define index names
export const ALGOLIA_INDEXES = {
    TOOLS: 'intelligrid_tools',
    CATEGORIES: 'intelligrid_categories',
}

// Get tools index
export const toolsIndex = algoliaClient.initIndex(ALGOLIA_INDEXES.TOOLS)

// Get categories index
export const categoriesIndex = algoliaClient.initIndex(ALGOLIA_INDEXES.CATEGORIES)

/**
 * Configure index settings
 * Includes enrichment fields for filter sidebar (pricing, platforms, audiences, etc.)
 */
export const configureToolsIndex = async () => {
    try {
        await toolsIndex.setSettings({
            searchableAttributes: [
                'name',                    // highest priority
                'shortDescription',
                'useCaseTags',             // task-based search: "write blog posts"
                'keyFeatures',             // feature-based search
                'fullDescription',
                'longDescription',
                'audienceTags',            // audience search: "for marketers"
                'tags',
                'categoryName',
            ],
            attributesForFaceting: [
                'filterOnly(pricing)',          // Free / Freemium / Paid / Trial
                'filterOnly(hasFreeTier)',      // true/false free version filter
                'filterOnly(platforms)',        // Web, iOS, Android, API, Chrome Extension
                'filterOnly(audienceTags)',     // Marketers, Developers, Designers
                'filterOnly(industryTags)',     // Healthcare, Finance, Education
                'filterOnly(category)',         // category ObjectId
                'filterOnly(categoryName)',     // category display name
                'filterOnly(isFeatured)',
                'filterOnly(isTrending)',
                'filterOnly(status)',
                'filterOnly(linkStatus)',
                'filterOnly(humanVerified)',
                'filterOnly(isActive)',
            ],
            customRanking: [
                'desc(trendingScore)',           // trending-first by default
                'desc(enrichmentScore)',         // higher quality tools ranked higher
                'desc(ratings.average)',
                'desc(views)',
                'desc(favorites)',
            ],
            ranking: [
                'typo',
                'geo',
                'words',
                'filters',
                'proximity',
                'attribute',
                'exact',
                'custom',
            ],
            typoTolerance: true,
            ignorePlurals: true,
            removeStopWords: ['en'],
        })
        console.log('✅ Algolia tools index configured with enrichment facets')
    } catch (error) {
        console.error('❌ Failed to configure Algolia index:', error)
    }
}

/**
 * Sync tool to Algolia
 * Now includes all new enrichment fields for filtering
 * @param {object} tool - Tool document (populated or lean)
 */
export const syncToolToAlgolia = async (tool) => {
    try {
        const categoryName = tool.category?.name ||
            (typeof tool.category === 'string' ? tool.category : null) ||
            null

        await toolsIndex.saveObject({
            objectID: tool._id.toString(),
            // Core identity
            name: tool.name,
            slug: tool.slug,
            officialUrl: tool.officialUrl,
            shortDescription: tool.shortDescription,
            longDescription: tool.longDescription || '',
            fullDescription: tool.fullDescription || '',

            // Media
            logo: tool.logo || tool.metadata?.logo || '',
            screenshotUrl: tool.screenshotUrl || '',

            // Category
            category: tool.category?._id?.toString() || tool.category?.toString() || null,
            categoryName,

            // Existing tags + enrichment tags
            tags: tool.tags || [],
            useCaseTags: tool.useCaseTags || [],
            audienceTags: tool.audienceTags || [],
            industryTags: tool.industryTags || [],
            integrationTags: tool.integrationTags || [],
            keyFeatures: tool.keyFeatures || [],
            alternativeTo: tool.alternativeTo || [],

            // Pricing (existing + enrichment)
            pricing: tool.pricing || 'Unknown',
            hasFreeTier: tool.hasFreeTier ?? null,
            startingPrice: tool.startingPrice || '',

            // Platform availability
            platforms: tool.platforms || [],

            // Engagement
            ratings: tool.ratings,
            views: tool.views || 0,
            weeklyViews: tool.weeklyViews || 0,
            favorites: tool.favorites || 0,
            totalBookmarks: tool.totalBookmarks || 0,
            trendingScore: tool.trendingScore || 0,

            // Status flags
            isFeatured: tool.isFeatured || false,
            isTrending: tool.isTrending || false,
            isNew: tool.isNew || false,
            status: tool.status,
            linkStatus: tool.linkStatus || 'unknown',
            isActive: tool.isActive !== false,
            humanVerified: tool.humanVerified || false,

            // Quality
            enrichmentScore: tool.enrichmentScore || 0,
        })
    } catch (error) {
        console.error('Failed to sync tool to Algolia:', error)
    }
}

/**
 * Delete tool from Algolia
 * @param {string} toolId - Tool ID
 */
export const deleteToolFromAlgolia = async (toolId) => {
    try {
        await toolsIndex.deleteObject(toolId)
    } catch (error) {
        console.error('Failed to delete tool from Algolia:', error)
    }
}

export default algoliaClient
