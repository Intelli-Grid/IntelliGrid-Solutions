/**
 * tokenStore.js
 *
 * Module-level bridge between Clerk's React hooks (useAuth)
 * and the plain-JS Axios interceptor in api.js.
 *
 * Pattern:
 *   1. ClerkTokenBridge (React) calls setTokenGetter(getToken) on mount
 *   2. api.js interceptor calls getAuthToken() to retrieve the JWT
 *
 * This avoids polling window.Clerk which is unreliable after OAuth redirects.
 */

let _getToken = null

/** Called by ClerkTokenBridge to register Clerk's getToken function */
export const setTokenGetter = (fn) => {
    _getToken = fn
}

/** Called by api.js interceptor — returns the current JWT or null */
export const getAuthToken = async () => {
    if (!_getToken) return null
    try {
        return await _getToken()
    } catch {
        return null
    }
}
