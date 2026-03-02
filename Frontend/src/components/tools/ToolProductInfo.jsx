import { ExternalLink, Heart, Share2, Check, TrendingUp, Star, Loader2, ArrowRight, Sparkles, BadgePercent } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPricingDisplay, formatNumber, formatDate, getInitials } from '../../utils/helpers';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useUser } from '@clerk/clerk-react';
import { userService } from '../../services';
import { useNudge } from '../common/NudgeContext';
import { useFlag } from '../../hooks/useFeatureFlags';

export default function ToolProductInfo({ tool, onClaim, onEmbed }) {
    const { isSignedIn } = useUser();
    const { fireNudgeFromError } = useNudge();
    const affiliateTrackingEnabled = useFlag('AFFILIATE_TRACKING');
    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);

    if (!tool) return null;

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title: tool.name, url: window.location.href });
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied to clipboard!');
        }
    };

    const handleFavoriteToggle = async () => {
        if (!isSignedIn) {
            toast.error('Sign in to save favourites');
            return;
        }
        setFavoriteLoading(true);
        try {
            if (isFavorite) {
                await userService.removeFavorite(tool._id);
                setIsFavorite(false);
                toast.success('Removed from favourites');
            } else {
                await userService.addFavorite(tool._id);
                setIsFavorite(true);
                toast.success('Saved to favourites ❤️');
            }
        } catch (err) {
            // Check for limit error — fire the upgrade nudge
            const msg = err?.response?.data?.message || err?.message || '';
            if (msg.includes('FAVORITES_LIMIT_REACHED')) {
                fireNudgeFromError(err);
            } else {
                toast.error(msg || 'Something went wrong');
            }
        } finally {
            setFavoriteLoading(false);
        }
    };

    // Extract clean domain from official URL for display
    const officialDomain = (() => {
        try {
            return new URL(tool.officialUrl || '').hostname.replace('www.', '')
        } catch { return '' }
    })()

    const logoSrc = tool.logo || tool.metadata?.logo || ''

    // Determine visit href:
    // - When AFFILIATE_TRACKING flag is ON → use the tracked redirect route
    //   The backend will log the click and redirect to affiliateUrl (if set) or officialUrl
    // - When flag is OFF → direct link to officialUrl (no tracking overhead)
    // VITE_API_URL already contains /api/v1 — strip it to get the root origin
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '')
    const visitHref = affiliateTrackingEnabled
        ? `${apiBase}/api/v1/tools/slug/${tool.slug}/visit?source=tool_page`
        : tool.officialUrl

    return (
        <div className="space-y-6">
            {/* Header: Logo + Badges + Title */}
            <div className="space-y-4">
                {/* Tool Identity Row */}
                <div className="flex items-center gap-4">
                    {/* Logo / Icon — 72px */}
                    <div className="relative flex-shrink-0">
                        {logoSrc ? (
                            <img
                                src={logoSrc}
                                alt={`${tool.name} logo`}
                                className="h-[72px] w-[72px] rounded-2xl object-cover border border-white/10 bg-white/5 shadow-xl ring-1 ring-white/5"
                                onError={(e) => {
                                    e.target.onerror = null
                                    e.target.style.display = 'none'
                                    e.target.nextSibling.style.display = 'flex'
                                }}
                            />
                        ) : null}
                        <div
                            className={`h-[72px] w-[72px] rounded-2xl bg-gradient-to-br from-purple-600/30 to-blue-700/30 border border-white/10 items-center justify-center text-2xl font-black text-white shadow-xl ring-1 ring-white/5 ${logoSrc ? 'hidden' : 'flex'}`}
                        >
                            {getInitials(tool.name)}
                        </div>
                        {tool.isVerified && (
                            <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-blue-500 border-2 border-gray-950 flex items-center justify-center shadow-lg">
                                <Check className="h-3 w-3 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                        {tool.isTrending && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400 border border-orange-500/20">
                                <TrendingUp className="h-3 w-3" /> Trending
                            </span>
                        )}
                        {tool.isNew && !tool.isTrending && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                                <Sparkles className="h-3 w-3" /> New
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-gray-400 border border-white/10">
                            {typeof tool.category === 'object' ? tool.category.name : tool.category}
                        </span>
                        {officialDomain && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-gray-500 border border-white/5">
                                🌐 {officialDomain}
                            </span>
                        )}
                    </div>
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
            <p className="text-base text-gray-400 leading-relaxed">
                {tool.shortDescription}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4">
                <a
                    href={visitHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-8 py-4 text-base font-bold text-white transition-all hover:from-purple-500 hover:to-violet-500 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-[1.01] active:scale-[0.99]"
                >
                    Visit Website <ExternalLink className="h-4.5 w-4.5" />
                </a>

                {/* Affiliate commission hint — only shown when tracking is active + approved */}
                {affiliateTrackingEnabled && tool.affiliateStatus === 'approved' && tool.affiliateNetwork && tool.affiliateNetwork !== 'none' && (
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-600">
                        <BadgePercent size={11} className="text-green-600" />
                        <span>
                            We may earn a{tool.commissionType === 'recurring' ? ' recurring' : ''} commission via{' '}
                            <span className="capitalize text-gray-500">{tool.affiliateNetwork}</span>
                            {tool.commissionRate ? ` (${tool.commissionRate})` : ''} — at no extra cost to you.
                        </span>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        id="favorite-btn"
                        onClick={handleFavoriteToggle}
                        disabled={favoriteLoading}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-6 py-3 font-medium transition-all hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed ${isFavorite
                            ? 'border-red-500/50 text-red-400 bg-red-500/10'
                            : 'border-white/10 text-gray-300'
                            }`}
                    >
                        {favoriteLoading
                            ? <Loader2 className="h-5 w-5 animate-spin" />
                            : <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
                        }
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


            {/* Alternatives CTA */}
            <div className="pt-4 border-t border-white/5">
                <Link
                    to={`/alternatives/${tool.slug}`}
                    className="group flex items-center justify-between w-full px-4 py-3 rounded-xl bg-white/3 border border-white/8 hover:bg-white/6 hover:border-purple-500/20 transition-all duration-200"
                >
                    <div>
                        <div className="text-sm font-semibold text-white">Looking for alternatives?</div>
                        <div className="text-xs text-gray-500 mt-0.5">See the best {tool.name} alternatives</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                </Link>
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
