import express from 'express'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js'
import Collection from '../models/Collection.js'

const router = express.Router()

// Cache sitemap for 1 hour to reduce DB load
const CACHE_DURATION = 60 * 60 * 1000
let sitemapCache = {
    data: null,
    timestamp: 0
}

router.get('/sitemap.xml', async (req, res) => {
    try {
        const now = Date.now()

        // Serve from cache if fresh
        if (sitemapCache.data && (now - sitemapCache.timestamp < CACHE_DURATION)) {
            res.header('Content-Type', 'application/xml')
            return res.send(sitemapCache.data)
        }

        const baseUrl = process.env.FRONTEND_URL || 'https://intelligrid.online'

        // 1. Fetch Data
        const [tools, categories, collections] = await Promise.all([
            Tool.find({ status: 'active' }).select('slug updatedAt').lean(),
            Category.find({ isActive: true }).select('slug updatedAt').lean(),
            Collection.find({ isPublic: true }).select('slug updatedAt').lean()
        ])

        // 2. Build XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`

        // Static Pages
        const staticPages = [
            '',
            '/tools',
            '/pricing',
            '/privacy-policy',
            '/terms-of-service',
            '/refund-policy',
            '/faq'
        ]

        staticPages.forEach(page => {
            xml += `
    <url>
        <loc>${baseUrl}${page}</loc>
        <changefreq>daily</changefreq>
        <priority>${page === '' ? '1.0' : '0.8'}</priority>
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
            xml += `
    <url>
        <loc>${baseUrl}/collections/${col.slug}</loc>
        <lastmod>${col.updatedAt ? new Date(col.updatedAt).toISOString() : new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
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
