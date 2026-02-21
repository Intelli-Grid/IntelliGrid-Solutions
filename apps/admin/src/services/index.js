
import apiClient from './api.js'

export const adminService = {
    getStats: () => apiClient.get('/admin/stats'),
    getPendingTools: () => apiClient.get('/admin/tools/pending'),
    approveTool: (id) => apiClient.put(`/admin/tools/${id}/approve`),
    rejectTool: (id, reason) => apiClient.delete(`/admin/tools/${id}`), // Currently permanent deletion
    getPendingReviews: () => apiClient.get('/admin/reviews/pending'),
    approveReview: (id) => apiClient.put(`/admin/reviews/${id}/approve`),
    rejectReview: (id) => apiClient.put(`/admin/reviews/${id}/reject`),
    getUsers: (params) => apiClient.get('/admin/users', { params }), // params: { search, page, limit }
    getPayments: (params) => apiClient.get('/admin/payments', { params }), // params: { page, limit }
    getSystemHealth: () => apiClient.get('/admin/system'),
}

export const toolService = {
    // If needed for admin preview/edit
    get: (id) => apiClient.get(`/tools/${id}`),
    update: (id, data) => apiClient.put(`/admin/tools/${id}`, data),
}
