import axios from 'axios'
import { getAuthToken } from './tokenStore'

let BASE_URL = import.meta.env.VITE_API_URL || 'https://api.intelligrid.online/api/v1'
// Fallback override in case Vercel still has the old dead Railway URL configured in its environment variables
if (BASE_URL.includes('intelligrid-solutions-production.up.railway.app')) {
    BASE_URL = 'https://api.intelligrid.online/api/v1'
}

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
