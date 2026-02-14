import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import {
    LayoutDashboard,
    Package,
    Users,
    Star,
    DollarSign,
    BarChart3,
    Settings,
    Plus,
    Edit,
    Trash2,
    Search,
    Check,
    X,
    Filter,
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import { adminService } from '../services'
import { useToast } from '../context/ToastContext'

export default function AdminPage() {
    const { user } = useUser()
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState('overview')
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalTools: 0,
        totalUsers: 0,
        totalReviews: 0,
        totalRevenue: 0,
    })

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            const data = await adminService.getStats()
            if (data.success) {
                setStats({
                    totalTools: data.stats.totalTools,
                    totalUsers: data.stats.totalUsers,
                    totalReviews: data.stats.totalReviews,
                    totalRevenue: data.stats.totalRevenue,
                })
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error)
            toast({
                title: 'Error',
                description: 'Failed to load dashboard statistics',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    // Check if user is admin
    const isAdmin = user?.publicMetadata?.role === 'admin'

    if (!isAdmin) {
        return (
            <div className="container mx-auto px-4 py-16">
                <div className="mx-auto max-w-md rounded-lg border border-red-500/20 bg-red-500/10 p-8 text-center">
                    <h1 className="mb-2 text-2xl font-bold text-white">Access Denied</h1>
                    <p className="text-gray-400">You don't have permission to access the admin panel.</p>
                </div>
            </div>
        )
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'tools', label: 'Tools', icon: Package },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'reviews', label: 'Reviews', icon: Star },
        { id: 'payments', label: 'Payments', icon: DollarSign },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: Settings },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="mb-2 text-4xl font-bold text-white">Admin Panel</h1>
                    <p className="text-gray-400">Manage your IntelliGrid platform</p>
                </div>

                {/* Stats Grid */}
                <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-white/10 bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-6">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm text-gray-400">Total Tools</div>
                            <Package className="h-5 w-5 text-purple-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">{stats.totalTools.toLocaleString()}</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm text-gray-400">Total Users</div>
                            <Users className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">{stats.totalUsers.toLocaleString()}</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-6">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm text-gray-400">Total Reviews</div>
                            <Star className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">{stats.totalReviews.toLocaleString()}</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-gradient-to-br from-green-500/10 to-green-500/5 p-6">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm text-gray-400">Revenue</div>
                            <DollarSign className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-8 flex space-x-2 overflow-x-auto border-b border-white/10 pb-4">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === tab.id
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Tab Content */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                    {activeTab === 'overview' && <OverviewTab />}
                    {activeTab === 'tools' && <ToolsTab />}
                    {activeTab === 'users' && <UsersTab />}
                    {activeTab === 'reviews' && <ReviewsTab />}
                    {activeTab === 'payments' && <PaymentsTab />}
                    {activeTab === 'analytics' && <AnalyticsTab />}
                    {activeTab === 'settings' && <SettingsTab />}
                </div>
            </div>
        </div>
    )
}

// Tab Components
function OverviewTab() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                    <h3 className="mb-4 font-semibold text-white">Recent Activity</h3>
                    <p className="text-sm text-gray-400">No recent activity</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                    <h3 className="mb-4 font-semibold text-white">Quick Actions</h3>
                    <div className="space-y-2">
                        <button className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm text-white transition hover:bg-purple-700">
                            Add New Tool
                        </button>
                        <button className="w-full rounded-lg border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/5">
                            Moderate Reviews
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ToolsTab() {
    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    useEffect(() => {
        fetchPendingTools()
    }, [])

    const fetchPendingTools = async () => {
        try {
            const data = await adminService.getPendingTools()
            if (data.success) {
                setTools(data.tools)
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to fetch pending tools',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id) => {
        try {
            await adminService.approveTool(id)
            toast({
                title: 'Success',
                description: 'Tool approved successfully',
                variant: 'default',
            })
            fetchPendingTools() // Refresh list
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to approve tool',
                variant: 'destructive',
            })
        }
    }

    const handleReject = async (id) => {
        if (!window.confirm('Are you sure you want to reject and delete this tool?')) return

        try {
            await adminService.deleteTool(id)
            toast({
                title: 'Success',
                description: 'Tool rejected successfully',
                variant: 'default',
            })
            fetchPendingTools() // Refresh list
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to reject tool',
                variant: 'destructive',
            })
        }
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Pending Tools ({tools.length})</h2>
                <button className="flex items-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white transition hover:bg-purple-700">
                    <Plus className="h-4 w-4" />
                    <span>Add Tool</span>
                </button>
            </div>

            {tools.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white/5 rounded-lg border border-white/10">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending tools to review.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {tools.map((tool) => (
                        <div key={tool._id} className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5">
                            <div>
                                <h3 className="font-semibold text-white">{tool.name}</h3>
                                <p className="text-sm text-gray-400">{tool.shortDescription}</p>
                                <div className="flex gap-2 mt-2 text-xs">
                                    <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                                        {tool.pricingModel}
                                    </span>
                                    <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                                        {tool.category}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleApprove(tool._id)}
                                    className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                                    title="Approve"
                                >
                                    <Check className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => handleReject(tool._id)}
                                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                                    title="Reject"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function UsersTab() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">User Management</h2>
            <p className="text-gray-400">Manage users, subscriptions, and permissions</p>
        </div>
    )
}

function ReviewsTab() {
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    useEffect(() => {
        fetchPendingReviews()
    }, [])

    const fetchPendingReviews = async () => {
        try {
            const data = await adminService.getPendingReviews()
            if (data.success) {
                setReviews(data.reviews)
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to fetch pending reviews',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id) => {
        try {
            await adminService.approveReview(id)
            toast({
                title: 'Success',
                description: 'Review approved successfully',
                variant: 'default',
            })
            fetchPendingReviews() // Refresh
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to approve review',
                variant: 'destructive',
            })
        }
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Pending Reviews ({reviews.length})</h2>

            {reviews.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white/5 rounded-lg border border-white/10">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending reviews to moderate.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review._id} className="p-4 rounded-lg border border-white/10 bg-white/5">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-white">Tool ID: {review.toolId}</span>
                                        <span className="flex text-yellow-400">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-current' : 'text-gray-600'}`} />
                                            ))}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 text-sm">{review.comment}</p>
                                </div>
                                <button
                                    onClick={() => handleApprove(review._id)}
                                    className="px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 text-sm font-medium transition"
                                >
                                    Approve
                                </button>
                            </div>
                            <div className="text-xs text-gray-500">
                                By User: {review.userId} • {new Date(review.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function PaymentsTab() {
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    useEffect(() => {
        fetchPayments()
    }, [])

    const fetchPayments = async () => {
        try {
            const data = await adminService.getPayments({ limit: 20 })
            if (data.success) {
                setPayments(data.payments)
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to fetch payments',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Recent Transactions</h2>

            <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-white/5 text-xs uppercase text-gray-200">
                        <tr>
                            <th className="px-6 py-3">ID</th>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {payments.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center">No payments found</td>
                            </tr>
                        ) : (
                            payments.map((payment) => (
                                <tr key={payment._id} className="hover:bg-white/5">
                                    <td className="px-6 py-4 font-mono text-xs">{payment.paymentId ? payment.paymentId.substring(0, 12) + '...' : payment._id}</td>
                                    <td className="px-6 py-4">{payment.userId}</td>
                                    <td className="px-6 py-4 text-white font-medium">${payment.amount}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${payment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                            }`}>
                                            {payment.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{new Date(payment.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function AnalyticsTab() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Analytics & Reports</h2>
            <p className="text-gray-400">View detailed analytics and generate reports</p>
        </div>
    )
}

function SettingsTab() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
            <div className="space-y-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-2 font-semibold text-white">General Settings</h3>
                    <p className="text-sm text-gray-400">Configure platform-wide settings</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-2 font-semibold text-white">Payment Settings</h3>
                    <p className="text-sm text-gray-400">Manage PayPal and Cashfree configurations</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-2 font-semibold text-white">Email Settings</h3>
                    <p className="text-sm text-gray-400">Configure email notifications</p>
                </div>
            </div>
        </div>
    )
}
