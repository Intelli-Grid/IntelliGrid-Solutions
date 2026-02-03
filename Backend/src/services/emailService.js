import SibApiV3Sdk from '@sendinblue/client'

/**
 * Email Service using Brevo (formerly Sendinblue)
 */
class EmailService {
    constructor() {
        if (process.env.BREVO_API_KEY) {
            this.client = new SibApiV3Sdk.TransactionalEmailsApi()
            const apiKey = this.client.authentications['apiKey']
            apiKey.apiKey = process.env.BREVO_API_KEY
        }
    }

    /**
     * Send welcome email to new user
     */
    async sendWelcomeEmail(user) {
        if (!this.client) return

        try {
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
            sendSmtpEmail.subject = 'Welcome to IntelliGrid!'
            sendSmtpEmail.htmlContent = `
                <html>
                    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #7c3aed;">Welcome to IntelliGrid! 🎉</h1>
                        <p>Hi ${user.firstName || 'there'},</p>
                        <p>Thank you for joining IntelliGrid, your comprehensive AI tools directory!</p>
                        <p>With IntelliGrid, you can:</p>
                        <ul>
                            <li>Browse 3,690+ AI tools</li>
                            <li>Search with instant results</li>
                            <li>Save your favorite tools</li>
                            <li>Get personalized recommendations</li>
                        </ul>
                        <p>
                            <a href="${process.env.FRONTEND_URL}/tools" 
                               style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Start Exploring
                            </a>
                        </p>
                        <p>Happy exploring!</p>
                        <p>The IntelliGrid Team</p>
                    </body>
                </html>
            `
            sendSmtpEmail.sender = { name: 'IntelliGrid', email: 'noreply@intelligrid.com' }
            sendSmtpEmail.to = [{ email: user.email, name: user.firstName }]

            await this.client.sendTransacEmail(sendSmtpEmail)
            console.log('✅ Welcome email sent to:', user.email)
        } catch (error) {
            console.error('❌ Error sending welcome email:', error)
        }
    }

    /**
     * Send subscription confirmation email
     */
    async sendSubscriptionEmail(user, subscription) {
        if (!this.client) return

        try {
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
            sendSmtpEmail.subject = 'Subscription Confirmed - IntelliGrid Pro'
            sendSmtpEmail.htmlContent = `
                <html>
                    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #7c3aed;">Subscription Confirmed! 🚀</h1>
                        <p>Hi ${user.firstName},</p>
                        <p>Your IntelliGrid Pro subscription is now active!</p>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">Subscription Details</h3>
                            <p><strong>Plan:</strong> ${subscription.tier} (${subscription.duration})</p>
                            <p><strong>Status:</strong> Active</p>
                            <p><strong>Next Billing:</strong> ${new Date(subscription.nextBillingDate).toLocaleDateString()}</p>
                        </div>
                        <p>You now have access to:</p>
                        <ul>
                            <li>Unlimited favorites</li>
                            <li>Advanced search filters</li>
                            <li>Priority support</li>
                            <li>Early access to new tools</li>
                            <li>Ad-free experience</li>
                        </ul>
                        <p>
                            <a href="${process.env.FRONTEND_URL}/dashboard" 
                               style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Go to Dashboard
                            </a>
                        </p>
                        <p>Thank you for your support!</p>
                        <p>The IntelliGrid Team</p>
                    </body>
                </html>
            `
            sendSmtpEmail.sender = { name: 'IntelliGrid', email: 'noreply@intelligrid.com' }
            sendSmtpEmail.to = [{ email: user.email, name: user.firstName }]

            await this.client.sendTransacEmail(sendSmtpEmail)
            console.log('✅ Subscription email sent to:', user.email)
        } catch (error) {
            console.error('❌ Error sending subscription email:', error)
        }
    }

    /**
     * Send payment receipt email
     */
    async sendPaymentReceipt(user, payment) {
        if (!this.client) return

        try {
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
            sendSmtpEmail.subject = 'Payment Receipt - IntelliGrid'
            sendSmtpEmail.htmlContent = `
                <html>
                    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #7c3aed;">Payment Receipt</h1>
                        <p>Hi ${user.firstName},</p>
                        <p>Thank you for your payment. Here are the details:</p>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">Payment Details</h3>
                            <p><strong>Amount:</strong> $${payment.amount}</p>
                            <p><strong>Transaction ID:</strong> ${payment.transactionId}</p>
                            <p><strong>Date:</strong> ${new Date(payment.date).toLocaleDateString()}</p>
                            <p><strong>Payment Method:</strong> ${payment.gateway}</p>
                        </div>
                        <p>If you have any questions, please contact our support team.</p>
                        <p>The IntelliGrid Team</p>
                    </body>
                </html>
            `
            sendSmtpEmail.sender = { name: 'IntelliGrid', email: 'noreply@intelligrid.com' }
            sendSmtpEmail.to = [{ email: user.email, name: user.firstName }]

            await this.client.sendTransacEmail(sendSmtpEmail)
            console.log('✅ Payment receipt sent to:', user.email)
        } catch (error) {
            console.error('❌ Error sending payment receipt:', error)
        }
    }

    /**
     * Send admin notification
     */
    async sendAdminNotification(subject, message) {
        if (!this.client) return

        try {
            const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()
            sendSmtpEmail.subject = `[IntelliGrid Admin] ${subject}`
            sendSmtpEmail.htmlContent = `
                <html>
                    <body style="font-family: Arial, sans-serif;">
                        <h2>${subject}</h2>
                        <p>${message}</p>
                        <p><small>This is an automated notification from IntelliGrid.</small></p>
                    </body>
                </html>
            `
            sendSmtpEmail.sender = { name: 'IntelliGrid System', email: 'system@intelligrid.com' }
            sendSmtpEmail.to = [{ email: 'admin@intelligrid.com', name: 'Admin' }]

            await this.client.sendTransacEmail(sendSmtpEmail)
            console.log('✅ Admin notification sent')
        } catch (error) {
            console.error('❌ Error sending admin notification:', error)
        }
    }
}

export default new EmailService()
