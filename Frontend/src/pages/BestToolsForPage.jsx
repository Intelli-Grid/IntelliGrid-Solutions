/**
 * BestToolsForPage.jsx
 * Route: /best-tools/:role  (e.g. /best-tools/writers)
 *        /best-ai-tools-for/:useCase  (e.g. /best-ai-tools-for/writing)
 *
 * Programmatic SEO page: "Best AI Tools for {Role/UseCase} in 2026"
 * Uses the real /api/v1/tools/use-case/:tag endpoint which queries
 * the `useCaseTags` enrichment field populated by Groq AI.
 */
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
    Star, ExternalLink, ChevronRight, Briefcase, ArrowRight,
    Filter, Zap, ArrowUpRight, Shield
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '')

const PRICING_COLORS = {
    Free: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    Freemium: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    Paid: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    Trial: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
}

// Role → useCaseTag mapping + metadata for each SEO page
const ROLE_DEFINITIONS = {
    'developers': {
        label: 'Developers & Engineers',
        useCaseTag: 'coding',
        description: 'The best AI tools for software developers, from code completion to debugging and documentation.',
        icon: '💻',
    },
    'marketers': {
        label: 'Marketers',
        useCaseTag: 'marketing',
        description: 'Top AI marketing tools to write copy faster, analyze campaigns, and automate outreach.',
        icon: '📣',
    },
    'designers': {
        label: 'Designers',
        useCaseTag: 'design',
        description: 'AI tools for designers — from image generation to UI mockups and brand asset creation.',
        icon: '🎨',
    },
    'writers': {
        label: 'Writers & Content Creators',
        useCaseTag: 'writing',
        description: 'The best AI writing tools to draft, edit, and publish content faster without losing your voice.',
        icon: '✍️',
    },
    'founders': {
        label: 'Founders & Entrepreneurs',
        useCaseTag: 'productivity',
        description: 'AI tools that help founders move faster — from fundraising pitch decks to customer research.',
        icon: '🚀',
    },
    'students': {
        label: 'Students',
        useCaseTag: 'education',
        description: 'AI tools for students to study smarter, write better essays, and understand complex topics.',
        icon: '🎓',
    },
    'researchers': {
        label: 'Researchers',
        useCaseTag: 'research',
        description: 'AI research tools for literature reviews, data analysis, and knowledge synthesis.',
        icon: '🔬',
    },
    'sales-teams': {
        label: 'Sales Teams',
        useCaseTag: 'sales',
        description: 'The best AI sales tools to prospect, personalize outreach, and close deals faster.',
        icon: '💼',
    },
    'product-managers': {
        label: 'Product Managers',
        useCaseTag: 'product management',
        description: 'AI tools for PMs to build better products — from user research to writing PRDs.',
        icon: '📋',
    },
    'customer-success': {
        label: 'Customer Success Teams',
        useCaseTag: 'customer support',
        description: 'AI customer success tools for support automation, ticket resolution, and retention.',
        icon: '🤝',
    },
    'video-creators': {
        label: 'Video Creators',
        useCaseTag: 'video',
        description: 'AI video tools for creators — auto-captions, editing, thumbnail generation, and more.',
        icon: '🎬',
    },
    'podcasters': {
        label: 'Podcasters',
        useCaseTag: 'audio',
        description: 'The best AI tools for podcasters to transcribe, edit, promote, and grow their show.',
        icon: '🎙️',
    },
    'educators': {
        label: 'Educators & Teachers',
        useCaseTag: 'education',
        description: 'AI tools for educators to create lesson plans, assessments, and personalized learning materials.',
        icon: '📚',
    },
    'hr-teams': {
        label: 'HR Teams',
        useCaseTag: 'recruiting',
        description: 'AI HR tools for recruiting, resume screening, employee onboarding, and performance reviews.',
        icon: '👥',
    },
    'lawyers': {
        label: 'Legal Professionals',
        useCaseTag: 'legal',
        description: 'AI tools for lawyers to review contracts, research case law, and draft legal documents.',
        icon: '⚖️',
    },
    'finance-teams': {
        label: 'Finance Teams',
        useCaseTag: 'finance',
        description: 'AI finance tools for forecasting, analysis, reporting, and automating accounting workflows.',
        icon: '📊',
    },
    'data-analysts': {
        label: 'Data Analysts',
        useCaseTag: 'data analysis',
        description: 'The best AI data tools for analysts — from natural language SQL to automated dashboards.',
        icon: '🔢',
    },
    'healthcare': {
        label: 'Healthcare Professionals',
        useCaseTag: 'healthcare',
        description: 'AI tools for healthcare professionals — from clinical documentation to medical research.',
        icon: '🏥',
    },
    'real-estate': {
        label: 'Real Estate Professionals',
        useCaseTag: 'real estate',
        description: 'AI real estate tools for writing listings, generating leads, and analyzing markets.',
        icon: '🏠',
    },
    'ecommerce': {
        label: 'E-Commerce Sellers',
        useCaseTag: 'ecommerce',
        description: 'AI tools for e-commerce — product descriptions, ad copy, customer support, and analytics.',
        icon: '🛍️',
    },
    'freelancers': {
        label: 'Freelancers',
        useCaseTag: 'productivity',
        description: 'AI tools to help freelancers work faster, win more clients, and deliver better work.',
        icon: '💻',
    },
    'agencies': {
        label: 'Agencies',
        useCaseTag: 'marketing',
        description: 'The best AI tools for agencies to deliver quality work at scale for multiple clients.',
        icon: '🏢',
    },
    'solopreneurs': {
        label: 'Solopreneurs',
        useCaseTag: 'automation',
        description: 'AI tools for running a one-person business — be more productive, automate more.',
        icon: '⚡',
    },
    'social-media-managers': {
        label: 'Social Media Managers',
        useCaseTag: 'social media',
        description: 'AI social media tools for creating, scheduling, and analyzing posts across platforms.',
        icon: '📱',
    },
    'ctos': {
        label: 'CTOs & Engineering Leaders',
        useCaseTag: 'coding',
        description: 'AI tools for engineering leaders — code reviews, documentation, architecture decisions.',
        icon: '🏗️',
    },
}

function ToolCard({ tool }) {
    const rating = tool.ratings?.average ?? 0
    const reviewCount = tool.ratings?.count ?? 0
    const pricingStyle = PRICING_COLORS[tool.pricing] || 'bg-gray-500/10 text-gray-400 border border-gray-500/20'

    return (
        <div className="group flex gap-4 rounded-xl border border-white/8 bg-[#0c0c0c] p-4 transition-all duration-200 hover:border-purple-500/25 hover:bg-purple-500/3 hover:-translate-y-0.5">
            <div className="flex-shrink-0 h-11 w-11 rounded-xl border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center">
                {tool.logo ? (
                    <img
                        src={tool.logo}
                        alt={`${tool.name} logo`}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                ) : (
                    <span className="text-base font-black text-white/20">{tool.name?.charAt(0)}</span>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                        <Link
                            to={`/tools/${tool.slug}`}
                            className="font-semibold text-white hover:text-purple-300 transition-colors text-sm"
                        >
                            {tool.name}
                        </Link>
                        {rating > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <Star size={10} className="fill-amber-400 text-amber-400" />
                                <span className="text-xs text-gray-500">
                                    {rating.toFixed(1)}
                                    {reviewCount > 0 && ` (${reviewCount})`}
                                </span>
                            </div>
                        )}
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${pricingStyle}`}>
                        {tool.pricing || 'Unknown'}
                    </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {tool.shortDescription}
                </p>
                <div className="mt-2.5 flex gap-3">
                    <Link to={`/tools/${tool.slug}`} className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium">
                        View details →
                    </Link>
                    <a
                        href={`${API_URL}/api/v1/tools/slug/${tool.slug}/visit?source=best_tools_page`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
                    >
                        <ExternalLink size={10} />
                        Website
                    </a>
                </div>
            </div>
        </div>
    )
}

export default function BestToolsForPage() {
    const { role, useCase } = useParams()
    const slug = role || useCase

    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [pricingFilter, setPricingFilter] = useState('')
    const [total, setTotal] = useState(0)

    const roleDef = ROLE_DEFINITIONS[slug]
    const year = new Date().getFullYear()

    useEffect(() => {
        if (!slug) return
        setLoading(true)
        setError(null)

        async function fetchTools() {
            try {
                // Use the real use-case endpoint first
                const tag = roleDef?.useCaseTag || slug.replace(/-/g, ' ')
                const params = new URLSearchParams({ limit: '24' })
                if (pricingFilter) params.set('pricing', pricingFilter)

                const res = await fetch(
                    `${API_URL}/api/v1/tools/use-case/${encodeURIComponent(tag)}?${params}`
                )
                if (!res.ok) throw new Error('use-case endpoint failed')
                const json = await res.json()
                const payload = json?.data || json
                const items = payload?.tools || []
                setTools(items)
                setTotal(payload?.pagination?.total || items.length)

                // If the use-case endpoint returns < 6 results, supplement via search
                if (items.length < 6) {
                    const fallbackQuery = roleDef?.useCaseTag || slug.replace(/-/g, ' ')
                    const sRes = await fetch(
                        `${API_URL}/api/v1/tools/search?q=${encodeURIComponent(fallbackQuery)}&hitsPerPage=24`
                    )
                    if (sRes.ok) {
                        const sJson = await sRes.json()
                        const sPayload = sJson?.data || sJson
                        const hits = sPayload?.hits || []
                        // Merge without duplicates
                        const combined = [...items]
                        for (const h of hits) {
                            if (!combined.find(t => t._id === h.objectID || t.slug === h.slug)) {
                                combined.push(h)
                            }
                        }
                        setTools(combined)
                        setTotal(combined.length)
                    }
                }
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchTools()
    }, [slug, roleDef, pricingFilter])

    const roleLabel = roleDef?.label || slug?.replace(/-/g, ' ')
    const roleIcon = roleDef?.icon || '🤖'
    const pageTitle = `Best AI Tools for ${roleLabel} in ${year} — IntelliGrid`
    const pageDesc = roleDef?.description || `Discover the top AI tools for ${roleLabel} — curated, reviewed, and ranked in ${year}.`
    const canonicalUrl = `https://www.intelligrid.online/${role ? 'best-tools' : 'best-ai-tools-for'}/${slug}`

    return (
        <>
            <Helmet>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDesc} />
                <meta name="robots" content="index, follow" />
                <link rel="canonical" href={canonicalUrl} />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content="IntelliGrid" />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDesc} />
                <meta property="og:url" content={canonicalUrl} />
                <meta property="og:image" content="https://www.intelligrid.online/og-image.png" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:site" content="@intelligrid_ai" />
                <meta name="twitter:title" content={pageTitle} />
                <meta name="twitter:description" content={pageDesc} />
                <meta name="twitter:image" content="https://www.intelligrid.online/og-image.png" />
                <script type="application/ld+json">{JSON.stringify({
                    '@context': 'https://schema.org',
                    '@type': 'ItemList',
                    name: pageTitle,
                    description: pageDesc,
                    url: canonicalUrl,
                    numberOfItems: tools.length,
                    itemListElement: tools.slice(0, 10).map((t, i) => ({
                        '@type': 'ListItem',
                        position: i + 1,
                        name: t.name,
                        url: `https://www.intelligrid.online/tools/${t.slug}`,
                    })),
                })}</script>
            </Helmet>

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
                            <span className="text-gray-400">Best for {roleLabel}</span>
                        </nav>

                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-xs font-medium text-purple-400">
                            <Zap size={11} />
                            {total > 0 ? `${total} tools curated` : 'Curated collection'}
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/15 flex-shrink-0 text-2xl">
                                {roleIcon}
                            </div>
                            <h1 className="text-3xl font-extrabold text-white md:text-5xl tracking-tight">
                                Best AI Tools for{' '}
                                <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                                    {roleLabel}
                                </span>
                                <span className="ml-2 text-2xl font-normal text-gray-600">in {year}</span>
                            </h1>
                        </div>

                        <p className="max-w-2xl text-gray-400 leading-relaxed text-base">
                            {roleDef?.description || `Discover the top AI tools curated for ${roleLabel} — all independently reviewed and updated weekly.`}
                        </p>

                        {/* Pricing filter */}
                        <div className="mt-6 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-600 flex items-center gap-1"><Filter size={11} /> Pricing:</span>
                            {['', 'Free', 'Freemium', 'Paid', 'Trial'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPricingFilter(p)}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${pricingFilter === p
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/8'
                                        }`}
                                >
                                    {p || 'All prices'}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Trust signals */}
                <div className="border-b border-white/6 bg-black/20 px-4 py-3">
                    <div className="mx-auto max-w-4xl flex gap-6 flex-wrap">
                        {[
                            { icon: Shield, text: 'Independently reviewed' },
                            { icon: Star, text: 'Real user ratings' },
                        ].map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Icon size={12} className="text-purple-500" />
                                {text}
                            </div>
                        ))}
                        <div className="ml-auto flex items-center gap-1">
                            <Link to="/tools" className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                                Browse all tools <ArrowRight size={11} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="mx-auto max-w-4xl px-4 py-10">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-semibold text-white">
                            {loading ? 'Finding tools...' : `${tools.length} tools for ${roleLabel}`}
                        </h2>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <LoadingSpinner text="Finding the best tools..." />
                        </div>
                    ) : error ? (
                        <div className="py-20 text-center">
                            <p className="text-gray-500 mb-3">Couldn't load tools right now.</p>
                            <Link to="/tools" className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 transition-colors">
                                Browse all tools <ArrowUpRight size={14} />
                            </Link>
                        </div>
                    ) : tools.length === 0 ? (
                        <div className="py-20 text-center">
                            <Briefcase size={36} className="mx-auto mb-4 text-gray-700" />
                            <p className="text-gray-500 mb-2">No specific tools found yet for {roleLabel}.</p>
                            <p className="text-xs text-gray-600 mb-4">Our AI pipeline is still tagging tools. Try browsing all tools.</p>
                            <Link to="/tools" className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 transition-colors">
                                Browse all tools <ArrowUpRight size={14} />
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {tools.map((tool) => (
                                <ToolCard key={tool._id || tool.objectID || tool.slug} tool={tool} />
                            ))}
                        </div>
                    )}

                    {/* Related role pages */}
                    <div className="mt-12 border-t border-white/6 pt-8">
                        <h3 className="mb-4 text-sm font-semibold text-gray-400">Also explore</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(ROLE_DEFINITIONS)
                                .filter(([k]) => k !== slug)
                                .slice(0, 12)
                                .map(([s, def]) => (
                                    <Link
                                        key={s}
                                        to={`/best-tools/${s}`}
                                        className="rounded-lg border border-white/8 bg-white/2 px-3 py-1.5 text-xs text-gray-400 hover:border-purple-500/20 hover:text-purple-300 transition-all flex items-center gap-1.5"
                                    >
                                        <span>{def.icon}</span>
                                        {def.label}
                                    </Link>
                                ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export { ROLE_DEFINITIONS }
