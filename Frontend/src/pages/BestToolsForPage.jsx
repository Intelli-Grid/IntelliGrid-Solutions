/**
 * BestToolsForPage.jsx
 * Route: /best-tools/:role
 *
 * Programmatic SEO page: "Best AI Tools for {Role} in 2026"
 * Each of 25 role URLs creates a unique, indexable, high-intent search page.
 * Fetches tools tagged for that role from the backend.
 */
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Star, ExternalLink, ChevronRight, Briefcase, ArrowRight } from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'

const API_URL = import.meta.env.VITE_API_URL || ''

// 25 role definitions — each one becomes a unique SEO URL
const ROLE_DEFINITIONS = {
    'developers': {
        label: 'Developers & Engineers',
        query: 'developer engineering programming coding',
        description: 'The best AI tools for software developers, from code completion to debugging and documentation.',
    },
    'marketers': {
        label: 'Marketers',
        query: 'marketing content social media copywriting SEO',
        description: 'Top AI marketing tools to write copy faster, analyze campaigns, and automate outreach.',
    },
    'designers': {
        label: 'Designers',
        query: 'design image generation UI graphics',
        description: 'AI tools for designers — from image generation to UI mock-ups and brand asset creation.',
    },
    'writers': {
        label: 'Writers & Content Creators',
        query: 'writing content blog article long-form',
        description: 'The best AI writing tools to draft, edit, and publish content faster without losing your voice.',
    },
    'founders': {
        label: 'Founders & Entrepreneurs',
        query: 'startup business productivity automation',
        description: 'AI tools that help founders move faster — from fundraising pitch decks to customer research.',
    },
    'students': {
        label: 'Students',
        query: 'education learning research essay study',
        description: 'AI tools for students to study smarter, write better essays, and understand complex topics.',
    },
    'researchers': {
        label: 'Researchers',
        query: 'research literature review analysis data',
        description: 'AI research tools for literature reviews, data analysis, and knowledge synthesis.',
    },
    'sales-teams': {
        label: 'Sales Teams',
        query: 'sales CRM outreach cold email prospecting',
        description: 'The best AI sales tools to prospect, personalize outreach, and close deals faster.',
    },
    'product-managers': {
        label: 'Product Managers',
        query: 'product roadmap user research PRD requirements',
        description: 'AI tools for PMs to build better products — from user research to writing PRDs.',
    },
    'customer-success': {
        label: 'Customer Success Teams',
        query: 'customer service support chat helpdesk',
        description: 'AI customer success tools for support automation, ticket resolution, and retention.',
    },
    'video-creators': {
        label: 'Video Creators',
        query: 'video editing animation transcript subtitle',
        description: 'AI video tools for creators — auto-captions, editing, thumbnail generation, and more.',
    },
    'podcasters': {
        label: 'Podcasters',
        query: 'podcast audio transcription voice editing',
        description: 'The best AI tools for podcasters to transcribe, edit, promote, and grow their show.',
    },
    'educators': {
        label: 'Educators & Teachers',
        query: 'education teaching lesson plan quiz assessment',
        description: 'AI tools for educators to create lesson plans, assessments, and personalized learning materials.',
    },
    'hr-teams': {
        label: 'HR Teams',
        query: 'human resources hiring recruitment resume screening',
        description: 'AI HR tools for recruiting, resume screening, employee onboarding, and performance reviews.',
    },
    'lawyers': {
        label: 'Legal Professionals',
        query: 'legal document contract analysis law',
        description: 'AI tools for lawyers to review contracts, research case law, and draft legal documents.',
    },
    'finance-teams': {
        label: 'Finance Teams',
        query: 'finance accounting forecasting analysis Excel',
        description: 'AI finance tools for forecasting, analysis, reporting, and automating accounting workflows.',
    },
    'data-analysts': {
        label: 'Data Analysts',
        query: 'data analysis SQL visualization chart dashboard',
        description: 'The best AI data tools for analysts — from natural language SQL to automated dashboards.',
    },
    'healthcare': {
        label: 'Healthcare Professionals',
        query: 'medical healthcare clinical diagnosis documentation',
        description: 'AI tools for healthcare professionals — from clinical documentation to medical research.',
    },
    'real-estate': {
        label: 'Real Estate Professionals',
        query: 'real estate property listing description marketing',
        description: 'AI real estate tools for writing listings, generating leads, and analyzing markets.',
    },
    'ecommerce': {
        label: 'E-Commerce Sellers',
        query: 'ecommerce product description listing shop',
        description: 'AI tools for e-commerce — product descriptions, ad copy, customer support, and analytics.',
    },
    'freelancers': {
        label: 'Freelancers',
        query: 'freelancer productivity writing automation client',
        description: 'AI tools to help freelancers work faster, win more clients, and deliver better work.',
    },
    'agencies': {
        label: 'Agencies',
        query: 'agency client report presentation content',
        description: 'The best AI tools for agencies to deliver quality work at scale for multiple clients.',
    },
    'solopreneurs': {
        label: 'Solopreneurs',
        query: 'solopreneur one-person business automation',
        description: 'AI tools for running a one-person business — be more productive, automate more.',
    },
    'social-media-managers': {
        label: 'Social Media Managers',
        query: 'social media Instagram Twitter LinkedIn posts scheduling',
        description: 'AI social media tools for creating, scheduling, and analyzing posts across platforms.',
    },
    'ctos': {
        label: 'CTOs & Engineering Leaders',
        query: 'technical leadership architecture code review',
        description: 'AI tools for engineering leaders — code reviews, documentation, architecture decisions.',
    },
}

function ToolCard({ tool }) {
    const rating = tool.ratings?.average ?? 0
    const reviewCount = tool.ratings?.count ?? 0

    return (
        <div className="group flex gap-4 rounded-xl border border-white/8 bg-white/2 p-4 transition-all hover:border-purple-500/20 hover:bg-purple-500/3">
            {tool.logo && (
                <img
                    src={tool.logo}
                    alt={`${tool.name} logo`}
                    className="h-11 w-11 flex-shrink-0 rounded-xl border border-white/10 object-contain bg-white/5 p-1"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
            )}
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <div>
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
                    <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${tool.pricing === 'Free' ? 'bg-emerald-500/10 text-emerald-400' :
                            tool.pricing === 'Freemium' ? 'bg-blue-500/10 text-blue-400' :
                                'bg-gray-500/10 text-gray-400'
                        }`}>
                        {tool.pricing || 'Unknown'}
                    </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {tool.shortDescription}
                </p>
                <div className="mt-2 flex gap-3">
                    <Link to={`/tools/${tool.slug}`} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
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
    const { role } = useParams()
    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const roleDef = ROLE_DEFINITIONS[role]
    const year = new Date().getFullYear()

    useEffect(() => {
        if (!role) return
        setLoading(true)
        setError(null)

        async function fetchTools() {
            try {
                const query = roleDef?.query || role.replace(/-/g, ' ')
                // Use search endpoint with the role query for relevant results
                const res = await fetch(
                    `${API_URL}/api/v1/tools/search?q=${encodeURIComponent(query)}&limit=20`
                )
                if (!res.ok) throw new Error('Failed to fetch tools')
                const data = await res.json()
                const items = data.tools || data.results || data || []
                setTools(Array.isArray(items) ? items : [])
            } catch (err) {
                // Fallback: fetch top-rated tools
                try {
                    const res = await fetch(`${API_URL}/api/v1/tools?sort=rating&limit=15`)
                    const data = await res.json()
                    setTools(data.tools || [])
                } catch {
                    setError(err.message)
                }
            } finally {
                setLoading(false)
            }
        }

        fetchTools()
    }, [role, roleDef])

    const roleLabel = roleDef?.label || role?.replace(/-/g, ' ')
    const pageTitle = `Best AI Tools for ${roleLabel} in ${year} — IntelliGrid`
    const pageDesc = roleDef?.description || `Discover the top AI tools for ${roleLabel} — curated, reviewed, and ranked by the IntelliGrid community in ${year}.`
    const canonicalUrl = `https://www.intelligrid.online/best-tools/${role}`

    if (!roleDef) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
                <Briefcase size={32} className="text-gray-700" />
                <p className="text-gray-400">We don't have a curated page for <strong className="text-white">{role}</strong> yet.</p>
                <Link to="/tools" className="text-sm text-purple-400 hover:text-purple-300">
                    Browse all tools →
                </Link>
            </div>
        )
    }

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
                    numberOfItems: tools.length,
                    itemListElement: tools.slice(0, 10).map((t, i) => ({
                        '@type': 'ListItem',
                        position: i + 1,
                        name: t.name,
                        url: `https://www.intelligrid.online/tools/${t.slug}`,
                    })),
                })}</script>
            </Helmet>

            <div className="min-h-screen bg-black">
                {/* Hero */}
                <section className="border-b border-white/8 px-4 py-14">
                    <div className="mx-auto max-w-4xl">
                        {/* Breadcrumb */}
                        <nav className="mb-6 flex items-center gap-1.5 text-xs text-gray-600">
                            <Link to="/" className="hover:text-gray-400 transition-colors">IntelliGrid</Link>
                            <ChevronRight size={12} />
                            <Link to="/tools" className="hover:text-gray-400 transition-colors">Tools</Link>
                            <ChevronRight size={12} />
                            <span className="text-gray-400">Best for {roleLabel}</span>
                        </nav>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 flex-shrink-0">
                                <Briefcase size={20} className="text-purple-400" />
                            </div>
                            <h1 className="text-3xl font-bold text-white md:text-4xl">
                                Best AI Tools for{' '}
                                <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                                    {roleLabel}
                                </span>
                                <span className="ml-2 text-2xl font-normal text-gray-600">in {year}</span>
                            </h1>
                        </div>

                        <p className="max-w-2xl text-gray-400 leading-relaxed">
                            {roleDef.description}
                        </p>
                    </div>
                </section>

                <div className="mx-auto max-w-4xl px-4 py-12">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-semibold text-white">
                            {loading ? 'Fetching tools...' : `${tools.length} tools curated for ${roleLabel}`}
                        </h2>
                        <Link
                            to="/tools"
                            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                        >
                            Browse all tools <ArrowRight size={12} />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <LoadingSpinner text="Finding the best tools..." />
                        </div>
                    ) : error ? (
                        <div className="py-20 text-center">
                            <p className="text-gray-500">Couldn't load tools right now.</p>
                            <Link to="/tools" className="mt-3 inline-block text-sm text-purple-400 hover:text-purple-300">
                                Browse tools manually →
                            </Link>
                        </div>
                    ) : tools.length === 0 ? (
                        <div className="py-20 text-center">
                            <p className="text-gray-500">No specific results yet for {roleLabel}.</p>
                            <Link to="/tools" className="mt-3 inline-block text-sm text-purple-400 hover:text-purple-300">
                                Browse all tools →
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {tools.map((tool) => (
                                <ToolCard key={tool._id || tool.slug} tool={tool} />
                            ))}
                        </div>
                    )}

                    {/* Related role pages */}
                    <div className="mt-12 border-t border-white/8 pt-10">
                        <h3 className="mb-4 text-sm font-semibold text-gray-400">Also explore</h3>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(ROLE_DEFINITIONS)
                                .filter(([k]) => k !== role)
                                .slice(0, 12)
                                .map(([slug, def]) => (
                                    <Link
                                        key={slug}
                                        to={`/best-tools/${slug}`}
                                        className="rounded-lg border border-white/8 bg-white/2 px-3 py-1.5 text-xs text-gray-400 hover:border-purple-500/20 hover:text-purple-300 transition-all"
                                    >
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

// Export the full list of supported roles for sitemap generation
export { ROLE_DEFINITIONS }
