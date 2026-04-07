/**
 * taaftCrawler.js
 * Crawls There's An AI For That (theresanaiforthat.com).
 *
 * TAAFT provides a public XML sitemap — the most reliable extraction method.
 * We parse the sitemap to get all /ai/ tool URLs, then scrape each one
 * for full tool data including task tags, pricing, and ratings.
 *
 * Polite crawling: 2s delay between requests, batch processing of 5 concurrent.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const BASE_URL = 'https://theresanaiforthat.com'
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`
const DELAY_MS = parseInt(process.env.CRAWLER_DELAY_MS || '2000')
const USER_AGENT = process.env.CRAWLER_USER_AGENT || 'IntelliGrid/1.0 (+https://intelligrid.online)'

const httpClient = axios.create({
    timeout: 20000,
    headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xml,*/*;q=0.8',
    },
})

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

/**
 * Fetches and parses the TAAFT sitemap to extract all tool page URLs.
 * Tool pages follow the /ai/[slug]/ pattern.
 */
async function getToolUrlsFromSitemap() {
    try {
        const { data: xml } = await httpClient.get(SITEMAP_URL, {
            headers: { Accept: 'application/xml, text/xml' }
        })
        const $ = cheerio.load(xml, { xmlMode: true })
        const toolUrls = []

        $('url loc').each((_, el) => {
            const loc = $(el).text().trim()
            // Tool detail pages follow /ai/[slug]/ or /ai/[slug] pattern
            if (loc.includes('/ai/') && !loc.endsWith('/ais/') && !loc.includes('/category/')) {
                toolUrls.push(loc)
            }
        })

        console.log(`[TAAFT] Sitemap parsed — found ${toolUrls.length} tool URLs`)
        return toolUrls
    } catch (err) {
        console.error('[TAAFT] Sitemap fetch failed:', err.message)
        return []
    }
}

/**
 * Scrapes a single TAAFT tool detail page.
 * Returns null if the page cannot be fetched or lacks required fields.
 */
async function scrapeToolPage(toolUrl) {
    try {
        const { data: html } = await httpClient.get(toolUrl)
        const $ = cheerio.load(html)

        const name = $('h1').first().text().trim()
            || $('[class*="tool-title"], [class*="ai-name"]').first().text().trim()

        if (!name) return null

        // TAAFT shows the official tool website as "Visit Website" / "Go to site"
        const officialUrl = $('a').filter((_, el) => {
            const href = $(el).attr('href') || ''
            const text = $(el).text().toLowerCase().trim()
            return (text.includes('visit') || text.includes('go to') || text.includes('website') || text.includes('try'))
                && href.startsWith('http')
                && !href.includes('theresanaiforthat.com')
        }).first().attr('href')

        if (!officialUrl) return null

        const description = $('meta[name="description"]').attr('content')
            || $('[class*="description"], [class*="about-text"]').first().text().trim()

        const logo = $('meta[property="og:image"]').attr('content')

        // TAAFT uses "task tags" — shown as category pills
        const tags = []
        $('[class*="task-tag"], [class*="tag"], .badge').each((_, el) => {
            const text = $(el).text().trim()
            if (text && text.length < 50) tags.push(text)
        })

        // Extract pricing from pricing section
        const pricingSection = $('[class*="pricing"], [class*="price-type"]').first().text().trim().toLowerCase()
        let pricing = 'Unknown'
        if (pricingSection.includes('free')) pricing = 'Free'
        else if (pricingSection.includes('freemium')) pricing = 'Freemium'
        else if (pricingSection.includes('paid') || pricingSection.includes('premium')) pricing = 'Paid'
        else if (pricingSection.includes('trial')) pricing = 'Trial'

        // Primary category is the first task tag
        const category = tags[0] || ''

        return {
            name,
            officialUrl: officialUrl.split('?')[0],
            shortDescription: description?.substring(0, 499) || '',
            category,
            tags: tags.slice(0, 10),
            pricing,
            logo,
            source: 'taaft',
            sourceUrl: toolUrl,
        }
    } catch (err) {
        return null
    }
}

/**
 * Main TAAFT crawler entry point.
 * Fetches sitemap → extracts tool URLs → scrapes each in batches.
 *
 * @param {{ maxTools: number, onProgress: Function }} options
 * @returns {Promise<Array>} Raw tool objects ready for normalizeToSchema()
 */
export async function crawlTAAFT({ maxTools = 500, onProgress } = {}) {
    console.log('[TAAFT] Starting crawl via sitemap...')
    const results = []

    const toolUrls = await getToolUrlsFromSitemap()
    if (toolUrls.length === 0) return results

    const urlsToProcess = toolUrls.slice(0, maxTools)
    const BATCH_SIZE = 5

    for (let i = 0; i < urlsToProcess.length; i += BATCH_SIZE) {
        const batch = urlsToProcess.slice(i, i + BATCH_SIZE)

        const batchResults = await Promise.allSettled(batch.map(url => scrapeToolPage(url)))

        batchResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                results.push(result.value)
            }
        })

        if (onProgress) onProgress({ done: i + BATCH_SIZE, total: urlsToProcess.length, found: results.length })

        if ((i / BATCH_SIZE + 1) % 10 === 0) {
            console.log(`[TAAFT] Processed ${Math.min(i + BATCH_SIZE, urlsToProcess.length)}/${urlsToProcess.length} — valid: ${results.length}`)
        }

        await sleep(DELAY_MS)
    }

    console.log(`[TAAFT] Crawl complete — ${results.length} valid tools found`)
    return results
}
