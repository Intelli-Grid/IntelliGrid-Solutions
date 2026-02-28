import { useState } from 'react'
import { newsletterService } from '../../services'
import { toast } from 'react-hot-toast'
import LoadingSpinner from './LoadingSpinner'
import { Mail } from 'lucide-react'
import { useFlag } from '../../hooks/useFeatureFlags'

export default function NewsletterForm({ source = 'website', className = '' }) {
    const newsletterEnabled = useFlag('NEWSLETTER_SIGNUP')
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    // Don't render when flag is OFF — zero UI impact on live site
    if (!newsletterEnabled) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email) return

        try {
            setLoading(true)
            await newsletterService.subscribe(email, source)
            setSuccess(true)
            toast.success('Successfully subscribed to the newsletter!')
            setEmail('')
        } catch (error) {
            console.error('Newsletter error:', error)
            toast.error(error.response?.data?.message || 'Failed to subscribe. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className={`p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 text-center ${className}`}>
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">You're on the list!</h3>
                <p className="text-gray-300">Thanks for subscribing. Keep an eye on your inbox for the latest AI tools and updates.</p>
                <button
                    onClick={() => setSuccess(false)}
                    className="mt-4 text-sm text-green-400 hover:text-green-300 underline"
                >
                    Subscribe another email
                </button>
            </div>
        )
    }

    return (
        <div className={`p-8 rounded-3xl bg-gradient-to-br from-purple-900/50 via-purple-900/30 to-gray-900/50 border border-purple-500/20 relative overflow-hidden group ${className}`}>
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>

            <div className="relative z-10 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3 group-hover:rotate-6 transition-transform duration-300">
                    <Mail className="w-8 h-8 text-purple-400" />
                </div>

                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    Get the Weekly AI Digest
                </h2>
                <p className="text-gray-400 mb-8 text-lg">
                    Join 10,000+ founders and builders. Get the latest AI tools and trends delivered to your inbox every Tuesday. No spam, ever.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        required
                        className="flex-1 px-5 py-4 rounded-xl bg-gray-950/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg shadow-purple-500/25"
                    >
                        {loading ? <LoadingSpinner size="sm" color="white" /> : 'Subscribe Free'}
                    </button>
                </form>

                <p className="mt-4 text-xs text-gray-500">
                    By subscribing, you agree to our Terms and Privacy Policy.
                </p>
            </div>
        </div>
    )
}
