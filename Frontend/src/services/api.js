import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api/v1'

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    async (config) => {
        // Get token from Clerk
        try {
            // Access Clerk instance from window
            const clerk = window.Clerk

            if (clerk && clerk.session) {
                // Get the session token
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
    (error) => {
        return Promise.reject(error)
    }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const message = error.response?.data?.message || error.message || 'Something went wrong'
        console.error('API Error:', message)
        return Promise.reject(error)
    }
)

export default apiClient
