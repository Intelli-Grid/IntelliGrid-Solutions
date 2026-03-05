/**
 * HotRightNow.jsx
 * Phase 1.3 — "Hot Right Now" strip component.
 *
 * Shows the top 8 tools by real trendingScore, auto-refreshed every 30 min
 * via the /api/v1/tools/hot endpoint (cached in backend for 30 min).
 *
 * Used on: Homepage, optionally top of ToolsPage.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Flame, ArrowRight, Star } from 'lucide-react'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '')
const REFRESH_MS = 30 * 60 * 1000 // 30 minutes

const PRICING_COLORS = {
    Free: 'text-emerald-400 bg-emerald-400/10',
    Freemium: 'text-sky-400 bg-sky-400/10',
    Paid: 'text-amber-400 bg-amber-400/10',
}

function HotToolChip({ tool, rank }) {
    const rating = tool.ratings?.average ?? 0

    return (
        <Link
            to={`/tools/${tool.slug}`}
            className="group relative flex-shrink-0 flex flex-col w-44 rounded-2xl border border-white/8 bg-[#0d0d0d] p-3.5 transition-all duration-200 hover:border-orange-500/30 hover:bg-orange-500/3 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/5"
        >
            {/* Logo */}
            <div className="mb-2.5 flex items-center gap-2.5">
                <div className="h-8 w-8 flex-shrink-0 rounded-lg border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center">
                    {tool.logo ? (
                        <img
                            src={tool.logo}
                            alt={tool.name}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => { e.currentTarget.parentElement.innerHTML = `<span class="text-sm font-black text-white/20">${tool.name?.charAt(0)}</span>` }}
                        />
                    ) : (
                        <span className="text-sm font-black text-white/20">{tool.name?.charAt(0)}</span>
                    )}
                </div>
                <span className="text-[10px] font-bold text-gray-600">#{rank}</span>
            </div>

            {/* Name */}
            <h3 className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors line-clamp-1 mb-1">
                {tool.name}
            </h3>

            {/* Description */}
            <p className="text-[10px] text-gray-600 line-clamp-2 leading-relaxed flex-1 mb-2">
                {tool.shortDescription || 'AI tool'}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${PRICING_COLORS[tool.pricing] || 'text-gray-500 bg-gray-500/10'}`}>
                    {tool.pricing || 'Unknown'}
                </span>
                {rating > 0 && (
                    <div className="flex items-center gap-0.5">
                        <Star size={9} className="fill-amber-400 text-amber-400" />
                        <span className="text-[10px] text-amber-400 font-semibold">{rating.toFixed(1)}</span>
                    </div>
                )}
            </div>

            {/* Trending score velocity indicator */}
            {tool.trendingScore > 10 && (
                <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5">
                    <Flame size={9} className="text-orange-400" />
                </div>
            )}
        </Link>
    )
}

// Skeleton loading card
function HotChipSkeleton() {
    return (
        <div className="flex-shrink-0 w-44 rounded-2xl border border-white/5 bg-[#0d0d0d] p-3.5 animate-pulse">
            <div className="mb-2.5 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-white/5" />
                <div className="h-2 w-6 rounded bg-white/5" />
            </div>
            <div className="h-3 w-24 rounded bg-white/5 mb-1" />
            <div className="h-2 w-32 rounded bg-white/5 mb-1" />
            <div className="h-2 w-20 rounded bg-white/5 mb-2" />
            <div className="flex justify-between">
                <div className="h-3 w-10 rounded bg-white/5" />
                <div className="h-3 w-8 rounded bg-white/5" />
            </div>
        </div>
    )
}

export default function HotRightNow({ className = '' }) {
    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetch() {
            try {
                const res = await window.fetch(`${API_URL}/api/v1/tools/hot?limit=8`)
                if (!res.ok) return
                const json = await res.json()
                const payload = json?.data || json
                setTools(Array.isArray(payload) ? payload : [])
            } catch {
                // Silent fail — section simply doesn't render
            } finally {
                setLoading(false)
            }
        }

        fetch()
        const timer = setInterval(fetch, REFRESH_MS)
        return () => clearInterval(timer)
    }, [])

    // Don't render the section at all if we have no tools and finished loading
    if (!loading && tools.length === 0) return null

    return (
        <section className={`${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10">
                        <TrendingUp size={14} className="text-orange-400" />
                    </div>
                    <h2 className="text-sm font-bold text-white">Hot Right Now</h2>
                    <span className="text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                        Live · refreshes every 30m
                    </span>
                </div>
                <Link
                    to="/tools?sort=-trendingScore"
                    className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                    See all trending <ArrowRight size={12} />
                </Link>
            </div>

            {/* Horizontal scroll strip */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                {loading
                    ? Array.from({ length: 6 }).map((_, i) => <HotChipSkeleton key={i} />)
                    : tools.map((tool, i) => (
                        <HotToolChip key={tool._id || tool.slug} tool={tool} rank={i + 1} />
                    ))
                }
            </div>
        </section>
    )
}
