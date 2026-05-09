import axios from 'axios'
import { getAuthToken } from './tokenStore'

// VITE_API_URL may be set with or without /api/v1 — normalise here so all
// axios calls in the admin panel always hit the correct versioned base path.
const RAW_URL = (import.meta.env.VITE_API_URL || 'https://backend.intelligrid.online/api/v1')
    .replace(/\/+$/, '') // strip trailing slashes

const BASE_URL = RAW_URL.endsWith('/api/v1') ? RAW_URL : `${RAW_URL}/api/v1`

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
})

// Request interceptor — attaches Bearer token via ClerkTokenBridge store
apiClient.interceptors.request.use(
    async (config) => {
        const token = await getAuthToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor for consistent error handling
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const errorResponse = error.response ? error.response.data : {}
        const errorMessage = errorResponse.message || error.message || 'An unexpected error occurred'

        if (error.response?.status === 401) {
            console.warn('Authentication token expired or invalid')
        }

        return Promise.reject({
            message: errorMessage,
            originalError: error,
            status: error.response?.status,
        })
    }
)

export default apiClient
