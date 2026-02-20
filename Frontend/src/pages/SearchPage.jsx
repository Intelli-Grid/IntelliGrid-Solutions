import { useState } from 'react'
import {
    InstantSearch, SearchBox, Hits, Pagination,
    RefinementList, Configure, useInstantSearch
} from 'react-instantsearch'
import algoliasearch from 'algoliasearch/lite'
import { Link } from 'react-router-dom'
import { Star, ExternalLink, Sparkles, SlidersHorizontal, X, ArrowUpRight } from 'lucide-react'
import { getPricingDisplay, getInitials } from '../utils/helpers'
import SEO from '../components/common/SEO'

// Initialize Algolia client
const searchClient = algoliasearch(
    import.meta.env.VITE_ALGOLIA_APP_ID,
    import.meta.env.VITE_ALGOLIA_SEARCH_KEY
)

const PRICING_COLORS = {
    Free: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    Freemium: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    Paid: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    Trial: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    Contact: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
}

// Individual search result hit card
function Hit({ hit }) {
    const logoSrc = hit.logo || hit.metadata?.logo || ''
    const [imgErr, setImgErr] = useState(false)
    const pricing = getPricingDisplay(hit.pricing)
    const pricingClass = PRICING_COLORS[pricing] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    const rating = hit.ratings?.average

    return (
        <Link
            to={`/tools/${hit.slug}`}
            className="group flex items-start gap-4 p-4 rounded-xl bg-[#0d0d0d] border border-white/8 hover:border-purple-500/30 hover:bg-white/3 transition-all duration-200"
        >
            {/* Logo */}
            <div className="flex-shrink-0 h-12 w-12 rounded-xl overflow-hidden border border-white/10 bg-white/5">
                {logoSrc && !imgErr ? (
                    <img
                        src={logoSrc}
                        alt={hit.name}
                        className="h-full w-full object-cover"
                        onError={() => setImgErr(true)}
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm font-bold text-white/30 bg-gradient-to-br from-purple-500/20 to-blue-600/20">
                        {getInitials(hit.name)}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                        {hit.name}
                    </span>
                    {hit.isFeatured && (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                            <Sparkles size={8} /> Featured
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">{hit.shortDescription}</p>

                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${pricingClass}`}>
                        {pricing}
                    </span>
                    {rating > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                            <Star size={9} className="fill-current" /> {rating.toFixed(1)}
                        </span>
                    )}
                    {hit.tags?.slice(0, 2).map((tag, i) => (
                        <span key={i} className="text-[10px] text-gray-600 bg-white/3 border border-white/5 px-1.5 py-0.5 rounded">
                            #{tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* Visit */}
            <div className="flex-shrink-0 mt-0.5">
                <span className="flex items-center gap-1 text-[11px] text-gray-500 group-hover:text-purple-400 transition-colors font-medium">
                    View <ArrowUpRight size={11} />
                </span>
            </div>
        </Link>
    )
}

function NoResults() {
    return (
        <div className="py-20 text-center">
            <div className="mx-auto mb-4 h-14 w-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/8">
                <SlidersHorizontal className="h-6 w-6 text-gray-600" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">No results found</h3>
            <p className="text-sm text-gray-600">Try different keywords or remove some filters</p>
        </div>
    )
}

function SearchResults() {
    const { results } = useInstantSearch()

    if (!results?.__isArtificial && results?.nbHits === 0) {
        return <NoResults />
    }

    return (
        <Hits
            hitComponent={Hit}
            classNames={{
                root: 'mb-8',
                list: 'flex flex-col gap-2',
                item: '',
            }}
        />
    )
}

export default function SearchPage() {
    const [showFilters, setShowFilters] = useState(false)

    return (
        <div className="min-h-screen bg-gray-950">
            <SEO
                title="Search AI Tools - IntelliGrid"
                description="Instantly search 4,000+ curated AI tools. Filter by pricing, category, and features."
                canonicalUrl="https://www.intelligrid.online/search"
                noindex={true}
            />

            {/* Page header */}
            <div className="border-b border-white/5 bg-[#0c0c14] py-10 px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-3xl font-extrabold text-white mb-1.5 tracking-tight">Search AI Tools</h1>
                    <p className="text-sm text-gray-500">Powered by Algolia — results update as you type</p>
                </div>
            </div>

            <InstantSearch searchClient={searchClient} indexName="intelligrid_tools">
                <Configure hitsPerPage={20} />

                {/* Search Box */}
                <div className="bg-[#0c0c14] border-b border-white/5 px-4 pb-4">
                    <div className="max-w-3xl mx-auto">
                        <SearchBox
                            classNames={{
                                root: 'w-full',
                                form: 'relative',
                                input: 'w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 pr-24 text-sm text-white placeholder-gray-600 focus:border-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-500/15 focus:bg-white/7 transition-all',
                                submit: 'absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition-colors',
                                submitIcon: 'hidden',
                                reset: 'absolute right-20 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors p-1',
                                resetIcon: 'hidden',
                            }}
                            placeholder="Type to search — e.g. 'image generation', 'chatbot'..."
                            submitIconComponent={() => <span className="text-xs font-semibold">Search</span>}
                            resetIconComponent={() => <X size={13} />}
                        />
                    </div>
                </div>

                {/* Layout */}
                <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col lg:flex-row gap-6">

                    {/* ── Sidebar Filters ── */}
                    <aside className={`lg:w-56 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                        <div className="sticky top-20 space-y-4">
                            {/* Pricing */}
                            <div className="rounded-xl border border-white/8 bg-[#0d0d0d] p-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Pricing</h3>
                                <RefinementList
                                    attribute="pricing"
                                    classNames={{
                                        root: 'space-y-1.5',
                                        list: 'space-y-1.5',
                                        item: 'flex items-center',
                                        label: 'flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-white transition-colors w-full',
                                        checkbox: 'h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-600 accent-purple-500',
                                        count: 'ml-auto text-[10px] text-gray-600',
                                    }}
                                />
                            </div>

                            {/* Featured */}
                            <div className="rounded-xl border border-white/8 bg-[#0d0d0d] p-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Featured</h3>
                                <RefinementList
                                    attribute="isFeatured"
                                    classNames={{
                                        root: 'space-y-1.5',
                                        list: 'space-y-1.5',
                                        item: 'flex items-center',
                                        label: 'flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-white transition-colors w-full',
                                        checkbox: 'h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-600 accent-purple-500',
                                        count: 'ml-auto text-[10px] text-gray-600',
                                    }}
                                />
                            </div>

                            <div className="rounded-xl border border-white/8 bg-[#0d0d0d] p-4">
                                <p className="text-[10px] text-gray-600 leading-relaxed">
                                    Can't find what you need? Try{' '}
                                    <Link to="/tools" className="text-purple-400 hover:text-purple-300">browsing all tools</Link>{' '}
                                    and using the category & sort filters.
                                </p>
                            </div>
                        </div>
                    </aside>

                    {/* ── Results ── */}
                    <div className="flex-1 min-w-0">
                        {/* Mobile filter toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="mb-4 flex items-center gap-2 rounded-xl bg-white/5 border border-white/8 px-3 py-2 text-xs text-gray-400 hover:text-white transition-colors lg:hidden"
                        >
                            <SlidersHorizontal size={13} />
                            {showFilters ? 'Hide Filters' : 'Show Filters'}
                        </button>

                        <SearchResults />

                        {/* Pagination */}
                        <Pagination
                            classNames={{
                                root: 'flex items-center justify-center gap-1.5 pt-6',
                                list: 'flex items-center gap-1.5',
                                item: '',
                                link: 'flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-xs text-gray-400 transition hover:bg-white/10 hover:text-white border border-white/5',
                                selectedItem: '[&>a]:bg-purple-600 [&>a]:border-purple-600 [&>a]:text-white',
                                disabledItem: '[&>a]:opacity-30 [&>a]:cursor-not-allowed',
                            }}
                        />
                    </div>
                </div>
            </InstantSearch>
        </div>
    )
}
