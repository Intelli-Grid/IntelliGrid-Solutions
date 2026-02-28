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
     * Trial Welcome — Day 0 — sent when new user is created
     * Replaces the generic sendWelcomeEmail for all new signups.
     */
    async sendTrialWelcomeEmail(user, trialEndDate) {
        const endDateStr = new Date(trialEndDate).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })
        const content = `
            <h2 style="color:#111827;margin-top:0;">Welcome to IntelliGrid, ${user.firstName || 'there'}! 🎉</h2>
            <div style="background:linear-gradient(135deg,rgba(124,58,237,0.08),rgba(79,70,229,0.08));border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:20px;margin:20px 0;">
                <p style="color:#7c3aed;font-weight:700;margin:0 0 8px;font-size:16px;">Your 14-day Pro trial is now active.</p>
                <p style="color:#374151;margin:0;font-size:14px;">No credit card needed. Trial ends on <strong>${endDateStr}</strong>.</p>
            </div>
            <p style="color:#374151;line-height:1.6;">You have full Pro access right now. Here's the single most useful thing to do in the next 5 minutes:</p>
            <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0;">
                <p style="margin:0;color:#374151;font-size:15px;">→ Search for a tool you've been curious about, then <strong>save it to your favourites</strong>. You can save unlimited tools during your trial.</p>
            </div>
            <p style="color:#374151;line-height:1.6;">Over the next 14 days, you'll have access to:</p>
            <ul style="color:#374151;line-height:1.8;">
                <li><strong>Unlimited favourites</strong> — save your entire AI stack</li>
                <li><strong>Advanced filters</strong> — find the right tool in one search</li>
                <li><strong>Unlimited collections</strong> — organise tools by project or use case</li>
                <li><strong>Priority search</strong> — featured tools surface to the top</li>
                <li><strong>Ad-free experience</strong> throughout</li>
            </ul>
            <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/tools" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Explore IntelliGrid Now →
                </a>
            </div>
            <p style="color:#6b7280;font-size:13px;">After 14 days, you can upgrade to keep Pro access ($9.99/month or $79.99/year), or stay on our free plan. No pressure, no surprises.</p>`
        return sendEmail(user.email, user.firstName, "You're in — 14-day Pro trial active (no card needed)", emailWrapper(content, user.email))
    }

    /**
     * Trial Midpoint Nudge — Day 7 — highlights a key Pro feature
     */
    async sendTrialMidpointEmail(user) {
        const content = `
            <h2 style="color:#111827;margin-top:0;">7 days in — have you tried this yet?</h2>
            <p style="color:#374151;line-height:1.6;">Hi ${user.firstName || 'there'},</p>
            <p style="color:#374151;line-height:1.6;">You're halfway through your Pro trial. Here's the one feature most users say they can't go back to using the free plan without:</p>
            <div style="background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(79,70,229,0.06));border:1px solid rgba(124,58,237,0.15);border-radius:12px;padding:20px;margin:20px 0;">
                <p style="color:#7c3aed;font-weight:700;margin:0 0 8px;font-size:16px;">Advanced Collections</p>
                <p style="color:#374151;margin:0;font-size:14px;">Organise your saved tools into unlimited collections by project, client, or use case — then share them publicly or keep them private. Free plan users are limited to 2 collections.</p>
            </div>
            <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Try Collections Now →
                </a>
            </div>
            <p style="color:#6b7280;font-size:13px;">You have 7 days left on your trial. Upgrade anytime at $9.99/month or $79.99/year (that's just $6.67/mo — 4 months free).</p>`
        return sendEmail(user.email, user.firstName, '7 days in — have you tried this yet?', emailWrapper(content, user.email))
    }

    /**
     * Trial 3-Day Reminder — Day 11 — first urgency reminder
     */
    async sendTrialReminderEmail(user, daysLeft) {
        const urgency = daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`
        const content = `
            <h2 style="color:#111827;margin-top:0;">Your Pro trial ends ${urgency}</h2>
            <p style="color:#374151;line-height:1.6;">Hi ${user.firstName || 'there'},</p>
            <p style="color:#374151;line-height:1.6;">Just a heads-up — your IntelliGrid Pro trial ends ${urgency}. After that, your account moves to the free plan and you'll lose access to:</p>
            <div style="background:#fef3c7;border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:16px;margin:20px 0;">
                <ul style="color:#92400e;font-size:14px;line-height:1.8;margin:0;padding-left:16px;">
                    <li>Unlimited favourites (free plan: 10 max)</li>
                    <li>Advanced filters and sorting</li>
                    <li>Unlimited collections (free plan: 2 max)</li>
                    <li>Ad-free experience</li>
                </ul>
            </div>
            <p style="color:#374151;line-height:1.6;">To keep everything: upgrade now for <strong>$9.99/month</strong>, or save 33% with the annual plan at <strong>$79.99/year</strong> (just $6.67/month — 4 months free).</p>
            <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/pricing" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Keep Pro — Upgrade Now →
                </a>
            </div>
            <p style="color:#6b7280;font-size:13px;text-align:center;">Or do nothing — you'll stay on the free plan automatically. No charge, ever.</p>`
        return sendEmail(user.email, user.firstName, `Your Pro trial ends ${urgency} — keep access?`, emailWrapper(content, user.email))
    }

    /**
     * Trial Urgency — Day 12 — 2 days left, hard deadline with pricing table
     */
    async sendTrialUrgencyEmail(user) {
        const content = `
            <h2 style="color:#dc2626;margin-top:0;">2 days left on your Pro trial</h2>
            <p style="color:#374151;line-height:1.6;">Hi ${user.firstName || 'there'},</p>
            <p style="color:#374151;line-height:1.6;">Your IntelliGrid Pro trial ends in 2 days. To keep everything working the way it does now, upgrade before your trial ends.</p>
            <div style="background:#f3f4f6;border-radius:8px;padding:20px;margin:20px 0;">
                <table style="width:100%;border-collapse:collapse;">
                    <tr>
                        <td style="color:#6b7280;padding:8px 0;font-size:14px;">Pro Monthly</td>
                        <td style="color:#111827;font-weight:700;text-align:right;font-size:14px;">$9.99/month</td>
                    </tr>
                    <tr>
                        <td style="color:#6b7280;padding:8px 0;font-size:14px;">Pro Annual <span style="color:#7c3aed;font-size:12px;font-weight:600;">★ Best value</span></td>
                        <td style="color:#111827;font-weight:700;text-align:right;font-size:14px;">$79.99/year <span style="color:#6b7280;font-size:12px;">($6.67/mo)</span></td>
                    </tr>
                    <tr>
                        <td style="color:#059669;padding:8px 0;font-size:13px;" colspan="2">✓ Annual plan — pay for 8 months, use for 12</td>
                    </tr>
                </table>
            </div>
            <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/pricing" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Upgrade Now — Keep Pro Access →
                </a>
            </div>
            <p style="color:#6b7280;font-size:12px;text-align:center;">No commitment. Cancel anytime. 30-day money-back guarantee.</p>`
        return sendEmail(user.email, user.firstName, '⚠️ 2 days left on your Pro trial', emailWrapper(content, user.email))
    }

    /**
     * Trial Expired — Day 14 — sent when cron downgrades user to Free
     */
    async sendTrialExpiredEmail(user) {
        const content = `
            <h2 style="color:#111827;margin-top:0;">Your Pro trial has ended</h2>
            <p style="color:#374151;line-height:1.6;">Hi ${user.firstName || 'there'},</p>
            <p style="color:#374151;line-height:1.6;">Your 14-day IntelliGrid Pro trial has ended and your account has been moved to the free plan. Your data is safe — all favourites and collections you created are still there.</p>
            <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0;">
                <p style="margin:0 0 8px;color:#374151;font-size:14px;font-weight:600;">What's changed on the free plan:</p>
                <ul style="color:#6b7280;font-size:14px;line-height:1.8;margin:0;padding-left:16px;">
                    <li>Favourites limited to 10 (you can keep what you have, but can't add more)</li>
                    <li>Collections limited to 2</li>
                    <li>Advanced filters are Pro-only</li>
                    <li>Ads may appear on tool pages</li>
                </ul>
            </div>
            <p style="color:#374151;line-height:1.6;">Upgrade anytime to instantly restore full Pro access.</p>
            <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/pricing" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Upgrade to Pro — Keep Everything →
                </a>
            </div>
            <p style="color:#6b7280;font-size:13px;">No pressure. IntelliGrid's free plan has everything you need to browse and discover tools. We hope to see you back as a Pro user when the time is right.</p>`
        return sendEmail(user.email, user.firstName, 'Your IntelliGrid Pro trial has ended', emailWrapper(content, user.email))
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

    /**
     * Subscription Expired — sent when a paid sub's endDate passes
     */
    async sendSubscriptionExpiredEmail(user) {
        const content = `
            <h2 style="color:#111827;margin-top:0;">Your IntelliGrid plan has expired</h2>
            <p style="color:#374151;line-height:1.6;">Hi ${user.firstName || 'there'},</p>
            <p style="color:#374151;line-height:1.6;">Your Pro subscription has ended and your account has been moved to the free plan. You won't lose any saved data — your favourites and collections are still there.</p>
            <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:20px 0;">
                <p style="margin:0 0 8px;font-weight:600;color:#111827;">What you still have:</p>
                <ul style="margin:0;color:#374151;line-height:1.8;">
                    <li>Access to 3,500+ tool listings</li>
                    <li>Up to 10 saved favourites</li>
                    <li>Up to 2 collections</li>
                    <li>Compare 2 tools at once</li>
                </ul>
            </div>
            <p style="color:#374151;line-height:1.6;">Ready to get back your full Pro access?</p>
            <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/pricing" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Renew Plan — From $6.67/mo →
                </a>
            </div>
            <p style="color:#6b7280;font-size:13px;">Questions? Reply to this email and we'll help you out.</p>`
        return sendEmail(user.email, user.firstName, 'Your IntelliGrid Pro plan has expired', emailWrapper(content, user.email))
    }

    /**
     * Win-Back — sent 3 days after cancellation
     */
    async sendWinBackEmail(user) {
        const content = `
            <h2 style="color:#111827;margin-top:0;">We noticed you cancelled — here's 20% off</h2>
            <p style="color:#374151;line-height:1.6;">Hi ${user.firstName || 'there'},</p>
            <p style="color:#374151;line-height:1.6;">We noticed you cancelled your IntelliGrid Pro plan. We'd love to know why — and we'd also love to have you back.</p>
            <div style="background:linear-gradient(135deg,rgba(124,58,237,0.08),rgba(79,70,229,0.08));border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
                <p style="color:#7c3aed;font-weight:700;font-size:18px;margin:0 0 4px;">Use code <strong>COMEBACK20</strong></p>
                <p style="color:#374151;font-size:14px;margin:0;">for 20% off your first month or year back</p>
            </div>
            <p style="color:#374151;line-height:1.6;">This offer is valid for 7 days. After that, normal pricing applies.</p>
            <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/pricing" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    Rejoin with 20% Off →
                </a>
            </div>
            <p style="color:#6b7280;font-size:13px;">If you cancelled by mistake or have questions, just reply to this email.</p>`
        return sendEmail(user.email, user.firstName, 'Come back — here\'s 20% off your IntelliGrid plan', emailWrapper(content, user.email))
    }
}

export default new EmailService()
