import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toolService } from '../../services'
import { Star, ExternalLink, TrendingUp, Sparkles } from 'lucide-react'
import { formatNumber, getPricingDisplay } from '../../utils/helpers'

export default function ToolCard({ tool }) {
    const handleVisit = () => {
        // View tracking will happen on tool details page
        // toolService.incrementViews(tool._id).catch(console.error)
    }

    return (
        <div className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:border-accent-cyan/50 hover:shadow-glow-cyan">
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/0 to-accent-purple/0 group-hover:from-accent-cyan/5 group-hover:to-accent-purple/5 transition-all duration-300 pointer-events-none"></div>

            {/* Tool Header */}
            <div className="relative p-6">
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                        <Link
                            to={`/tools/${tool.slug}`}
                            className="text-xl font-bold text-white transition-all duration-300 hover:text-transparent hover:bg-gradient-to-r hover:from-accent-cyan hover:to-accent-purple hover:bg-clip-text inline-block"
                        >
                            {tool.name}
                        </Link>
                        {tool.isTrending && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-accent-amber/20 to-accent-rose/20 border border-accent-amber/30 px-3 py-1 text-xs font-semibold text-accent-amber animate-pulse">
                                <TrendingUp className="h-3 w-3" />
                                <span>Trending</span>
                            </span>
                        )}
                        {tool.isFeatured && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-accent-purple/20 to-accent-rose/20 border border-accent-purple/30 px-3 py-1 text-xs font-semibold text-accent-purple">
                                <Sparkles className="h-3 w-3" />
                                <span>Featured</span>
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
                        <Star className="h-4 w-4 fill-accent-amber text-accent-amber" />
                        <span className="text-sm font-semibold text-white">{tool.ratings?.average?.toFixed(1) || '0.0'}</span>
                        <span className="text-xs text-gray-400">({formatNumber(tool.ratings?.count || 0)})</span>
                    </div>
                </div>

                {/* Description */}
                <p className="mb-4 line-clamp-2 text-sm text-gray-300 leading-relaxed">{tool.shortDescription}</p>

                {/* Tags */}
                {tool.tags && tool.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                        {tool.tags.slice(0, 3).map((tag, index) => (
                            <span
                                key={index}
                                className="rounded-full bg-gradient-to-r from-accent-purple/10 to-accent-cyan/10 border border-accent-purple/20 px-3 py-1 text-xs font-medium text-accent-purple hover:border-accent-purple/40 transition-all"
                            >
                                {tag}
                            </span>
                        ))}
                        {tool.tags.length > 3 && (
                            <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-medium text-gray-400">
                                +{tool.tags.length - 3} more
                            </span>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan"></span>
                            {formatNumber(tool.views || 0)} views
                        </span>
                        <span className="font-semibold text-accent-emerald">{getPricingDisplay(tool.pricing)}</span>
                    </div>
                    <a
                        href={tool.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleVisit}
                        className="group/btn flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-purple px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:shadow-lg hover:scale-105"
                    >
                        <span>Visit</span>
                        <ExternalLink className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                    </a>
                </div>
            </div>
        </div>
    )
}
