/**
 * renewalService.js — Subscription renewal reminders + expiry downgrades
 *
 * Fixed: replaced unreliable setInterval with node-cron for deterministic
 *        daily execution at 00:05 IST / UTC (resilient to Railway restarts).
 * Fixed: downgradeExpired now sends a subscription-expired email to affected users.
 */
import cron from 'node-cron'
import User from '../models/User.js'
import emailService from './emailService.js'

class RenewalService {
    /**
     * Check for active subscriptions expiring in exactly 7 days
     * and send renewal reminders.
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
                }
            })

            console.log(`📧 Found ${users.length} subscriptions expiring in 7 days`)

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
     */
    async downgradeExpired() {
        console.log('🔽 Checking for expired subscriptions to downgrade...')
        try {
            const now = new Date()

            const expiredUsers = await User.find({
                'subscription.status': 'active',
                'subscription.tier': { $ne: 'Free' },
                'subscription.endDate': { $lt: now }
            })

            if (expiredUsers.length === 0) {
                console.log('✅ No expired subscriptions found.')
                return
            }

            console.log(`⬇️  Downgrading ${expiredUsers.length} expired subscription(s) to Free tier...`)

            for (const user of expiredUsers) {
                await User.findByIdAndUpdate(user._id, {
                    'subscription.tier': 'Free',
                    'subscription.status': 'expired',
                    'subscription.autoRenew': false,
                })

                // Notify user their subscription has expired
                emailService.sendPaymentFailure(user, {
                    orderId: `EXP-${user._id}`
                }).catch(err => console.error(`Expiry notification failed for ${user.email}:`, err))

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
