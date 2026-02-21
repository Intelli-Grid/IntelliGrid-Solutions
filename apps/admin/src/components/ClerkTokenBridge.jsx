import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { setTokenGetter } from '../services/tokenStore'

/**
 * ClerkTokenBridge — Admin workspace
 *
 * Zero-render component mounted inside ClerkProvider.
 * Registers Clerk's getToken function into tokenStore so
 * the Axios interceptor always has a valid Bearer token.
 */
export default function ClerkTokenBridge() {
    const { getToken, isSignedIn } = useAuth()

    useEffect(() => {
        if (isSignedIn) {
            setTokenGetter(getToken)
        } else {
            setTokenGetter(null)
        }
        return () => setTokenGetter(null)
    }, [getToken, isSignedIn])

    return null
}
