import apiClient from './api'

/**
 * Tool Service - API calls for tools
 */
export const toolService = {
    // Get all tools with pagination and filters
    getTools: async (params = {}) => {
        const response = await apiClient.get('/tools', { params })
        return response.data
    },

    // Get single tool by ID
    getToolById: async (id) => {
        const response = await apiClient.get(`/tools/${id}`)
        return response.data
    },

    // Get tool by slug
    getToolBySlug: async (slug) => {
        const response = await apiClient.get(`/tools/slug/${slug}`)
        return response.data
    },

    // Search tools (Algolia)
    searchTools: async (query, params = {}) => {
        const response = await apiClient.get('/tools/search', {
            params: { q: query, ...params },
        })
        return response.data
    },

    // Get trending tools
    getTrendingTools: async (limit = 10) => {
        const response = await apiClient.get('/tools/trending', {
            params: { limit },
        })
        return response.data
    },

    // Get featured tools
    getFeaturedTools: async (limit = 10) => {
        const response = await apiClient.get('/tools/featured', {
            params: { limit },
        })
        return response.data
    },

    // Increment tool views
    incrementViews: async (id) => {
        const response = await apiClient.post(`/tools/${id}/view`)
        return response.data
    },
}

/**
 * Category Service - API calls for categories
 */
export const categoryService = {
    // Get all categories
    getCategories: async () => {
        const response = await apiClient.get('/categories')
        return response.data
    },

    // Get category by slug
    getCategoryBySlug: async (slug) => {
        const response = await apiClient.get(`/categories/${slug}`)
        return response.data
    },

    // Get tools in category
    getToolsByCategory: async (slug, params = {}) => {
        const response = await apiClient.get(`/categories/${slug}/tools`, { params })
        return response.data
    },
}

/**
 * User Service - API calls for user operations
 */
export const userService = {
    // Get current user profile
    getProfile: async () => {
        const response = await apiClient.get('/user/profile')
        return response.data
    },

    // Update user profile
    updateProfile: async (data) => {
        const response = await apiClient.put('/user/profile', data)
        return response.data
    },

    // Get user stats
    getStats: async () => {
        const response = await apiClient.get('/user/stats')
        return response.data
    },

    // Get user favorites
    getFavorites: async () => {
        const response = await apiClient.get('/user/favorites')
        return response.data
    },

    // Add to favorites
    addFavorite: async (toolId) => {
        const response = await apiClient.post('/user/favorites', { toolId })
        return response.data
    },

    // Remove from favorites
    removeFavorite: async (toolId) => {
        const response = await apiClient.delete(`/user/favorites/${toolId}`)
        return response.data
    },
}

/**
 * Review Service - API calls for reviews
 */
export const reviewService = {
    // Get reviews for a tool
    getToolReviews: async (toolId, params = {}) => {
        const response = await apiClient.get(`/reviews/tool/${toolId}`, { params })
        return response.data
    },

    // Create a review
    createReview: async (data) => {
        const response = await apiClient.post('/reviews', data)
        return response.data
    },

    // Update a review
    updateReview: async (id, data) => {
        const response = await apiClient.put(`/reviews/${id}`, data)
        return response.data
    },

    // Delete a review
    deleteReview: async (id) => {
        const response = await apiClient.delete(`/reviews/${id}`)
        return response.data
    },

    // Mark review as helpful
    markHelpful: async (id) => {
        const response = await apiClient.post(`/reviews/${id}/helpful`)
        return response.data
    },
}

/**
 * Payment Service - API calls for payments
 */
export const paymentService = {
    // Create PayPal order
    createPayPalOrder: async (plan) => {
        const response = await apiClient.post('/payment/paypal/create-order', { plan })
        return response.data
    },

    // Capture PayPal payment
    capturePayPalPayment: async (paymentId, payerId) => {
        const response = await apiClient.post('/payment/paypal/capture', { paymentId, payerId })
        return response.data
    },

    // Create Cashfree order
    createCashfreeOrder: async (plan) => {
        const response = await apiClient.post('/payment/cashfree/create-order', { plan })
        return response.data
    },

    // Verify Cashfree payment
    verifyCashfreePayment: async (orderId) => {
        const response = await apiClient.post('/payment/cashfree/verify', { orderId })
        return response.data
    },
}

/**
 * Analytics Service - API calls for analytics
 */
export const analyticsService = {
    // Track event
    trackEvent: async (eventData) => {
        const response = await apiClient.post('/analytics/track', eventData)
        return response.data
    },
}
