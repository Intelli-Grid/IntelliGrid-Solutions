/**
 * useFeatureFlags.js — Frontend feature flag system
 *
 * Fetches enabled flag keys from /api/v1/config/features on mount.
 * Provides:
 *   - <FeatureFlagProvider> — wrap at root in main.jsx
 *   - useFlag(key)          — returns boolean, use anywhere in component tree
 *   - useFeatureFlags()     — returns { flags: Set, loading: boolean }
 *
 * Safe defaults:
 *   - While loading: all flags are false (features stay off)
 *   - On fetch error: all flags are false (silent fail, no crash)
 *   - No sensitive data: endpoint only returns enabled key names
 *
 * Usage:
 *   const isEnabled = useFlag('AFFILIATE_TRACKING')
 *   if (isEnabled) { ... }
 */
import { useState, useEffect, createContext, useContext } from 'react'

const FeatureFlagContext = createContext({ flags: new Set(), loading: true })

export function FeatureFlagProvider({ children }) {
    const [flags, setFlags] = useState(new Set())
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const apiUrl = import.meta.env.VITE_API_URL || ''

        fetch(`${apiUrl}/api/v1/config/features`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        })
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json()
            })
            .then(data => {
                const keys = Array.isArray(data.features) ? data.features : []
                setFlags(new Set(keys))
                setLoading(false)
            })
            .catch(err => {
                // Silent fail — all features default to off, app continues normally
                console.warn('[FeatureFlags] Could not load feature flags:', err.message)
                setLoading(false)
            })
    }, [])

    return (
        <FeatureFlagContext.Provider value={{ flags, loading }}>
            {children}
        </FeatureFlagContext.Provider>
    )
}

/**
 * useFlag — check if a specific feature is enabled
 * @param {string} key - Feature flag key (e.g. 'AFFILIATE_TRACKING')
 * @returns {boolean}
 */
export const useFlag = (key) => {
    const { flags } = useContext(FeatureFlagContext)
    return flags.has(key)
}

/**
 * useFeatureFlags — access the full context (flags Set + loading state)
 * @returns {{ flags: Set<string>, loading: boolean }}
 */
export const useFeatureFlags = () => useContext(FeatureFlagContext)

export default FeatureFlagProvider
