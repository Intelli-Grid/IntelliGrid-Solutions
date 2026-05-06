/**
 * StacksPage.jsx — v2.5.0 Workflow Stacks Discovery Page
 *
 * Public page: /stacks
 * Lists community-curated AI tool workflow stacks.
 * Features: featured row, filters, paginated grid, create CTA.
 */
import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { stackService } from '../services'
import {
    Layers,
    TrendingUp,
    Plus,
    Eye,
    Bookmark,
    GitFork,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    Search,
    X,
    Crown,
    Package,
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { useToast } from '../context/ToastContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPricingBadge(pricing) {
    if (!pricing) return null
    const p = typeof pricing === 'string' ? pricing : pricing?.type || ''
    const map = {
        Free:     'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        Freemium: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
        Paid:     'text-amber-400 bg-amber-400/10 border-amber-400/20',
    }
    return { label: p, cls: map[p] || 'text-gray-400 bg-gray-400/10 border-gray-400/20' }
}

// ─── Stack Card ────────────────────────────────────────────────────────────────

function StackCard({ stack, onSave, savingId }) {
    const toolPreviews = (stack.tools || []).slice(0, 5)
    const extraCount   = Math.max(0, (stack.tools?.length || 0) - 5)

    return (
        <Link
            to={`/stacks/${stack.slug}`}
            className="group flex flex-col rounded-2xl border border-white/8 bg-[#0d0d0d] p-5 transition-all duration-300 hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/8 hover:-translate-y-0.5"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        {stack.isFeatured && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-600/80 text-purple-200 border border-purple-400/30 font-semibold uppercase tracking-wider">
                                <Crown size={9} /> Featured
                            </span>
                        )}
                        {stack.useCase && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
                                {stack.useCase}
                            </span>
                        )}
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                        {stack.name}
                    </h3>
                    {stack.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {stack.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Tool logo strip */}
            <div className="flex items-center gap-1.5 mb-4 flex-wrap">
                {toolPreviews.map((entry, i) => {
                    const tool = entry.tool || {}
                    const pricing = getPricingBadge(tool.pricing)
                    return (
                        <div key={i} className="relative group/tool" title={tool.name || ''}>
                            {tool.logo ? (
                                <img
                                    src={tool.logo}
                                    alt={tool.name}
                                    className="h-8 w-8 rounded-lg object-cover border border-white/10 bg-white/5"
                                />
                            ) : (
                                <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center border border-white/10">
                                    <Package size={14} className="text-purple-400" />
                                </div>
                            )}
                            {pricing && (
                                <span className={`absolute -bottom-1 -right-1 text-[8px] px-1 rounded border ${pricing.cls} leading-tight`}>
                                    {pricing.label[0]}
                                </span>
                            )}
                        </div>
                    )
                })}
                {extraCount > 0 && (
                    <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-gray-400 font-medium">
                        +{extraCount}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-auto flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex items-center gap-3 text-[11px] text-gray-600">
                    <span className="flex items-center gap-1">
                        <Eye size={11} />{(stack.views || 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                        <Bookmark size={11} />{(stack.saves || 0).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                        <GitFork size={11} />{(stack.clones || 0).toLocaleString()}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {stack.creatorName && (
                        <span className="text-[11px] text-gray-600 truncate max-w-[80px]">
                            by {stack.creatorName}
                        </span>
                    )}
                    <span className="text-[11px] text-gray-500">
                        {(stack.tools?.length || 0)} tools
                    </span>
                </div>
            </div>
        </Link>
    )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const USE_CASE_OPTIONS = [
    'Content Creation', 'Solo Dev', 'Marketing', 'Research',
    'Design', 'Sales', 'Data Analysis', 'Customer Support',
]

export default function StacksPage() {
    const { isSignedIn } = useUser()
    const navigate = useNavigate()
    const { toast } = useToast()

    const [stacks, setStacks]       = useState([])
    const [featured, setFeatured]   = useState([])
    const [loading, setLoading]     = useState(true)
    const [savingId, setSavingId]   = useState(null)
    const [page, setPage]           = useState(1)
    const [pagination, setPagination] = useState({ total: 0, pages: 1 })
    const [searchTag, setSearchTag] = useState('')
    const [useCase, setUseCase]     = useState('')

    const load = useCallback(async (p = 1) => {
        setLoading(true)
        try {
            const params = { page: p, limit: 18 }
            if (searchTag.trim()) params.tag = searchTag.trim()
            if (useCase)          params.useCase = useCase
            const res = await stackService.getStacks(params)
            if (res.data?.success) {
                setStacks(res.data.stacks)
                setPagination(res.data.pagination)
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to load stacks', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }, [searchTag, useCase])

    useEffect(() => {
        stackService.getFeatured()
            .then(r => { if (r.data?.success) setFeatured(r.data.stacks || []) })
            .catch(() => {})
    }, [])

    useEffect(() => {
        setPage(1)
        load(1)
    }, [searchTag, useCase])

    useEffect(() => {
        load(page)
    }, [page])

    const handleSave = async (stack) => {
        if (!isSignedIn) {
            toast({ title: 'Sign in required', description: 'Sign in to bookmark stacks' })
            return
        }
        setSavingId(stack._id)
        try {
            const res = await stackService.save(stack._id)
            const { saved, saves } = res.data
            setStacks(prev => prev.map(s =>
                s._id === stack._id ? { ...s, saves } : s
            ))
            toast({ title: saved ? '🔖 Bookmarked' : 'Removed', description: saved ? `"${stack.name}" saved to your bookmarks` : 'Bookmark removed' })
        } catch (err) {
            toast({ title: 'Error', description: 'Could not update bookmark', variant: 'destructive' })
        } finally {
            setSavingId(null)
        }
    }

    return (
        <div className="min-h-screen bg-[#080808] text-white">
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">

                {/* ── Hero ── */}
                <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Layers className="h-6 w-6 text-purple-400" />
                            <span className="text-xs font-semibold uppercase tracking-widest text-purple-400">
                                v2.5.0 Feature
                            </span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            Workflow Stacks
                        </h1>
                        <p className="mt-2 text-base text-gray-500 max-w-xl">
                            Community-curated collections of AI tools that work together.
                            Browse, clone, and build your own stack.
                        </p>
                    </div>
                    <button
                        onClick={() => isSignedIn ? navigate('/stacks/create') : toast({ title: 'Sign in required', description: 'Sign in to create a stack' })}
                        className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-2.5 text-sm font-bold text-white transition-all shadow-lg shadow-purple-500/20 flex-shrink-0"
                    >
                        <Plus size={16} /> Create Stack
                    </button>
                </div>

                {/* ── Featured Row ── */}
                {featured.length > 0 && (
                    <section className="mb-10">
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles className="h-4 w-4 text-amber-400" />
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-400">
                                Featured Stacks
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {featured.map(s => (
                                <StackCard key={s._id} stack={s} onSave={handleSave} savingId={savingId} />
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Filters ── */}
                <div className="mb-6 flex flex-col sm:flex-row gap-3">
                    {/* Tag search */}
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                        <input
                            type="text"
                            placeholder="Filter by tag…"
                            value={searchTag}
                            onChange={e => setSearchTag(e.target.value)}
                            className="w-full rounded-xl bg-white/5 border border-white/10 pl-9 pr-9 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition"
                        />
                        {searchTag && (
                            <button onClick={() => setSearchTag('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Use case select */}
                    <select
                        value={useCase}
                        onChange={e => setUseCase(e.target.value)}
                        className="rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition cursor-pointer"
                    >
                        <option value="">All Use Cases</option>
                        {USE_CASE_OPTIONS.map(uc => (
                            <option key={uc} value={uc}>{uc}</option>
                        ))}
                    </select>

                    {/* Active filter chip */}
                    {(searchTag || useCase) && (
                        <button
                            onClick={() => { setSearchTag(''); setUseCase('') }}
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 rounded-xl px-3 py-2 transition"
                        >
                            <X size={12} /> Clear filters
                        </button>
                    )}
                </div>

                {/* ── Grid ── */}
                {loading ? (
                    <div className="flex justify-center py-24"><LoadingSpinner /></div>
                ) : stacks.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/5 py-20 text-center">
                        <Layers className="mx-auto mb-4 h-12 w-12 text-purple-400 opacity-50" />
                        <h3 className="text-lg font-semibold text-white mb-1">No stacks found</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            {searchTag || useCase ? 'Try clearing your filters.' : 'Be the first to create a workflow stack!'}
                        </p>
                        <button
                            onClick={() => isSignedIn ? navigate('/stacks/create') : toast({ title: 'Sign in required' })}
                            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-2.5 text-sm font-bold text-white transition"
                        >
                            <Plus size={16} /> Create the first stack
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs text-gray-600">
                                {pagination.total.toLocaleString()} stacks found
                            </p>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                                <TrendingUp size={12} /> Sorted by views
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stacks.map(s => (
                                <StackCard key={s._id} stack={s} onSave={handleSave} savingId={savingId} />
                            ))}
                        </div>
                    </>
                )}

                {/* ── Pagination ── */}
                {pagination.pages > 1 && (
                    <div className="mt-10 flex items-center justify-center gap-4">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition"
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <span className="text-sm text-gray-500">
                            Page {page} of {pagination.pages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={page === pagination.pages}
                            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition"
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
