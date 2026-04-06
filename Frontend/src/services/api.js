import axios from 'axios'
import { getAuthToken } from './tokenStore'

let API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backend.intelligrid.online/api/v1'

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor — attaches Bearer token via ClerkTokenBridge store
// getAuthToken() calls Clerk's useAuth().getToken() registered by ClerkTokenBridge
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
