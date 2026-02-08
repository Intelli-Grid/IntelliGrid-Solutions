/**
 * Webhook Testing Script
 * Tests PayPal and Cashfree webhook endpoints locally
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_BASE_URL = process.env.API_URL || 'http://localhost:10000';

// Test data
const testData = {
    paypal: {
        subscriptionCreated: {
            event_type: 'BILLING.SUBSCRIPTION.CREATED',
            resource: {
                id: 'I-TEST123456',
                plan_id: 'P-TEST123',
                status: 'ACTIVE',
                subscriber: {
                    email_address: 'test@example.com',
                    name: {
                        given_name: 'Test',
                        surname: 'User'
                    }
                },
                billing_info: {
                    next_billing_time: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
            }
        },
        paymentCompleted: {
            event_type: 'PAYMENT.SALE.COMPLETED',
            resource: {
                id: 'SALE-TEST123',
                amount: {
                    total: '9.99',
                    currency: 'USD'
                },
                billing_agreement_id: 'I-TEST123456',
                state: 'completed'
            }
        },
        subscriptionCancelled: {
            event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
            resource: {
                id: 'I-TEST123456',
                status: 'CANCELLED'
            }
        }
    },
    cashfree: {
        orderPaid: {
            type: 'PAYMENT_SUCCESS_WEBHOOK', // Updated to match controller expectations
            // Also including 'test' flag might be useful, but let's try standard payload first or test payload
            data: {
                order: {
                    order_id: 'order_test123',
                    order_amount: 9.99,
                    order_currency: 'INR',
                    order_status: 'PAID'
                },
                payment: {
                    payment_status: 'SUCCESS',
                    payment_amount: 9.99,
                    payment_time: new Date().toISOString()
                },
                customer_details: {
                    customer_email: 'test@example.com',
                    customer_name: 'Test User'
                }
            }
        }
    }
};

async function testWebhook(endpoint, data, name) {
    console.log(`\n🧪 Testing: ${name}`);
    console.log('━'.repeat(50));

    try {
        const url = `${API_BASE_URL}${endpoint}`;
        // console.log(`Attempting POST to ${url}`); // Debugging
        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000
        });

        console.log('✅ Status:', response.status);
        // console.log('✅ Response:', JSON.stringify(response.data, null, 2));
        return true;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log(`❌ Connection refused to ${API_BASE_URL}. Is the server running?`);
            return false;
        }
        console.log('❌ Error:', error.message);
        if (error.response) {
            console.log('❌ Response:', error.response.status, error.response.data);
        }
        return false;
    }
}

async function runTests() {
    console.log('\n🚀 Webhook Testing Suite');
    console.log('='.repeat(50));
    console.log(`API Base URL: ${API_BASE_URL}`);
    console.log('='.repeat(50));

    const results = {
        passed: 0,
        failed: 0
    };

    // Test PayPal webhooks
    console.log('\n📦 PayPal Webhooks');
    console.log('─'.repeat(50));

    if (await testWebhook('/api/v1/payment/webhooks/paypal', testData.paypal.subscriptionCreated, 'Subscription Created')) {
        results.passed++;
    } else {
        results.failed++;
    }

    if (await testWebhook('/api/v1/payment/webhooks/paypal', testData.paypal.paymentCompleted, 'Payment Completed')) {
        results.passed++;
    } else {
        results.failed++;
    }

    if (await testWebhook('/api/v1/payment/webhooks/paypal', testData.paypal.subscriptionCancelled, 'Subscription Cancelled')) {
        results.passed++;
    } else {
        results.failed++;
    }

    // Test Cashfree webhooks
    console.log('\n💳 Cashfree Webhooks');
    console.log('─'.repeat(50));

    if (await testWebhook('/api/v1/payment/webhooks/cashfree', testData.cashfree.orderPaid, 'Order Paid')) {
        results.passed++;
    } else {
        results.failed++;
    }

    // Summary
    console.log('\n📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    if (results.passed + results.failed > 0) {
        console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    }
    console.log('='.repeat(50));
}

// Run tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
