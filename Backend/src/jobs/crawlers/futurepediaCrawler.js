/**
 * futurepediaCrawler.js
 * Crawls Futurepedia (futurepedia.io) for AI tool listings.
 *
 * Strategy (confirmed working as of April 2026):
 *
 *  1. SITEMAP — fetch https://www.futurepedia.io/sitemap_tools.xml DIRECTLY.
 *     Futurepedia lists this in robots.txt. It contains 1,300+ /tool/[slug] URLs
 *     and is accessible without ScraperAPI (direct requests return 200).
 *     NOTE: sitemap.xml is a flat page-level sitemap — NOT the tools one.
 *
 *  2. TOOL DETAIL PAGES — ScraperAPI render:true.
 *     Tool pages are a client-rendered React app. Without JS execution,
 *     the "Visit Site" button's href is never rendered into the DOM.
 *     ScraperAPI render:true runs a headless browser and returns the
 *     fully hydrated HTML containing all dynamic content.
 *
 *  3. officialUrl extraction — look for any href containing
 *     '?utm_source=futurepedia'. Futurepedia appends these UTM params
 *     to EVERY outbound tool link. Strip UTM params → official URL.
 *
 *  4. logo — decode the 'image=' query param from og:image.
 *     e.g. og:image includes "&image=https%3A%2F%2Fcdn.futurepedia.io%2F..."
 *     Decoded → the real tool CDN thumbnail URL.
 *
 * ScraperAPI credits per run:
 *  - sitemap fetch: 0 (direct)
 *  - per tool page: ~5 credits (render:true)
 *  - 300 tools = ~1,500 credits from the monthly 5,000 free budget
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import { scraperGet, isProxyEnabled } from '../../config/scraperClient.js'

const BASE_URL = 'https://www.futurepedia.io'
const TOOLS_SITEMAP = `${BASE_URL}/sitemap_tools.xml`
const DELAY_MS = parseInt(process.env.CRAWLER_DELAY_MS || '2000')

// Direct client for sitemap (no proxy needed — sitemaps return 200 directly)
const directClient = axios.create({
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'application/xml, text/xml, */*',
    },
})

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

/**
 * Parses a CDN logo URL out of Futurepedia's og:image meta tag.
 * og:image looks like:
 *   https://www.futurepedia.io/api/og?title=...&image=https%3A%2F%2Fcdn.futurepedia.io%2F...
 */
function extractLogoFromOgImage(ogImageUrl) {
    if (!ogImageUrl) return null
    try {
        const match = ogImageUrl.match(/[?&]image=([^&]+)/)
        if (match) {
            const decoded = decodeURIComponent(match[1])
            // Accept CDN URLs (cdn.futurepedia.io, cloudinary, etc.)
            if (decoded.startsWith('http')) return decoded
        }
    } catch { /* ignore */ }
    return null
}

/**
 * Normalise a pricing string to one of: Free | Freemium | Paid | Trial | Unknown
 */
function normalizePricing(raw = '') {
    const r = raw.toLowerCase()
    if (r.includes('freemium') || (r.includes('free') && r.includes('paid'))) return 'Freemium'
    if (r.includes('free')) return 'Free'
    if (r.includes('trial')) return 'Trial'
    if (r.includes('paid') || r.includes('premium') || r.includes('pro') || r.includes('subscri')) return 'Paid'
    return 'Unknown'
}

/**
 * Fetches the tools sitemap DIRECTLY (no ScraperAPI — not needed for XML).
 * Returns an array of /tool/[slug] absolute URLs.
 */
async function getToolUrlsFromSitemap() {
    console.log(`[Futurepedia] Fetching tools sitemap: ${TOOLS_SITEMAP}`)
    try {
        const { data: xml } = await directClient.get(TOOLS_SITEMAP)
        const $ = cheerio.load(xml, { xmlMode: true })
        const urls = []

        $('url loc').each((_, el) => {
            const loc = $(el).text().trim()
            if (loc.includes('/tool/')) urls.push(loc)
        })

        console.log(`[Futurepedia] Sitemap parsed — ${urls.length} tool URLs found`)
        return urls
    } catch (err) {
        console.error(`[Futurepedia] Sitemap fetch failed: ${err.message}`)
        return []
    }
}

/**
 * Scrapes a single Futurepedia tool detail page.
 * Uses ScraperAPI render:true to execute JavaScript and hydrate the React DOM.
 *
 * Key data extracted:
 *  - name         → <h1> text (clean tool name, e.g. "Replika")
 *  - officialUrl  → href containing '?utm_source=futurepedia' (strip UTM)
 *  - description  → meta[name="description"] content
 *  - logo         → decoded from og:image URL parameter
 *  - pricing      → best effort from page text
 *  - tags         → mined from page badges/pills if available
 */
async function scrapeToolPage(toolUrl) {
    try {
        // render:true = ScraperAPI runs headless Chrome → returns hydrated HTML
        const { data: html } = await scraperGet(toolUrl, { render: true })
        const $ = cheerio.load(html)

        // ── Name ─────────────────────────────────────────────────────────────
        const name = $('h1').first().text().trim()
            || $('meta[property="og:title"]').attr('content')?.split(' Reviews:')[0]?.split(' - ')[0]?.trim()
        if (!name || name.length < 2) return null

        // ── Description ───────────────────────────────────────────────────────
        const description = $('meta[name="description"]').attr('content')
            || $('meta[property="og:description"]').attr('content')
            || ''

        // ── Official URL (frequency-based UTM extraction) ──────────────────────
        // Futurepedia appends ?utm_source=futurepedia to ALL outbound links.
        // The main tool's CTA appears 2-3x on a page (hero + sticky bar + inline).
        // Related/competing tools each appear only once.
        // So the MOST FREQUENT UTM domain = the main tool's official URL.
        let officialUrl = null

        const utmCounts = new Map()
        $('a[href*="utm_source=futurepedia"]').each((_, el) => {
            const href = $(el).attr('href') || ''
            try {
                const u = new URL(href)
                const domain = u.origin + (u.pathname !== '/' ? u.pathname : '/') // keep path if meaningful
                u.search = ''
                const clean = u.toString()
                if (!clean.includes('futurepedia.io')) {
                    utmCounts.set(clean, (utmCounts.get(clean) || 0) + 1)
                }
            } catch { /* skip */ }
        })

        if (utmCounts.size > 0) {
            // Sort by frequency descending — highest count = main tool CTA
            const sorted = [...utmCounts.entries()].sort((a, b) => b[1] - a[1])

            // Bonus: prefer a URL whose domain matches the tool's slug words.
            // e.g. slug 'hostinger-reach' → prefer domain containing 'hostinger'.
            // This handles edge cases where a related tool's CTA appears more often.
            const slugWords = toolUrl
                .split('/tool/')[1]?.split('-')
                .filter(w => w.length > 3) || []

            const slugMatch = sorted.find(([url]) =>
                slugWords.some(word => url.toLowerCase().includes(word))
            )
            officialUrl = (slugMatch || sorted[0])[0]
        }

        // Fallback: any external link in the main content area
        if (!officialUrl) {
            $('main a[href^="http"], article a[href^="http"]').each((_, el) => {
                const href = $(el).attr('href') || ''
                if (!href.includes('futurepedia') &&
                    !href.includes('twitter') && !href.includes('x.com') &&
                    !href.includes('linkedin') && !href.includes('youtube') &&
                    !href.includes('instagram') && !href.includes('facebook') &&
                    !href.includes('tiktok') && !href.includes('discord') &&
                    !href.includes('github')) {
                    officialUrl = href.split('?')[0]
                    return false
                }
            })
        }

        if (!officialUrl) return null

        // ── Logo ──────────────────────────────────────────────────────────────
        const ogImage = $('meta[property="og:image"]').attr('content') || ''
        const logo = extractLogoFromOgImage(ogImage)

        // ── Tags / Category ───────────────────────────────────────────────────
        // Futurepedia's global nav/sidebar renders on every page — must be filtered out.
        const FP_NAV_BLOCKLIST = new Set([
            'AI Agents', 'Productivity Tools', 'Image Generators', 'Text Generators',
            'Video Tools', 'Art Generators', 'Audio Generators', 'Best AI Art Generators',
            'AI Tools', 'All Tools', 'New Tools', 'Top Tools', 'Free Tools',
            'Writing Generators', 'Code Tools', 'Business Tools', 'Education Tools',
            'Research Tools', 'Social Media Tools', 'SEO Tools', 'Design Tools',
            'Best AI Image Generators', 'Best AI Chatbots', 'Best AI Text Generators',
            'Best AI 3D Generators', 'Best AI Video Generators', 'Best AI Code Tools',
            'Best AI Audio Generators', 'Best AI Writing Tools', 'Best AI Marketing Tools',
            'Best AI Productivity Tools', 'Best AI Design Tools', 'Best AI SEO Tools',
        ])

        const tags = new Set()
        $('[class*="tag"], [class*="badge"], [class*="pill"], [class*="category"], [class*="chip"]').each((_, el) => {
            const text = $(el).text().trim()
            if (text &&
                text.length > 1 &&
                text.length < 50 &&
                !/^\d+$/.test(text) &&
                !text.startsWith('#') &&
                !text.toLowerCase().includes('browse') &&
                !FP_NAV_BLOCKLIST.has(text)
            ) {
                tags.add(text)
            }
        })
        // Category links from /ai-tools/[slug] hrefs are reliable category names
        $('a[href*="/ai-tools/"]').each((_, el) => {
            const text = $(el).text().trim()
            if (text && text.length > 1 && text.length < 40 &&
                !text.startsWith('#') &&
                !text.toLowerCase().includes('browse') &&
                !FP_NAV_BLOCKLIST.has(text)) {
                tags.add(text)
            }
        })

        // ── Pricing ───────────────────────────────────────────────────────────
        const pricingEl = $('[class*="pricing"], [class*="price"], [class*="plan"]').first().text().toLowerCase()
        const pageText = $('body').text().toLowerCase().substring(0, 3000)
        const pricingRaw = pricingEl || pageText
        const pricing = normalizePricing(pricingRaw)

        return {
            name,
            officialUrl,
            shortDescription: description.substring(0, 499),
            category: [...tags][0] || '',
            tags: [...tags].slice(0, 10),
            pricing,
            logo: logo || null,
            source: 'futurepedia',
            sourceUrl: toolUrl,
        }
    } catch (err) {
        // ScraperAPI timeout or network error — skip this tool
        return null
    }
}

/**
 * Main crawler entry point for Futurepedia.
 *
 * @param {{ maxTools: number, onProgress: Function }} options
 * @returns {Promise<Array>} Raw tool objects ready for normalizeToSchema()
 */
export async function crawlFuturepedia({ maxTools = 300, onProgress } = {}) {
    console.log('[Futurepedia] Starting crawl...')
    console.log(`[Futurepedia] Sitemap: direct fetch (no proxy needed)`)
    console.log(`[Futurepedia] Detail pages: ${isProxyEnabled() ? '✅ ScraperAPI render:true' : '❌ No SCRAPER_API_KEY — tool URLs found but detail scraping will fail'}`)

    if (!isProxyEnabled()) {
        console.error('[Futurepedia] SCRAPER_API_KEY is required for detail page scraping. Set it in .env')
        return []
    }

    const toolUrls = await getToolUrlsFromSitemap()
    if (toolUrls.length === 0) {
        console.warn('[Futurepedia] No tool URLs from sitemap — stopping.')
        return []
    }

    const urlsToProcess = toolUrls.slice(0, maxTools)
    console.log(`[Futurepedia] Processing ${urlsToProcess.length} of ${toolUrls.length} tool URLs...`)

    const results = []
    // Sequential to respect ScraperAPI rate limits and avoid hammering Futurepedia
    const BATCH_SIZE = 2

    for (let i = 0; i < urlsToProcess.length; i += BATCH_SIZE) {
        const batch = urlsToProcess.slice(i, i + BATCH_SIZE)

        const batchResults = await Promise.allSettled(batch.map(url => scrapeToolPage(url)))
        batchResults.forEach(r => {
            if (r.status === 'fulfilled' && r.value) results.push(r.value)
        })

        const done = Math.min(i + BATCH_SIZE, urlsToProcess.length)
        if (onProgress) onProgress({ done, total: urlsToProcess.length, found: results.length })

        if ((Math.floor(i / BATCH_SIZE) + 1) % 10 === 0) {
            console.log(`[Futurepedia] Progress: ${done}/${urlsToProcess.length} — valid: ${results.length}`)
        }

        await sleep(DELAY_MS)
    }

    console.log(`[Futurepedia] Crawl complete — ${results.length} valid tools from ${urlsToProcess.length} URLs`)
    return results
}
