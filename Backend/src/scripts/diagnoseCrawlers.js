/**
 * diagnoseCrawlers.js
 * Dumps raw responses from each site to understand their structure.
 * Run: node src/scripts/diagnoseCrawlers.js
 */

import 'dotenv/config'
import axios from 'axios'
import { scraperGet } from '../config/scraperClient.js'

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
}

const direct = axios.create({ timeout: 20000, headers: HEADERS })

async function probe(label, url, opts = {}) {
    const methods = [
        { name: 'Direct', fn: () => direct.get(url) },
        { name: 'ScraperAPI', fn: () => scraperGet(url, opts) },
    ]

    for (const m of methods) {
        try {
            const res = await m.fn()
            const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
            console.log(`\n✅ [${label}] via ${m.name} — status ${res.status}`)
            console.log(`   Content-type: ${res.headers['content-type']?.split(';')[0]}`)
            console.log(`   First 500 chars:\n${body.substring(0, 500)}`)
            return // stop on first success
        } catch (err) {
            console.log(`❌ [${label}] via ${m.name} — ${err.response?.status || err.message}`)
        }
    }
}

console.log('\n🔍 FUTUREPEDIA SITEMAPS')
await probe('FP sitemap.xml',      'https://www.futurepedia.io/sitemap.xml')
await probe('FP sitemaps/tool-sitemap.xml', 'https://www.futurepedia.io/sitemaps/tool-sitemap.xml')

console.log('\n🔍 TAAFT')
await probe('TAAFT sitemap.xml',   'https://theresanaiforthat.com/sitemap.xml', { extraHeaders: { Accept: 'application/xml' } })
await probe('TAAFT sitemap_index', 'https://theresanaiforthat.com/sitemap_index.xml')
await probe('TAAFT homepage',      'https://theresanaiforthat.com/')

console.log('\n🔍 AIXPLORIA')
await probe('AIx WP API',  'https://www.aixploria.com/wp-json/wp/v2/posts?per_page=3&page=1&status=publish', { json: true })
await probe('AIx homepage', 'https://www.aixploria.com/')
