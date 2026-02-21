
import { useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    CheckCircle,
    Clock,
    Users,
    DollarSign,
    Package,
    Star,
    Activity,
    ExternalLink,
    RefreshCw
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { adminService } from '../services'

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatusCard = ({ title, value, subtext, icon: Icon, trend, trendLabel }) => (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 flex flex-col justify-between hover:border-[#3a3d4a] transition-colors relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icon size={48} strokeWidth={1.5} />
        </div>

        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="text-slate-400 text-sm font-medium tracking-wide">{title}</div>
            {trend && (
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                    {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    <span>{trendLabel}</span>
                </div>
            )}
        </div>

        <div className="relative z-10">
            <div className="text-2xl font-bold text-slate-100 mb-1">{value}</div>
            {subtext && <div className="text-xs text-slate-500">{subtext}</div>}
        </div>
    </div>
)

const HealthIndicator = ({ label, status, value }) => {
    const isHealthy = status === 'connected' || status === 'synced' || (typeof value === 'number' && value < 200)
    return (
        <div className="flex items-center justify-between py-3 border-b border-[#2a2d3a] last:border-0">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isHealthy
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                    : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                    }`} />
                <span className="text-sm text-slate-300 font-medium">{label}</span>
            </div>
            <div className="text-xs font-mono text-slate-500">
                {value != null ? `${value}ms` : status === 'connected' ? 'OK' : status}
            </div>
        </div>
    )
}

// ─── Main Component ─────────────────────────────────────────────────────────────

const Overview = () => {
    const navigate = useNavigate()
    const [stats, setStats] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState(null)

    const fetchStats = async () => {
        try {
            const data = await adminService.getStats()
            if (data.success) {
                setStats(data.stats)
                setLastUpdated(new Date())
            }
        } catch (error) {
            console.error('Failed to load stats:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchStats()
    }, [])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Dashboard Overview</h1>
                    <p className="text-slate-500 text-sm mt-0.5">
                        {lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Real-time data'}
                    </p>
                </div>
                <button
                    onClick={() => { setIsLoading(true); fetchStats() }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg hover:border-[#3a3d4a] transition-all"
                >
                    <RefreshCw size={12} />
                    Refresh
                </button>
            </div>

            {/* 1. Urgent Triage Row */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                        <AlertCircle size={14} className="text-indigo-400" />
                        Urgent Attention
                    </h2>
                    <span className="text-xs text-slate-600">Click to manage</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Pending Tools */}
                    <div
                        onClick={() => navigate('/tools')}
                        className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 hover:border-indigo-500/40 transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Tool Queue</div>
                                <div className="text-3xl font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
                                    {stats?.pendingTools ?? 0}
                                </div>
                            </div>
                            <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                                <Package size={20} />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
                            <span>Awaiting approval</span>
                            <span className="text-indigo-400 font-medium group-hover:underline">Review Queue →</span>
                        </div>
                    </div>

                    {/* Pending Reviews */}
                    <div
                        onClick={() => navigate('/reviews')}
                        className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 hover:border-amber-500/40 transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Review Queue</div>
                                <div className="text-3xl font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                                    {stats?.pendingReviews ?? 0}
                                </div>
                            </div>
                            <div className="bg-amber-500/10 p-2 rounded-lg text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                                <Star size={20} />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
                            <span>Pending moderation</span>
                            <span className="text-amber-400 font-medium group-hover:underline">Moderate →</span>
                        </div>
                    </div>

                    {/* Failed Payments */}
                    <div
                        onClick={() => navigate('/revenue')}
                        className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 hover:border-red-500/40 transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Failed Payments</div>
                                <div className="text-3xl font-bold text-slate-100 group-hover:text-red-400 transition-colors">
                                    {stats?.failedPayments ?? 0}
                                </div>
                            </div>
                            <div className="bg-red-500/10 p-2 rounded-lg text-red-400 group-hover:bg-red-500/20 transition-colors">
                                <AlertCircle size={20} />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
                            <span>Requires attention</span>
                            <span className="text-red-400 font-medium group-hover:underline">Resolve →</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Platform Totals + System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Platform Totals (2/3 width) */}
                <section className="lg:col-span-2 space-y-4">
                    <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                        <Activity size={14} className="text-emerald-400" />
                        Platform Totals
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatusCard
                            title="Total Tools"
                            value={(stats?.totalTools ?? 0).toLocaleString()}
                            icon={Package}
                            subtext="In directory"
                        />
                        <StatusCard
                            title="Total Users"
                            value={(stats?.totalUsers ?? 0).toLocaleString()}
                            icon={Users}
                            subtext="Registered accounts"
                        />
                        <StatusCard
                            title="Active Pro"
                            value={stats?.activeProUsers ?? 0}
                            icon={CheckCircle}
                            subtext="Paid subscribers"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatusCard
                            title="Total Revenue"
                            value={`$${(stats?.totalRevenue ?? 0).toLocaleString()}`}
                            icon={DollarSign}
                            subtext="All-time completed orders"
                        />
                        <StatusCard
                            title="Total Reviews"
                            value={(stats?.totalReviews ?? 0).toLocaleString()}
                            icon={Star}
                            subtext="User-submitted reviews"
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h3>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => navigate('/tools')}
                                className="px-3 py-1.5 bg-[#2a2d3a] hover:bg-[#3a3d4a] text-slate-200 text-xs rounded-lg border border-[#3a3d4a] transition-all hover:border-indigo-500/50 flex items-center gap-2"
                            >
                                <Package size={12} className="text-indigo-400" />
                                Review Pending Tools
                            </button>
                            <button
                                onClick={() => navigate('/users')}
                                className="px-3 py-1.5 bg-[#2a2d3a] hover:bg-[#3a3d4a] text-slate-200 text-xs rounded-lg border border-[#3a3d4a] transition-all hover:border-indigo-500/50 flex items-center gap-2"
                            >
                                <Users size={12} className="text-indigo-400" />
                                Manage Users
                            </button>
                            <button
                                onClick={() => navigate('/revenue')}
                                className="px-3 py-1.5 bg-[#2a2d3a] hover:bg-[#3a3d4a] text-slate-200 text-xs rounded-lg border border-[#3a3d4a] transition-all hover:border-indigo-500/50 flex items-center gap-2"
                            >
                                <DollarSign size={12} className="text-emerald-400" />
                                View Revenue
                            </button>
                            <a
                                href="https://intelligrid.online"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-[#2a2d3a] hover:bg-[#3a3d4a] text-slate-200 text-xs rounded-lg border border-[#3a3d4a] transition-all hover:border-indigo-500/50 flex items-center gap-2"
                            >
                                <ExternalLink size={12} className="text-slate-400" />
                                Open Main Site
                            </a>
                        </div>
                    </div>
                </section>

                {/* System Status (1/3 width) */}
                <section className="space-y-4">
                    <h2 className="text-xs uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                        <LayoutDashboard size={14} className="text-slate-400" />
                        System Status
                    </h2>

                    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
                        <HealthIndicator label="API" status="connected" />
                        <HealthIndicator label="MongoDB" status="connected" />
                        <HealthIndicator label="Redis Cache" status="connected" />
                        <HealthIndicator label="Algolia Search" status="synced" />
                        <HealthIndicator label="Clerk Auth" status="connected" />

                        <div className="mt-4 pt-4 border-t border-[#2a2d3a]">
                            <button
                                onClick={() => navigate('/system')}
                                className="text-xs text-slate-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1 w-full uppercase tracking-wide font-medium"
                            >
                                Full System Health →
                            </button>
                        </div>
                    </div>

                    {/* Platform Health Score */}
                    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Platform Health</div>
                        <div className="flex items-center gap-3">
                            <div className="text-4xl font-bold text-emerald-400">
                                {stats?.failedPayments === 0 && stats?.pendingTools < 10 ? '98' : '85'}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-slate-200">
                                    {stats?.failedPayments === 0 ? 'Excellent' : 'Good'}
                                </div>
                                <div className="text-xs text-slate-500">Health score</div>
                            </div>
                        </div>
                        <div className="mt-3 h-1.5 bg-[#2a2d3a] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: stats?.failedPayments === 0 ? '98%' : '85%' }}
                            />
                        </div>
                    </div>
                </section>

            </div>
        </div>
    )
}

export default Overview
