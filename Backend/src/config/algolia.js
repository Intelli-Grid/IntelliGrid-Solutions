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
                'categoryName',       // Batch 1: enables category-name search
            ],
            attributesForFaceting: [
                'category',
                'categoryName',       // Batch 1: facet filter by category name
                'pricing',
                'isFeatured',
                'isTrending',
                'status',
                'linkStatus',         // Batch 1: allows filtering dead tools
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
        // Resolve category name for searchable/facet attribute
        const categoryName = tool.category?.name ||
            (typeof tool.category === 'string' ? tool.category : null) ||
            null

        await toolsIndex.saveObject({
            objectID: tool._id.toString(),
            name: tool.name,
            slug: tool.slug,
            shortDescription: tool.shortDescription,
            fullDescription: tool.fullDescription,
            logo: tool.logo || tool.metadata?.logo || '',
            category: tool.category?._id?.toString() || tool.category?.toString() || null,
            categoryName,                   // Batch 1
            tags: tool.tags || [],
            pricing: tool.pricing,
            ratings: tool.ratings,
            views: tool.views,
            favorites: tool.favorites,
            isFeatured: tool.isFeatured,
            isTrending: tool.isTrending,
            status: tool.status,
            linkStatus: tool.linkStatus || 'unknown',   // Batch 1
            isActive: tool.isActive !== false,           // Batch 1
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
