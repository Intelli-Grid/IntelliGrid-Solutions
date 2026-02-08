import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Backup directory
const BACKUP_DIR = path.join(__dirname, '../../backups')

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

async function backupDatabase() {
    try {
        console.log('🔄 Starting database backup...')
        console.log(`📁 Backup directory: ${BACKUP_DIR}`)

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('✅ Connected to MongoDB')

        // Get all collections
        const collections = await mongoose.connection.db.listCollections().toArray()
        console.log(`📦 Found ${collections.length} collections`)

        // Create backup object
        const backup = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            database: mongoose.connection.db.databaseName,
            collections: {}
        }

        // Backup each collection
        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name
            console.log(`📦 Backing up collection: ${collectionName}`)

            const collection = mongoose.connection.db.collection(collectionName)
            const documents = await collection.find({}).toArray()

            backup.collections[collectionName] = documents
            console.log(`✅ Backed up ${documents.length} documents from ${collectionName}`)
        }

        // Create filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0]
        const filename = `backup-${timestamp}.json`
        const filepath = path.join(BACKUP_DIR, filename)

        // Write backup to file
        fs.writeFileSync(filepath, JSON.stringify(backup, null, 2))
        console.log(`✅ Backup saved to: ${filepath}`)

        // Get file size
        const stats = fs.statSync(filepath)
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2)
        console.log(`📊 Backup size: ${fileSizeMB} MB`)

        // Create backup summary
        const summary = {
            filename,
            timestamp: backup.timestamp,
            database: backup.database,
            collections: Object.keys(backup.collections).length,
            totalDocuments: Object.values(backup.collections).reduce((sum, docs) => sum + docs.length, 0),
            sizeMB: fileSizeMB
        }

        console.log('\n📊 Backup Summary:')
        console.log(`   Database: ${summary.database}`)
        console.log(`   Collections: ${summary.collections}`)
        console.log(`   Total Documents: ${summary.totalDocuments}`)
        console.log(`   Size: ${summary.sizeMB} MB`)
        console.log(`   File: ${summary.filename}`)

        // Close connection
        await mongoose.connection.close()
        console.log('\n✅ Database backup completed successfully!')

        return filepath
    } catch (error) {
        console.error('❌ Backup failed:', error)
        await mongoose.connection.close()
        process.exit(1)
    }
}

// Run backup
backupDatabase()
