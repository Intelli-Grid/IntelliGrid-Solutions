/**
 * redis.js — Redis client configuration
 *
 * ✅ Crash-safe: invalid or missing REDIS_URL no longer kills the process.
 *    Redis is used for caching only — the app degrades gracefully if unavailable.
 *
 * Railway Redis URL format:  redis://default:<password>@<host>:<port>
 * Railway Redis TLS format:  rediss://default:<password>@<host>:<port>
 *
 * Common mistake that caused the boot crash:
 *   - Copying just the host:port without the redis:// prefix
 *   - Using an http:// URL by mistake
 *
 * This module validates the URL before calling createClient() and wraps
 * everything in try/catch so a misconfigured URL only disables caching,
 * not the entire backend.
 */
import { createClient } from 'redis'
import dotenv from 'dotenv'

dotenv.config()

// ── URL validation ────────────────────────────────────────────────────────────

const VALID_PROTOCOLS = ['redis:', 'rediss:']

/**
 * Normalise and validate the Redis URL.
 * Returns a safe URL string, or null if the value is invalid.
 */
const resolveRedisUrl = () => {
    let url = process.env.REDIS_URL || ''

    if (!url) {
        console.warn('⚠️  REDIS_URL not set — Redis caching disabled (app will still work)')
        return null
    }

    // Strip accidental whitespace
    url = url.trim()

    // If someone set just a host:port or hostname, auto-prepend redis://
    if (!url.includes('://')) {
        console.warn(`⚠️  REDIS_URL has no protocol — auto-prepending redis:// to "${url}"`)
        url = `redis://${url}`
    }

    try {
        const parsed = new URL(url)
        if (!VALID_PROTOCOLS.includes(parsed.protocol)) {
            console.error(
                `❌  REDIS_URL has unsupported protocol "${parsed.protocol}". ` +
                `Must be redis:// or rediss://. Redis caching disabled.`
            )
            return null
        }
        return url
    } catch {
        console.error(`❌  REDIS_URL "${url}" is not a valid URL. Redis caching disabled.`)
        return null
    }
}

// ── Client creation ───────────────────────────────────────────────────────────

let redisClient = null
let redisAvailable = false

const validUrl = resolveRedisUrl()

if (validUrl) {
    try {
        redisClient = createClient({ url: validUrl })

        redisClient.on('error', (err) => console.error('❌ Redis error:', err.message))
        redisClient.on('connect', () => console.log('✅ Redis connected'))
        redisClient.on('ready', () => { redisAvailable = true; console.log('🔄 Redis ready') })
        redisClient.on('end', () => { redisAvailable = false; console.log('🔌 Redis disconnected') })
        redisClient.on('reconnecting', () => console.log('🔄 Redis reconnecting…'))
    } catch (err) {
        console.error('❌ Failed to create Redis client:', err.message, '— caching disabled')
        redisClient = null
    }
}

// ── Connection helpers ────────────────────────────────────────────────────────

export const connectRedis = async () => {
    if (!redisClient) return
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect()
        }
    } catch (err) {
        console.error('❌ Redis connect failed:', err.message, '— caching disabled, app continues')
        redisAvailable = false
    }
}

export const disconnectRedis = async () => {
    if (!redisClient || !redisClient.isOpen) return
    try {
        await redisClient.quit()
    } catch (err) {
        console.error('Redis disconnect error:', err.message)
    }
}

// ── Cache helper API (no-ops if Redis is unavailable) ────────────────────────

/**
 * Returns true if Redis is currently usable.
 * All cache helpers check this internally — callers never need to.
 */
const isReady = () => redisAvailable && redisClient?.isOpen

export const cache = {
    get: async (key) => {
        if (!isReady()) return null
        try {
            const value = await redisClient.get(key)
            return value ? JSON.parse(value) : null
        } catch (err) {
            console.error('Cache get error:', err.message)
            return null
        }
    },

    set: async (key, value, ttl = 3600) => {
        if (!isReady()) return
        try {
            await redisClient.setEx(key, ttl, JSON.stringify(value))
        } catch (err) {
            console.error('Cache set error:', err.message)
        }
    },

    del: async (key) => {
        if (!isReady()) return
        try {
            await redisClient.del(key)
        } catch (err) {
            console.error('Cache del error:', err.message)
        }
    },

    delPattern: async (pattern) => {
        if (!isReady()) return
        try {
            const keysToDelete = []
            for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
                keysToDelete.push(key)
            }
            if (keysToDelete.length > 0) await redisClient.del(keysToDelete)
        } catch (err) {
            console.error('Cache delPattern error:', err.message)
        }
    },

    exists: async (key) => {
        if (!isReady()) return false
        try {
            return (await redisClient.exists(key)) === 1
        } catch (err) {
            console.error('Cache exists error:', err.message)
            return false
        }
    },

    /** Flush all keys — use with care (admin/maintenance only) */
    flush: async () => {
        if (!isReady()) return
        try {
            await redisClient.flushDb()
            console.log('🗑️  Redis cache flushed')
        } catch (err) {
            console.error('Cache flush error:', err.message)
        }
    },
}

export default redisClient
