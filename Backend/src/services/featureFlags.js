/**
 * featureFlags.js — Feature flag evaluation service
 *
 * Uses Redis (via the existing cache helper) with a 60-second TTL so that
 * toggling a flag in the admin panel takes effect within 60 seconds site-wide.
 *
 * Safe defaults everywhere:
 *   - Redis miss → falls back to MongoDB
 *   - MongoDB miss → returns false (feature stays off)
 *   - Any error → returns false (feature stays off, never crashes the request)
 */
import { cache } from '../config/redis.js'
import FeatureFlag from '../models/FeatureFlag.js'

const FLAG_CACHE_TTL = 60 // seconds

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check whether a feature flag is enabled.
 *
 * @param {string} flagKey  - The flag key (e.g. 'AFFILIATE_TRACKING')
 * @param {string} userRole - Optional: the current user's role for role-based flags
 * @returns {Promise<boolean>}
 */
export async function isFeatureEnabled(flagKey, userRole = null) {
    const cacheKey = `feature_flag:${flagKey}`
    try {
        // 1. Try Redis cache first
        const cached = await cache.get(cacheKey)
        if (cached !== null) {
            return evaluateFlag(cached, userRole)
        }

        // 2. Fall back to MongoDB
        const flag = await FeatureFlag.findOne({ key: flagKey }).lean()
        if (!flag) {
            return false // Flag doesn't exist → off
        }

        // 3. Cache for TTL
        await cache.set(cacheKey, flag, FLAG_CACHE_TTL)
        return evaluateFlag(flag, userRole)
    } catch (err) {
        console.error(`[FeatureFlag] Check failed for "${flagKey}":`, err.message)
        return false // Safe default — feature stays off on error
    }
}

/**
 * Get all feature flags from the DB (used by admin panel).
 *
 * @returns {Promise<Array>}
 */
export async function getAllFlags() {
    try {
        return await FeatureFlag.find({}).sort({ key: 1 }).lean()
    } catch (err) {
        console.error('[FeatureFlag] getAllFlags failed:', err.message)
        return []
    }
}

/**
 * Get only enabled flag keys (used by the public /config/features endpoint).
 * Returns a lightweight array of strings — no sensitive data.
 *
 * @returns {Promise<string[]>}
 */
export async function getEnabledFlagKeys() {
    try {
        const flags = await FeatureFlag.find({ enabled: true }).select('key').lean()
        return flags.map(f => f.key)
    } catch (err) {
        console.error('[FeatureFlag] getEnabledFlagKeys failed:', err.message)
        return []
    }
}

/**
 * Update a flag and invalidate its Redis cache immediately.
 *
 * @param {string} key       - The flag key
 * @param {object} updates   - { enabled?, enabledForRoles?, description? }
 * @returns {Promise<object>} - The updated flag document
 */
export async function updateFlag(key, updates) {
    const allowed = ['enabled', 'enabledForRoles', 'description']
    const sanitized = {}
    for (const field of allowed) {
        if (updates[field] !== undefined) sanitized[field] = updates[field]
    }

    const flag = await FeatureFlag.findOneAndUpdate(
        { key },
        { $set: sanitized },
        { new: true, upsert: true, runValidators: true }
    )

    // Immediately bust the cache so the change propagates within seconds
    await cache.del(`feature_flag:${key}`)

    return flag
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Evaluate a flag document against the current user role.
 */
function evaluateFlag(flag, userRole) {
    if (flag.enabled) return true
    if (userRole && Array.isArray(flag.enabledForRoles) && flag.enabledForRoles.includes(userRole)) {
        return true
    }
    return false
}
