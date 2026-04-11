import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, ExternalLink, TrendingUp, Sparkles, Plus, ArrowUpRight, Crown, Zap, Heart } from 'lucide-react'
import { getPricingDisplay, formatToolName, getInitials, getOptimizedImageUrl } from '../../utils/helpers'
import AddToCollectionModal from './AddToCollectionModal'
import { useFlag } from '../../hooks/useFeatureFlags'
import { useUser } from '@clerk/clerk-react'
import { useToast } from '../../context/ToastContext'

const PRICING_COLORS = {
    Free: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    Freemium: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    Paid: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    Trial: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
}

// Generate a deterministic gradient from a tool name so every logo-less
// tool gets its own unique colour rather than the same purple/blue.
function nameToGradient(name = '') {
    const hue = (name.charCodeAt(0) * 37 + (name.charCodeAt(1) || 0) * 17) % 360
    return `hsl(${hue},55%,28%)`
}

/**
 * Phase 4.1 — Badge system
 * Returns the highest-priority single badge to show on the card banner.
 * Priority: Editor's Pick > Top Rated > Trending > Forever Free > New
 */
function getBadge(tool) {
    const rating = tool.ratings?.average ?? 0
    const reviewCount = tool.ratings?.count ?? 0

    if (tool.humanVerified) {
        return {
            label: "Editor's Pick",
            icon: Crown,
            className: 'text-purple-300 bg-purple-600/80 border-purple-400/40',
        }
    }
    if (rating >= 4.5 && reviewCount >= 10) {
        return {
            label: 'Top Rated',
            icon: Star,
            className: 'text-amber-300 bg-amber-600/70 border-amber-400/40',
        }
    }
    if (tool.isTrending) {
        return {
            label: 'Trending',
            icon: TrendingUp,
            className: 'text-orange-300 bg-orange-600/70 border-orange-400/40',
        }
    }
    if (tool.pricing === 'Free') {
        return {
            label: 'Forever Free',
            icon: Zap,
            className: 'text-emerald-300 bg-emerald-600/70 border-emerald-400/40',
        }
    }
    const isNew = tool.isNew ?? (!tool.createdAt || (Date.now() - new Date(tool.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000))
    if (isNew) {
        return {
            label: 'New',
            icon: Sparkles,
            className: 'text-sky-300 bg-sky-600/70 border-sky-400/40',
        }
    }
    return null
}

export default function ToolCard({ tool }) {
    const [showCollectionModal, setShowCollectionModal] = useState(false)
    const [bannerError, setBannerError] = useState(false)
    const affiliateTrackingEnabled = useFlag('AFFILIATE_TRACKING')
    const { isSignedIn } = useUser()
    const { toast } = useToast()

    // VITE_API_URL already contains /api/v1 — strip it to get the root origin
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '')
    const visitHref = affiliateTrackingEnabled
        ? `${apiBase}/api/v1/tools/slug/${tool.slug}/visit?source=tool_card`
        : tool.officialUrl

    const formattedName = formatToolName(tool.name)
    const pricingDisplay = getPricingDisplay(tool.pricing)
    const pricingClass = PRICING_COLORS[pricingDisplay] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    const rating = tool.ratings?.average || 0
    const reviewCount = tool.ratings?.count || 0
    const rawLogoSrc = tool.screenshotUrl || tool.logo || tool.metadata?.logo || ''
    const logoSrc = getOptimizedImageUrl(rawLogoSrc)
    const showBanner = logoSrc && !bannerError

    // Phase 4.1: compute badge
    const badge = getBadge(tool)

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

                    {/* ── Phase 4.1 Badge — top-right ────────────────── */}
                    {badge && (() => {
                        const { icon: BadgeIcon, label, className } = badge
                        return (
                            <span className={`absolute top-2.5 right-2.5 z-10 flex items-center gap-1 text-xs font-bold uppercase tracking-widest backdrop-blur-sm px-2.5 py-1 rounded-full border ${className}`}>
                                <BadgeIcon size={12} />
                                {label}
                            </span>
                        )
                    })()}
                </div>

                {/* ── Card Body ──────────────────────────────────────── */}
                <div className="flex flex-col flex-1 px-4 pb-4 pt-3">

                    {/* Name + Rating */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3
                            className="text-base font-bold text-white leading-snug line-clamp-1 group-hover:text-purple-300 transition-colors"
                            title={formattedName}
                        >
                            {formattedName}
                        </h3>
                        {rating > 0 && (
                            <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5" title={`${reviewCount} reviews`}>
                                <Star size={12} className="fill-amber-400 text-amber-400" />
                                <span className="text-sm font-semibold text-amber-400">{rating.toFixed(1)}</span>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <p
                        className="text-sm text-gray-400 line-clamp-2 leading-relaxed mb-3 flex-1"
                        title={tool.shortDescription || tool.description || 'No description available.'}
                    >
                        {tool.shortDescription || tool.description || 'No description available.'}
                    </p>

                    {/* Tags */}
                    {tool.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                            {tool.tags.slice(0, 3).map((tag, i) => (
                                <span
                                    key={i}
                                    title={tag}
                                    className="text-xs px-2 py-1 rounded-md bg-white/5 text-gray-300 border border-white/10 truncate max-w-[100px]"
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border flex-shrink-0 ${pricingClass}`}>
                                {pricingDisplay}
                            </span>
                            
                            {/* Social proof */}
                            <div className="flex items-center gap-3 text-[10px] text-gray-500 leading-tight">
                                <div className="flex items-center gap-1 group-hover:text-amber-400 transition-colors">
                                    <TrendingUp size={10} />
                                    <span>{(tool.views || 0) + 124} viewing</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Add to collection */}
                            <div className="relative group/save">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        if (!isSignedIn) {
                                            toast({
                                                title: '⭐ Action required',
                                                description: 'Sign up free to save tools and build collections.',
                                                duration: 4000
                                            })
                                            return
                                        }
                                        setShowCollectionModal(true)
                                    }}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/10"
                                    title="Save to collection"
                                >
                                    <Plus size={16} />
                                </button>
                                {/* Tooltip for non-authenticated */}
                                {!isSignedIn && (
                                    <div className="absolute bottom-full right-0 mb-1.5 opacity-0 group-hover/save:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                        <div className="px-2.5 py-1 rounded-lg bg-purple-900/90 text-xs text-purple-200 border border-purple-500/30 backdrop-blur-sm shadow-xl">
                                            Sign up free to save
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Visit */}
                            {(tool.officialUrl || tool.url) && (
                                <a
                                    href={visitHref || tool.officialUrl || tool.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-colors shadow-md"
                                >
                                    Visit <ArrowUpRight size={14} />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </Link>

            <AddToCollectionModal
                isOpen={showCollectionModal}
                onClose={() => setShowCollectionModal(false)}
                toolId={tool._id || tool.objectID}
            />
        </>
    )
}
