import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:10000/api/v1',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        // Get token from Clerk or localStorage
        const token = localStorage.getItem('clerk-token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response) {
            // Server responded with error
            console.error('API Error:', error.response.status, error.response.data);

            // Handle specific error codes
            if (error.response.status === 401) {
                // Unauthorized - redirect to login
                console.error('Unauthorized - please log in');
            } else if (error.response.status === 403) {
                // Forbidden
                console.error('Forbidden - insufficient permissions');
            } else if (error.response.status === 404) {
                console.error('Resource not found');
            } else if (error.response.status === 500) {
                console.error('Server error - please try again later');
            }
        } else if (error.request) {
            // Request made but no response
            console.error('Network error - no response from server');
        } else {
            // Something else happened
            console.error('Request error:', error.message);
        }

        return Promise.reject(error);
    }
);

export default api;
