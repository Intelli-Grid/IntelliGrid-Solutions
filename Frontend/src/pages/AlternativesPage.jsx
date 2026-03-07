/**
 * AlternativesPage.jsx
 * Route: /alternatives/:toolName  (e.g. /alternatives/chatgpt)
 *
 * Programmatic SEO page: "Best {ToolName} Alternatives in 2026"
 * Uses the real /api/v1/tools/alternatives/:toolName endpoint which
 * queries the `alternativeTo` enrichment field populated by Groq AI.
 *
 * Each page creates a unique, indexable URL capturing high-intent search traffic.
 */
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import SEO from '../components/common/SEO'
import {
    ArrowUpRight, Star, ExternalLink, ChevronRight, Search,
    Zap, Shield, DollarSign, TrendingUp, Filter
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '')
const VISIT_URL = (slug) => `${API_URL}/api/v1/tools/slug/${slug}/visit?source=alternatives_page`

const PRICING_STYLE = {
    Free: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    Freemium: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    Paid: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    Trial: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
}

// Top popular tools for quick navigation
const POPULAR_ALTERNATIVES = [
    'ChatGPT', 'Midjourney', 'Canva', 'Grammarly', 'Jasper',
    'Copy.ai', 'Claude', 'Notion AI', 'Runway', 'ElevenLabs'
]

function AlternativeCard({ tool, rank }) {
    const rating = tool.ratings?.average ?? 0
    const reviewCount = tool.ratings?.count ?? 0
    const pricingStyle = PRICING_STYLE[tool.pricing] || 'bg-gray-500/10 text-gray-400 border border-gray-500/20'

    return (
        <div className="group relative flex gap-4 rounded-2xl border border-white/8 bg-[#0c0c0c] p-5 transition-all duration-200 hover:border-purple-500/25 hover:bg-purple-500/3 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-500/5">
            {/* Rank */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/5 text-sm font-bold text-gray-500 border border-white/5">
                #{rank}
            </div>

            {/* Logo */}
            <div className="flex-shrink-0 h-12 w-12 rounded-xl border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center">
                {tool.logo ? (
                    <img
                        src={tool.logo}
                        alt={`${tool.name} logo`}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                ) : (
                    <span className="text-lg font-black text-white/20">{tool.name?.charAt(0)}</span>
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                        <Link
                            to={`/tools/${tool.slug}`}
                            className="font-semibold text-white hover:text-purple-300 transition-colors"
                        >
                            {tool.name}
                        </Link>
                        {rating > 0 && (
                            <div className="mt-0.5 flex items-center gap-1">
                                <Star size={11} className="fill-amber-400 text-amber-400" />
                                <span className="text-xs text-gray-400">
                                    {rating.toFixed(1)}
                                    {reviewCount > 0 && ` (${reviewCount.toLocaleString()} reviews)`}
                                </span>
                            </div>
                        )}
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${pricingStyle}`}>
                        {tool.pricing || 'Unknown'}
                    </span>
                </div>

                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">
                    {tool.shortDescription || tool.longDescription?.slice(0, 150)}
                </p>

                {/* Key features */}
                {tool.keyFeatures?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                        {tool.keyFeatures.slice(0, 3).map((f, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/4 text-gray-500 border border-white/5">
                                {f}
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex gap-3 items-center">
                    <Link
                        to={`/tools/${tool.slug}`}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium"
                    >
                        View details →
                    </Link>
                    <a
                        href={VISIT_URL(tool.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
                    >
                        <ExternalLink size={11} />
                        Visit site
                    </a>
                    <Link
                        to={`/compare/${tool.slug}-vs-${tool.slug}`}
                        className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                    >
                        Compare
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function AlternativesPage() {
    const { toolName } = useParams()
    const [alternatives, setAlternatives] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [pricingFilter, setPricingFilter] = useState('')
    const [total, setTotal] = useState(0)

    const displayName = toolName
        ? toolName.charAt(0).toUpperCase() + toolName.slice(1).replace(/-/g, ' ')
        : ''

    useEffect(() => {
        if (!toolName) return
        setLoading(true)
        setError(null)

        async function fetchData() {
            try {
                const params = new URLSearchParams({ limit: '24' })
                if (pricingFilter) params.set('pricing', pricingFilter)

                const res = await fetch(
                    `${API_URL}/api/v1/tools/alternatives/${encodeURIComponent(toolName)}?${params}`
                )
                if (!res.ok) throw new Error('Failed to fetch alternatives')
                const json = await res.json()
                // ApiResponse structure: { data: { tools, pagination, targetTool } }
                const payload = json?.data || json
                setAlternatives(payload?.tools || [])
                setTotal(payload?.pagination?.total || payload?.tools?.length || 0)
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [toolName, pricingFilter])

    const year = new Date().getFullYear()
    const canonicalUrl = `https://www.intelligrid.online/alternatives/${toolName}`
    const pageTitle = `Best ${displayName} Alternatives in ${year} — Free & Paid | IntelliGrid`
    const pageDesc = `Looking for the best ${displayName} alternatives? We've curated ${total || 'top-rated'} alternatives to ${displayName} with pricing, features, and real reviews. Find your perfect fit.`

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <LoadingSpinner text={`Finding ${displayName} alternatives...`} />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
                <Search size={32} className="text-gray-700" />
                <p className="text-gray-400">Couldn't load alternatives for <strong className="text-white">{displayName}</strong>.</p>
                <Link to="/tools" className="text-sm text-purple-400 hover:text-purple-300">Browse all tools →</Link>
            </div>
        )
    }

    return (
        <>
            <SEO
                title={pageTitle}
                description={pageDesc}
                canonicalUrl={canonicalUrl}
                keywords={`${displayName} alternatives, best ${displayName} alternatives, ${displayName} competitors, tools like ${displayName}, ${displayName} replacement`}
                structuredData={{
                    '@context': 'https://schema.org',
                    '@type': 'ItemList',
                    name: pageTitle,
                    description: pageDesc,
                    url: canonicalUrl,
                    numberOfItems: alternatives.length,
                    itemListElement: alternatives.slice(0, 10).map((t, i) => ({
                        '@type': 'ListItem',
                        position: i + 1,
                        name: t.name,
                        url: `https://www.intelligrid.online/tools/${t.slug}`,
                    })),
                }}
            />

            <div className="min-h-screen bg-[#09090b]">
                {/* Hero */}
                <section className="border-b border-white/6 bg-gradient-to-b from-[#0c0c14] to-[#09090b] px-4 py-14">
                    <div className="mx-auto max-w-4xl">
                        {/* Breadcrumb */}
                        <nav className="mb-6 flex items-center gap-1.5 text-xs text-gray-600">
                            <Link to="/" className="hover:text-gray-400 transition-colors">IntelliGrid</Link>
                            <ChevronRight size={12} />
                            <Link to="/tools" className="hover:text-gray-400 transition-colors">Tools</Link>
                            <ChevronRight size={12} />
                            <span className="text-gray-400">Alternatives to {displayName}</span>
                        </nav>

                        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-xs font-medium text-purple-400">
                            <Zap size={11} />
                            {total > 0 ? `${total} alternatives found` : 'Curated alternatives'}
                        </div>

                        <h1 className="text-3xl font-extrabold text-white md:text-5xl mb-3 tracking-tight">
                            Best <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">{displayName}</span> Alternatives
                            <span className="ml-3 text-2xl font-normal text-gray-600">in {year}</span>
                        </h1>
                        <p className="max-w-2xl text-gray-400 leading-relaxed text-base">
                            Whether you need a cheaper option, different features, or a better fit for your workflow —
                            here are the <strong className="text-white">{alternatives.length} best alternatives to {displayName}</strong> with
                            real ratings and transparent pricing.
                        </p>

                        {/* Pricing filter pills */}
                        <div className="mt-6 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-600 flex items-center gap-1"><Filter size={11} /> Filter:</span>
                            {['', 'Free', 'Freemium', 'Paid', 'Trial'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPricingFilter(p)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${pricingFilter === p
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/8'
                                        }`}
                                >
                                    {p || 'All'}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Benefit pills */}
                <div className="border-b border-white/6 bg-black/20 px-4 py-3">
                    <div className="mx-auto max-w-4xl flex gap-6 flex-wrap">
                        {[
                            { icon: Shield, text: 'Human-verified listings' },
                            { icon: Star, text: 'Real user reviews' },
                            { icon: DollarSign, text: 'Transparent pricing' },
                            { icon: TrendingUp, text: 'Updated weekly' },
                        ].map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Icon size={12} className="text-purple-500" />
                                {text}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Alternatives list */}
                <section className="mx-auto max-w-4xl px-4 py-10">
                    {alternatives.length === 0 ? (
                        <div className="py-20 text-center">
                            <Search size={36} className="mx-auto mb-4 text-gray-700" />
                            <p className="text-gray-500 mb-2">No alternatives found yet for <strong className="text-white">{displayName}</strong>.</p>
                            <p className="text-xs text-gray-600 mb-4">Our AI enrichment pipeline is still processing tools. Check back soon.</p>
                            <Link to="/tools" className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 transition-colors">
                                Browse all tools <ArrowUpRight size={14} />
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {alternatives.map((tool, i) => (
                                <AlternativeCard key={tool._id || tool.slug} tool={tool} rank={i + 1} />
                            ))}
                        </div>
                    )}

                    {/* Compare CTA */}
                    {alternatives.length >= 2 && (
                        <div className="mt-10 rounded-2xl border border-purple-500/15 bg-purple-500/5 p-6 text-center">
                            <p className="font-semibold text-white mb-1">Can't decide?</p>
                            <p className="text-sm text-gray-400 mb-4">
                                Compare {displayName} side-by-side with any alternative.
                            </p>
                            <Link
                                to={`/compare/${toolName}-vs-${alternatives[0].slug}`}
                                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 transition-colors"
                            >
                                Compare {displayName} vs {alternatives[0].name}
                                <ArrowUpRight size={14} />
                            </Link>
                        </div>
                    )}

                    {/* Popular alternative pages */}
                    <div className="mt-12 border-t border-white/6 pt-8">
                        <h3 className="mb-4 text-sm font-semibold text-gray-400">Popular alternatives pages</h3>
                        <div className="flex flex-wrap gap-2">
                            {POPULAR_ALTERNATIVES
                                .filter(n => n.toLowerCase() !== toolName?.toLowerCase())
                                .map(name => (
                                    <Link
                                        key={name}
                                        to={`/alternatives/${name.toLowerCase().replace(/\s+/g, '-')}`}
                                        className="rounded-lg border border-white/8 bg-white/2 px-3 py-1.5 text-xs text-gray-400 hover:border-purple-500/20 hover:text-purple-300 transition-all"
                                    >
                                        {name} alternatives
                                    </Link>
                                ))}
                        </div>
                    </div>
                </section>
            </div>
        </>
    )
}
