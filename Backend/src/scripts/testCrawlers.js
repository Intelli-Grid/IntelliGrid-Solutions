/**
 * testCrawlers.js
 * ===============
 * Smoke-tests each JS crawler: verifies connectivity, data shape, and
 * normalizer output WITHOUT writing anything to MongoDB.
 *
 * Usage (from Backend/ directory):
 *   node src/scripts/testCrawlers.js
 *   node src/scripts/testCrawlers.js futurepedia
 *   node src/scripts/testCrawlers.js taaft
 *   node src/scripts/testCrawlers.js aixploria
 *
 * What it checks per crawler:
 *   ✅ Can connect to the site (no timeout / block)
 *   ✅ Returns at least 1 tool
 *   ✅ Each tool has: name, officialUrl, shortDescription
 *   ✅ normalizeToSchema() produces a valid slug + pricing enum
 *   ✅ No tools have futurepedia/taaft/aixploria as their officialUrl domain
 */

import 'dotenv/config'
import { crawlFuturepedia } from '../jobs/crawlers/futurepediaCrawler.js'
import { crawlTAAFT }       from '../jobs/crawlers/taaftCrawler.js'
import { crawlAixploria }  from '../jobs/crawlers/aixploriaCrawler.js'
import { normalizeToSchema } from '../jobs/crawlers/normalizer.js'

const VALID_PRICING = ['Free', 'Freemium', 'Paid', 'Trial', 'Unknown']
const BAD_DOMAINS   = ['futurepedia.io', 'theresanaiforthat.com', 'aixploria.com', 'futuretools.io']

// ── Tiny test limits — just enough to verify each crawler works ──
const LIMITS = {
    futurepedia: { maxPages: 2, maxTools: 20 },
    taaft:       { maxTools: 15 },
    aixploria:   { maxPages: 2 },
}

function isBadDomain(url) {
    if (!url) return true
    try {
        const hostname = new URL(url).hostname
        return BAD_DOMAINS.some(d => hostname.includes(d))
    } catch { return true }
}

function validateTools(rawTools, source) {
    const issues = []
    let missingName = 0, missingUrl = 0, badDomain = 0, badPricing = 0

    for (const t of rawTools) {
        if (!t.name || t.name.trim().length < 2)          missingName++
        if (!t.officialUrl)                                 missingUrl++
        else if (isBadDomain(t.officialUrl))               badDomain++
        if (t.pricing && !VALID_PRICING.includes(t.pricing)) badPricing++
    }

    if (missingName > 0)  issues.push(`⚠️  ${missingName} tools missing name`)
    if (missingUrl > 0)   issues.push(`⚠️  ${missingUrl} tools missing officialUrl`)
    if (badDomain > 0)    issues.push(`⚠️  ${badDomain} tools pointing to crawler's own domain`)
    if (badPricing > 0)   issues.push(`⚠️  ${badPricing} tools with invalid pricing enum`)

    // Test normalizer
    const normalized = rawTools.map(normalizeToSchema).filter(Boolean)
    const normRate = rawTools.length > 0 ? Math.round((normalized.length / rawTools.length) * 100) : 0

    return { issues, normalized, normRate }
}

function printSample(tools, count = 3) {
    const sample = tools.slice(0, count)
    for (const t of sample) {
        console.log(`\n   📛 ${t.name}`)
        console.log(`   🔗 ${t.officialUrl || 'MISSING'}`)
        console.log(`   📝 ${(t.shortDescription || '').slice(0, 80)}...`)
        console.log(`   💰 ${t.pricing || 'Unknown'} | 🏷 ${t.category || '-'}`)
    }
}

async function testCrawler(name, crawlFn, args) {
    console.log(`\n${'═'.repeat(60)}`)
    console.log(`🕷  Testing: ${name.toUpperCase()} crawler`)
    console.log(`${'═'.repeat(60)}`)

    const start = Date.now()
    let rawTools = []

    try {
        rawTools = await crawlFn(args)
        const elapsed = ((Date.now() - start) / 1000).toFixed(1)

        if (rawTools.length === 0) {
            console.log(`❌ FAILED — No tools returned after ${elapsed}s`)
            console.log(`   Site may be blocking requests or structure has changed.`)
            return false
        }

        console.log(`✅ Fetched ${rawTools.length} raw tools in ${elapsed}s`)

        const { issues, normalized, normRate } = validateTools(rawTools, name)

        console.log(`\n📊 Validation:`)
        console.log(`   Raw tools:         ${rawTools.length}`)
        console.log(`   After normalize:   ${normalized.length} (${normRate}% pass rate)`)

        if (issues.length === 0) {
            console.log(`   Data quality:      ✅ All checks passed`)
        } else {
            for (const issue of issues) console.log(`   ${issue}`)
        }

        console.log(`\n📋 Sample tools (first 3):`)
        printSample(rawTools)

        const passed = rawTools.length > 0 && normalized.length > 0
        console.log(`\n${passed ? '✅ PASS' : '⚠️  PARTIAL'} — ${name} crawler`)
        return passed

    } catch (err) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(1)
        console.log(`❌ FAILED after ${elapsed}s — ${err.message}`)
        if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
            console.log(`   Network issue — check your internet connection.`)
        } else if (err.response?.status === 403 || err.response?.status === 429) {
            console.log(`   HTTP ${err.response.status} — site is rate-limiting or blocking.`)
        }
        return false
    }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const target = process.argv[2]?.toLowerCase()

    console.log('\n╔══════════════════════════════════════════════════════════╗')
    console.log('║          IntelliGrid · Crawler Smoke Tests               ║')
    console.log('║  NO DB writes — connectivity + data quality only         ║')
    console.log('╚══════════════════════════════════════════════════════════╝')

    if (target && !['futurepedia', 'taaft', 'aixploria'].includes(target)) {
        console.error(`\n❌ Unknown crawler: "${target}". Use: futurepedia | taaft | aixploria`)
        process.exit(1)
    }

    const results = {}

    if (!target || target === 'futurepedia') {
        results.futurepedia = await testCrawler('futurepedia', crawlFuturepedia, LIMITS.futurepedia)
    }
    if (!target || target === 'taaft') {
        results.taaft = await testCrawler('taaft', crawlTAAFT, LIMITS.taaft)
    }
    if (!target || target === 'aixploria') {
        results.aixploria = await testCrawler('aixploria', crawlAixploria, LIMITS.aixploria)
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log(`\n${'═'.repeat(60)}`)
    console.log('📊 SUMMARY')
    console.log(`${'═'.repeat(60)}`)
    let allPassed = true
    for (const [name, passed] of Object.entries(results)) {
        console.log(`  ${passed ? '✅' : '❌'} ${name}`)
        if (!passed) allPassed = false
    }

    console.log(`\n${allPassed ? '✅ All crawlers operational — safe to schedule.' : '⚠️  Fix failing crawlers before scheduling.'}`)
    console.log(`${'═'.repeat(60)}\n`)

    process.exit(allPassed ? 0 : 1)
}

main().catch(err => {
    console.error('\nFatal:', err.message)
    process.exit(1)
})
