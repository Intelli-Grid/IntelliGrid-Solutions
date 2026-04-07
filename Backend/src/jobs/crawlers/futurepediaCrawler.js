/**
 * futurepediaCrawler.js
 * Crawls Futurepedia (futurepedia.io) for AI tool listings.
 *
 * Futurepedia uses a Next.js frontend with SSR. The tool listings
 * are accessible via their category/listing pages. We use the
 * sitemap to get all tool detail URLs, then scrape each one.
 *
 * Crawl strategy:
 *  1. Fetch sitemap index to find tool URL patterns
 *  2. Paginate listing pages to collect tool slugs
 *  3. For each tool, fetch the detail page for full metadata
 *  4. Return normalized raw tool array
 *
 * Polite crawling: 1.5s delay between requests, identifies itself via User-Agent.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const BASE_URL = 'https://www.futurepedia.io'
const DELAY_MS = parseInt(process.env.CRAWLER_DELAY_MS || '1500')
const USER_AGENT = process.env.CRAWLER_USER_AGENT || 'IntelliGrid/1.0 (+https://intelligrid.online)'

const httpClient = axios.create({
    timeout: 20000,
    headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
    },
})

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

/**
 * Scrapes a single Futurepedia tool detail page for full metadata.
 * Returns null if the page cannot be fetched or lacks required fields.
 */
async function scrapeToolDetailPage(toolUrl) {
    try {
        const { data: html } = await httpClient.get(toolUrl)
        const $ = cheerio.load(html)

        const name = $('h1').first().text().trim()
            || $('[class*="tool-name"], [class*="toolName"]').first().text().trim()

        if (!name) return null

        // Extract the official/external URL (link to the actual tool website)
        const officialUrl = $('a[href*="http"]').filter((_, el) => {
            const href = $(el).attr('href') || ''
            const text = $(el).text().toLowerCase()
            return (text.includes('visit') || text.includes('try') || text.includes('open') || text.includes('website'))
                && !href.includes('futurepedia.io')
        }).first().attr('href')
            || $('[class*="visit"], [class*="external"]').first().attr('href')

        if (!officialUrl || officialUrl.includes('futurepedia.io')) return null

        const description = $('meta[name="description"]').attr('content')
            || $('[class*="description"], [class*="about"]').first().text().trim()

        const logo = $('meta[property="og:image"]').attr('content')
            || $('[class*="logo"] img').first().attr('src')

        // Extract tags/categories from tag pills
        const tags = []
        $('[class*="tag"], [class*="badge"], [class*="category-pill"]').each((_, el) => {
            const text = $(el).text().trim()
            if (text && text.length < 40 && !text.includes('Futurepedia')) {
                tags.push(text)
            }
        })

        // Extract pricing
        const pricingEl = $('[class*="pricing"], [class*="price"]').first().text().trim()

        // Extract category from breadcrumb or meta tags
        const category = $('[class*="breadcrumb"] a').last().text().trim()
            || $('meta[property="article:section"]').attr('content')
            || ''

        return {
            name,
            officialUrl: officialUrl.split('?')[0], // Strip tracking params
            shortDescription: description?.substring(0, 499) || '',
            category,
            tags: tags.slice(0, 10),
            pricing: pricingEl,
            logo,
            source: 'futurepedia',
            sourceUrl: toolUrl,
        }
    } catch (err) {
        return null // Non-fatal — skip this tool and continue
    }
}

/**
 * Crawls Futurepedia listing pages to collect all tool detail page URLs.
 */
async function collectToolUrls({ maxPages = 50, onProgress } = {}) {
    const toolUrls = new Set()
    let page = 1

    while (page <= maxPages) {
        try {
            const url = `${BASE_URL}/ai-tools?page=${page}`
            const { data: html } = await httpClient.get(url)
            const $ = cheerio.load(html)

            let foundOnPage = 0

            // Futurepedia tool cards link to /tool/[slug]
            $('a[href*="/tool/"]').each((_, el) => {
                const href = $(el).attr('href')
                if (href) {
                    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`
                    if (!toolUrls.has(fullUrl)) {
                        toolUrls.add(fullUrl)
                        foundOnPage++
                    }
                }
            })

            if (foundOnPage === 0) {
                console.log(`[Futurepedia] Page ${page}: no new tools found — stopping pagination`)
                break
            }

            if (onProgress) onProgress({ page, collected: toolUrls.size })
            console.log(`[Futurepedia] Page ${page}: found ${foundOnPage} tool URLs (total: ${toolUrls.size})`)

            page++
            await sleep(DELAY_MS)
        } catch (err) {
            console.error(`[Futurepedia] Listing page ${page} error: ${err.message}`)
            break
        }
    }

    return [...toolUrls]
}

/**
 * Main crawler entry point.
 * Collects tool listings then scrapes each detail page for full metadata.
 *
 * @param {{ maxPages: number, maxTools: number, onProgress: Function }} options
 * @returns {Promise<Array>} Raw tool objects ready for normalizeToSchema()
 */
export async function crawlFuturepedia({ maxPages = 30, maxTools = 500, onProgress } = {}) {
    console.log('[Futurepedia] Starting crawl...')
    const results = []

    // Step 1: collect all tool detail page URLs
    const toolUrls = await collectToolUrls({ maxPages, onProgress })
    console.log(`[Futurepedia] Collected ${toolUrls.length} tool URLs`)

    // Step 2: scrape each detail page (with polite delay)
    const urlsToScrape = toolUrls.slice(0, maxTools)
    for (let i = 0; i < urlsToScrape.length; i++) {
        const toolData = await scrapeToolDetailPage(urlsToScrape[i])
        if (toolData) results.push(toolData)

        if (onProgress) onProgress({ phase: 'detail', done: i + 1, total: urlsToScrape.length, found: results.length })

        if ((i + 1) % 20 === 0) {
            console.log(`[Futurepedia] Scraped ${i + 1}/${urlsToScrape.length} — valid: ${results.length}`)
        }

        await sleep(DELAY_MS)
    }

    console.log(`[Futurepedia] Crawl complete — ${results.length} valid tools found`)
    return results
}
