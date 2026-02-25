/**
 * validateLinks.js — Batch 1D
 *
 * SAFE: never hard-deletes anything.
 * Dead tools are marked isActive:false + linkStatus:'dead'.
 * Live tools are marked linkStatus:'live' + lastLinkCheck updated.
 * Redirected tools have their officialUrl updated to the final URL.
 *
 * Usage:
 *   node scripts/validateLinks.js              # check all un-checked tools
 *   node scripts/validateLinks.js --all        # re-check every active tool
 *   node scripts/validateLinks.js --limit 500  # cap batch size
 *
 * Output:
 *   Console summary + link-audit-YYYY-MM-DD.csv in scripts/
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

import mongoose from 'mongoose'
import axios from 'axios'

const { default: connectDB } = await import('../src/config/database.js')
const { default: Tool } = await import('../src/models/Tool.js')

// ── Config ────────────────────────────────────────────────────────────────────
const CONCURRENCY = 20    // concurrent HTTP requests
const TIMEOUT_MS = 8000  // per-request timeout
const MAX_REDIRECTS = 5
const ARGS = process.argv.slice(2)
const FORCE_ALL = ARGS.includes('--all')
const LIMIT_ARG = ARGS.indexOf('--limit')
const BATCH_LIMIT = LIMIT_ARG !== -1 ? parseInt(ARGS[LIMIT_ARG + 1], 10) : 0

// ── URL checker ───────────────────────────────────────────────────────────────
/**
 * Checks a URL.
 * Returns { alive, status, finalUrl, redirected }
 */
async function checkUrl(url) {
    // Normalise: add https if missing
    const normalised = /^https?:\/\//i.test(url) ? url : `https://${url}`

    try {
        const res = await axios.head(normalised, {
            timeout: TIMEOUT_MS,
            maxRedirects: MAX_REDIRECTS,
            validateStatus: s => s < 500, // accept 4xx (alive but access-restricted), reject 5xx
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; IntelliGridBot/1.0; +https://intelligrid.online)',
            },
        })

        const finalUrl = res.request?.res?.responseUrl || res.config?.url || normalised
        const redirected = finalUrl !== normalised
        const alive = res.status < 400

        return { alive, status: res.status, finalUrl: redirected ? finalUrl : normalised, redirected }
    } catch (err) {
        // Some servers block HEAD but allow GET — fallback
        try {
            const res = await axios.get(normalised, {
                timeout: TIMEOUT_MS,
                maxRedirects: MAX_REDIRECTS,
                validateStatus: s => s < 500,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; IntelliGridBot/1.0; +https://intelligrid.online)',
                },
                responseType: 'stream', // don't download body
            })
            res.data?.destroy?.() // abort stream immediately
            const finalUrl = res.request?.res?.responseUrl || normalised
            const redirected = finalUrl !== normalised
            return { alive: res.status < 400, status: res.status, finalUrl, redirected }
        } catch (err2) {
            return {
                alive: false,
                status: err2.response?.status || 0,
                finalUrl: normalised,
                redirected: false,
                error: err2.message,
            }
        }
    }
}

// ── Concurrency limiter ────────────────────────────────────────────────────────
function pLimit(concurrency) {
    let running = 0
    const queue = []
    function next() {
        if (running >= concurrency || queue.length === 0) return
        running++
        const { fn, resolve, reject } = queue.shift()
        fn().then(resolve, reject).finally(() => { running--; next() })
    }
    return fn => new Promise((resolve, reject) => {
        queue.push({ fn, resolve, reject })
        next()
    })
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  IntelliGrid — Link Validation Script  (Batch 1D)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    await connectDB()

    // Build query
    const query = { status: 'active', isActive: { $ne: false } }

    if (!FORCE_ALL) {
        // Only check tools never checked or checked > 24h ago
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
        query.$or = [
            { lastLinkCheck: { $exists: false } },
            { lastLinkCheck: null },
            { lastLinkCheck: { $lt: cutoff } },
        ]
    }

    let toolQuery = Tool.find(query).select('_id name officialUrl linkStatus').lean()
    if (BATCH_LIMIT > 0) toolQuery = toolQuery.limit(BATCH_LIMIT)

    const tools = await toolQuery
    console.log(`📦 Tools to check: ${tools.length}${FORCE_ALL ? ' (forced re-check)' : ''}`)
    console.log(`⚡ Concurrency: ${CONCURRENCY} parallel requests\n`)

    if (tools.length === 0) {
        console.log('✅ All tools checked recently. Nothing to do.\n')
        process.exit(0)
    }

    // ── Run checks ──────────────────────────────────────────────────────────
    const limit = pLimit(CONCURRENCY)
    const results = []
    let done = 0

    await Promise.all(
        tools.map(tool =>
            limit(async () => {
                const url = tool.officialUrl || ''
                const result = await checkUrl(url)
                results.push({ tool, result })
                done++
                if (done % 100 === 0 || done === tools.length) {
                    process.stdout.write(`\r   Progress: ${done}/${tools.length}`)
                }
            })
        )
    )
    console.log('\n')

    // ── Categorise results ───────────────────────────────────────────────────
    const live = results.filter(r => r.result.alive && !r.result.redirected)
    const redirected = results.filter(r => r.result.alive && r.result.redirected)
    const dead = results.filter(r => !r.result.alive)

    console.log('━━━━━━ Results ━━━━━━')
    console.log(`✅ Live:        ${live.length}`)
    console.log(`↩️  Redirected:  ${redirected.length}`)
    console.log(`❌ Dead:        ${dead.length}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━\n')

    // ── Write DB updates in parallel batches ─────────────────────────────────
    const now = new Date()

    // 1. Mark live
    if (live.length > 0) {
        const ids = live.map(r => r.tool._id)
        await Tool.updateMany(
            { _id: { $in: ids } },
            { $set: { linkStatus: 'live', lastLinkCheck: now } }
        )
        console.log(`✅ Marked ${ids.length} tools as LIVE`)
    }

    // 2. Update redirected — fix URL + mark live
    for (const { tool, result } of redirected) {
        await Tool.updateOne(
            { _id: tool._id },
            {
                $set: {
                    officialUrl: result.finalUrl,
                    linkStatus: 'redirected',
                    lastLinkCheck: now,
                }
            }
        )
    }
    if (redirected.length > 0) {
        console.log(`↩️  Updated ${redirected.length} tools with new redirected URLs`)
    }

    // 3. Soft-delete dead tools (NEVER hard-delete here)
    if (dead.length > 0) {
        const ids = dead.map(r => r.tool._id)
        await Tool.updateMany(
            { _id: { $in: ids } },
            {
                $set: {
                    linkStatus: 'dead',
                    isActive: false,       // hidden from all public queries
                    lastLinkCheck: now,
                }
            }
        )
        console.log(`❌ Soft-deleted ${ids.length} dead tools (isActive=false, NOT hard-deleted)`)
        console.log('   ⚠️  Wait 7+ days before running purgeDead.js to hard-delete these.\n')
    }

    // ── Write CSV report ─────────────────────────────────────────────────────
    const date = now.toISOString().split('T')[0]
    const csvPath = path.join(__dirname, `link-audit-${date}.csv`)
    const header = 'name,originalUrl,finalUrl,status,alive,redirected,error'
    const rows = results.map(({ tool, result }) =>
        [
            `"${tool.name?.replace(/"/g, '""')}"`,
            `"${tool.officialUrl}"`,
            `"${result.finalUrl}"`,
            result.status,
            result.alive,
            result.redirected,
            `"${result.error || ''}"`,
        ].join(',')
    )
    fs.writeFileSync(csvPath, [header, ...rows].join('\n'), 'utf8')
    console.log(`📄 CSV report written: ${csvPath}`)

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`   Link Health Rate: ${((live.length + redirected.length) / tools.length * 100).toFixed(1)}%`)
    console.log(`   Total checked:    ${tools.length}`)
    console.log(`   Completed at:     ${now.toISOString()}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    await mongoose.disconnect()
    process.exit(0)
}

main().catch(err => {
    console.error('❌ Fatal error:', err)
    process.exit(1)
})
