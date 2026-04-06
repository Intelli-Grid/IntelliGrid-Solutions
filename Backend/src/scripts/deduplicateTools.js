/**
 * deduplicateTools.js
 * ====================
 * Scans MongoDB for potential duplicate tools after a CSV import and
 * generates a human-review report. Does NOT auto-delete anything.
 *
 * Detects duplicates by:
 *   1. Same officialUrl domain  (jasper.ai = www.jasper.ai/signup)
 *   2. Same normalized name     ("Chat GPT" = "chatgpt" = "ChatGPT")
 *
 * Output: Backend/logs/duplicates-report.json
 *
 * Usage (from Backend/ directory):
 *   node src/scripts/deduplicateTools.js
 *
 * After reviewing the report:
 *   - To delete a tool: use your admin panel's Delete Tool button
 *   - Keep the tool with the higher enrichmentScore (more complete data)
 *   - For same_domain pairs: prefer the 'active' tool over 'pending'
 *
 * Run from Backend/ directory with MONGODB_URI in .env
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js' // register schema

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractDomain(url) {
    if (!url) return null
    try {
        const u = new URL(url.startsWith('http') ? url : `https://${url}`)
        return u.hostname.replace(/^www\./, '').toLowerCase()
    } catch {
        return null
    }
}

/**
 * Normalize tool name for comparison.
 * Removes spaces, punctuation, lowercases.
 * "Chat GPT" → "chatgpt", "Jasper.ai" → "jasperai"
 */
function normalizeName(name) {
    if (!name) return ''
    return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    if (!process.env.MONGODB_URI) {
        console.error('\n❌ MONGODB_URI not set in .env')
        process.exit(1)
    }

    await mongoose.connect(process.env.MONGODB_URI)
    console.log('\n✅ Connected to MongoDB')

    // ── Fetch all tools (both active and pending) ──────────────────────────
    console.log('\n🔍 Fetching all tools for duplicate scan...')
    const tools = await Tool.find({})
        .select('_id name slug officialUrl status isActive enrichmentScore createdAt dataSource')
        .lean()

    console.log(`   Total tools in DB: ${tools.length}`)
    console.log('   Scanning for duplicates...\n')

    const duplicates = []

    // ── Step 1: Group by domain ────────────────────────────────────────────
    const domainMap = {}
    for (const tool of tools) {
        const domain = extractDomain(tool.officialUrl)
        if (!domain) continue
        if (!domainMap[domain]) domainMap[domain] = []
        domainMap[domain].push(tool)
    }

    const processedToolIds = new Set()

    for (const [domain, group] of Object.entries(domainMap)) {
        if (group.length > 1) {
            const toolIds = group.map(t => t._id.toString())
            toolIds.forEach(id => processedToolIds.add(id))

            // Sort: active first, then by enrichmentScore desc
            const sorted = group.sort((a, b) => {
                if (a.status === 'active' && b.status !== 'active') return -1
                if (b.status === 'active' && a.status !== 'active') return 1
                return (b.enrichmentScore || 0) - (a.enrichmentScore || 0)
            })

            duplicates.push({
                type: 'same_domain',
                domain,
                count: group.length,
                recommendation: `Keep: "${sorted[0].name}" (${sorted[0].status}, score: ${sorted[0].enrichmentScore || 0})`,
                tools: sorted.map(t => ({
                    id: t._id.toString(),
                    name: t.name,
                    slug: t.slug,
                    status: t.status,
                    isActive: t.isActive,
                    enrichmentScore: t.enrichmentScore || 0,
                    dataSource: t.dataSource,
                    createdAt: t.createdAt,
                    officialUrl: t.officialUrl,
                })),
                action: 'DELETE the lower-ranked tools — keep the one marked in recommendation',
            })
        }
    }

    // ── Step 2: Group by normalized name (not already caught by domain) ────
    const nameMap = {}
    for (const tool of tools) {
        if (processedToolIds.has(tool._id.toString())) continue
        const key = normalizeName(tool.name)
        if (!key || key.length < 3) continue
        if (!nameMap[key]) nameMap[key] = []
        nameMap[key].push(tool)
    }

    for (const [key, group] of Object.entries(nameMap)) {
        if (group.length > 1) {
            const sorted = group.sort((a, b) => {
                if (a.status === 'active' && b.status !== 'active') return -1
                if (b.status === 'active' && a.status !== 'active') return 1
                return (b.enrichmentScore || 0) - (a.enrichmentScore || 0)
            })

            duplicates.push({
                type: 'same_name',
                normalizedName: key,
                count: group.length,
                recommendation: `Keep: "${sorted[0].name}" (${sorted[0].status}, score: ${sorted[0].enrichmentScore || 0})`,
                tools: sorted.map(t => ({
                    id: t._id.toString(),
                    name: t.name,
                    slug: t.slug,
                    status: t.status,
                    isActive: t.isActive,
                    enrichmentScore: t.enrichmentScore || 0,
                    dataSource: t.dataSource,
                    officialUrl: t.officialUrl,
                })),
                action: 'REVIEW MANUALLY — may be intentionally different tools with similar names',
            })
        }
    }

    // ── Write report ───────────────────────────────────────────────────────
    const logsDir = path.join(__dirname, '../../logs')
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })

    const reportPath = path.join(logsDir, 'duplicates-report.json')
    const report = {
        generatedAt: new Date().toISOString(),
        totalToolsScanned: tools.length,
        totalDuplicateGroups: duplicates.length,
        sameDomainGroups: duplicates.filter(d => d.type === 'same_domain').length,
        sameNameGroups: duplicates.filter(d => d.type === 'same_name').length,
        howToResolve: [
            'For same_domain: delete the pending/lower-score tool via admin panel → Delete Tool',
            'For same_name: manually compare the officialUrls — if different tools, leave them alone',
            'Always keep the tool with status:active and/or higher enrichmentScore',
        ],
        duplicates,
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // ── Summary ────────────────────────────────────────────────────────────
    console.log('═'.repeat(56))
    console.log('✅ DEDUPLICATION SCAN COMPLETE')
    console.log(`   Total tools scanned:      ${tools.length}`)
    console.log(`   Duplicate groups found:   ${duplicates.length}`)
    console.log(`   ├─ Same domain groups:    ${report.sameDomainGroups}`)
    console.log(`   └─ Same name groups:      ${report.sameNameGroups}`)
    console.log(`\n📋 Report saved to:`)
    console.log(`   ${reportPath}`)

    if (duplicates.length === 0) {
        console.log('\n🎉 No duplicates found — your database is clean!')
    } else {
        console.log('\n💡 Next steps:')
        console.log('   1. Open the report JSON file')
        console.log('   2. For each "same_domain" group: delete the lower-ranked tools via admin panel')
        console.log('   3. For each "same_name" group: check if they are truly the same tool')
        console.log('   4. Re-run this script after cleanup to confirm zero duplicates')
    }
    console.log('═'.repeat(56) + '\n')

    await mongoose.disconnect()
    process.exit(0)
}

main().catch(err => {
    console.error('\nFatal error:', err)
    process.exit(1)
})
