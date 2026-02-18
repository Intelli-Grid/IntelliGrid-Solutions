
import {
    LayoutDashboard,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    CheckCircle,
    Clock,
    Users,
    DollarSign
} from 'lucide-react'
import { useState, useEffect } from 'react'

// TODO: Replace with real API call
const mockStats = {
    urgent: {
        pendingTools: 4,
        flaggedReviews: 2,
        failedPayments: 1,
    },
    today: {
        newUsers: 12,
        revenue: 53.40,
        activePro: 147,
    },
    system: {
        apiLatency: 98,
        mongoStatus: 'connected',
        redisStatus: 'connected',
        algoliaStatus: 'synced',
    }
}

const StatusCard = ({ title, value, subtext, icon: Icon, trend, type = 'default' }) => (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 flex flex-col justify-between hover:border-[#3a3d4a] transition-colors relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icon size={48} strokeWidth={1.5} />
        </div>

        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="text-slate-400 text-sm font-medium tracking-wide update-check">{title}</div>
            {trend && (
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                    {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    <span>{subtext}</span>
                </div>
            )}
        </div>

        <div className="relative z-10">
            <div className="text-2xl font-bold text-slate-100 mb-1">{value}</div>
            {!trend && subtext && <div className="text-xs text-slate-500">{subtext}</div>}
        </div>

        {/* Optional background accent for urgency */}
        {type === 'urgent' && (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
        )}
    </div>
)

const HealthIndicator = ({ label, status, value }) => {
    const isHealthy = status === 'connected' || status === 'synced' || (typeof value === 'number' && value < 200)

    return (
        <div className="flex items-center justify-between py-3 border-b border-[#2a2d3a] last:border-0">
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'}`} />
                <span className="text-sm text-slate-300 font-medium">{label}</span>
            </div>
            <div className="text-xs font-mono text-slate-500">
                {value ? `${value}ms` : status === 'connected' ? 'OK' : status}
            </div>
        </div>
    )
}

const Overview = () => {
    const [stats, setStats] = useState(mockStats)
    const [isLoading, setIsLoading] = useState(false)

    // TODO: Fetch real stats here
    useEffect(() => {
        // const fetch = async () => { ... }
        // fetch()
    }, [])

    return (
        <div className="space-y-6 animate-fade-in">

            {/* 1. Urgent Triage Row */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                        <AlertCircle size={16} className="text-indigo-400" />
                        Urgent Attention
                    </h2>
                    <span className="text-xs text-slate-600">Last updated: Just now</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Pending Tools */}
                    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 hover:border-indigo-500/30 transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Pending Tools</div>
                                <div className="text-3xl font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">{stats.urgent.pendingTools}</div>
                            </div>
                            <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                                <Clock size={20} />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
                            <span>Avg wait: 4h 12m</span>
                            <span className="text-indigo-400 text-xs font-medium group-hover:underline">Review Queue →</span>
                        </div>
                    </div>

                    {/* Flagged Reviews */}
                    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 hover:border-red-500/30 transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Flagged Reviews</div>
                                <div className="text-3xl font-bold text-slate-100 group-hover:text-red-400 transition-colors">{stats.urgent.flaggedReviews}</div>
                            </div>
                            <div className="bg-red-500/10 p-2 rounded-lg text-red-400 group-hover:bg-red-500/20 transition-colors">
                                <AlertCircle size={20} />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
                            <span>2 new today</span>
                            <span className="text-red-400 text-xs font-medium group-hover:underline">Moderate →</span>
                        </div>
                    </div>

                    {/* Failed Payments */}
                    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 hover:border-amber-500/30 transition-colors cursor-pointer group">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">Failed Payments</div>
                                <div className="text-3xl font-bold text-slate-100 group-hover:text-amber-400 transition-colors">{stats.urgent.failedPayments}</div>
                            </div>
                            <div className="bg-amber-500/10 p-2 rounded-lg text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                                <DollarSign size={20} />
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
                            <span>$53.40 at risk</span>
                            <span className="text-amber-400 text-xs font-medium group-hover:underline">Resolve →</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Platform Pulse & System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Today's Pulse (2/3 width) */}
                <section className="lg:col-span-2 space-y-4">
                    <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                        <Users size={16} className="text-emerald-400" />
                        Platform Pulse (Today)
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatusCard
                            title="New Users"
                            value={`+${stats.today.newUsers}`}
                            icon={Users}
                            trend="up"
                            subtext="12% vs avg"
                        />
                        <StatusCard
                            title="Revenue"
                            value={`$${stats.today.revenue}`}
                            icon={DollarSign}
                            trend="up"
                            subtext="On track"
                        />
                        <StatusCard
                            title="Active Pro"
                            value={stats.today.activePro}
                            icon={CheckCircle}
                            subtext="Total Subscribers"
                        />
                    </div>

                    {/* Quick Actions Panel */}
                    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-6 mt-6">
                        <h3 className="text-sm font-medium text-slate-300 mb-4 border-b border-[#2a2d3a] pb-2">Quick Actions</h3>
                        <div className="flex flex-wrap gap-3">
                            <button className="px-4 py-2 bg-[#2a2d3a] hover:bg-[#3a3d4a] text-slate-200 text-sm rounded-lg border border-[#3a3d4a] transition-all hover:border-indigo-500/50 flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-400" />
                                Approve All Pending Tools
                            </button>
                            <button className="px-4 py-2 bg-[#2a2d3a] hover:bg-[#3a3d4a] text-slate-200 text-sm rounded-lg border border-[#3a3d4a] transition-all hover:border-indigo-500/50 flex items-center gap-2">
                                <Users size={14} className="text-indigo-400" />
                                Invite User via Email
                            </button>
                            <button className="px-4 py-2 bg-[#2a2d3a] hover:bg-[#3a3d4a] text-slate-200 text-sm rounded-lg border border-[#3a3d4a] transition-all hover:border-indigo-500/50 flex items-center gap-2">
                                <DollarSign size={14} className="text-amber-400" />
                                View Stripe Dashboard
                            </button>
                        </div>
                    </div>
                </section>

                {/* System Health (1/3 width) */}
                <section className="space-y-4">
                    <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                        <LayoutDashboard size={16} className="text-slate-400" />
                        System Status
                    </h2>

                    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
                        <HealthIndicator label="API Latency" value={stats.system.apiLatency} />
                        <HealthIndicator label="MongoDB" status={stats.system.mongoStatus} />
                        <HealthIndicator label="Redis Cache" status={stats.system.redisStatus} />
                        <HealthIndicator label="Algolia Search" status={stats.system.algoliaStatus} />

                        <div className="mt-6 pt-4 border-t border-[#2a2d3a] text-center">
                            <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-1 w-full uppercase tracking-wide font-medium">
                                View Full System Logs →
                            </button>
                        </div>
                    </div>

                    {/* Mini Access Log Preview */}
                    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent Security Events</div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Admin login (104.22.x.x)</span>
                                <span className="text-emerald-400 font-mono">2m ago</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">Failed login: User #992</span>
                                <span className="text-red-400 font-mono">14m ago</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400">API Key Created</span>
                                <span className="text-indigo-400 font-mono">1h ago</span>
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    )
}

export default Overview
