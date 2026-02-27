/**
 * renewalService.js — Subscription renewal reminders + expiry downgrades
 *
 * Fixed: replaced unreliable setInterval with node-cron for deterministic
 *        daily execution at 00:05 UTC (resilient to Railway restarts).
 * Fixed: downgradeExpired now sends a subscription-expired email to affected users.
 * Fixed: PayPal recurring subscribers (paypalSubscriptionId set) are excluded from
 *        both downgrade and reminder jobs. PayPal manages their billing cycle;
 *        our cron must not interfere.
 */
import cron from 'node-cron'
import User from '../models/User.js'
import emailService from './emailService.js'

class RenewalService {
    /**
     * Check for active subscriptions expiring in exactly 7 days
     * and send renewal reminders.
     *
     * NOTE: Users with paypalSubscriptionId are excluded — PayPal sends its own
     * renewal notifications and manages re-billing automatically.
     */
    async checkRenewals() {
        console.log('🔄 Checking for subscription renewals (7-day window)...')
        try {
            const targetDate = new Date()
            targetDate.setDate(targetDate.getDate() + 7)

            const startOfDay = new Date(targetDate)
            startOfDay.setHours(0, 0, 0, 0)

            const endOfDay = new Date(targetDate)
            endOfDay.setHours(23, 59, 59, 999)

            const users = await User.find({
                'subscription.status': 'active',
                'subscription.tier': { $ne: 'Free' },
                'subscription.endDate': {
                    $gte: startOfDay,
                    $lte: endOfDay
                },
                // Exclude PayPal recurring subscribers — PayPal manages their renewal
                'subscription.paypalSubscriptionId': { $in: [null, undefined, ''] }
            })

            console.log(`📧 Found ${users.length} non-PayPal subscriptions expiring in 7 days`)

            for (const user of users) {
                emailService.sendRenewalReminder(user, user.subscription)
                    .catch(err => console.error(`Renewal reminder email failed for ${user.email}:`, err))
            }
        } catch (error) {
            console.error('❌ Error in renewal check:', error)
        }
    }

    /**
     * Downgrade expired subscriptions to Free tier and notify users.
     *
     * NOTE: Users with paypalSubscriptionId are excluded — their subscription
     * lifecycle is managed by PayPal webhooks (BILLING.SUBSCRIPTION.EXPIRED /
     * BILLING.SUBSCRIPTION.CANCELLED). Downgrading them here would race with
     * PayPal's renewal webhook and could incorrectly remove access mid-cycle.
     */
    async downgradeExpired() {
        console.log('🔽 Checking for expired subscriptions to downgrade...')
        try {
            const now = new Date()

            const expiredUsers = await User.find({
                'subscription.status': 'active',
                'subscription.tier': { $ne: 'Free' },
                'subscription.endDate': { $lt: now },
                // Exclude PayPal recurring subscribers — PayPal manages their lifecycle
                'subscription.paypalSubscriptionId': { $in: [null, undefined, ''] }
            })

            if (expiredUsers.length === 0) {
                console.log('✅ No expired non-PayPal subscriptions found.')
                return
            }

            console.log(`⬇️  Downgrading ${expiredUsers.length} expired subscription(s) to Free tier...`)

            for (const user of expiredUsers) {
                await User.findByIdAndUpdate(user._id, {
                    'subscription.tier': 'Free',
                    'subscription.status': 'expired',
                    'subscription.autoRenew': false,
                })

                // Notify user their subscription has expired naturally (correct email — not "payment failed")
                emailService.sendSubscriptionExpired(user)
                    .catch(err => console.error(`Expiry notification failed for ${user.email}:`, err))

                console.log(`↩️  Downgraded ${user.email} → Free (expired: ${user.subscription.endDate?.toISOString()})`)
            }

            console.log(`✅ Downgrade complete: ${expiredUsers.length} user(s) downgraded.`)
        } catch (error) {
            console.error('❌ Error in downgrade check:', error)
        }
    }

    /**
     * Start the cron scheduler.
     * Runs at 00:05 UTC every day — deterministic regardless of process restarts.
     * setInterval(24h) is NOT used because Railway container restarts reset the interval.
     */
    startScheduler() {
        console.log('⏰ Renewal Scheduler initialised (node-cron: daily at 00:05 UTC)')

        // Run both checks once on startup after a short delay to ensure DB is connected
        setTimeout(async () => {
            await this.downgradeExpired()
            await this.checkRenewals()
        }, 15000)

        // Schedule: 5 minutes past midnight UTC every day
        cron.schedule('5 0 * * *', async () => {
            console.log('⏰ [CRON] Running daily subscription maintenance...')
            await this.downgradeExpired()
            await this.checkRenewals()
        }, {
            timezone: 'UTC',
        })
    }
}

export default new RenewalService()
