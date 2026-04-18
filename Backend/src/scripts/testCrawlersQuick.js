/**
 * testCrawlersQuick.js
 * Quick local test — does NOT need MongoDB.
 * Just tests if each JS crawler can fetch & parse tools.
 * 
 * Run from Backend/:
 *   node src/scripts/testCrawlersQuick.js
 */

import 'dotenv/config'
import { crawlFuturepedia } from '../jobs/crawlers/futurepediaCrawler.js'
import { crawlTAAFT } from '../jobs/crawlers/taaftCrawler.js'
import { crawlAixploria } from '../jobs/crawlers/aixploriaCrawler.js'

async function test(name, fn) {
    console.log(`\n${'═'.repeat(50)}`)
    console.log(`🧪 Testing: ${name}`)
    console.log('═'.repeat(50))
    const start = Date.now()
    try {
        const results = await fn()
        const elapsed = ((Date.now() - start) / 1000).toFixed(1)
        if (results.length === 0) {
            console.log(`⚠️  ${name}: 0 tools — likely blocked or structure changed`)
        } else {
            console.log(`✅ ${name}: ${results.length} tools found in ${elapsed}s`)
            console.log(`   Sample: "${results[0]?.name}" → ${results[0]?.officialUrl}`)
            if (results[1]) console.log(`   Sample: "${results[1]?.name}" → ${results[1]?.officialUrl}`)
        }
        return results.length
    } catch (err) {
        console.error(`❌ ${name} CRASHED: ${err.message}`)
        return 0
    }
}

console.log('🚀 IntelliGrid Crawler Quick Test')
console.log('No MongoDB needed — just HTTP + parse')

// Limit pages to keep test fast
const [fp, taaft, ax] = await Promise.all([
    test('Futurepedia', () => crawlFuturepedia({ maxPages: 2, maxTools: 10 })),
    test('TAAFT',       () => crawlTAAFT({ maxTools: 5 })),
    test('AIxploria',   () => crawlAixploria({ maxPages: 1 })),
])

console.log(`\n${'═'.repeat(50)}`)
console.log('📊 RESULTS SUMMARY')
console.log('═'.repeat(50))
console.log(`  Futurepedia : ${fp > 0 ? '✅' : '❌'} ${fp} tools`)
console.log(`  TAAFT       : ${taaft > 0 ? '✅' : '❌'} ${taaft} tools`)
console.log(`  AIxploria   : ${ax > 0 ? '✅' : '❌'} ${ax} tools`)
console.log('═'.repeat(50))
