/**
 * AdminActivityPage.jsx
 * Route: /admin/activity
 *
 * Two panels:
 *  1. Live Activity Feed — last N events (tool submissions, payments, reviews, signups)
 *  2. Enrichment Trigger — fire a manual AI enrichment batch on-demand
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services'
import SEO from '../../components/common/SEO'
import {
    Activity, RefreshCw, Zap, Package, CreditCard,
    MessageSquare, UserPlus, ChevronLeft, Loader2,
    CheckCircle2, AlertTriangle, Clock, Sparkles
} from 'lucide-react'
import { toast } from 'react-hot-toast'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
}

const EVENT_STYLES = {
    tool_submitted: { icon: Package, bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', label: 'Tool Submitted' },
    payment: { icon: CreditCard, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', label: 'Payment' },
    review_posted: { icon: MessageSquare, bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', label: 'Review' },
    user_signed_up: { icon: UserPlus, bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', label: 'New User' },
}

function EventCard({ event }) {
    const style = EVENT_STYLES[event.type] || EVENT_STYLES.tool_submitted
    const Icon = style.icon

    return (
        <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${style.border} ${style.bg} transition-all`}>
            <div className={`flex-shrink-0 p-2 rounded-lg bg-black/20`}>
                <Icon className={`h-4 w-4 ${style.text}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${style.text}`}>
                        {style.label}
                    </span>
                    <span className="text-[10px] text-gray-600 flex-shrink-0 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(event.ts)}
                    </span>
                </div>
                <p className="text-sm text-gray-300 mt-0.5 truncate">
                    {event.type === 'tool_submitted' && (
                        <>{event.data.name} <span className={`text-[10px] ml-1 px-1.5 py-0.5 rounded-full bg-black/20 ${event.data.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>{event.data.status}</span></>
                    )}
                    {event.type === 'payment' && (
                        <>${(event.data.amount || 0).toFixed(2)} {event.data.currency?.toUpperCase()} — {event.data.plan || 'Unknown plan'}</>
                    )}
                    {event.type === 'review_posted' && (
                        <>{event.data.tool} {'★'.repeat(Math.round(event.data.rating || 0))} {event.data.status !== 'approved' && <span className="text-amber-400 text-[10px]">({event.data.status})</span>}</>
                    )}
                    {event.type === 'user_signed_up' && (
                        <>{event.data.name || event.data.email}</>
                    )}
                </p>
            </div>
        </div>
    )
}

// ─── Activity Feed Panel ───────────────────────────────────────────────────────

function ActivityFeed() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await adminService.getRecentActivity(50)
            setEvents(res?.events || [])
        } catch {
            toast.error('Failed to load activity feed')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
        const interval = setInterval(load, 30000) // auto-refresh every 30s
        return () => clearInterval(interval)
    }, [load])

    const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)

    return (
        <div className="rounded-2xl border border-white/10 bg-[#0e0e1a] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/8">
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-400" />
                    <h2 className="text-sm font-semibold text-white">Live Activity Feed</h2>
                    <span className="text-[10px] text-gray-600 ml-1">auto-refreshes every 30s</span>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-40"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 px-5 py-3 border-b border-white/5">
                {[
                    { key: 'all', label: 'All' },
                    { key: 'tool_submitted', label: 'Tools' },
                    { key: 'payment', label: 'Payments' },
                    { key: 'review_posted', label: 'Reviews' },
                    { key: 'user_signed_up', label: 'Users' },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === key
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Events list */}
            <div className="p-4 space-y-2.5 max-h-[600px] overflow-y-auto">
                {loading && events.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12">
                        <Activity className="h-8 w-8 text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-600 text-sm">No activity in the last 7 days</p>
                    </div>
                ) : (
                    filtered.map((event, i) => <EventCard key={`${event.type}-${i}`} event={event} />)
                )}
            </div>

            {/* Footer */}
            {!loading && events.length > 0 && (
                <div className="px-5 py-3 border-t border-white/5 text-xs text-gray-600">
                    Showing {filtered.length} event{filtered.length !== 1 ? 's' : ''} · Last 7 days
                </div>
            )}
        </div>
    )
}

// ─── Enrichment Trigger Panel ─────────────────────────────────────────────────

function EnrichmentTrigger() {
    const [batchSize, setBatchSize] = useState(10)
    const [recompute, setRecompute] = useState(false)
    const [toolId, setToolId] = useState('')
    const [running, setRunning] = useState(false)
    const [lastResult, setLastResult] = useState(null)

    const trigger = async () => {
        if (running) return
        setRunning(true)
        setLastResult(null)
        try {
            const res = await adminService.triggerEnrichment(batchSize)
            setLastResult({ success: true, message: res?.message || 'Enrichment triggered' })
            toast.success('Enrichment started in background ✅')
        } catch (err) {
            const msg = err?.response?.data?.message || 'Failed to trigger enrichment'
            setLastResult({ success: false, message: msg })
            toast.error(msg)
        } finally {
            setRunning(false)
        }
    }

    return (
        <div className="rounded-2xl border border-white/10 bg-[#0e0e1a] overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/8">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-white">On-Demand AI Enrichment</h2>
            </div>

            <div className="p-5 space-y-5">
                <p className="text-xs text-gray-500 leading-relaxed">
                    Manually trigger Groq AI enrichment for a batch of lowest-scored tools.
                    Runs asynchronously — response is immediate, enrichment continues in background.
                    Rate-limited to 24 req/min (2.5s delay between tools).
                </p>

                {/* Batch size slider */}
                <div>
                    <label className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span>Batch size</span>
                        <span className="font-bold text-white">{batchSize} tools</span>
                    </label>
                    <input
                        type="range"
                        min={1}
                        max={50}
                        value={batchSize}
                        onChange={e => setBatchSize(Number(e.target.value))}
                        className="w-full accent-purple-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-700 mt-1">
                        <span>1 (~2.5s)</span>
                        <span>50 (~2 min)</span>
                    </div>
                </div>

                {/* Target specific tool */}
                <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Target tool ID (optional — overrides batch)</label>
                    <input
                        type="text"
                        value={toolId}
                        onChange={e => setToolId(e.target.value)}
                        placeholder="MongoDB ObjectId..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                </div>

                {/* Recompute scores */}
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div
                        onClick={() => setRecompute(r => !r)}
                        className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${recompute ? 'bg-purple-600' : 'bg-white/10'} relative cursor-pointer`}
                    >
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${recompute ? 'translate-x-4' : ''}`} />
                    </div>
                    <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
                        Recompute trending scores after enrichment
                    </span>
                </label>

                {/* Trigger button */}
                <button
                    onClick={trigger}
                    disabled={running}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {running ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Triggering...</>
                    ) : (
                        <><Zap className="h-4 w-4" /> Trigger Enrichment</>
                    )}
                </button>

                {/* Result badge */}
                {lastResult && (
                    <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-sm ${lastResult.success
                            ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300'
                            : 'border-red-500/20 bg-red-500/8 text-red-300'
                        }`}>
                        {lastResult.success
                            ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            : <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        }
                        <span>{lastResult.message}</span>
                    </div>
                )}

                {/* ETA estimate */}
                <p className="text-[10px] text-gray-700 text-center">
                    Estimated time: ~{Math.ceil(batchSize * 2.5)}s · Check Railway logs for progress
                </p>
            </div>
        </div>
    )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AdminActivityPage() {
    return (
        <div className="min-h-screen bg-[#080810]">
            <SEO title="Activity Feed & Enrichment — IntelliGrid Admin" noindex />

            {/* Header */}
            <div className="border-b border-white/8 bg-[#0c0c18] px-6 py-5">
                <div className="mx-auto max-w-6xl flex items-center justify-between">
                    <div>
                        <Link
                            to="/admin"
                            className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 mb-2 transition-colors"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" /> Admin
                        </Link>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
                            <Activity className="h-6 w-6 text-purple-400" />
                            Activity & Enrichment
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">Real-time events · On-demand AI enrichment trigger</p>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="mx-auto max-w-6xl px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Activity feed — wider */}
                    <div className="lg:col-span-2">
                        <ActivityFeed />
                    </div>

                    {/* Enrichment trigger — sidebar */}
                    <div className="lg:col-span-1">
                        <EnrichmentTrigger />
                    </div>
                </div>
            </div>
        </div>
    )
}
