import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, ArrowRight, Zap } from 'lucide-react'
import { useNudge } from './NudgeContext'
import { useFlag } from '../../hooks/useFeatureFlags'

/**
 * UpgradeNudge
 *
 * A non-blocking slide-up panel that appears at the bottom-right corner
 * whenever the NudgeContext has an activeNudge. It never blocks the user.
 * Auto-dismisses for 'low' urgency nudges after 8 seconds.
 *
 * Mount this ONCE in Layout.jsx — it reads from context.
 */
export default function UpgradeNudge() {
    const { activeNudge, dismissNudge } = useNudge()
    const nudgesEnabled = useFlag('CONTEXTUAL_NUDGES')

    // Auto-dismiss low-urgency nudges after 8s
    useEffect(() => {
        if (!activeNudge || activeNudge.urgency !== 'low') return
        const timer = setTimeout(dismissNudge, 8000)
        return () => clearTimeout(timer)
    }, [activeNudge, dismissNudge])

    if (!nudgesEnabled) return null
    if (!activeNudge) return null

    const urgencyStyles = {
        high: {
            border: 'border-accent-purple/40',
            bg: 'bg-gradient-to-r from-accent-purple/15 to-accent-cyan/10',
            cta: 'bg-gradient-to-r from-accent-purple to-accent-cyan text-white hover:shadow-glow-cyan',
            icon: 'bg-accent-purple/20 text-accent-purple',
        },
        medium: {
            border: 'border-accent-cyan/30',
            bg: 'bg-gradient-to-r from-accent-cyan/10 to-accent-purple/8',
            cta: 'bg-gradient-to-r from-accent-cyan to-accent-purple text-white hover:shadow-glow-cyan',
            icon: 'bg-accent-cyan/20 text-accent-cyan',
        },
        low: {
            border: 'border-white/15',
            bg: 'bg-white/8',
            cta: 'bg-white/15 text-white hover:bg-white/25',
            icon: 'bg-white/10 text-gray-300',
        },
    }

    const style = urgencyStyles[activeNudge.urgency] || urgencyStyles.medium

    return (
        <div
            role="dialog"
            aria-label="Upgrade suggestion"
            id="upgrade-nudge-panel"
            className={`
                fixed bottom-6 right-6 z-50 w-full max-w-sm
                rounded-2xl border backdrop-blur-md p-5 shadow-2xl
                animate-slide-up
                ${style.border} ${style.bg}
            `}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <span className={`text-lg w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${style.icon}`}>
                        {activeNudge.icon}
                    </span>
                    <p className="font-bold text-white text-sm leading-tight">{activeNudge.title}</p>
                </div>
                {activeNudge.dismissible && (
                    <button
                        id="nudge-dismiss-btn"
                        onClick={dismissNudge}
                        className="text-gray-500 hover:text-white transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-white/10"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Body */}
            <p className="text-sm text-gray-300 leading-relaxed mb-4">{activeNudge.body}</p>

            {/* CTA */}
            <Link
                id="nudge-cta-btn"
                to={activeNudge.ctaHref}
                onClick={dismissNudge}
                className={`
                    flex items-center justify-center gap-2
                    w-full rounded-xl py-2.5 text-sm font-semibold
                    transition-all duration-200 hover:scale-[1.02]
                    ${style.cta}
                `}
            >
                <Zap className="w-4 h-4" />
                {activeNudge.ctaLabel}
                <ArrowRight className="w-3.5 h-3.5" />
            </Link>
        </div>
    )
}
