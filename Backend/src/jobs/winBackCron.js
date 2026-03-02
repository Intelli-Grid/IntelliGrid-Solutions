import cron from 'node-cron'
import User from '../models/User.js'
import emailService from '../services/emailService.js'

/**
 * WIN-BACK CRON
 *
 * Runs daily at 10:00 UTC.
 * Targets:
 *   A) Users whose subscription was cancelled 3 days ago (status === 'cancelled')
 *      → Send "We miss you" email with a discount offer
 *   B) Users whose paid subscription expired (status === 'active', endDate < now, tier !== 'Free')
 *      → Downgrade to Free, send "Your plan has expired" email
 *   C) Users on trial who cancelled early (trial active = false, converted = false, tier downgraded)
 *      → These are handled by trialCron; win-back focuses on post-cancellation
 */
export function startWinBackCron() {
    // Run at 10:00 UTC every day
    cron.schedule('0 10 * * *', async () => {
        console.log('[WinBack Cron] Starting daily win-back and subscription expiry check...')

        await handleExpiredSubscriptions()
        await sendWinBackEmails()

        console.log('[WinBack Cron] Done.')
    })

    console.log('[WinBack Cron] Scheduled — runs daily at 10:00 UTC')
}

/**
 * Expire paid subscriptions where endDate has passed.
 * Downgrades tier to Free and syncs status.
 */
async function handleExpiredSubscriptions() {
    try {
        const now = new Date()

        const expiredUsers = await User.find({
            'subscription.status': 'active',
            'subscription.tier': { $nin: ['Free'] },
            'subscription.endDate': { $lt: now },
            // Don't touch users on active reverse trial
            'subscription.reverseTrial.active': { $ne: true },
            // Exclude PayPal recurring subscribers — PayPal manages their lifecycle via webhooks
            // (BILLING.SUBSCRIPTION.EXPIRED / BILLING.SUBSCRIPTION.CANCELLED).
            // Downgrading them here would race with PayPal's renewal webhook and could
            // incorrectly remove access mid-cycle if endDate is stale before the renewal webhook arrives.
            'subscription.paypalSubscriptionId': { $in: [null, undefined, ''] },
        })

        let expiredCount = 0
        for (const user of expiredUsers) {
            try {
                user.subscription.tier = 'Free'
                user.subscription.status = 'expired'
                user.subscription.autoRenew = false
                await user.save()

                await emailService.sendSubscriptionExpiredEmail(user)
                expiredCount++
            } catch (err) {
                console.error(`[WinBack] Failed to expire subscription for user ${user._id}:`, err.message)
            }
        }

        if (expiredCount > 0) {
            console.log(`[WinBack] Expired ${expiredCount} paid subscription(s) and sent expiry emails`)
        }
    } catch (err) {
        console.error('[WinBack] handleExpiredSubscriptions error:', err)
    }
}

/**
 * Send win-back emails to users who cancelled ~3 days ago.
 * We avoid spamming — only fire once, 3 days after cancellation.
 */
async function sendWinBackEmails() {
    try {
        const threeDaysAgo = new Date()
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
        const fourDaysAgo = new Date()
        fourDaysAgo.setDate(fourDaysAgo.getDate() - 4)

        const cancelledUsers = await User.find({
            'subscription.status': 'cancelled',
            'subscription.cancelledAt': { $gte: fourDaysAgo, $lte: threeDaysAgo },
            winBackSent: { $ne: true },
        })

        let sentCount = 0
        for (const user of cancelledUsers) {
            try {
                await emailService.sendWinBackEmail(user)
                user.winBackSent = true
                await user.save()
                sentCount++
            } catch (err) {
                console.error(`[WinBack] Failed to send win-back email for user ${user._id}:`, err.message)
            }
        }

        if (sentCount > 0) {
            console.log(`[WinBack] Sent ${sentCount} win-back email(s)`)
        }
    } catch (err) {
        console.error('[WinBack] sendWinBackEmails error:', err)
    }
}
