import User from '../models/User.js'
import emailService from './emailService.js'

class RenewalService {
    /**
     * Check for active subscriptions expiring in 3 days
     * and send reminders.
     */
    async checkRenewals() {
        console.log('🔄 Checking for subscription renewals...')
        try {
            const targetDate = new Date()
            targetDate.setDate(targetDate.getDate() + 3)

            const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
            const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

            const users = await User.find({
                'subscription.status': 'active',
                'subscription.autoRenew': true,
                'subscription.endDate': {
                    $gte: startOfDay,
                    $lte: endOfDay
                }
            })

            console.log(`found ${users.length} subscriptions renewing on ${startOfDay.toLocaleDateString()}`)

            for (const user of users) {
                // Send email (fire and forget to not block loop too much, or await)
                await emailService.sendRenewalReminder(user, user.subscription)
            }

        } catch (error) {
            console.error('❌ Error in renewal check:', error)
        }
    }

    /**
     * Start the internal scheduler
     */
    startScheduler() {
        console.log('⏰ Renewal Scheduler initialized (Daily check)')

        // Run once on startup (optional, better to delay slightly)
        setTimeout(() => this.checkRenewals(), 10000)

        // Run every 24 hours
        setInterval(() => this.checkRenewals(), 24 * 60 * 60 * 1000);
    }
}

export default new RenewalService()
