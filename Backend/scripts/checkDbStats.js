import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

await mongoose.connect(process.env.MONGODB_URI)
const col = mongoose.connection.collection('tools')

// Check specific well-known tools to confirm logo mapping is correct
const tools = await col.find({
    slug: { $in: ['chatgpt', 'midjourney', 'dall-e-3', 'github-copilot', 'jasper', 'claude'] }
}).toArray()

console.log('=== Logo Verification for Known Tools ===\n')
for (const t of tools) {
    console.log(`Tool:  ${t.name}`)
    console.log(`Slug:  ${t.slug}`)
    console.log(`Logo:  ${t.logo || '(none)'}`)
    console.log(`Meta:  ${t.metadata?.logo || '(none)'}`)
    console.log()
}

// Summary counts
const total = await col.countDocuments({ status: 'active' })
const withLogo = await col.countDocuments({ status: 'active', logo: { $type: 'string', $not: { $in: ['', null] } }, $nor: [{ logo: /placeholder/ }] })
const cdnLogo = await col.countDocuments({ status: 'active', logo: /cdn\.futurepedia\.io/ })
console.log('=== Final Logo Stats ===')
console.log(`Active tools:             ${total}`)
console.log(`Tools with any logo:      ${withLogo}`)
console.log(`Direct cdn.fp.io logos:   ${cdnLogo}`)
console.log(`Tools without logos:      ${total - withLogo}`)

process.exit(0)
