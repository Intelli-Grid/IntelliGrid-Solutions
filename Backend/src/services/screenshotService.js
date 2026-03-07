/**
 * screenshotService.js
 * Captures screenshots of AI tool homepages using Puppeteer
 * and uploads them to Cloudinary.
 *
 * Strategy:
 *   - Uses the locally installed Chrome/Chromium (avoids large binary download)
 *   - Falls back to puppeteer-core's bundled executable if local not found
 *   - Uploads to Cloudinary under folder: intelligrid/screenshots/{slug}
 *   - Respects a 20s page load timeout — skips unresponsive sites
 *   - Returns the Cloudinary secure_url (HTTPS CDN URL)
 */

import puppeteer from 'puppeteer-core'
import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'

// ── Cloudinary config (lazy) ─────────────────────────────────────────────────
// ESM hoists all `import` statements before any executable code runs.
// That means cloudinary.config() at module-level would fire BEFORE dotenv
// in the calling script has loaded the .env file — env vars would be undefined.
// Fix: call cloudinary.config() lazily at first upload, not at module load.
let _cloudinaryConfigured = false
function ensureCloudinary() {
    if (_cloudinaryConfigured) return
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    })
    _cloudinaryConfigured = true
}

// ── Browser singleton ────────────────────────────────────────────────────────
let browser = null

async function getBrowser() {
    if (browser && browser.connected) return browser

    // Try common Chrome/Chromium paths on Windows, Mac, Linux
    const executablePaths = [
        // Windows
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.PUPPETEER_EXECUTABLE_PATH,
        // Mac
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        // Linux (Railway/Docker)
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
    ].filter(Boolean)

    let executablePath = null
    for (const p of executablePaths) {
        try {
            const { existsSync } = await import('fs')
            if (existsSync(p)) { executablePath = p; break }
        } catch (_) { }
    }

    browser = await puppeteer.launch({
        executablePath,
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--window-size=1280,800',
        ],
    })

    // Auto-reconnect if browser crashes
    browser.on('disconnected', () => { browser = null })

    return browser
}

export async function closeBrowser() {
    if (browser) {
        await browser.close().catch(() => { })
        browser = null
    }
}

// ── Screenshot capture ────────────────────────────────────────────────────────
/**
 * Takes a screenshot of a URL and returns a Buffer (PNG).
 * Returns null on any failure (timeout, blocked, error page, etc.)
 */
export async function captureScreenshot(url) {
    let page = null
    try {
        const b = await getBrowser()
        page = await b.newPage()

        // Set viewport to standard desktop size
        await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 })

        // Spoof a real browser UA to avoid bot-blocking
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        )

        // Block heavy resources we don't need for a screenshot
        await page.setRequestInterception(true)
        page.on('request', (req) => {
            const blocked = ['media', 'font']
            if (blocked.includes(req.resourceType())) {
                req.abort()
            } else {
                req.continue()
            }
        })

        // Navigate with 20s timeout — skip slow/unresponsive sites
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 20000,
        })

        // Wait 1.5s for above-fold content to render
        await new Promise(r => setTimeout(r, 1500))

        // Dismiss cookie banners / modals if present
        try {
            await page.evaluate(() => {
                const selectors = [
                    '[class*="cookie"] button', '[id*="cookie"] button',
                    '[class*="consent"] button', '[class*="modal"] button',
                    '[class*="banner"] button', '[aria-label*="Accept"]',
                    '[data-testid*="cookie-accept"]',
                ]
                for (const sel of selectors) {
                    const btn = document.querySelector(sel)
                    if (btn) { btn.click(); break }
                }
            })
            await new Promise(r => setTimeout(r, 500))
        } catch (_) { }

        // Capture viewport screenshot (1280×800 PNG)
        const buffer = await page.screenshot({
            type: 'png',
            clip: { x: 0, y: 0, width: 1280, height: 800 },
        })

        return buffer

    } catch (err) {
        return null
    } finally {
        if (page) await page.close().catch(() => { })
    }
}

// ── Cloudinary upload ────────────────────────────────────────────────────────
/**
 * Uploads a PNG Buffer to Cloudinary.
 * Returns the secure HTTPS CDN URL, or null on failure.
 */
export async function uploadToCloudinary(buffer, slug) {
    ensureCloudinary()  // lazy config — reads env vars now (after dotenv has loaded)

    const uploadPromise = new Promise((resolve) => {
        const publicId = `intelligrid/screenshots/${slug}`

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                public_id: publicId,
                overwrite: true,
                resource_type: 'image',
                format: 'webp',           // convert PNG → WebP for smaller size
                transformation: [
                    { width: 1280, height: 800, crop: 'fill', gravity: 'north' },
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' },
                ],
                tags: ['screenshot', 'tool'],
            },
            (error, result) => {
                if (error) {
                    console.error(`[Screenshot] Cloudinary upload failed for ${slug}:`, error.message)
                    resolve(null)
                } else {
                    resolve(result.secure_url)
                }
            }
        )

        // Pipe Buffer into the upload stream
        const readable = new Readable()
        readable.push(buffer)
        readable.push(null)
        readable.pipe(uploadStream)
    })

    // Hard 30-second timeout — prevents hanging on slow/stalled network
    const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => {
            console.error(`[Screenshot] Cloudinary upload timed out for ${slug} — skipping`)
            resolve(null)
        }, 30_000)
    )

    return Promise.race([uploadPromise, timeoutPromise])
}


// ── Main exported function ────────────────────────────────────────────────────
/**
 * Full pipeline: capture → upload → return URL
 * Returns { url: string, takenAt: Date } or { url: null, error: string }
 */
export async function captureAndUploadScreenshot(tool) {
    const url = tool.officialUrl || tool.websiteUrl
    if (!url) return { url: null, error: 'no_url' }

    const slug = tool.slug || tool._id.toString()

    try {
        // 1. Capture
        const buffer = await captureScreenshot(url)
        if (!buffer) return { url: null, error: 'capture_failed' }

        // 2. Upload
        const cdnUrl = await uploadToCloudinary(buffer, slug)
        if (!cdnUrl) return { url: null, error: 'upload_failed' }

        return { url: cdnUrl, takenAt: new Date() }

    } catch (err) {
        return { url: null, error: err.message }
    }
}
