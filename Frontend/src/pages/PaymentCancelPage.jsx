import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Shield, Zap, Clock, CheckCircle2 } from 'lucide-react'
import SEO from '../components/common/SEO'

// ─── Re-engagement survey options ────────────────────────────────────────────
const SURVEY_OPTIONS = [
    { id: 'price', label: 'Price is too high' },
    { id: 'time', label: 'I need more time with the free version' },
    { id: 'feature', label: 'Missing a feature I need' },
    { id: 'later', label: "I'll subscribe later" },
    { id: 'other', label: 'Other' },
]

export default function PaymentCancelPage() {
    const navigate = useNavigate()
    const [selectedReason, setSelectedReason] = useState(null)
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = () => {
        // Silent submission — we just track the reason locally
        // In a future iteration this can POST to /api/v1/analytics/event
        if (selectedReason) {
            setSubmitted(true)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space flex items-center justify-center px-4 py-16">
            <SEO
                title="Payment Cancelled | IntelliGrid"
                description="Your payment was cancelled. No charges were made. Your free trial continues."
                noindex={true}
            />

            <div className="w-full max-w-lg">

                {/* ── Main card ── */}
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden shadow-xl">

                    {/* Header */}
                    <div className="p-8 text-center border-b border-white/10 bg-white/5">
                        <div className="mb-4 flex justify-center">
                            <div className="rounded-full bg-amber-500/10 p-4 border border-amber-500/20">
                                <Clock className="h-10 w-10 text-amber-400" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-extrabold text-white mb-2">
                            No worries — your trial is still running
                        </h1>
                        <p className="text-sm text-gray-400">
                            You cancelled the checkout. <strong className="text-white">No charge was made.</strong>
                            <br />
                            Your 14-day free trial continues as normal.
                        </p>
                    </div>

                    {/* Re-engagement survey */}
                    <div className="p-6 border-b border-white/10">
                        {!submitted ? (
                            <>
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-base">👀</span>
                                    <p className="text-sm font-semibold text-white">
                                        Before you go — was there something holding you back?
                                    </p>
                                </div>
                                <p className="text-xs text-gray-500 mb-4">
                                    Your feedback helps us improve. This is completely anonymous.
                                </p>

                                <div className="space-y-2 mb-5">
                                    {SURVEY_OPTIONS.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => setSelectedReason(option.id)}
                                            className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150 flex items-center gap-3 ${selectedReason === option.id
                                                ? 'border-accent-purple bg-accent-purple/10 text-white'
                                                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white'
                                                }`}
                                        >
                                            <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-all ${selectedReason === option.id
                                                ? 'border-accent-purple bg-accent-purple'
                                                : 'border-gray-500'
                                                }`}>
                                                {selectedReason === option.id && (
                                                    <div className="w-1.5 h-1.5 bg-white rounded-full m-auto mt-[1px]" />
                                                )}
                                            </div>
                                            {option.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={!selectedReason}
                                        className="flex-1 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        Submit (anonymous)
                                    </button>
                                    <button
                                        onClick={() => setSubmitted(true)}
                                        className="px-4 py-2.5 rounded-xl text-sm text-gray-500 hover:text-white transition-colors"
                                    >
                                        Skip
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-3">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                <p className="text-sm font-semibold text-white mb-1">Thanks for your feedback!</p>
                                <p className="text-xs text-gray-500">We'll use this to make IntelliGrid better for everyone.</p>
                            </div>
                        )}
                    </div>

                    {/* What you're keeping on free tier */}
                    <div className="px-6 py-5 border-b border-white/10 bg-white/3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            You still have on your free account:
                        </p>
                        <ul className="space-y-2">
                            {[
                                'Browse all 4,000+ AI tools',
                                'Save up to 10 favourites',
                                'Create up to 2 collections',
                                'Write and read reviews',
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2.5 text-sm text-gray-400">
                                    <Zap className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Guarantee reminder */}
                    <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
                        <Shield className="w-5 h-5 text-accent-emerald flex-shrink-0" />
                        <p className="text-xs text-gray-400">
                            When you do subscribe, you're protected by our{' '}
                            <Link to="/refund-policy" className="text-accent-cyan hover:underline">
                                30-day money-back guarantee
                            </Link>
                            , no questions asked.
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="p-6 flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => navigate('/pricing')}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-purple px-6 py-3 font-bold text-white text-sm hover:opacity-90 hover:scale-[1.01] transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Pricing
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-medium text-gray-300 text-sm hover:bg-white/10 hover:text-white transition-all"
                        >
                            Continue with Free Plan
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                </div>

            </div>
        </div>
    )
}
