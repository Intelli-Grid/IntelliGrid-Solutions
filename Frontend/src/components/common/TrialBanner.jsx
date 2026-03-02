/**
 * TrialBanner.jsx
 *
 * Displayed when the current user is on an active reverse trial.
 * Shows a countdown of days remaining and a direct CTA to /pricing.
 *
 * Usage:
 *   <TrialBanner subscription={subscription} />
 *
 * subscription = user.subscription object from GET /api/v1/user/stats
 * Only renders when subscription.reverseTrial.active === true and not yet converted.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Clock, ArrowRight, X } from 'lucide-react'
import { useState } from 'react'

export default function TrialBanner({ subscription }) {
    const [dismissed, setDismissed] = useState(false)

    const trial = subscription?.reverseTrial
    const isActive = trial?.active === true && trial?.converted !== true

    // Calculate days remaining
    const daysLeft = useMemo(() => {
        if (!trial?.endDate) return null
        const diff = new Date(trial.endDate) - new Date()
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }, [trial?.endDate])

    if (!isActive || dismissed || daysLeft === null) return null

    // Visual urgency shifts based on days left
    const isUrgent = daysLeft <= 3
    const isWarning = daysLeft <= 7 && daysLeft > 3

    const borderColor = isUrgent
        ? 'border-red-500/30'
        : isWarning
            ? 'border-amber-500/30'
            : 'border-violet-500/30'

    const bgColor = isUrgent
        ? 'bg-red-500/8'
        : isWarning
            ? 'bg-amber-500/8'
            : 'bg-violet-500/8'

    const badgeColor = isUrgent
        ? 'bg-red-500/15 text-red-400 border-red-500/20'
        : isWarning
            ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
            : 'bg-violet-500/15 text-violet-400 border-violet-500/20'

    const ctaColor = isUrgent
        ? 'bg-red-500 hover:bg-red-400'
        : isWarning
            ? 'bg-amber-500 hover:bg-amber-400'
            : 'bg-violet-600 hover:bg-violet-500'

    const message = isUrgent
        ? `Your Pro trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — upgrade now to keep access.`
        : isWarning
            ? `${daysLeft} days left on your Pro trial. Lock in Pro before it expires.`
            : `You have ${daysLeft} days of full Pro access. No card needed — enjoy exploring!`

    return (
        <div
            className={`relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border ${borderColor} ${bgColor} px-5 py-3.5 backdrop-blur-sm`}
            role="banner"
            aria-label="Trial status"
        >
            {/* Left: Icon + text */}
            <div className="flex items-center gap-3 min-w-0">
                <div className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl border ${badgeColor}`}>
                    {isUrgent ? (
                        <Clock size={14} />
                    ) : (
                        <Sparkles size={14} />
                    )}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-white leading-snug">
                        {isUrgent ? '⚠️ ' : '✨ '}
                        <span className={`${isUrgent ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-violet-400'}`}>
                            14-day Pro Trial
                        </span>
                        {' '}— {daysLeft} day{daysLeft === 1 ? '' : 's'} remaining
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                        {message}
                    </p>
                </div>
            </div>

            {/* Right: CTA + dismiss */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-11 sm:ml-0">
                <Link
                    to="/pricing"
                    className={`inline-flex items-center gap-1.5 rounded-lg ${ctaColor} px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:shadow-lg hover:scale-[1.02]`}
                >
                    Upgrade to keep Pro
                    <ArrowRight size={11} />
                </Link>
                <button
                    onClick={() => setDismissed(true)}
                    className="h-6 w-6 flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors"
                    aria-label="Dismiss trial banner"
                >
                    <X size={12} />
                </button>
            </div>
        </div>
    )
}
