/**
 * importAll.js
 * ============
 * Master import orchestrator for IntelliGrid database expansion pipeline.
 *
 * Scans the Backend/exports/ directory for all CSV files produced by
 * the Python crawlers, runs competitorImport.js on each one sequentially,
 * then runs deduplicateTools.js and reports a combined summary.
 *
 * Usage (from Backend/ directory):
 *   node src/scripts/importAll.js
 *   node src/scripts/importAll.js --dry-run   (shows what would be imported)
 *
 * Pipeline position:
 *   [Python Crawlers] → [importAll.js] → [deduplicateTools.js] → [bulkEnrich.js] → [autoApprove.js]
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
const EXPORTS_DIR = path.join(__dirname, '../../exports')
const LOGS_DIR = path.join(__dirname, '../../logs')
const DRY_RUN = process.argv.includes('--dry-run')

// ── Helpers (duplicated from competitorImport for self-contained use) ─────────

function extractDomain(url) {
    if (!url) return null
    try {
        const u = new URL(url.startsWith('http') ? url : `https://${url}`)
        return u.hostname.replace(/^www\./, '').toLowerCase()
    } catch { return null }
}

function normalizeUrl(url) {
    if (!url) return null
    let u = url.trim()
    if (!u || u === 'N/A' || u === '-') return null
    if (!u.startsWith('http')) u = `https://${u}`
    try { new URL(u); return u.replace(/\/$/, '') } catch { return null }
}

function mapPricing(rawPricing) {
    const p = (rawPricing || '').toLowerCase().trim()
    if (!p || p === 'unknown') return 'Unknown'
    if (p.includes('freemium')) return 'Freemium'
    if (p.includes('free') && (p.includes('paid') || p.includes('premium') || p.includes('+'))) return 'Freemium'
    if (p.includes('free')) return 'Free'
    if (p.includes('trial')) return 'Trial'
    if (p.includes('paid') || p.includes('premium') || p.includes('$')) return 'Paid'
    return 'Unknown'
}

async function buildUniqueSlug(name) {
    const base = slugify(name, { lower: true, strict: true, trim: true })
    if (!base) return `tool-${Date.now().toString(36)}`
    const exists = await Tool.findOne({ slug: base }).select('_id').lean()
    if (!exists) return base
    return `${base}-${Date.now().toString(36)}`
}

async function findExistingTool(name, officialUrl) {
    const domain = extractDomain(officialUrl)
    const conditions = []
    if (name?.trim()) {
        const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        conditions.push({ name: new RegExp(`^${escaped}$`, 'i') })
    }
    if (domain) {
        const escapedDomain = domain.replace(/\./g, '\\.')
        conditions.push({ officialUrl: new RegExp(escapedDomain, 'i') })
    }
    if (!conditions.length) return null
    return Tool.findOne({ $or: conditions }).select('_id name').lean()
}

function detectSource(filename) {
    const f = filename.toLowerCase()
    if (f.includes('futurepedia')) return 'futurepedia'
    if (f.includes('aixploria')) return 'aixploria'
    if (f.includes('taaft') || f.includes('theresanai')) return 'taaft'
    if (f.includes('futuretools')) return 'futuretools'
    return 'unknown'
}

// ── Import one CSV file ───────────────────────────────────────────────────────

async function importCsv(csvPath) {
    const filename = path.basename(csvPath)
    const sourceSite = detectSource(filename)
    const stats = { created: 0, duplicate: 0, skipped: 0, error: 0, total: 0 }

    let records
    try {
        const fileContent = fs.readFileSync(csvPath, 'utf8')
        records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
            relax_column_count: true,
        })
    } catch (err) {
        console.error(`  ❌ Failed to parse ${filename}: ${err.message}`)
        return stats
    }

    stats.total = records.length
    const badDomains = ['futurepedia.io', 'aixploria.com', 'futuretools.io', 'theresanaiforthat.com']

    for (const record of records) {
        const name = (record.name || record.Name || '').trim()
        const officialUrl = normalizeUrl(record.official_url || record.url || record.officialUrl || '')

        if (!name) { stats.skipped++; continue }
        if (!officialUrl) { stats.skipped++; continue }

        const domain = extractDomain(officialUrl)
        if (domain && badDomains.some(b => domain.includes(b))) { stats.skipped++; continue }

        if (DRY_RUN) {
            // Dry run: just count what would happen
            const existing = await findExistingTool(name, officialUrl)
            existing ? stats.duplicate++ : stats.created++
            continue
        }

        try {
            const existing = await findExistingTool(name, officialUrl)
            if (existing) { stats.duplicate++; continue }

            const slug = await buildUniqueSlug(name)
            const dataSourceMap = { futurepedia: 'futurepedia', aixploria: 'manual', taaft: 'manual', futuretools: 'manual', unknown: 'manual' }

            try {
                await Tool.create({
                    name,
                    slug,
                    officialUrl,
                    shortDescription: ((record.short_description || record.description || '').trim().slice(0, 500)) || `${name} — AI tool.`,
                    pricing: mapPricing(record.pricing || record.price),
                    status: 'pending',
                    isActive: false,
                    sourceFoundBy: 'scraper',
                    needsEnrichment: true,
                    dataSource: dataSourceMap[sourceSite] || 'manual',
                })
                stats.created++
            } catch (err) {
                if (err.code === 11000) {
                    // Slug collision retry
                    try {
                        await Tool.create({
                            name, slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`, officialUrl,
                            shortDescription: `${name} — AI tool.`,
                            pricing: mapPricing(record.pricing), status: 'pending', isActive: false,
                            sourceFoundBy: 'scraper', needsEnrichment: true, dataSource: dataSourceMap[sourceSite] || 'manual',
                        })
                        stats.created++
                    } catch { stats.error++ }
                } else {
                    stats.error++
                }
            }
        } catch (err) {
            stats.error++
        }
    }

    return stats
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    if (!process.env.MONGODB_URI) {
        console.error('\n❌ MONGODB_URI not set in .env')
        process.exit(1)
    }

    // Ensure exports directory exists
    if (!fs.existsSync(EXPORTS_DIR)) {
        console.log(`\n⚠️  Exports directory not found: ${EXPORTS_DIR}`)
        console.log('   Run Python crawlers first to generate CSV files.\n')
        process.exit(0)
    }

    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })

    // Find all CSV files in exports/
    const csvFiles = fs.readdirSync(EXPORTS_DIR)
        .filter(f => f.endsWith('.csv'))
        .map(f => path.join(EXPORTS_DIR, f))

    if (csvFiles.length === 0) {
        console.log('\n⚠️  No CSV files found in exports/ directory.')
        console.log('   Run Python crawlers first to generate CSV files.\n')
        process.exit(0)
    }

    console.log('\n╔══════════════════════════════════════════════════════╗')
    console.log('║        IntelliGrid · Master Import Orchestrator      ║')
    if (DRY_RUN) console.log('║                  ⚠️  DRY RUN MODE                    ║')
    console.log('╚══════════════════════════════════════════════════════╝')
    console.log(`\n📂 Found ${csvFiles.length} CSV file(s) in exports/:\n`)
    csvFiles.forEach(f => console.log(`   - ${path.basename(f)}`))

    await mongoose.connect(process.env.MONGODB_URI)
    console.log('\n✅ Connected to MongoDB\n')

    const activeCountBefore = await Tool.countDocuments({ status: 'active', isActive: true })
    const pendingCountBefore = await Tool.countDocuments({ status: 'pending' })
    console.log(`📊 Before import — Active: ${activeCountBefore} | Pending: ${pendingCountBefore}\n`)

    const startTime = Date.now()
    const allStats = { created: 0, duplicate: 0, skipped: 0, error: 0, total: 0 }
    const fileResults = []

    // Process each CSV sequentially
    for (const csvPath of csvFiles) {
        const filename = path.basename(csvPath)
        const source = detectSource(filename)
        console.log(`\n🔄 Importing: ${filename} (source: ${source})`)
        const stats = await importCsv(csvPath)

        Object.keys(allStats).forEach(k => allStats[k] += stats[k])
        fileResults.push({ file: filename, source, ...stats })

        console.log(`   ✅ Created: ${stats.created} | ⏭ Dupes: ${stats.duplicate} | ⏩ Skipped: ${stats.skipped} | ❌ Errors: ${stats.error}`)
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const pendingCountAfter = await Tool.countDocuments({ status: 'pending' })
    const activeCountAfter = await Tool.countDocuments({ status: 'active', isActive: true })

    // Write combined report
    const reportPath = path.join(LOGS_DIR, `importAll-report-${Date.now()}.json`)
    fs.writeFileSync(reportPath, JSON.stringify({
        runAt: new Date().toISOString(),
        dryRun: DRY_RUN,
        files: fileResults,
        totals: allStats,
        safety: {
            activeToolsBefore: activeCountBefore,
            activeToolsAfter: activeCountAfter,
            activeUnchanged: activeCountBefore === activeCountAfter,
            newPendingAdded: pendingCountAfter - pendingCountBefore,
        },
    }, null, 2))

    console.log('\n' + '═'.repeat(56))
    console.log(`✅ IMPORT ALL COMPLETE ${DRY_RUN ? '(DRY RUN)' : ''}`)
    console.log(`   Files processed:      ${csvFiles.length}`)
    console.log(`   Total rows:           ${allStats.total}`)
    console.log(`   ✅ New tools created:  ${allStats.created}`)
    console.log(`   ⏭  Duplicates:        ${allStats.duplicate}`)
    console.log(`   ⏩ Skipped:           ${allStats.skipped}`)
    console.log(`   ❌ Errors:            ${allStats.error}`)
    console.log(`   ⏱  Time elapsed:      ${elapsed}s`)
    console.log(`\n🔒 Safety: Active tools before=${activeCountBefore} after=${activeCountAfter} ${activeCountBefore === activeCountAfter ? '← ✅ unchanged' : '⚠️  CHANGED!'}`)
    console.log(`   New pending added:    ${pendingCountAfter - pendingCountBefore}`)
    console.log(`\n📋 Report: ${reportPath}`)
    console.log('\n💡 Next steps:')
    console.log('   1. node src/scripts/deduplicateTools.js')
    console.log('   2. node src/scripts/bulkEnrich.js')
    console.log('   3. node src/scripts/autoApprove.js   (auto-approve enriched tools)')
    console.log('   4. node src/scripts/reindexAlgolia.js')
    console.log('═'.repeat(56) + '\n')

    await mongoose.disconnect()
    process.exit(0)
}

main().catch(err => {
    console.error('\nFatal error:', err)
    process.exit(1)
})
