/**
 * AI Tools Auto-Update Scraper
 * Runs daily via GitHub Actions to fetch new AI tools
 * Sources: Product Hunt, Reddit, Twitter, GitHub
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
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

// Tool Schema (simplified)
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
    source: String, // Where we found it
    isTrending: Boolean,
    createdAt: { type: Date, default: Date.now }
})

const Tool = mongoose.model('Tool', toolSchema)

// ============================================
// SCRAPER 1: Product Hunt
// ============================================
async function scrapeProductHunt() {
    console.log('\n🔍 Scraping Product Hunt...')
    const tools = []

    try {
        // Product Hunt has a public API (no auth needed for basic data)
        const response = await axios.get('https://www.producthunt.com/topics/artificial-intelligence', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        })
        const $ = cheerio.load(response.data)

        // Parse product cards (adjust selectors as needed)
        $('.styles_item__Yq_Hq').each((i, element) => {
            const name = $(element).find('.styles_title__pzhVl').text().trim()
            const description = $(element).find('.styles_tagline__vWwlg').text().trim()
            const url = $(element).find('a').attr('href')

            if (name && description) {
                tools.push({
                    name,
                    shortDescription: description,
                    fullDescription: description,
                    officialUrl: url ? `https://www.producthunt.com${url}` : '',
                    sourceUrl: `https://www.producthunt.com${url}`,
                    category: 'AI Tools',
                    pricing: { type: 'freemium', price: '' },
                    tags: ['AI', 'New'],
                    source: 'Product Hunt',
                    isTrending: true
                })
            }
        })

        console.log(`✅ Found ${tools.length} tools from Product Hunt`)
    } catch (error) {
        console.error('❌ Product Hunt scraping failed:', error.message)
    }

    return tools
}

// ============================================
// SCRAPER 2: Reddit
// ============================================
async function scrapeReddit() {
    console.log('\n🔍 Scraping Reddit...')
    const tools = []

    try {
        // Reddit JSON API (no auth needed)
        const response = await axios.get('https://www.reddit.com/r/artificial/hot.json?limit=25', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        })
        const posts = response.data.data.children

        posts.forEach(post => {
            const data = post.data

            // Filter for tool announcements
            if (data.title.toLowerCase().includes('tool') ||
                data.title.toLowerCase().includes('launch') ||
                data.selftext.toLowerCase().includes('ai tool')) {

                tools.push({
                    name: data.title.substring(0, 100),
                    shortDescription: data.selftext.substring(0, 200) || data.title,
                    fullDescription: data.selftext || data.title,
                    officialUrl: data.url,
                    sourceUrl: `https://reddit.com${data.permalink}`,
                    category: 'AI Tools',
                    pricing: { type: 'unknown', price: '' },
                    tags: ['AI', 'Reddit'],
                    source: 'Reddit',
                    isTrending: true
                })
            }
        })

        console.log(`✅ Found ${tools.length} tools from Reddit`)
    } catch (error) {
        console.error('❌ Reddit scraping failed:', error.message)
    }

    return tools
}

// ============================================
// SCRAPER 3: GitHub Trending
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
            const name = $(element).find('h2 a').text().trim().replace(/\s+/g, ' ')
            const description = $(element).find('p').text().trim()
            const url = $(element).find('h2 a').attr('href')

            // Filter for AI-related repos
            if (description.toLowerCase().includes('ai') ||
                description.toLowerCase().includes('machine learning') ||
                description.toLowerCase().includes('neural')) {

                tools.push({
                    name: name.split('/')[1] || name,
                    shortDescription: description.substring(0, 200),
                    fullDescription: description,
                    officialUrl: `https://github.com${url}`,
                    sourceUrl: `https://github.com${url}`,
                    category: 'Developer Tools',
                    pricing: { type: 'free', price: 'Open Source' },
                    tags: ['AI', 'Open Source', 'GitHub'],
                    source: 'GitHub',
                    isTrending: true
                })
            }
        })

        console.log(`✅ Found ${tools.length} tools from GitHub`)
    } catch (error) {
        console.error('❌ GitHub scraping failed:', error.message)
    }

    return tools
}

// ============================================
// SCRAPER 4: Hacker News
// ============================================
async function scrapeHackerNews() {
    console.log('\n🔍 Scraping Hacker News...')
    const tools = []

    try {
        // Hacker News API
        const topStories = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json')
        const storyIds = topStories.data.slice(0, 30) // Top 30 stories

        for (const id of storyIds) {
            const story = await axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
            const data = story.data

            if (data.title &&
                (data.title.toLowerCase().includes('ai') ||
                    data.title.toLowerCase().includes('tool') ||
                    data.title.toLowerCase().includes('launch'))) {

                tools.push({
                    name: data.title.substring(0, 100),
                    shortDescription: data.title,
                    fullDescription: data.text || data.title,
                    officialUrl: data.url || `https://news.ycombinator.com/item?id=${id}`,
                    sourceUrl: `https://news.ycombinator.com/item?id=${id}`,
                    category: 'AI Tools',
                    pricing: { type: 'unknown', price: '' },
                    tags: ['AI', 'Hacker News'],
                    source: 'Hacker News',
                    isTrending: true
                })
            }
        }

        console.log(`✅ Found ${tools.length} tools from Hacker News`)
    } catch (error) {
        console.error('❌ Hacker News scraping failed:', error.message)
    }

    return tools
}

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
// UTILITY: Deduplicate Tools
// ============================================
function deduplicateTools(tools) {
    const seen = new Set()
    const unique = []

    for (const tool of tools) {
        const key = tool.name.toLowerCase().trim()
        if (!seen.has(key)) {
            seen.add(key)
            unique.push(tool)
        }
    }

    return unique
}

// ============================================
// MAIN: Save Tools to Database
// ============================================
async function saveTools(tools) {
    console.log(`\n💾 Saving ${tools.length} tools to database...`)
    let newCount = 0
    let updatedCount = 0
    let skippedCount = 0

    for (const toolData of tools) {
        try {
            const slug = createSlug(toolData.name)

            // Check if tool already exists
            const existing = await Tool.findOne({ slug })

            if (existing) {
                // Update existing tool
                existing.isTrending = true
                existing.updatedAt = new Date()
                await existing.save()
                updatedCount++
            } else {
                // Create new tool
                const newTool = new Tool({
                    ...toolData,
                    slug
                })
                await newTool.save()
                newCount++
            }
        } catch (error) {
            console.error(`❌ Failed to save ${toolData.name}:`, error.message)
            skippedCount++
        }
    }

    console.log(`\n📊 Results:`)
    console.log(`   ✅ New tools: ${newCount}`)
    console.log(`   🔄 Updated tools: ${updatedCount}`)
    console.log(`   ⏭️  Skipped: ${skippedCount}`)
}

// ============================================
// MAIN FUNCTION
// ============================================
async function main() {
    console.log('🚀 Starting AI Tools Auto-Update...\n')
    console.log(`📅 Date: ${new Date().toISOString()}`)

    try {
        // Connect to database
        await connectDB()

        // Run all scrapers in parallel
        const [phTools, redditTools, ghTools, hnTools] = await Promise.all([
            scrapeProductHunt(),
            scrapeReddit(),
            scrapeGitHub(),
            scrapeHackerNews()
        ])

        // Combine all tools
        const allTools = [...phTools, ...redditTools, ...ghTools, ...hnTools]
        console.log(`\n📦 Total tools found: ${allTools.length}`)

        // Deduplicate
        const uniqueTools = deduplicateTools(allTools)
        console.log(`🔍 Unique tools: ${uniqueTools.length}`)

        // Save to database
        if (uniqueTools.length > 0) {
            await saveTools(uniqueTools)
        } else {
            console.log('⚠️  No new tools found today')
        }

        console.log('\n✅ Auto-update completed successfully!')
        process.exit(0)
    } catch (error) {
        console.error('\n❌ Auto-update failed:', error)
        process.exit(1)
    }
}

// Run the script
main()
