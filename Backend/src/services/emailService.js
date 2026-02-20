import * as SibApiV3Sdk from '@getbrevo/brevo'
import dotenv from 'dotenv'

dotenv.config()

let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
let apiKey = apiInstance.authentications['apiKey']
apiKey.apiKey = process.env.BREVO_API_KEY

// ─────────────────────────────────────────────────────────────────────────────
// Shared email helpers
// ─────────────────────────────────────────────────────────────────────────────
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.intelligrid.online'

/**
 * Generates a compliant email footer with unsubscribe + physical address.
 * ✅ Bug #8 Fix: All outbound emails must include an unsubscribe link (CAN-SPAM / GDPR).
 * @param {string} type - 'transactional' | 'marketing'
 * @param {string} email - Recipient email (used to build unsubscribe URL)
 */
function emailFooter(type = 'transactional', email = '') {
    const encoded = encodeURIComponent(email)
    const unsubscribeUrl = `${FRONTEND_URL}/unsubscribe?email=${encoded}&type=${type}`

    return `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; line-height: 1.6;">
            <p>IntelliGrid · AI Tools Directory</p>
            <p>
                You received this email because you have an account with IntelliGrid.<br>
                <a href="${unsubscribeUrl}" style="color: #7c3aed; text-decoration: underline;">Unsubscribe</a>
                &nbsp;|&nbsp;
                <a href="${FRONTEND_URL}/privacy-policy" style="color: #7c3aed; text-decoration: underline;">Privacy Policy</a>
                &nbsp;|&nbsp;
                <a href="${FRONTEND_URL}/dashboard" style="color: #7c3aed; text-decoration: underline;">Manage Preferences</a>
            </p>
        </div>
    `
}

/**
 * Wraps HTML content in a branded email shell.
 */
function emailWrapper(content, recipientEmail = '') {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>IntelliGrid</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 32px 24px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">IntelliGrid</h1>
                <p style="margin: 4px 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">The AI Tools Directory</p>
            </div>
            <!-- Body -->
            <div style="padding: 32px 24px;">
                ${content}
            </div>
            <!-- Footer -->
            ${emailFooter('transactional', recipientEmail)}
        </div>
    </body>
    </html>
    `
}

/**
 * Guard — returns true if Brevo is configured, logs warning otherwise.
 */
function isBrevoConfigured() {
    if (!process.env.BREVO_API_KEY || process.env.BREVO_API_KEY === 'your_brevo_api_key_here') {
        console.warn('⚠️  Brevo API key missing — email not sent.')
        return false
    }
    return true
}

/**
 * Create a pre-configured SendSmtpEmail object.
 */
function buildEmail(to, toName, subject, htmlContent) {
    const email = new SibApiV3Sdk.SendSmtpEmail()
    email.to = [{ email: to, name: toName || to }]
    email.sender = {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME || 'IntelliGrid',
    }
    email.subject = subject
    email.htmlContent = htmlContent
    return email
}

// ─────────────────────────────────────────────────────────────────────────────
// Email Service Class
// ─────────────────────────────────────────────────────────────────────────────
class EmailService {
    /**
     * Send welcome email to new users
     * @param {Object} user - { email, firstName }
     */
    async sendWelcomeEmail(user) {
        if (!isBrevoConfigured()) return

        const content = `
            <h2 style="color: #111827; margin-top: 0;">Welcome to IntelliGrid, ${user.firstName}! 🚀</h2>
            <p style="color: #374151; line-height: 1.6;">
                We're thrilled to have you join the IntelliGrid community — the largest curated directory of AI tools on the web.
            </p>
            <p style="color: #374151; line-height: 1.6;">Here's what you can do:</p>
            <ul style="color: #374151; line-height: 1.8;">
                <li>🔍 Discover and compare AI tools side-by-side</li>
                <li>📚 Save favorites and organize tools into collections</li>
                <li>✍️ Write reviews and help the community</li>
                <li>⚡ Upgrade to Pro for unlimited access</li>
            </ul>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${FRONTEND_URL}/tools" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                    Explore AI Tools →
                </a>
            </div>
        `

        const email = buildEmail(user.email, user.firstName, 'Welcome to IntelliGrid! 🚀', emailWrapper(content, user.email))

        try {
            const data = await apiInstance.sendTransacEmail(email)
            console.log('✅ Welcome email sent to:', user.email)
            return data
        } catch (error) {
            console.error('❌ Error sending welcome email:', error.response?.body || error.message)
        }
    }

    /**
     * Send subscription confirmation email
     * @param {Object} user - User object
     * @param {Object} subscription - { tier, duration, amount, nextBillingDate }
     */
    async sendSubscriptionConfirmation(user, subscription) {
        if (!isBrevoConfigured()) return

        const content = `
            <h2 style="color: #111827; margin-top: 0;">Subscription Activated ✅</h2>
            <p style="color: #374151; line-height: 1.6;">Hi ${user.firstName},</p>
            <p style="color: #374151; line-height: 1.6;">
                Your <strong>IntelliGrid ${subscription.tier}</strong> subscription (${subscription.duration}) is now active!
            </p>
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Plan</td>
                        <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${subscription.tier} (${subscription.duration})</td>
                    </tr>
                    <tr>
                        <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Amount</td>
                        <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${subscription.amount}</td>
                    </tr>
                    <tr>
                        <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Next Billing</td>
                        <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${subscription.nextBillingDate}</td>
                    </tr>
                </table>
            </div>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${FRONTEND_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                    Go to Dashboard →
                </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
                You can manage or cancel your subscription at any time from your dashboard 
                or by emailing us at support@intelligrid.online.
            </p>
        `

        const email = buildEmail(
            user.email, user.firstName,
            'Your IntelliGrid Pro Subscription is Active! 🎉',
            emailWrapper(content, user.email)
        )

        try {
            const data = await apiInstance.sendTransacEmail(email)
            console.log('✅ Subscription confirmation sent to:', user.email)
            return data
        } catch (error) {
            console.error('❌ Error sending subscription email:', error.response?.body || error.message)
        }
    }

    /**
     * Send payment receipt
     * @param {Object} user
     * @param {Object} payment - { id, createdAt, amount, gateway }
     */
    async sendPaymentReceipt(user, payment) {
        if (!isBrevoConfigured()) return

        const content = `
            <h2 style="color: #111827; margin-top: 0;">Payment Receipt</h2>
            <p style="color: #374151; line-height: 1.6;">Hi ${user.firstName},</p>
            <p style="color: #374151; line-height: 1.6;">Thank you for your payment. Here is your receipt:</p>
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Receipt #</td>
                        <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${payment.id}</td>
                    </tr>
                    <tr>
                        <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Date</td>
                        <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${new Date(payment.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                    </tr>
                    <tr>
                        <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Total</td>
                        <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${payment.amount}</td>
                    </tr>
                    ${payment.gateway ? `
                    <tr>
                        <td style="color: #6b7280; padding: 6px 0; font-size: 14px;">Via</td>
                        <td style="color: #111827; font-weight: 600; text-align: right; font-size: 14px;">${payment.gateway}</td>
                    </tr>` : ''}
                </table>
            </div>
            <p style="color: #6b7280; font-size: 13px;">
                Keep this email for your records. For refund requests, please see our 
                <a href="${FRONTEND_URL}/refund-policy" style="color: #7c3aed;">Refund Policy</a>.
            </p>
        `

        const email = buildEmail(
            user.email, user.firstName,
            'Payment Receipt — IntelliGrid Pro',
            emailWrapper(content, user.email)
        )

        try {
            const data = await apiInstance.sendTransacEmail(email)
            console.log('✅ Receipt email sent to:', user.email)
            return data
        } catch (error) {
            console.error('❌ Error sending receipt email:', error.response?.body || error.message)
        }
    }

    /**
     * Send renewal reminder (fires 7 days before expiry)
     * @param {Object} user
     * @param {Object} subscription - { tier, endDate }
     */
    async sendRenewalReminder(user, subscription) {
        if (!isBrevoConfigured()) return

        const expiryDate = new Date(subscription.endDate).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        })

        const content = `
            <h2 style="color: #111827; margin-top: 0;">Your Subscription Renews in 7 Days 📅</h2>
            <p style="color: #374151; line-height: 1.6;">Hi ${user.firstName},</p>
            <p style="color: #374151; line-height: 1.6;">
                Just a heads-up — your <strong>IntelliGrid ${subscription.tier}</strong> subscription 
                is set to renew on <strong>${expiryDate}</strong>.
            </p>
            <p style="color: #374151; line-height: 1.6;">
                Make sure your payment details are up to date to avoid any interruption.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${FRONTEND_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                    Manage Subscription →
                </a>
            </div>
            <p style="color: #6b7280; font-size: 13px;">
                Want to cancel? You can do so at any time from your dashboard —
                no questions asked within 30 days of billing.
            </p>
        `

        const email = buildEmail(
            user.email, user.firstName,
            'Your IntelliGrid Subscription Renews in 7 Days',
            emailWrapper(content, user.email)
        )

        try {
            await apiInstance.sendTransacEmail(email)
            console.log('✅ Renewal reminder sent to:', user.email)
        } catch (error) {
            console.error('❌ Error sending renewal reminder:', error.response?.body || error.message)
        }
    }

    /**
     * Send payment failure alert
     * @param {Object} user
     * @param {Object} order - { orderId, amount }
     */
    async sendPaymentFailure(user, order = {}) {
        if (!isBrevoConfigured()) return

        const content = `
            <h2 style="color: #dc2626; margin-top: 0;">⚠️ Action Required: Payment Failed</h2>
            <p style="color: #374151; line-height: 1.6;">Hi ${user.firstName},</p>
            <p style="color: #374151; line-height: 1.6;">
                We were unable to process your payment${order.orderId ? ` (Order #<strong>${order.orderId}</strong>)` : ''}. 
                Your IntelliGrid Pro subscription may be paused as a result.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${FRONTEND_URL}/pricing" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #b91c1c); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                    Retry Payment →
                </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
                If you believe this is an error, please contact us at 
                <a href="mailto:support@intelligrid.online" style="color: #7c3aed;">support@intelligrid.online</a>.
            </p>
        `

        const email = buildEmail(
            user.email, user.firstName,
            '⚠️ Payment Failed — Action Required',
            emailWrapper(content, user.email)
        )

        try {
            await apiInstance.sendTransacEmail(email)
            console.log('✅ Payment failure alert sent to:', user.email)
        } catch (error) {
            console.error('❌ Error sending payment failure email:', error.response?.body || error.message)
        }
    }

    /**
     * Send claim verification email
     * @param {Object} claim - { email, _id }
     * @param {Object} tool - { name, slug }
     */
    async sendClaimVerificationEmail(claim, tool) {
        if (!isBrevoConfigured()) return

        const content = `
            <h2 style="color: #111827; margin-top: 0;">Claim Request Received ✅</h2>
            <p style="color: #374151; line-height: 1.6;">Hello,</p>
            <p style="color: #374151; line-height: 1.6;">
                We have received your request to claim ownership of 
                <strong>${tool.name}</strong> on IntelliGrid.
            </p>
            <p style="color: #374151; line-height: 1.6;">
                Our team will review your verification information and respond within 2–3 business days.
            </p>
            <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Claim Reference: <strong>${claim._id}</strong></p>
            </div>
            <p style="color: #6b7280; font-size: 13px;">
                If you did not make this request, please ignore this email — no action is required.
            </p>
        `

        const email = buildEmail(
            claim.email, 'Tool Owner',
            `Received: Claim Request for ${tool.name}`,
            emailWrapper(content, claim.email)
        )

        try {
            await apiInstance.sendTransacEmail(email)
            console.log('✅ Claim verification email sent to:', claim.email)
        } catch (error) {
            console.error('❌ Error sending claim email:', error.response?.body || error.message)
        }
    }

    /**
     * Send claim invitation email to tool owner
     * @param {Object} tool - { name, slug }
     * @param {string} contactEmail - Founder email
     */
    async sendClaimInvitation(tool, contactEmail) {
        if (!isBrevoConfigured()) return

        const content = `
            <h2 style="color: #111827; margin-top: 0;">Your AI Tool is Featured on IntelliGrid! 🚀</h2>
            <p style="color: #374151; line-height: 1.6;">Hello,</p>
            <p style="color: #374151; line-height: 1.6;">
                Great news — <strong>${tool.name}</strong> has been listed on 
                <a href="${FRONTEND_URL}" style="color: #7c3aed;">IntelliGrid</a>, 
                one of the fastest-growing AI tools directories.
            </p>
            <p style="color: #374151; line-height: 1.6;">
                You can claim your listing to update details, add screenshots, view analytics, 
                and respond to community reviews.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="${FRONTEND_URL}/tools/${tool.slug}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                    View & Claim Your Listing →
                </a>
            </div>
            <p style="color: #6b7280; font-size: 13px;">
                If this email was sent to you in error or you wish to have your tool removed, 
                please contact us at <a href="mailto:support@intelligrid.online" style="color: #7c3aed;">support@intelligrid.online</a>.
            </p>
        `

        const email = buildEmail(
            contactEmail, undefined,
            `Your tool ${tool.name} is featured on IntelliGrid!`,
            emailWrapper(content, contactEmail)
        )

        try {
            await apiInstance.sendTransacEmail(email)
            console.log('✅ Claim invitation sent to:', contactEmail)
            return true
        } catch (error) {
            console.error('❌ Error sending invitation email:', error.response?.body || error.message)
            return false
        }
    }

    /**
     * Add subscriber to Brevo contacts list
     * @param {string} email
     * @param {Object} attributes
     */
    async addSubscriber(email, attributes = {}) {
        if (!isBrevoConfigured()) return false

        const contactsApi = new SibApiV3Sdk.ContactsApi()
        const key = contactsApi.authentications['apiKey']
        key.apiKey = process.env.BREVO_API_KEY

        const createContact = new SibApiV3Sdk.CreateContact()
        createContact.email = email
        createContact.attributes = attributes
        createContact.updateEnabled = true

        if (process.env.BREVO_LIST_ID) {
            createContact.listIds = [parseInt(process.env.BREVO_LIST_ID)]
        }

        try {
            await contactsApi.createContact(createContact)
            console.log('✅ Subscriber added to Brevo:', email)
            return true
        } catch (error) {
            console.error('❌ Error adding subscriber to Brevo:', error?.response?.body || error.message)
            return false
        }
    }
}

export default new EmailService()
