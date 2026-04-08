/**
 * taaftCrawler.js
 * Crawls There's An AI For That (theresanaiforthat.com).
 *
 * Strategy:
 *  1. Fetch the sitemap index to find the tools sitemap URL
 *  2. Parse the tools sitemap XML to get all /ai/[slug] URLs
 *  3. For each tool URL, scrape the page extracting:
 *     - Tool name from <h1>
 *     - Official URL from the CTA button (TAAFT uses /r?u= redirect URLs)
 *     - Description from meta tag
 *     - Task tags from category pills
 *     - Pricing from pricing badge
 *
 * NOTE: TAAFT wraps all outbound links as /r?u=<encoded_url> or
 * https://theresanaiforthat.com/r?u=... — we decode these to get
 * the real tool website URL.
 *
 * Polite crawling: 2s delay between requests, batch of 3 concurrent.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const BASE_URL = 'https://theresanaiforthat.com'
const DELAY_MS = parseInt(process.env.CRAWLER_DELAY_MS || '2000')
const USER_AGENT = process.env.CRAWLER_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

const httpClient = axios.create({
    timeout: 25000,
    maxRedirects: 0,  // Don't follow redirects — we want to decode /r?u= ourselves
    validateStatus: s => s < 400,
    headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    },
})

const httpClientFollow = axios.create({
    timeout: 25000,
    headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    },
})

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

/**
 * Decodes a TAAFT redirect URL to get the actual tool website.
 * TAAFT uses patterns like:
 *   /r?u=https%3A%2F%2Factual-website.com
 *   https://theresanaiforthat.com/r?u=https%3A%2F%2F...
 */
function decodeTaaftRedirect(href) {
    if (!href) return null
    try {
        // Handle /r?u= pattern
        if (href.includes('/r?u=') || href.includes('/r/?u=')) {
            const urlParam = new URL(href.startsWith('http') ? href : `${BASE_URL}${href}`).searchParams.get('u')
            if (urlParam) return decodeURIComponent(urlParam).split('?')[0]
        }
        // Handle absolute external links directly
        if (href.startsWith('http') && !href.includes('theresanaiforthat.com')) {
            return href.split('?')[0]
        }
    } catch {
        return null
    }
    return null
}

/**
 * Fetches the TAAFT sitemap index to find the tools sitemap file.
 * Returns the URL of the tools-specific sitemap, or the main sitemap URL.
 */
async function getToolsSitemapUrl() {
    // Try sitemap index first
    try {
        const { data: xml } = await httpClientFollow.get(`${BASE_URL}/sitemap_index.xml`, {
            headers: { Accept: 'application/xml, text/xml' }
        })
        const $ = cheerio.load(xml, { xmlMode: true })
        // Find the ai-tools sitemap
        let toolsSitemap = null
        $('sitemap loc').each((_, el) => {
            const loc = $(el).text().trim()
            if (loc.includes('ai') || loc.includes('tool')) {
                toolsSitemap = loc
                return false // break
            }
        })
        if (toolsSitemap) return toolsSitemap
    } catch (err) {
        console.warn('[TAAFT] Sitemap index not found:', err.message)
    }

    // Fallback to the direct sitemap.xml
    return `${BASE_URL}/sitemap.xml`
}

/**
 * Parses a TAAFT sitemap XML to extract all /ai/[slug] tool URLs.
 */
async function getToolUrlsFromSitemap() {
    try {
        const sitemapUrl = await getToolsSitemapUrl()
        console.log(`[TAAFT] Fetching sitemap: ${sitemapUrl}`)

        const { data: xml } = await httpClientFollow.get(sitemapUrl, {
            headers: { Accept: 'application/xml, text/xml' }
        })
        const $ = cheerio.load(xml, { xmlMode: true })
        const toolUrls = []

        $('url loc').each((_, el) => {
            const loc = $(el).text().trim()
            // Tool detail pages follow the /ai/[slug]/ pattern
            if (/\/ai\/[a-z0-9-]+\/?$/.test(loc)) {
                toolUrls.push(loc)
            }
        })

        // If sitemap has nested sitemaps (sitemap index), recurse
        if (toolUrls.length === 0) {
            $('sitemap loc').each((_, el) => {
                // We'll just return the first sub-sitemap for now
                toolUrls.push($(el).text().trim())
            })
        }

        console.log(`[TAAFT] Sitemap parsed — found ${toolUrls.length} potential tool URLs`)
        return toolUrls
    } catch (err) {
        console.error('[TAAFT] Sitemap fetch failed:', err.message)
        return []
    }
}

/**
 * Scrapes a single TAAFT tool detail page.
 * The critical fix: properly decodes /r?u= redirect links for officialUrl.
 */
async function scrapeToolPage(toolUrl) {
    try {
        const { data: html } = await httpClientFollow.get(toolUrl)
        const $ = cheerio.load(html)

        const name = $('h1').first().text().trim()
        if (!name || name.length < 2) return null

        // TAAFT CTA buttons use /r?u= redirects — find any link with redirect pattern
        let officialUrl = null

        // Strategy 1: Find explicit redirect URLs
        $('a[href]').each((_, el) => {
            const href = $(el).attr('href') || ''
            if (href.includes('/r?u=') || href.includes('/r/?u=')) {
                const decoded = decodeTaaftRedirect(href.startsWith('http') ? href : `${BASE_URL}${href}`)
                if (decoded) { officialUrl = decoded; return false }
            }
        })

        // Strategy 2: Find external links in CTA buttons
        if (!officialUrl) {
            $('a[href]').each((_, el) => {
                const href = $(el).attr('href') || ''
                const text = $(el).text().toLowerCase().trim()
                if ((text.includes('visit') || text.includes('try') || text.includes('open') || text.includes('get') || text.includes('go to'))
                    && href.startsWith('http')
                    && !href.includes('theresanaiforthat.com')) {
                    officialUrl = href.split('?')[0]
                    return false
                }
            })
        }

        // Strategy 3: Find any external http link in the page body
        if (!officialUrl) {
            $('main a[href^="http"]').each((_, el) => {
                const href = $(el).attr('href') || ''
                if (!href.includes('theresanaiforthat.com') && !href.includes('twitter.com')
                    && !href.includes('facebook.com') && !href.includes('instagram.com')) {
                    officialUrl = href.split('?')[0]
                    return false
                }
            })
        }

        if (!officialUrl) return null

        const description = $('meta[name="description"]').attr('content')
            || $('meta[property="og:description"]').attr('content')
            || $('p').first().text().trim()

        const logo = $('meta[property="og:image"]').attr('content')

        // Task/category tags
        const tags = []
        $('[class*="task"], [class*="category"], [class*="tag"], .badge').each((_, el) => {
            const text = $(el).text().trim()
            if (text && text.length < 50 && !text.toLowerCase().includes('theresanai')) {
                tags.push(text)
            }
        })

        // Pricing
        const pricingText = $('[class*="pricing"], [class*="price"], [class*="plan"]').first().text().trim().toLowerCase()
        let pricing = 'Unknown'
        if (pricingText.includes('free') && !pricingText.includes('freemium')) pricing = 'Free'
        else if (pricingText.includes('freemium')) pricing = 'Freemium'
        else if (pricingText.includes('paid') || pricingText.includes('premium') || pricingText.includes('pro')) pricing = 'Paid'
        else if (pricingText.includes('trial')) pricing = 'Trial'

        const category = tags[0] || ''

        return {
            name,
            officialUrl,
            shortDescription: (description || '').substring(0, 499),
            category,
            tags: [...new Set(tags)].slice(0, 10),
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
 *
 * @param {{ maxTools: number, onProgress: Function }} options
 * @returns {Promise<Array>} Raw tool objects ready for normalizeToSchema()
 */
export async function crawlTAAFT({ maxTools = 500, onProgress } = {}) {
    console.log('[TAAFT] Starting crawl via sitemap...')
    const results = []

    const toolUrls = await getToolUrlsFromSitemap()
    if (toolUrls.length === 0) {
        console.warn('[TAAFT] No tool URLs found — check sitemap access')
        return results
    }

    const urlsToProcess = toolUrls.slice(0, maxTools)
    const BATCH_SIZE = 3 // Conservative to avoid rate-limiting

    for (let i = 0; i < urlsToProcess.length; i += BATCH_SIZE) {
        const batch = urlsToProcess.slice(i, i + BATCH_SIZE)

        const batchResults = await Promise.allSettled(batch.map(url => scrapeToolPage(url)))

        batchResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                results.push(result.value)
            }
        })

        if (onProgress) onProgress({ done: Math.min(i + BATCH_SIZE, urlsToProcess.length), total: urlsToProcess.length, found: results.length })

        if ((Math.floor(i / BATCH_SIZE) + 1) % 20 === 0) {
            console.log(`[TAAFT] Processed ${Math.min(i + BATCH_SIZE, urlsToProcess.length)}/${urlsToProcess.length} — valid: ${results.length}`)
        }

        await sleep(DELAY_MS)
    }

    console.log(`[TAAFT] Crawl complete — ${results.length} valid tools from ${urlsToProcess.length} URLs`)
    return results
}
