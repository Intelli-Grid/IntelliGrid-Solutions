/**
 * Enhanced AI Tools Scraper & Updater
 * Uses Puppeteer to bypass bot protection and extract rich metadata
 */

import puppeteer from 'puppeteer'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

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

// Tool Schema
const toolSchema = new mongoose.Schema({
    name: String,
    slug: String,
    shortDescription: String,
    fullDescription: String,
    officialUrl: String,
    sourceUrl: String,
    category: String,
    pricing: {
        type: { type: String },
        price: String
    },
    tags: [String],
    source: String,
    isTrending: Boolean,
    createdAt: { type: Date, default: Date.now }
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

        // Timeout after 15 seconds to be fast
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
                image: getMeta('og:image'),
                keywords: getMeta('keywords')
            }
        })

        await page.close()
        return metadata
    } catch (error) {
        console.error(`⚠️ Failed to visit ${url}:`, error.message)
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

        // Extract tools from page
        const extractedTools = await page.evaluate(() => {
            const items = document.querySelectorAll('.styles_item__Yq_Hq') // Update selector if needed
            return Array.from(items).map(item => {
                const titleEl = item.querySelector('.styles_title__pzhVl')
                const descEl = item.querySelector('.styles_tagline__vWwlg')
                const linkEl = item.querySelector('a')

                if (!titleEl || !linkEl) return null

                return {
                    name: titleEl.innerText,
                    description: descEl ? descEl.innerText : '',
                    url: linkEl.href
                }
            }).filter(item => item !== null)
        })

        if (extractedTools) {
            for (const tool of extractedTools) {
                // Visit official site to get better data
                // Note: PH links redirect, so we'd need to follow them first.
                // For simplicity, we keep PH URL as source
                tools.push({
                    name: tool.name,
                    shortDescription: tool.description,
                    fullDescription: tool.description,
                    officialUrl: tool.url,
                    sourceUrl: tool.url,
                    category: 'AI Tools',
                    pricing: { type: 'freemium', price: '' },
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
// SCRAPER: GitHub Trending (Axios + Cheerio)
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
                    pricing: { type: 'free', price: 'Open Source' },
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
// SCRAPER: Hacker News (Axios + Cheerio)
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
                    shortDescription: `Trending AI discussion on Hacker News: ${title}`,
                    fullDescription: `Trending AI discussion on Hacker News: ${title}`,
                    officialUrl: link,
                    sourceUrl: link,
                    category: 'News & Discussions',
                    pricing: { type: 'unknown', price: '' },
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

    let allNewTools = []

    // 1. Run Axios-based Scrapers (Fast)
    const ghTools = await scrapeGitHub()
    const hnTools = await scrapeHackerNews()
    allNewTools = [...ghTools, ...hnTools]

    // 2. Run Puppeteer-based Scraper (Product Hunt)
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    try {
        // Scrape Sources
        const phTools = await scrapeProductHunt(browser)
        allNewTools = [...allNewTools, ...phTools]

        // --- EXISTING TOOLS UPDATER ---
        // Basic logic: Fetch random tools from DB that haven't been updated recently
        // and visit their websites to get fresh metadata
        console.log('\n🔄 Updating existing tools metadata...')
        const outdatedTools = await Tool.find({
            $or: [
                { fullDescription: { $exists: false } },
                { fullDescription: "" }
            ]
        }).limit(5) // Prioritize tools with missing descriptions

        for (const tool of outdatedTools) {
            console.log(`   Checking ${tool.name}...`)
            if (tool.officialUrl) {
                const meta = await enrichToolData(browser, tool.officialUrl)
                if (meta) {
                    if (meta.description && meta.description.length > 20) {
                        tool.fullDescription = meta.description
                        if (!tool.shortDescription) tool.shortDescription = meta.description.substring(0, 150)
                        tool.updatedAt = new Date()
                        await tool.save()
                        console.log(`   ✅ Updated metadata for ${tool.name}`)
                    }
                }
            }
        }

        // Save New Tools
        console.log(`\n💾 Processing ${allNewTools.length} potential new tools...`)
        let newCount = 0
        for (const toolData of allNewTools) {
            const slug = createSlug(toolData.name)
            const existing = await Tool.findOne({ slug })
            if (!existing) {
                try {
                    await new Tool({ ...toolData, slug }).save()
                    newCount++
                    process.stdout.write('.')
                } catch (err) {
                    // Ignore validation errors for now to keep running
                }
            }
        }
        console.log(`\n✅ Successfully added ${newCount} NEW tools to the database!`)

    } catch (error) {
        console.error('Critical Error:', error)
    } finally {
        await browser.close()
        process.exit(0)
    }
}

main()
