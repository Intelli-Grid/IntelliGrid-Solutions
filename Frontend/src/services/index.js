import apiClient from './api'

/**
 * Tool Service - API calls for tools
 * NOTE: apiClient interceptor already unwraps response.data,
 * so each method returns the parsed JSON body directly.
 */
export const toolService = {
    getTools: (params = {}) => apiClient.get('/tools', { params }),
    getToolById: (id) => apiClient.get(`/tools/${id}`),
    getToolBySlug: (slug) => apiClient.get(`/tools/slug/${slug}`),
    searchTools: (query, params = {}) => apiClient.get('/tools/search', { params: { q: query, ...params } }),
    getTrendingTools: (limit = 10) => apiClient.get('/tools/trending', { params: { limit } }),
    getFeaturedTools: (limit = 10) => apiClient.get('/tools/featured', { params: { limit } }),
    incrementViews: (id) => apiClient.post(`/tools/${id}/view`),
    getRelatedTools: (id, limit = 3) => apiClient.get(`/tools/${id}/related`, { params: { limit } }),
    claimTool: (id, data) => apiClient.post(`/tools/${id}/claim`, data),
    getManagedTools: () => apiClient.get('/tools/managed'),
    compareTools: (toolSlugs) => apiClient.get('/tools/compare', { params: { slugs: toolSlugs.join(',') } }),
}

/**
 * Category Service
 */
export const categoryService = {
    getCategories: () => apiClient.get('/categories'),
    getCategoryBySlug: (slug) => apiClient.get(`/categories/${slug}`),
    getToolsByCategory: (slug, params = {}) => apiClient.get(`/categories/${slug}/tools`, { params }),
}

/**
 * User Service
 */
export const userService = {
    getProfile: () => apiClient.get('/user/profile'),
    updateProfile: (data) => apiClient.put('/user/profile', data),
    getStats: () => apiClient.get('/user/stats'),
    getFavorites: () => apiClient.get('/user/favorites'),
    addFavorite: (toolId) => apiClient.post('/user/favorites', { toolId }),
    removeFavorite: (toolId) => apiClient.delete(`/user/favorites/${toolId}`),
    // View History
    addToHistory: (toolId) => apiClient.post(`/user/history/${toolId}`),
    getHistory: (limit = 20) => apiClient.get('/user/history', { params: { limit } }),
}

/**
 * Review Service
 */
export const reviewService = {
    getToolReviews: (toolId, params = {}) => apiClient.get(`/reviews/tool/${toolId}`, { params }),
    createReview: (data) => apiClient.post('/reviews', data),
    updateReview: (id, data) => apiClient.put(`/reviews/${id}`, data),
    deleteReview: (id) => apiClient.delete(`/reviews/${id}`),
    markHelpful: (id) => apiClient.post(`/reviews/${id}/helpful`),
}

/**
 * Payment Service
 */
export const paymentService = {
    // ── PayPal Subscriptions API v2 (recurring billing) ────────────────────────
    createPayPalSubscription: (plan) =>
        apiClient.post('/payment/paypal/create-subscription', { plan }),
    cancelPayPalSubscription: () =>
        apiClient.post('/payment/paypal/cancel-subscription'),

    // ── PayPal legacy one-time (kept for backward compat / fallback) ───────────
    createPayPalOrder: (plan, couponCode = null) => {
        const body = { plan }
        if (couponCode) body.couponCode = couponCode
        return apiClient.post('/payment/paypal/create-order', body)
    },
    capturePayPalPayment: (paymentId, payerId) =>
        apiClient.post('/payment/paypal/capture', { paymentId, payerId }),

    // ── Cashfree ───────────────────────────────────────────────────────────────
    createCashfreeOrder: (plan, couponCode = null) => {
        const body = { plan }
        if (couponCode) body.couponCode = couponCode
        return apiClient.post('/payment/cashfree/create-order', body)
    },
    verifyCashfreePayment: (orderId) =>
        apiClient.post('/payment/cashfree/verify', { orderId }),
}


/**
 * Analytics Service
 */
export const analyticsService = {
    trackEvent: (eventData) => apiClient.post('/analytics/track', eventData),
}

/**
 * Admin Service
 */
export const adminService = {
    getStats: () => apiClient.get('/admin/stats'),
    getPendingTools: () => apiClient.get('/admin/tools/pending'),
    approveTool: (id) => apiClient.put(`/admin/tools/${id}/approve`),
    deleteTool: (id) => apiClient.delete(`/admin/tools/${id}`),
    getPendingReviews: () => apiClient.get('/admin/reviews/pending'),
    approveReview: (id) => apiClient.put(`/admin/reviews/${id}/approve`),
    rejectReview: (id) => apiClient.put(`/admin/reviews/${id}/reject`),
    getPayments: (params = {}) => apiClient.get('/admin/payments', { params }),
    getPendingClaims: () => apiClient.get('/admin/claims/pending'),
    approveClaim: (id) => apiClient.put(`/admin/claims/${id}/approve`),
    rejectClaim: (id) => apiClient.put(`/admin/claims/${id}/reject`),
    // Claims — full list with status filter
    getClaims: (params = {}) => apiClient.get('/admin/claims', { params }),
    approveClaimById: (id) => apiClient.put(`/admin/claims/${id}/approve`),
    rejectClaimById: (id, reason = '') => apiClient.put(`/admin/claims/${id}/reject`, { reason }),
    sendInvitation: (id, data = {}) => apiClient.post(`/admin/tools/${id}/invite`, data),
    updateTool: (id, data) => apiClient.put(`/tools/${id}`, data),
    getUsers: (params = {}) => apiClient.get('/admin/users', { params }),
    // BUG-02 fix: backend expects { tier, status, startDate, endDate, autoRenew }
    // old signature was { action, tier, duration } which the backend never consumed
    overrideSubscription: (userId, data) =>
        apiClient.post(`/admin/users/${userId}/subscription`, data),
    getRevenueAnalytics: (days = 30) => apiClient.get(`/analytics/revenue?days=${days}`),
    // Blog
    getAllBlogPosts: (params = {}) => apiClient.get('/blog/admin/all', { params }),
    createBlogPost: (data) => apiClient.post('/blog', data),
    updateBlogPost: (id, data) => apiClient.put(`/blog/${id}`, data),
    deleteBlogPost: (id) => apiClient.delete(`/blog/${id}`),
    // Coupons
    getAllCoupons: () => apiClient.get('/coupons'),
    createCoupon: (data) => apiClient.post('/coupons', data),
    updateCoupon: (id, data) => apiClient.patch(`/coupons/${id}`, data),
    deleteCoupon: (id) => apiClient.delete(`/coupons/${id}`),
    // Batch 7 — Link Health
    getLinkHealth: () => apiClient.get('/admin/link-health'),
    getDeadTools: (params = {}) => apiClient.get('/admin/link-health/dead', { params }),
    restoreTool: (id) => apiClient.post(`/admin/link-health/restore/${id}`),
    // Batch 7 — Discovery Queue
    getDiscoveryPending: (params = {}) => apiClient.get('/admin/discovery/pending', { params }),
    triggerDiscovery: (daysBack = 1) => apiClient.post('/admin/discovery/trigger', { daysBack }),
    discardDiscoveredTool: (id) => apiClient.delete(`/admin/discovery/discard/${id}`),
    // Featured Listings (Vendor Sponsorships) — IMPL-13
    getFeaturedListings: (params = {}) => apiClient.get('/admin/featured-listings', { params }),
    createFeaturedListing: (data) => apiClient.post('/admin/featured-listings', data),
    updateFeaturedListing: (id, data) => apiClient.patch(`/admin/featured-listings/${id}`, data),
    deactivateFeaturedListing: (id) => apiClient.delete(`/admin/featured-listings/${id}`),
    expireStaleFeaturedListings: () => apiClient.post('/admin/featured-listings/expire-stale'),
    // Affiliate Analytics — IMPL GROUP 2
    getAffiliateClickAnalytics: (queryString = '') => apiClient.get(`/analytics/affiliate-clicks${queryString ? '?' + queryString : ''}`),
    bulkUpdateAffiliateStatus: (data) => apiClient.patch('/admin/tools/bulk-affiliate-status', data),
    // Enrichment Stats — IMPL GROUP 2
    getEnrichmentStats: () => apiClient.get('/admin/tools/enrichment-stats'),
    // Feature Flags
    getFeatureFlags: () => apiClient.get('/admin/feature-flags'),
    toggleFeatureFlag: (key, enabled) => apiClient.patch(`/admin/feature-flags/${key}`, { enabled }),
    seedFeatureFlags: () => apiClient.post('/admin/feature-flags/seed'),
    // Enrichment on-demand trigger
    triggerEnrichment: (batchSize = 50) => apiClient.post('/admin/enrichment/trigger', { batchSize }),
    // Live activity feed
    getRecentActivity: (limit = 20) => apiClient.get('/admin/activity/recent', { params: { limit } }),
    // Affiliate revenue report
    getAffiliateReport: (from, to) => apiClient.get('/admin/affiliate/report', { params: { from, to } }),
}

/**
 * Tool Search Suggestions Service
 * GET /api/v1/tools/suggestions?q=...
 */
export const suggestionsService = {
    getSuggestions: (q) => apiClient.get('/tools/suggestions', { params: { q } }),
}

/**
 * Collection Service
 */
export const collectionService = {
    getPublicCollections: (params = {}) => apiClient.get('/collections/public', { params }),
    getCollectionById: (id) => apiClient.get(`/collections/${id}`),
    getMyCollections: () => apiClient.get('/collections/me'),
    createCollection: (data) => apiClient.post('/collections', data),
    updateCollection: (id, data) => apiClient.put(`/collections/${id}`, data),
    deleteCollection: (id) => apiClient.delete(`/collections/${id}`),
    addTool: (collectionId, toolId) => apiClient.post(`/collections/${collectionId}/tools`, { toolId }),
    removeTool: (collectionId, toolId) => apiClient.delete(`/collections/${collectionId}/tools/${toolId}`),
}

/**
 * Newsletter Service
 */
export const newsletterService = {
    subscribe: (email, source = 'website') => apiClient.post('/newsletter/subscribe', { email, source }),
    unsubscribe: (email, type = 'marketing') => apiClient.post('/newsletter/unsubscribe', { email, type }),
}

/**
 * Submission Service
 */
export const submissionService = {
    submit: (data) => apiClient.post('/submissions', data),
    getMine: () => apiClient.get('/submissions/mine'),
    getAll: (params = {}) => apiClient.get('/submissions', { params }),
    review: (id, action, reviewNotes = '') => apiClient.patch(`/submissions/${id}/review`, { action, reviewNotes }),
}

/**
 * Coupon Service
 */
export const couponService = {
    validate: (code, planId) => apiClient.post('/coupons/validate', { code, planId }),
    getAll: () => apiClient.get('/coupons'),
    create: (data) => apiClient.post('/coupons', data),
    update: (id, data) => apiClient.patch(`/coupons/${id}`, data),
    remove: (id) => apiClient.delete(`/coupons/${id}`),
}

/**
 * Blog Service
 */
export const blogService = {
    getPosts: (params = {}) => apiClient.get('/blog', { params }),
    getPost: (slug) => apiClient.get(`/blog/${slug}`),
    getAllPosts: (params = {}) => apiClient.get('/blog/admin/all', { params }),
    create: (data) => apiClient.post('/blog', data),
    update: (id, data) => apiClient.put(`/blog/${id}`, data),
    remove: (id) => apiClient.delete(`/blog/${id}`),
}

/**
 * GDPR Service
 */
export const gdprService = {
    getSummary: () => apiClient.get('/gdpr/summary'),
    exportData: () => apiClient.get('/gdpr/export', { responseType: 'blob' }),
    deleteData: () => apiClient.delete('/gdpr/delete'),
}

/**
 * Stack Advisor Service
 * NOTE: uses /api/stack-advisor (no /v1/) so we build the full path explicitly.
 */
const STACK_BASE = (import.meta.env.VITE_API_URL || 'https://api.intelligrid.online/api/v1')
    .replace('/api/v1', '/api/stack-advisor')

import axios from 'axios'
import { getAuthToken } from './tokenStore'

const stackClient = axios.create({ baseURL: STACK_BASE, headers: { 'Content-Type': 'application/json' } })
stackClient.interceptors.request.use(async (config) => {
    const token = await getAuthToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
}, (error) => Promise.reject(error))
stackClient.interceptors.response.use(
    (response) => response.data,
    (error) => Promise.reject(error)
)

export const stackAdvisorService = {
    getRecommendations: (data) => stackClient.post('/recommend', data),
    getHistory: () => stackClient.get('/history'),
    deleteStack: (stackId) => stackClient.delete(`/history/${stackId}`),
}
