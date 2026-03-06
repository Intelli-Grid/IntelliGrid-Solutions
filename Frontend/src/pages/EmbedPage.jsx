/**
 * EmbedPage.jsx
 * Route: /embed/:toolSlug
 *
 * A bare-bones embeddable widget for external sites and blogs.
 * No header, no footer, no navigation — pure tool card.
 * Designed to be dropped into an <iframe> by tool owners or bloggers.
 *
 * Usage:
 *   <iframe
 *     src="https://www.intelligrid.online/embed/chatgpt"
 *     width="380" height="240"
 *     style="border:none;border-radius:12px;"
 *   ></iframe>
 */

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ExternalLink, Star, TrendingUp, Sparkles, Shield } from 'lucide-react'
import { toolService } from '../services'

const PRICING_STYLE = {
    Free: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    Freemium: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    Paid: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    Trial: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
}

export default function EmbedPage() {
    const { toolSlug } = useParams()
    const [tool, setTool] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    useEffect(() => {
        if (!toolSlug) return

        toolService.getToolBySlug(toolSlug)
            .then(res => {
                const data = res?.data || res
                if (!data?.name) throw new Error('not found')
                setTool(data)
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false))
    }, [toolSlug])

    // Allow the parent page to embed us in an iframe
    useEffect(() => {
        document.body.style.background = 'transparent'
        return () => { document.body.style.background = '' }
    }, [])

    if (loading) {
        return (
            <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="h-8 w-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
            </div>
        )
    }

    if (error || !tool) {
        return (
            <div className="flex items-center justify-center h-full min-h-[160px] text-gray-500 text-sm">
                Tool not found.
            </div>
        )
    }

    const rating = tool.ratings?.average ?? 0
    const reviewCount = tool.ratings?.count ?? 0
    const pricingStyle = PRICING_STYLE[tool.pricing] || 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
    const logoSrc = tool.logo || tool.metadata?.logo
    const toolUrl = `https://www.intelligrid.online/tools/${tool.slug}`
    const visitUrl = tool.officialUrl || tool.websiteUrl

    return (
        <>
            <Helmet>
                <meta name="robots" content="noindex" />
            </Helmet>

            {/* Embed card — dark, compact, no nav */}
            <a
                href={toolUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block w-full h-full bg-[#0c0c0c] border border-white/10 rounded-2xl p-4 no-underline hover:border-purple-500/30 transition-all duration-200 cursor-pointer"
                style={{ textDecoration: 'none', display: 'block', width: '100%' }}
            >
                {/* Header row */}
                <div className="flex items-start gap-3">
                    {/* Logo */}
                    <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                        {logoSrc ? (
                            <img
                                src={logoSrc}
                                alt={`${tool.name} logo`}
                                className="w-full h-full object-contain p-1"
                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                            />
                        ) : (
                            <span className="text-lg font-black text-white/30">
                                {tool.name?.charAt(0)}
                            </span>
                        )}
                    </div>

                    {/* Name + badges */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                                {tool.name}
                            </span>
                            {tool.isVerified && (
                                <Shield className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                            )}
                            {tool.isTrending && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-400 border border-orange-500/20">
                                    <TrendingUp className="h-2.5 w-2.5" /> Trending
                                </span>
                            )}
                            {tool.isNew && !tool.isTrending && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                                    <Sparkles className="h-2.5 w-2.5" /> New
                                </span>
                            )}
                        </div>

                        {/* Rating row */}
                        {rating > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span className="text-xs text-gray-400">
                                    {rating.toFixed(1)}
                                    {reviewCount > 0 && <span className="text-gray-600"> ({reviewCount})</span>}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Pricing badge */}
                    <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${pricingStyle}`}>
                        {tool.pricing || 'Unknown'}
                    </span>
                </div>

                {/* Description */}
                <p className="mt-2.5 text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {tool.shortDescription}
                </p>

                {/* Footer */}
                <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">
                        via <span className="text-purple-500 font-medium">IntelliGrid</span>
                    </span>
                    <div className="flex items-center gap-2">
                        {visitUrl && (
                            <a
                                href={visitUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[10px] text-white bg-purple-600 hover:bg-purple-500 px-2.5 py-1 rounded-lg font-medium transition-colors"
                                style={{ textDecoration: 'none' }}
                            >
                                Visit <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                        )}
                    </div>
                </div>
            </a>
        </>
    )
}
