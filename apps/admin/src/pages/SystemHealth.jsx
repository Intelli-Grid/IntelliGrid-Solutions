import { useState, useEffect, useCallback } from 'react'
import {
    Activity, Database, Server, Cpu, RefreshCw, CheckCircle2,
    AlertTriangle, XCircle, Clock, Zap, HardDrive, Box, Loader2
} from 'lucide-react'
import { adminService } from '../services'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
    const map = {
        operational: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2, label: 'Operational' },
        degraded: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: AlertTriangle, label: 'Degraded' },
        down: { color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: XCircle, label: 'Down' },
        connected: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2, label: 'Connected' },
        disconnected: { color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: XCircle, label: 'Disconnected' },
    }
    const cfg = map[status] || map.down
    const Icon = cfg.icon
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${cfg.color}`}>
            <Icon size={11} />
            {cfg.label}
        </span>
    )
}

const MetricCard = ({ icon: Icon, label, value, sub, accent = 'indigo' }) => {
    const accents = {
        indigo: 'text-indigo-400',
        emerald: 'text-emerald-400',
        amber: 'text-amber-400',
        sky: 'text-sky-400',
    }
    return (
        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 flex items-start gap-4">
            <div className={`mt-0.5 ${accents[accent]}`}>
                <Icon size={22} />
            </div>
            <div className="min-w-0">
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">{label}</div>
                <div className="text-2xl font-bold text-slate-100 leading-none">{value}</div>
                {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
            </div>
        </div>
    )
}

const ServiceRow = ({ name, icon: Icon, status, latency }) => (
    <div className="flex items-center justify-between py-4 border-b border-[#2a2d3a] last:border-0">
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#222530] flex items-center justify-center text-slate-400">
                <Icon size={18} />
            </div>
            <div>
                <div className="text-sm font-medium text-slate-200">{name}</div>
                {latency != null && (
                    <div className="text-xs text-slate-500">{latency}ms response</div>
                )}
            </div>
        </div>
        <StatusBadge status={status} />
    </div>
)

const MemoryBar = ({ used, total, percent }) => (
    <div>
        <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Heap Memory</span>
            <span className="font-mono">{used} MB / {total} MB</span>
        </div>
        <div className="h-2 bg-[#2a2d3a] rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-700 ${percent > 80 ? 'bg-red-500' : percent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                style={{ width: `${percent}%` }}
            />
        </div>
        <div className="text-right text-xs text-slate-500 mt-1">{percent}% used</div>
    </div>
)

// ─── Main Component ─────────────────────────────────────────────────────────────

const SystemHealth = () => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [lastChecked, setLastChecked] = useState(null)
    const [autoRefresh, setAutoRefresh] = useState(true)

    const fetchHealth = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true)
        try {
            const res = await adminService.getSystemHealth()
            if (res.success) {
                setData(res.system)
                setLastChecked(new Date())
            }
        } catch (err) {
            console.error(err)
            if (isManual) toast.error('Failed to fetch system health')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    // Initial load
    useEffect(() => {
        fetchHealth()
    }, [fetchHealth])

    // Auto-refresh every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(() => fetchHealth(), 30_000)
        return () => clearInterval(interval)
    }, [autoRefresh, fetchHealth])

    const formatUptime = (u) => {
        if (!u) return '—'
        const parts = []
        if (u.days > 0) parts.push(`${u.days}d`)
        if (u.hours > 0) parts.push(`${u.hours}h`)
        parts.push(`${u.minutes}m`)
        return parts.join(' ')
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 mb-1">System Health</h1>
                    <p className="text-slate-400 text-sm">
                        Real-time infrastructure monitoring.
                        {lastChecked && (
                            <span className="ml-2 text-slate-500">
                                Last checked {formatDistanceToNow(lastChecked, { addSuffix: true })}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Auto-refresh toggle */}
                    <button
                        onClick={() => setAutoRefresh(v => !v)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${autoRefresh
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-[#2a2d3a] border-[#3a3d4a] text-slate-400'
                            }`}
                    >
                        {autoRefresh ? '● Auto-refresh ON' : '○ Auto-refresh OFF'}
                    </button>
                    <button
                        onClick={() => fetchHealth(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-[#2a2d3a] hover:bg-[#3a3d4a] text-slate-200 text-sm rounded-lg border border-[#3a3d4a] transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin text-indigo-500" size={36} />
                </div>
            ) : !data ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <AlertTriangle size={36} className="mb-3 text-amber-500" />
                    <p className="font-medium">Could not load system data.</p>
                    <button onClick={() => fetchHealth(true)} className="mt-3 text-indigo-400 hover:underline text-sm">
                        Try again
                    </button>
                </div>
            ) : (
                <>
                    {/* Overall Status Banner */}
                    <div className={`rounded-xl border p-4 flex items-center gap-4 ${data.status === 'operational'
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-amber-500/5 border-amber-500/20'
                        }`}>
                        {data.status === 'operational'
                            ? <CheckCircle2 className="text-emerald-400 shrink-0" size={24} />
                            : <AlertTriangle className="text-amber-400 shrink-0" size={24} />
                        }
                        <div>
                            <div className={`font-semibold ${data.status === 'operational' ? 'text-emerald-300' : 'text-amber-300'}`}>
                                {data.status === 'operational' ? 'All Systems Operational' : 'System Degraded — Attention Required'}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                                Environment: <span className="font-mono text-slate-300">{data.environment}</span>
                                &nbsp;·&nbsp; Node: <span className="font-mono text-slate-300">{data.nodeVersion}</span>
                            </div>
                        </div>
                        <div className="ml-auto">
                            <StatusBadge status={data.status} />
                        </div>
                    </div>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            icon={Clock}
                            label="Uptime"
                            value={formatUptime(data.uptime)}
                            sub={`${data.uptime?.totalSeconds?.toLocaleString()}s total`}
                            accent="indigo"
                        />
                        <MetricCard
                            icon={Zap}
                            label="API Latency"
                            value={`${data.services?.api?.latencyMs ?? '—'}ms`}
                            sub="This request"
                            accent="sky"
                        />
                        <MetricCard
                            icon={Database}
                            label="DB Latency"
                            value={data.services?.database?.latencyMs != null ? `${data.services.database.latencyMs}ms` : '—'}
                            sub="MongoDB ping"
                            accent="emerald"
                        />
                        <MetricCard
                            icon={Cpu}
                            label="Memory"
                            value={`${data.memory?.usedMB ?? '—'} MB`}
                            sub={`of ${data.memory?.totalMB ?? '—'} MB heap`}
                            accent="amber"
                        />
                    </div>

                    {/* Two-column layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Services */}
                        <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-6">
                            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                <Server size={16} className="text-indigo-400" />
                                Service Status
                            </h3>
                            <ServiceRow
                                name="MongoDB Database"
                                icon={Database}
                                status={data.services?.database?.status || 'disconnected'}
                                latency={data.services?.database?.latencyMs}
                            />
                            <ServiceRow
                                name="REST API"
                                icon={Activity}
                                status={data.services?.api?.status || 'down'}
                                latency={data.services?.api?.latencyMs}
                            />
                            <ServiceRow
                                name="Clerk Auth"
                                icon={CheckCircle2}
                                status="operational"
                                latency={null}
                            />
                            <ServiceRow
                                name="Algolia Search"
                                icon={Zap}
                                status="operational"
                                latency={null}
                            />
                        </div>

                        {/* Memory + DB Stats */}
                        <div className="space-y-4">
                            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-6">
                                <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                    <HardDrive size={16} className="text-amber-400" />
                                    Memory Usage
                                </h3>
                                {data.memory && (
                                    <MemoryBar
                                        used={data.memory.usedMB}
                                        total={data.memory.totalMB}
                                        percent={data.memory.percentUsed}
                                    />
                                )}
                            </div>

                            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-6">
                                <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                                    <Box size={16} className="text-sky-400" />
                                    Database Records
                                </h3>
                                <div className="space-y-3">
                                    {[
                                        { label: 'AI Tools', value: data.database?.tools },
                                        { label: 'Users', value: data.database?.users },
                                        { label: 'Reviews', value: data.database?.reviews },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex items-center justify-between">
                                            <span className="text-sm text-slate-400">{label}</span>
                                            <span className="font-mono text-slate-200 font-semibold">
                                                {value?.toLocaleString() ?? '—'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

export default SystemHealth
