import { createContext, useContext, useState, useCallback } from 'react'
import { NUDGE_CONFIGS } from './nudgeConfigs'

/**
 * NudgeContext
 *
 * Usage from any component:
 *
 *   const { fireNudge, fireNudgeFromError } = useNudge()
 *
 *   // From API error:
 *   fireNudgeFromError(err)  // reads err.response?.data?.message or err.message
 *
 *   // Direct trigger:
 *   fireNudge('SEARCH_REPEAT')
 */
const NudgeContext = createContext(null)

export function NudgeProvider({ children }) {
    const [activeNudge, setActiveNudge] = useState(null)
    // Track which triggers have been dismissed in this session
    const [dismissed, setDismissed] = useState(new Set())

    const fireNudge = useCallback((triggerKey) => {
        if (dismissed.has(triggerKey)) return
        const config = NUDGE_CONFIGS[triggerKey]
        if (config) {
            setActiveNudge(config)
        }
    }, [dismissed])

    const fireNudgeFromError = useCallback((err) => {
        const msg = err?.response?.data?.message || err?.message || ''
        // Try to match the error message to a known nudge trigger key
        const matchedKey = Object.keys(NUDGE_CONFIGS).find(key => msg.includes(key))
        if (matchedKey) {
            fireNudge(matchedKey)
        }
    }, [fireNudge])

    const dismissNudge = useCallback(() => {
        if (activeNudge) {
            setDismissed(prev => new Set([...prev, activeNudge.trigger]))
        }
        setActiveNudge(null)
    }, [activeNudge])

    return (
        <NudgeContext.Provider value={{ activeNudge, fireNudge, fireNudgeFromError, dismissNudge }}>
            {children}
        </NudgeContext.Provider>
    )
}

export function useNudge() {
    const ctx = useContext(NudgeContext)
    if (!ctx) throw new Error('useNudge must be used within NudgeProvider')
    return ctx
}
