import { useState, useEffect } from 'react'
import {
    CheckCircle, X, ExternalLink, Clock, Loader2, Search,
    Trash2, RefreshCw, Globe, Tag, Zap, ChevronLeft, ChevronRight
} from 'lucide-react'
import { adminService } from '../services'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const SourceBadge = ({ source }) => {
    const map = {
        scraper: { label: 'Scraper', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
        producthunt: { label: 'Product Hunt', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
        twitter: { label: 'Twitter/X', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
        'hacker-news': { label: 'Hacker News', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    }
    const cfg = map[source] || { label: source, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' }
    return (
        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${cfg.color}`}>
            {cfg.label}
        </span>
    )
}

const DiscoveryQueue = () => {
    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(null)
    const [triggering, setTriggering] = useState(false)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    useEffect(() => {
        fetchTools()
    }, [page])

    const fetchTools = async () => {
        setLoading(true)
        try {
            const data = await adminService.getDiscoveryQueue({ page, limit: 20 })
            if (data.success) {
                setTools(data.tools)
                setTotalPages(data.pagination.pages)
            }
        } catch (err) {
            console.error(err)
            toast.error('Failed to load discovery queue')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id) => {
        setProcessing(id)
        const t = toast.loading('Approving and publishing tool...')
        try {
            await adminService.approveTool(id)
            setTools(prev => prev.filter(tool => tool._id !== id))
            toast.success('Tool approved and live!', { id: t })
        } catch (err) {
            toast.error('Approval failed', { id: t })
        } finally {
            setProcessing(null)
        }
    }

    const handleDiscard = async (id, name) => {
        if (!window.confirm(`Discard "${name}"? This cannot be undone.`)) return
        setProcessing(id)
        const t = toast.loading('Discarding...')
        try {
            await adminService.discardDiscoveredTool(id)
            setTools(prev => prev.filter(tool => tool._id !== id))
            toast.success('Tool discarded', { id: t })
        } catch (err) {
            toast.error('Failed to discard tool', { id: t })
        } finally {
            setProcessing(null)
        }
    }

    const handleTriggerDiscovery = async () => {
        setTriggering(true)
        const t = toast.loading('Triggering discovery run...')
        try {
            const res = await adminService.triggerDiscovery(1)
            toast.success(res.message || 'Discovery run started — check back in 1–2 minutes', { id: t })
        } catch (err) {
            toast.error('Failed to trigger discovery', { id: t })
        } finally {
            setTriggering(false)
        }
    }

    const filtered = tools.filter(t =>
        !search || t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.officialUrl?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 mb-1">Discovery Queue</h1>
                    <p className="text-slate-400 text-sm">Auto-discovered tools awaiting review and approval.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search tools..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 w-full sm:w-52 transition-colors"
                        />
                    </div>
                    <button
                        onClick={handleTriggerDiscovery}
                        disabled={triggering}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 shrink-0"
                    >
                        {triggering ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                        Run Discovery
                    </button>
                    <button
                        onClick={fetchTools}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-slate-200 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg hover:border-[#3a3d4a] transition-all"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Stats banner */}
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-slate-400">
                    <Globe size={14} className="text-purple-400" />
                    <span><span className="font-bold text-slate-100">{tools.length}</span> tools in queue</span>
                </div>
                <div className="h-4 w-px bg-[#2a2d3a]" />
                <div className="text-slate-500 text-xs">
                    Discovered from crawlers, Product Hunt, Hacker News, and Twitter feeds.
                    Approve to publish or discard to remove permanently.
                </div>
            </div>

            {/* Tool List */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-16 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                        <CheckCircle className="text-emerald-500" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-200 mb-2">Queue is Empty</h3>
                    <p className="text-slate-500 max-w-sm text-sm">No auto-discovered tools awaiting review. Trigger a new discovery run to find more tools.</p>
                </div>
            ) : (
                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#2a2d3a] bg-[#222530]">
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Tool</th>
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Source</th>
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Category</th>
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Found</th>
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2a2d3a]">
                                {filtered.map(tool => (
                                    <tr key={tool._id} className="group hover:bg-[#222530] transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                {tool.logo ? (
                                                    <img src={tool.logo} alt={tool.name} className="w-9 h-9 rounded-lg object-cover bg-slate-800 shrink-0" onError={e => { e.target.style.display = 'none' }} />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-base shrink-0">
                                                        {tool.name?.[0] || '?'}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-medium text-slate-200 flex items-center gap-2">
                                                        {tool.name}
                                                        <a href={tool.officialUrl} target="_blank" rel="noopener noreferrer"
                                                            className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <ExternalLink size={13} />
                                                        </a>
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-[240px]">
                                                        {tool.shortDescription || tool.officialUrl}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <SourceBadge source={tool.sourceFoundBy} />
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Tag size={12} className="text-slate-600" />
                                                {tool.category?.name || 'Uncategorized'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="text-xs text-slate-400 flex items-center gap-1.5">
                                                <Clock size={12} className="text-slate-600" />
                                                {tool.createdAt ? formatDistanceToNow(new Date(tool.createdAt), { addSuffix: true }) : '—'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleDiscard(tool._id, tool.name)}
                                                    disabled={processing === tool._id}
                                                    title="Discard permanently"
                                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(tool._id)}
                                                    disabled={processing === tool._id}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-colors disabled:opacity-50"
                                                >
                                                    {processing === tool._id
                                                        ? <Loader2 size={14} className="animate-spin" />
                                                        : <CheckCircle size={14} />}
                                                    Approve
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="border-t border-[#2a2d3a] p-4 flex items-center justify-between">
                            <div className="text-xs text-slate-500">Page {page} of {totalPages}</div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1 px-2 rounded border border-[#2a2d3a] text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3a] disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1 px-2 rounded border border-[#2a2d3a] text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3a] disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default DiscoveryQueue
