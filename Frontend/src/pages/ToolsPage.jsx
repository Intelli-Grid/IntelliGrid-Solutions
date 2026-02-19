import { useState, useEffect, useRef, useCallback } from 'react'
import { toolService } from '../services'
import ToolCard from '../components/tools/ToolCard'
import ToolCardSkeleton from '../components/tools/ToolCardSkeleton'
import ErrorMessage from '../components/common/ErrorMessage'
import Pagination from '../components/common/Pagination'
import SEO from '../components/common/SEO'
import { Search, SlidersHorizontal, X, Sparkles, TrendingUp, Star, DollarSign, Zap } from 'lucide-react'

const PRICING_OPTIONS = [
    { label: 'All Pricing', value: '' },
    { label: 'Free', value: 'Free' },
    { label: 'Freemium', value: 'Freemium' },
    { label: 'Paid', value: 'Paid' },
    { label: 'Trial', value: 'Trial' },
]

const SORT_OPTIONS = [
    { label: 'Newest First', value: '-createdAt' },
    { label: 'Most Popular', value: '-views' },
    { label: 'Highest Rated', value: '-ratings.average' },
    { label: 'A → Z', value: 'name' },
]

export default function ToolsPage() {
    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeSearch, setActiveSearch] = useState('') // committed search term
    const [isSearching, setIsSearching] = useState(false)
    const [filters, setFilters] = useState({ pricing: '', sort: '-createdAt' })
    const searchRef = useRef(null)
    const debounceRef = useRef(null)

    const limit = 30

    // ── Fetch browsing results (no search query) ───────────────────
    const fetchTools = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const params = { page, limit, sort: filters.sort }
            if (filters.pricing) params.pricing = filters.pricing
            const response = await toolService.getTools(params)
            setTools(response.tools || [])
            setTotalPages(response.pagination?.pages || 1)
            setTotal(response.pagination?.total || 0)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load tools')
        } finally {
            setLoading(false)
        }
    }, [page, filters])

    // ── Fetch Algolia search results ───────────────────────────────
    const fetchSearchResults = useCallback(async (query) => {
        if (!query.trim()) {
            setActiveSearch('')
            fetchTools()
            return
        }
        try {
            setIsSearching(true)
            setLoading(true)
            setError(null)
            const response = await toolService.searchTools(query, { limit: limit * 3 })
            const hits = response.hits || response.tools || response || []
            setTools(hits.slice(0, limit))
            setTotalPages(1)
            setTotal(hits.length)
        } catch (err) {
            setError('Search failed. Please try again.')
        } finally {
            setLoading(false)
            setIsSearching(false)
        }
    }, [fetchTools])

    // ── Effects ───────────────────────────────────────────────────
    useEffect(() => {
        if (!activeSearch) {
            fetchTools()
        }
    }, [page, filters, activeSearch])

    // Debounced search as user types
    const handleSearchInput = (value) => {
        setSearchQuery(value)
        clearTimeout(debounceRef.current)
        if (!value.trim()) {
            setActiveSearch('')
            setPage(1)
            return
        }
        debounceRef.current = setTimeout(() => {
            setActiveSearch(value)
            setPage(1)
            fetchSearchResults(value)
        }, 400)
    }

    // Submit on Enter
    const handleSearchSubmit = (e) => {
        e.preventDefault()
        clearTimeout(debounceRef.current)
        setActiveSearch(searchQuery)
        setPage(1)
        fetchSearchResults(searchQuery)
    }

    const clearSearch = () => {
        setSearchQuery('')
        setActiveSearch('')
        setPage(1)
        searchRef.current?.focus()
    }

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
        setPage(1)
    }

    const handlePageChange = (newPage) => {
        setPage(newPage)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const hasActiveFilters = filters.pricing !== '' || filters.sort !== '-createdAt'

    return (
        <div className="min-h-screen bg-gray-950">
            <SEO
                title="Browse All AI Tools - IntelliGrid Directory"
                description={`Discover ${total > 0 ? total.toLocaleString() : '4,000+'} curated AI tools. Search, filter by pricing, and find the perfect AI solution for your workflow.`}
                keywords="AI tools directory, browse AI tools, AI software list, best AI tools, free AI tools"
                canonicalUrl="https://www.intelligrid.online/tools"
            />

            {/* ── Hero / Search Header ─────────────────────────── */}
            <div className="relative border-b border-white/5 bg-gradient-to-b from-gray-900 to-gray-950 pt-12 pb-10 px-4">
                {/* Ambient glow */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-purple-600/10 blur-[80px]" />
                </div>

                <div className="relative container mx-auto max-w-4xl text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300 mb-4">
                        <Sparkles className="h-3 w-3" />
                        {total > 0 ? `${total.toLocaleString()} AI Tools` : 'Curated AI Directory'}
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
                        All AI Tools
                    </h1>
                    <p className="text-gray-400 text-lg mb-8">
                        Search and discover the best AI tools for your workflow
                    </p>

                    {/* Search Bar */}
                    <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
                        <div className="relative flex items-center">
                            <Search className="absolute left-4 h-5 w-5 text-gray-400 pointer-events-none" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearchInput(e.target.value)}
                                placeholder="Search by name, category, or use case..."
                                className="w-full pl-12 pr-24 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-base focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:bg-white/8 transition-all duration-200"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-20 text-gray-400 hover:text-white transition-colors p-1"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                            <button
                                type="submit"
                                className="absolute right-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-xl transition-colors"
                            >
                                Search
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* ── Filters Bar ──────────────────────────────────── */}
            <div className="sticky top-0 z-30 bg-gray-950/90 backdrop-blur-md border-b border-white/5 px-4">
                <div className="container mx-auto max-w-7xl flex items-center justify-between h-14 gap-4">

                    {/* Left: Pricing pills */}
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0">
                        <SlidersHorizontal className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        {PRICING_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => handleFilterChange('pricing', opt.value)}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${filters.pricing === opt.value
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Right: Sort + Result count */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <select
                            value={filters.sort}
                            onChange={(e) => handleFilterChange('sort', e.target.value)}
                            className="rounded-lg border border-white/10 bg-gray-900 px-3 py-1.5 text-xs text-gray-300 focus:border-purple-500/50 focus:outline-none cursor-pointer"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:block">
                            {activeSearch
                                ? `${tools.length} results for "${activeSearch}"`
                                : `${total.toLocaleString()} tools`
                            }
                        </span>

                        {hasActiveFilters && !activeSearch && (
                            <button
                                onClick={() => { setFilters({ pricing: '', sort: '-createdAt' }); setPage(1) }}
                                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                            >
                                <X className="h-3 w-3" /> Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Content ──────────────────────────────────────── */}
            <div className="container mx-auto max-w-7xl px-4 py-8">

                {/* Active search banner */}
                {activeSearch && !loading && (
                    <div className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
                        <Search className="h-4 w-4 text-purple-400 flex-shrink-0" />
                        <span className="text-sm text-gray-300">
                            Found <span className="font-semibold text-white">{tools.length}</span> tools matching{' '}
                            <span className="text-purple-300">"{activeSearch}"</span>
                        </span>
                        <button onClick={clearSearch} className="ml-auto text-xs text-gray-500 hover:text-white flex items-center gap-1">
                            <X className="h-3 w-3" /> Clear search
                        </button>
                    </div>
                )}

                {/* Loading skeleton */}
                {loading && (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[...Array(12)].map((_, i) => (
                            <ToolCardSkeleton key={i} />
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && !loading && <ErrorMessage message={error} onRetry={activeSearch ? () => fetchSearchResults(activeSearch) : fetchTools} />}

                {/* Tools Grid */}
                {!loading && !error && tools.length > 0 && (
                    <>
                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {tools.map((tool) => (
                                <ToolCard key={tool._id || tool.objectID} tool={tool} />
                            ))}
                        </div>

                        {/* Pagination — only for browse mode, not search */}
                        {!activeSearch && totalPages > 1 && (
                            <div className="mt-12">
                                <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
                            </div>
                        )}
                    </>
                )}

                {/* Empty State */}
                {!loading && !error && tools.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                            <Search className="h-7 w-7 text-gray-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">
                            {activeSearch ? 'No tools found' : 'No tools match your filters'}
                        </h3>
                        <p className="text-gray-500 text-sm mb-6 max-w-sm">
                            {activeSearch
                                ? `We couldn't find any AI tools matching "${activeSearch}". Try a different search term.`
                                : 'Try adjusting your filters to see more results.'
                            }
                        </p>
                        <button
                            onClick={() => { clearSearch(); setFilters({ pricing: '', sort: '-createdAt' }) }}
                            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
                        >
                            Reset & Browse All
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
