import { createClient } from 'redis'
import dotenv from 'dotenv'

dotenv.config()

// Create Redis client
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
})

// Error handling
redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err)
})

redisClient.on('connect', () => {
    console.log('✅ Redis Client Connected')
})

redisClient.on('ready', () => {
    console.log('🔄 Redis Client Ready')
})

redisClient.on('reconnecting', () => {
    console.log('🔄 Redis Client Reconnecting...')
})

// Connect to Redis
export const connectRedis = async () => {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect()
        }
    } catch (error) {
        console.error('Failed to connect to Redis:', error)
    }
}

// Disconnect from Redis
export const disconnectRedis = async () => {
    try {
        if (redisClient.isOpen) {
            await redisClient.quit()
        }
    } catch (error) {
        console.error('Failed to disconnect from Redis:', error)
    }
}

/**
 * Cache helper functions
 */
export const cache = {
    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {Promise<any>} Cached value
     */
    get: async (key) => {
        try {
            const value = await redisClient.get(key)
            return value ? JSON.parse(value) : null
        } catch (error) {
            console.error('Cache get error:', error)
            return null
        }
    },

    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds (default: 1 hour)
     */
    set: async (key, value, ttl = 3600) => {
        try {
            await redisClient.setEx(key, ttl, JSON.stringify(value))
        } catch (error) {
            console.error('Cache set error:', error)
        }
    },

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     */
    del: async (key) => {
        try {
            await redisClient.del(key)
        } catch (error) {
            console.error('Cache delete error:', error)
        }
    },

    /**
     * Delete multiple keys matching pattern
     * @param {string} pattern - Key pattern (e.g., 'tools:*')
     */
    delPattern: async (pattern) => {
        try {
            const keys = await redisClient.keys(pattern)
            if (keys.length > 0) {
                await redisClient.del(keys)
            }
        } catch (error) {
            console.error('Cache delete pattern error:', error)
        }
    },

    /**
     * Check if key exists
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Whether key exists
     */
    exists: async (key) => {
        try {
            const result = await redisClient.exists(key)
            return result === 1
        } catch (error) {
            console.error('Cache exists error:', error)
            return false
        }
    },
}

export default redisClient
