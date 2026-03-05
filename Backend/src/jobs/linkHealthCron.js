/**
 * linkHealthCron.js — Phase 6
 *
 * Runs every Sunday at 04:00 UTC (weekly off-peak crawl).
 * Checks that each tool's officialUrl still returns a 2xx/3xx.
 * Marks broken tools so admins can review + fix, and demotes
 * their trendingScore to stop broken tools surfacing in search.
 *
 * Batch size: 50 concurrent HEAD requests per cycle.
 * Max 2 retries per URL before marking as broken.
 *
 * Fields written back to Tool:
 *   linkHealth: 'ok' | 'broken' | 'unchecked'
 *   linkHealthCheckedAt: Date
 *   linkHealthStatusCode: Number | null
 */
import cron from 'node-cron'
import Tool from '../models/Tool.js'

const BATCH_SIZE = 50
const TIMEOUT_MS = 8000
const MAX_RETRIES = 2
const USER_AGENT = 'IntelliGridBot/1.0 (+https://www.intelligrid.online/bot)'

/**
 * HEAD request with fallback to GET if HEAD is blocked (405).
 * Returns { ok: boolean, status: number | null }
 */
async function checkUrl(url, retries = 0) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
        const res = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal,
            headers: { 'User-Agent': USER_AGENT },
        })
        clearTimeout(timer)

        // 405 Method Not Allowed — retry with GET
        if (res.status === 405 && retries < MAX_RETRIES) {
            return checkUrl(url, retries + 1)
        }

        // 2xx or 3xx = healthy
        const ok = res.status < 400
        return { ok, status: res.status }
    } catch (err) {
        clearTimeout(timer)
        if (retries < MAX_RETRIES) {
            // Brief wait before retry
            await new Promise(r => setTimeout(r, 1500))
            return checkUrl(url, retries + 1)
        }
        return { ok: false, status: null }
    }
}

async function runLinkHealthCheck() {
    const runStart = Date.now()
    console.log('[LinkHealth] ▶ Starting weekly link health check...')

    try {
        // Only check tools with a known URL (skip if no officialUrl)
        const tools = await Tool.find({
            status: 'active',
            officialUrl: { $exists: true, $ne: '' },
        })
            .select('_id name slug officialUrl linkStatus trendingScore')
            .lean()

        console.log(`[LinkHealth] Found ${tools.length} tools to check`)

        let checkedCount = 0
        let brokenCount = 0
        let recoveredCount = 0

        // Process in batches to avoid overwhelming Node's event loop
        for (let i = 0; i < tools.length; i += BATCH_SIZE) {
            const batch = tools.slice(i, i + BATCH_SIZE)

            const results = await Promise.allSettled(
                batch.map(tool => checkUrl(tool.officialUrl))
            )

            // Bulk write back results
            const bulkOps = batch.map((tool, j) => {
                const result = results[j]
                const { ok, status } = result.status === 'fulfilled'
                    ? result.value
                    : { ok: false, status: null }

                checkedCount++
                if (!ok) brokenCount++

                // Track recovery: previously broken, now ok
                if (ok && tool.linkStatus === 'dead') recoveredCount++

                // If broken: reduce trendingScore by 20% to deprioritise in search
                const setFields = {
                    linkStatus: ok ? 'live' : 'dead',
                    lastLinkCheck: new Date(),
                }
                if (!ok && (tool.trendingScore || 0) > 0) {
                    setFields.trendingScore = Math.floor((tool.trendingScore || 0) * 0.8)
                }

                const updateDoc = { $set: setFields }
                // Store HTTP error code in dataQualityFlags for admin review
                if (!ok && status) {
                    updateDoc.$addToSet = { dataQualityFlags: `http_${status}` }
                }

                return {
                    updateOne: {
                        filter: { _id: tool._id },
                        update: updateDoc,
                    },
                }
            })

            await Tool.bulkWrite(bulkOps, { ordered: false })

            // Log progress every 5 batches
            if (Math.floor(i / BATCH_SIZE) % 5 === 0) {
                console.log(`[LinkHealth]   Checked ${checkedCount}/${tools.length} — ${brokenCount} broken so far`)
            }

            // Throttle: 200 ms gap between batches
            await new Promise(r => setTimeout(r, 200))
        }

        const elapsed = Math.round((Date.now() - runStart) / 1000)
        console.log(`[LinkHealth] ✅ Complete in ${elapsed}s — ${checkedCount} checked, ${brokenCount} broken, ${recoveredCount} recovered`)

        // Log a summary so admins can spot issues in Railway logs
        if (brokenCount > 0) {
            const brokenTools = await Tool.find({ linkStatus: 'dead', status: 'active' })
            .select('name slug officialUrl lastLinkCheck')
            .limit(10)
            .lean()
            console.log('[LinkHealth] ⚠️  Sample broken tools:')
            brokenTools.forEach(t => {
            console.log(`   • ${t.name} (${t.slug}) — ${t.officialUrl}`)
            })
        }
    } catch (err) {
        console.error('[LinkHealth] ❌ Error during link health check:', err.message)
    }
}

// ── Schedule ──────────────────────────────────────────────────────────────────
// Every Sunday at 04:00 UTC
cron.schedule('0 4 * * 0', () => {
    runLinkHealthCheck().catch(err =>
        console.error('[LinkHealth] Unhandled cron error:', err.message)
    )
}, { timezone: 'UTC' })

console.log('[LinkHealth] ⏰ Link health cron scheduled — every Sunday 04:00 UTC')

export default runLinkHealthCheck
