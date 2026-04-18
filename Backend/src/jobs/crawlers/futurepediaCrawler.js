/**
 * futurepediaCrawler.js
 * Crawls Futurepedia (futurepedia.io) for AI tool listings.
 *
 * Strategy (Cloudflare-safe):
 *  1. Fetch sitemap index → find tools sitemap URL
 *  2. Parse tools sitemap XML → extract all /tool/[slug] URLs
 *  3. For each tool URL, scrape the detail page extracting:
 *     - Tool name from <h1>
 *     - Official URL from CTA button
 *     - Description from meta tags / og:description
 *     - Category and tags from page content
 *     - Pricing from pricing section
 *
 * WHY SITEMAP: Futurepedia uses Cloudflare. Sitemaps are served
 * without JS challenge pages because they're intended for search
 * engine bots. This is the same approach used by TAAFT crawler.
 *
 * Polite crawling: 1.5s delay between requests.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const BASE_URL = 'https://www.futurepedia.io'
const DELAY_MS = parseInt(process.env.CRAWLER_DELAY_MS || '1500')

// Realistic browser headers to minimise Cloudflare blocks on detail pages
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
    'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
}

const httpClient = axios.create({ timeout: 25000, headers: HEADERS })

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

/**
 * Fetches the sitemap index and returns the URL of the tools sitemap.
 * Futurepedia typically has sitemap-0.xml, sitemap.xml, or a sitemap index.
 */
async function getToolSitemapUrls() {
    const sitemapCandidates = [
        `${BASE_URL}/sitemap.xml`,
        `${BASE_URL}/sitemap-0.xml`,
        `${BASE_URL}/sitemap_index.xml`,
    ]

    for (const sitemapUrl of sitemapCandidates) {
        try {
            console.log(`[Futurepedia] Trying sitemap: ${sitemapUrl}`)
            const { data: xml } = await httpClient.get(sitemapUrl, {
                headers: { ...HEADERS, Accept: 'application/xml, text/xml, */*' }
            })

            const $ = cheerio.load(xml, { xmlMode: true })
            const toolUrls = []

            // Case 1: sitemap index — find the tools sub-sitemap and recurse
            const subSitemaps = []
            $('sitemap loc').each((_, el) => {
                subSitemaps.push($(el).text().trim())
            })

            if (subSitemaps.length > 0) {
                console.log(`[Futurepedia] Found sitemap index with ${subSitemaps.length} sub-sitemaps`)
                // Look for the tools-specific sitemap
                const toolSitemap = subSitemaps.find(s =>
                    s.includes('tool') || s.includes('ai-tool') || s.includes('app')
                ) || subSitemaps[0]

                const { data: subXml } = await httpClient.get(toolSitemap, {
                    headers: { ...HEADERS, Accept: 'application/xml, text/xml, */*' }
                })
                const $sub = cheerio.load(subXml, { xmlMode: true })
                $sub('url loc').each((_, el) => {
                    const loc = $sub(el).text().trim()
                    if (loc.includes('/tool/') || loc.includes('/ai/')) {
                        toolUrls.push(loc)
                    }
                })

                if (toolUrls.length > 0) {
                    console.log(`[Futurepedia] Found ${toolUrls.length} tool URLs from sub-sitemap`)
                    return toolUrls
                }
            }

            // Case 2: flat sitemap — extract tool URLs directly
            $('url loc').each((_, el) => {
                const loc = $(el).text().trim()
                if (loc.includes('/tool/') || loc.includes('/ai/')) {
                    toolUrls.push(loc)
                }
            })

            if (toolUrls.length > 0) {
                console.log(`[Futurepedia] Found ${toolUrls.length} tool URLs from ${sitemapUrl}`)
                return toolUrls
            }

        } catch (err) {
            console.warn(`[Futurepedia] Sitemap ${sitemapUrl} failed: ${err.message}`)
        }
    }

    console.warn('[Futurepedia] All sitemap candidates failed — site may be fully blocking requests')
    return []
}

/**
 * Scrapes a single Futurepedia tool detail page.
 */
async function scrapeToolPage(toolUrl) {
    try {
        const { data: html } = await httpClient.get(toolUrl)
        const $ = cheerio.load(html)

        // Try __NEXT_DATA__ first (fastest when available)
        const nextDataScript = $('#__NEXT_DATA__').html()
        if (nextDataScript) {
            try {
                const nextData = JSON.parse(nextDataScript)
                const props = nextData?.props?.pageProps
                const tool = props?.tool || props?.data?.tool || props?.pageData
                if (tool?.name && (tool?.url || tool?.website)) {
                    return {
                        name: tool.name.trim(),
                        officialUrl: (tool.url || tool.website || '').split('?')[0],
                        shortDescription: (tool.description || tool.shortDescription || '').substring(0, 499),
                        category: tool.category?.name || tool.categories?.[0]?.name || '',
                        tags: (tool.tags || tool.categories || []).map(t => t?.name || t).filter(Boolean).slice(0, 10),
                        pricing: normalizePricing(tool.pricing || tool.pricingType || ''),
                        logo: tool.logo || tool.thumbnail || tool.image || $('meta[property="og:image"]').attr('content') || null,
                        source: 'futurepedia',
                        sourceUrl: toolUrl,
                    }
                }
            } catch { /* fall through to HTML scraping */ }
        }

        // Fallback: scrape from HTML meta tags and page structure
        const name = $('h1').first().text().trim()
            || $('title').text().split('|')[0].trim()
            || $('meta[property="og:title"]').attr('content')?.split('|')[0].trim()

        if (!name || name.length < 2) return null

        const description = $('meta[name="description"]').attr('content')
            || $('meta[property="og:description"]').attr('content')
            || $('p').first().text().trim()

        const logo = $('meta[property="og:image"]').attr('content') || null

        // Find the official tool URL — look for external CTA links
        let officialUrl = null
        $('a[href]').each((_, el) => {
            const href = $(el).attr('href') || ''
            const text = $(el).text().toLowerCase().trim()
            if ((text.includes('visit') || text.includes('try') || text.includes('open') || text.includes('get started') || text.includes('use it'))
                && href.startsWith('http')
                && !href.includes('futurepedia.io')) {
                officialUrl = href.split('?')[0]
                return false
            }
        })

        // Second pass: any external link
        if (!officialUrl) {
            $('a[href^="http"]').each((_, el) => {
                const href = $(el).attr('href') || ''
                if (!href.includes('futurepedia.io')
                    && !href.includes('twitter.com') && !href.includes('t.co')
                    && !href.includes('linkedin.com') && !href.includes('youtube.com')
                    && !href.includes('instagram.com') && !href.includes('facebook.com')) {
                    officialUrl = href.split('?')[0]
                    return false
                }
            })
        }

        if (!officialUrl) return null

        const tags = []
        $('[class*="tag"], [class*="category"], [class*="badge"], [class*="pill"]').each((_, el) => {
            const text = $(el).text().trim()
            if (text && text.length < 50) tags.push(text)
        })

        const pricingText = $('[class*="pricing"], [class*="price"], [class*="plan"]').first().text().toLowerCase()

        return {
            name,
            officialUrl,
            shortDescription: (description || '').substring(0, 499),
            category: tags[0] || '',
            tags: [...new Set(tags)].slice(0, 10),
            pricing: normalizePricing(pricingText),
            logo,
            source: 'futurepedia',
            sourceUrl: toolUrl,
        }
    } catch (err) {
        return null
    }
}

function normalizePricing(raw = '') {
    const r = raw.toLowerCase()
    if (r.includes('freemium') || (r.includes('free') && r.includes('paid'))) return 'Freemium'
    if (r.includes('free')) return 'Free'
    if (r.includes('trial')) return 'Trial'
    if (r.includes('paid') || r.includes('premium') || r.includes('pro')) return 'Paid'
    return 'Unknown'
}

/**
 * Main crawler entry point for Futurepedia.
 *
 * @param {{ maxPages: number, maxTools: number, onProgress: Function }} options
 * @returns {Promise<Array>} Raw tool objects ready for normalizeToSchema()
 */
export async function crawlFuturepedia({ maxPages = 30, maxTools = 300, onProgress } = {}) {
    console.log('[Futurepedia] Starting crawl via sitemap (Cloudflare-safe)...')

    const toolUrls = await getToolSitemapUrls()

    if (toolUrls.length === 0) {
        console.warn('[Futurepedia] No tool URLs found from sitemap. Site may be blocking all requests.')
        return []
    }

    const urlsToProcess = toolUrls.slice(0, maxTools)
    console.log(`[Futurepedia] Processing ${urlsToProcess.length} tool URLs...`)

    const results = []
    const BATCH_SIZE = 3

    for (let i = 0; i < urlsToProcess.length; i += BATCH_SIZE) {
        const batch = urlsToProcess.slice(i, i + BATCH_SIZE)

        const batchResults = await Promise.allSettled(batch.map(url => scrapeToolPage(url)))

        batchResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                results.push(result.value)
            }
        })

        if (onProgress) onProgress({ done: Math.min(i + BATCH_SIZE, urlsToProcess.length), total: urlsToProcess.length, found: results.length })

        if ((Math.floor(i / BATCH_SIZE) + 1) % 10 === 0) {
            console.log(`[Futurepedia] Progress: ${Math.min(i + BATCH_SIZE, urlsToProcess.length)}/${urlsToProcess.length} — valid: ${results.length}`)
        }

        await sleep(DELAY_MS)
    }

    console.log(`[Futurepedia] Crawl complete — ${results.length} valid tools from ${urlsToProcess.length} URLs`)
    return results
}
