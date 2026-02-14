import mongoose from 'mongoose'
import User from '../src/models/User.js'
import emailService from '../src/services/emailService.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Setup env
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

// Connect DB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('DB Connected'))
    .catch(err => {
        console.error('DB Connection Error:', err)
        process.exit(1)
    })

const checkRenewals = async () => {
    try {
        // Target date: 3 days from now
        const targetDate = new Date()
        targetDate.setDate(targetDate.getDate() + 3)

        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

        console.log(`Checking renewals for: ${startOfDay.toLocaleDateString()}`)

        const users = await User.find({
            'subscription.status': 'active',
            'subscription.autoRenew': true,
            'subscription.endDate': {
                $gte: startOfDay,
                $lte: endOfDay
            }
        })

        console.log(`Found ${users.length} subscriptions up for renewal.`)

        for (const user of users) {
            console.log(`Sending reminder to ${user.email}`)
            await emailService.sendRenewalReminder(user, user.subscription)
        }

        console.log('Renewal check complete.')

    } catch (error) {
        console.error('Error checking renewals:', error)
    } finally {
        await mongoose.disconnect()
        process.exit(0)
    }
}

checkRenewals()
