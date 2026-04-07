/**
 * aixploriaCrawler.js
 * Crawls AIxploria (aixploria.com) for AI tool listings.
 *
 * AIxploria is a WordPress-based directory that uses standard
 * pagination via ?paged=N URL params. Tool cards follow a
 * predictable HTML structure.
 *
 * Polite crawling: 1.5s delay between requests.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const BASE_URL = 'https://www.aixploria.com'
const DELAY_MS = parseInt(process.env.CRAWLER_DELAY_MS || '1500')
const USER_AGENT = process.env.CRAWLER_USER_AGENT || 'IntelliGrid/1.0 (+https://intelligrid.online)'

const httpClient = axios.create({
    timeout: 20000,
    headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    },
})

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

/**
 * Scrapes a single AIxploria tool detail page for extended data.
 * Falls back gracefully if detail page is unavailable.
 */
async function scrapeAixploraDetail(toolUrl) {
    try {
        const { data: html } = await httpClient.get(toolUrl)
        const $ = cheerio.load(html)

        const officialUrl = $('a').filter((_, el) => {
            const href = $(el).attr('href') || ''
            const text = $(el).text().toLowerCase().trim()
            return (text.includes('visit') || text.includes('try') || text.includes('access') || text.includes('open'))
                && href.startsWith('http')
                && !href.includes('aixploria.com')
        }).first().attr('href')

        const fullDescription = $('[class*="entry-content"], [class*="tool-description"], .post-content')
            .first().text().trim()

        const logo = $('meta[property="og:image"]').attr('content')
            || $('[class*="tool-logo"] img, .entry-thumbnail img').first().attr('src')

        const tags = []
        $('[class*="tag"], [rel="tag"], [class*="category"] a').each((_, el) => {
            const text = $(el).text().trim()
            if (text && text.length < 50 && !text.toLowerCase().includes('aixploria')) {
                tags.push(text)
            }
        })

        return { officialUrl, fullDescription, logo, tags }
    } catch {
        return {}
    }
}

/**
 * Main AIxploria crawler entry point.
 * Paginates through listing pages and scrapes tool data.
 *
 * @param {{ maxPages: number, onProgress: Function }} options
 * @returns {Promise<Array>} Raw tool objects ready for normalizeToSchema()
 */
export async function crawlAixploria({ maxPages = 50, onProgress } = {}) {
    console.log('[AIxploria] Starting crawl...')
    const results = []
    let page = 1

    while (page <= maxPages) {
        try {
            // AIxploria uses WordPress pagination via ?paged=N
            const url = page === 1
                ? `${BASE_URL}/en/ultimate-list/`
                : `${BASE_URL}/en/ultimate-list/?paged=${page}`

            const { data: html } = await httpClient.get(url)
            const $ = cheerio.load(html)

            const toolCards = $('.tool-item, .ai-tool-card, article.post, .entry-item').toArray()

            if (toolCards.length === 0) {
                console.log(`[AIxploria] Page ${page}: no tool cards found — stopping`)
                break
            }

            let pageCount = 0
            for (const card of toolCards) {
                const $card = $(card)

                const name = $card.find('h2, h3, .tool-title, .entry-title').first().text().trim()
                const cardLink = $card.find('a').first().attr('href')
                const description = $card.find('p, .tool-description, .entry-summary').first().text().trim()
                const category = $card.find('[class*="category"] a, [class*="tag"]').first().text().trim()

                if (!name || !cardLink) continue

                // Fetch the tool's detail page for the official URL
                const detailUrl = cardLink.startsWith('http') ? cardLink : `${BASE_URL}${cardLink}`

                let officialUrl = null
                let logo = null
                let fullDescription = null
                let detailTags = []

                // Only fetch detail page if it's an AIxploria internal page
                if (detailUrl.includes('aixploria.com')) {
                    await sleep(DELAY_MS)
                    const detail = await scrapeAixploraDetail(detailUrl)
                    officialUrl = detail.officialUrl
                    logo = detail.logo
                    fullDescription = detail.fullDescription
                    detailTags = detail.tags || []
                } else {
                    officialUrl = detailUrl
                }

                if (!officialUrl) continue

                results.push({
                    name,
                    officialUrl: officialUrl.split('?')[0],
                    shortDescription: description.substring(0, 499),
                    fullDescription: fullDescription || null,
                    category,
                    tags: detailTags.slice(0, 10),
                    pricing: 'Unknown', // AIxploria doesn't consistently show pricing
                    logo,
                    source: 'aixploria',
                    sourceUrl: detailUrl,
                })
                pageCount++
            }

            console.log(`[AIxploria] Page ${page}: scraped ${pageCount} tools (total: ${results.length})`)
            if (onProgress) onProgress({ page, found: results.length })

            page++
            await sleep(DELAY_MS)
        } catch (err) {
            if (err.response?.status === 404) {
                console.log(`[AIxploria] Page ${page}: 404 — end of pagination`)
                break
            }
            console.error(`[AIxploria] Page ${page} error: ${err.message}`)
            break
        }
    }

    console.log(`[AIxploria] Crawl complete — ${results.length} valid tools found`)
    return results
}
