/**
 * fix-category-toolcount.js
 *
 * One-time migration: recount active tools per category and update
 * Category.toolCount to match reality.
 *
 * Run ONCE from the project root:
 *   node --experimental-vm-modules scripts/fix-category-toolcount.js
 *
 * Or via npm script (if configured):
 *   npm run fix:category-counts
 *
 * Safe to re-run — uses $set so re-running produces the same result.
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../.env') })

// ── Inline lean models (avoids importing the full service layer) ──────────────

const toolSchema = new mongoose.Schema({
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    status: String,
})
const categorySchema = new mongoose.Schema({
    toolCount: { type: Number, default: 0 },
})

const Tool = mongoose.models.Tool || mongoose.model('Tool', toolSchema)
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema)

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
    if (!process.env.MONGODB_URI) {
        console.error('❌  MONGODB_URI not set in .env')
        process.exit(1)
    }

    console.log('🔌  Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅  Connected\n')

    // Aggregate: count active tools grouped by category
    const counts = await Tool.aggregate([
        { $match: { status: 'active', category: { $exists: true, $ne: null } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
    ])

    console.log(`📊  Found ${counts.length} categories with active tools\n`)

    // First reset ALL categories to 0
    const { modifiedCount: resetCount } = await Category.updateMany({}, { $set: { toolCount: 0 } })
    console.log(`🔄  Reset ${resetCount} categories to toolCount: 0`)

    // Then set the real counts
    let updated = 0
    for (const { _id, count } of counts) {
        const result = await Category.findByIdAndUpdate(
            _id,
            { $set: { toolCount: count } },
            { new: false }
        )
        if (result) {
            console.log(`   ✔  ${result.name || _id} → ${count} tools`)
            updated++
        } else {
            console.warn(`   ⚠  Category ${_id} not found — skipping`)
        }
    }

    console.log(`\n✅  Done. Updated toolCount on ${updated}/${counts.length} categories.`)
    await mongoose.disconnect()
    process.exit(0)
}

run().catch((err) => {
    console.error('❌  Migration failed:', err)
    process.exit(1)
})
