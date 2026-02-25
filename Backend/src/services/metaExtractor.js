/**
 * metaExtractor.js — Batch 4B
 *
 * Scrapes metadata from a tool's website using Cheerio.
 * Extracts: name, description, logo, screenshot URL, pricing signals.
 * Used by the discovery queue worker when ingesting new tools.
 */

import axios from 'axios'
import * as cheerio from 'cheerio'

const TIMEOUT_MS = 10000
const UA = 'Mozilla/5.0 (compatible; IntelliGridBot/1.0; +https://intelligrid.online)'

/**
 * Detect pricing model from raw HTML text.
 * Returns a value from the Tool schema enum.
 */
function detectPricingModel(html) {
    const h = html.toLowerCase()
    if (/open[- ]source|github\.com/.test(h) && /free/i.test(h)) return 'Free'
    if (/free forever|always free|100% free/i.test(h)) return 'Free'
    if (/freemium|free plan|free tier|free account/i.test(h)) return 'Freemium'
    if (/free trial|try free|start for free|no credit card/i.test(h)) return 'Freemium'
    if (/\$\d+\s*\/\s*mo|\$\d+\s*\/\s*month|starting at \$|per month/i.test(h)) return 'Paid'
    return 'Unknown'
}

/**
 * Detect whether a free tier/trial is available.
 */
function detectFreeTier(html) {
    return /free plan|free tier|free forever|always free|free account|no credit card|try for free/i.test(html)
}

/**
 * Attempt to resolve an absolute URL from a potentially relative src.
 */
function resolveUrl(base, src) {
    if (!src) return null
    try {
        return new URL(src, base).href
    } catch {
        return null
    }
}

/**
 * Extract metadata from a URL.
 *
 * @param {string} url - The tool's website URL.
 * @returns {Object} Extracted metadata fields.
 */
export async function extractToolMeta(url) {
    const defaultResult = {
        name: null,
        shortDescription: null,
        logo: null,
        screenshotUrl: null,
        pricingModel: 'Unknown',
        hasFreeTier: null,
        startingPrice: null,
    }

    const normalised = /^https?:\/\//i.test(url) ? url : `https://${url}`

    try {
        const res = await axios.get(normalised, {
            timeout: TIMEOUT_MS,
            maxRedirects: 5,
            headers: { 'User-Agent': UA },
            validateStatus: s => s < 400,
        })

        const html = res.data
        const $ = cheerio.load(html)

        // ── Name ───────────────────────────────────────────────────────────
        const name = (
            $('meta[property="og:title"]').attr('content') ||
            $('meta[name="twitter:title"]').attr('content') ||
            $('title').text()
        )?.trim().split(' | ')[0].split(' - ')[0] || null

        // ── Description ────────────────────────────────────────────────────
        const shortDescription = (
            $('meta[property="og:description"]').attr('content') ||
            $('meta[name="twitter:description"]').attr('content') ||
            $('meta[name="description"]').attr('content')
        )?.trim().slice(0, 500) || null

        // ── Logo ───────────────────────────────────────────────────────────
        const logoRaw = (
            $('link[rel="apple-touch-icon"]').attr('href') ||
            $('link[rel="shortcut icon"][type="image/png"]').attr('href') ||
            $('link[rel="icon"][type="image/png"]').attr('href') ||
            $('link[rel="icon"]').attr('href')
        )
        const logo = resolveUrl(normalised, logoRaw)

        // ── Screenshot (OG image) ──────────────────────────────────────────
        const screenshotRaw = $('meta[property="og:image"]').attr('content')
        const screenshotUrl = resolveUrl(normalised, screenshotRaw)

        // ── Pricing ────────────────────────────────────────────────────────
        const pricingModel = detectPricingModel(html)
        const hasFreeTier = detectFreeTier(html)

        // Attempt to extract a starting price string
        const priceMatch = html.match(/starting (?:at |from )?\$(\d+(?:\.\d+)?)\s*\/\s*mo(?:nth)?/i)
        const startingPrice = priceMatch ? `$${priceMatch[1]}/mo` : null

        return { name, shortDescription, logo, screenshotUrl, pricingModel, hasFreeTier, startingPrice }

    } catch (err) {
        console.error(`[MetaExtractor] Failed to scrape ${url}: ${err.message}`)
        return defaultResult
    }
}
