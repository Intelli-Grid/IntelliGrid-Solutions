
import { useState, useEffect } from 'react'
import { Star, CheckCircle, ThumbsUp, ThumbsDown, MessageSquarePlus, User, AlertCircle } from 'lucide-react'
import { reviewService } from '../../services'
import LoadingSpinner from '../common/LoadingSpinner'
import ReviewForm from './ReviewForm'
import { formatDistanceToNow } from 'date-fns'

export default function ToolReviews({ tool }) {
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [stats, setStats] = useState({ average: 0, count: 0, distribution: {} })

    const fetchReviews = async () => {
        try {
            setLoading(true)
            const response = await reviewService.getToolReviews(tool._id)
            setReviews(response.reviews || [])

            // Map backend ratingDistribution to frontend format
            if (response.ratingDistribution) {
                const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
                let totalRating = 0
                let totalCount = 0

                response.ratingDistribution.forEach(item => {
                    dist[item._id] = item.count
                    totalRating += item._id * item.count
                    totalCount += item.count
                })

                setStats({
                    average: totalCount ? (totalRating / totalCount).toFixed(1) : 0,
                    count: totalCount,
                    distribution: dist
                })
            } else {
                setStats(calculateStats(response.reviews || []))
            }
        } catch (err) {
            console.error('Error fetching reviews:', err)
            setError('Failed to load reviews')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (tool?._id) {
            fetchReviews()
            // Initialize stats from tool details if available
            if (tool.ratings) {
                setStats(prev => ({
                    ...prev,
                    average: tool.ratings.average || 0,
                    count: tool.ratings.count || 0
                }))
            }
        }
    }, [tool])

    // Calculate stats if not provided by backend efficiently
    const calculateStats = (reviewsList) => {
        if (!reviewsList.length) return { average: 0, count: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } }

        const total = reviewsList.reduce((acc, r) => acc + r.rating, 0)
        const average = (total / reviewsList.length).toFixed(1)

        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        reviewsList.forEach(r => {
            distribution[r.rating] = (distribution[r.rating] || 0) + 1
        })

        return { average, count: reviewsList.length, distribution }
    }

    const displayedStats = stats.count ? stats : calculateStats(reviews)

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header / Summary */}
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between bg-white/5 rounded-2xl p-6 border border-white/5">
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <div className="text-5xl font-bold text-white mb-1">{displayedStats.average}</div>
                        <div className="flex gap-1 justify-center mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`h-4 w-4 ${star <= Math.round(displayedStats.average)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-600'
                                        }`}
                                />
                            ))}
                        </div>
                        <div className="text-sm text-gray-400">{displayedStats.count} Reviews</div>
                    </div>

                    {/* Distribution Bars */}
                    <div className="hidden md:block w-48 space-y-1">
                        {[5, 4, 3, 2, 1].map((rating) => {
                            const count = displayedStats.distribution?.[rating] || 0
                            const percentage = displayedStats.count ? (count / displayedStats.count) * 100 : 0
                            return (
                                <div key={rating} className="flex items-center gap-2 text-xs">
                                    <span className="w-3 text-gray-400">{rating}</span>
                                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-400 rounded-full"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <button
                    onClick={() => setIsFormOpen(true)}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/20"
                >
                    <MessageSquarePlus className="h-5 w-5" />
                    Write a Review
                </button>
            </div>

            {/* Reviews List */}
            {loading ? (
                <div className="py-12 flex justify-center">
                    <LoadingSpinner />
                </div>
            ) : reviews.length > 0 ? (
                <div className="grid gap-6">
                    {reviews.map((review) => (
                        <div key={review._id} className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                                        {review.user?.avatar ? (
                                            <img src={review.user.avatar} alt="User" className="h-full w-full rounded-full object-cover" />
                                        ) : (
                                            <User size={20} />
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-white flex items-center gap-2">
                                            {review.user?.firstName || 'Anonymous'}
                                            {review.isVerified && (
                                                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-500/20">
                                                    <CheckCircle size={10} /> Verified
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`h-4 w-4 ${star <= review.rating
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-700'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <h4 className="text-lg font-bold text-white mb-2">{review.title}</h4>
                            <p className="text-gray-300 leading-relaxed mb-4">{review.content}</p>

                            {/* Pros & Cons */}
                            {(review.pros?.length > 0 || review.cons?.length > 0) && (
                                <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                                    {review.pros?.length > 0 && (
                                        <div>
                                            <h5 className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <ThumbsUp size={12} /> Pros
                                            </h5>
                                            <ul className="space-y-1">
                                                {review.pros.map((pro, i) => (
                                                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                                                        <span className="text-green-500/50 mt-1">•</span> {pro}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {review.cons?.length > 0 && (
                                        <div>
                                            <h5 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <ThumbsDown size={12} /> Cons
                                            </h5>
                                            <ul className="space-y-1">
                                                {review.cons.map((con, i) => (
                                                    <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                                                        <span className="text-red-500/50 mt-1">•</span> {con}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No reviews yet</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        Be the first to share your experience with {tool.name}. Your feedback helps the community make better decisions.
                    </p>
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="text-purple-400 hover:text-purple-300 font-medium underline underline-offset-4"
                    >
                        Write the first review
                    </button>
                </div>
            )}

            <ReviewForm
                toolId={tool._id}
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSuccess={fetchReviews}
            />
        </div>
    )
}
