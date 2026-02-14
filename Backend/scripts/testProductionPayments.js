#!/usr/bin/env node

/**
 * PRODUCTION PAYMENT TESTING SCRIPT
 * Tests PayPal and Cashfree payment flows in production
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import axios from 'axios'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

console.log('🧪 PRODUCTION PAYMENT TESTING SCRIPT')
console.log('='.repeat(60))
console.log('')

const BACKEND_URL = process.env.BACKEND_URL || 'https://intelligrid-backend.up.railway.app'
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://intelligrid.online'

// Test results
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

// 1. Check Payment Gateway Configuration
console.log('\n💳 1. PAYMENT GATEWAY CONFIGURATION')
console.log('-'.repeat(60))

if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
    pass('PayPal credentials configured')

    // Check if in live mode
    if (process.env.PAYPAL_MODE === 'live') {
        pass('PayPal in LIVE mode')
    } else {
        warn('PayPal in SANDBOX mode - switch to live for production')
    }
} else {
    fail('PayPal credentials missing')
}

if (process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY) {
    pass('Cashfree credentials configured')

    // Check environment
    if (process.env.CASHFREE_ENV === 'production') {
        pass('Cashfree in PRODUCTION mode')
    } else {
        warn('Cashfree in TEST mode - switch to production')
    }
} else {
    fail('Cashfree credentials missing')
}

// 2. Test Payment Endpoints
console.log('\n🌐 2. PAYMENT API ENDPOINTS')
console.log('-'.repeat(60))

async function testEndpoint(url, description) {
    try {
        const response = await axios.get(url, { timeout: 5000 })
        if (response.status === 200) {
            pass(`${description} - Endpoint accessible`)
            return true
        } else {
            fail(`${description} - Unexpected status: ${response.status}`)
            return false
        }
    } catch (error) {
        fail(`${description} - ${error.message}`)
        return false
    }
}

// Test health endpoint
await testEndpoint(`${BACKEND_URL}/health`, 'Backend health check')

// 3. Webhook Configuration Check
console.log('\n🔔 3. WEBHOOK CONFIGURATION')
console.log('-'.repeat(60))

console.log('\n📋 PayPal Webhook URLs to configure:')
console.log(`   ${BACKEND_URL}/api/v1/payment/paypal/webhook`)
console.log('\n   Required Events:')
console.log('   - BILLING.SUBSCRIPTION.CREATED')
console.log('   - BILLING.SUBSCRIPTION.ACTIVATED')
console.log('   - PAYMENT.SALE.COMPLETED')
console.log('   - BILLING.SUBSCRIPTION.CANCELLED')

console.log('\n📋 Cashfree Webhook URL to configure:')
console.log(`   ${BACKEND_URL}/api/v1/payment/cashfree/webhook`)
console.log('\n   Required Events:')
console.log('   - ORDER_PAID')

// 4. Manual Testing Checklist
console.log('\n\n📝 MANUAL TESTING CHECKLIST')
console.log('='.repeat(60))

console.log('\n🧪 TEST 1: PayPal Monthly Subscription ($9.99)')
console.log('□ 1. Go to:', FRONTEND_URL + '/pricing')
console.log('□ 2. Click "Subscribe" on Pro Monthly plan')
console.log('□ 3. Complete PayPal payment with test amount')
console.log('□ 4. Verify redirect to success page')
console.log('□ 5. Check database for subscription record')
console.log('□ 6. Verify webhook received in logs')
console.log('□ 7. Confirm welcome email sent')
console.log('□ 8. Check user has Pro access')

console.log('\n🧪 TEST 2: PayPal Yearly Subscription ($99.99)')
console.log('□ 1. Go to:', FRONTEND_URL + '/pricing')
console.log('□ 2. Click "Subscribe" on Pro Yearly plan')
console.log('□ 3. Complete PayPal payment')
console.log('□ 4. Verify all steps from Test 1')

console.log('\n🧪 TEST 3: Cashfree Payment (INR)')
console.log('□ 1. Go to:', FRONTEND_URL + '/pricing')
console.log('□ 2. Click "Subscribe" (Cashfree option)')
console.log('□ 3. Complete payment with test card')
console.log('□ 4. Verify all steps from Test 1')

console.log('\n🧪 TEST 4: Payment Failure Handling')
console.log('□ 1. Initiate payment')
console.log('□ 2. Cancel/decline payment')
console.log('□ 3. Verify error message shown')
console.log('□ 4. Verify no subscription created')
console.log('□ 5. Check error logged in Sentry')

console.log('\n🧪 TEST 5: Subscription Cancellation')
console.log('□ 1. Cancel active subscription via PayPal')
console.log('□ 2. Verify webhook received')
console.log('□ 3. Check database updated')
console.log('□ 4. Verify cancellation email sent')
console.log('□ 5. Confirm user access revoked')

console.log('\n🧪 TEST 6: Refund Processing')
console.log('□ 1. Process refund via PayPal dashboard')
console.log('□ 2. Verify webhook received')
console.log('□ 3. Check database updated')
console.log('□ 4. Verify refund email sent')

// 5. Database Verification Queries
console.log('\n\n💾 DATABASE VERIFICATION QUERIES')
console.log('='.repeat(60))

console.log('\n// Check recent orders')
console.log('db.orders.find().sort({ createdAt: -1 }).limit(10)')

console.log('\n// Check webhook logs')
console.log('db.webhooklogs.find().sort({ createdAt: -1 }).limit(10)')

console.log('\n// Check user subscriptions')
console.log('db.users.find({ subscriptionStatus: "active" })')

console.log('\n// Check payment failures')
console.log('db.orders.find({ status: "failed" })')

// 6. Monitoring Setup
console.log('\n\n📊 MONITORING SETUP')
console.log('='.repeat(60))

console.log('\n✅ Set up alerts for:')
console.log('   - Payment webhook failures')
console.log('   - High payment failure rate (>10%)')
console.log('   - Subscription cancellations')
console.log('   - Refund requests')

// Final Summary
console.log('\n\n' + '='.repeat(60))
console.log('📊 CONFIGURATION SUMMARY')
console.log('='.repeat(60))
console.log(`✅ Passed: ${results.passed.length}`)
console.log(`❌ Failed: ${results.failed.length}`)
console.log(`⚠️  Warnings: ${results.warnings.length}`)
console.log('')

if (results.failed.length === 0 && results.warnings.length === 0) {
    console.log('🎉 ALL CHECKS PASSED!')
    console.log('✅ Ready for production payment testing')
} else if (results.failed.length === 0) {
    console.log('⚠️  CONFIGURATION READY WITH WARNINGS')
    console.log('Review warnings before proceeding')
} else {
    console.log('❌ CRITICAL ISSUES FOUND')
    console.log('Fix failed checks before testing')
}

console.log('\n📝 NEXT STEPS:')
console.log('1. Review and complete manual testing checklist')
console.log('2. Test with small amounts first ($0.01 or minimum)')
console.log('3. Monitor Sentry for errors during testing')
console.log('4. Verify all emails are delivered')
console.log('5. Check database records after each test')
console.log('6. Document any issues found')
console.log('')
