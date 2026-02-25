import collectionService from '../services/collectionService.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'
import mongoose from 'mongoose'

class CollectionController {
    /**
     * Create collection
     * POST /api/v1/collections
     */
    createCollection = asyncHandler(async (req, res) => {
        const collection = await collectionService.createCollection(req.body, req.user._id)
        res.status(201).json(new ApiResponse(201, collection, 'Collection created successfully'))
    })

    /**
     * Get user's collections
     * GET /api/v1/collections/me
     */
    getMyCollections = asyncHandler(async (req, res) => {
        const collections = await collectionService.getCollectionsByUser(req.user._id)
        res.status(200).json(new ApiResponse(200, collections, 'Collections retrieved successfully'))
    })

    /**
     * Get public collections
     * GET /api/v1/collections/public
     */
    getPublicCollections = asyncHandler(async (req, res) => {
        const result = await collectionService.getPublicCollections(req.query)
        res.status(200).json(new ApiResponse(200, result, 'Public collections retrieved successfully'))
    })

    /**
     * Get collection by ID or Slug
     * GET /api/v1/collections/:id
     */
    getCollectionById = asyncHandler(async (req, res) => {
        const idOrSlug = req.params.id
        let collection

        // Try ID first if valid format
        if (mongoose.isValidObjectId(idOrSlug)) {
            try {
                collection = await collectionService.getCollectionById(idOrSlug, req.user?._id)
            } catch (error) {
                // If not found by ID, fall through to try slug
            }
        }

        // If not found by ID, try slug
        if (!collection) {
            collection = await collectionService.getCollectionBySlug(idOrSlug, req.user?._id)
        }

        // Increment views counter — fire-and-forget (don't await)
        if (collection?._id) {
            const Collection = (await import('../models/Collection.js')).default
            Collection.findByIdAndUpdate(collection._id, { $inc: { views: 1 } }).catch(() => { })
        }

        res.status(200).json(new ApiResponse(200, collection, 'Collection retrieved successfully'))
    })


    /**
     * Update collection
     * PUT /api/v1/collections/:id
     */
    updateCollection = asyncHandler(async (req, res) => {
        const collection = await collectionService.updateCollection(req.params.id, req.user._id, req.body)
        res.status(200).json(new ApiResponse(200, collection, 'Collection updated successfully'))
    })

    /**
     * Delete collection
     * DELETE /api/v1/collections/:id
     */
    deleteCollection = asyncHandler(async (req, res) => {
        await collectionService.deleteCollection(req.params.id, req.user._id)
        res.status(200).json(new ApiResponse(200, null, 'Collection deleted successfully'))
    })

    /**
     * Add tool to collection
     * POST /api/v1/collections/:id/tools
     */
    addTool = asyncHandler(async (req, res) => {
        const { toolId } = req.body
        const collection = await collectionService.addToolToCollection(req.params.id, toolId, req.user._id)
        res.status(200).json(new ApiResponse(200, collection, 'Tool added to collection'))
    })

    /**
     * Remove tool from collection
     * DELETE /api/v1/collections/:id/tools/:toolId
     */
    removeTool = asyncHandler(async (req, res) => {
        const collection = await collectionService.removeToolFromCollection(req.params.id, req.params.toolId, req.user._id)
        res.status(200).json(new ApiResponse(200, collection, 'Tool removed from collection'))
    })
}

export default new CollectionController()
