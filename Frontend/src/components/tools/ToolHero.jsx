import { ExternalLink, Check, TrendingUp, Star } from 'lucide-react';
import { getPricingDisplay } from '../../utils/helpers';

export default function ToolHero({ tool }) {
    if (!tool) return null;

    return (
        <div className="relative overflow-hidden rounded-3xl bg-gray-900 border border-white/10 shadow-2xl">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-black/80 blur-3xl" />

            <div className="relative z-10 p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-start justify-between gap-8">

                    {/* Left: Logo & Title */}
                    <div className="flex flex-col md:flex-row items-start gap-6">
                        {/* Huge Logo Card */}
                        <div className="h-24 w-24 md:h-32 md:w-32 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2 shadow-xl backdrop-blur-sm">
                            <img
                                src={tool.metadata?.logo || tool.logo || 'https://via.placeholder.com/128'}
                                alt={`${tool.name} logo`}
                                className="h-full w-full object-contain rounded-xl"
                            />
                        </div>

                        <div className="space-y-4">
                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-2">
                                {tool.isVerified && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 border border-blue-500/20">
                                        <Check className="h-3 w-3" /> Verified
                                    </span>
                                )}
                                {tool.isTrending && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400 border border-orange-500/20">
                                        <TrendingUp className="h-3 w-3" /> Trending
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-gray-400 border border-white/10">
                                    {typeof tool.category === 'object' ? tool.category.name : tool.category}
                                </span>
                            </div>

                            {/* Title */}
                            <div>
                                <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight text-balance">
                                    {tool.name}
                                </h1>
                                <p className="mt-2 text-lg text-gray-400 max-w-2xl text-balance">
                                    {tool.shortDescription}
                                </p>
                            </div>

                            {/* Mini Stats */}
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                    <span className="font-semibold text-white">{tool.ratings?.average?.toFixed(1) || '0.0'}</span>
                                    <span>({tool.ratings?.count || 0} reviews)</span>
                                </div>
                                <span className="h-1 w-1 rounded-full bg-gray-600"></span>
                                <span>{getPricingDisplay(tool.pricing)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Primary Action */}
                    <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
                        <a
                            href={tool.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-purple-600 px-8 py-4 font-semibold text-white transition-all duration-300 hover:bg-purple-500 hover:scale-105 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                        >
                            <span>Visit Website</span>
                            <ExternalLink className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />

                            {/* Shine effect */}
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:animate-shimmer" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
