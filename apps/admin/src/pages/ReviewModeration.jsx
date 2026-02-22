
import { useState, useEffect } from 'react'
import { Check, X, Star, Clock, AlertCircle, Search, MessageSquare, Loader2, User } from 'lucide-react'
import { adminService } from '../services'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const ReviewModeration = () => {
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(null) // ID being processed

    useEffect(() => {
        fetchReviews()
    }, [])

    const fetchReviews = async () => {
        try {
            const response = await adminService.getPendingReviews()
            if (response.success) {
                setReviews(response.reviews)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to load pending reviews')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id) => {
        setProcessing(id)
        const loadToast = toast.loading('Approving review...')
        try {
            // Need approveReview method in service
            await adminService.approveReview(id) // Missing in index.js likely
            setReviews(prev => prev.filter(r => r._id !== id))
            toast.success('Review approved', { id: loadToast })
        } catch (error) {
            toast.error('Failed to approve review', { id: loadToast })
        } finally {
            setProcessing(null)
        }
    }

    const handleReject = async (id) => {
        setProcessing(id)
        const loadToast = toast.loading('Rejecting review...')
        try {
            // Need rejectReview method in service
            await adminService.rejectReview(id) // Missing in index.js likely
            setReviews(prev => prev.filter(r => r._id !== id))
            toast.success('Review rejected', { id: loadToast })
        } catch (error) {
            toast.error('Failed to reject review', { id: loadToast })
        } finally {
            setProcessing(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 mb-1">Review Moderation</h1>
                    <p className="text-slate-400 text-sm">Moderate user reviews to ensure quality and relevance.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search reviews..."
                        className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 w-full sm:w-64 transition-colors"
                    />
                </div>
            </div>

            {/* List */}
            {reviews.length === 0 ? (
                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                        <Check className="text-emerald-500" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-200 mb-2">No Pending Reviews</h3>
                    <p className="text-slate-500 max-w-sm">All reviews have been moderated. Good job!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {reviews.map(review => (
                        <div key={review._id} className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-5 hover:border-[#3a3d4a] transition-all group">
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                                {/* Review Content */}
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 bg-[#222530] px-2 py-1 rounded text-amber-400 text-xs font-bold border border-[#2a2d3a]">
                                            <Star size={12} fill="currentColor" />
                                            {review.rating}
                                        </div>
                                        <span className="text-slate-200 font-semibold">{review.title}</span>
                                        <span className="text-slate-500 text-sm">• for <span className="text-indigo-400 font-medium">{review.tool?.name || 'Unknown Tool'}</span></span>
                                    </div>

                                    <p className="text-slate-400 text-sm leading-relaxed bg-[#222530]/50 p-3 rounded-lg border border-[#2a2d3a]/50">
                                        "{review.content}"
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                {review.user?.firstName?.[0] || 'U'}
                                            </div>
                                            <span className="text-slate-400">
                                                {review.user ? `${review.user.firstName} ${review.user.lastName || ''}` : 'Anonymous'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {review.createdAt ? formatDistanceToNow(new Date(review.createdAt), { addSuffix: true }) : 'Unknown'}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-row sm:flex-col gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                                    <button
                                        onClick={() => handleApprove(review._id)}
                                        disabled={processing === review._id}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-colors disabled:opacity-50"
                                    >
                                        {processing === review._id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(review._id)}
                                        disabled={processing === review._id}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#222530] hover:bg-red-500/10 text-slate-400 hover:text-red-400 text-xs font-medium rounded-lg border border-[#2a2d3a] hover:border-red-500/30 transition-colors disabled:opacity-50"
                                    >
                                        <X size={14} />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ReviewModeration
