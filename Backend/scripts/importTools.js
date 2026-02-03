import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import csv from 'csv-parser'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import slugify from 'slugify'
import Tool from '../src/models/Tool.js'
import connectDB from '../src/config/database.js'

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env') })

const CSV_FILE_PATH = path.join(__dirname, '../../ai_tools.csv')
const DOMAIN = 'https://intelligrid.online'

// Statistics
const stats = {
    total: 0,
    imported: 0,
    skipped: 0,
    errors: 0,
}

async function importTools() {
    try {
        console.log('🚀 Starting CSV import process...\n')

        // Connect to database
        await connectDB()

        // Check if CSV file exists
        if (!fs.existsSync(CSV_FILE_PATH)) {
            throw new Error(`CSV file not found at: ${CSV_FILE_PATH}`)
        }

        console.log(`📄 Reading CSV file: ${CSV_FILE_PATH}\n`)

        const tools = []

        // Read and parse CSV
        await new Promise((resolve, reject) => {
            fs.createReadStream(CSV_FILE_PATH)
                .pipe(csv())
                .on('data', (row) => {
                    stats.total++

                    try {
                        // Extract data from CSV
                        const toolName = row['Tool Name']?.trim()
                        const officialUrl = row['Official URL']?.trim()
                        const shortDescription = row['One-line Description']?.trim()
                        const fullDescription = row['Full Description']?.trim()
                        const oldSourceUrl = row['Source URL']?.trim()

                        // Validate required fields
                        if (!toolName || !officialUrl || !shortDescription || !fullDescription) {
                            console.warn(`⚠️  Skipping row ${stats.total}: Missing required fields`)
                            stats.skipped++
                            return
                        }

                        // Generate slug from tool name
                        const slug = slugify(toolName, { lower: true, strict: true })

                        // Transform Source URL from toolspedia.ai to intelligrid.online
                        const newSourceUrl = `${DOMAIN}/ai-tools/${slug}/`

                        // Create tool object
                        const tool = {
                            name: toolName,
                            slug: slug,
                            officialUrl: officialUrl,
                            sourceUrl: newSourceUrl,
                            shortDescription: shortDescription,
                            fullDescription: fullDescription,
                            status: 'active',
                        }

                        tools.push(tool)
                    } catch (error) {
                        console.error(`❌ Error processing row ${stats.total}:`, error.message)
                        stats.errors++
                    }
                })
                .on('end', resolve)
                .on('error', reject)
        })

        console.log(`\n📊 CSV Parsing Complete:`)
        console.log(`   Total rows: ${stats.total}`)
        console.log(`   Valid tools: ${tools.length}`)
        console.log(`   Skipped: ${stats.skipped}`)
        console.log(`   Errors: ${stats.errors}\n`)

        // Import tools in batches
        const BATCH_SIZE = 100
        const batches = []

        for (let i = 0; i < tools.length; i += BATCH_SIZE) {
            batches.push(tools.slice(i, i + BATCH_SIZE))
        }

        console.log(`🔄 Importing ${tools.length} tools in ${batches.length} batches...\n`)

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i]

            try {
                await Tool.insertMany(batch, { ordered: false })
                stats.imported += batch.length
                console.log(`✅ Batch ${i + 1}/${batches.length}: Imported ${batch.length} tools`)
            } catch (error) {
                // Handle duplicate key errors
                if (error.code === 11000) {
                    const insertedCount = error.result?.nInserted || 0
                    stats.imported += insertedCount
                    stats.errors += (batch.length - insertedCount)
                    console.log(`⚠️  Batch ${i + 1}/${batches.length}: Imported ${insertedCount} tools (${batch.length - insertedCount} duplicates skipped)`)
                } else {
                    console.error(`❌ Batch ${i + 1}/${batches.length} failed:`, error.message)
                    stats.errors += batch.length
                }
            }
        }

        // Final statistics
        console.log(`\n✨ Import Complete!`)
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`📊 Final Statistics:`)
        console.log(`   Total rows processed: ${stats.total}`)
        console.log(`   Successfully imported: ${stats.imported}`)
        console.log(`   Skipped: ${stats.skipped}`)
        console.log(`   Errors: ${stats.errors}`)
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

        // Verify database count
        const dbCount = await Tool.countDocuments()
        console.log(`🗄️  Total tools in database: ${dbCount}\n`)

        // Show sample tools
        const sampleTools = await Tool.find().limit(3).select('name slug sourceUrl')
        console.log(`📝 Sample imported tools:`)
        sampleTools.forEach((tool, index) => {
            console.log(`   ${index + 1}. ${tool.name}`)
            console.log(`      Slug: ${tool.slug}`)
            console.log(`      URL: ${tool.sourceUrl}\n`)
        })

    } catch (error) {
        console.error('❌ Import failed:', error)
        process.exit(1)
    } finally {
        await mongoose.connection.close()
        console.log('👋 Database connection closed')
        process.exit(0)
    }
}

// Run import
importTools()
