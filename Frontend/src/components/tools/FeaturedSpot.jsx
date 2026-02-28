/**
 * FeaturedSpot.jsx
 *
 * Renders the "Sponsored" section on the homepage when the FEATURED_LISTINGS
 * feature flag is enabled and there are active paid listings.
 *
 * Design goals:
 *   - Clearly labelled "Sponsored" so users know it is commercial placement
 *   - Premium tier tools get a distinct purple ring, standard tier get subtle outline
 *   - Clicking "Visit" goes through the affiliate route if affiliateUrl is set,
 *     otherwise direct officialUrl — handled server-side; frontend just calls /api/v1/featured
 *   - Component is self-contained: fetches its own data, renders nothing while loading
 *     or when no active listings exist
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Star, Zap } from 'lucide-react'
import { useFlag } from '../../hooks/useFeatureFlags'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function FeaturedSpot() {
    const featuredEnabled = useFlag('FEATURED_LISTINGS')
    const [listings, setListings] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!featuredEnabled) {
            setLoading(false)
            return
        }

        const fetchListings = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/v1/featured`)
                const data = await res.json()
                setListings(data.listings || [])
            } catch (err) {
                console.warn('[FeaturedSpot] Failed to load listings:', err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchListings()
    }, [featuredEnabled])

    // Don't render anything until loaded, flag is off, or no active listings
    if (!featuredEnabled || loading || listings.length === 0) return null

    return (
        <section className="py-16 bg-[#08081a] border-t border-white/5">
            <div className="max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                            <Zap className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Featured Tools</h2>
                            <p className="text-xs text-gray-600 mt-0.5">Sponsored • Paid placement</p>
                        </div>
                    </div>
                </div>

                {/* Listing Cards Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {listings.map((listing) => {
                        const tool = listing.tool
                        if (!tool) return null
                        const isPremium = listing.tier === 'premium'
                        const visitHref = tool.affiliateUrl
                            ? tool.affiliateUrl
                            : tool.officialUrl
                        const logoSrc = tool.logo || ''
                        const rating = tool.ratings?.average || 0

                        return (
                            <div
                                key={listing._id}
                                className={`relative group flex flex-col rounded-2xl border bg-[#0d0d0d] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl overflow-hidden ${isPremium
                                    ? 'border-amber-500/40 hover:border-amber-500/70 hover:shadow-amber-500/10'
                                    : 'border-white/10 hover:border-purple-500/30 hover:shadow-purple-500/5'
                                    }`}
                            >
                                {/* Sponsored badge */}
                                <div className="absolute top-3 right-3 z-10">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400/80 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                                        {isPremium ? '⭐ Premium Sponsor' : 'Sponsored'}
                                    </span>
                                </div>

                                {/* Logo Banner */}
                                <div className={`relative h-28 flex items-center justify-center overflow-hidden ${isPremium
                                    ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/5'
                                    : 'bg-gradient-to-br from-purple-500/10 to-blue-500/5'
                                    }`}>
                                    {logoSrc ? (
                                        <img
                                            src={logoSrc}
                                            alt={tool.name}
                                            className="h-16 w-16 rounded-xl object-contain"
                                            onError={(e) => { e.target.style.display = 'none' }}
                                        />
                                    ) : (
                                        <span className="text-3xl font-black text-white/20">
                                            {tool.name?.charAt(0)?.toUpperCase()}
                                        </span>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0d0d0d] to-transparent" />
                                </div>

                                {/* Body */}
                                <div className="flex flex-1 flex-col gap-3 p-4 pt-3">
                                    <div>
                                        <h3 className="text-[15px] font-bold text-white mb-1 group-hover:text-purple-300 transition-colors line-clamp-1">
                                            {tool.name}
                                        </h3>
                                        <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2">
                                            {tool.shortDescription}
                                        </p>
                                    </div>

                                    {rating > 0 && (
                                        <div className="flex items-center gap-1">
                                            <Star size={11} className="fill-amber-400 text-amber-400" />
                                            <span className="text-[11px] font-semibold text-amber-400">{rating.toFixed(1)}</span>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-auto pt-2 border-t border-white/5">
                                        <Link
                                            to={`/tools/${tool.slug}`}
                                            className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-center text-[11px] font-semibold text-gray-400 hover:text-white hover:border-white/20 transition-all"
                                        >
                                            View Details
                                        </Link>
                                        <a
                                            href={visitHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-bold text-white transition-all ${isPremium
                                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/20'
                                                : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500'
                                                }`}
                                        >
                                            Visit <ExternalLink size={10} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Advertise CTA */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-600">
                        Want to feature your AI tool here?{' '}
                        <a
                            href="mailto:contact@intelligrid.online?subject=Featured Listing Enquiry"
                            className="text-amber-500/80 hover:text-amber-400 underline underline-offset-4 transition-colors"
                        >
                            Get in touch →
                        </a>
                    </p>
                </div>
            </div>
        </section>
    )
}
