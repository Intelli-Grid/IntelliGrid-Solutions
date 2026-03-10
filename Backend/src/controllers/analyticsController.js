import User from '../models/User.js'
import Order from '../models/Order.js'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js'

// Get revenue analytics
export const getRevenueAnalytics = async (req, res) => {
    try {
        const { days = 30 } = req.query
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - parseInt(days))

        // 1. Get Subscription Metrics from Users
        const users = await User.find().select('subscription email name').lean()

        const subscriptionBreakdown = {
            free: 0,
            basic: 0,
            premium: 0,
            enterprise: 0
        }

        let totalMRR = 0
        let activeSubscriptions = 0

        // Monthly USD pricing — must match paymentService.getSubscriptionPricing()
        // MRR contribution:
        //   monthly subscriber → full monthly price
        //   yearly subscriber  → annual price ÷ 12 (annualised monthly equivalent)
        const MONTHLY_PRICE = { Basic: 4.99, Premium: 9.99, Enterprise: 24.99 }
        const YEARLY_PRICE = { Basic: 49.99, Premium: 99.99, Enterprise: 249.99 }

        users.forEach(user => {
            const sub = user.subscription || {}
            const tier = sub.tier || 'Free'
            const status = sub.status
            const PAID_TIERS = ['Basic', 'Premium', 'Enterprise', 'Pro', 'Business'] // Adding legacy tiers for safety

            // Map any legacy 'Pro' to 'premium'
            const normalizedTier = tier === 'Pro' ? 'premium' : tier.toLowerCase()

            if (PAID_TIERS.includes(tier) && status === 'active') {
                activeSubscriptions++

                subscriptionBreakdown[normalizedTier] = (subscriptionBreakdown[normalizedTier] || 0) + 1

                const start = sub.startDate ? new Date(sub.startDate) : null
                const end = sub.endDate ? new Date(sub.endDate) : null
                const isYearly = start && end && (end - start) > 35 * 24 * 60 * 60 * 1000

                if (isYearly) {
                    totalMRR += (YEARLY_PRICE[tier] || 99.99) / 12
                } else {
                    totalMRR += MONTHLY_PRICE[tier] || 9.99
                }
            } else {
                subscriptionBreakdown.free++
            }
        })

        const totalARR = totalMRR * 12

        // 2. Get Revenue History (Grouping by day for the chart)
        // Group by day: YYYY-MM-DD
        const revenueHistory = await Order.aggregate([
            {
                $match: {
                    status: 'completed',
                    createdAt: { $gte: daysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    dailyRevenue: { $sum: "$amount.total" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ])

        // 3. Get Recent Transactions
        const recentOrders = await Order.find({
            createdAt: { $gte: daysAgo }
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('user', 'email firstName lastName')
            .lean()

        // 4. Calculate Payment Success Rate
        const totalOrdersPeriod = await Order.countDocuments({ createdAt: { $gte: daysAgo } })

        // Count successful orders
        const successCount = await Order.countDocuments({
            createdAt: { $gte: daysAgo },
            status: 'completed'
        })

        // Count failed orders
        const failedCount = await Order.countDocuments({
            createdAt: { $gte: daysAgo },
            status: { $in: ['failed', 'cancelled'] }
        })

        const paymentStats = {
            total: totalOrdersPeriod,
            successful: successCount,
            failed: failedCount,
            successRate: totalOrdersPeriod > 0
                ? ((successCount / totalOrdersPeriod) * 100).toFixed(1)
                : 100
        }

        // 5. Calculate Total Revenue (All time)
        const totalRevenueResult = await Order.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount.total' } } }
        ])
        const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0

        const analytics = {
            mrr: parseFloat(totalMRR.toFixed(2)),
            arr: parseFloat(totalARR.toFixed(2)),
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            activeSubscriptions,
            subscriptionBreakdown,
            paymentStats,
            recentTransactions: recentOrders.map(order => ({
                id: order._id,
                date: order.createdAt,
                userEmail: order.user ? order.user.email : 'Deleted User',
                // BUG-20 fix: User model has firstName+lastName, not name
                userName: order.user
                    ? (`${order.user.firstName || ''} ${order.user.lastName || ''}`).trim() || order.user.email
                    : 'Deleted User',
                plan: order.subscription?.tier || 'Pro',
                amount: order.amount?.total || 0,
                status: order.status,
                gateway: order.paymentGateway
            })),
            revenueChart: revenueHistory.map(item => ({
                date: item._id,
                amount: item.dailyRevenue
            }))
        }

        res.json({
            success: true,
            data: analytics
        })
    } catch (error) {
        console.error('Get revenue analytics error:', error)
        res.status(500).json({ error: 'Failed to fetch revenue analytics' })
    }
}

// Get user growth analytics
export const getUserGrowthAnalytics = async (req, res) => {
    try {
        const { days = 30 } = req.query
        const daysAgo = new Date()
        daysAgo.setDate(daysAgo.getDate() - parseInt(days))

        const newUsers = await User.countDocuments({
            createdAt: { $gte: daysAgo }
        })

        const totalUsers = await User.countDocuments()

        const growthRate = totalUsers > 0
            ? ((newUsers / totalUsers) * 100).toFixed(2)
            : 0

        res.json({
            success: true,
            data: {
                newUsers,
                totalUsers,
                growthRate,
                period: `${days} days`
            }
        })
    } catch (error) {
        console.error('Get user growth analytics error:', error)
        res.status(500).json({ error: 'Failed to fetch user growth analytics' })
    }
}

// Get tool analytics — real DB queries (no hardcoded values)
export const getToolAnalytics = async (req, res) => {
    try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        const [totalTools, newToolsThisMonth, totalCategories, ratingResult] = await Promise.all([
            Tool.countDocuments({ status: 'active', isActive: { $ne: false } }),
            Tool.countDocuments({ status: 'active', isActive: { $ne: false }, createdAt: { $gte: startOfMonth } }),
            Category.countDocuments({ isActive: true }),
            Tool.aggregate([
                { $match: { status: 'active', isActive: { $ne: false }, 'ratings.count': { $gt: 0 } } },
                { $group: { _id: null, avg: { $avg: '$ratings.average' } } }
            ])
        ])

        res.json({
            success: true,
            data: {
                totalTools,
                newToolsThisMonth,
                categories: totalCategories,
                averageRating: ratingResult[0]?.avg
                    ? parseFloat(ratingResult[0].avg.toFixed(2))
                    : 0
            }
        })
    } catch (error) {
        console.error('Get tool analytics error:', error)
        res.status(500).json({ error: 'Failed to fetch tool analytics' })
    }
}
