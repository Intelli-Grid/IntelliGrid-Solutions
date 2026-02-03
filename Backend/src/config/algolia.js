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
 */
export const configureToolsIndex = async () => {
    try {
        await toolsIndex.setSettings({
            searchableAttributes: [
                'name',
                'shortDescription',
                'fullDescription',
                'tags',
            ],
            attributesForFaceting: [
                'category',
                'pricing',
                'isFeatured',
                'isTrending',
                'status',
            ],
            customRanking: [
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
        })
        console.log('✅ Algolia tools index configured')
    } catch (error) {
        console.error('❌ Failed to configure Algolia index:', error)
    }
}

/**
 * Sync tool to Algolia
 * @param {object} tool - Tool document
 */
export const syncToolToAlgolia = async (tool) => {
    try {
        await toolsIndex.saveObject({
            objectID: tool._id.toString(),
            name: tool.name,
            slug: tool.slug,
            shortDescription: tool.shortDescription,
            fullDescription: tool.fullDescription,
            category: tool.category,
            tags: tool.tags || [],
            pricing: tool.pricing,
            ratings: tool.ratings,
            views: tool.views,
            favorites: tool.favorites,
            isFeatured: tool.isFeatured,
            isTrending: tool.isTrending,
            status: tool.status,
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
