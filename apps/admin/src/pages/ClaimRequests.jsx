import { useState, useEffect } from 'react'
import {
    CheckCircle, X, ExternalLink, Clock, Loader2, Search,
    ShieldCheck, RefreshCw, ChevronLeft, ChevronRight, User, FileText
} from 'lucide-react'
import { adminService } from '../services'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow, format } from 'date-fns'

const StatusBadge = ({ status }) => {
    const map = {
        pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    }
    return (
        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${map[status] || map.pending}`}>
            {status}
        </span>
    )
}

const ClaimRequests = () => {
    const [claims, setClaims] = useState([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(null)
    const [statusFilter, setStatusFilter] = useState('pending')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [rejectModal, setRejectModal] = useState(null) // claim to reject
    const [rejectReason, setRejectReason] = useState('')

    useEffect(() => {
        fetchClaims()
    }, [page, statusFilter])

    const fetchClaims = async () => {
        setLoading(true)
        try {
            const data = await adminService.getClaims({ status: statusFilter, page, limit: 20 })
            if (data.success) {
                setClaims(data.data.claims)
                setTotalPages(data.data.pagination.pages)
            }
        } catch (err) {
            console.error(err)
            toast.error('Failed to load claims')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id, toolName) => {
        if (!window.confirm(`Approve claim for "${toolName}"? This will mark the tool as verified.`)) return
        setProcessing(id)
        const t = toast.loading('Approving claim...')
        try {
            await adminService.approveClaim(id)
            setClaims(prev => prev.map(c => c._id === id ? { ...c, status: 'approved' } : c))
            toast.success('Claim approved — tool is now verified!', { id: t })
        } catch (err) {
            toast.error('Failed to approve claim', { id: t })
        } finally {
            setProcessing(null)
        }
    }

    const handleRejectSubmit = async (e) => {
        e.preventDefault()
        if (!rejectModal) return
        setProcessing(rejectModal._id)
        const t = toast.loading('Rejecting claim...')
        try {
            await adminService.rejectClaim(rejectModal._id, rejectReason)
            setClaims(prev => prev.map(c => c._id === rejectModal._id ? { ...c, status: 'rejected' } : c))
            toast.success('Claim rejected', { id: t })
            setRejectModal(null)
            setRejectReason('')
        } catch (err) {
            toast.error('Failed to reject claim', { id: t })
        } finally {
            setProcessing(null)
        }
    }

    const filtered = claims.filter(c =>
        !search ||
        c.tool?.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.user?.email?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 mb-1">Claim Requests</h1>
                    <p className="text-slate-400 text-sm">Vendor claims to verify ownership of their AI tools.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search by tool or email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 w-full sm:w-60 transition-colors"
                        />
                    </div>
                    <button onClick={fetchClaims} className="p-2 text-slate-400 hover:text-slate-200 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg hover:border-[#3a3d4a] transition-all">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg p-1 w-fit">
                {['pending', 'approved', 'rejected'].map(s => (
                    <button
                        key={s}
                        onClick={() => { setStatusFilter(s); setPage(1) }}
                        className={`px-4 py-1.5 text-xs font-semibold rounded capitalize transition-colors ${statusFilter === s
                            ? 'bg-indigo-600 text-white shadow'
                            : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-16 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                        <ShieldCheck className="text-emerald-500" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-200 mb-2">No {statusFilter} claims</h3>
                    <p className="text-slate-500 text-sm max-w-sm">
                        {statusFilter === 'pending' ? 'No vendor claims awaiting review.' : `No ${statusFilter} claims to display.`}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(claim => (
                        <div key={claim._id} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 hover:border-[#3a3d4a] transition-colors">
                            <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                                {/* Left: tool + user info */}
                                <div className="flex items-start gap-4 flex-1">
                                    {claim.tool?.logo ? (
                                        <img src={claim.tool.logo} alt={claim.tool.name} className="w-12 h-12 rounded-lg object-cover bg-slate-800 shrink-0" onError={e => { e.target.style.display = 'none' }} />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xl shrink-0">
                                            {claim.tool?.name?.[0] || '?'}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="font-semibold text-slate-100">{claim.tool?.name || 'Unknown Tool'}</span>
                                            <StatusBadge status={claim.status} />
                                            {claim.tool?.officialUrl && (
                                                <a href={claim.tool.officialUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300">
                                                    <ExternalLink size={13} />
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                                            <span className="flex items-center gap-1.5">
                                                <User size={12} />
                                                {claim.user ? `${claim.user.firstName} ${claim.user.lastName || ''} · ${claim.user.email}` : 'Unknown user'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {claim.createdAt ? formatDistanceToNow(new Date(claim.createdAt), { addSuffix: true }) : '—'}
                                            </span>
                                        </div>
                                        {claim.evidence && (
                                            <div className="mt-2 text-xs text-slate-400 bg-[#222530] rounded-lg p-2 border border-[#2a2d3a] flex items-start gap-2">
                                                <FileText size={12} className="shrink-0 mt-0.5 text-slate-500" />
                                                <span className="line-clamp-2">{claim.evidence}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right: actions (only for pending) */}
                                {claim.status === 'pending' && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => setRejectModal(claim)}
                                            disabled={processing === claim._id}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-[#222530] hover:bg-red-500/10 text-slate-400 hover:text-red-400 text-xs font-medium rounded-lg border border-[#2a2d3a] hover:border-red-500/30 transition-colors disabled:opacity-50"
                                        >
                                            <X size={14} /> Reject
                                        </button>
                                        <button
                                            onClick={() => handleApprove(claim._id, claim.tool?.name)}
                                            disabled={processing === claim._id}
                                            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-colors disabled:opacity-50"
                                        >
                                            {processing === claim._id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                            Approve &amp; Verify
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <div className="text-xs text-slate-500">Page {page} of {totalPages}</div>
                            <div className="flex gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 px-2 rounded border border-[#2a2d3a] text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3a] disabled:opacity-30 transition-colors">
                                    <ChevronLeft size={16} />
                                </button>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1 px-2 rounded border border-[#2a2d3a] text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3a] disabled:opacity-30 transition-colors">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl w-full max-w-md shadow-2xl p-6 relative">
                        <button onClick={() => { setRejectModal(null); setRejectReason('') }}
                            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors">
                            <X size={20} />
                        </button>
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                                <X size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-100">Reject Claim?</h3>
                                <p className="text-sm text-slate-500">For "{rejectModal.tool?.name}"</p>
                            </div>
                        </div>
                        <form onSubmit={handleRejectSubmit}>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                                Reason (sent to claimant)
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="e.g. Insufficient proof of ownership, domain mismatch..."
                                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg p-3 text-slate-200 text-sm focus:outline-none focus:border-red-500/50 min-h-[90px] resize-none placeholder:text-slate-600"
                                autoFocus
                            />
                            <div className="flex justify-end gap-3 mt-4">
                                <button type="button" onClick={() => { setRejectModal(null); setRejectReason('') }}
                                    className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={processing}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                                    {processing ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Rejection'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ClaimRequests
