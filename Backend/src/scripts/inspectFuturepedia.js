/**
 * inspectFuturepedia.js — one-shot HTML structure inspector
 * Fetches the Futurepedia listing page and reports what data patterns exist.
 * No DB writes. Run: node src/scripts/inspectFuturepedia.js
 */
import axios from 'axios'
import * as cheerio from 'cheerio'

const URL = 'https://www.futurepedia.io/ai-tools?page=1'

const r = await axios.get(URL, {
    timeout: 20000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
    }
})

const html = r.data
const $ = cheerio.load(html)

console.log('HTTP Status:', r.status)
console.log('Content-Length:', html.length, 'chars')
console.log()

// Check __NEXT_DATA__
const nextDataRaw = $('#__NEXT_DATA__').html()
if (nextDataRaw) {
    const nd = JSON.parse(nextDataRaw)
    const props = nd?.props?.pageProps
    console.log('✅ __NEXT_DATA__ found')
    console.log('   pageProps keys:', Object.keys(props || {}))
    // Print first tool if any
    const tools = props?.tools || props?.data?.tools || props?.initialTools
    console.log('   tools array:', tools ? `${tools.length} items` : 'NOT FOUND')
    if (tools?.[0]) console.log('   First tool keys:', Object.keys(tools[0]))
    // Print raw excerpt
    console.log('   Raw pageProps snippet:', JSON.stringify(props).slice(0, 500))
} else {
    console.log('❌ No __NEXT_DATA__ — site may have moved to App Router (RSC)')
}

// Check for tool cards in HTML
const cards = $('[class*="ToolCard"], [class*="tool-card"], [class*="CardItem"], article, [data-testid*="tool"]')
console.log('\nHTML tool cards found:', cards.length)

// Check for JSON-LD structured data
const jsonLd = $('script[type="application/ld+json"]')
console.log('JSON-LD blocks:', jsonLd.length)
if (jsonLd.length > 0) {
    try {
        const ld = JSON.parse(jsonLd.first().html())
        console.log('JSON-LD type:', ld['@type'])
    } catch {}
}

// Check for Next.js App Router RSC payload
const hasRSC = html.includes('"rsc"') || html.includes('__RSC_')
console.log('RSC (App Router) detected:', hasRSC)

// Check h2/h3 tags for tool names
const headings = []
$('h2, h3').each((i, el) => { if (i < 10) headings.push($(el).text().trim()) })
console.log('\nFirst 10 h2/h3 headings:', headings)

// Print a snippet of the raw HTML to see structure
console.log('\n--- HTML body snippet (first 2000 chars) ---')
console.log($('body').html()?.slice(0, 2000))
