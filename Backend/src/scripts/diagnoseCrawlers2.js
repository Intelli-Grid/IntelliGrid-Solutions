/**
 * diagnoseCrawlers2.js
 * Focused follow-up diagnostic based on findings from run 1:
 *  1. Check robots.txt for all 3 sites → find sitemap URLs
 *  2. Dump all URLs from Futurepedia sitemap to find tool URL pattern
 *  3. Test AIxploria WP REST API DIRECT (ScraperAPI returned 500 for JSON)
 *  4. Test TAAFT with ScraperAPI render:true
 *
 * Run: node src/scripts/diagnoseCrawlers2.js
 */

import 'dotenv/config'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { scraperGet } from '../config/scraperClient.js'

const direct = axios.create({
    timeout: 20000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36',
        Accept: 'text/html,application/xml,application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
    }
})

// ── STEP 1: robots.txt ────────────────────────────────────────────────────────
async function getRobotsSitemaps(host) {
    try {
        const { data } = await direct.get(`${host}/robots.txt`)
        const sitemaps = data.match(/Sitemap:\s*(.+)/gi) || []
        return sitemaps.map(s => s.replace(/^Sitemap:\s*/i, '').trim())
    } catch (err) {
        return [`❌ robots.txt failed: ${err.response?.status || err.message}`]
    }
}

console.log('\n📋 STEP 1: robots.txt sitemaps')
const [fpRobots, taaftRobots, axRobots] = await Promise.all([
    getRobotsSitemaps('https://www.futurepedia.io'),
    getRobotsSitemaps('https://theresanaiforthat.com'),
    getRobotsSitemaps('https://www.aixploria.com'),
])

console.log('\nFuturepedia sitemaps from robots.txt:')
fpRobots.forEach(s => console.log(' ', s))

console.log('\nTAAFT sitemaps from robots.txt:')
taaftRobots.forEach(s => console.log(' ', s))

console.log('\nAIxploria sitemaps from robots.txt:')
axRobots.forEach(s => console.log(' ', s))

// ── STEP 2: Dump ALL Futurepedia sitemap URLs ─────────────────────────────────
console.log('\n📋 STEP 2: Futurepedia sitemap — all URL patterns')
try {
    const { data: xml } = await direct.get('https://www.futurepedia.io/sitemap.xml')
    const $ = cheerio.load(xml, { xmlMode: true })

    const urlCount = $('url loc').length
    const sitemapCount = $('sitemap loc').length

    if (sitemapCount > 0) {
        console.log(`  → Sitemap INDEX with ${sitemapCount} sub-sitemaps:`)
        $('sitemap loc').each((_, el) => console.log('   ', $(el).text().trim()))
    } else {
        console.log(`  → Flat sitemap with ${urlCount} URLs`)
        const sample = []
        $('url loc').each((_, el) => { if (sample.length < 15) sample.push($(el).text().trim()) })
        console.log('  Sample URLs:')
        sample.forEach(u => console.log('   ', u))
    }
} catch (err) {
    console.log('  ❌ Error:', err.response?.status || err.message)
}

// ── STEP 3: AIxploria WP REST API — DIRECT (no ScraperAPI) ───────────────────
console.log('\n📋 STEP 3: AIxploria WP REST API — direct (no proxy)')
try {
    const { data, headers } = await direct.get(
        'https://www.aixploria.com/wp-json/wp/v2/posts?per_page=3&page=1&_embed=1&status=publish',
        { headers: { Accept: 'application/json' } }
    )
    const totalPages = headers['x-wp-totalpages']
    const totalPosts = headers['x-wp-total']
    console.log(`  ✅ WP REST API working! Total posts: ${totalPosts}, Pages: ${totalPages}`)
    if (Array.isArray(data) && data.length > 0) {
        console.log(`  Sample: "${data[0].title?.rendered}" → ${data[0].link}`)
    }
} catch (err) {
    console.log(`  ❌ Direct failed: ${err.response?.status || err.message}`)
    // Try via ScraperAPI
    console.log('  → Trying via ScraperAPI...')
    try {
        const { data } = await scraperGet(
            'https://www.aixploria.com/wp-json/wp/v2/posts?per_page=3&page=1&_embed=1&status=publish',
            { json: true }
        )
        console.log(`  ✅ ScraperAPI worked! Posts: ${Array.isArray(data) ? data.length : 'N/A'}`)
    } catch (e2) {
        console.log(`  ❌ ScraperAPI also failed: ${e2.response?.status || e2.message}`)
    }
}

// ── STEP 4: TAAFT via ScraperAPI with render: true ───────────────────────────
console.log('\n📋 STEP 4: TAAFT — ScraperAPI render:true')
try {
    const { data } = await scraperGet('https://theresanaiforthat.com/sitemap.xml', {
        render: true,
        extraHeaders: { Accept: 'application/xml, text/xml' }
    })
    const $ = cheerio.load(data, { xmlMode: true })
    const urls = []
    $('url loc, sitemap loc').each((_, el) => { if (urls.length < 10) urls.push($(el).text().trim()) })
    console.log(`  ✅ Got ${urls.length > 0 ? 'URLs' : 'response but no URLs'}:`)
    urls.forEach(u => console.log('   ', u))
} catch (err) {
    console.log(`  ❌ TAAFT render failed: ${err.response?.status || err.message}`)
}

console.log('\n✅ Diagnosis complete')
