
import apiClient from './api.js'

// ─── Core Admin ───────────────────────────────────────────────────────────────
export const adminService = {
    // Dashboard Stats
    getStats: () => apiClient.get('/admin/stats'),

    // System Health — maps to GET /api/v1/admin/system
    getSystemHealth: () => apiClient.get('/admin/system'),

    // Recent Activity Feed — maps to GET /api/v1/admin/activity/recent
    getRecentActivity: (params) => apiClient.get('/admin/activity/recent', { params }),

    // ── Tool Queue ────────────────────────────────────────────────────────────
    getPendingTools: (params) => apiClient.get('/admin/tools/pending', { params }),
    approveTool: (id) => apiClient.put(`/admin/tools/${id}/approve`),
    rejectTool: (id, reason) => apiClient.post(`/admin/tools/${id}/reject`, { reason }),
    updateTool: (id, data) => apiClient.put(`/admin/tools/${id}`, data),

    // ── Discovery Queue (auto-discovered tools from crawlers) ─────────────────
    getDiscoveryQueue: (params) => apiClient.get('/admin/discovery/pending', { params }),
    triggerDiscovery: (daysBack = 1) => apiClient.post('/admin/discovery/trigger', { daysBack }),
    discardDiscoveredTool: (id) => apiClient.delete(`/admin/discovery/discard/${id}`),

    // ── Review Moderation ─────────────────────────────────────────────────────
    getPendingReviews: () => apiClient.get('/admin/reviews/pending'),
    approveReview: (id) => apiClient.put(`/admin/reviews/${id}/approve`),
    rejectReview: (id) => apiClient.put(`/admin/reviews/${id}/reject`),

    // ── User Management ───────────────────────────────────────────────────────
    getUsers: (params) => apiClient.get('/admin/users', { params }),
    getUserById: (id) => apiClient.get(`/admin/users/${id}`),
    updateUserRole: (id, role) => apiClient.patch(`/admin/users/${id}/role`, { role }),
    banUser: (id, reason) => apiClient.post(`/admin/users/${id}/ban`, { reason }),
    overrideSubscription: (id, tier) => apiClient.post(`/admin/users/${id}/subscription`, { tier }),

    // ── Revenue & Payments ────────────────────────────────────────────────────
    getPayments: (params) => apiClient.get('/admin/payments', { params }),

    // ── Claim Requests (Vendor Verification) ──────────────────────────────────
    getClaims: (params) => apiClient.get('/admin/claims', { params }),
    approveClaim: (id) => apiClient.put(`/admin/claims/${id}/approve`),
    rejectClaim: (id, reason) => apiClient.put(`/admin/claims/${id}/reject`, { reason }),

    // ── Featured / Sponsored Listings ─────────────────────────────────────────
    getFeaturedListings: (params) => apiClient.get('/admin/featured-listings', { params }),
    createFeaturedListing: (data) => apiClient.post('/admin/featured-listings', data),
    updateFeaturedListing: (id, data) => apiClient.patch(`/admin/featured-listings/${id}`, data),
    deleteFeaturedListing: (id) => apiClient.delete(`/admin/featured-listings/${id}`),
    expireStaleFeaturedListings: () => apiClient.post('/admin/featured-listings/expire-stale'),

    // ── Feature Flags ─────────────────────────────────────────────────────────
    getFeatureFlags: () => apiClient.get('/admin/feature-flags'),
    updateFeatureFlag: (key, updates) => apiClient.patch(`/admin/feature-flags/${key}`, updates),
    seedFeatureFlags: () => apiClient.post('/admin/feature-flags/seed'),

    // ── Enrichment ────────────────────────────────────────────────────────────
    triggerEnrichment: (batchSize = 50, priority = 'score') =>
        apiClient.post('/admin/enrichment/trigger', { batchSize, priority }),
    forceResetEnrichment: (categorySlug) =>
        apiClient.post('/admin/enrichment/force-reset-all', {
            confirm: 'FORCE_RESET_ALL',
            ...(categorySlug && { categorySlug }),
        }),

    // ── Link Health ───────────────────────────────────────────────────────────
    getLinkHealth: () => apiClient.get('/admin/link-health'),
    getDeadLinks: (params) => apiClient.get('/admin/link-health/dead', { params }),
    restoreDeadLink: (id) => apiClient.post(`/admin/link-health/restore/${id}`),

    // ── Affiliate Report ──────────────────────────────────────────────────────
    getAffiliateReport: (params) => apiClient.get('/admin/affiliate/report', { params }),
}

// ─── Tool Service (preview / direct edit) ─────────────────────────────────────
export const toolService = {
    get: (id) => apiClient.get(`/tools/${id}`),
    update: (id, data) => apiClient.put(`/admin/tools/${id}`, data),
}
