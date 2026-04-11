/**
 * inspectFuturepedia2.js — deeper DOM analysis for App Router structure
 */
import axios from 'axios'
import * as cheerio from 'cheerio'

const httpClient = axios.create({
    timeout: 20000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
    }
})

// ── 1. Check sitemap for tool URLs ────────────────────────────────────────────
console.log('=== SITEMAP CHECK ===')
try {
    const { data: sitemapIndex } = await httpClient.get('https://www.futurepedia.io/sitemap.xml', {
        headers: { Accept: 'application/xml' }
    })
    const $ = cheerio.load(sitemapIndex, { xmlMode: true })
    const sitemaps = []
    $('loc').each((i, el) => sitemaps.push($(el).text()))
    console.log('Sitemap entries:', sitemaps.slice(0, 10))
} catch (e) {
    console.log('Sitemap error:', e.message)
}

// ── 2. Check tool listing page DOM structure ──────────────────────────────────
console.log('\n=== LISTING PAGE DOM ===')
const { data: html } = await httpClient.get('https://www.futurepedia.io/ai-tools?page=1')
const $ = cheerio.load(html)

// Find any links to /tool/ pages
const toolLinks = []
$('a[href]').each((i, el) => {
    const href = $(el).attr('href') || ''
    if (href.startsWith('/tool/') || href.includes('futurepedia.io/tool/')) {
        const name = $(el).text().trim() || $(el).find('h2,h3,p').first().text().trim()
        if (name && !toolLinks.find(t => t.href === href)) {
            toolLinks.push({ href, name: name.slice(0, 60) })
        }
    }
})
console.log('Tool page links found:', toolLinks.length)
console.log('First 5:', toolLinks.slice(0, 5))

// ── 3. Check the Futurepedia API endpoint ─────────────────────────────────────
console.log('\n=== API ENDPOINT CHECK ===')
const apiEndpoints = [
    'https://www.futurepedia.io/api/tools?page=1&limit=20',
    'https://www.futurepedia.io/api/tools?pageSize=20',
    'https://www.futurepedia.io/api/ai-tools?page=1',
    'https://www.futurepedia.io/api/tools/search?query=&page=1',
]
for (const ep of apiEndpoints) {
    try {
        const res = await httpClient.get(ep, { headers: { Accept: 'application/json' } })
        console.log(`✅ ${ep} → ${res.status} | type: ${typeof res.data} | keys: ${Object.keys(res.data || {}).slice(0,5)}`)
        if (Array.isArray(res.data)) console.log('  Array length:', res.data.length, '| First item keys:', Object.keys(res.data[0] || {}))
        break
    } catch (e) {
        console.log(`❌ ${ep} → ${e.response?.status || e.message}`)
    }
}

// ── 4. Try a single tool page to understand structure ─────────────────────────
console.log('\n=== SINGLE TOOL PAGE ===')
if (toolLinks.length > 0) {
    const toolUrl = `https://www.futurepedia.io${toolLinks[0].href}`
    console.log('Fetching:', toolUrl)
    try {
        const { data: toolHtml } = await httpClient.get(toolUrl)
        const $t = cheerio.load(toolHtml)
        const h1 = $t('h1').first().text().trim()
        const desc = $t('meta[name="description"]').attr('content') || ''
        const externalLinks = []
        $t('a[href^="http"]').each((i, el) => {
            const href = $t(el).attr('href') || ''
            if (!href.includes('futurepedia.io')) externalLinks.push(href.slice(0, 80))
        })
        console.log('Tool name (h1):', h1)
        console.log('Description:', desc.slice(0, 120))
        console.log('External links:', externalLinks.slice(0, 5))
    } catch (e) {
        console.log('Tool page error:', e.message)
    }
}
