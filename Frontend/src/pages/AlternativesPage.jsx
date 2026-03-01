/**
 * AlternativesPage.jsx
 * Route: /alternatives/:toolSlug
 *
 * Programmatic SEO page: "Best {ToolName} Alternatives in 2026"
 * Fetches the target tool + tools in the same category, sorted by rating.
 * Each page creates a unique, indexable URL capturing high-intent search traffic.
 */
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowUpRight, Star, ExternalLink, ChevronRight, Search } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { toolService } from '../services'

const API_URL = import.meta.env.VITE_API_URL || ''

const VISIT_URL = (slug) => `${API_URL}/api/v1/tools/slug/${slug}/visit?source=alternatives_page`

function AlternativeCard({ tool, rank }) {
    const rating = tool.ratings?.average ?? 0
    const reviewCount = tool.ratings?.count ?? 0

    return (
        <div className="group relative flex gap-5 rounded-2xl border border-white/8 bg-white/2 p-5 transition-all hover:border-purple-500/20 hover:bg-purple-500/3">
            {/* Rank badge */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/5 text-sm font-bold text-gray-500">
                #{rank}
            </div>

            {/* Logo */}
            {tool.logo && (
                <img
                    src={tool.logo}
                    alt={`${tool.name} logo`}
                    className="h-12 w-12 flex-shrink-0 rounded-xl border border-white/10 object-contain bg-white/5 p-1"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
            )}

            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <Link
                            to={`/tools/${tool.slug}`}
                            className="font-semibold text-white hover:text-purple-300 transition-colors"
                        >
                            {tool.name}
                        </Link>
                        {/* Rating */}
                        {rating > 0 && (
                            <div className="mt-0.5 flex items-center gap-1">
                                <Star size={11} className="fill-amber-400 text-amber-400" />
                                <span className="text-xs text-gray-400">
                                    {rating.toFixed(1)} ({reviewCount.toLocaleString()})
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${tool.pricing === 'Free' ? 'bg-emerald-500/10 text-emerald-400' :
                                tool.pricing === 'Freemium' ? 'bg-blue-500/10 text-blue-400' :
                                    'bg-gray-500/10 text-gray-400'
                            }`}>
                            {tool.pricing || 'Unknown'}
                        </span>
                    </div>
                </div>
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed line-clamp-2">
                    {tool.shortDescription}
                </p>
                <div className="mt-3 flex gap-3">
                    <Link
                        to={`/tools/${tool.slug}`}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
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
                </div>
            </div>
        </div>
    )
}

export default function AlternativesPage() {
    const { toolSlug } = useParams()
    const [targetTool, setTargetTool] = useState(null)
    const [alternatives, setAlternatives] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!toolSlug) return
        setLoading(true)
        setError(null)

        async function fetchData() {
            try {
                // Fetch the target tool
                const toolData = await toolService.getToolBySlug(toolSlug)
                const tool = toolData?.tool || toolData
                if (!tool) throw new Error('Tool not found')
                setTargetTool(tool)

                // Fetch related tools (same category) — reuse the related tools endpoint
                const API = import.meta.env.VITE_API_URL || ''
                const res = await fetch(`${API}/api/v1/tools/${tool._id}/related?limit=12`)
                if (!res.ok) throw new Error('Failed to fetch alternatives')
                const data = await res.json()
                // Filter out the tool itself
                const alts = (data.tools || data.relatedTools || []).filter(
                    (t) => t.slug !== toolSlug && t._id !== tool._id
                )
                setAlternatives(alts)
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [toolSlug])

    const year = new Date().getFullYear()
    const toolName = targetTool?.name || toolSlug

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <LoadingSpinner text="Finding alternatives..." />
            </div>
        )
    }

    if (error || !targetTool) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
                <Search size={32} className="text-gray-700" />
                <p className="text-gray-400">Couldn't load alternatives for <strong className="text-white">{toolSlug}</strong>.</p>
                <Link to="/tools" className="text-sm text-purple-400 hover:text-purple-300">
                    Browse all tools →
                </Link>
            </div>
        )
    }

    const canonicalUrl = `https://www.intelligrid.online/alternatives/${toolSlug}`
    const pageTitle = `Best ${toolName} Alternatives in ${year} — IntelliGrid`
    const pageDesc = `Looking for the best ${toolName} alternatives? We've compiled ${alternatives.length}+ top-rated alternatives to ${toolName} with pricing, features, and real user reviews.`

    return (
        <>
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDesc} />
                <link rel="canonical" href={canonicalUrl} />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDesc} />
                <meta property="og:url" content={canonicalUrl} />
                <script type="application/ld+json">{JSON.stringify({
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
                })}</script>
            </Helmet>

            <div className="min-h-screen bg-black">
                {/* Hero */}
                <section className="border-b border-white/8 bg-black/50 px-4 py-14">
                    <div className="mx-auto max-w-4xl">
                        {/* Breadcrumb */}
                        <nav className="mb-6 flex items-center gap-1.5 text-xs text-gray-600">
                            <Link to="/" className="hover:text-gray-400 transition-colors">IntelliGrid</Link>
                            <ChevronRight size={12} />
                            <Link to="/tools" className="hover:text-gray-400 transition-colors">Tools</Link>
                            <ChevronRight size={12} />
                            <Link to={`/tools/${toolSlug}`} className="hover:text-gray-400 transition-colors">{toolName}</Link>
                            <ChevronRight size={12} />
                            <span className="text-gray-400">Alternatives</span>
                        </nav>

                        {/* Target tool reference */}
                        <div className="mb-6 flex items-center gap-3">
                            {targetTool.logo && (
                                <img
                                    src={targetTool.logo}
                                    alt={`${toolName} logo`}
                                    className="h-14 w-14 rounded-xl border border-white/10 object-contain bg-white/5 p-1.5 flex-shrink-0"
                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                            )}
                            <div>
                                <h1 className="text-3xl font-bold text-white md:text-4xl">
                                    Best {toolName} Alternatives{' '}
                                    <span className="text-gray-500 text-2xl font-normal">in {year}</span>
                                </h1>
                                <p className="mt-1.5 text-gray-400 text-sm">
                                    {alternatives.length} alternatives · sorted by rating · all independently reviewed
                                </p>
                            </div>
                        </div>

                        {/* Description */}
                        <p className="max-w-2xl text-gray-400 leading-relaxed">
                            Looking for a {toolName} alternative? Whether you need a cheaper option, different features,
                            or a better fit for your workflow — below are the{' '}
                            <strong className="text-white">{alternatives.length} best alternatives</strong>{' '}
                            with real ratings and pricing information.
                        </p>
                    </div>
                </section>

                {/* Alternatives list */}
                <section className="mx-auto max-w-4xl px-4 py-12">
                    {alternatives.length === 0 ? (
                        <div className="py-20 text-center">
                            <p className="text-gray-500">No alternatives found yet for {toolName}.</p>
                            <Link
                                to="/tools"
                                className="mt-4 inline-block text-sm text-purple-400 hover:text-purple-300"
                            >
                                Browse all tools →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {alternatives.map((tool, i) => (
                                <AlternativeCard key={tool._id || tool.slug} tool={tool} rank={i + 1} />
                            ))}
                        </div>
                    )}

                    {/* Compare CTA */}
                    {alternatives.length >= 2 && (
                        <div className="mt-10 rounded-2xl border border-purple-500/15 bg-purple-500/5 p-6 text-center">
                            <p className="font-semibold text-white mb-2">Can't decide?</p>
                            <p className="text-sm text-gray-400 mb-4">
                                Compare {toolName} side-by-side with any of its alternatives.
                            </p>
                            <Link
                                to={`/compare/${toolSlug}-vs-${alternatives[0].slug}`}
                                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 transition-colors"
                            >
                                Compare {toolName} vs {alternatives[0].name}
                                <ArrowUpRight size={14} />
                            </Link>
                        </div>
                    )}
                </section>
            </div>
        </>
    )
}
