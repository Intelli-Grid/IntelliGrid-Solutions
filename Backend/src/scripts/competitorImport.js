/**
 * competitorImport.js
 * ===================
 * Imports AI tools from competitor CSV exports into MongoDB as pending tools.
 *
 * Designed for CSV data from: Futurepedia, AIXploria, FutureTools
 *
 * Usage (from Backend/ directory):
 *   node src/scripts/competitorImport.js ./exports/futurepedia_tools.csv
 *   node src/scripts/competitorImport.js ./exports/aixploria_tools.csv
 *   node src/scripts/competitorImport.js ./exports/futuretools_tools.csv
 *
 * Behaviour:
 *   - Source site auto-detected from filename OR from source_site column in CSV
 *   - Deduplicates by officialUrl domain AND name (case-insensitive) before inserting
 *   - Tools that already exist in your DB → skipped (zero overwrites)
 *   - New tools → created with status: 'pending', isActive: false
 *   - NEVER auto-publishes — all imports require admin approval
 *   - FutureTools saves_count column → stored as taaftSavesCount in MongoDB
 *   - Writes full run report to: Backend/logs/import-report-{timestamp}.json
 *
 * CSV Expected Columns (all 3 sites):
 *   name, official_url, short_description, category, pricing, source_url, source_site
 *   FutureTools also has: saves_count (optional, imported to taaftSavesCount)
 *
 * Run from Backend/ directory with MONGODB_URI in .env
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'
import slugify from 'slugify'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js' // register schema

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Config ────────────────────────────────────────────────────────────────────
const REPORT_INTERVAL = 100   // Print progress every N tools
const BATCH_SIZE = 50         // Insert in batches for memory efficiency
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

/**
 * Extract domain from URL for fuzzy dedup matching.
 * "https://www.jasper.ai/pricing" → "jasper.ai"
 */
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
 * Normalize and validate a URL string.
 * Ensures https:// prefix, removes trailing slash.
 */
function normalizeUrl(url) {
    if (!url) return null
    let u = url.trim()
    if (!u || u === 'N/A' || u === '-') return null
    if (!u.startsWith('http')) u = `https://${u}`
    try {
        new URL(u) // validate it parses
        return u.replace(/\/$/, '')
    } catch {
        return null
    }
}

/**
 * Map raw pricing badge text to Tool schema enum values.
 * Handles typos, mixed strings, and edge cases.
 */
function mapPricing(rawPricing) {
    const p = (rawPricing || '').toLowerCase().trim()
    if (!p || p === 'unknown') return 'Unknown'
    if (p.includes('freemium')) return 'Freemium'
    if (p.includes('free') && (p.includes('paid') || p.includes('premium') || p.includes('+'))) return 'Freemium'
    if (p.includes('free')) return 'Free'
    if (p.includes('trial') || p.includes('try it')) return 'Trial'
    if (p.includes('paid') || p.includes('premium') || p.includes('$') || p.includes('subscription')) return 'Paid'
    return 'Unknown'
}

/**
 * Parse saves_count from FutureTools CSV.
 * "1.2k" → 1200, "842" → 842, "" → 0
 */
function parseSavesCount(raw) {
    if (!raw) return 0
    const str = String(raw).toLowerCase().trim()
    const kMatch = str.match(/([\d.]+)\s*k/)
    if (kMatch) {
        return Math.round(parseFloat(kMatch[1]) * 1000)
    }
    const numMatch = str.match(/[\d,]+/)
    if (numMatch) {
        return parseInt(numMatch[0].replace(',', ''), 10) || 0
    }
    return 0
}

/**
 * Build a unique slug, appending a timestamp suffix on collision.
 */
async function buildUniqueSlug(name) {
    const base = slugify(name, { lower: true, strict: true, trim: true })
    if (!base) return `tool-${Date.now().toString(36)}`
    const exists = await Tool.findOne({ slug: base }).select('_id').lean()
    if (!exists) return base
    return `${base}-${Date.now().toString(36)}`
}

/**
 * Check if a tool already exists in DB by officialUrl domain OR name.
 * Returns existing tool's _id + name or null if not found.
 */
async function findExistingTool(name, officialUrl) {
    const domain = extractDomain(officialUrl)
    const conditions = []

    if (name && name.trim()) {
        const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        conditions.push({ name: new RegExp(`^${escaped}$`, 'i') })
    }
    if (domain) {
        const escapedDomain = domain.replace(/\./g, '\\.')
        conditions.push({ officialUrl: new RegExp(escapedDomain, 'i') })
    }

    if (!conditions.length) return null
    return Tool.findOne({ $or: conditions }).select('_id name slug').lean()
}

/**
 * Process a single CSV row.
 * Returns { status: 'created'|'duplicate'|'skipped'|'error', ... }
 */
async function processRow(record, sourceSite) {
    // ── Field extraction ───────────────────────────────────────────────────
    const name = (record.name || record.Name || '').trim()
    const rawUrl = (record.official_url || record.url || record.officialUrl || '').trim()
    const officialUrl = normalizeUrl(rawUrl)
    const shortDescription = (record.short_description || record.description || record.shortDescription || '')
        .trim()
        .slice(0, 500)
    const pricing = mapPricing(record.pricing || record.price)
    const sourceUrl = (record.source_url || record.sourceUrl || '').trim() || null
    const categoryHint = (record.category || '').trim()
    const savesCount = parseSavesCount(record.saves_count || record.savesCount)

    // ── Validation ─────────────────────────────────────────────────────────
    if (!name) {
        return { status: 'skipped', reason: 'no_name' }
    }
    if (!officialUrl) {
        return { status: 'skipped', reason: 'no_valid_url', name }
    }

    // Filter out obviously bad URLs (competitor self-links slipping through)
    const badDomains = ['futurepedia.io', 'aixploria.com', 'futuretools.io', 'theresanaiforthat.com']
    const domain = extractDomain(officialUrl)
    if (domain && badDomains.some(bad => domain.includes(bad))) {
        return { status: 'skipped', reason: 'competitor_url', name }
    }

    // ── Dedup check ────────────────────────────────────────────────────────
    const existing = await findExistingTool(name, officialUrl)
    if (existing) {
        return { status: 'duplicate', existingId: existing._id, existingName: existing.name }
    }

    // ── Slug ───────────────────────────────────────────────────────────────
    const slug = await buildUniqueSlug(name)

    // ── Source tracking fields ─────────────────────────────────────────────
    const sourceFields = {}
    if (sourceSite === 'futurepedia' && sourceUrl) {
        sourceFields.futurepediaUrl = sourceUrl
    }
    if (savesCount > 0) {
        sourceFields.taaftSavesCount = savesCount
    }

    // ── Map source site to dataSource enum ────────────────────────────────
    const dataSourceMap = {
        'futurepedia': 'futurepedia',
        'aixploria': 'manual',    // no enum value for aixploria, use 'manual'
        'futuretools': 'manual',
        'unknown': 'manual',
    }
    const dataSource = dataSourceMap[sourceSite] || 'manual'

    // ── Create tool as PENDING — never auto-publishes ──────────────────────
    try {
        const toolData = {
            name,
            slug,
            officialUrl,
            shortDescription: shortDescription || `${name} — AI tool.`,
            pricing,
            status: 'pending',      // ← CRITICAL: requires admin approval to go live
            isActive: false,        // ← CRITICAL: hidden from all public queries
            sourceFoundBy: 'scraper',
            needsEnrichment: true,  // ← picked up by bulkEnrich.js
            dataSource,
            ...sourceFields,
        }

        const tool = await Tool.create(toolData)
        return { status: 'created', toolId: tool._id, name: tool.name, slug: tool.slug }

    } catch (err) {
        if (err.code === 11000) {
            // Duplicate key on slug — retry with random suffix
            try {
                const fallbackSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`
                const tool = await Tool.create({
                    name, slug: fallbackSlug, officialUrl,
                    shortDescription: shortDescription || `${name} — AI tool.`,
                    pricing, status: 'pending', isActive: false,
                    sourceFoundBy: 'scraper', needsEnrichment: true, dataSource,
                    ...sourceFields,
                })
                return { status: 'created', toolId: tool._id, name: tool.name, slug: tool.slug }
            } catch (retryErr) {
                return { status: 'error', reason: retryErr.message, name }
            }
        }
        return { status: 'error', reason: err.message, name }
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const csvPath = process.argv[2]

    if (!csvPath) {
        console.error('\n❌ Usage: node src/scripts/competitorImport.js <path-to-csv>')
        console.error('   Examples:')
        console.error('     node src/scripts/competitorImport.js ./exports/futurepedia_tools.csv')
        console.error('     node src/scripts/competitorImport.js ./exports/aixploria_tools.csv')
        console.error('     node src/scripts/competitorImport.js ./exports/futuretools_tools.csv\n')
        process.exit(1)
    }

    if (!fs.existsSync(csvPath)) {
        console.error(`\n❌ CSV file not found: ${csvPath}`)
        console.error('   Run the Python crawler first to generate the CSV file.\n')
        process.exit(1)
    }

    if (!process.env.MONGODB_URI) {
        console.error('\n❌ MONGODB_URI not set in .env')
        process.exit(1)
    }

    // ── Connect ────────────────────────────────────────────────────────────
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('\n✅ Connected to MongoDB')

    // ── Ensure logs directory ──────────────────────────────────────────────
    const logsDir = path.join(__dirname, '../../logs')
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true })

    // ── Parse CSV ─────────────────────────────────────────────────────────
    const fileContent = fs.readFileSync(csvPath, 'utf8')
    let records
    try {
        records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,               // Handle Excel BOM (utf-8-sig)
            relax_column_count: true, // Don't fail on rows with mismatched columns
        })
    } catch (parseErr) {
        console.error(`\n❌ Failed to parse CSV: ${parseErr.message}`)
        process.exit(1)
    }

    if (!records.length) {
        console.error('\n❌ CSV file is empty or has no valid rows.')
        process.exit(1)
    }

    // ── Auto-detect source site from filename or CSV column ────────────────
    const filename = path.basename(csvPath).toLowerCase()
    let sourceSite = 'unknown'
    if (filename.includes('futurepedia')) sourceSite = 'futurepedia'
    else if (filename.includes('aixploria')) sourceSite = 'aixploria'
    else if (filename.includes('futuretools')) sourceSite = 'futuretools'
    else if (records[0]?.source_site) sourceSite = records[0].source_site.toLowerCase().trim()

    // ── Check active tool count BEFORE (safety baseline) ──────────────────
    const activeCountBefore = await Tool.countDocuments({ status: 'active', isActive: true })
    const pendingCountBefore = await Tool.countDocuments({ status: 'pending' })

    console.log('\n╔══════════════════════════════════════════════════════╗')
    console.log('║         IntelliGrid · Competitor CSV Import          ║')
    console.log('╚══════════════════════════════════════════════════════╝')
    console.log(`  Source site:         ${sourceSite}`)
    console.log(`  CSV file:            ${path.basename(csvPath)}`)
    console.log(`  Total CSV rows:      ${records.length}`)
    console.log(`  Active tools (live): ${activeCountBefore}  ← This will NOT change`)
    console.log(`  Pending tools now:   ${pendingCountBefore}`)
    console.log(`\n⚠️  All imports go to status:pending + isActive:false`)
    console.log('   Nothing goes live until admin approves via admin panel')
    console.log('\n🚦 Starting in 3 seconds... Press Ctrl+C to cancel.\n')
    await sleep(3000)

    // ── Process rows ───────────────────────────────────────────────────────
    const results = { created: 0, duplicate: 0, skipped: 0, error: 0 }
    const createdTools = []
    const errors = []
    const startTime = Date.now()

    for (let i = 0; i < records.length; i++) {
        // Progress report every REPORT_INTERVAL rows
        if (i > 0 && i % REPORT_INTERVAL === 0) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
            const pct = ((i / records.length) * 100).toFixed(1)
            console.log(
                `  📊 ${i}/${records.length} (${pct}%) | ✅ ${results.created} new | ` +
                `⏭  ${results.duplicate} dupes | ⏩ ${results.skipped} skipped | ` +
                `❌ ${results.error} errors | ${elapsed}s elapsed`
            )
        }

        const result = await processRow(records[i], sourceSite)

        switch (result.status) {
            case 'created':
                results.created++
                createdTools.push({ name: result.name, slug: result.slug, id: result.toolId?.toString() })
                break
            case 'duplicate':
                results.duplicate++
                break
            case 'skipped':
                results.skipped++
                break
            case 'error':
                results.error++
                errors.push({ row: i + 2, name: result.name, reason: result.reason })
                break
        }
    }

    // ── Safety verification ────────────────────────────────────────────────
    const activeCountAfter = await Tool.countDocuments({ status: 'active', isActive: true })
    const pendingCountAfter = await Tool.countDocuments({ status: 'pending' })

    // ── Write run report ───────────────────────────────────────────────────
    const reportPath = path.join(logsDir, `import-report-${Date.now()}.json`)
    const report = {
        source: sourceSite,
        csvFile: path.resolve(csvPath),
        runAt: new Date().toISOString(),
        totals: { ...results, total: records.length },
        safety: {
            activeToolsBefore: activeCountBefore,
            activeToolsAfter: activeCountAfter,
            activeToolsChanged: activeCountAfter !== activeCountBefore,  // should always be false
            newPendingAdded: pendingCountAfter - pendingCountBefore,
        },
        newTools: createdTools,
        errors,
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // ── Final summary ──────────────────────────────────────────────────────
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n${'═'.repeat(56)}`)
    console.log(`✅ IMPORT COMPLETE — ${sourceSite.toUpperCase()}`)
    console.log(`   Total rows processed:  ${records.length}`)
    console.log(`   ✅ New tools created:  ${results.created}  (status: pending, isActive: false)`)
    console.log(`   ⏭  Already in DB:     ${results.duplicate}  (skipped — no overwrite)`)
    console.log(`   ⏩ Skipped (bad data): ${results.skipped}`)
    console.log(`   ❌ Errors:            ${results.error}`)
    console.log(`   ⏱  Time elapsed:      ${elapsed}s`)
    console.log(`\n🔒 Safety check:`)
    console.log(`   Active tools before: ${activeCountBefore}`)
    console.log(`   Active tools after:  ${activeCountAfter}  ${activeCountAfter === activeCountBefore ? '← ✅ unchanged' : '⚠️  CHANGED — investigate!'}`)
    console.log(`   New pending added:   ${pendingCountAfter - pendingCountBefore}`)
    console.log(`\n📋 Full report saved to:`)
    console.log(`   ${reportPath}`)
    console.log(`\n💡 Next steps:`)
    console.log(`   1. node src/scripts/deduplicateTools.js   (check for any duplicates)`)
    console.log(`   2. node src/scripts/bulkEnrich.js          (Groq enriches pending tools)`)
    console.log(`   3. Admin panel → Pending Tools → review & approve`)
    console.log(`   4. node src/scripts/reindexAlgolia.js      (after approving tools)`)
    console.log(`${'═'.repeat(56)}\n`)

    await mongoose.disconnect()
    process.exit(0)
}

main().catch(err => {
    console.error('\nFatal error:', err)
    process.exit(1)
})
