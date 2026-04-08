/**
 * aixploriaCrawler.js
 * Crawls AIxploria (aixploria.com) for AI tool listings.
 *
 * Strategy: AIxploria is a WordPress site. WordPress exposes a standard
 * public REST API at /wp-json/wp/v2/posts that returns structured JSON
 * — no JS rendering needed. This is far more reliable than CSS scraping.
 *
 * API endpoint: GET /wp-json/wp/v2/posts?per_page=100&page=N&_embed=1
 *   - `_embed=1` includes featured image, taxonomy terms, and author.
 *   - Returns up to 100 posts per page.
 *   - Total pages from X-WP-TotalPages response header.
 *
 * Polite crawling: 1s delay between API pages (JSON, no browser needed).
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const BASE_URL = 'https://www.aixploria.com'
const API_BASE = `${BASE_URL}/wp-json/wp/v2`
const DELAY_MS = parseInt(process.env.CRAWLER_DELAY_MS || '1000')
const USER_AGENT = process.env.CRAWLER_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'

const httpClient = axios.create({
    timeout: 25000,
    headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
    },
})

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

/**
 * Extracts plain text from WordPress HTML content.
 * Strips HTML tags and returns clean text.
 */
function extractPlainText(html = '') {
    if (!html) return ''
    const $ = cheerio.load(html)
    return $.root().text().replace(/\s+/g, ' ').trim().substring(0, 499)
}

/**
 * Extracts the official tool website URL from WordPress post content.
 * AIxploria posts typically contain a "Visit Site" or "Try Now" button link.
 */
function extractOfficialUrl(html = '') {
    if (!html) return null
    const $ = cheerio.load(html)
    let officialUrl = null

    // Priority 1: explicitly labelled CTA buttons
    $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || ''
        const text = $(el).text().toLowerCase().trim()
        if ((text.includes('visit') || text.includes('try') || text.includes('access the tool')
            || text.includes('open') || text.includes('launch') || text.includes('go to'))
            && href.startsWith('http')
            && !href.includes('aixploria.com')) {
            officialUrl = href.split('?')[0]
            return false
        }
    })

    // Priority 2: any external link in the content
    if (!officialUrl) {
        $('a[href^="http"]').each((_, el) => {
            const href = $(el).attr('href') || ''
            if (!href.includes('aixploria.com')
                && !href.includes('twitter.com')
                && !href.includes('facebook.com')
                && !href.includes('instagram.com')
                && !href.includes('linkedin.com')
                && !href.includes('youtube.com')
                && !href.includes('wp-content')) {
                officialUrl = href.split('?')[0]
                return false
            }
        })
    }

    return officialUrl
}

/**
 * Maps a WordPress REST API post object to our standardised raw tool format.
 */
function mapWpPost(post) {
    const content = post.content?.rendered || ''
    const excerpt = post.excerpt?.rendered || ''

    const name = post.title?.rendered
        ? cheerio.load(post.title.rendered).root().text().trim()
        : null
    if (!name) return null

    const officialUrl = extractOfficialUrl(content)
    if (!officialUrl) return null

    // Get featured image from _embedded data
    const logo = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null

    // Get taxonomy tags (categories + tags merged)
    const tags = []
    const terms = post._embedded?.['wp:term'] || []
    terms.forEach(termGroup => {
        termGroup.forEach(term => {
            if (term.name && term.name.length < 50
                && !['uncategorized', 'ai tools'].includes(term.name.toLowerCase())) {
                tags.push(term.name)
            }
        })
    })

    const shortDescription = extractPlainText(excerpt || content)
    const category = tags[0] || ''

    return {
        name,
        officialUrl,
        shortDescription,
        category,
        tags: [...new Set(tags)].slice(0, 10),
        pricing: 'Unknown', // AIxploria doesn't consistently expose pricing in data
        logo,
        source: 'aixploria',
        sourceUrl: post.link || `${BASE_URL}/?p=${post.id}`,
    }
}

/**
 * Fetches one page of WordPress posts from the AIxploria REST API.
 * Returns { posts, totalPages }.
 */
async function fetchApiPage(page) {
    const url = `${API_BASE}/posts?per_page=100&page=${page}&_embed=1&status=publish`
    try {
        const response = await httpClient.get(url)
        const posts = response.data
        const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1', 10)
        return { posts, totalPages }
    } catch (err) {
        if (err.response?.status === 400) {
            // WordPress returns 400 when page > totalPages — safe to stop
            return { posts: [], totalPages: 0 }
        }
        console.error(`[AIxploria] API page ${page} error: ${err.message}`)
        return { posts: [], totalPages: 0 }
    }
}

/**
 * Main AIxploria crawler entry point.
 * Uses the WordPress REST API for reliable, JS-free data extraction.
 *
 * @param {{ maxPages: number, onProgress: Function }} options
 * @returns {Promise<Array>} Raw tool objects ready for normalizeToSchema()
 */
export async function crawlAixploria({ maxPages = 50, onProgress } = {}) {
    console.log('[AIxploria] Starting crawl via WordPress REST API...')
    const results = []
    let page = 1
    let totalPages = null

    while (page <= maxPages) {
        const { posts, totalPages: tp } = await fetchApiPage(page)

        if (totalPages === null) totalPages = Math.min(tp, maxPages)

        if (!posts || posts.length === 0) {
            console.log(`[AIxploria] Page ${page}: no posts returned — stopping`)
            break
        }

        let pageValid = 0
        for (const post of posts) {
            const mapped = mapWpPost(post)
            if (mapped) { results.push(mapped); pageValid++ }
        }

        console.log(`[AIxploria] Page ${page}/${totalPages || '?'}: ${posts.length} posts, ${pageValid} valid tools (total: ${results.length})`)
        if (onProgress) onProgress({ page, totalPages, found: results.length })

        if (page >= (totalPages || 1)) break
        page++
        await sleep(DELAY_MS)
    }

    console.log(`[AIxploria] Crawl complete — ${results.length} valid tools found`)
    return results
}
