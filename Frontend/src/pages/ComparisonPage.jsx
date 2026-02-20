
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { toolService, userService } from '../services'
import LoadingSpinner from '../components/common/LoadingSpinner'
import SEO from '../components/common/SEO'
import { Check, X, ArrowLeft, Star } from 'lucide-react'
import { formatNumber } from '../utils/helpers'

export default function ComparisonPage() {
    const { slugs } = useParams()
    const { user, isLoaded } = useUser()
    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [subscription, setSubscription] = useState(null)

    useEffect(() => {
        const loadData = async () => {
            if (!slugs) return

            try {
                setLoading(true)

                // Fetch Tools
                const slugList = slugs.split('-vs-')
                const response = await toolService.compareTools(slugList)
                // Sort tools to match the requests order
                const sortedTools = slugList.map(slug =>
                    response.find(t => t.slug === slug)
                ).filter(Boolean)
                setTools(sortedTools)

                if (sortedTools.length < 2) {
                    setError('Could not find all tools to compare')
                }

                // Fetch Subscription if user is logged in
                if (user) {
                    try {
                        const stats = await userService.getStats()
                        setSubscription(stats.subscription)
                    } catch (e) {
                        console.error("Failed to fetch subscription", e)
                    }
                }

            } catch (err) {
                console.error('Error fetching comparison:', err)
                setError('Failed to load comparison data')
            } finally {
                setLoading(false)
            }
        }

        if (isLoaded) {
            loadData()
        }
    }, [slugs, isLoaded, user])

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-950"><LoadingSpinner /></div>

    if (error || tools.length < 2) return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-950 text-white">
            <p className="text-xl text-red-400 mb-4">{error || 'Comparison not found'}</p>
            <Link to="/tools" className="text-purple-400 hover:text-purple-300 flex items-center gap-2">
                <ArrowLeft size={20} /> Back to Tools
            </Link>
        </div>
    )

    const [tool1, tool2] = tools

    // Winner Logic
    const getRatingWinner = () => {
        if ((tool1.ratings?.average || 0) > (tool2.ratings?.average || 0)) return tool1._id
        if ((tool2.ratings?.average || 0) > (tool1.ratings?.average || 0)) return tool2._id
        return null // Tie
    }

    const getPopularityWinner = () => {
        if ((tool1.views || 0) > (tool2.views || 0)) return tool1._id
        if ((tool2.views || 0) > (tool1.views || 0)) return tool2._id
        return null // Tie
    }

    const ratingWinner = getRatingWinner()
    const popularityWinner = getPopularityWinner()

    // Match User model enum: 'Free' | 'Basic' | 'Premium' | 'Enterprise'
    const PAID_TIERS = ['Premium', 'Enterprise', 'Basic']
    const isPro = PAID_TIERS.includes(subscription?.tier) && subscription?.status === 'active'

    return (
        <div className="min-h-screen bg-gray-950 text-white py-16 px-4">
            <SEO
                title={`${tool1.name} vs ${tool2.name} - Comparison | IntelliGrid`}
                description={`Compare ${tool1.name} and ${tool2.name}. Side-by-side comparison of features, pricing, ratings, and reviews to help you decide.`}
                canonicalUrl={`https://www.intelligrid.online/compare/${slugs}`}
                ogType="article"
            />

            <div className="container mx-auto max-w-6xl">
                {/* Header */}
                <div className="mb-12 text-center">
                    <Link to="/tools" className="inline-flex items-center text-gray-400 hover:text-white mb-6">
                        <ArrowLeft size={16} className="mr-2" /> Back to Tools
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        <span className="text-purple-400">{tool1.name}</span> <span className="text-gray-500">vs</span> <span className="text-blue-400">{tool2.name}</span>
                    </h1>
                    <p className="text-xl text-gray-400">Side-by-side comparison to help you choose the right tool.</p>
                </div>

                {/* Comparison Table */}
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="p-6 text-left w-1/3 text-gray-400 uppercase tracking-wider text-sm font-semibold">Feature</th>
                                <th className="p-6 text-center w-1/3 text-xl font-bold text-purple-400">{tool1.name}</th>
                                <th className="p-6 text-center w-1/3 text-xl font-bold text-blue-400">{tool2.name}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {/* Pricing */}
                            <tr>
                                <td className="p-6 font-medium text-gray-300">Pricing Model</td>
                                <td className="p-6 text-center">
                                    <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm">
                                        {tool1.pricing?.type || 'Unknown'}
                                    </span>
                                </td>
                                <td className="p-6 text-center">
                                    <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm">
                                        {tool2.pricing?.type || 'Unknown'}
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td className="p-6 font-medium text-gray-300">Starting Price</td>
                                <td className="p-6 text-center text-lg">{tool1.pricing?.price ? `$${tool1.pricing.price}` : 'Free / Custom'}</td>
                                <td className="p-6 text-center text-lg">{tool2.pricing?.price ? `$${tool2.pricing.price}` : 'Free / Custom'}</td>
                            </tr>

                            {/* Ratings (Winner Highlight) */}
                            <tr className="bg-white/5">
                                <td className="p-6 font-medium text-gray-300 flex items-center gap-2">
                                    User Rating
                                </td>
                                <td className={`p-6 text-center relative ${ratingWinner === tool1._id ? 'bg-purple-500/10' : ''}`}>
                                    {ratingWinner === tool1._id && <span className="absolute top-2 right-2 text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">WINNER</span>}
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1 text-yellow-400 font-bold text-2xl">
                                            {tool1.ratings?.average?.toFixed(1) || '0.0'} <Star className="fill-yellow-400 h-5 w-5" />
                                        </div>
                                        <span className="text-sm text-gray-500 mt-1">{tool1.ratings?.count || 0} reviews</span>
                                    </div>
                                </td>
                                <td className={`p-6 text-center relative ${ratingWinner === tool2._id ? 'bg-blue-500/10' : ''}`}>
                                    {ratingWinner === tool2._id && <span className="absolute top-2 right-2 text-[10px] bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">WINNER</span>}
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1 text-yellow-400 font-bold text-2xl">
                                            {tool2.ratings?.average?.toFixed(1) || '0.0'} <Star className="fill-yellow-400 h-5 w-5" />
                                        </div>
                                        <span className="text-sm text-gray-500 mt-1">{tool2.ratings?.count || 0} reviews</span>
                                    </div>
                                </td>
                            </tr>

                            {/* Popularity (Winner Highlight) */}
                            <tr>
                                <td className="p-6 font-medium text-gray-300">Popularity</td>
                                <td className={`p-6 text-center relative ${popularityWinner === tool1._id ? 'bg-purple-500/10' : ''}`}>
                                    {popularityWinner === tool1._id && <span className="absolute top-2 right-2 text-[10px] bg-green-500 text-black px-2 py-0.5 rounded-full font-bold">POPULAR</span>}
                                    <div className="font-semibold text-lg">{tool1.views?.toLocaleString() || 0} views</div>
                                </td>
                                <td className={`p-6 text-center relative ${popularityWinner === tool2._id ? 'bg-blue-500/10' : ''}`}>
                                    {popularityWinner === tool2._id && <span className="absolute top-2 right-2 text-[10px] bg-green-500 text-black px-2 py-0.5 rounded-full font-bold">POPULAR</span>}
                                    <div className="font-semibold text-lg">{tool2.views?.toLocaleString() || 0} views</div>
                                </td>
                            </tr>

                            {/* Category */}
                            <tr>
                                <td className="p-6 font-medium text-gray-300">Category</td>
                                <td className="p-6 text-center">{typeof tool1.category === 'object' ? tool1.category.name : tool1.category}</td>
                                <td className="p-6 text-center">{typeof tool2.category === 'object' ? tool2.category.name : tool2.category}</td>
                            </tr>

                            {/* Verified Status */}
                            <tr>
                                <td className="p-6 font-medium text-gray-300">Verified</td>
                                <td className="p-6 text-center flex justify-center">{tool1.isVerified ? <Check className="text-green-400" /> : <X className="text-gray-600" />}</td>
                                <td className="p-6 text-center flex justify-center">{tool2.isVerified ? <Check className="text-green-400" /> : <X className="text-gray-600" />}</td>
                            </tr>

                            {/* Visit Buttons */}
                            <tr className="bg-white/5">
                                <td className="p-6 font-medium text-gray-300">Action</td>
                                <td className="p-6 text-center">
                                    <a href={tool1.officialUrl} target="_blank" rel="noopener" className="inline-block w-full max-w-[200px] rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 font-bold hover:shadow-lg hover:shadow-purple-500/20 transition transform hover:-translate-y-1">
                                        Visit Website
                                    </a>
                                </td>
                                <td className="p-6 text-center">
                                    <a href={tool2.officialUrl} target="_blank" rel="noopener" className="inline-block w-full max-w-[200px] rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 font-bold hover:shadow-lg hover:shadow-blue-500/20 transition transform hover:-translate-y-1">
                                        Visit Website
                                    </a>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Summaries */}
                <div className="mt-12 grid gap-8 md:grid-cols-2">
                    <div className="rounded-xl bg-white/5 p-8 border border-white/10 hover:border-purple-500/30 transition">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-2xl font-bold text-purple-400">{tool1.name}</h3>
                            {ratingWinner === tool1._id && <span className="px-3 py-1 bg-yellow-400/20 text-yellow-400 text-xs font-bold rounded-full">Top Rated</span>}
                        </div>
                        <p className="text-gray-300 leading-relaxed mb-6">{tool1.shortDescription}</p>
                        <h4 className="font-semibold text-white mb-2">Key Highlights:</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-center gap-2"><Check size={14} className="text-green-400" /> {formatNumber(tool1.views)} Users Interested</li>
                            <li className="flex items-center gap-2"><Check size={14} className="text-green-400" /> {tool1.pricing?.type} Model</li>
                            <li className="flex items-center gap-2"><Check size={14} className="text-green-400" /> {tool1.ratings?.count} Verified Reviews</li>
                        </ul>
                    </div>
                    <div className="rounded-xl bg-white/5 p-8 border border-white/10 hover:border-blue-500/30 transition">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-2xl font-bold text-blue-400">{tool2.name}</h3>
                            {ratingWinner === tool2._id && <span className="px-3 py-1 bg-yellow-400/20 text-yellow-400 text-xs font-bold rounded-full">Top Rated</span>}
                        </div>
                        <p className="text-gray-300 leading-relaxed mb-6">{tool2.shortDescription}</p>
                        <h4 className="font-semibold text-white mb-2">Key Highlights:</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li className="flex items-center gap-2"><Check size={14} className="text-green-400" /> {formatNumber(tool2.views)} Users Interested</li>
                            <li className="flex items-center gap-2"><Check size={14} className="text-green-400" /> {tool2.pricing?.type} Model</li>
                            <li className="flex items-center gap-2"><Check size={14} className="text-green-400" /> {tool2.ratings?.count} Verified Reviews</li>
                        </ul>
                    </div>
                </div>

                {/* Verdict Section */}
                <div className="mt-12 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 border border-white/10 text-center relative overflow-hidden">
                    {isPro ? (
                        <>
                            <h3 className="text-2xl font-bold text-white mb-4">The Verdict</h3>
                            <p className="text-gray-300 max-w-2xl mx-auto mb-6">
                                If you are looking for a <strong>{tool1.pricing?.type === 'Free' ? 'Free' : 'Premium'}</strong> solution with
                                {ratingWinner === tool1._id ? ' higher user satisfaction' : ' a solid feature set'}, <strong>{tool1.name}</strong> is a great choice.
                                However, if you prioritize {ratingWinner === tool2._id ? 'top-tier community ratings' : 'popularity and market presence'},
                                <strong>{tool2.name}</strong> might be the better fit.
                            </p>
                            <Link to="/tools" className="text-purple-400 hover:text-purple-300 font-medium">Compare more AI Tools &rarr;</Link>
                        </>
                    ) : (
                        <div className="relative z-10">
                            <div className="filter blur-sm select-none opacity-50">
                                <h3 className="text-2xl font-bold text-white mb-4">The Verdict</h3>
                                <p className="text-gray-300 max-w-2xl mx-auto mb-6">
                                    If you are looking for a Premium solution with higher user satisfaction, Tool A is a great choice.
                                    However, if you prioritize popularity and market presence, Tool B might be the better fit.
                                </p>
                            </div>
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                                <h3 className="text-2xl font-bold text-white mb-2">Unlock The Verdict</h3>
                                <p className="text-gray-400 mb-6">Upgrade to Pro to see our detailed AI comparison analysis.</p>
                                <Link to="/pricing" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-bold hover:shadow-lg transition">
                                    Unlock Pro
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
