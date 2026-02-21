import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api/v1'

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

/**
 * Get the Clerk session token reliably.
 *
 * Priority order (most → least reliable):
 * 1. window.Clerk.session.getToken() — active session object
 * 2. Fallback to checking window.__clerk_db_jwt from Clerk's own DOM storage
 *
 * window.Clerk is set by Clerk's script synchronously, but .session can be
 * null for a brief moment after OAuth redirects. We use a short retry loop
 * to handle that race condition before giving up.
 */
const getClerkToken = async () => {
    try {
        // Fast path: session already loaded
        if (window.Clerk?.session) {
            return await window.Clerk.session.getToken()
        }

        // Retry loop: wait up to 2s for Clerk to resolve the session
        // (happens after OAuth redirect when the JWT is being exchanged)
        for (let i = 0; i < 8; i++) {
            await new Promise((resolve) => setTimeout(resolve, 250))
            if (window.Clerk?.session) {
                return await window.Clerk.session.getToken()
            }
        }

        return null
    } catch (error) {
        console.error('Failed to get Clerk token:', error)
        return null
    }
}

// Request interceptor — attaches Bearer token to every API call
apiClient.interceptors.request.use(
    async (config) => {
        const token = await getClerkToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor — normalise error messages
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const message = error.response?.data?.message || error.message || 'Something went wrong'
        console.error('API Error:', message)
        return Promise.reject(error)
    }
)

export default apiClient
