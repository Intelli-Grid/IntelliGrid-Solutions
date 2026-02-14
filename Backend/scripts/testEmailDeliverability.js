#!/usr/bin/env node

/**
 * EMAIL DELIVERABILITY TESTING SCRIPT
 * Comprehensive email testing for production readiness
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import emailService from '../src/services/emailService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

console.log('📧 EMAIL DELIVERABILITY TESTING SCRIPT')
console.log('='.repeat(60))
console.log('')

// Test email addresses
const TEST_EMAILS = [
    'test@gmail.com',      // Gmail
    'test@outlook.com',    // Outlook
    'test@yahoo.com',      // Yahoo
    'test@protonmail.com'  // ProtonMail
]

const results = {
    passed: [],
    failed: [],
    warnings: []
}

function pass(message) {
    results.passed.push(message)
    console.log(`✅ ${message}`)
}

function fail(message) {
    results.failed.push(message)
    console.log(`❌ ${message}`)
}

function warn(message) {
    results.warnings.push(message)
    console.log(`⚠️  ${message}`)
}

// 1. Check Email Configuration
console.log('⚙️  1. EMAIL CONFIGURATION')
console.log('-'.repeat(60))

if (process.env.BREVO_API_KEY) {
    pass('Brevo API key configured')
} else {
    fail('Brevo API key missing')
}

if (process.env.BREVO_SENDER_EMAIL) {
    pass(`Sender email: ${process.env.BREVO_SENDER_EMAIL}`)
} else {
    warn('BREVO_SENDER_EMAIL not set, using default')
}

// 2. DNS Records Check
console.log('\n🌐 2. DNS RECORDS VERIFICATION')
console.log('-'.repeat(60))

console.log('\n📋 Required DNS Records for intelligrid.store:')
console.log('\nSPF Record:')
console.log('   Type: TXT')
console.log('   Name: @')
console.log('   Value: v=spf1 include:spf.brevo.com ~all')

console.log('\nDKIM Record:')
console.log('   Type: TXT')
console.log('   Name: mail._domainkey')
console.log('   Value: (Get from Brevo dashboard)')

console.log('\nDMARC Record:')
console.log('   Type: TXT')
console.log('   Name: _dmarc')
console.log('   Value: v=DMARC1; p=none; rua=mailto:dmarc@intelligrid.store')

console.log('\n🔍 Verify DNS records at:')
console.log('   - https://mxtoolbox.com/spf.aspx')
console.log('   - https://mxtoolbox.com/dkim.aspx')
console.log('   - https://mxtoolbox.com/dmarc.aspx')

// 3. Email Template Testing
console.log('\n\n📨 3. EMAIL TEMPLATE TESTING')
console.log('-'.repeat(60))

console.log('\n⚠️  MANUAL TEST REQUIRED:')
console.log('\nReplace TEST_EMAIL below with your actual email address:')
console.log('const TEST_EMAIL = "your-email@example.com"')
console.log('\nThen run: npm run test:emails')

// Uncomment and replace with actual email for testing
// const TEST_EMAIL = 'your-email@example.com'

/*
async function runEmailTests() {
    console.log('\n🧪 Sending test emails...\n')

    try {
        // Test 1: Welcome Email
        console.log('📧 Test 1: Welcome Email')
        await sendWelcomeEmail(TEST_EMAIL, 'Test User')
        pass('Welcome email sent')
        
        // Wait 2 seconds between emails
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Test 2: Subscription Confirmation
        console.log('\n📧 Test 2: Subscription Confirmation')
        await sendSubscriptionConfirmation(TEST_EMAIL, {
            userName: 'Test User',
            planName: 'Pro Monthly',
            amount: '$9.99',
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()
        })
        pass('Subscription confirmation sent')
        
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Test 3: Payment Receipt
        console.log('\n📧 Test 3: Payment Receipt')
        await sendPaymentReceipt(TEST_EMAIL, {
            userName: 'Test User',
            amount: '$9.99',
            transactionId: 'TEST-' + Date.now(),
            date: new Date().toLocaleDateString(),
            planName: 'Pro Monthly'
        })
        pass('Payment receipt sent')

    } catch (error) {
        fail(`Email sending failed: ${error.message}`)
    }
}

// Run tests if TEST_EMAIL is configured
if (TEST_EMAIL && TEST_EMAIL !== 'your-email@example.com') {
    await runEmailTests()
}
*/

// 4. Deliverability Checklist
console.log('\n\n✅ 4. DELIVERABILITY CHECKLIST')
console.log('='.repeat(60))

console.log('\n📋 Pre-Launch Checks:')
console.log('□ 1. Configure SPF record in DNS')
console.log('□ 2. Configure DKIM record in DNS')
console.log('□ 3. Configure DMARC record in DNS')
console.log('□ 4. Verify domain in Brevo dashboard')
console.log('□ 5. Send test emails to multiple providers')
console.log('□ 6. Check spam score at mail-tester.com')
console.log('□ 7. Verify emails land in inbox (not spam)')
console.log('□ 8. Test email rendering on mobile devices')
console.log('□ 9. Check unsubscribe link works')
console.log('□ 10. Verify sender name displays correctly')

// 5. Spam Score Testing
console.log('\n\n🎯 5. SPAM SCORE TESTING')
console.log('='.repeat(60))

console.log('\nSteps to test spam score:')
console.log('1. Go to https://www.mail-tester.com/')
console.log('2. Copy the test email address shown')
console.log('3. Send a test email to that address')
console.log('4. Check your spam score (target: 10/10)')
console.log('5. Review and fix any issues reported')

// 6. Email Providers Testing
console.log('\n\n📮 6. EMAIL PROVIDER TESTING')
console.log('='.repeat(60))

console.log('\nTest email delivery to:')
console.log('□ Gmail (test@gmail.com)')
console.log('□ Outlook (test@outlook.com)')
console.log('□ Yahoo (test@yahoo.com)')
console.log('□ ProtonMail (test@protonmail.com)')
console.log('□ Apple Mail (test@icloud.com)')

console.log('\nFor each provider, verify:')
console.log('✓ Email lands in inbox (not spam)')
console.log('✓ Sender name displays correctly')
console.log('✓ Email renders properly')
console.log('✓ Links work correctly')
console.log('✓ Unsubscribe link works')

// 7. Monitoring Setup
console.log('\n\n📊 7. EMAIL MONITORING SETUP')
console.log('='.repeat(60))

console.log('\nConfigure Brevo alerts for:')
console.log('- Bounce rate > 5%')
console.log('- Spam complaints > 0.1%')
console.log('- Unsubscribe rate > 2%')
console.log('- Delivery failures')

console.log('\nMonitor in Brevo dashboard:')
console.log('- Daily email volume')
console.log('- Open rates')
console.log('- Click rates')
console.log('- Bounce rates')
console.log('- Spam complaints')

// Final Summary
console.log('\n\n' + '='.repeat(60))
console.log('📊 EMAIL TESTING SUMMARY')
console.log('='.repeat(60))
console.log(`✅ Passed: ${results.passed.length}`)
console.log(`❌ Failed: ${results.failed.length}`)
console.log(`⚠️  Warnings: ${results.warnings.length}`)
console.log('')

if (results.failed.length === 0) {
    console.log('✅ Email configuration ready')
    console.log('\n📝 NEXT STEPS:')
    console.log('1. Configure DNS records (SPF, DKIM, DMARC)')
    console.log('2. Verify domain in Brevo dashboard')
    console.log('3. Send test emails to multiple providers')
    console.log('4. Check spam score at mail-tester.com')
    console.log('5. Monitor deliverability in Brevo dashboard')
} else {
    console.log('❌ Fix configuration issues before testing')
}

console.log('')
