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
import Groq from 'groq-sdk'

// ── Algolia sync (lazy import to avoid circular deps at boot) ─────────────────
async function syncToAlgolia(limit = 500) {
    try {
        const { default: algoliasearch } = await import('algoliasearch')
        const client = algoliasearch(
            process.env.ALGOLIA_APP_ID,
            process.env.ALGOLIA_ADMIN_KEY || process.env.ALGOLIA_API_KEY
        )
        const index = client.initIndex('tools')

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
    if (!process.env.GROQ_API_KEY) {
        console.warn('[Enrichment] GROQ_API_KEY not set — skipping')
        return { processed: 0, enriched: 0, errors: 0 }
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const tools = await Tool.find({
        isEnriched: { $ne: true },
        status: { $in: ['active', 'pending'] },
        // NOTE: Do NOT filter by isActive here — pending tools from crawlers
        // have isActive:false and still need enrichment before staging.
        linkStatus: { $ne: 'dead' },
    }).limit(limit).populate('category', 'name slug').lean()

    const stats = { processed: tools.length, enriched: 0, errors: 0 }
    console.log(`[Enrichment] Processing ${tools.length} unenriched tools...`)

    for (const tool of tools) {
        try {
            const prompt = `You are an expert AI tools analyst. Analyze the tool below and return ONLY a valid JSON object — no markdown, no code fences, no explanation.

Tool Name: ${tool.name}
Website: ${tool.officialUrl}
Category: ${tool.category?.name || tool.categorySlug || 'AI Tools'}
Existing Description: ${tool.shortDescription || tool.fullDescription || 'Unknown'}

Return exactly this JSON shape (all fields required, use empty arrays [] if you don't know):
{
  "shortDescription": "One sentence, max 160 chars, what this tool does and for whom",
  "fullDescription": "2-3 sentences highlighting the core value proposition and key differentiator",
  "longDescription": "150-250 word detailed SEO paragraph covering the tool purpose, unique features, best use cases, and who benefits most",
  "tags": ["up to 8 relevant search tags"],
  "useCaseTags": ["3-6 task-based tags like: write blog posts, transcribe audio, generate images"],
  "audienceTags": ["2-4 audience tags like: Marketers, Developers, Students, Designers, Entrepreneurs"],
  "industryTags": ["1-3 industry tags like: Healthcare, Finance, Education, E-commerce"],
  "integrationTags": ["0-4 integration names like: Zapier, Slack, Notion, Google Drive"],
  "keyFeatures": ["3-5 specific feature bullets, factual not marketing"],
  "alternativeTo": ["0-3 well-known tool names this replaces, e.g. Jasper, Midjourney"],
  "pros": ["2-4 genuine advantages"],
  "cons": ["1-3 genuine limitations or caveats"],
  "hasFreeTier": true,
  "platforms": ["Web"],
  "qualityScore": 75
}`

            const completion = await groq.chat.completions.create({
                model: 'llama3-8b-8192',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 1200,
            })

            const raw = completion.choices[0]?.message?.content || ''
            const jsonMatch = raw.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                console.warn(`[Enrichment] No JSON in Groq response for ${tool.name}`)
                continue
            }

            const e = JSON.parse(jsonMatch[0])
            const score = computeEnrichScore(e, tool)

            // Valid platform values from the Tool schema enum
            const VALID_PLATFORMS = ['Web', 'iOS', 'Android', 'Chrome Extension',
                'Firefox Extension', 'API', 'Desktop (Mac)', 'Desktop (Windows)',
                'Discord Bot', 'Slack App', 'VS Code Extension']

            await Tool.updateOne(
                { _id: tool._id },
                {
                    $set: {
                        // Core text
                        ...(e.shortDescription ? { shortDescription: e.shortDescription.substring(0, 499) } : {}),
                        ...(e.fullDescription  ? { fullDescription: e.fullDescription } : {}),
                        ...(e.longDescription  ? { longDescription: e.longDescription } : {}),

                        // Tagging
                        ...(e.tags?.length          ? { tags: e.tags.slice(0, 10) } : {}),
                        ...(e.useCaseTags?.length   ? { useCaseTags: e.useCaseTags.slice(0, 8) } : {}),
                        ...(e.audienceTags?.length  ? { audienceTags: e.audienceTags.slice(0, 5) } : {}),
                        ...(e.industryTags?.length  ? { industryTags: e.industryTags.slice(0, 4) } : {}),
                        ...(e.integrationTags?.length ? { integrationTags: e.integrationTags.slice(0, 8) } : {}),
                        ...(e.keyFeatures?.length   ? { keyFeatures: e.keyFeatures.slice(0, 6) } : {}),
                        ...(e.alternativeTo?.length ? { alternativeTo: e.alternativeTo.slice(0, 5) } : {}),

                        // Pros / cons stored in seoContent
                        ...(e.pros?.length || e.cons?.length ? {
                            'seoContent.pros': (e.pros || []).slice(0, 5),
                            'seoContent.cons': (e.cons || []).slice(0, 4),
                            'seoContent.generatedAt': new Date(),
                        } : {}),

                        // Discovery signals
                        ...(e.hasFreeTier != null ? { hasFreeTier: Boolean(e.hasFreeTier) } : {}),
                        ...(e.platforms?.length ? {
                            platforms: e.platforms.filter(p => VALID_PLATFORMS.includes(p))
                        } : {}),

                        // Pipeline state
                        isEnriched: true,
                        enrichedAt: new Date(),
                        lastEnrichedAt: new Date(),
                        enrichmentScore: score,
                        enrichmentSource: 'groq-llama3-v2',
                        enrichmentVersion: (tool.enrichmentVersion || 0) + 1,
                    }
                }
            )
            stats.enriched++
            // Groq free tier: 30 RPM — 250ms delay gives headroom
            await new Promise(r => setTimeout(r, 250))
        } catch (err) {
            stats.errors++
            if (err.message?.includes('rate')) {
                console.warn('[Enrichment] Rate limited — pausing 60s')
                await new Promise(r => setTimeout(r, 60000))
            }
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
    cron.schedule('30 20 * * *', async () => {
        console.log('[Scheduler] Nightly Pipeline starting via JobManager...')
        try {
            await sendOwnerAlert('🕐 *Nightly Pipeline Started*\nSequential Queue: Futurepedia → AIxploria → TAAFT → Importer')

            const runAndWait = async (jobId) => {
                const { startJob, isRunning } = await import('../services/JobManager.js')
                try {
                    await startJob(jobId, { isNightly: true })
                    // Wait for the job to finish by polling the in-memory registry
                    while (isRunning(jobId)) {
                        await new Promise(r => setTimeout(r, 10000)) // check every 10s
                    }
                } catch (err) {
                    console.error(`[Scheduler] Job ${jobId} failed to start:`, err.message)
                }
            }

            // Sequential Execution to avoid CPU/RAM spikes on the Railway container
            await runAndWait('crawler_futurepedia')
            await runAndWait('crawler_aixploria')
            await runAndWait('crawler_taaft')

            // After all CSVs are generated, run the Master Importer
            await runAndWait('importer')

            await sendOwnerAlert('✅ *Nightly Pipeline Complete*\nAll crawlers and the importer have finished. The imported tools are now staged as `pending` inside your database.')

        } catch (err) {
            console.error('[Scheduler] Nightly pipeline orchestrator error:', err.message)
            await sendOwnerAlert(`❌ *Nightly pipeline orchestrator error*\n${err.message}`)
        }
    }, { timezone: 'UTC' })

    // ── Enrichment: every 4 hours ─────────────────────────────────────────────
    cron.schedule('0 */4 * * *', async () => {
        console.log('[Scheduler] Enrichment batch starting...')
        try {
            const stats = await runEnrichmentBatch({ limit: 200 })

            if (stats.enriched > 0) {
                // Count ALL remaining unenriched tools regardless of status
                const remaining = await Tool.countDocuments({
                    isEnriched: { $ne: true },
                    status: { $in: ['active', 'pending'] },
                })

                // ── Re-sync freshly enriched ACTIVE tools to Algolia ──────────
                // These are already live — just need their new Groq fields pushed.
                // The 4-hour window aligns with the cron interval.
                let algoliaCount = 0
                try {
                    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
                    const justEnriched = await Tool.find({
                        status: 'active',
                        isActive: true,
                        isEnriched: true,
                        enrichedAt: { $gte: fourHoursAgo },
                    })
                        .limit(300)
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
                // Only pending tools need staging — active tools are already live.
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
                console.log('[Scheduler] Enrichment batch: nothing to enrich this cycle.')
            }
        } catch (err) {
            console.error('[Scheduler] Enrichment error:', err.message)
            await sendOwnerAlert(`❌ *Enrichment batch error*\n${err.message.slice(0, 200)}`)
        }
    }, { timezone: 'UTC' })

    console.log('✅ [CrawlerScheduler] Cron jobs registered — nightly crawl at 02:00 IST, enrichment every 4h (with auto-stage)')
}
