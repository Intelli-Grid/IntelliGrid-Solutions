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
    Filter,
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'

export default function AdminPage() {
    const { user } = useUser()
    const [activeTab, setActiveTab] = useState('overview')
    const [loading, setLoading] = useState(false)
    const [stats, setStats] = useState({
        totalTools: 3690,
        totalUsers: 0,
        totalReviews: 0,
        totalRevenue: 0,
    })

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
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Manage Tools</h2>
                <button className="flex items-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white transition hover:bg-purple-700">
                    <Plus className="h-4 w-4" />
                    <span>Add Tool</span>
                </button>
            </div>

            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="search"
                        placeholder="Search tools..."
                        className="w-full rounded-lg border border-white/10 bg-gray-800 py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:border-purple-600 focus:outline-none"
                    />
                </div>
                <button className="flex items-center space-x-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10">
                    <Filter className="h-4 w-4" />
                    <span>Filters</span>
                </button>
            </div>

            <div className="text-center text-gray-400">
                <p>Tool management interface - Connect to API endpoints</p>
            </div>
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
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Review Moderation</h2>
            <p className="text-gray-400">Approve, reject, or delete user reviews</p>
        </div>
    )
}

function PaymentsTab() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Payment Management</h2>
            <p className="text-gray-400">View transactions, subscriptions, and revenue</p>
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
