import { useState, useEffect } from 'react'
import { toolService } from '../services'
import ToolCard from '../components/tools/ToolCard'
import ToolCardSkeleton from '../components/tools/ToolCardSkeleton'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import Pagination from '../components/common/Pagination'
import { Filter, SlidersHorizontal } from 'lucide-react'

export default function ToolsPage() {
    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [filters, setFilters] = useState({
        pricing: '',
        sort: 'newest',
    })
    const [showFilters, setShowFilters] = useState(false)

    const limit = 12

    useEffect(() => {
        fetchTools()
    }, [page, filters])

    const fetchTools = async () => {
        try {
            setLoading(true)
            setError(null)

            const params = {
                page,
                limit,
                sort: filters.sort,
            }

            if (filters.pricing) {
                params.pricing = filters.pricing
            }

            const response = await toolService.getTools(params)
            setTools(response.tools || [])
            setTotalPages(response.pagination?.pages || 1)
            setTotal(response.pagination?.total || 0)
        } catch (err) {
            console.error('Error fetching tools:', err)
            setError(err.response?.data?.message || 'Failed to load tools')
        } finally {
            setLoading(false)
        }
    }

    const handlePageChange = (newPage) => {
        setPage(newPage)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }))
        setPage(1) // Reset to first page
    }

    return (
        <div className="container mx-auto px-4 py-16">
            {/* Header */}
            <div className="mb-8">
                <h1 className="mb-2 text-4xl font-bold text-white">All AI Tools</h1>
                <p className="text-gray-400">
                    Discover {total > 0 ? `${total.toLocaleString()}` : 'thousands of'} AI tools to
                    supercharge your workflow
                </p>
            </div>

            {/* Filters */}
            <div className="mb-8 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10 md:hidden"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Filters</span>
                </button>

                <div
                    className={`flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0 ${showFilters ? 'block' : 'hidden md:flex'
                        }`}
                >
                    {/* Pricing Filter */}
                    <div className="flex items-center space-x-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <select
                            value={filters.pricing}
                            onChange={(e) => handleFilterChange('pricing', e.target.value)}
                            className="rounded-lg border border-white/10 bg-gray-800 px-4 py-2 text-sm text-white focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20"
                        >
                            <option value="">All Pricing</option>
                            <option value="free">Free</option>
                            <option value="freemium">Freemium</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>

                    {/* Sort */}
                    <select
                        value={filters.sort}
                        onChange={(e) => handleFilterChange('sort', e.target.value)}
                        className="rounded-lg border border-white/10 bg-gray-800 px-4 py-2 text-sm text-white focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20"
                    >
                        <option value="newest">Newest First</option>
                        <option value="popular">Most Popular</option>
                        <option value="rating">Highest Rated</option>
                    </select>
                </div>

                <div className="text-sm text-gray-400">
                    Showing {tools.length} of {total.toLocaleString()} tools
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(9)].map((_, i) => (
                        <ToolCardSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* Error State */}
            {error && !loading && <ErrorMessage message={error} onRetry={fetchTools} />}

            {/* Tools Grid */}
            {!loading && !error && tools.length > 0 && (
                <>
                    <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {tools.map((tool) => (
                            <ToolCard key={tool._id} tool={tool} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
                    )}
                </>
            )}

            {/* Empty State */}
            {!loading && !error && tools.length === 0 && (
                <div className="py-12 text-center">
                    <p className="text-gray-400">No tools found matching your filters.</p>
                    <button
                        onClick={() => {
                            setFilters({ pricing: '', sort: 'newest' })
                            setPage(1)
                        }}
                        className="mt-4 text-sm text-purple-400 hover:text-purple-300"
                    >
                        Clear filters
                    </button>
                </div>
            )}
        </div>
    )
}
