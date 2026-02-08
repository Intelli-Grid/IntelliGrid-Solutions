/**
 * Automated Website Testing Script
 * Tests all critical endpoints and user flows
 * 
 * Usage: node scripts/testWebsite.js
 */

import axios from 'axios'

const FRONTEND_URL = 'https://www.intelligrid.online'
const BACKEND_URL = 'https://api.intelligrid.online'

console.log('🧪 Starting Automated Website Testing...\n')

const results = {
    passed: 0,
    failed: 0,
    tests: []
}

// Helper function to test endpoint
async function testEndpoint(name, url, expectedStatus = 200) {
    try {
        const response = await axios.get(url, { timeout: 10000 })
        if (response.status === expectedStatus) {
            console.log(`✅ ${name}: PASSED (${response.status})`)
            results.passed++
            results.tests.push({ name, status: 'PASSED', url })
            return true
        } else {
            console.log(`❌ ${name}: FAILED (Expected ${expectedStatus}, got ${response.status})`)
            results.failed++
            results.tests.push({ name, status: 'FAILED', url, error: `Wrong status: ${response.status}` })
            return false
        }
    } catch (error) {
        console.log(`❌ ${name}: FAILED (${error.message})`)
        results.failed++
        results.tests.push({ name, status: 'FAILED', url, error: error.message })
        return false
    }
}

// Test Suite
async function runTests() {
    console.log('📊 Testing Backend API Endpoints...\n')

    // Backend Health Check
    await testEndpoint('Backend Health Check', `${BACKEND_URL}/health`)

    // API Endpoints
    await testEndpoint('Get Tools', `${BACKEND_URL}/api/v1/tools?limit=1`)
    await testEndpoint('Get Trending Tools', `${BACKEND_URL}/api/v1/tools/trending?limit=6`)
    await testEndpoint('Get Categories', `${BACKEND_URL}/api/v1/categories`)
    await testEndpoint('Search Tools', `${BACKEND_URL}/api/v1/tools/search?q=chat`)

    console.log('\n📊 Testing Frontend Pages...\n')

    // Frontend Pages
    await testEndpoint('Homepage', FRONTEND_URL)
    await testEndpoint('Tools Page', `${FRONTEND_URL}/tools`)
    await testEndpoint('Pricing Page', `${FRONTEND_URL}/pricing`)

    console.log('\n📊 Testing CORS...\n')

    // Test CORS
    try {
        const response = await axios.get(`${BACKEND_URL}/api/v1/tools?limit=1`, {
            headers: {
                'Origin': FRONTEND_URL
            }
        })
        if (response.headers['access-control-allow-origin']) {
            console.log(`✅ CORS: PASSED`)
            results.passed++
        } else {
            console.log(`❌ CORS: FAILED (No CORS headers)`)
            results.failed++
        }
    } catch (error) {
        console.log(`❌ CORS: FAILED (${error.message})`)
        results.failed++
    }

    // Summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 TEST SUMMARY')
    console.log('='.repeat(50))
    console.log(`✅ Passed: ${results.passed}`)
    console.log(`❌ Failed: ${results.failed}`)
    console.log(`📊 Total: ${results.passed + results.failed}`)
    console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`)
    console.log('='.repeat(50))

    if (results.failed > 0) {
        console.log('\n❌ FAILED TESTS:')
        results.tests.filter(t => t.status === 'FAILED').forEach(test => {
            console.log(`  - ${test.name}: ${test.error}`)
        })
    }

    console.log('\n✅ Testing complete!')

    // Exit with error code if tests failed
    process.exit(results.failed > 0 ? 1 : 0)
}

// Run tests
runTests().catch(error => {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
})
