/**
 * tokenStore.js — Admin workspace
 *
 * Module-level bridge between Clerk's React hooks (useAuth)
 * and the plain-JS Axios interceptor in api.js.
 *
 * ClerkTokenBridge (React) registers getToken here on mount.
 * api.js interceptor reads it on every request.
 */

let _getToken = null

export const setTokenGetter = (fn) => {
    _getToken = fn
}

export const getAuthToken = async () => {
    if (!_getToken) return null
    try {
        return await _getToken()
    } catch {
        return null
    }
}
