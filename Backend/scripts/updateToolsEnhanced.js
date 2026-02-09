/**
 * Enhanced AI Tools Scraper & Updater
 * Uses Puppeteer to bypass bot protection and extract rich metadata
 * Syncs with Algolia
 */

import puppeteer from 'puppeteer'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import algoliasearch from 'algoliasearch'
import axios from 'axios'
import * as cheerio from 'cheerio'

dotenv.config()

// Algolia Init
const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_KEY)
const index = client.initIndex('ai_tools_index')

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('✅ MongoDB connected')
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error)
        process.exit(1)
    }
}

// Tool Schema (MATCHING Backend/src/models/Tool.js)
const toolSchema = new mongoose.Schema({
    name: String,
    slug: String,
    shortDescription: String,
    fullDescription: String,
    officialUrl: String,
    sourceUrl: String,
    category: String, // Simplified for script, ideally ObjectId but String works if loosely typed or handled
    pricing: String, // Changed to String to match 'enum' in main model
    tags: [String],
    source: String,
    isTrending: Boolean,
    status: { type: String, default: 'active' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
})

const Tool = mongoose.model('Tool', toolSchema)

// ============================================
// UTILITY: Create Slug
// ============================================
function createSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

// ============================================
// UTILITY: Enrich Tool Data
// ============================================
async function enrichToolData(browser, url) {
    try {
        const page = await browser.newPage()
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })

        const metadata = await page.evaluate(() => {
            const getMeta = (name) => {
                const element = document.querySelector(`meta[name="${name}"]`) ||
                    document.querySelector(`meta[property="${name}"]`)
                return element ? element.getAttribute('content') : null
            }

            return {
                title: document.title || getMeta('og:title'),
                description: getMeta('description') || getMeta('og:description'),
                image: getMeta('og:image')
            }
        })

        await page.close()
        return metadata
    } catch (error) {
        // console.error(`⚠️ Failed to visit ${url}:`, error.message)
        return null
    }
}

// ============================================
// SCRAPER: Product Hunt (Puppeteer)
// ============================================
async function scrapeProductHunt(browser) {
    console.log('\n🔍 Scraping Product Hunt (via Puppeteer)...')
    const page = await browser.newPage()
    const tools = []

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
        await page.goto('https://www.producthunt.com/topics/artificial-intelligence', { waitUntil: 'networkidle2' })

        const extractedTools = await page.evaluate(() => {
            // Updated selectors for Product Hunt's dynamic classes
            // Looking for generic structures that resemble items
            const items = document.querySelectorAll('[class*="styles_item__"]')
            return Array.from(items).map(item => {
                const titleEl = item.querySelector('h3') || item.querySelector('[class*="styles_title__"]')
                const descEl = item.querySelector('[class*="styles_tagline__"]') || item.querySelector('p')
                const linkEl = item.querySelector('a')

                if (!titleEl || !linkEl) return null

                return {
                    name: titleEl.innerText,
                    description: descEl ? descEl.innerText : '',
                    url: linkEl.href
                }
            }).filter(item => item !== null && item.name)
        })

        if (extractedTools) {
            for (const tool of extractedTools) {
                tools.push({
                    name: tool.name,
                    shortDescription: tool.description,
                    fullDescription: tool.description,
                    officialUrl: tool.url,
                    sourceUrl: tool.url,
                    category: 'AI Tools',
                    pricing: 'Freemium',
                    tags: ['AI', 'Product Hunt', 'Trending'],
                    source: 'Product Hunt',
                    isTrending: true
                })
            }
        }

    } catch (error) {
        console.error('❌ Product Hunt scraping failed:', error.message)
    } finally {
        await page.close()
    }

    console.log(`✅ Found ${tools.length} tools from Product Hunt`)
    return tools
}

// ============================================
// SCRAPER: GitHub Trending (Axios)
// ============================================
async function scrapeGitHub() {
    console.log('\n🔍 Scraping GitHub Trending...')
    const tools = []
    try {
        const response = await axios.get('https://github.com/trending/python?since=daily&spoken_language_code=en', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        })
        const $ = cheerio.load(response.data)

        $('article.Box-row').each((i, element) => {
            const name = $(element).find('h2 a').text().trim().replace(/\s+/g, '')
            const description = $(element).find('p').text().trim()
            const url = 'https://github.com' + $(element).find('h2 a').attr('href')

            if (name && description) {
                tools.push({
                    name,
                    shortDescription: description,
                    fullDescription: description,
                    officialUrl: url,
                    sourceUrl: url,
                    category: 'Developer Tools',
                    pricing: 'Free', // Schema expects String
                    tags: ['Open Source', 'GitHub', 'Python'],
                    source: 'GitHub',
                    isTrending: true
                })
            }
        })
    } catch (error) {
        console.error('❌ GitHub scraping failed:', error.message)
    }
    console.log(`✅ Found ${tools.length} tools from GitHub`)
    return tools
}

// ============================================
// SCRAPER: Hacker News (Axios)
// ============================================
async function scrapeHackerNews() {
    console.log('\n🔍 Scraping Hacker News...')
    const tools = []
    try {
        const response = await axios.get('https://news.ycombinator.com/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        })
        const $ = cheerio.load(response.data)

        $('.titleline > a').each((i, element) => {
            const title = $(element).text()
            const link = $(element).attr('href')

            if (title.toLowerCase().includes('ai') || title.toLowerCase().includes('gpt') || title.toLowerCase().includes('llm')) {
                tools.push({
                    name: title,
                    shortDescription: `Trending AI discussion: ${title}`,
                    fullDescription: `Trending AI discussion on Hacker News: ${title}`,
                    officialUrl: link,
                    sourceUrl: link,
                    category: 'News',
                    pricing: 'Unknown', // Schema expects String
                    tags: ['Hacker News', 'AI', 'News'],
                    source: 'Hacker News',
                    isTrending: true
                })
            }
        })
    } catch (error) {
        console.error('❌ Hacker News scraping failed:', error.message)
    }
    console.log(`✅ Found ${tools.length} tools from Hacker News`)
    return tools
}

// ============================================
// MAIN FUNCTION
// ============================================
async function main() {
    console.log('🚀 Starting Enhanced AI Tools Update...\n')

    // Connect to DB
    await connectDB()

    // 1. Gather all tools
    let allNewTools = []

    const ghTools = await scrapeGitHub()
    allNewTools = [...allNewTools, ...ghTools]

    const hnTools = await scrapeHackerNews()
    allNewTools = [...allNewTools, ...hnTools]

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    try {
        const phTools = await scrapeProductHunt(browser)
        allNewTools = [...allNewTools, ...phTools]

        // 2. Update Existing Tools Metadata
        console.log('\n🔄 Updating existing tools metadata...')
        const outdatedTools = await Tool.find({
            $or: [
                { fullDescription: { $exists: false } },
                { fullDescription: "" },
                { fullDescription: { $regex: /^Trending AI discussion/ } } // Try to improve generic HN descriptions
            ]
        }).limit(5)

        for (const tool of outdatedTools) {
            console.log(`   Checking ${tool.name}...`)
            if (tool.officialUrl && !tool.officialUrl.includes('ycombinator.com')) {
                const meta = await enrichToolData(browser, tool.officialUrl)
                if (meta) {
                    if (meta.description && meta.description.length > 20) {
                        tool.fullDescription = meta.description
                        if (!tool.shortDescription || tool.shortDescription.length < 20) {
                            tool.shortDescription = meta.description.substring(0, 150) + '...'
                        }
                        tool.updatedAt = new Date()
                        await tool.save()

                        // Push Update to Algolia
                        try {
                            await index.saveObject({
                                objectID: tool._id.toString(),
                                name: tool.name,
                                description: tool.shortDescription,
                                category: tool.category,
                                tags: tool.tags,
                                pricing: tool.pricing,
                                slug: tool.slug,
                                popularity: tool.views || 0
                            })
                            console.log(`   ✅ Updated DB & Algolia for ${tool.name}`)
                        } catch (algErr) {
                            console.log(`   ⚠️ Updated DB but Algolia failed: ${algErr.message}`)
                        }
                    }
                }
            }
        }

        // 3. Save New Tools
        console.log(`\n💾 Processing ${allNewTools.length} potential new tools...`)
        let newCount = 0

        for (const toolData of allNewTools) {
            const slug = createSlug(toolData.name)
            const existing = await Tool.findOne({ slug })

            if (!existing) {
                try {
                    const newTool = new Tool({ ...toolData, slug })
                    const savedTool = await newTool.save()
                    newCount++
                    process.stdout.write('.')

                    // Push to Algolia
                    await index.saveObject({
                        objectID: savedTool._id.toString(),
                        name: savedTool.name,
                        description: savedTool.shortDescription,
                        category: savedTool.category,
                        tags: savedTool.tags,
                        pricing: savedTool.pricing,
                        slug: savedTool.slug,
                        popularity: 0
                    })

                } catch (err) {
                    console.log(`\n❌ Error saving ${toolData.name}: ${err.message}`)
                }
            }
        }
        console.log(`\n\n✅ Successfully added ${newCount} NEW tools to Database & Algolia!`)

    } catch (error) {
        console.error('Critical Error:', error)
    } finally {
        await browser.close()
        process.exit(0)
    }
}

main()
