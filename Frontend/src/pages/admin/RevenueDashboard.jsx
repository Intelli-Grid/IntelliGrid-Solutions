import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Users, CreditCard, Calendar, Download, RefreshCw } from 'lucide-react'
import api from '../../utils/api'

export default function RevenueDashboard() {
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState('30') // days
    const [stats, setStats] = useState({
        mrr: 0,
        arr: 0,
        totalRevenue: 0,
        activeSubscriptions: 0,
        subscriptionBreakdown: {
            free: 0,
            proMonthly: 0,
            proYearly: 0
        },
        revenueByPlan: {
            proMonthly: 0,
            proYearly: 0
        },
        paymentStats: {
            successful: 0,
            failed: 0,
            successRate: 0
        },
        recentTransactions: []
    })

    useEffect(() => {
        fetchRevenueData()
    }, [dateRange])

    const fetchRevenueData = async () => {
        try {
            setLoading(true)
            const response = await api.get(`/analytics/revenue?days=${dateRange}`)
            setStats(response.data.data)
        } catch (error) {
            console.error('Error fetching revenue data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount)
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const exportData = () => {
        const dataStr = JSON.stringify(stats, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `revenue-report-${new Date().toISOString().split('T')[0]}.json`
        link.click()
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-accent-cyan animate-spin mx-auto mb-4" />
                    <p className="text-white text-lg">Loading revenue data...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space">
            <div className="max-w-7xl mx-auto px-6 py-16">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-extrabold text-white mb-2">Revenue Dashboard</h1>
                            <p className="text-gray-400">Track your subscription revenue and metrics</p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Date Range Selector */}
                            <select
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-accent-cyan"
                            >
                                <option value="7">Last 7 days</option>
                                <option value="30">Last 30 days</option>
                                <option value="90">Last 90 days</option>
                                <option value="365">Last year</option>
                            </select>

                            {/* Refresh Button */}
                            <button
                                onClick={fetchRevenueData}
                                className="p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>

                            {/* Export Button */}
                            <button
                                onClick={exportData}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-cyan to-accent-purple text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                            >
                                <Download className="w-5 h-5" />
                                <span>Export</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* MRR Card */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-accent-cyan/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-xl">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">MRR</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">
                            {formatCurrency(stats.mrr)}
                        </div>
                        <p className="text-sm text-gray-400">Monthly Recurring Revenue</p>
                    </div>

                    {/* ARR Card */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-accent-emerald/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-gradient-to-r from-accent-emerald to-accent-cyan rounded-xl">
                                <TrendingUp className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">ARR</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">
                            {formatCurrency(stats.arr)}
                        </div>
                        <p className="text-sm text-gray-400">Annual Recurring Revenue</p>
                    </div>

                    {/* Total Revenue Card */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-accent-purple/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-gradient-to-r from-accent-purple to-accent-rose rounded-xl">
                                <CreditCard className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">Total</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">
                            {formatCurrency(stats.totalRevenue)}
                        </div>
                        <p className="text-sm text-gray-400">Total Revenue ({dateRange} days)</p>
                    </div>

                    {/* Active Subscriptions Card */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-accent-amber/50 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-gradient-to-r from-accent-amber to-accent-rose rounded-xl">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xs text-gray-400 uppercase tracking-wider">Active</span>
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">
                            {stats.activeSubscriptions}
                        </div>
                        <p className="text-sm text-gray-400">Active Subscriptions</p>
                    </div>
                </div>

                {/* Subscription Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Subscription Plans */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Users className="w-5 h-5 text-accent-cyan" />
                            Subscription Breakdown
                        </h2>

                        <div className="space-y-4">
                            {/* Free */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-300">Free Plan</span>
                                    <span className="text-white font-semibold">{stats.subscriptionBreakdown.free}</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2">
                                    <div
                                        className="bg-gray-400 h-2 rounded-full transition-all duration-500"
                                        style={{
                                            width: `${(stats.subscriptionBreakdown.free / stats.activeSubscriptions * 100) || 0}%`
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* Pro Monthly */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-300">Pro Monthly</span>
                                    <span className="text-white font-semibold">{stats.subscriptionBreakdown.proMonthly}</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-accent-cyan to-accent-purple h-2 rounded-full transition-all duration-500"
                                        style={{
                                            width: `${(stats.subscriptionBreakdown.proMonthly / stats.activeSubscriptions * 100) || 0}%`
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* Pro Yearly */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-gray-300">Pro Yearly</span>
                                    <span className="text-white font-semibold">{stats.subscriptionBreakdown.proYearly}</span>
                                </div>
                                <div className="w-full bg-white/10 rounded-full h-2">
                                    <div
                                        className="bg-gradient-to-r from-accent-emerald to-accent-cyan h-2 rounded-full transition-all duration-500"
                                        style={{
                                            width: `${(stats.subscriptionBreakdown.proYearly / stats.activeSubscriptions * 100) || 0}%`
                                        }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Revenue by Plan */}
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-accent-emerald" />
                            Revenue by Plan
                        </h2>

                        <div className="space-y-4">
                            {/* Pro Monthly Revenue */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                <div>
                                    <p className="text-gray-400 text-sm">Pro Monthly</p>
                                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.revenueByPlan.proMonthly)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400 text-sm">Subscribers</p>
                                    <p className="text-xl font-semibold text-accent-cyan">{stats.subscriptionBreakdown.proMonthly}</p>
                                </div>
                            </div>

                            {/* Pro Yearly Revenue */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                <div>
                                    <p className="text-gray-400 text-sm">Pro Yearly</p>
                                    <p className="text-2xl font-bold text-white">{formatCurrency(stats.revenueByPlan.proYearly)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400 text-sm">Subscribers</p>
                                    <p className="text-xl font-semibold text-accent-emerald">{stats.subscriptionBreakdown.proYearly}</p>
                                </div>
                            </div>

                            {/* Average Revenue Per User */}
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-accent-purple/10 to-accent-rose/10 border border-accent-purple/30 rounded-xl">
                                <div>
                                    <p className="text-gray-400 text-sm">ARPU (Average Revenue Per User)</p>
                                    <p className="text-2xl font-bold text-white">
                                        {formatCurrency(stats.activeSubscriptions > 0 ? stats.totalRevenue / stats.activeSubscriptions : 0)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Statistics */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-accent-purple" />
                        Payment Statistics
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Successful Payments */}
                        <div className="text-center p-4 bg-accent-emerald/10 border border-accent-emerald/30 rounded-xl">
                            <p className="text-gray-400 text-sm mb-2">Successful Payments</p>
                            <p className="text-3xl font-bold text-accent-emerald">{stats.paymentStats.successful}</p>
                        </div>

                        {/* Failed Payments */}
                        <div className="text-center p-4 bg-error/10 border border-error/30 rounded-xl">
                            <p className="text-gray-400 text-sm mb-2">Failed Payments</p>
                            <p className="text-3xl font-bold text-error">{stats.paymentStats.failed}</p>
                        </div>

                        {/* Success Rate */}
                        <div className="text-center p-4 bg-accent-cyan/10 border border-accent-cyan/30 rounded-xl">
                            <p className="text-gray-400 text-sm mb-2">Success Rate</p>
                            <p className="text-3xl font-bold text-accent-cyan">{stats.paymentStats.successRate.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-accent-amber" />
                        Recent Transactions
                    </h2>

                    {stats.recentTransactions && stats.recentTransactions.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Date</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">User</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Plan</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Amount</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentTransactions.map((transaction, index) => (
                                        <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-4 text-gray-300">{formatDate(transaction.date)}</td>
                                            <td className="py-3 px-4 text-white">{transaction.userEmail}</td>
                                            <td className="py-3 px-4 text-gray-300">{transaction.plan}</td>
                                            <td className="py-3 px-4 text-white font-semibold">{formatCurrency(transaction.amount)}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${transaction.status === 'success'
                                                        ? 'bg-accent-emerald/20 text-accent-emerald'
                                                        : 'bg-error/20 text-error'
                                                    }`}>
                                                    {transaction.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-400">No transactions in the selected period</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
