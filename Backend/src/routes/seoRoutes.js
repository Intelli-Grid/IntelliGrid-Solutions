import express from 'express'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js'
import Collection from '../models/Collection.js'
import BlogPost from '../models/BlogPost.js'

const router = express.Router()

// Cache sitemap for 1 hour to reduce DB load
const CACHE_DURATION = 60 * 60 * 1000
let sitemapCache = {
    data: null,
    timestamp: 0
}

// ──────────────────────────────────────────────────────────
// GET /robots.txt
// ✅ Bug #7 Fix: robots.txt was completely missing from the backend.
// Disallows /admin from search engines; allows all public routes.
// ──────────────────────────────────────────────────────────
router.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.FRONTEND_URL || 'https://www.intelligrid.online'

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

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml
`

    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Cache-Control', 'public, max-age=86400') // Cache 24 hours
    res.send(robots)
})

// ──────────────────────────────────────────────────────────
// GET /sitemap.xml
// ──────────────────────────────────────────────────────────
router.get('/sitemap.xml', async (req, res) => {
    try {
        const now = Date.now()

        // Serve from cache if fresh
        if (sitemapCache.data && (now - sitemapCache.timestamp < CACHE_DURATION)) {
            res.header('Content-Type', 'application/xml')
            return res.send(sitemapCache.data)
        }

        const baseUrl = 'https://www.intelligrid.online'

        // ✅ FIXED: isActive:true returns 0 docs — most tools were bulk-imported
        // without the field set. Use $ne:false to include docs where isActive
        // is true OR missing (never explicitly set to false).
        const [tools, categories, collections, blogPosts] = await Promise.all([
            Tool.find({ status: 'active', isActive: { $ne: false } }).select('slug updatedAt').lean(),
            Category.find({ isActive: { $ne: false } }).select('slug updatedAt').lean(),
            Collection.find({ isPublic: true }).select('slug updatedAt').lean(),
            BlogPost.find({ status: 'published' }).select('slug updatedAt publishedAt').lean(),
        ])

        // 2. Build XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`

        // Static Pages
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
            xml += `
    <url>
        <loc>${baseUrl}${p}</loc>
        <changefreq>${freq}</changefreq>
        <priority>${pri}</priority>
    </url>`
        })

        // Categories
        categories.forEach(cat => {
            xml += `
    <url>
        <loc>${baseUrl}/category/${cat.slug}</loc>
        <lastmod>${cat.updatedAt ? new Date(cat.updatedAt).toISOString() : new Date().toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>`
        })

        // Tools
        tools.forEach(tool => {
            xml += `
    <url>
        <loc>${baseUrl}/tools/${tool.slug}</loc>
        <lastmod>${tool.updatedAt ? new Date(tool.updatedAt).toISOString() : new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>`
        })

        // Public Collections
        collections.forEach(col => {
            if (!col.slug) return // skip collections without a slug
            xml += `
    <url>
        <loc>${baseUrl}/collections/${col.slug}</loc>
        <lastmod>${col.updatedAt ? new Date(col.updatedAt).toISOString() : new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>`
        })

        // Blog Posts
        blogPosts.forEach(post => {
            xml += `
    <url>
        <loc>${baseUrl}/blog/${post.slug}</loc>
        <lastmod>${post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date(post.updatedAt).toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`
        })

        xml += `
</urlset>`

        // 3. Update Cache
        sitemapCache = {
            data: xml,
            timestamp: now
        }

        // 4. Send Response
        res.header('Content-Type', 'application/xml')
        res.send(xml)

    } catch (error) {
        console.error('Sitemap Error:', error)
        res.status(500).send('Error generating sitemap')
    }
})

export default router
