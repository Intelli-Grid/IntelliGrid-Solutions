/**
 * discoveryQueue.js — Batch 4D (BullMQ-based async discovery pipeline)
 *
 * Architecture:
 *   Producer  → fetchProductHuntTools() → queue.add('ingest', { url, source, ... })
 *   Worker    → checkUrl → extractToolMeta → autoCategorize → Tool.create (status:pending)
 *
 * Every auto-discovered tool is created with:
 *   status: 'pending'   → requires admin approval before going live
 *   isActive: false     → hidden from all public queries
 *
 * This is the critical safety gate — NO auto-discovered tool goes live without human review.
 *
 * Redis connection: reuses the existing REDIS_URL env var.
 * Requires: ioredis (see package.json) — BullMQ uses ioredis internally via its own connection.
 */

import { Queue, Worker, QueueEvents } from 'bullmq'
import mongoose from 'mongoose'
import slugify from 'slugify'
import Tool from '../models/Tool.js'
import { extractToolMeta } from './metaExtractor.js'
import { autoCategorize } from './autoCategorize.js'
import { syncToolToAlgolia } from '../config/algolia.js'   // NOT synced yet — tool is pending

// ── Redis connection config for BullMQ ────────────────────────────────────────
// BullMQ requires ioredis-style connection options, not a redis:// string directly
function getRedisConnection() {
    const url = process.env.REDIS_URL
    if (!url) {
        console.warn('[DiscoveryQueue] REDIS_URL not set — queue disabled')
        return null
    }
    try {
        const parsed = new URL(url)
        return {
            host: parsed.hostname,
            port: parseInt(parsed.port) || 6379,
            password: parsed.password || undefined,
            tls: parsed.protocol === 'rediss:' ? {} : undefined,
            maxRetriesPerRequest: null, // Required by BullMQ
        }
    } catch {
        console.error('[DiscoveryQueue] Invalid REDIS_URL format')
        return null
    }
}

// ── URL live-check (minimal, inline — avoids circular import with linkValidationService) ──
import axios from 'axios'

async function isUrlAlive(url) {
    try {
        const res = await axios.head(url, {
            timeout: 8000,
            maxRedirects: 5,
            validateStatus: s => s < 500,
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IntelliGridBot/1.0)' },
        })
        return res.status < 400
    } catch {
        return false
    }
}

// ── Queue & Worker ─────────────────────────────────────────────────────────────
let discoveryQueue = null
let discoveryWorker = null

export function getDiscoveryQueue() {
    return discoveryQueue
}

/**
 * Add a batch of tool candidates to the discovery queue.
 *
 * @param {Array<{url, name, source, ...}>} tools
 */
export async function enqueueTools(tools) {
    if (!discoveryQueue) {
        console.warn('[DiscoveryQueue] Queue not initialised — tools not enqueued')
        return
    }
    const jobs = tools
        .filter(t => t.url)
        .map(tool => ({
            name: 'ingest',
            data: tool,
            opts: {
                attempts: 2,
                backoff: { type: 'exponential', delay: 5000 },
                removeOnComplete: 500,   // keep last 500 completed jobs for audit
                removeOnFail: 200,
            },
        }))

    await discoveryQueue.addBulk(jobs)
    console.log(`[DiscoveryQueue] Enqueued ${jobs.length} tools for processing`)
}

/**
 * Process a single discovery job:
 *   1. Check URL is alive
 *   2. Check if already in DB (dedup by officialUrl)
 *   3. Extract metadata
 *   4. Auto-categorize
 *   5. Save as pending (status: 'pending', isActive: false)
 */
async function processIngestJob(job) {
    const { url, name: hintName, tagline, description: hintDesc, logoUrl, source, sourceUrl, launchedAt } = job.data

    if (!url) throw new Error('No URL provided')

    const normalised = /^https?:\/\//i.test(url) ? url : `https://${url}`

    // Step 1: URL alive check
    const alive = await isUrlAlive(normalised)
    if (!alive) {
        console.log(`[DiscoveryQueue] Dead URL — discarding: ${normalised}`)
        return { skipped: true, reason: 'dead_url' }
    }

    // Step 2: Deduplication — check by officialUrl
    const existing = await Tool.findOne({
        $or: [
            { officialUrl: normalised },
            { officialUrl: url },
        ],
    }).select('_id name').lean()

    if (existing) {
        console.log(`[DiscoveryQueue] Duplicate — already exists: ${existing.name}`)
        return { skipped: true, reason: 'duplicate', existingId: existing._id }
    }

    // Step 3: Extract metadata from the actual website
    const meta = await extractToolMeta(normalised)

    const finalName = meta.name || hintName || new URL(normalised).hostname
    const finalDesc = meta.shortDescription || tagline || hintDesc || ''
    const finalLogo = meta.logo || logoUrl || null
    const finalPricing = meta.pricingModel || 'Unknown'
    const finalHasFreeTier = meta.hasFreeTier ?? null
    const finalPrice = meta.startingPrice || null

    // Step 4: Auto-categorize
    const { categoryId } = await autoCategorize(finalName, finalDesc)

    // Step 5: Generate slug — ensure uniqueness
    let slug = slugify(finalName, { lower: true, strict: true })
    const slugExists = await Tool.findOne({ slug }).select('_id').lean()
    if (slugExists) {
        // Append timestamp suffix to avoid collision
        slug = `${slug}-${Date.now().toString(36)}`
    }

    // Step 6: Create tool as PENDING — requires admin approval
    const tool = await Tool.create({
        name: finalName,
        slug,
        officialUrl: normalised,
        sourceUrl: sourceUrl || null,
        shortDescription: finalDesc.slice(0, 500),
        logo: finalLogo,
        pricing: finalPricing,
        hasFreeTier: finalHasFreeTier,
        startingPrice: finalPrice,
        category: categoryId || undefined,
        sourceFoundBy: source || 'scraper',
        linkStatus: 'live',
        isActive: false,           // CRITICAL: hidden from public until admin approves
        status: 'pending',         // CRITICAL: requires admin approval
        lastLinkCheck: new Date(),
        launchedAt: launchedAt ? new Date(launchedAt) : null,
        screenshots: meta.screenshotUrl ? [meta.screenshotUrl] : [],
    })

    // NOTE: Do NOT sync to Algolia here — tool is pending.
    // Algolia sync happens in the admin approve route (toolService.updateTool).

    console.log(`[DiscoveryQueue] ✅ Created pending tool: "${tool.name}" (${tool._id})`)
    return { created: true, toolId: tool._id, name: tool.name }
}

/**
 * Initialise the BullMQ queue and worker.
 * Call this once at server startup.
 */
export function initDiscoveryQueue() {
    const connection = getRedisConnection()
    if (!connection) return

    discoveryQueue = new Queue('tool-discovery', {
        connection,
        defaultJobOptions: {
            attempts: 2,
            backoff: { type: 'exponential', delay: 5000 },
        },
    })

    discoveryWorker = new Worker(
        'tool-discovery',
        async (job) => {
            if (job.name === 'ingest') {
                return processIngestJob(job)
            }
        },
        {
            connection,
            concurrency: 5,    // 5 parallel ingestion jobs
            limiter: {
                max: 10,        // max 10 jobs per 5 seconds (rate-limit external requests)
                duration: 5000,
            },
        }
    )

    discoveryWorker.on('completed', (job, result) => {
        if (result?.created) {
            console.log(`[DiscoveryQueue] Job ${job.id} complete — new tool: "${result.name}"`)
        }
    })

    discoveryWorker.on('failed', (job, err) => {
        console.error(`[DiscoveryQueue] Job ${job?.id} failed: ${err.message}`)
    })

    console.log('🔄 Discovery Queue initialised (BullMQ + Redis)')
}
