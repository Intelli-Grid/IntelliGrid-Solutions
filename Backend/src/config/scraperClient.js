/**
 * scraperClient.js
 * ─────────────────────────────────────────────────────────────
 * Wraps axios with optional ScraperAPI proxy support.
 *
 * If SCRAPER_API_KEY is set in .env, ALL crawler requests are routed
 * through ScraperAPI which:
 *   - Rotates residential/datacenter IPs automatically
 *   - Handles Cloudflare JS challenges (render=true mode)
 *   - Bypasses CAPTCHA and rate-limiting
 *
 * If SCRAPER_API_KEY is not set, falls back to direct axios requests.
 * Free plan: https://www.scraperapi.com/ — 5,000 requests/month.
 *
 * Usage in crawlers:
 *   import { scraperGet } from '../config/scraperClient.js'
 *   const { data } = await scraperGet('https://target-site.com/page')
 */

import axios from 'axios'

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY
const SCRAPER_BASE = 'https://api.scraperapi.com'

// Browser-like headers for direct (non-proxied) requests
const BROWSER_HEADERS = {
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

// JSON API headers for direct requests (AIxploria WP API etc.)
const JSON_HEADERS = {
    'User-Agent': BROWSER_HEADERS['User-Agent'],
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
}

const directClient = axios.create({ timeout: 30000, headers: BROWSER_HEADERS })
const directJsonClient = axios.create({ timeout: 30000, headers: JSON_HEADERS })

/**
 * Makes a GET request, routing through ScraperAPI if configured.
 *
 * @param {string} url - Target URL to fetch
 * @param {{ render?: boolean, json?: boolean, extraHeaders?: object }} options
 *   render: true  → ScraperAPI renders JS (Cloudflare JS-challenge bypass)
 *   json: true    → expect JSON response (API endpoints)
 * @returns axios response object
 */
export async function scraperGet(url, { render = false, json = false, extraHeaders = {} } = {}) {
    if (SCRAPER_API_KEY) {
        // ScraperAPI mode: proxy all requests
        const params = new URLSearchParams({
            api_key: SCRAPER_API_KEY,
            url,
            ...(render ? { render: 'true' } : {}),
        })
        const proxyUrl = `${SCRAPER_BASE}/?${params.toString()}`
        return axios.get(proxyUrl, {
            timeout: 60000, // ScraperAPI needs more time for renders
            headers: { 'Accept': json ? 'application/json' : 'text/html' },
        })
    }

    // Direct mode: no proxy
    const client = json ? directJsonClient : directClient
    return client.get(url, { headers: extraHeaders })
}

/**
 * Returns true if ScraperAPI is configured.
 * Crawlers can use this to log which mode they're running in.
 */
export function isProxyEnabled() {
    return !!SCRAPER_API_KEY
}
