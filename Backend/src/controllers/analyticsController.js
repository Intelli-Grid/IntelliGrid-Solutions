import User from '../models/User.js'
import Order from '../models/Order.js'

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
            proMonthly: 0,
            proYearly: 0
        }

        let totalMRR = 0
        let activeSubscriptions = 0

        users.forEach(user => {
            const plan = user.subscription?.plan || 'Free'

            if (plan === 'Free' || !user.subscription || user.subscription.status !== 'active') {
                subscriptionBreakdown.free++
            } else if (plan === 'Pro Monthly' && user.subscription.status === 'active') {
                subscriptionBreakdown.proMonthly++
                activeSubscriptions++
                totalMRR += 9.99
            } else if (plan === 'Pro Yearly' && user.subscription.status === 'active') {
                subscriptionBreakdown.proYearly++
                activeSubscriptions++
                totalMRR += 99.99 / 12
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
            .populate('user', 'email name')
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
                userName: order.user ? order.user.name : 'Unknown',
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

// Get tool analytics
export const getToolAnalytics = async (req, res) => {
    try {
        // This would require Tool model - placeholder for now
        res.json({
            success: true,
            data: {
                totalTools: 3690,
                newToolsThisMonth: 45,
                categories: 50,
                averageRating: 4.5
            }
        })
    } catch (error) {
        console.error('Get tool analytics error:', error)
        res.status(500).json({ error: 'Failed to fetch tool analytics' })
    }
}
