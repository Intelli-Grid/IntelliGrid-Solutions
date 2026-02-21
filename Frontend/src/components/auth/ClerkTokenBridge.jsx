import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { setTokenGetter } from '../services/tokenStore'

/**
 * ClerkTokenBridge
 *
 * A zero-render React component mounted inside ClerkProvider.
 * It uses the useAuth hook (the ONLY reliable way to get Clerk tokens in v4)
 * and registers the getToken function into the module-level tokenStore.
 *
 * api.js then reads from that store in its request interceptor,
 * guaranteeing every API call has a valid Bearer token whenever
 * the user is signed in — regardless of OAuth redirects or timing.
 */
export default function ClerkTokenBridge() {
    const { getToken, isSignedIn } = useAuth()

    useEffect(() => {
        if (isSignedIn) {
            // Register the token getter — api.js interceptor will call this
            setTokenGetter(getToken)
        } else {
            // Signed out: clear the getter so no stale tokens are sent
            setTokenGetter(null)
        }

        return () => {
            setTokenGetter(null)
        }
    }, [getToken, isSignedIn])

    return null
}
