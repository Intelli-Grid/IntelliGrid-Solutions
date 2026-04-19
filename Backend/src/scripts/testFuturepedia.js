/**
 * testFuturepedia.js
 * End-to-end test of the new Futurepedia crawler.
 * Fetches 5 tools — does NOT write to MongoDB.
 * Run: node src/scripts/testFuturepedia.js
 */
import 'dotenv/config'
import { crawlFuturepedia } from '../jobs/crawlers/futurepediaCrawler.js'

console.log('🧪 Testing Futurepedia crawler (5 tools, no DB write)\n')

const results = await crawlFuturepedia({ maxTools: 5 })

if (results.length === 0) {
    console.log('\n❌ No tools found — check logs above for errors')
} else {
    console.log(`\n✅ ${results.length} tools found!\n`)
    results.forEach((t, i) => {
        console.log(`[${i + 1}] ${t.name}`)
        console.log(`    URL:  ${t.officialUrl}`)
        console.log(`    Desc: ${t.shortDescription?.substring(0, 80)}...`)
        console.log(`    Logo: ${t.logo ? '✅' : '❌ missing'}`)
        console.log(`    Tags: ${t.tags?.join(', ') || 'none'}`)
        console.log()
    })
}
