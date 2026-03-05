/**
 * seoRoutes.js — Phase 5 + 6 upgrade
 *
 * GET /robots.txt       — Crawler directives
 * GET /sitemap.xml      — Sitemap index (splits into sub-sitemaps for scale)
 * GET /sitemap-static.xml    — Static pages + category + best-tools SEO pages
 * GET /sitemap-tools.xml     — All active tool detail pages
 * GET /sitemap-alternatives.xml — /alternatives/:toolSlug programmatic pages
 * GET /sitemap-blog.xml      — Blog post pages
 *
 * Each sub-sitemap is cached in Redis (1 h TTL) with a short-circuit
 * in-process object cache as safety fallback when Redis is unavailable.
 */
import express from 'express'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js'
import Collection from '../models/Collection.js'
import BlogPost from '../models/BlogPost.js'
import redisClient from '../config/redis.js'

const router = express.Router()

const BASE_URL = 'https://www.intelligrid.online'
const CACHE_TTL_SECONDS = 60 * 60          // 1 hour
const PROCESS_CACHE = {}                    // fallback when Redis is unavailable

// ── Helpers ────────────────────────────────────────────────────────────────────

function cacheKey(name) {
    return `sitemap:v3:${name}`
}

async function fromCache(name) {
    const key = cacheKey(name)
    // 1. in-process cache
    if (PROCESS_CACHE[key] && Date.now() - PROCESS_CACHE[key].ts < CACHE_TTL_SECONDS * 1000) {
        return PROCESS_CACHE[key].xml
    }
    // 2. Redis
    if (redisClient?.isOpen) {
        const cached = await redisClient.get(key).catch(() => null)
        if (cached) {
            PROCESS_CACHE[key] = { xml: cached, ts: Date.now() }
            return cached
        }
    }
    return null
}

async function toCache(name, xml) {
    const key = cacheKey(name)
    PROCESS_CACHE[key] = { xml, ts: Date.now() }
    if (redisClient?.isOpen) {
        redisClient.setEx(key, CACHE_TTL_SECONDS, xml).catch(() => { })
    }
}

function urlEntry(loc, lastmod, changefreq = 'weekly', priority = '0.7') {
    const modStr = lastmod ? new Date(lastmod).toISOString() : new Date().toISOString()
    return `\n    <url>\n        <loc>${loc}</loc>\n        <lastmod>${modStr}</lastmod>\n        <changefreq>${changefreq}</changefreq>\n        <priority>${priority}</priority>\n    </url>`
}

function wrapUrlset(inner) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${inner}\n</urlset>`
}

function sendXml(res, xml) {
    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(xml)
}

// ── Role slugs for /best-tools/:role pages (Phase 5 SEO pages) ───────────────
const BEST_TOOLS_ROLES = [
    'developers', 'marketers', 'designers', 'writers', 'founders',
    'students', 'researchers', 'sales-teams', 'product-managers',
    'customer-success', 'video-creators', 'podcasters', 'educators',
    'hr-teams', 'lawyers', 'finance-teams', 'data-analysts',
    'healthcare', 'real-estate', 'ecommerce', 'freelancers',
    'agencies', 'solopreneurs', 'social-media-managers', 'ctos',
]

// ── GET /robots.txt ────────────────────────────────────────────────────────────
router.get('/robots.txt', (req, res) => {
    const robots = `User-agent: *
Allow: /

# Block admin panel from indexing
Disallow: /admin
Disallow: /admin/

# Block dashboard (user-private pages)
Disallow: /dashboard
Disallow: /dashboard/

# Block payment flow pages
Disallow: /payment/success
Disallow: /payment/cancel

# Block API endpoints
Disallow: /api/

# Sitemap Index
Sitemap: ${BASE_URL}/sitemap.xml
`
    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.send(robots)
})

// ── GET /sitemap.xml — Sitemap Index ──────────────────────────────────────────
router.get('/sitemap.xml', async (req, res) => {
    try {
        const cached = await fromCache('index')
        if (cached) return sendXml(res, cached)

        const now = new Date().toISOString()
        const subSitemaps = [
            { loc: `${BASE_URL}/sitemap-static.xml`, lastmod: now },
            { loc: `${BASE_URL}/sitemap-tools.xml`, lastmod: now },
            { loc: `${BASE_URL}/sitemap-alternatives.xml`, lastmod: now },
            { loc: `${BASE_URL}/sitemap-blog.xml`, lastmod: now },
        ]

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${subSitemaps.map(s => `\n    <sitemap>\n        <loc>${s.loc}</loc>\n        <lastmod>${s.lastmod}</lastmod>\n    </sitemap>`).join('')}\n</sitemapindex>`

        await toCache('index', xml)
        sendXml(res, xml)
    } catch (err) {
        console.error('[SEO] Sitemap index error:', err.message)
        res.status(500).send('Error generating sitemap index')
    }
})

// ── GET /sitemap-static.xml ───────────────────────────────────────────────────
// Static pages + category pages + best-tools role pages + use-case pages
router.get('/sitemap-static.xml', async (req, res) => {
    try {
        const cached = await fromCache('static')
        if (cached) return sendXml(res, cached)

        const categories = await Category.find({ isActive: { $ne: false } })
            .select('slug updatedAt')
            .lean()

        let inner = ''

        // Static
        const staticPages = [
            { path: '', freq: 'weekly', pri: '1.0' },
            { path: '/tools', freq: 'daily', pri: '0.9' },
            { path: '/search', freq: 'weekly', pri: '0.7' },
            { path: '/pricing', freq: 'weekly', pri: '0.8' },
            { path: '/blog', freq: 'weekly', pri: '0.7' },
            { path: '/submit', freq: 'monthly', pri: '0.6' },
            { path: '/faq', freq: 'monthly', pri: '0.7' },
            { path: '/privacy-policy', freq: 'monthly', pri: '0.5' },
            { path: '/terms-of-service', freq: 'monthly', pri: '0.5' },
            { path: '/refund-policy', freq: 'monthly', pri: '0.5' },
        ]
        staticPages.forEach(({ path: p, freq, pri }) => {
            inner += urlEntry(`${BASE_URL}${p}`, null, freq, pri)
        })

        // Categories
        categories.forEach(cat => {
            inner += urlEntry(`${BASE_URL}/category/${cat.slug}`, cat.updatedAt, 'daily', '0.9')
        })

        // Phase 5: Best-tools role pages (programmatic SEO)
        BEST_TOOLS_ROLES.forEach(role => {
            inner += urlEntry(`${BASE_URL}/best-tools/${role}`, null, 'weekly', '0.8')
        })

        // Top use-case pages
        const USE_CASE_TAGS = [
            'writing', 'coding', 'marketing', 'design', 'video', 'audio',
            'research', 'education', 'productivity', 'sales', 'finance',
            'healthcare', 'legal', 'ecommerce', 'social-media', 'automation',
        ]
        USE_CASE_TAGS.forEach(tag => {
            inner += urlEntry(`${BASE_URL}/best-ai-tools-for/${tag}`, null, 'weekly', '0.8')
        })

        const xml = wrapUrlset(inner)
        await toCache('static', xml)
        sendXml(res, xml)
    } catch (err) {
        console.error('[SEO] Static sitemap error:', err.message)
        res.status(500).send('Error generating static sitemap')
    }
})

// ── GET /sitemap-tools.xml ────────────────────────────────────────────────────
// All active tool detail pages
router.get('/sitemap-tools.xml', async (req, res) => {
    try {
        const cached = await fromCache('tools')
        if (cached) return sendXml(res, cached)

        const tools = await Tool.find({ status: 'active', isActive: { $ne: false } })
            .select('slug updatedAt trendingScore ratings')
            .lean()

        let inner = ''
        tools.forEach(tool => {
            // Priority: top-trending/top-rated tools get 0.9, others 0.7
            const isHighPriority = (tool.trendingScore || 0) > 50 || (tool.ratings?.average || 0) >= 4
            const priority = isHighPriority ? '0.9' : '0.7'
            inner += urlEntry(`${BASE_URL}/tools/${tool.slug}`, tool.updatedAt, 'weekly', priority)
        })

        const xml = wrapUrlset(inner)
        await toCache('tools', xml)
        sendXml(res, xml)
    } catch (err) {
        console.error('[SEO] Tools sitemap error:', err.message)
        res.status(500).send('Error generating tools sitemap')
    }
})

// ── GET /sitemap-alternatives.xml ─────────────────────────────────────────────
// /alternatives/:toolSlug pages for enriched tools that have alternativeTo data
router.get('/sitemap-alternatives.xml', async (req, res) => {
    try {
        const cached = await fromCache('alternatives')
        if (cached) return sendXml(res, cached)

        // Only generate alternatives pages for tools that are popular enough
        // (trendingScore > 5 OR have reviews) to justify a dedicated SEO page
        const tools = await Tool.find({
            status: 'active',
            isActive: { $ne: false },
            $or: [
                { trendingScore: { $gt: 5 } },
                { 'ratings.count': { $gt: 0 } },
                { views: { $gt: 100 } },
            ],
        })
            .select('slug updatedAt name')
            .lean()

        let inner = ''
        tools.forEach(tool => {
            inner += urlEntry(
                `${BASE_URL}/alternatives/${tool.slug}`,
                tool.updatedAt,
                'weekly',
                '0.8'
            )
        })

        const xml = wrapUrlset(inner)
        await toCache('alternatives', xml)
        sendXml(res, xml)
    } catch (err) {
        console.error('[SEO] Alternatives sitemap error:', err.message)
        res.status(500).send('Error generating alternatives sitemap')
    }
})

// ── GET /sitemap-blog.xml ──────────────────────────────────────────────────────
router.get('/sitemap-blog.xml', async (req, res) => {
    try {
        const cached = await fromCache('blog')
        if (cached) return sendXml(res, cached)

        const [blogPosts, collections] = await Promise.all([
            BlogPost.find({ status: 'published' })
                .select('slug updatedAt publishedAt')
                .lean(),
            Collection.find({ isPublic: true })
                .select('slug updatedAt')
                .lean(),
        ])

        let inner = ''
        blogPosts.forEach(post => {
            inner += urlEntry(`${BASE_URL}/blog/${post.slug}`, post.publishedAt || post.updatedAt, 'monthly', '0.7')
        })
        collections.forEach(col => {
            if (!col.slug) return
            inner += urlEntry(`${BASE_URL}/collections/${col.slug}`, col.updatedAt, 'weekly', '0.6')
        })

        const xml = wrapUrlset(inner)
        await toCache('blog', xml)
        sendXml(res, xml)
    } catch (err) {
        console.error('[SEO] Blog sitemap error:', err.message)
        res.status(500).send('Error generating blog sitemap')
    }
})

export default router
