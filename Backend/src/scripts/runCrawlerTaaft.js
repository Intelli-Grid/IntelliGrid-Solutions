/**
 * runCrawlerTaaft.js
 * ==================
 * JobManager worker — spawned as a child Node.js process.
 * Uses the JS crawler directly (no Python dependency).
 *
 * Emits PROGRESS:processed:N:total:M lines for JobManager tracking.
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import { crawlTAAFT } from '../jobs/crawlers/taaftCrawler.js'
import { normalizeToSchema } from '../jobs/crawlers/normalizer.js'
import { deduplicateAndUpsert } from '../jobs/crawlers/deduplicator.js'

async function main() {
    if (!process.env.MONGODB_URI) {
        console.error('❌ MONGODB_URI not set')
        process.exit(1)
    }

    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ [TAAFT] Connected to MongoDB')

    console.log('PROGRESS:processed:1:total:10')
    console.log('[TAAFT] Starting JS crawler (no Python required)...')

    let rawTools = []
    try {
        rawTools = await crawlTAAFT({ maxTools: 300 })
    } catch (err) {
        console.error('[TAAFT] Crawler error:', err.message)
        rawTools = []
    }

    if (rawTools.length === 0) {
        console.log('⚠️  [TAAFT] No tools extracted — possible Cloudflare block or structure change.')
        await mongoose.disconnect()
        process.exit(0)
    }

    console.log(`PROGRESS:processed:5:total:10`)

    const normalized = rawTools.map(normalizeToSchema).filter(Boolean)
    console.log(`[TAAFT] Normalised: ${normalized.length} valid tools from ${rawTools.length} raw`)

    const stats = await deduplicateAndUpsert(normalized)
    console.log(`[TAAFT] DB result — inserted: ${stats.inserted}, updated: ${stats.updated}, skipped: ${stats.skipped}`)

    console.log(`PROGRESS:processed:10:total:10`)
    await mongoose.disconnect()
    console.log('✅ [TAAFT] Done.')
    process.exit(0)
}

main().catch(err => {
    console.error('[TAAFT] Fatal error:', err.message)
    process.exit(1)
})
