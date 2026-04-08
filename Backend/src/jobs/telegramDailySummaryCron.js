/**
 * telegramDailySummaryCron.js
 * ===========================
 * Sends a daily admin summary to the Telegram owner chat at 8:00 PM IST (14:30 UTC).
 *
 * Reports:
 *   - New users today
 *   - New Pro subscribers today
 *   - New tools approved today
 *   - Pending tools awaiting review
 *   - Unenriched tools count
 */

import cron from 'node-cron'
import mongoose from 'mongoose'
import { sendOwnerAlert } from '../services/telegramBot.js'
import Tool from '../models/Tool.js'
import User from '../models/User.js'

export const startDailySummaryCron = () => {
    // 7:00 AM IST = 01:30 UTC
    cron.schedule('30 1 * * *', async () => {
        if (mongoose.connection.readyState !== 1) {
            console.warn('[DailySummaryCron] DB not connected — skipping')
            return
        }

        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const [newUsers, newPro, newActive, pendingTools, unenriched, stagedForReview] = await Promise.all([
                User.countDocuments({ createdAt: { $gte: today } }),
                User.countDocuments({
                    'subscription.status': 'active',
                    'subscription.plan': { $in: ['pro', 'pro_yearly'] },
                    updatedAt: { $gte: today },
                }),
                // Only count tools explicitly auto-approved today
                Tool.countDocuments({ approvedBy: 'auto-approve-script', updatedAt: { $gte: today } }),
                Tool.countDocuments({ status: 'pending' }),
                Tool.countDocuments({ status: 'active', isEnriched: { $ne: true } }),
                Tool.countDocuments({ status: 'auto_approved' }),  // staged, awaiting your review
            ])

            const totalActive = await Tool.countDocuments({ status: 'active', isActive: true })
            const totalUsers = await User.countDocuments()

            const msg =
                `📊 *Daily Summary — ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short' })}*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `👥 *Users*\n` +
                `  New today: *${newUsers}*\n` +
                `  New Pro today: *${newPro}*\n` +
                `  Total users: *${totalUsers}*\n\n` +
                `🛠 *Tools*\n` +
                `  Auto-approved today: *${newActive}*\n` +
                `  Total active: *${totalActive}*\n` +
                (stagedForReview > 0
                    ? `  🔍 Staged for your review: *${stagedForReview}* ← /reviewbatch\n`
                    : '') +
                `  ⏳ Pending enrichment: *${pendingTools}*\n` +
                `  🤖 Needs enrichment: *${unenriched}*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📱 *Quick Actions*\n` +
                `/dashboard /approvebatch /reviewbatch`

            await sendOwnerAlert(msg)
            console.log('✅ [DailySummaryCron] Daily summary sent')
        } catch (err) {
            console.error('❌ [DailySummaryCron] Error:', err.message)
        }
    }, { timezone: 'UTC' })

    console.log('📊 Daily Summary Cron initialised (01:30 UTC / 7:00 AM IST)')
}
