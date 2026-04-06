import { useState, useEffect } from 'react'

// sessionStorage cache key — avoids repeated calls within the same browser session
const GEO_CACHE_KEY = 'ig_user_country'

// Our own backend geo endpoint (uses CF-IPCountry, zero external API dependency)
const GEO_BACKEND_URL = (import.meta.env.VITE_API_URL || 'https://backend.intelligrid.online/api/v1') + '/geo/country'

// ipapi.co fallback — free, no key, CORS-safe (1,000 req/day on free tier)
const GEO_FALLBACK_URL = 'https://ipapi.co/json/'

/**
 * useGeoLocation
 *
 * Detects the user's country using:
 *   1. Our own Railway backend (/api/v1/geo/country) — reads CF-IPCountry injected by
 *      Cloudflare for free with zero API calls and zero latency overhead.
 *   2. ipapi.co — fallback if the backend endpoint fails or returns 'US' unexpectedly.
 *
 * Returns:
 *   country      — ISO 3166-1 alpha-2 country code  e.g. 'IN', 'US', 'GB'
 *   currency     — 'INR' for India, 'USD' for everyone else
 *   isIndia      — boolean shorthand for country === 'IN'
 *   loading      — true while detection is in progress (non-blocking)
 *   override     — fn(countryCode) to manually switch user's country/currency
 */
export function useGeoLocation() {
    const [country, setCountry] = useState(() => {
        // Hydrate from sessionStorage on first render to avoid a flash
        return sessionStorage.getItem(GEO_CACHE_KEY) || null
    })
    const [loading, setLoading] = useState(() => !sessionStorage.getItem(GEO_CACHE_KEY))

    useEffect(() => {
        // Already have a cached value — skip all network calls
        if (sessionStorage.getItem(GEO_CACHE_KEY)) {
            setLoading(false)
            return
        }

        let cancelled = false

        const detect = async () => {
            try {
                // ── Primary: our backend endpoint (Cloudflare CF-IPCountry header) ──
                const res = await fetch(GEO_BACKEND_URL, { signal: AbortSignal.timeout(3000) })
                if (!res.ok) throw new Error('backend-geo-failed')
                const data = await res.json()
                const detected = data?.country || 'US'
                if (!cancelled) {
                    sessionStorage.setItem(GEO_CACHE_KEY, detected)
                    setCountry(detected)
                }
            } catch {
                // ── Fallback: ipapi.co ─────────────────────────────────────────────
                try {
                    const res = await fetch(GEO_FALLBACK_URL, { signal: AbortSignal.timeout(4000) })
                    if (!res.ok) throw new Error('ipapi-failed')
                    const data = await res.json()
                    const detected = data?.country_code || 'US'
                    if (!cancelled) {
                        sessionStorage.setItem(GEO_CACHE_KEY, detected)
                        setCountry(detected)
                    }
                } catch {
                    // Both sources failed — default to USD/international experience
                    if (!cancelled) {
                        sessionStorage.setItem(GEO_CACHE_KEY, 'US')
                        setCountry('US')
                    }
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        detect()
        return () => { cancelled = true }
    }, [])

    /**
     * Manual override for the currency toggle button.
     * Persists within the session so the user's choice is respected on navigation.
     */
    const override = (countryCode) => {
        const code = countryCode.toUpperCase()
        sessionStorage.setItem(GEO_CACHE_KEY, code)
        setCountry(code)
    }

    const isIndia = country === 'IN'
    const currency = isIndia ? 'INR' : 'USD'

    return { country, currency, isIndia, loading, override }
}
