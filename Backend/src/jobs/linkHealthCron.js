/**
 * linkHealthCron.js — Phase 6 + War Room Group 6 Enhancement
 *
 * Runs every Sunday at 04:00 UTC (weekly off-peak crawl).
 * Checks that each tool's officialUrl still returns a 2xx/3xx.
 * Marks broken tools so admins can review + fix, and demotes
 * their trendingScore to stop broken tools surfacing in search.
 *
 * War Room Enhancement:
 * - Tracks consecutive failure count (offlineChecks)
 * - After 3+ consecutive failures, queues a 'mark_tool_offline' PendingAction
 *   and broadcasts to the War Room SSE stream
 * - On recovery (was dead → now live), logs recovery and resets streak
 *
 * Batch size: 50 concurrent HEAD requests per cycle.
 * Max 2 retries per URL before marking as broken.
 *
 * Fields written back to Tool:
 *   linkStatus: 'live' | 'dead' | 'unknown'
 *   lastLinkCheck: Date
 *   offlineChecks: Number (consecutive failures)
 *   offlineSince: Date | null (first failure in current streak)
 */
import cron from 'node-cron'
import Tool from '../models/Tool.js'

const BATCH_SIZE = 50
const TIMEOUT_MS = 8000
const MAX_RETRIES = 2
const OFFLINE_THRESHOLD = 3  // Queue PendingAction after this many consecutive failures
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
            await new Promise(r => setTimeout(r, 1500))
            return checkUrl(url, retries + 1)
        }
        return { ok: false, status: null }
    }
}

async function runLinkHealthCheck() {
    const runStart = Date.now()
    console.log('[LinkHealth] ▶ Starting weekly link health check...')

    // Lazy-import War Room services — these may not be needed on every run
    let agentLog, queueForApproval
    try {
        const orchestrator = await import('../services/agentOrchestrator.js')
        agentLog = orchestrator.agentLog
        queueForApproval = orchestrator.queueForApproval
    } catch (_) {
        // War Room not available — degrade gracefully
        agentLog = async () => {}
        queueForApproval = async () => {}
    }

    try {
        // Fetch tools including their current streak data
        const tools = await Tool.find({
            status: 'active',
            officialUrl: { $exists: true, $ne: '' },
        })
            .select('_id name slug officialUrl linkStatus trendingScore offlineChecks offlineSince')
            .lean()

        console.log(`[LinkHealth] Found ${tools.length} tools to check`)

        let checkedCount = 0
        let brokenCount = 0
        let recoveredCount = 0
        let offlineQueued = 0

        // Process in batches to avoid overwhelming Node's event loop
        for (let i = 0; i < tools.length; i += BATCH_SIZE) {
            const batch = tools.slice(i, i + BATCH_SIZE)

            const results = await Promise.allSettled(
                batch.map(tool => checkUrl(tool.officialUrl))
            )

            const bulkOps = []
            const pendingActions = []

            for (let j = 0; j < batch.length; j++) {
                const tool = batch[j]
                const result = results[j]
                const { ok, status } = result.status === 'fulfilled'
                    ? result.value
                    : { ok: false, status: null }

                checkedCount++
                if (!ok) brokenCount++

                const wasDeadBefore = tool.linkStatus === 'dead'

                // Track recovery: previously broken, now ok
                if (ok && wasDeadBefore) {
                    recoveredCount++
                    console.log(`[LinkHealth] ✅ Recovered: ${tool.name} (${tool.slug})`)
                    // Log recovery to War Room
                    agentLog(
                        'uptime',
                        `✅ Tool recovered: ${tool.name} is back online`,
                        'success',
                        { toolId: tool._id.toString(), slug: tool.slug }
                    ).catch(() => {})
                }

                // Build set fields for the update
                const setFields = {
                    linkStatus: ok ? 'live' : 'dead',
                    lastLinkCheck: new Date(),
                }

                if (ok) {
                    // Reset streak on recovery
                    setFields.offlineChecks = 0
                    setFields.offlineSince = null
                } else {
                    // Increment consecutive failure count
                    const newCount = (tool.offlineChecks || 0) + 1
                    setFields.offlineChecks = newCount

                    if (!tool.offlineSince) {
                        setFields.offlineSince = new Date()
                    }

                    // After OFFLINE_THRESHOLD consecutive failures — queue for admin review
                    if (newCount === OFFLINE_THRESHOLD) {
                        pendingActions.push(tool)
                    }

                    // If broken: reduce trendingScore by 20% to deprioritise in search
                    if ((tool.trendingScore || 0) > 0) {
                        setFields.trendingScore = Math.floor((tool.trendingScore || 0) * 0.8)
                    }
                }

                const updateDoc = { $set: setFields }
                // Store HTTP error code in dataQualityFlags for admin review
                if (!ok && status) {
                    updateDoc.$addToSet = { dataQualityFlags: `http_${status}` }
                }

                bulkOps.push({
                    updateOne: {
                        filter: { _id: tool._id },
                        update: updateDoc,
                    },
                })
            }

            if (bulkOps.length > 0) {
                await Tool.bulkWrite(bulkOps, { ordered: false })
            }

            // Queue PendingActions for tools that hit the threshold
            for (const tool of pendingActions) {
                try {
                    await queueForApproval({
                        agentName: 'uptime',
                        actionType: 'mark_tool_offline',
                        title: `Mark offline: ${tool.name}`,
                        description: `${tool.name} has failed ${OFFLINE_THRESHOLD} consecutive link health checks. Its URL (${tool.officialUrl}) is not responding. Approve to mark as offline in the directory.`,
                        payload: {
                            toolId: tool._id.toString(),
                            toolName: tool.name,
                            toolSlug: tool.slug,
                            officialUrl: tool.officialUrl,
                            consecutiveFailures: OFFLINE_THRESHOLD,
                        },
                    })
                    offlineQueued++
                    console.log(`[LinkHealth] ⚠️  Queued offline action for: ${tool.name}`)
                } catch (err) {
                    console.error(`[LinkHealth] Failed to queue offline action for ${tool.name}:`, err.message)
                }
            }

            // Log progress every 5 batches
            if (Math.floor(i / BATCH_SIZE) % 5 === 0) {
                console.log(`[LinkHealth]   Checked ${checkedCount}/${tools.length} — ${brokenCount} broken so far`)
            }

            // Throttle: 200 ms gap between batches
            await new Promise(r => setTimeout(r, 200))
        }

        const elapsed = Math.round((Date.now() - runStart) / 1000)
        console.log(`[LinkHealth] ✅ Complete in ${elapsed}s — ${checkedCount} checked, ${brokenCount} broken, ${recoveredCount} recovered, ${offlineQueued} queued for admin review`)

        // Log final summary to War Room
        await agentLog(
            'uptime',
            `Link health check complete: ${checkedCount} checked, ${brokenCount} broken, ${recoveredCount} recovered${offlineQueued > 0 ? `, ${offlineQueued} queued for review` : ''}`,
            brokenCount > 0 ? 'warning' : 'success',
            { checkedCount, brokenCount, recoveredCount, offlineQueued, durationSeconds: elapsed }
        )

        // Log a sample of broken tools
        if (brokenCount > 0) {
            const brokenTools = await Tool.find({ linkStatus: 'dead', status: 'active' })
                .select('name slug officialUrl lastLinkCheck offlineChecks')
                .limit(10)
                .lean()
            console.log('[LinkHealth] ⚠️  Sample broken tools:')
            brokenTools.forEach(t => {
                console.log(`   • ${t.name} (${t.slug}) — ${t.officialUrl} [${t.offlineChecks} consecutive failures]`)
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
