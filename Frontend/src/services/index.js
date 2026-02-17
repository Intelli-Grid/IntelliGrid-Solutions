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

    // Get related tools
    getRelatedTools: async (id, limit = 3) => {
        const response = await apiClient.get(`/tools/${id}/related`, {
            params: { limit },
        })
        return response.data
    },

    // Claim tool
    claimTool: async (id, data) => {
        const response = await apiClient.post(`/tools/${id}/claim`, data)
        return response.data
    },

    // Get managed tools
    getManagedTools: async () => {
        const response = await apiClient.get('/tools/managed')
        return response.data
    },

    // Compare tools
    compareTools: async (toolSlugs) => {
        const response = await apiClient.get('/tools/compare', {
            params: { slugs: toolSlugs.join(',') }
        })
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

/**
 * Admin Service - API calls for admin operations
 */
export const adminService = {
    // Get dashboard stats
    getStats: async () => {
        return await apiClient.get('/admin/stats')
    },

    // Get pending tools
    getPendingTools: async () => {
        return await apiClient.get('/admin/tools/pending')
    },

    // Approve tool
    approveTool: async (id) => {
        return await apiClient.put(`/admin/tools/${id}/approve`)
    },

    // Delete tool
    deleteTool: async (id) => {
        return await apiClient.delete(`/admin/tools/${id}`)
    },

    // Get pending reviews
    getPendingReviews: async () => {
        return await apiClient.get('/admin/reviews/pending')
    },

    // Approve review
    approveReview: async (id) => {
        return await apiClient.put(`/admin/reviews/${id}/approve`)
    },

    // Reject review
    rejectReview: async (id) => {
        return await apiClient.put(`/admin/reviews/${id}/reject`)
    },

    // Get payments
    getPayments: async (params = {}) => {
        return await apiClient.get('/admin/payments', { params })
    },

    // Get pending claims
    getPendingClaims: async () => {
        return await apiClient.get('/admin/claims/pending')
    },

    // Approve claim
    approveClaim: async (id) => {
        return await apiClient.put(`/admin/claims/${id}/approve`)
    },

    // Reject claim
    rejectClaim: async (id) => {
        return await apiClient.put(`/admin/claims/${id}/reject`)
    },

    // Send claim invitation
    sendInvitation: async (id, data = {}) => {
        return await apiClient.post(`/admin/tools/${id}/invite`, data)
    },

    // Update tool (Admin only)
    updateTool: async (id, data) => {
        return await apiClient.put(`/tools/${id}`, data)
    },
}

/**
 * Collection Service - API calls for collections
 */
export const collectionService = {
    // Get public collections
    getPublicCollections: async (params = {}) => {
        const response = await apiClient.get('/collections/public', { params })
        return response.data
    },

    // Get collection by ID
    getCollectionById: async (id) => {
        const response = await apiClient.get(`/collections/${id}`)
        return response.data
    },

    // Get my collections
    getMyCollections: async () => {
        const response = await apiClient.get('/collections/me')
        return response.data
    },

    // Create collection
    createCollection: async (data) => {
        const response = await apiClient.post('/collections', data)
        return response.data
    },

    // Update collection
    updateCollection: async (id, data) => {
        const response = await apiClient.put(`/collections/${id}`, data)
        return response.data
    },

    // Delete collection
    deleteCollection: async (id) => {
        const response = await apiClient.delete(`/collections/${id}`)
        return response.data
    },

    // Add tool to collection
    addTool: async (collectionId, toolId) => {
        const response = await apiClient.post(`/collections/${collectionId}/tools`, { toolId })
        return response.data
    },

    // Remove tool from collection
    removeTool: async (collectionId, toolId) => {
        const response = await apiClient.delete(`/collections/${collectionId}/tools/${toolId}`)
        return response.data
    },
}

/**
 * Newsletter Service - API calls for newsletter
 */
export const newsletterService = {
    // Subscribe
    subscribe: async (email, source = 'website') => {
        const response = await apiClient.post('/newsletter/subscribe', { email, source })
        return response.data
    },

    // Unsubscribe (optional, though usually handled via email link, good to have API)
    unsubscribe: async (email) => {
        const response = await apiClient.post('/newsletter/unsubscribe', { email })
        return response.data
    },
}
