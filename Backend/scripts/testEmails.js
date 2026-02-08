/**
 * Email Testing Script
 * Sends test emails using the EmailService
 */

import emailService from '../src/services/emailService.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Verify API key is loaded
if (!process.env.BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY not found in environment variables!');
    console.error('Please check your .env file.');
    process.exit(1);
}

console.log('✅ BREVO_API_KEY loaded successfully');

const targetEmail = process.argv[2];

if (!targetEmail) {
    console.error('❌ Please provide a target email address');
    console.log('\nUsage: node scripts/testEmails.js <email>');
    console.log('Example: node scripts/testEmails.js test@example.com');
    process.exit(1);
}

// Mock User
const mockUser = {
    email: targetEmail,
    firstName: 'TestUser',
    lastName: 'Tester'
};

// Mock Subscription
const mockSubscription = {
    tier: 'Pro Monthly',
    duration: 'Monthly',
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
};

// Mock Payment
const mockPayment = {
    amount: '9.99',
    transactionId: 'TXN_' + Math.floor(Math.random() * 1000000),
    date: new Date(),
    gateway: 'PayPal'
};

async function runTests() {
    console.log(`\n📧 Sending test emails to: ${targetEmail}`);
    console.log('='.repeat(50));

    // Test 1: Welcome Email
    console.log('\n1️⃣  Sending Welcome Email...');
    await emailService.sendWelcomeEmail(mockUser);

    // Test 2: Subscription Confirmation
    console.log('\n2️⃣  Sending Subscription Confirmation...');
    await emailService.sendSubscriptionEmail(mockUser, mockSubscription);

    // Test 3: Payment Receipt
    console.log('\n3️⃣  Sending Payment Receipt...');
    await emailService.sendPaymentReceipt(mockUser, mockPayment);

    // Test 4: Cancellation Email
    console.log('\n4️⃣  Sending Cancellation Email...');
    await emailService.sendCancellationEmail(mockUser, mockSubscription);

    // Test 5: Admin Notification
    console.log('\n5️⃣  Sending Admin Notification (to configured admin)...');
    // Note: Admin email is hardcoded in service as admin@intelligrid.com
    // We can't easily override it for this test without changing service code
    // But we can verify no error is thrown.
    await emailService.sendAdminNotification('Test Notification', `This is a test notification triggered manually.`);

    console.log('\n✅ Email tests completed!');
    console.log('Check your inbox (and spam folder) for the test emails.');
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
