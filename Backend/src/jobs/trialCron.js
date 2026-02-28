import cron from 'node-cron'
import User from '../models/User.js'
import emailService from '../services/emailService.js'

/**
 * trialCron.js
 *
 * Runs daily at 08:00 UTC. Handles all reverse-trial lifecycle events:
 *   1. Downgrades users whose 14-day trial has expired → sends expired email
 *   2. Day 12 urgency email (2 days left)
 *   3. Day 11 reminder email (3 days left)
 *   4. Day 7 midpoint nudge email
 *
 * Each user is only ever in one bucket per day — the date windows are mutually exclusive
 * because the endDate fields are set at the moment of sign-up (now + 14 days).
 */
export function startTrialCron() {
    // Daily at 08:00 UTC
    cron.schedule('0 8 * * *', async () => {
        const runStart = Date.now()
        const now = new Date()
        console.log(`⏰ [trialCron] Run started at ${now.toISOString()}`)

        try {
            // ── Helper: build a date-window for "endDate falls within tomorrow, day+N" ──
            const dayWindow = (daysAhead) => {
                const start = new Date(now)
                start.setDate(start.getDate() + daysAhead)
                start.setHours(0, 0, 0, 0)
                const end = new Date(start)
                end.setHours(23, 59, 59, 999)
                return { $gte: start, $lte: end }
            }

            // ── 1. EXPIRE — downgrade users whose trial ended today or earlier ─────────
            const expired = await User.find({
                'subscription.tier': 'Pro',
                'subscription.reverseTrial.active': true,
                'subscription.reverseTrial.converted': false,
                'subscription.reverseTrial.endDate': { $lte: now },
            }).select('email firstName subscription').lean()

            for (const user of expired) {
                try {
                    await User.findByIdAndUpdate(user._id, {
                        'subscription.tier': 'Free',
                        'subscription.status': 'active',
                        'subscription.endDate': now,
                        'subscription.reverseTrial.active': false,
                        'subscription.reverseTrial.downgradedAt': now,
                    })
                    emailService.sendTrialExpiredEmail(user).catch(err =>
                        console.error(`[trialCron] Expired email failed for ${user.email}:`, err.message)
                    )
                    console.log(`✅ [trialCron] Trial expired → downgraded to Free: ${user.email}`)
                } catch (err) {
                    console.error(`[trialCron] Failed to downgrade ${user.email}:`, err.message)
                }
            }

            // ── 2. URGENCY — 2 days before expiry (Day 12) ─────────────────────────────
            const urgencyUsers = await User.find({
                'subscription.tier': 'Pro',
                'subscription.reverseTrial.active': true,
                'subscription.reverseTrial.converted': false,
                'subscription.reverseTrial.endDate': dayWindow(2),
            }).select('email firstName').lean()

            for (const user of urgencyUsers) {
                emailService.sendTrialUrgencyEmail(user).catch(err =>
                    console.error(`[trialCron] Urgency email failed for ${user.email}:`, err.message)
                )
            }
            if (urgencyUsers.length) {
                console.log(`📧 [trialCron] Sent urgency emails (2 days left): ${urgencyUsers.length} users`)
            }

            // ── 3. REMINDER — 3 days before expiry (Day 11) ────────────────────────────
            const reminderUsers = await User.find({
                'subscription.tier': 'Pro',
                'subscription.reverseTrial.active': true,
                'subscription.reverseTrial.converted': false,
                'subscription.reverseTrial.endDate': dayWindow(3),
            }).select('email firstName').lean()

            for (const user of reminderUsers) {
                emailService.sendTrialReminderEmail(user, 3).catch(err =>
                    console.error(`[trialCron] Reminder email failed for ${user.email}:`, err.message)
                )
            }
            if (reminderUsers.length) {
                console.log(`📧 [trialCron] Sent reminder emails (3 days left): ${reminderUsers.length} users`)
            }

            // ── 4. MIDPOINT — 7 days remaining (Day 7) ─────────────────────────────────
            const midpointUsers = await User.find({
                'subscription.tier': 'Pro',
                'subscription.reverseTrial.active': true,
                'subscription.reverseTrial.converted': false,
                'subscription.reverseTrial.endDate': dayWindow(7),
            }).select('email firstName').lean()

            for (const user of midpointUsers) {
                emailService.sendTrialMidpointEmail(user).catch(err =>
                    console.error(`[trialCron] Midpoint email failed for ${user.email}:`, err.message)
                )
            }
            if (midpointUsers.length) {
                console.log(`📧 [trialCron] Sent midpoint emails (7 days left): ${midpointUsers.length} users`)
            }

            const elapsed = Date.now() - runStart
            console.log(`✅ [trialCron] Run complete in ${elapsed}ms | expired=${expired.length} urgency=${urgencyUsers.length} reminder=${reminderUsers.length} midpoint=${midpointUsers.length}`)

        } catch (err) {
            console.error('❌ [trialCron] Run failed with unhandled error:', err.message, err.stack)
        }
    }, { timezone: 'UTC' })

    console.log('✅ Trial lifecycle cron registered (daily @ 08:00 UTC)')
}
