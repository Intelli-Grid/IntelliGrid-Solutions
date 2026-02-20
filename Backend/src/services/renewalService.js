import User from '../models/User.js'
import emailService from './emailService.js'

class RenewalService {
    /**
     * Check for active subscriptions expiring in exactly 7 days
     * and send reminders (per checklist spec: 7 days, not 3).
     */
    async checkRenewals() {
        console.log('🔄 Checking for subscription renewals (7-day window)...')
        try {
            const targetDate = new Date()
            targetDate.setDate(targetDate.getDate() + 7) // ✅ Fixed: was +3, must be +7

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

            console.log(`📧 Found ${users.length} subscriptions expiring in 7 days (${startOfDay.toLocaleDateString()})`)

            for (const user of users) {
                await emailService.sendRenewalReminder(user, user.subscription)
            }

        } catch (error) {
            console.error('❌ Error in renewal check:', error)
        }
    }

    /**
     * Downgrade expired subscriptions to Free tier.
     * Finds all users whose subscription.endDate has passed but tier is still non-Free.
     * ✅ Bug #6 Fix: this logic was completely missing.
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
                console.log(`↩️  Downgraded user ${user.email} from Pro → Free (expired: ${user.subscription.endDate?.toISOString()})`)
            }

            console.log(`✅ Downgrade complete: ${expiredUsers.length} user(s) downgraded.`)
        } catch (error) {
            console.error('❌ Error in downgrade check:', error)
        }
    }

    /**
     * Start the internal scheduler — runs daily
     */
    startScheduler() {
        console.log('⏰ Renewal Scheduler initialized (Daily: 7-day reminders + expiry downgrade)')

        // Run both checks once on startup (after a short delay to allow DB connection)
        setTimeout(async () => {
            await this.downgradeExpired()
            await this.checkRenewals()
        }, 15000)

        // Run every 24 hours
        setInterval(async () => {
            await this.downgradeExpired()
            await this.checkRenewals()
        }, 24 * 60 * 60 * 1000)
    }
}

export default new RenewalService()
