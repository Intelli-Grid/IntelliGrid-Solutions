import AnalyticsEvent from '../models/AnalyticsEvent.js'
import SearchLog from '../models/SearchLog.js'
import Tool from '../models/Tool.js'
import User from '../models/User.js'
import Order from '../models/Order.js'

/**
 * Analytics Service - Business logic for analytics
 */
class AnalyticsService {
    /**
     * Track event
     */
    async trackEvent(eventData) {
        const { eventType, user, sessionId, data, metadata } = eventData

        await AnalyticsEvent.create({
            eventType,
            user,
            sessionId,
            data,
            metadata,
        })
    }

    /**
     * Log search query
     */
    async logSearch(searchData) {
        const { query, user, sessionId, filters, resultsCount, metadata } = searchData

        await SearchLog.create({
            query,
            user,
            sessionId,
            filters,
            resultsCount,
            metadata,
        })
    }

    /**
     * Log search click
     */
    async logSearchClick(searchLogId, toolId, position) {
        await SearchLog.findByIdAndUpdate(searchLogId, {
            $push: {
                clickedResults: {
                    tool: toolId,
                    position,
                },
            },
        })
    }

    /**
     * Get dashboard analytics (admin)
     */
    async getDashboardAnalytics(dateRange = {}) {
        const { startDate, endDate } = dateRange
        const dateFilter = {}

        if (startDate) dateFilter.$gte = new Date(startDate)
        if (endDate) dateFilter.$lte = new Date(endDate)

        const query = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}

        // Get various metrics
        const [
            totalUsers,
            totalTools,
            totalOrders,
            totalRevenue,
            activeSubscriptions,
            topSearches,
            popularTools,
        ] = await Promise.all([
            User.countDocuments(query),
            Tool.countDocuments({ ...query, status: 'active' }),
            Order.countDocuments({ ...query, status: 'completed' }),
            this.getTotalRevenue(query),
            User.countDocuments({
                ...query,
                'subscription.status': 'active',
                'subscription.tier': { $ne: 'Free' },
            }),
            this.getTopSearches(query, 10),
            this.getPopularTools(query, 10),
        ])

        return {
            overview: {
                totalUsers,
                totalTools,
                totalOrders,
                totalRevenue,
                activeSubscriptions,
            },
            topSearches,
            popularTools,
        }
    }

    /**
     * Get total revenue
     */
    async getTotalRevenue(query = {}) {
        const result = await Order.aggregate([
            { $match: { ...query, status: 'completed' } },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount.total' },
                },
            },
        ])

        return result[0]?.total || 0
    }

    /**
     * Get top searches
     */
    async getTopSearches(query = {}, limit = 10) {
        const searches = await SearchLog.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$query',
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: limit },
            {
                $project: {
                    query: '$_id',
                    count: 1,
                    _id: 0,
                },
            },
        ])

        return searches
    }

    /**
     * Get popular tools
     */
    async getPopularTools(query = {}, limit = 10) {
        const tools = await Tool.find({ ...query, status: 'active' })
            .select('name slug views favorites ratings')
            .sort('-views -favorites')
            .limit(limit)
            .lean()

        return tools
    }

    /**
     * Get user activity timeline
     */
    async getUserActivity(userId, options = {}) {
        const { page = 1, limit = 20 } = options
        const skip = (page - 1) * limit

        const [events, total] = await Promise.all([
            AnalyticsEvent.find({ user: userId })
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .lean(),
            AnalyticsEvent.countDocuments({ user: userId }),
        ])

        return {
            events,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        }
    }
}

export default new AnalyticsService()
