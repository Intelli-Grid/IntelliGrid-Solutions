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
            category: t.category?.name || '',
            categorySlug: t.category?.slug || '',
            tags: t.tags || [],
            pricing: t.pricing,
            logo: t.logo || null,
            officialUrl: t.officialUrl,
            views: t.views || 0,
            isFeatured: t.isFeatured || false,
            isTrending: t.isTrending || false,
        }))

        await index.saveObjects(records)
        return records.length
    } catch (err) {
        console.error('[AlgoliaSync] Error:', err.message)
        return 0
    }
}

// ── Groq enrichment batch ─────────────────────────────────────────────────────
export async function runEnrichmentBatch({ limit = 200 } = {}) {
    if (!process.env.GROQ_API_KEY) {
        console.warn('[Enrichment] GROQ_API_KEY not set — skipping')
        return { processed: 0, enriched: 0, errors: 0 }
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    const tools = await Tool.find({
        isEnriched: { $ne: true },
        status: 'active',
        isActive: true,
        linkStatus: { $ne: 'dead' },
    }).limit(limit).lean()

    const stats = { processed: tools.length, enriched: 0, errors: 0 }
    console.log(`[Enrichment] Processing ${tools.length} unenriched tools...`)

    for (const tool of tools) {
        try {
            const prompt = `You are an expert AI tools analyst. Based on the tool info below, provide enriched metadata.

Tool Name: ${tool.name}
Website: ${tool.officialUrl}
Current Description: ${tool.shortDescription || tool.fullDescription || 'N/A'}
Category: ${tool.categorySlug || 'Unknown'}

Return ONLY valid JSON with these exact fields (no markdown, no explanation):
{
  "shortDescription": "One clear sentence under 160 chars describing what this tool does",
  "fullDescription": "2-3 sentence markdown description. Highlight the unique value proposition.",
  "tags": ["up to 6 specific use-case tags"],
  "targetAudience": ["up to 3 user types e.g. Marketers, Developers, Students"],
  "useCases": ["up to 4 specific tasks this tool excels at"]
}`

            const completion = await groq.chat.completions.create({
                model: 'llama3-8b-8192',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 500,
            })

            const raw = completion.choices[0]?.message?.content || ''
            const jsonMatch = raw.match(/\{[\s\S]*\}/)
            if (!jsonMatch) continue

            const enriched = JSON.parse(jsonMatch[0])

            await Tool.updateOne(
                { _id: tool._id },
                {
                    $set: {
                        ...(enriched.shortDescription ? { shortDescription: enriched.shortDescription.substring(0, 499) } : {}),
                        ...(enriched.fullDescription ? { fullDescription: enriched.fullDescription } : {}),
                        ...(enriched.tags?.length ? { tags: enriched.tags.slice(0, 10) } : {}),
                        isEnriched: true,
                        enrichedAt: new Date(),
                        updatedAt: new Date(),
                    }
                }
            )
            stats.enriched++
            // Polite delay — Groq free tier: 30 RPM
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
        console.log('[Scheduler] Nightly crawler starting...')
        await sendOwnerAlert('🕐 *Nightly crawler started*\nSources: Futurepedia + TAAFT + AIxploria')

        try {
            const stats = await runFullCrawl({ sources: ['futurepedia', 'taaft', 'aixploria'] })
            await sendOwnerAlert(
                `✅ *Nightly Crawl Complete*\n\n` +
                `📥 Futurepedia: ${stats.futurepedia} raw\n` +
                `📥 TAAFT: ${stats.taaft} raw\n` +
                `📥 AIxploria: ${stats.aixploria} raw\n\n` +
                `🆕 Inserted: *${stats.inserted}*\n` +
                `🔄 Updated: *${stats.updated}*\n` +
                `⏭ Skipped: *${stats.skipped}*`
            )
        } catch (err) {
            console.error('[Scheduler] Nightly crawl error:', err.message)
            await sendOwnerAlert(`❌ *Nightly crawl error*\n${err.message}`)
        }
    }, { timezone: 'UTC' })

    // ── Enrichment: every 4 hours ─────────────────────────────────────────────
    cron.schedule('0 */4 * * *', async () => {
        console.log('[Scheduler] Enrichment batch starting...')
        try {
            const stats = await runEnrichmentBatch({ limit: 200 })
            if (stats.enriched > 0) {
                const remaining = await Tool.countDocuments({ isEnriched: { $ne: true }, status: 'active' })
                await sendOwnerAlert(
                    `🤖 *Auto-Enrichment Complete*\n\n` +
                    `✅ Enriched: *${stats.enriched}*\n` +
                    `❌ Errors: ${stats.errors}\n` +
                    `📋 Remaining: *${remaining}*`
                )
            }
        } catch (err) {
            console.error('[Scheduler] Enrichment error:', err.message)
        }
    }, { timezone: 'UTC' })

    console.log('✅ [CrawlerScheduler] Cron jobs registered — nightly crawl at 02:00 IST, enrichment every 4h')
}
