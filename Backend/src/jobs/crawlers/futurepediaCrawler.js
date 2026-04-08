/**
 * futurepediaCrawler.js
 * Crawls Futurepedia (futurepedia.io) for AI tool listings.
 *
 * Strategy: Futurepedia is built on Next.js. Every page embeds the full
 * page dataset as a JSON blob inside a <script id="__NEXT_DATA__"> tag.
 * We read the listing page, extract __NEXT_DATA__, and pull tool data
 * without needing JS execution.
 *
 * Fallback: If __NEXT_DATA__ structure changes, we also try the Futurepedia
 * public sitemap XML as a secondary URL discovery method.
 *
 * Polite crawling: 1.5s delay between requests.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const BASE_URL = 'https://www.futurepedia.io'
const DELAY_MS = parseInt(process.env.CRAWLER_DELAY_MS || '1500')
const USER_AGENT = process.env.CRAWLER_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

const httpClient = axios.create({
    timeout: 25000,
    headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
    },
})

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

/**
 * Extracts __NEXT_DATA__ JSON from a Futurepedia HTML page.
 * Returns the parsed tools array from pageProps or null.
 */
function extractNextData(html) {
    try {
        const $ = cheerio.load(html)
        const nextDataScript = $('#__NEXT_DATA__').html()
        if (!nextDataScript) return null
        const nextData = JSON.parse(nextDataScript)
        // Tools are in pageProps.tools or pageProps.data.tools
        const props = nextData?.props?.pageProps
        return props?.tools || props?.data?.tools || props?.initialTools || null
    } catch {
        return null
    }
}

/**
 * Maps a raw Futurepedia tool object from __NEXT_DATA__ to our standardised format.
 */
function mapFuturepediaTool(tool) {
    if (!tool?.name || !tool?.url) return null

    const tags = []
    if (Array.isArray(tool.categories)) tags.push(...tool.categories.map(c => c.name || c).filter(Boolean))
    if (Array.isArray(tool.tags)) tags.push(...tool.tags.map(t => t.name || t).filter(Boolean))
    if (Array.isArray(tool.useCases)) tags.push(...tool.useCases.map(u => u.name || u).filter(Boolean))

    const pricing = (() => {
        const raw = (tool.pricing || tool.pricingType || '').toLowerCase()
        if (raw.includes('free')) return raw.includes('mium') ? 'Freemium' : 'Free'
        if (raw.includes('paid') || raw.includes('premium')) return 'Paid'
        if (raw.includes('trial')) return 'Trial'
        return 'Unknown'
    })()

    return {
        name: tool.name.trim(),
        officialUrl: (tool.url || tool.website || '').split('?')[0],
        shortDescription: (tool.description || tool.shortDescription || '').substring(0, 499),
        category: tool.category?.name || tool.categories?.[0]?.name || tool.categories?.[0] || '',
        tags: [...new Set(tags)].slice(0, 10),
        pricing,
        logo: tool.logo || tool.thumbnail || tool.image || null,
        source: 'futurepedia',
        sourceUrl: `${BASE_URL}/tool/${tool.slug || ''}`,
    }
}

/**
 * Crawls one Futurepedia listing page and extracts tools via __NEXT_DATA__.
 */
async function crawlListingPage(page, onProgress) {
    const url = `${BASE_URL}/ai-tools?page=${page}`
    try {
        const { data: html } = await httpClient.get(url)
        const tools = extractNextData(html)

        if (!tools || tools.length === 0) {
            // Try fallback: scrape tool links from HTML for URL collection
            const $ = cheerio.load(html)
            const slugs = new Set()
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href') || ''
                const match = href.match(/\/tool\/([a-z0-9_-]+)/i)
                if (match) slugs.add(match[1])
            })
            if (slugs.size > 0) {
                console.log(`[Futurepedia] Page ${page}: found ${slugs.size} tool slugs via HTML fallback`)
                return { tools: [], slugs: [...slugs] }
            }
            console.log(`[Futurepedia] Page ${page}: no tools in __NEXT_DATA__ and no slugs in HTML`)
            return { tools: [], slugs: [] }
        }

        console.log(`[Futurepedia] Page ${page}: found ${tools.length} tools via __NEXT_DATA__`)
        if (onProgress) onProgress({ page, found: tools.length })
        return { tools, slugs: [] }
    } catch (err) {
        console.error(`[Futurepedia] Page ${page} error: ${err.message}`)
        return { tools: [], slugs: [] }
    }
}

/**
 * Scrapes a single tool detail page for data when API returns slugs only.
 */
async function scrapeToolDetailPage(slug) {
    try {
        const url = `${BASE_URL}/tool/${slug}`
        const { data: html } = await httpClient.get(url)
        const tools = extractNextData(html)
        if (tools) return mapFuturepediaTool(Array.isArray(tools) ? tools[0] : tools)

        // Fallback: parse HTML fields from OG meta + structured data
        const $ = cheerio.load(html)
        const name = $('h1').first().text().trim() || $('title').text().split('|')[0].trim()
        const description = $('meta[name="description"]').attr('content') || ''
        const officialUrl = $('a[href*="http"]').filter((_, el) => {
            const text = $(el).text().toLowerCase()
            return (text.includes('visit') || text.includes('website') || text.includes('try'))
                && !$(el).attr('href').includes('futurepedia.io')
        }).first().attr('href')

        if (!name || !officialUrl) return null
        return {
            name, officialUrl: officialUrl.split('?')[0],
            shortDescription: description.substring(0, 499),
            category: '', tags: [], pricing: 'Unknown', logo: null,
            source: 'futurepedia', sourceUrl: `${BASE_URL}/tool/${slug}`,
        }
    } catch {
        return null
    }
}

/**
 * Main crawler entry point for Futurepedia.
 *
 * @param {{ maxPages: number, maxTools: number, onProgress: Function }} options
 * @returns {Promise<Array>} Raw tool objects ready for normalizeToSchema()
 */
export async function crawlFuturepedia({ maxPages = 30, maxTools = 500, onProgress } = {}) {
    console.log('[Futurepedia] Starting crawl via __NEXT_DATA__ extraction...')
    const results = []
    const slugsToScrape = []
    let totalFromApi = 0

    for (let page = 1; page <= maxPages && results.length + slugsToScrape.length < maxTools; page++) {
        const { tools, slugs } = await crawlListingPage(page, onProgress)

        for (const t of tools) {
            const mapped = mapFuturepediaTool(t)
            if (mapped) results.push(mapped)
        }
        slugsToScrape.push(...slugs)
        totalFromApi += tools.length

        // If we got 0 from both methods, site may be blocking — stop
        if (tools.length === 0 && slugs.length === 0) break

        await sleep(DELAY_MS)
    }

    // Scrape detail pages for any slugs found via HTML fallback
    if (slugsToScrape.length > 0) {
        console.log(`[Futurepedia] Scraping ${slugsToScrape.length} detail pages for enrichment...`)
        for (const slug of slugsToScrape.slice(0, maxTools - results.length)) {
            const tool = await scrapeToolDetailPage(slug)
            if (tool) results.push(tool)
            await sleep(DELAY_MS)
        }
    }

    console.log(`[Futurepedia] Crawl complete — ${results.length} valid tools found (${totalFromApi} via API, ${slugsToScrape.length} via HTML)`)
    return results
}
