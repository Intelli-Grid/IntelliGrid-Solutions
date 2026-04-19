/**
 * runCrawlerFuturepedia.js
 * ========================
 * JobManager worker — spawned as a child Node.js process.
 * Uses the JS Futurepedia crawler (no Python dependency).
 *
 * Pipeline: crawl → normalize → deduplicate → insert as 'pending'
 * Tools enter as pending (isActive:false) and will be enriched by
 * the Groq batch (every 4h), auto-staged if score ≥ 60, then reviewed
 * by admin via /reviewbatch before going live.
 *
 * ScraperAPI budget (free plan: 5,000 credits/month):
 *  - Sitemap fetch: 0 credits (direct HTTP)
 *  - render:true per tool page: ~5 credits
 *  - MAX_TOOLS_PER_RUN = 50 → 250 credits/night → ~600 credits/month
 *    (well within 5,000 free limit even running daily)
 *  - Raise MAX_TOOLS_PER_RUN if you upgrade to a paid ScraperAPI plan
 *
 * Emits PROGRESS:processed:N:total:M lines for JobManager tracking.
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { crawlFuturepedia } from '../jobs/crawlers/futurepediaCrawler.js'
import { normalizeToSchema } from '../jobs/crawlers/normalizer.js'
import { deduplicateAndUpsert } from '../jobs/crawlers/deduplicator.js'

// ── ScraperAPI budget cap ──────────────────────────────────────────────────────
// Free plan: 5,000 credits/month. render:true ≈ 5 credits each.
// 50 tools × 5 credits = 250 credits/run × 30 days = 7,500 credits/month
// Raise to 200 if on paid plan ($49/month = 250,000 credits)
const MAX_TOOLS_PER_RUN = parseInt(process.env.FUTUREPEDIA_MAX_TOOLS || '50')

async function main() {
    if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI not set')
        process.exit(1)
    }

    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ [FUTUREPEDIA] Connected to MongoDB')

    console.log(`PROGRESS:processed:1:total:10`)
    console.log(`[FUTUREPEDIA] Starting crawler — maxTools: ${MAX_TOOLS_PER_RUN}`)

    let rawTools = []
    try {
        rawTools = await crawlFuturepedia({
            maxTools: MAX_TOOLS_PER_RUN,
            onProgress: ({ done, total, found }) => {
                // Emit intermediate progress (1–7) during crawl
                const pct = Math.floor((done / total) * 6) + 1   // maps 0-100% → 1-7
                console.log(`PROGRESS:processed:${pct}:total:10`)
            }
        })
    } catch (err) {
        console.error('[FUTUREPEDIA] Crawler error:', err.message)
        rawTools = []
    }

    if (rawTools.length === 0) {
        console.log('⚠️  [FUTUREPEDIA] No tools extracted — Cloudflare block or structure change.')
        console.log('PROGRESS:processed:10:total:10')
        await mongoose.disconnect()
        process.exit(0)
    }

    console.log(`PROGRESS:processed:8:total:10`)

    const normalized = rawTools.map(normalizeToSchema).filter(Boolean)
    console.log(`[FUTUREPEDIA] Normalised: ${normalized.length} valid tools from ${rawTools.length} raw`)

    const stats = await deduplicateAndUpsert(normalized)
    console.log(`[FUTUREPEDIA] DB result — inserted: ${stats.inserted}, updated: ${stats.updated}, skipped: ${stats.skipped}, errors: ${stats.errors}`)
    console.log(`FUTUREPEDIA_RESULT:inserted:${stats.inserted}:updated:${stats.updated}:skipped:${stats.skipped}`)

    console.log(`PROGRESS:processed:10:total:10`)
    await mongoose.disconnect()
    console.log('✅ [FUTUREPEDIA] Done.')
    process.exit(0)
}

main().catch(err => {
    console.error('[FUTUREPEDIA] Fatal error:', err.message)
    process.exit(1)
})
