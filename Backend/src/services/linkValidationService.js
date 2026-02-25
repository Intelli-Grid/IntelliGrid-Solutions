/**
 * linkValidationService.js — Batch 3B
 *
 * In-process cron service that runs continuously inside the Railway server.
 * Keeps the tool database self-healing without any external job runner.
 *
 * Schedule:
 *   - Every 6 hours: check up to 500 tools not validated in the last 24h
 *   - Every day at 02:00 UTC: hard-delete tools that have been dead for > 7 days
 *     (PURGE_ENABLED env flag must be set to 'true' to enable hard-delete)
 */

import cron from 'node-cron'
import axios from 'axios'
import mongoose from 'mongoose'
import Tool from '../models/Tool.js'
import { syncToolToAlgolia, deleteToolFromAlgolia } from '../config/algolia.js'

// ── Config ────────────────────────────────────────────────────────────────────
const CONCURRENCY = 15   // concurrent HTTP requests (lower than script to not spike Railway CPU)
const TIMEOUT_MS = 8000
const MAX_REDIRECTS = 5
const BATCH_SIZE = 500  // tools checked per run
const STALE_WINDOW_MS = 24 * 60 * 60 * 1000       // 24 hours
const DEAD_TTL_MS = 7 * 24 * 60 * 60 * 1000  // 7 days before hard-delete

// ── Minimal concurrency limiter (no external deps) ────────────────────────────
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

// ── URL checker ───────────────────────────────────────────────────────────────
async function checkUrl(url) {
    const normalised = /^https?:\/\//i.test(url) ? url : `https://${url}`
    const opts = {
        timeout: TIMEOUT_MS,
        maxRedirects: MAX_REDIRECTS,
        validateStatus: s => s < 500,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IntelliGridBot/1.0; +https://intelligrid.online)' },
    }

    try {
        const res = await axios.head(normalised, opts)
        const finalUrl = res.request?.res?.responseUrl || normalised
        const redirected = finalUrl !== normalised
        return { alive: res.status < 400, status: res.status, finalUrl, redirected }
    } catch {
        // HEAD blocked — fallback to GET stream
        try {
            const res = await axios.get(normalised, { ...opts, responseType: 'stream' })
            res.data?.destroy?.()
            const finalUrl = res.request?.res?.responseUrl || normalised
            const redirected = finalUrl !== normalised
            return { alive: res.status < 400, status: res.status, finalUrl, redirected }
        } catch (err2) {
            return { alive: false, status: err2.response?.status || 0, finalUrl: normalised, redirected: false }
        }
    }
}

// ── Core validation run ───────────────────────────────────────────────────────
async function runValidationBatch() {
    // Only run when DB is connected
    if (mongoose.connection.readyState !== 1) {
        console.warn('⚠️  [LinkValidator] DB not connected — skipping run')
        return
    }

    const cutoff = new Date(Date.now() - STALE_WINDOW_MS)

    const tools = await Tool.find({
        status: 'active',
        isActive: { $ne: false },
        $or: [
            { lastLinkCheck: { $exists: false } },
            { lastLinkCheck: null },
            { lastLinkCheck: { $lt: cutoff } },
        ],
    })
        .select('_id name officialUrl linkStatus')
        .limit(BATCH_SIZE)
        .lean()

    if (tools.length === 0) {
        console.log('✅ [LinkValidator] All tools checked recently — nothing to do')
        return
    }

    console.log(`🔗 [LinkValidator] Checking ${tools.length} stale tool URLs...`)

    const limit = pLimit(CONCURRENCY)
    const results = []

    await Promise.all(
        tools.map(tool =>
            limit(async () => {
                const result = await checkUrl(tool.officialUrl || '')
                results.push({ tool, result })
            })
        )
    )

    const now = new Date()
    const live = results.filter(r => r.result.alive && !r.result.redirected)
    const redirected = results.filter(r => r.result.alive && r.result.redirected)
    const dead = results.filter(r => !r.result.alive)

    // 1. Bulk-mark live
    if (live.length > 0) {
        await Tool.updateMany(
            { _id: { $in: live.map(r => r.tool._id) } },
            { $set: { linkStatus: 'live', lastLinkCheck: now } }
        )
    }

    // 2. Update redirected one-by-one (different finalUrl per tool)
    for (const { tool, result } of redirected) {
        await Tool.updateOne(
            { _id: tool._id },
            { $set: { officialUrl: result.finalUrl, linkStatus: 'redirected', lastLinkCheck: now } }
        )
        // Re-sync to Algolia with corrected URL (non-blocking)
        Tool.findById(tool._id).lean()
            .then(t => t && syncToolToAlgolia(t))
            .catch(err => console.error('[LinkValidator] Algolia re-sync error:', err))
    }

    // 3. Soft-delete dead tools
    if (dead.length > 0) {
        const deadIds = dead.map(r => r.tool._id)
        await Tool.updateMany(
            { _id: { $in: deadIds } },
            { $set: { linkStatus: 'dead', isActive: false, lastLinkCheck: now } }
        )
        // Remove dead tools from Algolia index immediately so they stop appearing in search
        await Promise.all(deadIds.map(id => deleteToolFromAlgolia(id.toString()).catch(() => { })))
    }

    console.log(
        `✅ [LinkValidator] Done — live:${live.length} redirected:${redirected.length} dead:${dead.length} ` +
        `| health: ${(((live.length + redirected.length) / tools.length) * 100).toFixed(1)}%`
    )
}

// ── Purge dead tools (hard-delete, only if PURGE_ENABLED=true) ────────────────
async function runPurge() {
    if (process.env.LINK_PURGE_ENABLED !== 'true') {
        console.log('ℹ️  [LinkPurge] LINK_PURGE_ENABLED not set — skipping hard-delete')
        return
    }

    if (mongoose.connection.readyState !== 1) return

    const cutoff = new Date(Date.now() - DEAD_TTL_MS)

    // Only hard-delete tools that have been continuously dead for > 7 days
    const deadTools = await Tool.find({
        linkStatus: 'dead',
        isActive: false,
        lastLinkCheck: { $lt: cutoff },
    })
        .select('_id name')
        .lean()

    if (deadTools.length === 0) {
        console.log('✅ [LinkPurge] No tools eligible for hard-delete')
        return
    }

    console.log(`🗑️  [LinkPurge] Hard-deleting ${deadTools.length} tools dead > 7 days...`)

    const ids = deadTools.map(t => t._id)

    // Cascade: remove Favorties + Reviews via model hooks by deleting one-by-one
    // (findOneAndDelete triggers cascade hooks; deleteMany does not)
    const deleted = []
    for (const tool of deadTools) {
        try {
            await Tool.findOneAndDelete({ _id: tool._id })
            deleted.push(tool._id)
        } catch (err) {
            console.error(`[LinkPurge] Failed to delete tool ${tool._id}:`, err.message)
        }
    }

    // Clean up Algolia (already removed on soft-delete, this is a safety net)
    await Promise.all(deleted.map(id => deleteToolFromAlgolia(id.toString()).catch(() => { })))

    console.log(`✅ [LinkPurge] Hard-deleted ${deleted.length} tools`)
}

// ── Service class ─────────────────────────────────────────────────────────────
class LinkValidationService {
    /**
     * Returns current link health statistics from the DB.
     * Used by the admin dashboard endpoint.
     */
    async getStats() {
        const [live, dead, redirected, unknown, total] = await Promise.all([
            Tool.countDocuments({ status: 'active', linkStatus: 'live' }),
            Tool.countDocuments({ linkStatus: 'dead' }),
            Tool.countDocuments({ status: 'active', linkStatus: 'redirected' }),
            Tool.countDocuments({ status: 'active', linkStatus: 'unknown' }),
            Tool.countDocuments({ status: 'active' }),
        ])

        const pendingPurge = await Tool.countDocuments({
            linkStatus: 'dead',
            isActive: false,
            lastLinkCheck: { $lt: new Date(Date.now() - DEAD_TTL_MS) },
        })

        return {
            total,
            live,
            dead,
            redirected,
            unknown,
            pendingPurge,
            healthRate: total > 0 ? (((live + redirected) / total) * 100).toFixed(1) + '%' : 'N/A',
            purgeEnabled: process.env.LINK_PURGE_ENABLED === 'true',
        }
    }

    /**
     * Start both cron jobs.
     */
    startScheduler() {
        console.log('🔗 Link Validation Scheduler initialised')

        // Run once on startup after DB settles (30s delay)
        setTimeout(() => {
            runValidationBatch().catch(err =>
                console.error('[LinkValidator] Startup run error:', err)
            )
        }, 30000)

        // Every 6 hours — check stale tools
        cron.schedule('0 */6 * * *', async () => {
            console.log('⏰ [CRON] Link validation batch starting...')
            await runValidationBatch().catch(err =>
                console.error('[LinkValidator] Cron error:', err)
            )
        }, { timezone: 'UTC' })

        // Daily at 02:00 UTC — hard-delete tools dead > 7 days (gated by env flag)
        cron.schedule('0 2 * * *', async () => {
            console.log('⏰ [CRON] Dead tool purge starting...')
            await runPurge().catch(err =>
                console.error('[LinkPurge] Cron error:', err)
            )
        }, { timezone: 'UTC' })
    }
}

export default new LinkValidationService()
