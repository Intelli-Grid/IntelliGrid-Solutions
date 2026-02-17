import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, ExternalLink, TrendingUp, Sparkles, Plus, Eye, Globe } from 'lucide-react'
import { formatNumber, getPricingDisplay, formatToolName, getInitials } from '../../utils/helpers'
import AddToCollectionModal from './AddToCollectionModal'

export default function ToolCard({ tool }) {
    const [showCollectionModal, setShowCollectionModal] = useState(false)

    const handleVisit = (e) => {
        e.stopPropagation()
    }

    const formattedName = formatToolName(tool.name)
    const pricingDisplay = getPricingDisplay(tool.pricing)
    const viewCount = tool.views || 0
    const rating = tool.ratings?.average || 0
    const reviewCount = tool.ratings?.count || 0

    // Dynamic Tag Logic
    const isNew = viewCount < 50 && (!tool.createdAt || new Date() - new Date(tool.createdAt) < 7 * 24 * 60 * 60 * 1000)
    const isOpenSource = tool.tags?.some(t => t.toLowerCase() === 'open source' || t.toLowerCase() === 'github')

    // Determine badge color based on pricing
    const getPricingColor = (display) => {
        if (display === 'Free' || display === 'Open Source') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
        if (display === 'Freemium') return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
        if (display === 'Paid' || display.startsWith('$')) return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    }

    return (
        <>
            <div className="group relative bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:border-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 h-full flex flex-col">

                {/* Header Gradient (Subtle) */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col relative z-10">

                    {/* Top Row: Logo & Badges */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="relative">
                            {tool.logo ? (
                                <img
                                    src={tool.logo}
                                    alt={formattedName}
                                    className="h-12 w-12 rounded-xl object-cover bg-white/5 border border-white/10"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div
                                className={`h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center text-lg font-bold text-white ${tool.logo ? 'hidden' : 'flex'}`}
                            >
                                {getInitials(formattedName)}
                            </div>

                            {/* Verification/Official Indicator (Optional) */}
                            {tool.verified && (
                                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-[#0A0A0A]">
                                    <Sparkles size={8} className="text-white" fill="currentColor" />
                                </div>
                            )}
                        </div>

                        {/* Badges */}
                        <div className="flex flex-col items-end gap-1.5">
                            {tool.isTrending && (
                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 animate-pulse">
                                    <TrendingUp size={10} /> Trending
                                </span>
                            )}
                            {isNew && !tool.isTrending && (
                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                                    <Sparkles size={10} /> New
                                </span>
                            )}
                            {rating > 0 ? (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded-full border border-white/10">
                                    <Star size={10} className="fill-yellow-400 text-yellow-400" />
                                    <span className="text-xs font-bold text-white">{rating.toFixed(1)}</span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Title & Description */}
                    <div className="mb-4">
                        <Link
                            to={`/tools/${tool.slug}`}
                            className="block text-lg font-bold text-white mb-2 leading-tight hover:text-purple-400 transition-colors line-clamp-1"
                            title={tool.name}
                        >
                            {formattedName}
                        </Link>
                        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                            {tool.shortDescription || tool.description || 'No description available.'}
                        </p>
                    </div>

                    {/* Tags (Limited) */}
                    <div className="flex flex-wrap gap-1.5 mb-4 mt-auto">
                        {tool.tags?.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5 truncate max-w-[80px]">
                                {tag}
                            </span>
                        ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded border w-fit ${getPricingColor(pricingDisplay)}`}>
                                {isOpenSource && pricingDisplay === 'Custom' ? 'Open Source' : pricingDisplay}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.preventDefault()
                                    setShowCollectionModal(true)
                                }}
                                className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
                                title="Add to Collection"
                            >
                                <Plus size={16} />
                            </button>

                            <a
                                href={tool.officialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={handleVisit}
                                className="h-8 px-3 flex items-center gap-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-gray-200 transition-colors shadow-lg shadow-white/5"
                            >
                                Visit <ExternalLink size={12} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <AddToCollectionModal
                isOpen={showCollectionModal}
                onClose={() => setShowCollectionModal(false)}
                toolId={tool._id}
            />
        </>
    )
}
