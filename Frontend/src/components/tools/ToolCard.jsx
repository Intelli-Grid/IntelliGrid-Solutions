import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toolService } from '../../services'
import { Star, ExternalLink, TrendingUp, Loader2 } from 'lucide-react'
import { formatNumber, getPricingDisplay } from '../../utils/helpers'

export default function ToolCard({ tool }) {
    const handleVisit = () => {
        // View tracking will happen on tool details page
        // toolService.incrementViews(tool._id).catch(console.error)
    }

    return (
        <div className="group glass-card overflow-hidden transition-all duration-300 hover:scale-[1.02]">
            {/* Tool Header */}
            <div className="p-6">
                <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                        <Link
                            to={`/tools/${tool.slug}`}
                            className="text-xl font-bold text-white transition hover:text-purple-400"
                        >
                            {tool.name}
                        </Link>
                        {tool.isTrending && (
                            <span className="ml-2 inline-flex items-center space-x-1 rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-400">
                                <TrendingUp className="h-3 w-3" />
                                <span>Trending</span>
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-gray-400">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span>{tool.ratings?.average?.toFixed(1) || '0.0'}</span>
                        <span className="text-gray-600">({formatNumber(tool.ratings?.count || 0)})</span>
                    </div>
                </div>

                {/* Description */}
                <p className="mb-4 line-clamp-2 text-sm text-gray-400">{tool.shortDescription}</p>

                {/* Tags */}
                {tool.tags && tool.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                        {tool.tags.slice(0, 3).map((tag, index) => (
                            <span
                                key={index}
                                className="rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-400"
                            >
                                {tag}
                            </span>
                        ))}
                        {tool.tags.length > 3 && (
                            <span className="rounded-full bg-gray-500/10 px-3 py-1 text-xs text-gray-400">
                                +{tool.tags.length - 3} more
                            </span>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{formatNumber(tool.views || 0)} views</span>
                        <span>•</span>
                        <span className="font-medium text-purple-400">{getPricingDisplay(tool.pricing)}</span>
                    </div>
                    <a
                        href={tool.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleVisit}
                        className="flex items-center space-x-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
                    >
                        <span>Visit</span>
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </div>
            </div>
        </div>
    )
}
