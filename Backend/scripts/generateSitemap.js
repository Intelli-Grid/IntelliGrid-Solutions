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

const BASE_URL = process.env.FRONTEND_URL || 'https://intelligrid.online'
// Output to Frontend/public/sitemap.xml
// Assuming script is in Backend/scripts/
const OUTPUT_PATH = path.join(__dirname, '../../Frontend/public/sitemap.xml')

// Connect DB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('DB Connected'))
    .catch(err => {
        console.error('DB Connection Error:', err)
        process.exit(1)
    })

const generateSitemap = async () => {
    try {
        console.log('Generating sitemap...')

        // Ensure directory exists
        const dir = path.dirname(OUTPUT_PATH)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const [tools, categories] = await Promise.all([
            Tool.find({ status: 'published', isActive: true }).select('slug updatedAt'),
            Category.find({ isActive: true }).select('slug updatedAt')
        ])

        console.log(`Found ${tools.length} active tools and ${categories.length} categories.`)

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
        <loc>${BASE_URL}${page}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>${page === '' ? '1.0' : '0.8'}</priority>
    </url>`
        })

        // Categories
        categories.forEach(cat => {
            xml += `
    <url>
        <loc>${BASE_URL}/category/${cat.slug}</loc>
        <lastmod>${cat.updatedAt ? new Date(cat.updatedAt).toISOString() : new Date().toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>`
        })

        // Tools
        tools.forEach(tool => {
            xml += `
    <url>
        <loc>${BASE_URL}/tools/${tool.slug}</loc>
        <lastmod>${tool.updatedAt ? new Date(tool.updatedAt).toISOString() : new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>`
        })

        xml += `
</urlset>`

        fs.writeFileSync(OUTPUT_PATH, xml)
        console.log(`Sitemap generated successfully at ${OUTPUT_PATH}`)

    } catch (error) {
        console.error('Error generating sitemap:', error)
    } finally {
        await mongoose.disconnect()
        process.exit(0)
    }
}

generateSitemap()
