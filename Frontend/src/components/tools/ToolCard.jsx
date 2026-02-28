import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, ExternalLink, TrendingUp, Sparkles, Plus, ArrowUpRight } from 'lucide-react'
import { getPricingDisplay, formatToolName, getInitials } from '../../utils/helpers'
import AddToCollectionModal from './AddToCollectionModal'
import { useFlag } from '../../hooks/useFeatureFlags'

const PRICING_COLORS = {
    Free: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    Freemium: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    Paid: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    Trial: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
}

// Generate a deterministic gradient from a tool name so every logo-less
// tool gets its own unique colour rather than the same purple/blue.
function nameToGradient(name = '') {
    const hue = (name.charCodeAt(0) * 37 + name.charCodeAt(1) * 17) % 360
    return `hsl(${hue},55%,28%)`
}

export default function ToolCard({ tool }) {
    const [showCollectionModal, setShowCollectionModal] = useState(false)
    const [bannerError, setBannerError] = useState(false)
    const affiliateTrackingEnabled = useFlag('AFFILIATE_TRACKING')

    const apiBase = import.meta.env.VITE_API_URL || ''
    const visitHref = affiliateTrackingEnabled
        ? `${apiBase}/api/v1/tools/slug/${tool.slug}/visit?source=tool_card`
        : tool.officialUrl

    const formattedName = formatToolName(tool.name)
    const pricingDisplay = getPricingDisplay(tool.pricing)
    const pricingClass = PRICING_COLORS[pricingDisplay] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    const rating = tool.ratings?.average || 0
    const isNew = !tool.createdAt || (new Date() - new Date(tool.createdAt) < 14 * 24 * 60 * 60 * 1000)
    const logoSrc = tool.logo || tool.metadata?.logo || ''
    const showBanner = logoSrc && !bannerError

    return (
        <>
            <Link
                to={`/tools/${tool.slug}`}
                className="group relative flex flex-col bg-[#0d0d0d] border border-white/8 rounded-2xl overflow-hidden transition-all duration-300 hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/8 hover:-translate-y-0.5 h-full"
            >
                {/* ── Banner / Preview Image ─────────────────────────── */}
                <div
                    className="relative w-full overflow-hidden flex-shrink-0"
                    style={{ height: '140px' }}
                >
                    {showBanner ? (
                        <img
                            src={logoSrc}
                            alt={formattedName}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            onError={() => setBannerError(true)}
                        />
                    ) : (
                        // Gradient placeholder — unique colour per tool
                        <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ background: `linear-gradient(135deg, ${nameToGradient(tool.name)}, #0d0d0d)` }}
                        >
                            <span className="text-4xl font-black text-white/20 select-none tracking-tight">
                                {getInitials(formattedName)}
                            </span>
                        </div>
                    )}

                    {/* Fade to card background at bottom */}
                    <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#0d0d0d] to-transparent" />

                    {/* Top-right badges */}
                    <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5 z-10">
                        {tool.isTrending && (
                            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-amber-400 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full border border-amber-400/30">
                                <TrendingUp size={8} /> Hot
                            </span>
                        )}
                        {isNew && !tool.isTrending && (
                            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-full border border-emerald-400/30">
                                <Sparkles size={8} /> New
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Card Body ──────────────────────────────────────── */}
                <div className="flex flex-col flex-1 px-4 pb-4 pt-3">

                    {/* Name + Rating */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="text-[15px] font-bold text-white leading-snug line-clamp-1 group-hover:text-purple-300 transition-colors">
                            {formattedName}
                        </h3>
                        {rating > 0 && (
                            <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5">
                                <Star size={10} className="fill-amber-400 text-amber-400" />
                                <span className="text-[11px] font-semibold text-amber-400">{rating.toFixed(1)}</span>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed mb-3 flex-1">
                        {tool.shortDescription || tool.description || 'No description available.'}
                    </p>

                    {/* Tags */}
                    {tool.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                            {tool.tags.slice(0, 3).map((tag, i) => (
                                <span
                                    key={i}
                                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-gray-500 border border-white/5 truncate max-w-[90px]"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${pricingClass}`}>
                            {pricingDisplay}
                        </span>

                        <div className="flex items-center gap-1.5">
                            {/* Add to collection */}
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setShowCollectionModal(true)
                                }}
                                className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors border border-white/5"
                                title="Save to collection"
                            >
                                <Plus size={13} />
                            </button>

                            {/* Visit */}
                            <a
                                href={visitHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="h-7 px-2.5 flex items-center gap-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] transition-colors"
                            >
                                Visit <ArrowUpRight size={11} />
                            </a>
                        </div>
                    </div>
                </div>
            </Link>

            <AddToCollectionModal
                isOpen={showCollectionModal}
                onClose={() => setShowCollectionModal(false)}
                toolId={tool._id}
            />
        </>
    )
}
