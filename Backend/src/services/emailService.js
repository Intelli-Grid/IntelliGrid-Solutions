import * as SibApiV3Sdk from '@getbrevo/brevo'
import dotenv from 'dotenv'

dotenv.config()

let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
let apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_API_KEY;


class EmailService {
    /**
     * Send welcome email to new users
     * @param {Object} user - User object { email, firstName }
     */
    async sendWelcomeEmail(user) {
        if (!process.env.BREVO_API_KEY || process.env.BREVO_API_KEY === 'your_brevo_api_key_here') {
            console.warn('Brevo API key missing. Email not sent.')
            return
        }

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
        sendSmtpEmail.to = [{ email: user.email, name: user.firstName }]
        sendSmtpEmail.sender = {
            email: process.env.BREVO_SENDER_EMAIL,
            name: process.env.BREVO_SENDER_NAME
        }
        sendSmtpEmail.subject = 'Welcome to IntelliGrid! 🚀'
        // Using HTML content for now as template ID depends on Brevo setup
        sendSmtpEmail.htmlContent = `
            <h1>Welcome ${user.firstName}!</h1>
            <p>Thanks for joining IntelliGrid. We are excited to have you on board.</p>
            <p>Start exploring our AI tools today!</p>
        `
        // If template ID is available:
        // sendSmtpEmail.templateId = 1 
        // sendSmtpEmail.params = { firstName: user.firstName }

        try {
            const data = await apiInstance.sendTransacEmail(sendSmtpEmail)
            console.log('Welcome email sent successfully:', data)
            return data
        } catch (error) {
            console.error('Error sending welcome email:', error)
            // specific Brevo error details might depend on the package version
            if (error.response && error.response.body) {
                console.error('Brevo Error Body:', error.response.body);
            }
        }
    }

    /**
     * Send subscription confirmation email
     * @param {Object} user - User object
     * @param {Object} subscription - Subscription details
     */
    async sendSubscriptionConfirmation(user, subscription) {
        if (!process.env.BREVO_API_KEY || process.env.BREVO_API_KEY === 'your_brevo_api_key_here') {
            console.warn('Brevo API key missing. Email not sent.')
            return
        }

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
        sendSmtpEmail.to = [{ email: user.email, name: user.firstName }]
        sendSmtpEmail.sender = {
            email: process.env.BREVO_SENDER_EMAIL,
            name: process.env.BREVO_SENDER_NAME
        }
        sendSmtpEmail.subject = 'Your IntelliGrid Pro Subscription is Active! 🎉'
        sendSmtpEmail.htmlContent = `
            <h1>Subscription Confirmed! ✅</h1>
            <p>Hi ${user.firstName},</p>
            <p>Your subscription to <strong>${subscription.tier} (${subscription.duration})</strong> is now active.</p>
            <p>Amount: ${subscription.amount}</p>
            <p>Next Billing Date: ${subscription.nextBillingDate}</p>
            <br>
            <a href="${process.env.FRONTEND_URL}/dashboard">Go to Dashboard</a>
        `

        try {
            const data = await apiInstance.sendTransacEmail(sendSmtpEmail)
            console.log('Subscription confirmation email sent:', data)
            return data
        } catch (error) {
            console.error('Error sending subscription email:', error)
        }
    }

    /**
     * Send payment receipt
     * @param {Object} user 
     * @param {Object} payment 
     */
    async sendPaymentReceipt(user, payment) {
        if (!process.env.BREVO_API_KEY || process.env.BREVO_API_KEY === 'your_brevo_api_key_here') {
            console.warn('Brevo API key missing. Email not sent.')
            return
        }

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
        sendSmtpEmail.to = [{ email: user.email, name: user.firstName }]
        sendSmtpEmail.sender = {
            email: process.env.BREVO_SENDER_EMAIL,
            name: process.env.BREVO_SENDER_NAME
        }
        sendSmtpEmail.subject = 'Payment Receipt - IntelliGrid Pro'
        sendSmtpEmail.htmlContent = `
            <h1>Payment Receipt</h1>
            <p>Hi ${user.firstName},</p>
            <p>Thank you for your payment.</p>
            <p>Receipt #${payment.id}</p>
            <p>Date: ${new Date(payment.createdAt).toLocaleDateString()}</p>
            <p>Total: ${payment.amount}</p>
        `

        try {
            const data = await apiInstance.sendTransacEmail(sendSmtpEmail)
            console.log('Receipt email sent:', data)
            return data
        } catch (error) {
            console.error('Error sending receipt email:', error)
        }
    }

    /**
     * Send renewal reminder
     * @param {Object} user
     * @param {Object} subscription
     */
    async sendRenewalReminder(user, subscription) {
        if (!process.env.BREVO_API_KEY) return

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
        sendSmtpEmail.to = [{ email: user.email, name: user.firstName }]
        sendSmtpEmail.sender = {
            email: process.env.BREVO_SENDER_EMAIL,
            name: process.env.BREVO_SENDER_NAME
        }
        sendSmtpEmail.subject = 'Your Subscription Renews Soon 📅'
        sendSmtpEmail.htmlContent = `
            <h1>Renewal Reminder</h1>
            <p>Hi ${user.firstName},</p>
            <p>Your ${subscription.tier} subscription will renew on ${new Date(subscription.endDate).toLocaleDateString()}.</p>
            <p>To avoid interruption, ensure your payment method is up to date.</p>
        `

        try {
            await apiInstance.sendTransacEmail(sendSmtpEmail)
            console.log('Renewal reminder sent to:', user.email)
        } catch (error) {
            console.error('Error sending renewal reminder:', error)
        }
    }

    /**
     * Send payment failure alert
     * @param {Object} user 
     */
    async sendPaymentFailure(user) {
        if (!process.env.BREVO_API_KEY) return

        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
        sendSmtpEmail.to = [{ email: user.email, name: user.firstName }]
        sendSmtpEmail.sender = {
            email: process.env.BREVO_SENDER_EMAIL,
            name: process.env.BREVO_SENDER_NAME
        }
        sendSmtpEmail.subject = 'Payment Failed ❌'
        sendSmtpEmail.htmlContent = `
            <h1>Action Required: Payment Failed</h1>
            <p>Hi ${user.firstName},</p>
            <p>We were unable to process your latest payment. Your subscription may be paused.</p>
            <p>Please update your payment method to continue using IntelliGrid Pro.</p>
            <a href="${process.env.FRONTEND_URL}/dashboard">Update Payment Method</a>
        `

        try {
            await apiInstance.sendTransacEmail(sendSmtpEmail)
            console.log('Payment failure email sent to:', user.email)
        } catch (error) {
            console.error('Error sending payment failure email:', error)
        }
    }
}

export default new EmailService()
