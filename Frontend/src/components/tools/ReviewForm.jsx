
import { useState } from 'react'
import { Star, X, ThumbsUp, ThumbsDown } from 'lucide-react'
import { reviewService, analyticsService } from '../../services'
import { useUser, SignInButton } from '@clerk/clerk-react'
import { toast } from 'react-hot-toast'

export default function ReviewForm({ toolId, isOpen, onClose, onSuccess }) {
    const { user, isSignedIn } = useUser()
    const [rating, setRating] = useState(0)
    const [hoverRating, setHoverRating] = useState(0)
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        pros: '',
        cons: ''
    })
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (rating === 0) {
            toast.error('Please select a rating')
            return
        }

        setLoading(true)
        try {
            const prosList = formData.pros.split('\n').filter(i => i.trim())
            const consList = formData.cons.split('\n').filter(i => i.trim())

            await reviewService.createReview({
                tool: toolId,
                rating,
                title: formData.title,
                content: formData.content,
                pros: prosList,
                cons: consList
            })

            // Fire analytics event — fire-and-forget
            analyticsService.trackEvent({
                eventType: 'review_submitted',
                data: { toolId, rating },
            }).catch(() => { })

            toast.success('Review submitted for approval!')
            onSuccess()
            onClose()
            // Reset form
            setFormData({ title: '', content: '', pros: '', cons: '' })
            setRating(0)
        } catch (error) {
            console.error('Submit review error:', error)
            toast.error(error.response?.data?.message || 'Failed to submit review')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-900 border border-white/10 shadow-2xl transition-all max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <X size={20} />
                </button>

                <div className="p-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Write a Review</h2>
                    <p className="text-gray-400 mb-6">Share your experience with this tool to help others.</p>

                    {!isSignedIn ? (
                        <div className="text-center py-8 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-gray-300 mb-4">Please sign in to write a review.</p>
                            <SignInButton mode="modal">
                                <button className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors">
                                    Sign In
                                </button>
                            </SignInButton>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Rating */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Overall Rating</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoverRating(star)}
                                            onMouseLeave={() => setHoverRating(0)}
                                            className="focus:outline-none transition-transform hover:scale-110"
                                        >
                                            <Star
                                                className={`h-8 w-8 ${star <= (hoverRating || rating)
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : 'text-gray-600'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Review Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Summarize your experience (e.g., 'Great for beginners, but lacks advanced features')"
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                            </div>

                            {/* Content */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Your Review</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    placeholder="What did you like or dislike? How are you using this tool?"
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                            </div>

                            {/* Pros & Cons */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                                        <ThumbsUp size={16} /> Pros
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.pros}
                                        onChange={(e) => setFormData({ ...formData, pros: e.target.value })}
                                        placeholder="One pro per line"
                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none focus:ring-1 focus:ring-green-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-red-400 mb-2 flex items-center gap-2">
                                        <ThumbsDown size={16} /> Cons
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.cons}
                                        onChange={(e) => setFormData({ ...formData, cons: e.target.value })}
                                        placeholder="One con per line"
                                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/50"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-6 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {loading ? 'Submitting...' : 'Submit Review'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
