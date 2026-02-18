import { ExternalLink, Heart, Share2, Check, TrendingUp, Star } from 'lucide-react';
import { getPricingDisplay, formatNumber, formatDate } from '../../utils/helpers';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

export default function ToolProductInfo({ tool, onClaim, onEmbed }) {
    const [isFavorite, setIsFavorite] = useState(false);

    if (!tool) return null;

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: tool.name,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied to clipboard!');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header: Badges & Title */}
            <div className="space-y-4">
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

                <h1 className="text-4xl font-bold text-white tracking-tight">{tool.name}</h1>

                {/* Rating & Stats Row */}
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-yellow-400">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-semibold text-white">{tool.ratings?.average?.toFixed(1) || '0.0'}</span>
                        <span className="text-gray-400">({tool.ratings?.count || 0} reviews)</span>
                    </div>
                    <span className="h-1 w-1 rounded-full bg-gray-600"></span>
                    <span className="text-gray-400">{formatNumber(tool.views || 0)} views</span>
                    <span className="h-1 w-1 rounded-full bg-gray-600"></span>
                    <span className="text-gray-400">Added {formatDate(tool.createdAt)}</span>
                </div>
            </div>

            {/* Price Tag */}
            <div className="flex items-baseline gap-2 pb-4 border-b border-white/10">
                <span className="text-3xl font-bold text-white">{getPricingDisplay(tool.pricing)}</span>
                {tool.pricing?.type !== 'Free' && (
                    <span className="text-sm text-gray-400">/ {tool.pricing?.billing || 'plan'}</span>
                )}
            </div>

            {/* Short Description */}
            <p className="text-lg text-gray-300 leading-relaxed">
                {tool.shortDescription}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4">
                <a
                    href={tool.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-purple-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]"
                >
                    Visit Website <ExternalLink className="h-5 w-5" />
                </a>

                <div className="flex gap-3">
                    <button
                        onClick={() => setIsFavorite(!isFavorite)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-6 py-3 font-medium transition-all hover:bg-white/5 ${isFavorite
                            ? 'border-red-500/50 text-red-400 bg-red-500/10'
                            : 'border-white/10 text-gray-300'
                            }`}
                    >
                        <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
                        {isFavorite ? 'Saved' : 'Save'}
                    </button>
                    <button
                        onClick={handleShare}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3 font-medium text-gray-300 transition-all hover:bg-white/5"
                    >
                        <Share2 className="h-5 w-5" />
                        Share
                    </button>
                    <button
                        onClick={onEmbed}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3 font-medium text-gray-300 transition-all hover:bg-white/5"
                        title="Embed Badge"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                        >
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                        Embed
                    </button>
                </div>
            </div>


            {/* Claim Tool Link */}
            {
                !tool.isVerified && (
                    <div className="pt-2 text-center">
                        <button
                            onClick={onClaim}
                            className="text-xs text-gray-500 hover:text-white underline underline-offset-4 transition-colors"
                        >
                            Is this your tool? Claim it to manage this page.
                        </button>
                    </div>
                )
            }
        </div >
    );
}
