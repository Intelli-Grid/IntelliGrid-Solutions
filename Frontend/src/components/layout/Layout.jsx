import { useEffect } from 'react'
import Header from './Header'
import Footer from './Footer'
import { NudgeProvider } from '../common/NudgeContext'
import { useNudge } from '../common/NudgeContext'
import UpgradeNudge from '../common/UpgradeNudge'
import TrialBanner from '../common/TrialBanner'
import { useTrialStatus } from '../../hooks/useTrialStatus'

/**
 * TrialBannerWrapper — lives inside NudgeProvider so useNudge is safe.
 * Responsibilities:
 *   1. Render the TrialBanner when the user has an active reverse trial.
 *   2. Fire the TRIAL_EXPIRING_SOON nudge once per session when ≤ 7 days remain.
 *      This gives a contextual upgrade prompt in addition to the visual countdown.
 */
function TrialBannerWrapper() {
    const { subscription } = useTrialStatus()
    const { fireNudge } = useNudge()

    useEffect(() => {
        if (!subscription?.reverseTrial?.active) return
        if (sessionStorage.getItem('nudge_trial_expiring_fired')) return

        const endDate = new Date(subscription.reverseTrial.endDate)
        const daysLeft = Math.ceil((endDate - Date.now()) / (1000 * 60 * 60 * 24))

        if (daysLeft <= 7 && daysLeft >= 0) {
            fireNudge('TRIAL_EXPIRING_SOON')
            sessionStorage.setItem('nudge_trial_expiring_fired', '1')
        }
    }, [subscription, fireNudge])

    if (!subscription?.reverseTrial?.active) return null

    return (
        <div className="mx-auto max-w-7xl px-4 pt-3">
            <TrialBanner subscription={subscription} />
        </div>
    )
}

export default function Layout({ children }) {
    return (
        <NudgeProvider>
            <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900">
                <Header />
                <TrialBannerWrapper />
                <main className="flex-1">{children}</main>
                <Footer />
                <UpgradeNudge />
            </div>
        </NudgeProvider>
    )
}
