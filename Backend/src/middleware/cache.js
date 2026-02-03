import { cache } from '../config/redis.js'
import asyncHandler from '../utils/asyncHandler.js'

/**
 * Cache middleware for GET requests
 * @param {number} ttl - Time to live in seconds (default: 1 hour)
 * @param {function} keyGenerator - Function to generate cache key from request
 */
export const cacheMiddleware = (ttl = 3600, keyGenerator = null) => {
    return asyncHandler(async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next()
        }

        // Generate cache key
        const cacheKey = keyGenerator
            ? keyGenerator(req)
            : `cache:${req.originalUrl || req.url}`

        // Try to get from cache
        const cachedData = await cache.get(cacheKey)

        if (cachedData) {
            console.log(`✅ Cache HIT: ${cacheKey}`)
            return res.status(200).json(cachedData)
        }

        console.log(`❌ Cache MISS: ${cacheKey}`)

        // Store original res.json function
        const originalJson = res.json.bind(res)

        // Override res.json to cache the response
        res.json = function (data) {
            // Cache the response
            cache.set(cacheKey, data, ttl).catch(err => {
                console.error('Failed to cache response:', err)
            })

            // Call original json function
            return originalJson(data)
        }

        next()
    })
}

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Cache key pattern
 */
export const invalidateCache = async (pattern) => {
    try {
        await cache.delPattern(pattern)
        console.log(`🗑️  Cache invalidated: ${pattern}`)
    } catch (error) {
        console.error('Failed to invalidate cache:', error)
    }
}

export default cacheMiddleware
