/**
 * CancellationRescueModal.jsx
 *
 * Exit-intent interstitial shown when a Pro/Premium user clicks "Cancel Subscription".
 * Only rendered when the CANCELLATION_RESCUE feature flag is ON.
 *
 * Flow:
 *   1. User clicks "Cancel Subscription" button on Dashboard
 *   2. This modal opens (instead of immediately cancelling)
 *   3. Modal shows: what they lose + a pause offer + a downgrade offer
 *   4. User either:
 *      a. Clicks "Keep My Plan" → modal closes, nothing happens
 *      b. Clicks "Yes, Cancel Anyway" → onConfirmCancel() fires → subscription cancelled
 *
 * Props:
 *   isOpen        — boolean, controls visibility
 *   onClose       — called when user chooses to keep their plan
 *   onConfirmCancel — called when user confirms cancellation
 *   planName      — string, e.g. "Professional" (for copy personalisation)
 *   isLoading     — boolean, shows spinner on the confirm button during API call
 */

import { useEffect } from 'react'
import { X, Zap, Heart, Folder, Star, LifeBuoy, Gift, TrendingDown } from 'lucide-react'
import { Link } from 'react-router-dom'

const FEATURES_AT_RISK = [
    { icon: Heart, label: 'Unlimited Favourites', sub: 'Limited to 10 on free plan' },
    { icon: Folder, label: 'Unlimited Collections', sub: 'Limited to 2 on free plan' },
    { icon: Star, label: 'Ad-free Experience', sub: 'Ads return on free plan' },
    { icon: Zap, label: 'Advanced Search Filters', sub: 'Basic filters only on free plan' },
]

export default function CancellationRescueModal({
    isOpen,
    onClose,
    onConfirmCancel,
    planName = 'Professional',
    isLoading = false,
}) {
    // Trap focus and prevent body scroll while open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-[99] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rescue-modal-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0d1a] shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                {/* Close button */}
                <button
                    id="rescue-modal-close"
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Close"
                >
                    <X size={16} />
                </button>

                {/* Header */}
                <div className="px-6 pt-6 pb-5 border-b border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500/30 to-orange-500/20 flex items-center justify-center">
                            <TrendingDown size={17} className="text-red-400" />
                        </div>
                        <div>
                            <h2 id="rescue-modal-title" className="text-lg font-bold text-white">
                                Before you go...
                            </h2>
                            <p className="text-xs text-gray-500">You're about to lose your {planName} benefits</p>
                        </div>
                    </div>
                </div>

                {/* Features at risk */}
                <div className="px-6 py-5 border-b border-white/5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        You'll lose access to
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                        {FEATURES_AT_RISK.map(({ icon: Icon, label, sub }) => (
                            <div
                                key={label}
                                className="flex items-start gap-2.5 rounded-xl bg-red-500/5 border border-red-500/10 p-3"
                            >
                                <Icon size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[12px] font-semibold text-white">{label}</p>
                                    <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rescue offer */}
                <div className="px-6 py-5 border-b border-white/5">
                    <div className="rounded-xl bg-gradient-to-r from-purple-500/10 to-violet-500/5 border border-purple-500/20 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Gift size={14} className="text-purple-400" />
                            <span className="text-sm font-bold text-purple-300">Before cancelling — have you tried Annual?</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed mb-3">
                            Switch to annual billing and save <strong className="text-white">$39.89/year</strong> — that's 4 months completely free. Less than a coffee per week.
                        </p>
                        <Link
                            to="/pricing"
                            onClick={onClose}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all"
                        >
                            <Gift size={11} /> See Annual Plans
                        </Link>
                    </div>
                </div>

                {/* Support nudge */}
                <div className="px-6 py-4 border-b border-white/5">
                    <div className="flex items-start gap-2.5 text-xs text-gray-500">
                        <LifeBuoy size={13} className="mt-0.5 flex-shrink-0 text-gray-600" />
                        <span>
                            Having an issue?{' '}
                            <a
                                href="mailto:support@intelligrid.online?subject=Subscription Help"
                                className="text-purple-400 hover:text-purple-300 underline underline-offset-4"
                            >
                                Contact support
                            </a>
                            {' '}— we'll sort it out personally.
                        </span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="px-6 py-5 flex flex-col sm:flex-row gap-3">
                    {/* Primary CTA: Keep plan */}
                    <button
                        id="rescue-keep-plan"
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-sm font-bold transition-all shadow-lg shadow-purple-500/20"
                    >
                        Keep My Plan
                    </button>

                    {/* Secondary: Confirm cancel */}
                    <button
                        id="rescue-confirm-cancel"
                        onClick={onConfirmCancel}
                        disabled={isLoading}
                        className="sm:w-auto px-5 py-3 rounded-xl border border-white/10 bg-white/4 text-gray-400 hover:text-white hover:border-white/20 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Cancelling...' : 'Yes, Cancel Anyway'}
                    </button>
                </div>
            </div>
        </div>
    )
}
