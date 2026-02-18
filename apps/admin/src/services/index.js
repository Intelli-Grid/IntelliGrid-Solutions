
import apiClient from './api.js'

export const adminService = {
    getStats: () => apiClient.get('/admin/stats'),
    getPendingTools: () => apiClient.get('/admin/tools/pending'),
    approveTool: (id) => apiClient.post(`/admin/tools/${id}/approve`),
    rejectTool: (id, reason) => apiClient.post(`/admin/tools/${id}/reject`, { reason }),
    getFlaggedReviews: () => apiClient.get('/admin/reviews/flagged'),
    // ... add more as needed
}

export const toolService = {
    // If needed for admin preview/edit
    get: (id) => apiClient.get(`/tools/${id}`),
    update: (id, data) => apiClient.put(`/admin/tools/${id}`, data),
}
