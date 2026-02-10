/**
 * Deployment Verification Script
 * Checks if the live environment is healthy
 * Usage: node scripts/verifyDeployment.js [url]
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const DEFAULT_URL = 'https://intelligrid-backend-production.up.railway.app'; // Update this if your URL is different
const BASE_URL = process.argv[2] || process.env.BACKEND_URL || DEFAULT_URL;

console.log(`\n🔍 Verifying Deployment at: ${BASE_URL}`);
console.log('='.repeat(50));

async function checkEndpoint(name, path) {
    try {
        const url = `${BASE_URL}${path}`;
        const start = Date.now();
        const response = await axios.get(url);
        const duration = Date.now() - start;

        console.log(`✅ ${name.padEnd(20)}: ${response.status} OK (${duration}ms)`);
        return true;
    } catch (error) {
        console.error(`❌ ${name.padEnd(20)}: FAILED - ${error.message}`);
        if (error.response) {
            console.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
        }
        return false;
    }
}

async function runTests() {
    // 1. Health Check
    await checkEndpoint('Health Check', '/health');

    // 2. API Root
    await checkEndpoint('API Root', '/api/v1');

    // 3. Tools List
    await checkEndpoint('Tools List', '/api/v1/tools?limit=1');

    // 4. Categories List
    await checkEndpoint('Categories', '/api/v1/categories');

    // 5. Env Check
    console.log('\n🔐 Configuration Check:');
    console.log(`- BREVO_API_KEY: ${process.env.BREVO_API_KEY ? '✅ Present' : '❌ Missing'}`);
    console.log(`- SENTRY_DSN:    ${process.env.SENTRY_DSN ? '✅ Present' : '❌ Missing'}`);
    console.log(`- PAYPAL_MODE:   ${process.env.PAYPAL_MODE || 'Using Default'}`);

    console.log('\n💡 Next Steps:');
    console.log('1. Run email test: node scripts/testEmails.js <your-email>');
    console.log('2. Check Sentry dashboard for any new errors.');
}

runTests();
