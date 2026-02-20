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

console.log('\n=== CATEGORIES ===')
const allCats = await Category.find({}, 'name slug toolCount isActive').lean()
allCats.sort((a, b) => a.name.localeCompare(b.name))
allCats.forEach(c => console.log(`  "${c.name}" (${c.slug}) — ${c.toolCount} tools — active: ${c.isActive}`))

console.log('\n=== PRICING BREAKDOWN ===')
const pricingAgg = await Tool.aggregate([
    { $group: { _id: '$pricing', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
])
pricingAgg.forEach(p => console.log(`  "${p._id ?? 'null'}": ${p.count} tools`))

console.log('\n=== TOOLS WITH CLEARLY BAD TAGS ===')
const BAD_TAG_PATTERNS = ['Image Generators', 'Text Generators', 'Video Tools', 'Art Generators', 'Audio Generators', 'Best AI']
const badTagTools = await Tool.countDocuments({ tags: { $in: BAD_TAG_PATTERNS } })
console.log(`  ${badTagTools} tools have feature-style tags instead of real tags`)

const sample = await Tool.findOne({ tags: { $in: BAD_TAG_PATTERNS } }, 'name tags').lean()
if (sample) console.log(`  Sample: "${sample.name}" tags:`, sample.tags?.slice(0, 8))

console.log('\n=== TOOLS WITH "features" FIELD USED AS TAGS ===')
const badFeatureTools = await Tool.countDocuments({
    features: { $in: BAD_TAG_PATTERNS }
})
console.log(`  ${badFeatureTools} tools have feature-style data in 'features' field`)

console.log('\n=== TOOLS WITH MISSING/NULL LOGO ===')
const noLogo = await Tool.countDocuments({ $or: [{ logo: null }, { logo: '' }, { logo: { $exists: false } }] })
console.log(`  ${noLogo} tools have no logo`)

console.log('\n=== STATUS BREAKDOWN ===')
const statusAgg = await Tool.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
])
statusAgg.forEach(s => console.log(`  "${s._id}": ${s.count} tools`))

console.log('\n=== TOOLS WITH EMPTY SHORT DESCRIPTION ===')
const noDesc = await Tool.countDocuments({ $or: [{ shortDescription: null }, { shortDescription: '' }] })
console.log(`  ${noDesc} tools missing shortDescription`)

process.exit(0)
