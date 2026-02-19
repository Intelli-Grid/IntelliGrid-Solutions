/**
 * purgeBadData.js
 * ─────────────────────────────────────────────────────────────────
 * Identifies and removes all junk tools that were scraped from
 * GitHub Trending, Hacker News, Reddit, and Product Hunt.
 *
 * Run: node scripts/purgeBadData.js
 * Run (dry-run): node scripts/purgeBadData.js --dry-run
 * ─────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

const DRY_RUN = process.argv.includes('--dry-run')

// ─── DB Connection ────────────────────────────────────────────────
const connectDB = async () => {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ MongoDB Connected')
}

// ─── Junk Detection Rules ─────────────────────────────────────────
// A tool is "junk" if ANY of these conditions are true:
const isJunk = (tool) => {
    const name = (tool.name || '').trim()
    const officialUrl = (tool.officialUrl || '').toLowerCase()
    const sourceUrl = (tool.sourceUrl || '').toLowerCase()
    const shortDesc = (tool.shortDescription || '').toLowerCase()
    const tags = (tool.tags || []).map(t => t.toLowerCase())

    // 1. GitHub repo names (contain a slash like "user/repo")
    if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(name)) return { junk: true, reason: 'GitHub repo name (user/repo format)' }

    // 2. Sourced from GitHub
    if (officialUrl.includes('github.com') && sourceUrl.includes('github.com')) return { junk: true, reason: 'GitHub repo URL' }

    // 3. Sourced from Hacker News
    if (sourceUrl.includes('news.ycombinator.com') || officialUrl.includes('news.ycombinator.com')) return { junk: true, reason: 'Hacker News article' }

    // 4. Sourced from Reddit
    if (sourceUrl.includes('reddit.com') || officialUrl.includes('reddit.com')) return { junk: true, reason: 'Reddit post' }

    // 5. Tags contain "Hacker News" or "Reddit"
    if (tags.includes('hacker news') || tags.includes('reddit')) return { junk: true, reason: 'Tagged as Hacker News / Reddit' }

    // 6. Name looks like a news headline (long sentence-style, no product brand pattern)
    //    Real tool names are short (1-4 words, often title-cased brand names)
    //    News headlines are typically 8+ words and contain common journalistic words
    const wordCount = name.split(/\s+/).length
    const headlineKeywords = [
        'gaining ground', 'bypasses', 'blocking', 'failure', 'lawsuit', 'breach',
        'hacked', 'outage', 'vulnerability', 'exploit', 'warning', 'alert',
        'government', 'regulation', 'ban', 'researchers find', 'study shows',
        'report:', 'survey:', 'the future of', 'how to', 'why ', 'what is',
        'introduces', 'announces', 'launches new', 'shuts down', 'goes down',
        'raises $', 'acquires', 'merger', 'layoffs', 'lays off', 'fired',
        'says it', 'claims it', 'admits', 'denies', 'reveals', 'confirms'
    ]
    if (wordCount >= 8 && headlineKeywords.some(kw => name.toLowerCase().includes(kw))) {
        return { junk: true, reason: 'News headline (long sentence with journalistic keywords)' }
    }

    // 7. Name starts with "Show HN:", "Ask HN:", etc.
    if (/^(show hn:|ask hn:|tell hn:)/i.test(name)) return { junk: true, reason: 'Hacker News post title' }

    // 8. Tags contain "Open Source" AND "GitHub" AND "Python" (GitHub trending pattern)
    const ghPattern = tags.includes('open source') && tags.includes('github') && tags.includes('python')
    if (ghPattern) return { junk: true, reason: 'GitHub trending repo pattern (Open Source + GitHub + Python tags)' }

    // 9. Source URL is an intelligrid.online URL but tool has no valid officialUrl
    //    AND name is a super long sentence (was imported from bad CSV data)
    if (wordCount >= 10 && (!officialUrl || officialUrl.includes('intelligrid.online'))) {
        return { junk: true, reason: 'Long sentence name with no real official URL (bad CSV import)' }
    }

    return { junk: false }
}

// ─── Main ─────────────────────────────────────────────────────────
const main = async () => {
    await connectDB()

    const collection = mongoose.connection.collection('tools')
    const total = await collection.countDocuments()
    console.log(`\n📊 Total tools in database: ${total}`)
    console.log(DRY_RUN ? '🔍 DRY RUN MODE — no data will be deleted\n' : '⚠️  LIVE MODE — junk will be permanently deleted\n')

    const allTools = await collection.find({}).toArray()

    const junkIds = []
    const junkLog = []

    for (const tool of allTools) {
        const result = isJunk(tool)
        if (result.junk) {
            junkIds.push(tool._id)
            junkLog.push({ name: tool.name, reason: result.reason, id: tool._id })
        }
    }

    console.log(`🗑️  Junk tools identified: ${junkIds.length}`)
    console.log(`✅ Clean tools to keep: ${total - junkIds.length}\n`)

    // Show breakdown by reason
    const byReason = {}
    junkLog.forEach(j => {
        byReason[j.reason] = (byReason[j.reason] || 0) + 1
    })
    console.log('📋 Breakdown by reason:')
    Object.entries(byReason).sort((a, b) => b[1] - a[1]).forEach(([reason, count]) => {
        console.log(`   ${count.toString().padStart(4)}  ${reason}`)
    })

    // Show sample of junk
    console.log('\n📝 Sample junk tools (first 10):')
    junkLog.slice(0, 10).forEach((j, i) => {
        console.log(`   ${i + 1}. "${j.name}" → ${j.reason}`)
    })

    if (DRY_RUN) {
        console.log('\n✋ DRY RUN complete. Run without --dry-run to actually delete.')
        process.exit(0)
    }

    // Confirm deletion
    if (junkIds.length === 0) {
        console.log('\n✅ No junk found. Database is clean!')
        process.exit(0)
    }

    console.log(`\n🗑️  Deleting ${junkIds.length} junk tools...`)
    const result = await collection.deleteMany({ _id: { $in: junkIds } })
    console.log(`✅ Deleted: ${result.deletedCount} tools`)

    const remaining = await collection.countDocuments()
    console.log(`📊 Remaining tools in database: ${remaining}`)
    console.log('\n✨ Purge complete!')

    process.exit(0)
}

main().catch(err => {
    console.error('❌ Fatal error:', err)
    process.exit(1)
})
