import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import readline from 'readline'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function question(query) {
    return new Promise(resolve => rl.question(query, resolve))
}

async function restoreDatabase(backupFile) {
    try {
        console.log('🔄 Starting database restoration...')

        // Read backup file
        const backupPath = path.join(__dirname, '../../backups', backupFile)
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupPath}`)
        }

        console.log(`📦 Loading backup file: ${backupFile}`)
        const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'))

        console.log('\n📊 Backup Information:')
        console.log(`   Created: ${backupData.timestamp}`)
        console.log(`   Database: ${backupData.database}`)
        console.log(`   Collections: ${Object.keys(backupData.collections).length}`)
        console.log(`   Total Documents: ${Object.values(backupData.collections).reduce((sum, col) => sum + (Array.isArray(col) ? col.length : col.documents.length), 0)}`)

        // Confirmation prompt
        console.log('\n⚠️  WARNING: This will DELETE all existing data and replace it with the backup!')
        const confirm = await question('Are you sure you want to continue? (yes/no): ')

        if (confirm.toLowerCase() !== 'yes') {
            console.log('❌ Restoration cancelled')
            rl.close()
            process.exit(0)
        }

        // Connect to MongoDB
        console.log('\n🔄 Connecting to MongoDB...')
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('✅ Connected to MongoDB')

        // Restore each collection
        let totalRestored = 0
        let totalIndexes = 0

        for (const [collectionName, data] of Object.entries(backupData.collections)) {
            console.log(`\n🔄 Restoring collection: ${collectionName}`)

            const collection = mongoose.connection.db.collection(collectionName)

            // Handle both new and old backup format
            const documents = Array.isArray(data) ? data : data.documents
            const indexes = Array.isArray(data) ? [] : data.indexes || []

            // Clear existing data
            const deleteResult = await collection.deleteMany({})
            console.log(`   🗑️  Deleted ${deleteResult.deletedCount} existing documents`)

            // Insert backup data
            if (documents.length > 0) {
                await collection.insertMany(documents)
                console.log(`   ✅ Restored ${documents.length} documents`)
                totalRestored += documents.length
            } else {
                console.log(`   ℹ️  No documents to restore`)
            }

            // Restore Indexes
            if (indexes.length > 0) {
                // Filter out _id index as it's created automatically
                const validIndexes = indexes.filter(idx => idx.name !== '_id_')

                if (validIndexes.length > 0) {
                    try {
                        await collection.createIndexes(validIndexes)
                        console.log(`   ✅ Restored ${validIndexes.length} indexes`)
                        totalIndexes += validIndexes.length
                    } catch (err) {
                        console.warn(`   ⚠️  Index creation warning: ${err.message}`)
                    }
                }
            }
        }

        console.log('\n📊 Restoration Summary:')
        console.log(`   Collections Restored: ${Object.keys(backupData.collections).length}`)
        console.log(`   Total Documents Restored: ${totalRestored}`)
        console.log(`   Total Indexes Restored: ${totalIndexes}`)

        await mongoose.connection.close()
        console.log('\n✅ Database restoration completed successfully!')

        rl.close()
    } catch (error) {
        console.error('\n❌ Restoration failed:', error)
        await mongoose.connection.close()
        rl.close()
        process.exit(1)
    }
}

// Get backup file from command line argument
const backupFile = process.argv[2]
if (!backupFile) {
    console.error('❌ Please provide backup filename')
    console.log('\nUsage: node restoreMongoDB.js <backup-filename>')
    console.log('\nExample: node restoreMongoDB.js backup-2026-02-07T12-00-00.json')
    console.log('\nAvailable backups:')

    const backupsDir = path.join(__dirname, '../../backups')
    if (fs.existsSync(backupsDir)) {
        const files = fs.readdirSync(backupsDir)
            .filter(f => f.endsWith('.json'))
            .sort()
            .reverse()

        if (files.length > 0) {
            files.forEach(f => console.log(`   - ${f}`))
        } else {
            console.log('   No backups found')
        }
    } else {
        console.log('   Backups directory does not exist')
    }

    process.exit(1)
}

restoreDatabase(backupFile)
