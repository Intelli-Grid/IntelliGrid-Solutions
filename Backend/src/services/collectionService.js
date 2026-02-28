import Collection from '../models/Collection.js'
import ApiError from '../utils/ApiError.js'
import slugify from 'slugify'

class CollectionService {
    /**
     * Create a new collection
     */
    async createCollection(data, userId) {
        // Enforce 2-collection cap for free users
        const PAID_TIERS = ['Basic', 'Pro', 'Premium', 'Business', 'Enterprise']
        const User = (await import('../models/User.js')).default
        const user = await User.findById(userId).select('subscription').lean()
        const isPaid = PAID_TIERS.includes(user?.subscription?.tier) && user?.subscription?.status === 'active'

        if (!isPaid) {
            const count = await Collection.countDocuments({ owner: userId })
            if (count >= 2) {
                // Machine-readable code — frontend uses this to trigger the upgrade nudge
                throw ApiError.forbidden('COLLECTIONS_LIMIT_REACHED')
            }
        }

        // Generate unique slug
        const baseSlug = slugify(data.name, { lower: true, strict: true })
        let slug = baseSlug
        let counter = 1

        // Ensure uniqueness
        while (await Collection.findOne({ slug })) {
            slug = `${baseSlug}-${counter++}`
        }

        const collection = await Collection.create({
            ...data,
            owner: userId,
            slug
        })

        return collection
    }

    /**
     * Get collection by ID
     */
    async getCollectionById(id, userId = null) {
        const collection = await Collection.findById(id)
            .populate('tools', 'name slug category isVerified logo shortDescription pricing ratings isTrending isFeatured')
            .populate('owner', 'fullName imageUrl')
            .populate({
                path: 'tools',
                populate: { path: 'category', select: 'name slug' }
            })

        if (!collection) {
            throw ApiError.notFound('Collection not found')
        }

        // Check visibility
        if (!collection.isPublic && (!userId || collection.owner._id.toString() !== userId.toString())) {
            throw ApiError.forbidden('You do not have permission to view this collection')
        }

        // Increment views if public
        if (collection.isPublic) {
            collection.views += 1
            await collection.save()
        }

        return collection
    }

    /**
     * Get collection by Slug
     */
    async getCollectionBySlug(slug, userId = null) {
        const collection = await Collection.findOne({ slug })
            .populate('tools', 'name slug category isVerified logo shortDescription pricing ratings isTrending isFeatured')
            .populate('owner', 'fullName imageUrl')
            .populate({
                path: 'tools',
                populate: { path: 'category', select: 'name slug' }
            })


        if (!collection) {
            throw ApiError.notFound('Collection not found')
        }

        if (!collection.isPublic && (!userId || collection.owner._id.toString() !== userId.toString())) {
            throw ApiError.forbidden('This collection is private')
        }

        // Increment views
        collection.views += 1
        await collection.save()

        return collection
    }

    /**
     * Get collections for a specific user
     */
    async getCollectionsByUser(userId) {
        const collections = await Collection.find({ owner: userId })
            .sort('-createdAt')
            .populate('tools', 'name slug logo') // Lightweight populate for lists

        return collections
    }

    /**
     * Get public collections (search/browse)
     */
    async getPublicCollections(options = {}) {
        const { page = 1, limit = 12, search } = options
        const skip = (page - 1) * limit

        const query = { isPublic: true }

        if (search) {
            query.$text = { $search: search }
        }

        const collections = await Collection.find(query)
            .populate('owner', 'fullName imageUrl')
            .populate('tools', 'name slug logo')
            .sort('-views -createdAt')
            .skip(skip)
            .limit(limit)

        const total = await Collection.countDocuments(query)

        return {
            collections,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }
    }

    /**
     * Update collection details
     */
    async updateCollection(id, userId, updates) {
        const collection = await Collection.findOne({ _id: id, owner: userId })

        if (!collection) {
            throw ApiError.notFound('Collection not found or you do not have permission')
        }

        // Only update allowed fields
        if (updates.name) collection.name = updates.name
        if (updates.description) collection.description = updates.description
        if (typeof updates.isPublic === 'boolean') collection.isPublic = updates.isPublic

        // Re-generate slug if name changes? Probably safer not to break existing links unless explicit.
        // For now, let's keep slug stable.

        await collection.save()
        return collection
    }

    /**
     * Delete collection
     */
    async deleteCollection(id, userId) {
        const collection = await Collection.findOneAndDelete({ _id: id, owner: userId })

        if (!collection) {
            throw ApiError.notFound('Collection not found or you do not have permission')
        }

        return true
    }

    /**
     * Add tool to collection
     */
    async addToolToCollection(collectionId, toolId, userId) {
        const collection = await Collection.findOne({ _id: collectionId, owner: userId })

        if (!collection) {
            throw ApiError.notFound('Collection not found or you do not have permission')
        }

        // Prevent duplicates
        if (!collection.tools.includes(toolId)) {
            collection.tools.push(toolId)
            await collection.save()
        }

        return collection
    }

    /**
     * Remove tool from collection
     */
    async removeToolFromCollection(collectionId, toolId, userId) {
        const collection = await Collection.findOne({ _id: collectionId, owner: userId })

        if (!collection) {
            throw ApiError.notFound('Collection not found or you do not have permission')
        }

        collection.tools = collection.tools.filter(id => id.toString() !== toolId.toString())
        await collection.save()

        return collection
    }
}

export default new CollectionService()
