import { useState } from 'react'
import { InstantSearch, SearchBox, Hits, Pagination, RefinementList, Configure } from 'react-instantsearch'
import algoliasearch from 'algoliasearch/lite'
import { Link } from 'react-router-dom'
import { Star, ExternalLink, Sparkles } from 'lucide-react'
import { formatNumber, getPricingDisplay } from '../utils/helpers'

// Initialize Algolia client
const searchClient = algoliasearch(
    import.meta.env.VITE_ALGOLIA_APP_ID,
    import.meta.env.VITE_ALGOLIA_SEARCH_KEY
)

// Custom Hit Component
function Hit({ hit }) {
    return (
        <div className="glass-card overflow-hidden transition-all duration-300 hover:scale-[1.02]">
            <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                        <Link
                            to={`/tools/${hit.slug}`}
                            className="text-xl font-bold text-white transition hover:text-purple-400"
                        >
                            {hit.name}
                        </Link>
                        {hit.isFeatured && (
                            <span className="ml-2 inline-flex items-center space-x-1 rounded-full bg-purple-500/10 px-2 py-1 text-xs text-purple-400">
                                <Sparkles className="h-3 w-3" />
                                <span>Featured</span>
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-gray-400">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span>{hit.ratings?.average?.toFixed(1) || '0.0'}</span>
                    </div>
                </div>

                <p className="mb-4 line-clamp-2 text-sm text-gray-400">{hit.shortDescription}</p>

                {hit.tags && hit.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                        {hit.tags.slice(0, 3).map((tag, index) => (
                            <span
                                key={index}
                                className="rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-400"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{formatNumber(hit.views || 0)} views</span>
                        <span>•</span>
                        <span className="font-medium text-purple-400">{getPricingDisplay(hit.pricing)}</span>
                    </div>
                    <Link
                        to={`/tools/${hit.slug}`}
                        className="flex items-center space-x-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
                    >
                        <span>View</span>
                        <ExternalLink className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </div>
    )
}

// Custom SearchBox Component
function CustomSearchBox(props) {
    return (
        <div className="relative">
            <input
                {...props}
                type="search"
                placeholder="Search for AI tools..."
                className="w-full rounded-lg border border-white/10 bg-gray-800 px-6 py-4 pr-12 text-white placeholder-gray-500 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            </div>
        </div>
    )
}

// Custom Pagination Component
function CustomPagination(props) {
    return (
        <div className="flex items-center justify-center space-x-2">
            {props.pages.map((page) => (
                <button
                    key={page}
                    onClick={() => props.refine(page)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${props.currentRefinement === page
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                >
                    {page}
                </button>
            ))}
        </div>
    )
}

// No Results Component
function NoResults() {
    return (
        <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10">
                <svg
                    className="h-8 w-8 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">No results found</h3>
            <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
        </div>
    )
}

export default function SearchPage() {
    const [showFilters, setShowFilters] = useState(false)

    return (
        <div className="container mx-auto px-4 py-16">
            <InstantSearch searchClient={searchClient} indexName="ai_tools">
                <Configure hitsPerPage={12} />

                {/* Header */}
                <div className="mb-8">
                    <h1 className="mb-2 text-4xl font-bold text-white">Search AI Tools</h1>
                    <p className="text-gray-400">
                        Instantly search through 3,690+ AI tools with powerful filters
                    </p>
                </div>

                {/* Search Box */}
                <div className="mb-8">
                    <SearchBox
                        classNames={{
                            root: 'w-full',
                            form: 'w-full',
                            input: 'w-full rounded-lg border border-white/10 bg-gray-800 px-6 py-4 pr-12 text-white placeholder-gray-500 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20',
                            submit: 'hidden',
                            reset: 'hidden',
                        }}
                        placeholder="Search for AI tools..."
                    />
                </div>

                <div className="flex flex-col gap-8 lg:flex-row">
                    {/* Filters Sidebar */}
                    <aside
                        className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}
                    >
                        <div className="space-y-6">
                            {/* Pricing Filter */}
                            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                                <h3 className="mb-4 font-semibold text-white">Pricing</h3>
                                <RefinementList
                                    attribute="pricing.type"
                                    classNames={{
                                        root: 'space-y-2',
                                        list: 'space-y-2',
                                        item: 'flex items-center',
                                        label: 'flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white',
                                        checkbox: 'h-4 w-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-600',
                                        count: 'ml-auto text-xs text-gray-500',
                                    }}
                                />
                            </div>

                            {/* Featured Filter */}
                            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                                <h3 className="mb-4 font-semibold text-white">Featured</h3>
                                <RefinementList
                                    attribute="isFeatured"
                                    classNames={{
                                        root: 'space-y-2',
                                        list: 'space-y-2',
                                        item: 'flex items-center',
                                        label: 'flex items-center space-x-2 text-sm text-gray-300 cursor-pointer hover:text-white',
                                        checkbox: 'h-4 w-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-600',
                                        count: 'ml-auto text-xs text-gray-500',
                                    }}
                                />
                            </div>
                        </div>
                    </aside>

                    {/* Results */}
                    <div className="flex-1">
                        {/* Mobile Filter Toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="mb-4 flex items-center space-x-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10 lg:hidden"
                        >
                            <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                                />
                            </svg>
                            <span>Filters</span>
                        </button>

                        {/* Hits */}
                        <Hits
                            hitComponent={Hit}
                            classNames={{
                                root: 'mb-8',
                                list: 'grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3',
                                item: '',
                            }}
                        />

                        {/* No Results */}
                        <div className="ais-Hits">
                            <div className="ais-Hits-list">
                                <NoResults />
                            </div>
                        </div>

                        {/* Pagination */}
                        <Pagination
                            classNames={{
                                root: 'flex items-center justify-center space-x-2',
                                list: 'flex items-center space-x-2',
                                item: '',
                                link: 'flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white',
                                selectedItem: 'bg-purple-600 text-white',
                                disabledItem: 'opacity-50 cursor-not-allowed',
                            }}
                        />
                    </div>
                </div>
            </InstantSearch>
        </div>
    )
}
