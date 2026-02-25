/**
 * runDiscovery.js — Manual trigger for the discovery pipeline
 *
 * Usage:
 *   npm run run:discovery              # fetch last 1 day
 *   npm run run:discovery:week         # fetch last 7 days
 *   node scripts/runDiscovery.js --days 3
 *
 * This script is safe to run any time — it only creates PENDING tools.
 * No tools go live without admin approval.
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

import connectDB from '../src/config/database.js'
import { fetchProductHuntTools, mapPHTool } from '../src/services/productHuntScraper.js'
import { initDiscoveryQueue, enqueueTools, getDiscoveryQueue } from '../src/services/discoveryQueue.js'

// Parse --days argument
const args = process.argv.slice(2)
const daysArg = args.find(a => a.startsWith('--days'))
const daysBack = daysArg ? parseInt(daysArg.split('=')[1] || args[args.indexOf(daysArg) + 1] || '1') : 1

async function main() {
    console.log(`\n🔍 IntelliGrid Discovery Pipeline — Manual Run`)
    console.log(`📅 Looking back: ${daysBack} day(s)`)
    console.log('─'.repeat(50))

    await connectDB()

    // Init queue (starts BullMQ worker in this process)
    initDiscoveryQueue()

    // Wait for Redis + DB to settle
    await new Promise(r => setTimeout(r, 2000))

    const allTools = []

    // ── Product Hunt ──────────────────────────────────────────────────────────
    console.log('\n📦 Fetching from Product Hunt...')
    const phPosts = await fetchProductHuntTools(daysBack)
    const phTools = phPosts.filter(p => p.website || p.url).map(mapPHTool)
    allTools.push(...phTools)
    console.log(`   → ${phTools.length} tools found`)

    if (allTools.length === 0) {
        console.log('\n✅ No new tools discovered. Try --days 7 to broaden the search.')
        process.exit(0)
    }

    // ── Enqueue ───────────────────────────────────────────────────────────────
    console.log(`\n🚀 Enqueueing ${allTools.length} tools for processing...`)
    await enqueueTools(allTools)

    // Wait for jobs to process (max 2 min for a manual run)
    console.log('\n⏳ Waiting for jobs to complete (max 2 min)...')
    const queue = getDiscoveryQueue()

    const timeout = Date.now() + 120000
    while (Date.now() < timeout) {
        const counts = await queue.getJobCounts()
        const pending = (counts.waiting || 0) + (counts.active || 0)
        if (pending === 0) break
        process.stdout.write(`\r   Jobs remaining: ${pending}   `)
        await new Promise(r => setTimeout(r, 2000))
    }

    const finalCounts = await queue.getJobCounts()
    console.log(`\n\n✅ Discovery run complete`)
    console.log(`   Completed: ${finalCounts.completed || 0}`)
    console.log(`   Failed:    ${finalCounts.failed || 0}`)
    console.log(`\n📋 Review pending tools at: GET /api/v1/admin/discovery/pending`)

    // Give the queue a moment to flush
    await new Promise(r => setTimeout(r, 1000))
    process.exit(0)
}

main().catch(err => {
    console.error('❌ Discovery run failed:', err)
    process.exit(1)
})
