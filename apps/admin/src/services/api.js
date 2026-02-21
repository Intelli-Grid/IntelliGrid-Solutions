
import axios from 'axios'

// Determine base URL dynamically or use env
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api/v1'

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    async (config) => {
        try {
            // Get token from Clerk
            const clerk = window.Clerk
            if (clerk && clerk.session) {
                const token = await clerk.session.getToken()
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`
                }
            }
        } catch (error) {
            console.error('Failed to attach auth token:', error)
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor for consistent error handling and data unwrapping
apiClient.interceptors.response.use(
    (response) => {
        // Return only the data portion, simplifying consumption
        return response.data
    },
    (error) => {
        // Enhance error object
        const errorResponse = error.response ? error.response.data : {}
        const errorMessage = errorResponse.message || error.message || 'An unexpected error occurred'

        // Log auth errors but don't alert (handled by redirect logic)
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
