/**
 * PayPal Sandbox Test Script
 * Run this to verify PayPal integration works before deploying to production
 * 
 * Usage: node scripts/testPayPalSandbox.js
 */

import dotenv from 'dotenv'
import paypal from '../src/config/paypal.js'

dotenv.config()

console.log('🧪 Testing PayPal Sandbox Integration...\n')

// Verify environment variables
console.log('📋 Configuration:')
console.log(`   Mode: ${process.env.PAYPAL_MODE}`)
console.log(`   Client ID: ${process.env.PAYPAL_CLIENT_ID?.substring(0, 20)}...`)
console.log(`   Client Secret: ${process.env.PAYPAL_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`)
console.log('')

// Test 1: Create a test payment
async function testCreatePayment() {
    console.log('Test 1: Creating PayPal Payment...')

    const createPaymentJson = {
        intent: 'sale',
        payer: {
            payment_method: 'paypal'
        },
        redirect_urls: {
            return_url: 'http://localhost:5173/payment/success',
            cancel_url: 'http://localhost:5173/payment/cancel'
        },
        transactions: [{
            item_list: {
                items: [{
                    name: 'IntelliGrid Pro Monthly',
                    sku: 'pro_monthly',
                    price: '9.99',
                    currency: 'USD',
                    quantity: 1
                }]
            },
            amount: {
                currency: 'USD',
                total: '9.99'
            },
            description: 'IntelliGrid Pro Monthly Subscription'
        }]
    }

    return new Promise((resolve, reject) => {
        paypal.payment.create(createPaymentJson, (error, payment) => {
            if (error) {
                console.error('❌ Payment creation failed:', error.response?.message || error.message)
                reject(error)
            } else {
                console.log('✅ Payment created successfully!')
                console.log(`   Payment ID: ${payment.id}`)

                // Find approval URL
                const approvalUrl = payment.links.find(link => link.rel === 'approval_url')
                if (approvalUrl) {
                    console.log(`   Approval URL: ${approvalUrl.href}`)
                    console.log('')
                    console.log('📝 Next steps to complete test:')
                    console.log('   1. Copy the approval URL above')
                    console.log('   2. Open it in a browser')
                    console.log('   3. Log in with PayPal sandbox buyer account')
                    console.log('   4. Complete the payment')
                    console.log('')
                    console.log('💡 Sandbox Buyer Account:')
                    console.log('   Email: sb-buyer@personal.example.com (create one at developer.paypal.com)')
                    console.log('   Password: [your sandbox password]')
                }

                resolve(payment)
            }
        })
    })
}

// Test 2: Get access token
async function testAccessToken() {
    console.log('Test 2: Getting PayPal Access Token...')

    return new Promise((resolve, reject) => {
        paypal.generateToken((error, token) => {
            if (error) {
                console.error('❌ Token generation failed:', error.message)
                reject(error)
            } else {
                console.log('✅ Access token generated successfully!')
                console.log(`   Token: ${token.substring(0, 30)}...`)
                console.log('')
                resolve(token)
            }
        })
    })
}

// Run tests
async function runTests() {
    try {
        // Check if we're in sandbox mode
        if (process.env.PAYPAL_MODE !== 'sandbox') {
            console.error('⚠️  WARNING: PAYPAL_MODE is not set to "sandbox"')
            console.error('   Please set PAYPAL_MODE=sandbox in your .env file')
            console.error('   DO NOT test with production credentials!')
            process.exit(1)
        }

        // Test access token
        await testAccessToken()

        // Test payment creation
        await testCreatePayment()

        console.log('✅ All tests passed!')
        console.log('')
        console.log('🎉 PayPal sandbox integration is working correctly!')
        console.log('')
        console.log('📋 Summary:')
        console.log('   ✅ PayPal SDK configured')
        console.log('   ✅ Access token generation works')
        console.log('   ✅ Payment creation works')
        console.log('')
        console.log('🚀 Next steps:')
        console.log('   1. Complete a test payment using the approval URL above')
        console.log('   2. Verify webhook delivery (after deployment)')
        console.log('   3. Switch to production mode when ready')
        console.log('')

    } catch (error) {
        console.error('')
        console.error('❌ Tests failed!')
        console.error('   Error:', error.message)
        console.error('')
        console.error('🔧 Troubleshooting:')
        console.error('   1. Verify your PayPal sandbox credentials in .env')
        console.error('   2. Make sure PAYPAL_MODE=sandbox')
        console.error('   3. Check your PayPal developer account at developer.paypal.com')
        console.error('   4. Ensure you have a sandbox app created')
        console.error('')
        process.exit(1)
    }
}

// Run the tests
runTests()
