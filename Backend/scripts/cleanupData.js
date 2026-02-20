import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

const { default: connectDB } = await import('../src/config/database.js')
const { default: Tool } = await import('../src/models/Tool.js')
const { default: Category } = await import('../src/models/Category.js')

await connectDB()
console.log('\n🧹 IntelliGrid Data Cleanup\n' + '━'.repeat(50))

// ─────────────────────────────────────────────────────
// STEP 1: Fix category toolCounts (recalculate from DB)
// ─────────────────────────────────────────────────────
console.log('\n📊 STEP 1: Recalculating category toolCounts...')

const categories = await Category.find({}).lean()
let toolCountFixed = 0

for (const cat of categories) {
    const count = await Tool.countDocuments({
        category: cat._id,
        status: 'active'
    })
    await Category.findByIdAndUpdate(cat._id, { toolCount: count })
    console.log(`   ✅ "${cat.name}": ${cat.toolCount} → ${count}`)
    toolCountFixed++
}
console.log(`\n   Fixed ${toolCountFixed} category toolCounts`)

// ─────────────────────────────────────────────────────
// STEP 2: Remove empty duplicate/shadow categories
// SAFE: only deletes categories with 0 tools
// Keeping: "Writing & Content", "Marketing & SEO", "Developer Tools", 
//          "Image Generation", "Video Generation", "Audio & Music" etc.
// Deleting: "Writing", "Marketing", "Design", "News", "Uncategorized"
//           (shadow categories with 0 tools that confuse users)
// ─────────────────────────────────────────────────────
console.log('\n🗑️  STEP 2: Removing empty shadow categories...')

const CATEGORIES_TO_REMOVE = ['writing', 'marketing', 'design', 'news', 'uncategorized']

for (const slug of CATEGORIES_TO_REMOVE) {
    const cat = await Category.findOne({ slug })
    if (!cat) {
        console.log(`   ⚠️  "${slug}": not found, skipping`)
        continue
    }
    const toolCount = await Tool.countDocuments({ category: cat._id })
    if (toolCount > 0) {
        console.log(`   ⚠️  "${slug}": has ${toolCount} tools — SKIPPING (not empty)`)
        continue
    }
    await Category.findByIdAndDelete(cat._id)
    console.log(`   ✅ Deleted "${cat.name}" (${slug}) — had 0 tools`)
}

// ─────────────────────────────────────────────────────
// STEP 3: Fix pricing: "Unknown" → null
// The frontend/Algolia treats null as "Contact for pricing"
// which is cleaner than showing "Unknown"
// ─────────────────────────────────────────────────────
console.log('\n💰 STEP 3: Normalizing pricing values...')

const pricingResult = await Tool.updateMany(
    { pricing: 'Unknown' },
    { $set: { pricing: null } }
)
console.log(`   ✅ Converted ${pricingResult.modifiedCount} tools from "Unknown" → null pricing`)

// Also fix any tools with pricing being an object instead of a string
// (e.g. { type: "Free" } stored as embedded object — protect against this)
const objectPricingTools = await Tool.find({
    pricing: { $type: 'object' }
}, 'name pricing').limit(5).lean()

if (objectPricingTools.length > 0) {
    console.log(`\n   ⚠️  Found ${objectPricingTools.length} tools with object-type pricing. Fixing...`)
    for (const t of objectPricingTools) {
        const pricingStr = t.pricing?.type || t.pricing?.model || null
        await Tool.findByIdAndUpdate(t._id, { pricing: pricingStr })
        console.log(`      Fixed: "${t.name}" → "${pricingStr}"`)
    }
}

// ─────────────────────────────────────────────────────
// STEP 4: Strip junk tags (category names & feature labels
// that were imported from Futurepedia's tag structure)
// These pollute search results and confuse users
// ─────────────────────────────────────────────────────
console.log('\n🏷️  STEP 4: Stripping junk tags from tools...')

const JUNK_TAGS = [
    'Image Generators',
    'Text Generators',
    'Video Tools',
    'Art Generators',
    'Audio Generators',
    'Best AI Art Generators',
    'Best AI Image Generators',
    'Best AI Chatbots',
    'Best AI Tools',
    'Best AI Video Generators',
    'Productivity Tools',
    'All AI Tools',
    'AI Tools',
    'Featured',
    'Editor\'s Pick',
]

// Also strip from features field (it has the same junk data)
const JUNK_FEATURES = [...JUNK_TAGS]

const tagResult = await Tool.updateMany(
    { tags: { $in: JUNK_TAGS } },
    { $pull: { tags: { $in: JUNK_TAGS } } }
)
console.log(`   ✅ Stripped junk tags from ${tagResult.modifiedCount} tools`)

const featureResult = await Tool.updateMany(
    { features: { $in: JUNK_FEATURES } },
    { $pull: { features: { $in: JUNK_FEATURES } } }
)
console.log(`   ✅ Stripped junk features from ${featureResult.modifiedCount} tools`)

// ─────────────────────────────────────────────────────
// STEP 5: Final audit — print summary
// ─────────────────────────────────────────────────────
console.log('\n📋 STEP 5: Final state check...')

const finalCats = await Category.find({}, 'name slug toolCount').sort({ toolCount: -1 }).lean()
console.log('\n   Category toolCounts (after fix):')
finalCats.forEach(c => console.log(`   ${c.name.padEnd(30)} ${c.toolCount} tools`))

const pricingFinal = await Tool.aggregate([
    { $group: { _id: '$pricing', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
])
console.log('\n   Pricing distribution (after fix):')
pricingFinal.forEach(p => console.log(`   "${p._id ?? 'null'}": ${p.count}`))

const remainingBadTags = await Tool.countDocuments({ tags: { $in: JUNK_TAGS } })
console.log(`\n   Tools still with junk tags: ${remainingBadTags}`)

console.log('\n' + '━'.repeat(50))
console.log('✨ Data cleanup complete!')
console.log('━'.repeat(50) + '\n')

process.exit(0)
