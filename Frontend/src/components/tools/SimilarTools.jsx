/**
 * SimilarTools.jsx — Phase 4.2
 *
 * Upgraded from a flat grid to a 4-bucket tabbed layout:
 *   1. "Also Viewed"     — collaborative filter (co-click graph)
 *   2. "Pairs Well With" — complementary tools (AI tag-matching)
 *   3. "Alternatives"    — same category, different pricing/approach
 *   4. "Cheaper Options" — lower-cost tools for same use-case
 *
 * Props:
 *   relatedBuckets   { alsoViewed[], pairsWellWith[], alternatives[], cheaperOptions[] }
 *   tools            flat fallback array (backwards compat)
 *   currentToolSlug  string  used for Compare links
 *   toolName         string  used in section heading
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    Star, ArrowRight, Eye, Zap, GitCompare, DollarSign,
    ArrowUpRight, ExternalLink
} from 'lucide-react'

const TABS = [
    {
        id: 'alsoViewed',
        label: 'Also Viewed',
        icon: Eye,
        emptyText: 'No co-viewed tools yet.',
    },
    {
        id: 'pairsWellWith',
        label: 'Pairs Well With',
        icon: Zap,
        emptyText: 'No pairings yet — check back after enrichment.',
    },
    {
        id: 'alternatives',
        label: 'Alternatives',
        icon: GitCompare,
        emptyText: 'No alternatives found yet.',
    },
    {
        id: 'cheaperOptions',
        label: 'Cheaper Options',
        icon: DollarSign,
        emptyText: 'No cheaper alternatives on record yet.',
    },
]

const PRICING_COLORS = {
    Free: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    Freemium: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    Paid: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    Trial: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
}

function ToolMiniCard({ tool, currentToolSlug }) {
    const navigate = useNavigate()
    const logoSrc = tool.logo || tool.metadata?.logo || ''
    const pricingStyle = PRICING_COLORS[tool.pricing] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '')

    return (
        <div
            onClick={() => navigate(`/tools/${tool.slug}`)}
            className="group relative flex gap-3 rounded-xl border border-white/8 bg-white/3 p-4 cursor-pointer transition-all duration-200 hover:border-purple-500/30 hover:bg-white/5 hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-0.5"
        >
            {/* Logo */}
            <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gray-900 border border-white/10 overflow-hidden">
                {logoSrc ? (
                    <img
                        src={logoSrc}
                        alt={`${tool.name} logo`}
                        className="h-full w-full object-cover"
                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none' }}
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm font-bold text-white/40 bg-gradient-to-br from-purple-500/20 to-blue-600/20">
                        {tool.name?.charAt(0)?.toUpperCase()}
                    </div>
                )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h3 title={tool.name} className="truncate text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {tool.name}
                    </h3>
                    {tool.ratings?.average > 0 && (
                        <div className="flex items-center gap-0.5 text-xs text-amber-400 flex-shrink-0">
                            <Star className="h-3 w-3 fill-current" />
                            <span>{tool.ratings.average.toFixed(1)}</span>
                        </div>
                    )}
                </div>

                <p className="line-clamp-2 text-xs text-gray-500 group-hover:text-gray-400 transition-colors mb-2">
                    {tool.shortDescription}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Pricing badge */}
                    {tool.pricing && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${pricingStyle}`}>
                            {tool.pricing}
                        </span>
                    )}

                    {/* Compare link - hidden until launch
                    {currentToolSlug && (
                        <Link
                            to={`/compare/${currentToolSlug}-vs-${tool.slug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-400 hover:text-purple-300 transition-colors"
                        >
                            Compare <ArrowRight size={10} />
                        </Link>
                    )}
                    */}

                    {/* Visit link */}
                    <a
                        href={`${apiBase}/api/v1/tools/slug/${tool.slug}/visit?source=related_tools`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="ml-auto inline-flex items-center gap-0.5 text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
                    >
                        <ExternalLink size={10} />
                    </a>
                </div>
            </div>
        </div>
    )
}

export default function SimilarTools({ relatedBuckets, tools, currentToolSlug, toolName }) {
    // Normalise: if old flat array passed, put it into alsoViewed
    const buckets = relatedBuckets ?? {
        alsoViewed: Array.isArray(tools) ? tools : [],
        pairsWellWith: [],
        alternatives: [],
        cheaperOptions: [],
    }

    // Find first tab that has data to default to
    const firstTabWithData = TABS.find(t => buckets[t.id]?.length > 0)
    const [activeTab, setActiveTab] = useState(firstTabWithData?.id || 'alsoViewed')

    const totalCount = Object.values(buckets).flat().length

    // Nothing to show at all
    if (totalCount === 0) return null

    const currentBucket = buckets[activeTab] || []
    const activeTabDef = TABS.find(t => t.id === activeTab)

    return (
        <section className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-bold text-white">
                        {toolName ? `More like ${toolName}` : 'Related Tools'}
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                        Discover tools used alongside, compared with, or as alternatives to this one.
                    </p>
                </div>
                {currentToolSlug && (
                    <Link
                        to={`/alternatives/${currentToolSlug}`}
                        className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors border border-purple-500/20 bg-purple-500/5 px-3 py-1.5 rounded-lg"
                    >
                        See all alternatives <ArrowUpRight size={12} />
                    </Link>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {TABS.map(tab => {
                    const Icon = tab.icon
                    const count = buckets[tab.id]?.length || 0
                    const isActive = activeTab === tab.id

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            disabled={count === 0}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 border
                                ${isActive
                                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
                                    : count === 0
                                        ? 'text-gray-700 border-transparent opacity-40 cursor-not-allowed'
                                        : 'text-gray-400 border-white/6 bg-white/3 hover:text-white hover:bg-white/8'
                                }`}
                        >
                            <Icon size={12} />
                            {tab.label}
                            {count > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-purple-500/30 text-purple-200' : 'bg-white/8 text-gray-500'}`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Content grid */}
            {currentBucket.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-600">
                    {activeTabDef?.emptyText}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {currentBucket.map(tool => (
                        <ToolMiniCard
                            key={tool._id || tool.slug}
                            tool={tool}
                            currentToolSlug={currentToolSlug}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}
