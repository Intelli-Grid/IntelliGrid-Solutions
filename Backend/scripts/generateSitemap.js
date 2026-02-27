import mongoose from 'mongoose'
import Tool from '../src/models/Tool.js'
import Category from '../src/models/Category.js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Setup env
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const BASE_URL = 'https://www.intelligrid.online'
const OUTPUT_PATH = path.join(__dirname, '../../Frontend/public/sitemap.xml')

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ DB Connected'))
    .catch(err => {
        console.error('❌ DB Connection Error:', err)
        process.exit(1)
    })

const generateSitemap = async () => {
    try {
        console.log('🗺️  Generating sitemap...')

        const dir = path.dirname(OUTPUT_PATH)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

        // ✅ FIXED: status:'active' (not 'published') is the correct enum value
        // ✅ FIXED: isActive field is missing on most docs — use $ne:false to
        //    include tools where isActive is true OR missing/null (bulk-imported tools)
        const [tools, categories] = await Promise.all([
            Tool.find({ status: 'active', isActive: { $ne: false } }).select('slug updatedAt').lean(),
            Category.find({ isActive: { $ne: false } }).select('slug updatedAt').lean()
        ])

        console.log(`   Found ${tools.length} tools, ${categories.length} categories`)

        const now = new Date().toISOString()

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`

        // ── Static pages ────────────────────────────────────────────────────────
        const staticPages = [
            { p: '', freq: 'weekly', pri: '1.0' },
            { p: '/tools', freq: 'daily', pri: '0.9' },
            { p: '/pricing', freq: 'weekly', pri: '0.8' },
            { p: '/faq', freq: 'monthly', pri: '0.7' },
            { p: '/privacy-policy', freq: 'monthly', pri: '0.5' },
            { p: '/terms-of-service', freq: 'monthly', pri: '0.5' },
            { p: '/refund-policy', freq: 'monthly', pri: '0.5' },
        ]

        for (const { p, freq, pri } of staticPages) {
            xml += `\n    <url>\n        <loc>${BASE_URL}${p}</loc>\n        <lastmod>${now}</lastmod>\n        <changefreq>${freq}</changefreq>\n        <priority>${pri}</priority>\n    </url>`
        }

        // ── Category pages ──────────────────────────────────────────────────────
        for (const cat of categories) {
            const lastmod = cat.updatedAt ? new Date(cat.updatedAt).toISOString() : now
            xml += `\n    <url>\n        <loc>${BASE_URL}/category/${cat.slug}</loc>\n        <lastmod>${lastmod}</lastmod>\n        <changefreq>daily</changefreq>\n        <priority>0.8</priority>\n    </url>`
        }

        // ── Tool pages ── highest SEO value ─────────────────────────────────────
        for (const tool of tools) {
            const lastmod = tool.updatedAt ? new Date(tool.updatedAt).toISOString() : now
            xml += `\n    <url>\n        <loc>${BASE_URL}/tools/${tool.slug}</loc>\n        <lastmod>${lastmod}</lastmod>\n        <changefreq>weekly</changefreq>\n        <priority>0.7</priority>\n    </url>`
        }

        xml += `\n</urlset>`

        fs.writeFileSync(OUTPUT_PATH, xml, 'utf-8')

        const total = staticPages.length + categories.length + tools.length
        console.log(`\n✅ Sitemap written → ${OUTPUT_PATH}`)
        console.log(`   Static  : ${staticPages.length}`)
        console.log(`   Category: ${categories.length}`)
        console.log(`   Tools   : ${tools.length}`)
        console.log(`   TOTAL   : ${total} URLs`)

    } catch (error) {
        console.error('❌ Error generating sitemap:', error)
    } finally {
        await mongoose.disconnect()
        process.exit(0)
    }
}

generateSitemap()
