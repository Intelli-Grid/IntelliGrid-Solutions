/**
 * Database Health Check Script
 * Verifies database connection, collections, and data integrity
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
}

async function checkDatabaseHealth() {
    console.log('\n🏥 Database Health Check');
    console.log('='.repeat(60));

    const results = {
        passed: [],
        failed: [],
        warnings: []
    };

    try {
        // Test 1: Connection
        console.log('\n1️⃣  Testing MongoDB Connection...');
        // Set up connection options if needed
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        results.passed.push('MongoDB Connection');

        // Test 2: Database exists
        console.log('\n2️⃣  Checking Database...');
        const db = mongoose.connection.db;
        const dbName = db.databaseName;
        console.log(`✅ Database: ${dbName}`);
        results.passed.push('Database Access');

        // Test 3: Collections
        console.log('\n3️⃣  Checking Collections...');
        const collections = await db.listCollections().toArray();
        console.log(`✅ Found ${collections.length} collections:`);
        collections.forEach(col => {
            console.log(`   - ${col.name}`);
        });
        results.passed.push('Collections');

        // Test 4: Document counts
        console.log('\n4️⃣  Checking Document Counts...');
        const expectedCollections = ['users', 'tools', 'payments', 'subscriptions'];

        for (const collectionName of expectedCollections) {
            try {
                const collection = db.collection(collectionName);
                const count = await collection.countDocuments();
                console.log(`   - ${collectionName}: ${count} documents`);

                if (count === 0 && collectionName === 'tools') {
                    results.warnings.push(`${collectionName} collection is empty`);
                }
            } catch (error) {
                console.log(`   ⚠️  ${collectionName}: Collection not found`);
                results.warnings.push(`${collectionName} collection missing`);
            }
        }
        results.passed.push('Document Counts');

        // Test 5: Indexes
        console.log('\n5️⃣  Checking Indexes...');
        for (const collectionName of expectedCollections) {
            try {
                const collection = db.collection(collectionName);
                const indexes = await collection.indexes();
                console.log(`   - ${collectionName}: ${indexes.length} indexes`);
            } catch (error) {
                // Collection doesn't exist yet
            }
        }
        results.passed.push('Indexes');

        // Test 6: Write operation
        console.log('\n6️⃣  Testing Write Operation...');
        const testCollection = db.collection('health_check');
        const testDoc = {
            timestamp: new Date(),
            test: 'health_check',
            status: 'success'
        };
        await testCollection.insertOne(testDoc);
        console.log('✅ Write operation successful');

        // Clean up test document
        await testCollection.deleteOne({ _id: testDoc._id });
        console.log('✅ Cleanup successful');
        results.passed.push('Write Operations');

        // Test 7: Read operation
        console.log('\n7️⃣  Testing Read Operation...');
        const usersCollection = db.collection('users');
        const sampleUser = await usersCollection.findOne({});
        if (sampleUser) {
            console.log('✅ Read operation successful');
            console.log(`   Sample user ID: ${sampleUser._id}`);
        } else {
            console.log('⚠️  No users found (database might be empty)');
            results.warnings.push('No users in database');
        }
        results.passed.push('Read Operations');

    } catch (error) {
        console.error('\n❌ Health check failed:', error.message);
        results.failed.push(error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Connection closed');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Health Check Summary');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed.length} checks`);
    results.passed.forEach(check => console.log(`   - ${check}`));

    if (results.warnings.length > 0) {
        console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
        results.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (results.failed.length > 0) {
        console.log(`\n❌ Failed: ${results.failed.length} checks`);
        results.failed.forEach(failure => console.log(`   - ${failure}`));
    }

    console.log('='.repeat(60));

    if (results.failed.length === 0) {
        console.log('\n🎉 Database is healthy!');
        process.exit(0);
    } else {
        console.log('\n⚠️  Database has issues that need attention');
        process.exit(1);
    }
}

// Run health check
checkDatabaseHealth().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
