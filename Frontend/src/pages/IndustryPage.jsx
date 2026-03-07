/**
 * IndustryPage.jsx
 * Route: /industry/:tag  (e.g. /industry/healthcare, /industry/finance)
 *
 * Programmatic SEO page: "Best AI Tools for the {Industry} Industry in 2026"
 * Uses /api/v1/tools endpoint with tag-based filtering.
 * Each page creates a unique, indexable URL capturing high-intent B2B search traffic.
 */
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import SEO from '../components/common/SEO'
import LoadingSpinner from '../components/common/LoadingSpinner'
import {
    Building2, ChevronRight, Filter, Star, ExternalLink,
    ArrowUpRight, Zap, Shield, TrendingUp, DollarSign
} from 'lucide-react'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '')

const PRICING_STYLE = {
    Free: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    Freemium: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    Paid: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    Trial: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
}

// Industry metadata — SEO-optimised titles, descriptions, icons
const INDUSTRY_DEFINITIONS = {
    'healthcare': {
        label: 'Healthcare & MedTech',
        icon: '🏥',
        description: 'AI tools transforming healthcare — from clinical decision support and medical imaging to patient engagement and administrative automation.',
        keywords: 'AI healthcare tools, medical AI, clinical AI software, health tech AI, MedTech tools',
        searchTag: 'healthcare',
    },
    'finance': {
        label: 'Finance & FinTech',
        icon: '💰',
        description: 'AI-powered finance tools for fraud detection, risk assessment, automated trading, financial reporting, and compliance management.',
        keywords: 'AI finance tools, FinTech AI, financial AI software, banking AI tools, investment AI',
        searchTag: 'finance',
    },
    'legal': {
        label: 'Legal & Law',
        icon: '⚖️',
        description: 'AI tools for legal professionals — contract analysis, legal research, document automation, compliance tracking, and case management.',
        keywords: 'AI legal tools, law tech, contract AI, legal AI software, law firm tools',
        searchTag: 'legal',
    },
    'education': {
        label: 'Education & EdTech',
        icon: '🎓',
        description: 'AI tools for educators, students, and institutions — lesson planning, personalised learning, assessment automation, and tutoring.',
        keywords: 'AI education tools, EdTech AI, learning AI software, teaching tools AI, student AI',
        searchTag: 'education',
    },
    'ecommerce': {
        label: 'E-Commerce & Retail',
        icon: '🛒',
        description: 'AI tools for e-commerce — product recommendations, inventory management, dynamic pricing, customer support, and visual search.',
        keywords: 'AI ecommerce tools, retail AI, product recommendation AI, e-commerce automation',
        searchTag: 'ecommerce',
    },
    'marketing': {
        label: 'Marketing & AdTech',
        icon: '📣',
        description: 'AI marketing tools for content creation, campaign optimisation, audience targeting, social media automation, and analytics.',
        keywords: 'AI marketing tools, AdTech AI, content AI, campaign AI software, marketing automation',
        searchTag: 'marketing',
    },
    'real-estate': {
        label: 'Real Estate & PropTech',
        icon: '🏠',
        description: 'AI tools for real estate — property valuation, lead generation, virtual tours, market analysis, and contract management.',
        keywords: 'AI real estate tools, PropTech AI, property AI software, real estate automation',
        searchTag: 'real estate',
    },
    'manufacturing': {
        label: 'Manufacturing & Industry 4.0',
        icon: '🏭',
        description: 'AI tools for manufacturing — predictive maintenance, quality control, supply chain optimisation, and process automation.',
        keywords: 'AI manufacturing tools, Industry 4.0 AI, predictive maintenance AI, factory automation',
        searchTag: 'manufacturing',
    },
    'logistics': {
        label: 'Logistics & Supply Chain',
        icon: '🚚',
        description: 'AI tools for logistics — route optimisation, demand forecasting, warehouse automation, and real-time tracking.',
        keywords: 'AI logistics tools, supply chain AI, route optimisation AI, warehouse AI software',
        searchTag: 'logistics',
    },
    'hr': {
        label: 'Human Resources & Recruiting',
        icon: '👥',
        description: 'AI HR tools for talent acquisition, resume screening, employee onboarding, performance management, and workforce analytics.',
        keywords: 'AI HR tools, recruiting AI, talent AI software, human resources automation, HR tech',
        searchTag: 'recruiting',
    },
    'cybersecurity': {
        label: 'Cybersecurity',
        icon: '🔒',
        description: 'AI cybersecurity tools for threat detection, vulnerability scanning, incident response, compliance automation, and identity management.',
        keywords: 'AI cybersecurity tools, security AI, threat detection AI, SIEM AI, security software',
        searchTag: 'cybersecurity',
    },
    'media': {
        label: 'Media & Entertainment',
        icon: '🎬',
        description: 'AI tools for media and entertainment — video production, content recommendation, audience analytics, and content moderation.',
        keywords: 'AI media tools, entertainment AI, content creation AI, video AI software, media tech',
        searchTag: 'video',
    },
    'agriculture': {
        label: 'Agriculture & AgTech',
        icon: '🌾',
        description: 'AI agriculture tools for crop monitoring, yield prediction, precision farming, pest detection, and supply chain optimisation.',
        keywords: 'AI agriculture tools, AgTech AI, precision farming AI, crop AI software, smart farming',
        searchTag: 'agriculture',
    },
    'travel': {
        label: 'Travel & Hospitality',
        icon: '✈️',
        description: 'AI tools for travel and hospitality — dynamic pricing, personalised recommendations, chatbots, and operational efficiency.',
        keywords: 'AI travel tools, hospitality AI, travel automation, booking AI software, hotel AI',
        searchTag: 'travel',
    },
}

// Popular industries for navigation
const POPULAR_INDUSTRIES = [
    { tag: 'healthcare', label: 'Healthcare' },
    { tag: 'finance', label: 'Finance' },
    { tag: 'legal', label: 'Legal' },
    { tag: 'education', label: 'Education' },
    { tag: 'ecommerce', label: 'E-Commerce' },
    { tag: 'marketing', label: 'Marketing' },
    { tag: 'hr', label: 'HR & Recruiting' },
    { tag: 'cybersecurity', label: 'Cybersecurity' },
]

function IndustryToolCard({ tool, rank }) {
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
                                    {reviewCount > 0 && ` (${reviewCount.toLocaleString()})`}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pricingStyle}`}>
                            {tool.pricing}
                        </span>
                        <a
                            href={tool.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Visit official site"
                        >
                            <ExternalLink size={14} className="text-gray-500 hover:text-purple-400 transition-colors" />
                        </a>
                    </div>
                </div>

                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {tool.shortDescription}
                </p>

                {tool.tags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {tool.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-gray-600">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default function IndustryPage() {
    const { tag } = useParams()
    const [tools, setTools] = useState([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [pricingFilter, setPricingFilter] = useState('')

    const industryDef = INDUSTRY_DEFINITIONS[tag]
    const industryLabel = industryDef?.label || tag?.replace(/-/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase())
    const year = new Date().getFullYear()
    const canonicalUrl = `https://www.intelligrid.online/industry/${tag}`
    const pageTitle = `Best AI Tools for the ${industryLabel} Industry in ${year} — IntelliGrid`
    const pageDesc = industryDef?.description || `Discover the top AI tools for the ${industryLabel} industry — curated, verified, and ranked by real usage data in ${year}.`

    useEffect(() => {
        if (!tag) return
        setLoading(true)
        setError(null)

        const searchTag = industryDef?.searchTag || tag.replace(/-/g, ' ')
        const params = new URLSearchParams({ limit: '24' })
        if (pricingFilter) params.set('pricing', pricingFilter)

        fetch(`${API_URL}/api/v1/tools/use-case/${encodeURIComponent(searchTag)}?${params}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch tools')
                return res.json()
            })
            .then(json => {
                const payload = json?.data || json
                const items = payload?.tools || []
                setTools(items)
                setTotal(payload?.pagination?.total || items.length)
            })
            .catch(err => {
                console.error('IndustryPage fetch error:', err)
                setError('Could not load tools for this industry.')
            })
            .finally(() => setLoading(false))
    }, [tag, pricingFilter])

    const structuredData = tools.length > 0 ? {
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
    } : null

    return (
        <>
            <SEO
                title={pageTitle}
                description={pageDesc}
                canonicalUrl={canonicalUrl}
                keywords={industryDef?.keywords || `AI tools ${industryLabel}, ${industryLabel} artificial intelligence, AI software ${industryLabel}`}
                structuredData={structuredData}
            />

            <div className="min-h-screen bg-[#09090b]">
                {/* Hero */}
                <section className="border-b border-white/6 bg-gradient-to-b from-[#0c0c14] to-[#09090b] px-4 py-14">
                    <div className="mx-auto max-w-4xl">
                        {/* Breadcrumb */}
                        <nav className="mb-6 flex items-center gap-1.5 text-xs text-gray-600">
                            <Link to="/" className="hover:text-gray-400 transition-colors">IntelliGrid</Link>
                            <ChevronRight size={12} />
                            <Link to="/tools" className="hover:text-gray-400 transition-colors">AI Tools</Link>
                            <ChevronRight size={12} />
                            <span className="text-gray-400">Industry: {industryLabel}</span>
                        </nav>

                        <div className="mb-4 flex items-center gap-3">
                            <span className="text-4xl" role="img" aria-label={industryLabel}>
                                {industryDef?.icon || '🏢'}
                            </span>
                            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-xs font-medium text-purple-400">
                                <Zap size={11} />
                                {total > 0 ? `${total} tools found` : 'Curated tools'}
                            </div>
                        </div>

                        <h1 className="text-3xl font-extrabold text-white md:text-5xl mb-3 tracking-tight">
                            Best AI Tools for{' '}
                            <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                                {industryLabel}
                            </span>
                            <span className="ml-3 text-2xl font-normal text-gray-600">in {year}</span>
                        </h1>
                        <p className="max-w-2xl text-gray-400 leading-relaxed text-base">
                            {pageDesc}
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

                {/* Trust signals */}
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

                {/* Tools list */}
                <section className="mx-auto max-w-4xl px-4 py-10">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <LoadingSpinner text={`Finding ${industryLabel} AI tools...`} />
                        </div>
                    ) : error ? (
                        <div className="py-20 text-center">
                            <Building2 size={36} className="mx-auto mb-4 text-gray-700" />
                            <p className="text-gray-500 mb-4">{error}</p>
                            <Link to="/tools" className="text-sm text-purple-400 hover:text-purple-300">
                                Browse all tools →
                            </Link>
                        </div>
                    ) : tools.length === 0 ? (
                        <div className="py-20 text-center">
                            <Building2 size={36} className="mx-auto mb-4 text-gray-700" />
                            <p className="text-gray-500 mb-2">No tools found yet for <strong className="text-white">{industryLabel}</strong>.</p>
                            <p className="text-xs text-gray-600 mb-4">Our AI enrichment pipeline is processing data. Check back soon.</p>
                            <Link to="/tools" className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 transition-colors">
                                Browse all tools <ArrowUpRight size={14} />
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tools.map((tool, i) => (
                                <IndustryToolCard key={tool._id || tool.slug} tool={tool} rank={i + 1} />
                            ))}
                        </div>
                    )}

                    {/* Other industries navigation */}
                    <div className="mt-12 border-t border-white/6 pt-8">
                        <h3 className="mb-4 text-sm font-semibold text-gray-400">Explore other industry AI tools</h3>
                        <div className="flex flex-wrap gap-2">
                            {POPULAR_INDUSTRIES
                                .filter(ind => ind.tag !== tag)
                                .map(ind => (
                                    <Link
                                        key={ind.tag}
                                        to={`/industry/${ind.tag}`}
                                        className="rounded-lg border border-white/8 bg-white/2 px-3 py-1.5 text-xs text-gray-400 hover:border-purple-500/20 hover:text-purple-300 transition-all"
                                    >
                                        {INDUSTRY_DEFINITIONS[ind.tag]?.icon} {ind.label}
                                    </Link>
                                ))}
                        </div>
                    </div>
                </section>
            </div>
        </>
    )
}
