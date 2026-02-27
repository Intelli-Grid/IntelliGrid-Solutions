/**
 * emailService.js - Transactional email via Brevo (@getbrevo/brevo v2)
 *
 * The old SibApiV3Sdk API (new TransactionalEmailsApi(), new SendSmtpEmail(), etc.)
 * was removed in @getbrevo/brevo v2. The new API uses BrevoClient with method chaining:
 *   const client = new BrevoClient({ apiKey: '...' })
 *   await client.transactionalEmails.sendTransacEmail({ ... })
 */
import { BrevoClient } from '@getbrevo/brevo'
import dotenv from 'dotenv'

dotenv.config()

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.intelligrid.online'

// ---------------------------------------------------------------------------
// Guard — lazy client creation so missing API key doesn't crash on import
// ---------------------------------------------------------------------------
let _client = null

function getClient() {
    if (!process.env.BREVO_API_KEY || process.env.BREVO_API_KEY === 'your_brevo_api_key_here') {
        return null
    }
    if (!_client) {
        _client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY })
    }
    return _client
}

// ---------------------------------------------------------------------------
// Email helpers
// ---------------------------------------------------------------------------

function emailFooter(type, email) {
    const encoded = encodeURIComponent(email || '')
    const unsubUrl = `${FRONTEND_URL}/unsubscribe?email=${encoded}&type=${type}`
    return `
        <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px;line-height:1.6;">
            <p>IntelliGrid &middot; AI Tools Directory</p>
            <p>
                You received this email because you have an account with IntelliGrid.<br>
                <a href="${unsubUrl}" style="color:#7c3aed;text-decoration:underline;">Unsubscribe</a>
                &nbsp;|&nbsp;
                <a href="${FRONTEND_URL}/privacy-policy" style="color:#7c3aed;text-decoration:underline;">Privacy Policy</a>
                &nbsp;|&nbsp;
                <a href="${FRONTEND_URL}/dashboard" style="color:#7c3aed;text-decoration:underline;">Manage Preferences</a>
            </p>
        </div>`
}

function emailWrapper(content, recipientEmail) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>IntelliGrid</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">IntelliGrid</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">The AI Tools Directory</p>
    </div>
    <div style="padding:32px 24px;">${content}</div>
    ${emailFooter('transactional', recipientEmail)}
  </div>
</body>
</html>`
}

/**
 * Core send helper — wraps client.transactionalEmails.sendTransacEmail()
 */
async function sendEmail(to, toName, subject, htmlContent) {
    const client = getClient()
    if (!client) {
        console.warn('Brevo API key missing — email not sent to:', to)
        return null
    }

    const payload = {
        sender: {
            email: process.env.BREVO_SENDER_EMAIL || 'noreply@intelligrid.online',
            name: process.env.BREVO_SENDER_NAME || 'IntelliGrid',
        },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent,
    }

    try {
        const result = await client.transactionalEmails.sendTransacEmail(payload)
        console.log('Email sent to:', to, '| messageId:', result?.body?.messageId || result?.messageId || 'ok')
        return result
    } catch (err) {
        const detail = err?.body || err?.response?.body || err?.message || String(err)
        console.error('Email send failed to:', to, '|', detail)
        return null
    }
}

// ---------------------------------------------------------------------------
// EmailService class
// ---------------------------------------------------------------------------

class EmailService {
    /** Welcome email — sent when a new user signs up */
    async sendWelcomeEmail(user) {
        const content = `
            <h2 style="color:#111827;margin-top:0;">Welcome to IntelliGrid, ${user.firstName}!</h2>
            <p style="color:#374151;line-height:1.6;">We're thrilled to have you join the IntelliGrid community — the largest curated directory of AI tools on the web.</p>
            <p style="color:#374151;line-height:1.6;">Here's what you can do:</p>
            <ul style="color:#374151;line-height:1.8;">
                <li>Discover and compare AI tools side-by-side</li>
                <li>Save favourites and organise tools into collections</li>
                <li>Write reviews and help the community</li>
                <li>Upgrade to Pro for unlimited access</li>
            </ul>
            <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/tools" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Explore AI Tools &rarr;
                </a>
            </div>`
        return sendEmail(user.email, user.firstName, 'Welcome to IntelliGrid!', emailWrapper(content, user.email))
    }

    /** Subscription confirmation — sent after successful payment */
    async sendSubscriptionConfirmation(user, subscription) {
        const content = `
            <h2 style="color:#111827;margin-top:0;">Subscription Activated</h2>
            <p style="color:#374151;line-height:1.6;">Hi ${user.firstName},</p>
            <p style="color:#374151;line-height:1.6;">Your <strong>IntelliGrid ${subscription.tier}</strong> subscription (${subscription.duration}) is now active!</p>
            <div style="background:#f3f4f6;border-radius:8px;padding:20px;margin:20px 0;">
                <table style="width:100%;border-collapse:collapse;">
                    <tr>
                        <td style="color:#6b7280;padding:6px 0;font-size:14px;">Plan</td>
                        <td style="color:#111827;font-weight:600;text-align:right;font-size:14px;">${subscription.tier} (${subscription.duration})</td>
                    </tr>
                    <tr>
                        <td style="color:#6b7280;padding:6px 0;font-size:14px;">Amount</td>
                        <td style="color:#111827;font-weight:600;text-align:right;font-size:14px;">${subscription.amount}</td>
                    </tr>
                    <tr>
                        <td style="color:#6b7280;padding:6px 0;font-size:14px;">Next Billing</td>
                        <td style="color:#111827;font-weight:600;text-align:right;font-size:14px;">${subscription.nextBillingDate}</td>
                    </tr>
                </table>
            </div>
            <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Go to Dashboard &rarr;
                </a>
            </div>
            <p style="color:#6b7280;font-size:13px;line-height:1.6;">You can manage or cancel your subscription at any time from your dashboard or by emailing support@intelligrid.online.</p>`
        return sendEmail(user.email, user.firstName, 'Your IntelliGrid Pro Subscription is Active!', emailWrapper(content, user.email))
    }

    /** Payment receipt — sent after every successful transaction */
    async sendPaymentReceipt(user, payment) {
        const dateStr = new Date(payment.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        const content = `
            <h2 style="color:#111827;margin-top:0;">Payment Receipt</h2>
            <p style="color:#374151;line-height:1.6;">Hi ${user.firstName},</p>
            <p style="color:#374151;line-height:1.6;">Thank you for your payment. Here is your receipt:</p>
            <div style="background:#f3f4f6;border-radius:8px;padding:20px;margin:20px 0;">
                <table style="width:100%;border-collapse:collapse;">
                    <tr>
                        <td style="color:#6b7280;padding:6px 0;font-size:14px;">Receipt #</td>
                        <td style="color:#111827;font-weight:600;text-align:right;font-size:14px;">${payment.id}</td>
                    </tr>
                    <tr>
                        <td style="color:#6b7280;padding:6px 0;font-size:14px;">Date</td>
                        <td style="color:#111827;font-weight:600;text-align:right;font-size:14px;">${dateStr}</td>
                    </tr>
                    <tr>
                        <td style="color:#6b7280;padding:6px 0;font-size:14px;">Total</td>
                        <td style="color:#111827;font-weight:600;text-align:right;font-size:14px;">${payment.amount}</td>
                    </tr>
                    ${payment.gateway ? `<tr><td style="color:#6b7280;padding:6px 0;font-size:14px;">Via</td><td style="color:#111827;font-weight:600;text-align:right;font-size:14px;">${payment.gateway}</td></tr>` : ''}
                </table>
            </div>
            <p style="color:#6b7280;font-size:13px;">Keep this email for your records. For refund requests, see our <a href="${FRONTEND_URL}/refund-policy" style="color:#7c3aed;">Refund Policy</a>.</p>`
        return sendEmail(user.email, user.firstName, 'Payment Receipt — IntelliGrid Pro', emailWrapper(content, user.email))
    }

    /** Renewal reminder — sent 7 days before subscription expires */
    async sendRenewalReminder(user, subscription) {
        const expiryDate = new Date(subscription.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        const content = `
            <h2 style="color:#111827;margin-top:0;">Your Subscription Renews in 7 Days</h2>
            <p style="color:#374151;line-height:1.6;">Hi ${user.firstName},</p>
            <p style="color:#374151;line-height:1.6;">Just a heads-up — your <strong>IntelliGrid ${subscription.tier}</strong> subscription is set to renew on <strong>${expiryDate}</strong>.</p>
            <p style="color:#374151;line-height:1.6;">Make sure your payment details are up to date to avoid any interruption.</p>
            <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Manage Subscription &rarr;
                </a>
            </div>
            <p style="color:#6b7280;font-size:13px;">Want to cancel? You can do so at any time from your dashboard — no questions asked within 30 days of billing.</p>`
        return sendEmail(user.email, user.firstName, 'Your IntelliGrid Subscription Renews in 7 Days', emailWrapper(content, user.email))
    }

    /** Payment failure alert */
    async sendPaymentFailure(user, order = {}) {
        const orderInfo = order.orderId ? ` (Order #<strong>${order.orderId}</strong>)` : ''
        const content = `
            <h2 style="color:#dc2626;margin-top:0;">Action Required: Payment Failed</h2>
            <p style="color:#374151;line-height:1.6;">Hi ${user.firstName},</p>
            <p style="color:#374151;line-height:1.6;">We were unable to process your payment${orderInfo}. Your IntelliGrid Pro subscription may be paused as a result.</p>
            <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/pricing" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Retry Payment &rarr;
                </a>
            </div>
            <p style="color:#6b7280;font-size:13px;line-height:1.6;">If you believe this is an error, please contact us at <a href="mailto:support@intelligrid.online" style="color:#7c3aed;">support@intelligrid.online</a>.</p>`
        return sendEmail(user.email, user.firstName, 'Action Required: Payment Failed', emailWrapper(content, user.email))
    }

    /** Subscription expired — sent when subscription reaches its end date naturally */
    async sendSubscriptionExpired(user) {
        const content = `
            <h2 style="color:#111827;margin-top:0;">Your IntelliGrid Subscription Has Ended</h2>
            <p style="color:#374151;line-height:1.6;">Hi ${user.firstName},</p>
            <p style="color:#374151;line-height:1.6;">Your <strong>IntelliGrid Pro</strong> subscription has reached its end date and your account has been moved to the Free plan.</p>
            <p style="color:#374151;line-height:1.6;">You can continue browsing tools on the Free plan, or resubscribe anytime to restore full Pro access instantly.</p>
            <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0;">
                <p style="margin:0;color:#374151;font-size:14px;"><strong>What you lose on Free:</strong></p>
                <ul style="color:#6b7280;font-size:14px;line-height:1.8;margin:8px 0 0;">
                    <li>Unlimited favourites &amp; collections</li>
                    <li>Advanced filters &amp; sorting</li>
                    <li>Priority tool discovery</li>
                    <li>Ad-free experience</li>
                </ul>
            </div>
            <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/pricing" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Resubscribe to Pro &rarr;
                </a>
            </div>
            <p style="color:#6b7280;font-size:13px;line-height:1.6;">Questions? Reach us at <a href="mailto:support@intelligrid.online" style="color:#7c3aed;">support@intelligrid.online</a> — we're happy to help.</p>`
        return sendEmail(user.email, user.firstName, 'Your IntelliGrid Pro Subscription Has Ended', emailWrapper(content, user.email))
    }

    /** Claim verification — sent to tool owner when they submit a claim */
    async sendClaimVerificationEmail(claim, tool) {
        const content = `
            <h2 style="color:#111827;margin-top:0;">Claim Request Received</h2>
            <p style="color:#374151;line-height:1.6;">Hello,</p>
            <p style="color:#374151;line-height:1.6;">We have received your request to claim ownership of <strong>${tool.name}</strong> on IntelliGrid.</p>
            <p style="color:#374151;line-height:1.6;">Our team will review your verification information and respond within 2-3 business days.</p>
            <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0;">
                <p style="margin:0;color:#6b7280;font-size:14px;">Claim Reference: <strong>${claim._id}</strong></p>
            </div>
            <p style="color:#6b7280;font-size:13px;">If you did not make this request, please ignore this email.</p>`
        return sendEmail(claim.email, 'Tool Owner', `Received: Claim Request for ${tool.name}`, emailWrapper(content, claim.email))
    }

    /** Claim invitation — sent to founders when their tool is listed */
    async sendClaimInvitation(tool, contactEmail) {
        const content = `
            <h2 style="color:#111827;margin-top:0;">Your AI Tool is Featured on IntelliGrid!</h2>
            <p style="color:#374151;line-height:1.6;">Hello,</p>
            <p style="color:#374151;line-height:1.6;">Great news — <strong>${tool.name}</strong> has been listed on <a href="${FRONTEND_URL}" style="color:#7c3aed;">IntelliGrid</a>, one of the fastest-growing AI tools directories.</p>
            <p style="color:#374151;line-height:1.6;">You can claim your listing to update details, add screenshots, view analytics, and respond to community reviews.</p>
            <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/tools/${tool.slug}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    View &amp; Claim Your Listing &rarr;
                </a>
            </div>
            <p style="color:#6b7280;font-size:13px;">If you wish to have your tool removed, contact us at <a href="mailto:support@intelligrid.online" style="color:#7c3aed;">support@intelligrid.online</a>.</p>`
        const result = await sendEmail(contactEmail, undefined, `Your tool ${tool.name} is featured on IntelliGrid!`, emailWrapper(content, contactEmail))
        return !!result
    }

    /**
     * Public sendEmail() — used by routes that need to send ad-hoc transactional
     * emails without a pre-built template (e.g. submissionRoutes.js).
     *
     * Accepts either:
     *   emailService.sendEmail(to, subject, html)         — positional args
     *   emailService.sendEmail({ to, subject, html })     — object arg
     */
    async sendEmail(toOrObj, subject, html) {
        let to, subj, body
        if (toOrObj && typeof toOrObj === 'object' && !Array.isArray(toOrObj) && 'to' in toOrObj) {
            to = toOrObj.to
            subj = toOrObj.subject
            body = toOrObj.html
        } else {
            to = toOrObj
            subj = subject
            body = html
        }
        return sendEmail(to, undefined, subj, body)
    }

    /**
     * Add or update a contact in the Brevo contacts list.
     * Used when users subscribe to the newsletter.
     */
    async addSubscriber(email, attributes = {}) {
        const client = getClient()
        if (!client) {
            console.warn('Brevo API key missing — subscriber not added:', email)
            return false
        }

        const payload = {
            email,
            attributes,
            updateEnabled: true,
            ...(process.env.BREVO_LIST_ID ? { listIds: [parseInt(process.env.BREVO_LIST_ID)] } : {}),
        }

        try {
            await client.contacts.createContact(payload)
            console.log('Subscriber added to Brevo:', email)
            return true
        } catch (err) {
            const detail = err?.body || err?.response?.body || err?.message || String(err)
            console.error('Failed to add subscriber to Brevo:', email, '|', detail)
            return false
        }
    }
}

export default new EmailService()
