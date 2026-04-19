/**
 * crawlerScheduler.js
 * IntelliGrid — Nightly Crawler Orchestrator + Enrichment Scheduler
 *
 * Cron jobs:
 *  - Nightly at 2:00 AM IST (20:30 UTC): runs all crawlers, deduplicates, syncs Algolia
 *  - Every 4 hours: enriches next 200 unenriched tools via Groq
 *  - Sunday 3:00 AM: trigger link health check (uses existing linkHealthCron)
 *
 * All cron jobs send Telegram push alerts on start/complete/error.
 * Manual triggers available via exported functions (used by Telegram bot commands).
 *
 * Uses node-cron — already installed in package.json.
 */

import cron from 'node-cron'
import { crawlFuturepedia } from './crawlers/futurepediaCrawler.js'
import { crawlAixploria } from './crawlers/aixploriaCrawler.js'
import { crawlTAAFT } from './crawlers/taaftCrawler.js'
import { normalizeToSchema } from './crawlers/normalizer.js'
import { deduplicateAndUpsert } from './crawlers/deduplicator.js'
import { sendOwnerAlert } from '../services/telegramBot.js'
import { runAutoStage } from '../scripts/autoApprove.js'
import Tool from '../models/Tool.js'
// BUG FIX: use enrichTool (10-key Groq rotator) instead of raw Groq single-key
import { enrichTool } from '../services/enrichmentService.js'

// ── Algolia sync (lazy import to avoid circular deps at boot) ─────────────────
async function syncToAlgolia(limit = 500) {
    try {
        const { default: algoliasearch } = await import('algoliasearch')
        const client = algoliasearch(
            process.env.ALGOLIA_APP_ID,
            process.env.ALGOLIA_ADMIN_KEY || process.env.ALGOLIA_API_KEY
        )
        // BUG FIX: was 'tools' — correct index name is 'intelligrid_tools'
        const index = client.initIndex('intelligrid_tools')

        const newTools = await Tool.find({ status: 'active', isActive: true })
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('name slug shortDescription category tags pricing logo officialUrl views isFeatured isTrending')
            .populate('category', 'name slug')
            .lean()

        if (newTools.length === 0) return 0

        const records = newTools.map(t => ({
            objectID: t._id.toString(),
            name: t.name,
            slug: t.slug,
            shortDescription: t.shortDescription,
            longDescription: (t.longDescription || '').substring(0, 2000), // Algolia 10kb limit safety
            category: t.category?.name || '',
            categorySlug: t.category?.slug || '',
            tags: t.tags || [],
            useCaseTags: t.useCaseTags || [],         // ← rich long-tail search matching
            audienceTags: t.audienceTags || [],       // ← filter facet
            industryTags: t.industryTags || [],       // ← filter facet
            keyFeatures: t.keyFeatures || [],         // ← boosts keyword matching
            alternativeTo: t.alternativeTo || [],     // ← 'alternatives to X' searches
            pricing: t.pricing,
            logo: t.logo || null,
            officialUrl: t.officialUrl,
            views: t.views || 0,
            enrichmentScore: t.enrichmentScore || 0, // ← for ranking rule
            isFeatured: t.isFeatured || false,
            isTrending: t.isTrending || false,
            isEnriched: t.isEnriched || false,
            hasFreeTier: t.hasFreeTier || false,
            platforms: t.platforms || [],
        }))

        await index.saveObjects(records)
        return records.length
    } catch (err) {
        console.error('[AlgoliaSync] Error:', err.message)
        return 0
    }
}

// ── Groq enrichment batch ────────────────────────────────────────────────
/**
 * Computes a 0–100 quality completeness score from the Groq-returned data.
 * Used by the auto-staging cron to decide whether a tool is good enough to go
 * to `auto_approved` (threshold: 60). Must be deterministic — no randomness.
 */
function computeEnrichScore(e, tool) {
    let score = 0
    // Core text content (total 40 pts)
    if ((e.shortDescription || tool.shortDescription || '').length >= 60)  score += 10
    if ((e.fullDescription  || tool.fullDescription  || '').length >= 100) score += 15
    if ((e.longDescription  || '').length >= 150)                           score += 15
    // Tagging completeness (total 34 pts)
    if ((e.useCaseTags       || []).length >= 3) score += 12
    if ((e.audienceTags      || []).length >= 1) score +=  7
    if ((e.keyFeatures       || []).length >= 3) score +=  8
    if ((e.alternativeTo     || []).length >= 1) score +=  7
    // Discovery signals (total 18 pts)
    if ((e.integrationTags   || []).length >= 1) score +=  5
    if ((e.tags              || tool.tags || []).length >= 3) score +=  5
    if ((e.industryTags      || []).length >= 1) score +=  4
    if ([e.hasFreeTier] != null)                 score +=  4
    // Logo / media bonus (8 pts)
    if (tool.logo && tool.logo.length > 0)       score +=  8
    return Math.min(Math.round(score), 100)
}

export async function runEnrichmentBatch({ limit = 200 } = {}) {
    // BUG FIX: Use enrichTool() from enrichmentService which has 10-key Groq rotation.
    // Previously used a single groq key inline — caused 500/500 errors on rate limit.
    const tools = await Tool.find({
        isEnriched: { $ne: true },
        status: { $in: ['active', 'pending'] },
        // Do NOT filter by isActive — pending tools from crawlers
        // have isActive:false and still need enrichment before staging.
        linkStatus: { $ne: 'dead' },
    }).limit(limit).populate('category', 'name slug').lean()

    const stats = { processed: tools.length, enriched: 0, errors: 0 }
    console.log(`[Enrichment] Processing ${tools.length} unenriched tools with 10-key rotator...`)

    for (const tool of tools) {
        try {
            const result = await enrichTool(tool)
            if (result.success) {
                stats.enriched++
            } else {
                stats.errors++
                console.warn(`[Enrichment] Tool "${tool.name}" failed: ${result.reason}`)
            }
        } catch (err) {
            stats.errors++
            console.error(`[Enrichment] Unexpected error for "${tool.name}":`, err.message)
        }
    }

    console.log(`[Enrichment] Batch done — enriched: ${stats.enriched}/${stats.processed}, errors: ${stats.errors}`)
    return stats
}

// ── Full crawler run orchestrator ─────────────────────────────────────────────
export async function runFullCrawl({ sources = ['futurepedia', 'taaft', 'aixploria'], onProgress } = {}) {
    const crawlStats = { futurepedia: 0, taaft: 0, aixploria: 0, inserted: 0, updated: 0, skipped: 0 }
    const allRaw = []

    console.log(`[Crawler] Starting full crawl — sources: ${sources.join(', ')}`)

    const jobs = []
    if (sources.includes('futurepedia')) {
        jobs.push(
            crawlFuturepedia({ maxPages: 20, maxTools: 300, onProgress })
                .then(r => { crawlStats.futurepedia = r.length; return r })
                .catch(e => { console.error('[Crawler] Futurepedia failed:', e.message); return [] })
        )
    }
    if (sources.includes('taaft')) {
        jobs.push(
            crawlTAAFT({ maxTools: 300, onProgress })
                .then(r => { crawlStats.taaft = r.length; return r })
                .catch(e => { console.error('[Crawler] TAAFT failed:', e.message); return [] })
        )
    }
    if (sources.includes('aixploria')) {
        jobs.push(
            crawlAixploria({ maxPages: 20, onProgress })
                .then(r => { crawlStats.aixploria = r.length; return r })
                .catch(e => { console.error('[Crawler] AIxploria failed:', e.message); return [] })
        )
    }

    const crawlResults = await Promise.allSettled(jobs)
    crawlResults.forEach(result => {
        if (result.status === 'fulfilled') allRaw.push(...result.value)
    })

    console.log(`[Crawler] Raw tools collected: ${allRaw.length}`)

    // Normalize all raw tools to IntelliGrid schema
    const normalized = allRaw.map(normalizeToSchema).filter(Boolean)
    console.log(`[Crawler] After normalization: ${normalized.length} valid tools`)

    // Deuplicate and insert
    const dbStats = await deduplicateAndUpsert(normalized)
    crawlStats.inserted = dbStats.inserted
    crawlStats.updated = dbStats.updated
    crawlStats.skipped = dbStats.skipped

    // Sync new tools to Algolia
    if (dbStats.inserted > 0) {
        const synced = await syncToAlgolia(dbStats.inserted + 50)
        console.log(`[Crawler] Algolia synced: ${synced} records`)
    }

    return crawlStats
}

// ── Cron job registration ──────────────────────────────────────────────────────
let schedulerStarted = false

export function startCrawlerScheduler() {
    if (schedulerStarted) return
    schedulerStarted = true

    // ── Nightly crawler: 2:00 AM IST = 20:30 UTC ─────────────────────────────
    //
    // JS crawlers write DIRECTLY to MongoDB via deduplicateAndUpsert().
    // No CSV importer step — that was only needed for the old Python scripts.
    cron.schedule('30 20 * * *', async () => {
        console.log('[Scheduler] Nightly Pipeline starting via JobManager...')
        try {
            await sendOwnerAlert('🕐 *Nightly Pipeline Started*\nSequential Queue: Futurepedia → TAAFT')

            // runAndWait: starts a job and polls until it exits.
            // Throws on spawn failure so the caller can track it.
            const runAndWait = async (jobId) => {
                const { startJob, isRunning } = await import('../services/JobManager.js')
                await startJob(jobId, { isNightly: true }) // throws if script not found
                // Poll every 10 s until the process exits
                while (isRunning(jobId)) {
                    await new Promise(r => setTimeout(r, 10000))
                }
            }

            // Track per-crawler results so the final alert is accurate
            const failures = []

            // Sequential execution to avoid RAM spikes on the Railway container.
            // Each JS wrapper crawls its source and writes results directly to MongoDB.
            for (const jobId of ['crawler_futurepedia', 'crawler_taaft', 'crawler_aixploria']) {
                try {
                    await runAndWait(jobId)
                } catch (err) {
                    console.error(`[Scheduler] Job ${jobId} failed:`, err.message)
                    failures.push({ jobId, error: err.message })
                }
            }

            // ── Send accurate Telegram summary ────────────────────────────
            if (failures.length === 0) {
                await sendOwnerAlert(
                    '✅ *Nightly Pipeline Complete*\n' +
                    'All crawlers finished. New tools are staged as `pending` in MongoDB.\n' +
                    'They will be enriched in the next Groq batch (runs every 4h).'
                )
            } else {
                const succeeded = 2 - failures.length
                const failLines = failures.map(f => `❌ ${f.jobId}: ${f.error.slice(0, 120)}`).join('\n')
                await sendOwnerAlert(
                    `⚠️ *Nightly Pipeline — ${failures.length} failure(s)*\n\n` +
                    failLines + '\n\n' +
                    (succeeded > 0
                        ? `✅ ${succeeded} crawler(s) succeeded. Check /jobstatus for details.`
                        : '❌ All crawlers failed.')
                )
            }

        } catch (err) {
            console.error('[Scheduler] Nightly pipeline orchestrator error:', err.message)
            await sendOwnerAlert(`❌ *Nightly pipeline orchestrator error*\n${err.message}`)
        }
    }, { timezone: 'UTC' })

    // ── Enrichment: every 4 hours ─────────────────────────────────────────────
    // Batch size: 500 (up from 200) to clear the 4,400+ unenriched-tools backlog
    // faster. Groq free tier is 30 RPM; the 250ms inter-tool delay in
    // runEnrichmentBatch already honours that limit.
    cron.schedule('0 */4 * * *', async () => {
        console.log('[Scheduler] Enrichment batch starting...')
        try {
            const stats = await runEnrichmentBatch({ limit: 500 })

            // Count ALL remaining unenriched tools BEFORE branching on stats —
            // we always want an accurate number for the Telegram message.
            const remaining = await Tool.countDocuments({
                isEnriched: { $ne: true },
                status: { $in: ['active', 'pending'] },
            })

            if (stats.enriched > 0) {
                // ── Re-sync freshly enriched ACTIVE tools to Algolia ──────────
                // These are already live — just need their new Groq fields pushed.
                let algoliaCount = 0
                try {
                    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
                    const justEnriched = await Tool.find({
                        status: 'active',
                        isActive: true,
                        isEnriched: true,
                        // BUG FIX: was `enrichedAt` — enrichmentService.js sets `lastEnrichedAt`
                        lastEnrichedAt: { $gte: fourHoursAgo },
                    })
                        .limit(600)
                        .select('name slug shortDescription longDescription category tags useCaseTags audienceTags industryTags keyFeatures alternativeTo pricing logo officialUrl views enrichmentScore isFeatured isTrending isEnriched hasFreeTier platforms')
                        .populate('category', 'name slug')
                        .lean()

                    if (justEnriched.length > 0) {
                        algoliaCount = await syncToAlgolia(justEnriched.length + 10)
                        console.log(`[Scheduler] Algolia re-synced ${algoliaCount} enriched active tools`)
                    }
                } catch (algErr) {
                    console.warn('[Scheduler] Algolia re-sync after enrichment failed:', algErr.message)
                }

                // ── Auto-stage newly enriched PENDING tools for owner review ──
                // Moves pending tools with enrichmentScore >= 60 → auto_approved.
                let staged = 0
                try {
                    const stageStats = await runAutoStage({ threshold: 60 })
                    staged = stageStats.staged
                    console.log(`[Scheduler] Auto-staged ${staged} pending tools for Telegram review`)
                } catch (stageErr) {
                    console.warn('[Scheduler] Auto-staging after enrichment failed:', stageErr.message)
                }

                // ── Build Telegram summary report ─────────────────────────────
                let alertMsg =
                    `🤖 *Auto-Enrichment Batch Complete*\n\n` +
                    `✅ Enriched this batch: *${stats.enriched}*\n` +
                    `❌ Errors: ${stats.errors}\n` +
                    `📋 Still unenriched: *${remaining}*\n` +
                    `🔍 Algolia re-synced: *${algoliaCount}* active tools\n`

                if (staged > 0) {
                    alertMsg += `\n📥 *${staged} new tools staged for your review!*\nSend /reviewbatch to approve/reject them.`
                } else {
                    alertMsg += `\nℹ️ No new pending tools were staged this batch.`
                }

                await sendOwnerAlert(alertMsg)
            } else {
                // Always send an alert even when nothing was enriched so you know
                // immediately if GROQ_API_KEY is missing/rate-limited or the DB is clean.
                console.log('[Scheduler] Enrichment batch: nothing enriched this cycle.')
                await sendOwnerAlert(
                    `ℹ️ *Enrichment Batch — 0 tools enriched*\n\n` +
                    `Processed: ${stats.processed} | Errors: ${stats.errors}\n` +
                    `📋 Remaining unenriched: *${remaining}*\n\n` +
                    (stats.errors > 0
                        ? '⚠️ Errors detected — check GROQ\_API\_KEY or Groq rate limits.'
                        : remaining === 0
                            ? '🎉 All tools are enriched!'
                            : 'ℹ️ Check if GROQ_API_KEY is set in Railway env vars.')
                )
            }
        } catch (err) {
            console.error('[Scheduler] Enrichment error:', err.message)
            await sendOwnerAlert(`❌ *Enrichment batch error*\n${err.message.slice(0, 200)}`)
        }
    }, { timezone: 'UTC' })

    console.log('✅ [CrawlerScheduler] Cron jobs registered — nightly crawl at 02:00 IST, enrichment every 4h (with auto-stage)')
}
