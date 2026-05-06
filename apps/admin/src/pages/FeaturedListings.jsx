import { useState, useEffect } from 'react'
import {
    Star, Plus, X, ExternalLink, Loader2, RefreshCw, Calendar,
    DollarSign, Crown, Package, Trash2, Edit3, CheckCircle, AlertTriangle
} from 'lucide-react'
import { adminService } from '../services'
import { toast } from 'react-hot-toast'
import { format, isPast } from 'date-fns'

const TierBadge = ({ tier }) => {
    const map = {
        premium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        standard: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    }
    return (
        <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${map[tier] || map.standard}`}>
            {tier === 'premium' && <Crown size={10} />}
            {tier}
        </span>
    )
}

const EMPTY_FORM = {
    toolId: '', tier: 'standard', startDate: '', endDate: '',
    vendorName: '', vendorEmail: '', monthlyRate: '', notes: ''
}

const FeaturedListings = () => {
    const [listings, setListings] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(EMPTY_FORM)
    const [submitting, setSubmitting] = useState(false)
    const [processing, setProcessing] = useState(null)
    const [activeOnly, setActiveOnly] = useState(false)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    useEffect(() => {
        fetchListings()
    }, [page, activeOnly])

    const fetchListings = async () => {
        setLoading(true)
        try {
            const data = await adminService.getFeaturedListings({ page, limit: 20, activeOnly: activeOnly.toString() })
            if (data.success) {
                setListings(data.listings)
                setTotalPages(data.pagination.pages)
            }
        } catch (err) {
            console.error(err)
            toast.error('Failed to load featured listings')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.toolId.trim()) return toast.error('Tool ID is required')
        if (!form.startDate || !form.endDate) return toast.error('Start and end dates are required')

        setSubmitting(true)
        const t = toast.loading('Creating featured listing...')
        try {
            const payload = {
                toolId: form.toolId.trim(),
                tier: form.tier,
                startDate: new Date(form.startDate).toISOString(),
                endDate: new Date(form.endDate).toISOString(),
                vendorName: form.vendorName,
                vendorEmail: form.vendorEmail,
                monthlyRate: parseFloat(form.monthlyRate) || 0,
                notes: form.notes,
            }
            const res = await adminService.createFeaturedListing(payload)
            if (res.success) {
                toast.success('Featured listing created!', { id: t })
                setShowForm(false)
                setForm(EMPTY_FORM)
                fetchListings()
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Failed to create listing', { id: t })
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeactivate = async (id, toolName) => {
        if (!window.confirm(`Deactivate listing for "${toolName}"? The tool will be un-featured.`)) return
        setProcessing(id)
        const t = toast.loading('Deactivating...')
        try {
            await adminService.deleteFeaturedListing(id)
            toast.success('Listing deactivated', { id: t })
            fetchListings()
        } catch (err) {
            toast.error('Failed to deactivate listing', { id: t })
        } finally {
            setProcessing(null)
        }
    }

    const handleExpireStale = async () => {
        const t = toast.loading('Expiring stale listings...')
        try {
            const res = await adminService.expireStaleFeaturedListings()
            toast.success(res.message || 'Stale listings expired', { id: t })
            fetchListings()
        } catch (err) {
            toast.error('Failed to expire stale listings', { id: t })
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 mb-1">Featured Listings</h1>
                    <p className="text-slate-400 text-sm">Manage sponsored tool placements and vendor partnerships.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={handleExpireStale}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-amber-400 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg hover:border-amber-500/30 transition-all">
                        <AlertTriangle size={13} /> Expire Stale
                    </button>
                    <button onClick={fetchListings}
                        className="p-2 text-slate-400 hover:text-slate-200 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg hover:border-[#3a3d4a] transition-all">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                        <Plus size={16} /> New Listing
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-400">
                    <div
                        onClick={() => { setActiveOnly(!activeOnly); setPage(1) }}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${activeOnly ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${activeOnly ? 'translate-x-4' : ''}`} />
                    </div>
                    Active only
                </label>
                <span className="text-slate-600 text-xs">{listings.length} listings shown</span>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="bg-[#1a1d27] border border-indigo-500/30 rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="font-semibold text-slate-100 flex items-center gap-2">
                            <Star size={16} className="text-amber-400" /> New Featured Listing
                        </h2>
                        <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                            className="text-slate-500 hover:text-slate-300 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Tool ID (MongoDB _id) *</label>
                            <input type="text" value={form.toolId} onChange={e => setForm(f => ({ ...f, toolId: e.target.value }))}
                                placeholder="64abc123def456..." required
                                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 font-mono placeholder:text-slate-600" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Tier *</label>
                            <select value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}
                                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50">
                                <option value="standard">Standard</option>
                                <option value="premium">Premium</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Monthly Rate ($)</label>
                            <input type="number" min="0" step="0.01" value={form.monthlyRate} onChange={e => setForm(f => ({ ...f, monthlyRate: e.target.value }))}
                                placeholder="99.00"
                                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-600" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Start Date *</label>
                            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required
                                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">End Date *</label>
                            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required
                                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Vendor Name</label>
                            <input type="text" value={form.vendorName} onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))}
                                placeholder="Acme Corp"
                                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-600" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Vendor Email</label>
                            <input type="email" value={form.vendorEmail} onChange={e => setForm(f => ({ ...f, vendorEmail: e.target.value }))}
                                placeholder="vendor@acme.com"
                                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 placeholder:text-slate-600" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Notes (internal)</label>
                            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="Payment terms, special conditions..."
                                className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 min-h-[70px] resize-none placeholder:text-slate-600" />
                        </div>
                        <div className="sm:col-span-2 flex justify-end gap-3">
                            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={submitting}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                Create Listing
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
            ) : listings.length === 0 ? (
                <div className="bg-[#1a1d27] border border-dashed border-slate-700 rounded-xl p-16 flex flex-col items-center text-center">
                    <Star size={36} className="text-slate-600 mb-4" />
                    <h3 className="text-lg font-medium text-slate-300 mb-2">No Featured Listings</h3>
                    <p className="text-slate-500 text-sm mb-5">Create your first sponsored listing to start generating vendor revenue.</p>
                    <button onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                        <Plus size={14} /> Create First Listing
                    </button>
                </div>
            ) : (
                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#2a2d3a] bg-[#222530]">
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Tool</th>
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Tier</th>
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Vendor</th>
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Period</th>
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Rate</th>
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2a2d3a]">
                                {listings.map(listing => {
                                    const isExpired = listing.endDate && isPast(new Date(listing.endDate))
                                    return (
                                        <tr key={listing._id} className={`group hover:bg-[#222530] transition-colors ${!listing.isActive ? 'opacity-50' : ''}`}>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    {listing.tool?.logo ? (
                                                        <img src={listing.tool.logo} alt={listing.tool.name} className="w-9 h-9 rounded-lg object-cover bg-slate-800 shrink-0" onError={e => { e.target.style.display = 'none' }} />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                                                            <Package size={16} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-medium text-slate-200 text-sm">{listing.tool?.name || 'Unknown'}</div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {!listing.isActive && <span className="text-[10px] text-slate-500">Inactive</span>}
                                                            {isExpired && listing.isActive && <span className="text-[10px] text-red-400">Expired</span>}
                                                            {listing.isActive && !isExpired && <span className="text-[10px] text-emerald-400 flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Live</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6"><TierBadge tier={listing.tier} /></td>
                                            <td className="py-4 px-6">
                                                <div className="text-sm text-slate-300">{listing.vendorName || '—'}</div>
                                                <div className="text-xs text-slate-500">{listing.vendorEmail || ''}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Calendar size={11} className="text-slate-600" />
                                                    {listing.startDate ? format(new Date(listing.startDate), 'MMM d') : '?'}
                                                    {' → '}
                                                    {listing.endDate ? format(new Date(listing.endDate), 'MMM d, yyyy') : '?'}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="text-sm font-mono text-emerald-400">
                                                    {listing.monthlyRate ? `$${listing.monthlyRate}/mo` : '—'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                {listing.isActive && (
                                                    <button
                                                        onClick={() => handleDeactivate(listing._id, listing.tool?.name)}
                                                        disabled={processing === listing._id}
                                                        title="Deactivate listing"
                                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        {processing === listing._id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="border-t border-[#2a2d3a] p-4 flex items-center justify-between">
                            <div className="text-xs text-slate-500">Page {page} of {totalPages}</div>
                            <div className="flex gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="px-3 py-1 rounded border border-[#2a2d3a] text-slate-400 text-xs hover:text-slate-200 hover:bg-[#2a2d3a] disabled:opacity-30 transition-colors">
                                    Prev
                                </button>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    className="px-3 py-1 rounded border border-[#2a2d3a] text-slate-400 text-xs hover:text-slate-200 hover:bg-[#2a2d3a] disabled:opacity-30 transition-colors">
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default FeaturedListings
