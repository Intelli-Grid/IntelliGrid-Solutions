#!/usr/bin/env node

/**
 * INTELLIGRID LAUNCH READINESS VERIFICATION
 * Comprehensive automated check for production deployment
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

console.log('🚀 INTELLIGRID LAUNCH READINESS VERIFICATION')
console.log('='.repeat(60))
console.log('')

const results = {
    passed: [],
    failed: [],
    warnings: []
}

// Helper functions
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

// 1. Environment Variables Check
console.log('\n📋 1. ENVIRONMENT VARIABLES')
console.log('-'.repeat(60))

const requiredEnvVars = {
    // Database
    'MONGODB_URI': 'MongoDB connection string',
    'REDIS_URL': 'Redis connection string',

    // Authentication
    'CLERK_SECRET_KEY': 'Clerk authentication',

    // Search
    'ALGOLIA_APP_ID': 'Algolia search',
    'ALGOLIA_ADMIN_KEY': 'Algolia admin access',

    // Payments
    'PAYPAL_CLIENT_ID': 'PayPal integration',
    'PAYPAL_CLIENT_SECRET': 'PayPal secret',
    'CASHFREE_APP_ID': 'Cashfree integration',
    'CASHFREE_SECRET_KEY': 'Cashfree secret',

    // Email
    'BREVO_API_KEY': 'Email automation',

    // Monitoring
    'SENTRY_DSN': 'Error tracking',

    // URLs
    'FRONTEND_URL': 'Frontend domain',
    'BACKEND_URL': 'Backend API domain'
}

for (const [key, description] of Object.entries(requiredEnvVars)) {
    if (process.env[key]) {
        pass(`${key} - ${description}`)
    } else {
        fail(`${key} - ${description} (MISSING)`)
    }
}

// 2. Database Connection
console.log('\n💾 2. DATABASE CONNECTION')
console.log('-'.repeat(60))

try {
    const mongoose = await import('mongoose')
    await mongoose.default.connect(process.env.MONGODB_URI)
    pass('MongoDB connection successful')

    // Check collections
    const collections = await mongoose.default.connection.db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)

    const requiredCollections = ['tools', 'users', 'categories', 'reviews', 'payments']
    for (const col of requiredCollections) {
        if (collectionNames.includes(col)) {
            pass(`Collection '${col}' exists`)
        } else {
            warn(`Collection '${col}' not found (will be created on first use)`)
        }
    }

    await mongoose.default.disconnect()
} catch (error) {
    fail(`MongoDB connection failed: ${error.message}`)
}

// 3. Redis Connection
console.log('\n🔴 3. REDIS CONNECTION')
console.log('-'.repeat(60))

try {
    const redis = await import('redis')
    const client = redis.createClient({ url: process.env.REDIS_URL })
    await client.connect()
    await client.ping()
    pass('Redis connection successful')
    await client.disconnect()
} catch (error) {
    fail(`Redis connection failed: ${error.message}`)
}

// 4. Algolia Configuration
console.log('\n🔍 4. ALGOLIA SEARCH')
console.log('-'.repeat(60))

try {
    const algoliasearch = (await import('algoliasearch')).default
    const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_KEY)
    const index = client.initIndex('intelligrid_tools')

    const settings = await index.getSettings()
    pass('Algolia index "intelligrid_tools" accessible')

    const { nbHits } = await index.search('', { hitsPerPage: 0 })
    if (nbHits > 0) {
        pass(`Algolia index contains ${nbHits} tools`)
    } else {
        warn('Algolia index is empty - run sync script to populate')
    }
} catch (error) {
    fail(`Algolia check failed: ${error.message}`)
}

// 5. File System Checks
console.log('\n📁 5. FILE SYSTEM CHECKS')
console.log('-'.repeat(60))

const criticalFiles = [
    '../src/app.js',
    '../src/config/database.js',
    '../src/config/clerk.js',
    '../src/config/algolia.js',
    '../src/routes/toolRoutes.js',
    '../src/routes/paymentRoutes.js',
    '../src/routes/admin.routes.js',
    '../src/models/Tool.js',
    '../src/models/User.js',
    '../src/services/emailService.js'
]

for (const file of criticalFiles) {
    const filePath = path.join(__dirname, file)
    if (fs.existsSync(filePath)) {
        pass(`File exists: ${file}`)
    } else {
        fail(`File missing: ${file}`)
    }
}

// 6. Package Dependencies
console.log('\n📦 6. PACKAGE DEPENDENCIES')
console.log('-'.repeat(60))

try {
    const packageJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
    )

    const criticalDeps = [
        'express',
        'mongoose',
        'redis',
        'algoliasearch',
        '@clerk/clerk-sdk-node',
        'paypal-rest-sdk',
        '@getbrevo/brevo',
        '@sentry/node'
    ]

    for (const dep of criticalDeps) {
        if (packageJson.dependencies[dep]) {
            pass(`Dependency installed: ${dep}`)
        } else {
            fail(`Dependency missing: ${dep}`)
        }
    }
} catch (error) {
    fail(`Package.json check failed: ${error.message}`)
}

// 7. Security Headers
console.log('\n🔒 7. SECURITY CONFIGURATION')
console.log('-'.repeat(60))

try {
    const appFile = fs.readFileSync(path.join(__dirname, '../src/app.js'), 'utf8')

    if (appFile.includes('helmet')) {
        pass('Helmet security headers configured')
    } else {
        fail('Helmet security headers not found')
    }

    if (appFile.includes('cors')) {
        pass('CORS configuration present')
    } else {
        fail('CORS configuration not found')
    }

    if (appFile.includes('express-rate-limit')) {
        pass('Rate limiting configured')
    } else {
        warn('Rate limiting not found - recommended for production')
    }
} catch (error) {
    warn(`Security check failed: ${error.message}`)
}

// 8. API Endpoints Check
console.log('\n🌐 8. API ENDPOINTS')
console.log('-'.repeat(60))

const endpoints = [
    { file: '../src/routes/toolRoutes.js', name: 'Tool routes' },
    { file: '../src/routes/categoryRoutes.js', name: 'Category routes' },
    { file: '../src/routes/paymentRoutes.js', name: 'Payment routes' },
    { file: '../src/routes/reviewRoutes.js', name: 'Review routes' },
    { file: '../src/routes/userRoutes.js', name: 'User routes' },
    { file: '../src/routes/admin.routes.js', name: 'Admin routes' },
    { file: '../src/routes/analyticsRoutes.js', name: 'Analytics routes' }
]

for (const endpoint of endpoints) {
    const filePath = path.join(__dirname, endpoint.file)
    if (fs.existsSync(filePath)) {
        pass(`${endpoint.name} configured`)
    } else {
        warn(`${endpoint.name} not found`)
    }
}

// 9. Email Service
console.log('\n📧 9. EMAIL SERVICE')
console.log('-'.repeat(60))

try {
    const emailServicePath = path.join(__dirname, '../src/services/emailService.js')
    if (fs.existsSync(emailServicePath)) {
        pass('Email service file exists')

        const emailService = fs.readFileSync(emailServicePath, 'utf8')
        if (emailService.includes('sendWelcomeEmail')) {
            pass('Welcome email template configured')
        }
        if (emailService.includes('sendSubscriptionConfirmation')) {
            pass('Subscription confirmation template configured')
        }
        if (emailService.includes('sendPaymentReceipt')) {
            pass('Payment receipt template configured')
        }
    } else {
        fail('Email service file not found')
    }
} catch (error) {
    warn(`Email service check failed: ${error.message}`)
}

// 10. Scripts Availability
console.log('\n🛠️  10. UTILITY SCRIPTS')
console.log('-'.repeat(60))

const scripts = [
    'syncAlgolia.js',
    'importTools.js',
    'backupMongoDB.js',
    'healthCheck.js',
    'testEmails.js',
    'generateSitemap.js'
]

for (const script of scripts) {
    const scriptPath = path.join(__dirname, script)
    if (fs.existsSync(scriptPath)) {
        pass(`Script available: ${script}`)
    } else {
        warn(`Script not found: ${script}`)
    }
}

// Final Summary
console.log('\n' + '='.repeat(60))
console.log('📊 VERIFICATION SUMMARY')
console.log('='.repeat(60))
console.log(`✅ Passed: ${results.passed.length}`)
console.log(`❌ Failed: ${results.failed.length}`)
console.log(`⚠️  Warnings: ${results.warnings.length}`)
console.log('')

if (results.failed.length === 0) {
    console.log('🎉 ALL CRITICAL CHECKS PASSED!')
    console.log('✅ Platform is READY FOR LAUNCH!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Run: npm run sync-algolia (to populate search index)')
    console.log('2. Test payment flows in production')
    console.log('3. Verify email delivery')
    console.log('4. Set up admin user in Clerk')
    console.log('5. LAUNCH! 🚀')
    process.exit(0)
} else {
    console.log('⚠️  CRITICAL ISSUES FOUND!')
    console.log('Please fix the following before launch:')
    console.log('')
    results.failed.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg}`)
    })
    process.exit(1)
}
