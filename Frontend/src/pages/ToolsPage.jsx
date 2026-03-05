import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { toolService, categoryService } from '../services'
import ToolCard from '../components/tools/ToolCard'
import ToolCardSkeleton from '../components/tools/ToolCardSkeleton'
import ErrorMessage from '../components/common/ErrorMessage'
import Pagination from '../components/common/Pagination'
import SEO from '../components/common/SEO'
import {
    Search, X, Sparkles, TrendingUp, Star,
    LayoutGrid, List, ArrowUpRight, Flame, Clock, SortAsc
} from 'lucide-react'

const PRICING_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'Free', value: 'Free' },
    { label: 'Freemium', value: 'Freemium' },
    { label: 'Paid', value: 'Paid' },
    { label: 'Trial', value: 'Trial' },
]

const PLATFORM_OPTIONS = [
    { label: 'Web', value: 'Web' },
    { label: 'iOS', value: 'iOS' },
    { label: 'Android', value: 'Android' },
    { label: 'API', value: 'API' },
    { label: 'Chrome Ext', value: 'Chrome Extension' },
    { label: 'VS Code', value: 'VS Code Extension' },
    { label: 'Discord', value: 'Discord Bot' },
]

const AUDIENCE_OPTIONS = [
    { label: 'Marketers', value: 'Marketers' },
    { label: 'Developers', value: 'Developers' },
    { label: 'Designers', value: 'Designers' },
    { label: 'Students', value: 'Students' },
    { label: 'Entrepreneurs', value: 'Entrepreneurs' },
    { label: 'Content Creators', value: 'Content Creators' },
    { label: 'Researchers', value: 'Researchers' },
    { label: 'Small Business', value: 'Small Business' },
]

const SORT_TABS = [
    { label: 'Trending', value: '-trendingScore', icon: TrendingUp },
    { label: 'Newest', value: '-createdAt', icon: Clock },
    { label: 'Popular', value: '-views', icon: Flame },
    { label: 'Top Rated', value: '-ratings.average', icon: Star },
    { label: 'A → Z', value: 'name', icon: SortAsc },
]

const CATEGORY_ICONS = {
    'writing': '✍️', 'image': '🎨', 'code': '💻', 'video': '🎬',
    'audio': '🎵', 'chatbot': '🤖', 'productivity': '⚡', 'marketing': '📈',
    'design': '🖌️', 'research': '🔍', 'business': '💼', 'education': '📚',
    'default': '🛠️',
}

function getCategoryIcon(name = '') {
    const lower = name.toLowerCase()
    for (const [key, emoji] of Object.entries(CATEGORY_ICONS)) {
        if (lower.includes(key)) return emoji
    }
    return CATEGORY_ICONS.default
}

// Compact list-view row for each tool
function ToolListRow({ tool }) {
    const logoSrc = tool.logo || tool.metadata?.logo || ''
    const pricingDisplay = tool.pricing || 'Contact'
    return (
        <Link
            to={`/tools/${tool.slug}`}
            className="group flex items-center gap-4 px-4 py-3.5 rounded-xl bg-[#0d0d0d] border border-white/8 hover:border-purple-500/30 hover:bg-white/3 transition-all duration-200"
        >
            {/* Logo */}
            <div className="flex-shrink-0 h-11 w-11 rounded-xl overflow-hidden border border-white/10 bg-white/5">
                {logoSrc ? (
                    <img src={logoSrc} alt={tool.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white/30">
                        {tool.name?.charAt(0) || '?'}
                    </div>
                )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors truncate">{tool.name}</span>
                    {tool.isTrending && <span className="text-[9px] text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded-full bg-amber-400/10 flex-shrink-0">Trending</span>}
                </div>
                <p className="text-[12px] text-gray-500 truncate mt-0.5">{tool.shortDescription || tool.description}</p>
            </div>
            {/* Pricing + Visit */}
            <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[11px] text-gray-400 hidden sm:block">{pricingDisplay}</span>
                <span className="h-7 px-2.5 flex items-center gap-1 rounded-lg bg-white/5 border border-white/8 text-gray-300 text-[11px] font-medium group-hover:bg-purple-600/20 group-hover:border-purple-500/30 group-hover:text-purple-300 transition-colors">
                    Visit <ArrowUpRight size={10} />
                </span>
            </div>
        </Link>
    )
}

export default function ToolsPage() {
    const [tools, setTools] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeSearch, setActiveSearch] = useState('')
    const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
    const [filters, setFilters] = useState({ pricing: '', sort: '-createdAt', category: '', platform: '', audience: '' })
    const [showPlatformFilters, setShowPlatformFilters] = useState(false)
    const [showAudienceFilters, setShowAudienceFilters] = useState(false)
    const searchRef = useRef(null)
    const debounceRef = useRef(null)
    const limit = 30

    // ── Load categories once ────────────────────────────────────────
    useEffect(() => {
        categoryService.getCategories()
            .then(res => setCategories(res.data || res || []))
            .catch(() => { })
    }, [])

    // ── Fetch tools (browse) ────────────────────────────────────────
    const fetchTools = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = { page, limit, sort: filters.sort }
            if (filters.pricing) params.pricing = filters.pricing
            if (filters.category) params.category = filters.category
            if (filters.platform) params.platform = filters.platform
            if (filters.audience) params.audience = filters.audience
            const response = await toolService.getTools(params)
            // ApiResponse wraps result as { data: { tools, pagination }, statusCode, ... }
            const payload = response?.data || response
            setTools(payload?.tools || [])
            setTotalPages(payload?.pagination?.pages || 1)
            setTotal(payload?.pagination?.total || 0)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load tools')
        } finally {
            setLoading(false)
        }
    }, [page, filters])

    // ── Fetch search (Algolia) ──────────────────────────────────────
    const fetchSearch = useCallback(async (query) => {
        try {
            setLoading(true)
            setError(null)
            const response = await toolService.searchTools(query, { limit: 60 })
            const hits = response.hits || response.tools || response || []
            setTools(hits.slice(0, 60))
            setTotalPages(1)
            setTotal(hits.length)
        } catch {
            setError('Search failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!activeSearch) fetchTools()
    }, [page, filters, activeSearch, fetchTools])

    // Debounced search as user types
    const handleSearchInput = (value) => {
        setSearchQuery(value)
        clearTimeout(debounceRef.current)
        if (!value.trim()) { setActiveSearch(''); setPage(1); return }
        debounceRef.current = setTimeout(() => {
            setActiveSearch(value)
            setPage(1)
            fetchSearch(value)
        }, 380)
    }

    const handleSearchSubmit = (e) => {
        e.preventDefault()
        clearTimeout(debounceRef.current)
        if (!searchQuery.trim()) return
        setActiveSearch(searchQuery)
        setPage(1)
        fetchSearch(searchQuery)
    }

    const clearSearch = () => {
        setSearchQuery(''); setActiveSearch(''); setPage(1)
        searchRef.current?.focus()
    }

    const clearAllFilters = () => {
        setFilters({ pricing: '', sort: '-createdAt', category: '', platform: '', audience: '' })
        setPage(1)
        setShowPlatformFilters(false)
        setShowAudienceFilters(false)
    }

    const setFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
        setPage(1)
        if (activeSearch) clearSearch()
    }

    const handlePageChange = (p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }

    return (
        <div className="min-h-screen bg-gray-950">
            <SEO
                title="Browse All AI Tools - IntelliGrid Directory"
                description={`Discover ${total > 0 ? total.toLocaleString() : '4,000+'} curated AI tools. Search by name, filter by pricing, and find the perfect AI solution.`}
                keywords="AI tools directory, browse AI tools, best AI tools, free AI tools"
                canonicalUrl="https://www.intelligrid.online/tools"
            />

            {/* ══════════════ HERO ══════════════ */}
            <div className="relative border-b border-white/5 bg-gradient-to-b from-[#0c0c14] to-gray-950 pt-14 pb-10 px-4">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full bg-purple-600/8 blur-[100px]" />
                </div>

                <div className="relative container mx-auto max-w-3xl text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-medium text-gray-400 mb-5">
                        <Sparkles className="h-3 w-3 text-purple-400" />
                        {total > 0 ? `${total.toLocaleString()} AI Tools Indexed` : 'Curated AI Directory'}
                    </div>

                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
                        All AI Tools
                    </h1>
                    <p className="text-gray-500 text-base mb-8">
                        Search, filter, and discover tools that supercharge your workflow
                    </p>

                    {/* Search Bar */}
                    <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-500 pointer-events-none" size={18} />
                        <input
                            ref={searchRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearchInput(e.target.value)}
                            placeholder="Search tools by name, category, or use-case..."
                            className="w-full pl-11 pr-28 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/15 focus:bg-white/7 transition-all"
                        />
                        {searchQuery && (
                            <button type="button" onClick={clearSearch} className="absolute right-[88px] top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1">
                                <X size={14} />
                            </button>
                        )}
                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors">
                            Search
                        </button>
                    </form>
                </div>
            </div>

            {/* ══════════════ CATEGORY STRIP ══════════════ */}
            {categories.length > 0 && (
                <div className="border-b border-white/5 bg-gray-950/80 backdrop-blur-sm overflow-x-auto">
                    <div className="flex items-center gap-2 px-4 py-3 min-w-max mx-auto max-w-7xl">
                        <button
                            onClick={() => setFilter('category', '')}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!filters.category
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                                }`}
                        >
                            🌐 All
                        </button>
                        {categories.slice(0, 16).map(cat => (
                            <button
                                key={cat._id || cat.slug}
                                onClick={() => setFilter('category', cat.slug)}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filters.category === cat.slug
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                                    }`}
                            >
                                <span>{getCategoryIcon(cat.name)}</span>
                                <span>{cat.name}</span>
                                {cat.toolCount > 0 && (
                                    <span className="text-[10px] opacity-60">({cat.toolCount})</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ══════════════ FILTER BAR ══════════════ */}
            <div className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur-md border-b border-white/5">
                {/* Row 1: Pricing + Sort + Controls */}
                <div className="container mx-auto max-w-7xl px-4 flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Pricing pills */}
                        {PRICING_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setFilter('pricing', opt.value)}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filters.pricing === opt.value
                                    ? 'bg-white/15 text-white border border-white/20'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}

                        <div className="w-px h-4 bg-white/10 mx-1" />

                        {/* Sort tabs */}
                        {SORT_TABS.map(tab => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.value}
                                    onClick={() => setFilter('sort', tab.value)}
                                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all ${filters.sort === tab.value
                                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                        }`}
                                >
                                    <Icon size={11} />
                                    {tab.label}
                                </button>
                            )
                        })}

                        <div className="w-px h-4 bg-white/10 mx-1" />

                        {/* Platform filter toggle */}
                        <button
                            onClick={() => { setShowPlatformFilters(p => !p); setShowAudienceFilters(false) }}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all border ${filters.platform
                                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30'
                                : showPlatformFilters
                                    ? 'bg-white/10 text-white border-white/20'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border-transparent'
                                }`}
                        >
                            Platform {filters.platform ? `· ${filters.platform}` : ''}
                        </button>

                        {/* Audience filter toggle */}
                        <button
                            onClick={() => { setShowAudienceFilters(p => !p); setShowPlatformFilters(false) }}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all border ${filters.audience
                                ? 'bg-blue-600/20 text-blue-300 border-blue-500/30'
                                : showAudienceFilters
                                    ? 'bg-white/10 text-white border-white/20'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border-transparent'
                                }`}
                        >
                            Audience {filters.audience ? `· ${filters.audience}` : ''}
                        </button>
                    </div>

                    {/* Right: Count + Grid/List toggle */}
                    <div className="flex items-center gap-3 ml-auto">
                        <span className="text-[11px] text-gray-600 hidden sm:block">
                            {activeSearch
                                ? `${tools.length} results for "${activeSearch}"`
                                : `${total.toLocaleString()} tools`
                            }
                        </span>

                        {/* View mode toggle */}
                        <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5 border border-white/8">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                title="Grid view"
                            >
                                <LayoutGrid size={13} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                title="List view"
                            >
                                <List size={13} />
                            </button>
                        </div>

                        {/* Clear all */}
                        {(filters.pricing || filters.category || filters.platform || filters.audience || filters.sort !== '-trendingScore') && !activeSearch && (
                            <button
                                onClick={clearAllFilters}
                                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                                <X size={11} /> Clear all
                            </button>
                        )}
                    </div>
                </div>

                {/* Row 2: Platform chips (collapsible) */}
                {showPlatformFilters && (
                    <div className="border-t border-white/5 bg-gray-950/80">
                        <div className="container mx-auto max-w-7xl px-4 py-2 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-gray-600 uppercase tracking-wider mr-1">Platform:</span>
                            <button
                                onClick={() => setFilter('platform', '')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${!filters.platform ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                    }`}
                            >Any</button>
                            {PLATFORM_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setFilter('platform', filters.platform === opt.value ? '' : opt.value)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${filters.platform === opt.value
                                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-white/4 text-gray-400 hover:text-white hover:bg-white/8 border border-white/6'
                                        }`}
                                >{opt.label}</button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Row 3: Audience chips (collapsible) */}
                {showAudienceFilters && (
                    <div className="border-t border-white/5 bg-gray-950/80">
                        <div className="container mx-auto max-w-7xl px-4 py-2 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-gray-600 uppercase tracking-wider mr-1">Audience:</span>
                            <button
                                onClick={() => setFilter('audience', '')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${!filters.audience ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                    }`}
                            >Anyone</button>
                            {AUDIENCE_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setFilter('audience', filters.audience === opt.value ? '' : opt.value)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${filters.audience === opt.value
                                        ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                                        : 'bg-white/4 text-gray-400 hover:text-white hover:bg-white/8 border border-white/6'
                                        }`}
                                >{opt.label}</button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ══════════════ MAIN CONTENT ══════════════ */}
            <div className="container mx-auto max-w-7xl px-4 py-8">

                {/* Active search banner */}
                {activeSearch && !loading && tools.length > 0 && (
                    <div className="mb-5 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-purple-500/5 border border-purple-500/15 text-sm text-gray-400">
                        <Search size={14} className="text-purple-400 flex-shrink-0" />
                        <span><span className="text-white font-medium">{tools.length}</span> tools for <span className="text-purple-300">"{activeSearch}"</span></span>
                        <button onClick={clearSearch} className="ml-auto text-xs text-gray-600 hover:text-white flex items-center gap-1">
                            <X size={11} /> Clear
                        </button>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    viewMode === 'grid' ? (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {[...Array(12)].map((_, i) => <ToolCardSkeleton key={i} />)}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="h-16 rounded-xl bg-white/3 border border-white/5 animate-pulse" />
                            ))}
                        </div>
                    )
                )}

                {/* Error */}
                {error && !loading && (
                    <ErrorMessage message={error} onRetry={activeSearch ? () => fetchSearch(activeSearch) : fetchTools} />
                )}

                {/* Tools */}
                {!loading && !error && tools.length > 0 && (
                    <>
                        {viewMode === 'grid' ? (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {tools.map(tool => (
                                    <ToolCard key={tool._id || tool.objectID} tool={tool} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {tools.map(tool => (
                                    <ToolListRow key={tool._id || tool.objectID} tool={tool} />
                                ))}
                            </div>
                        )}

                        {!activeSearch && totalPages > 1 && (
                            <div className="mt-12">
                                <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
                            </div>
                        )}
                    </>
                )}

                {/* Empty */}
                {!loading && !error && tools.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4">
                            <Search className="h-6 w-6 text-gray-600" />
                        </div>
                        <h3 className="text-base font-semibold text-white mb-2">
                            {activeSearch ? `No results for "${activeSearch}"` : 'No tools match your filters'}
                        </h3>
                        <p className="text-gray-600 text-sm mb-6 max-w-xs">
                            {activeSearch ? 'Try a different term or browse all tools.' : 'Adjust or clear your filters.'}
                        </p>
                        <button
                            onClick={() => { clearSearch(); setFilters({ pricing: '', sort: '-createdAt', category: '' }) }}
                            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
                        >
                            Browse All Tools
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
