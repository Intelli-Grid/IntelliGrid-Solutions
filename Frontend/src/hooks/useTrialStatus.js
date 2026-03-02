/**
 * useTrialStatus.js
 *
 * Lightweight hook that reads the current user's reverse trial status.
 * Fetches once on mount when the user is signed in.
 * Returns { subscription, loading } — only subscription.reverseTrial.active
 * and subscription.reverseTrial.endDate are used by TrialBanner.
 *
 * Only makes the API call when Clerk has loaded and there is a signed-in user.
 * Does NOT throw — returns null subscription on error (banner stays hidden).
 */

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { userService } from '../services'

export function useTrialStatus() {
    const { user, isLoaded } = useUser()
    const [subscription, setSubscription] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isLoaded || !user) {
            setLoading(false)
            return
        }

        let cancelled = false

        const fetchStatus = async () => {
            try {
                const data = await userService.getStats()
                if (!cancelled) {
                    setSubscription(data?.subscription || null)
                }
            } catch {
                // Silently ignore — banner just won't render
                if (!cancelled) setSubscription(null)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchStatus()

        return () => { cancelled = true }
    }, [isLoaded, user])

    return { subscription, loading }
}
