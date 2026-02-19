/**
 * scrapeFuturepedia.js
 * ─────────────────────────────────────────────────────────────────
 * Scrapes real AI tool data from Futurepedia.io and imports it
 * into the IntelliGrid MongoDB database.
 *
 * Strategy:
 *  - Fetches category listing pages (which ARE server-rendered)
 *  - Parses tool links using absolute URL pattern:
 *    https://www.futurepedia.io/tool/<slug>
 *  - Visits each tool's detail page for full data + images
 *  - Extracts: name, description, official URL, logo, screenshots,
 *    pricing, tags, features, pros/cons
 *
 * Run:        node scripts/scrapeFuturepedia.js
 * Dry run:    node scripts/scrapeFuturepedia.js --dry-run
 * Resume:     node scripts/scrapeFuturepedia.js --resume
 * Limit:      node scripts/scrapeFuturepedia.js --limit=50
 * ─────────────────────────────────────────────────────────────────
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import slugify from 'slugify'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

const DRY_RUN = process.argv.includes('--dry-run')
const RESUME = process.argv.includes('--resume')
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit='))
const DETAIL_LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1]) : 50
const PROGRESS_FILE = path.join(__dirname, '../futurepedia_progress.json')

// ─── Category Mapping ─────────────────────────────────────────────
// Futurepedia sub-category slugs → IntelliGrid category names
// Each entry can have multiple fpSlugs (sub-categories) that map to one igName
const CATEGORIES = [
    {
        igName: 'Image Generation', icon: '🎨',
        fpSlugs: ['image-generators', 'text-to-image', 'image-editing', 'design-generators']
    },
    {
        igName: 'Video Generation', icon: '🎬',
        fpSlugs: ['video-generators', 'video-editing']
    },
    {
        igName: 'Writing & Content', icon: '✍️',
        fpSlugs: ['writing-generators', 'copywriting', 'text-generators', 'content-creation']
    },
    {
        igName: 'Developer Tools', icon: '💻',
        fpSlugs: ['code-assistant', 'developer-tools', 'sql-assistant', 'no-code']
    },
    {
        igName: 'Audio & Music', icon: '🎵',
        fpSlugs: ['audio-generators', 'music-generators', 'voice-generators', 'text-to-speech']
    },
    {
        igName: 'Productivity', icon: '⚡',
        fpSlugs: ['productivity', 'task-management', 'note-taking', 'meeting-assistant']
    },
    {
        igName: 'Business & Finance', icon: '💼',
        fpSlugs: ['business', 'finance', 'legal-assistant', 'hr-assistant']
    },
    {
        igName: 'Marketing & SEO', icon: '📈',
        fpSlugs: ['marketing', 'seo', 'advertising', 'social-media-assistant']
    },
    {
        igName: 'Research', icon: '🔬',
        fpSlugs: ['research-assistant', 'summarizer', 'knowledge-base']
    },
    {
        igName: 'Chatbots', icon: '🤖',
        fpSlugs: ['chatbots', 'ai-agents', 'personal-assistant']
    },
    {
        igName: 'Education', icon: '📚',
        fpSlugs: ['education-assistant', 'language-learning', 'tutoring']
    },
    {
        igName: 'Email & Communication', icon: '📧',
        fpSlugs: ['email-assistant', 'customer-support', 'sales-assistant']
    },
    {
        igName: 'Data & Analytics', icon: '📉',
        fpSlugs: ['data-analysis', 'spreadsheet-assistant', 'sql-assistant']
    },
    {
        igName: 'Automation', icon: '⚙️',
        fpSlugs: ['automations', 'workflow-automation']
    },
]

// ─── HTTP Client ──────────────────────────────────────────────────
const http = axios.create({
    timeout: 30000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
})

// ─── Utilities ────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const politeDelay = () => sleep(1500 + Math.random() * 1000)

const normalizePricing = (text = '') => {
    const t = text.toLowerCase()
    if (t.includes('freemium')) return 'Freemium'
    if (t.includes('free') && (t.includes('paid') || t.includes('pro') || t.includes('premium') || t.includes('plus'))) return 'Freemium'
    if (t.includes('free trial') || (t.includes('trial') && !t.includes('free'))) return 'Trial'
    if (t.includes('free')) return 'Free'
    if (t.includes('paid') || t.includes('subscription') || t.includes('$') || t.includes('per month') || t.includes('/mo')) return 'Paid'
    return 'Unknown'
}

const absoluteUrl = (url, base = 'https://www.futurepedia.io') => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    if (url.startsWith('//')) return `https:${url}`
    if (url.startsWith('/')) return `${base}${url}`
    return url
}

const isValidImageUrl = (url) => {
    if (!url || url.length < 10) return false
    const lower = url.toLowerCase()
    if (lower.includes('placeholder') || lower.includes('blank.') || lower.includes('1x1')) return false
    if (lower.includes('favicon')) return false
    // Must be an image extension or from known image CDNs
    return /\.(jpg|jpeg|png|webp|gif|avif)(\?|$|#)/.test(lower)
        || lower.includes('cdn')
        || lower.includes('cloudinary')
        || lower.includes('s3.amazonaws')
        || lower.includes('imagekit')
        || lower.includes('imgix')
        || lower.includes('futurepedia')
        || lower.includes('_next/image')
}

// ─── Parse tool slugs from a category listing page ───────────────
async function scrapeListingPage(fpSubSlug, page = 1) {
    const url = `https://www.futurepedia.io/ai-tools/${fpSubSlug}?page=${page}`
    console.log(`      📄 ${url}`)

    try {
        const { data } = await http.get(url)
        const $ = cheerio.load(data)
        const toolSlugs = new Set()

        // Futurepedia uses absolute URLs in <a> tags: https://www.futurepedia.io/tool/<slug>
        $('a').each((_, el) => {
            const href = $(el).attr('href') || ''
            // Match both absolute and relative tool URLs
            const match = href.match(/(?:https:\/\/www\.futurepedia\.io)?\/tool\/([a-z0-9-]+)/)
            if (match && match[1]) {
                toolSlugs.add(match[1])
            }
        })

        // Check for next page
        const hasNextPage = $('a').filter((_, el) => {
            const href = $(el).attr('href') || ''
            return href.includes(`page=${page + 1}`)
        }).length > 0

        return { slugs: [...toolSlugs], hasMore: hasNextPage && toolSlugs.size >= 5 }
    } catch (err) {
        if (err.response?.status === 404) return { slugs: [], hasMore: false }
        console.error(`      ❌ Listing error: ${err.message}`)
        return { slugs: [], hasMore: false }
    }
}

// ─── Scrape individual tool detail page ──────────────────────────
async function scrapeToolDetail(fpSlug) {
    const url = `https://www.futurepedia.io/tool/${fpSlug}`

    try {
        const { data } = await http.get(url)
        const $ = cheerio.load(data)

        // ── Name ──────────────────────────────────────────────────
        let name = $('h1').first().text().trim()
        if (!name) name = $('title').text().split('|')[0].split('Reviews')[0].trim()

        // ── Short description (OG description is most reliable) ───
        let shortDescription = $('meta[property="og:description"]').attr('content')
            || $('meta[name="description"]').attr('content')
            || ''
        shortDescription = shortDescription.substring(0, 490).trim()

        // ── Full description ──────────────────────────────────────
        // Futurepedia has a "What is X?" section
        let fullDescription = ''
        const bodyText = $('body').text()

        // Extract "What is X?" section
        const whatIsMatch = bodyText.match(/What is [^?]+\?\s*([\s\S]{100,2000}?)(?:Key Features|Pros|Cons|Who is Using|Pricing|Reviews|$)/i)
        if (whatIsMatch) {
            fullDescription = whatIsMatch[1].trim()
        }

        // Fallback: collect paragraphs from main content
        if (!fullDescription || fullDescription.length < 80) {
            fullDescription = $('main p, article p, [class*="description"] p').map((_, el) => {
                const t = $(el).text().trim()
                return t.length > 30 ? t : ''
            }).get().filter(Boolean).slice(0, 5).join('\n\n')
        }

        if (!fullDescription) fullDescription = shortDescription

        // ── Key Features ──────────────────────────────────────────
        const features = []
        // Look for "Key Features:" section
        const featuresMatch = bodyText.match(/Key Features?:?\s*((?:[-•*]\s*.+\n?){1,10})/i)
        if (featuresMatch) {
            featuresMatch[1].split('\n').forEach(line => {
                const clean = line.replace(/^[-•*]\s*/, '').trim()
                if (clean && clean.length > 5 && clean.length < 150) features.push(clean)
            })
        }
        // Also try list items near "features"
        if (features.length === 0) {
            $('li').each((_, el) => {
                const text = $(el).text().trim()
                if (text && text.length > 10 && text.length < 150 && !features.includes(text)) {
                    features.push(text)
                }
            })
        }

        // ── Official URL ──────────────────────────────────────────
        let officialUrl = ''
        // Futurepedia "Visit" buttons use affiliate links or direct URLs
        $('a[target="_blank"]').each((_, el) => {
            const href = $(el).attr('href') || ''
            const text = $(el).text().toLowerCase().trim()
            if (!href.includes('futurepedia.io') && href.startsWith('http') && !officialUrl) {
                if (['visit', 'get deal', 'try free', 'open app', 'launch', 'start free', 'get started'].some(t => text.includes(t))) {
                    officialUrl = href
                }
            }
        })
        // Fallback: first external link
        if (!officialUrl) {
            $('a[target="_blank"]').each((_, el) => {
                const href = $(el).attr('href') || ''
                if (href.startsWith('http') && !href.includes('futurepedia.io') &&
                    !href.includes('twitter.com') && !href.includes('linkedin.com') &&
                    !href.includes('facebook.com') && !href.includes('youtube.com') &&
                    !officialUrl) {
                    officialUrl = href
                }
            })
        }

        // ── Logo ──────────────────────────────────────────────────
        let logo = ''

        // 1. OG image (Futurepedia sets this to the tool logo)
        const ogImage = $('meta[property="og:image"]').attr('content') || ''
        if (ogImage && isValidImageUrl(ogImage)) logo = absoluteUrl(ogImage)

        // 2. Dedicated logo element
        if (!logo) {
            const logoSelectors = [
                'img[alt*="logo" i]',
                'img[class*="logo" i]',
                '[class*="logo" i] img',
                '[class*="tool-icon" i] img',
                '[class*="toolIcon" i] img',
                'header img:first-of-type',
                'nav img:first-of-type',
            ]
            for (const sel of logoSelectors) {
                const el = $(sel).first()
                const src = absoluteUrl(el.attr('src') || el.attr('data-src') || '')
                if (src && isValidImageUrl(src)) {
                    logo = src
                    break
                }
            }
        }

        // 3. First img with the tool name in alt
        if (!logo && name) {
            $('img').each((_, el) => {
                const alt = ($(el).attr('alt') || '').toLowerCase()
                const src = absoluteUrl($(el).attr('src') || '')
                if (alt.includes(name.toLowerCase().substring(0, 6)) && isValidImageUrl(src)) {
                    logo = src
                    return false
                }
            })
        }

        // ── Screenshots ───────────────────────────────────────────
        const screenshots = []
        const seenUrls = new Set([logo])

        // Priority selectors for screenshots
        const screenshotSelectors = [
            '[class*="screenshot" i] img',
            '[class*="gallery" i] img',
            '[class*="preview" i] img',
            '[class*="media" i] img',
            '[class*="carousel" i] img',
            'figure img',
            '[class*="image-container" i] img',
            'main img',
            'article img',
        ]

        for (const sel of screenshotSelectors) {
            $(sel).each((_, el) => {
                const src = absoluteUrl(
                    $(el).attr('src') ||
                    $(el).attr('data-src') ||
                    $(el).attr('data-lazy-src') ||
                    $(el).attr('data-original') || ''
                )
                const width = parseInt($(el).attr('width') || '0')
                const height = parseInt($(el).attr('height') || '0')

                // Skip tiny images (icons, avatars) and already-seen URLs
                if (!src || seenUrls.has(src)) return
                if (!isValidImageUrl(src)) return
                if ((width > 0 && width < 100) || (height > 0 && height < 100)) return

                seenUrls.add(src)
                screenshots.push(src)
            })
            if (screenshots.length >= 5) break
        }

        // ── Pricing ───────────────────────────────────────────────
        let pricing = 'Unknown'
        // Check pricing-specific elements first
        const pricingEl = $('[class*="pricing" i], [class*="price" i], [class*="plan" i]').first().text()
        if (pricingEl) pricing = normalizePricing(pricingEl)

        // Fallback: check page text for pricing keywords
        if (pricing === 'Unknown') {
            const pricingSection = bodyText.match(/Pricing?:?\s*([^\n]{5,100})/i)
            if (pricingSection) pricing = normalizePricing(pricingSection[1])
        }

        // ── Tags ──────────────────────────────────────────────────
        const tags = []
        // Futurepedia uses #hashtag links for categories
        $('a[href*="/ai-tools/"]').each((_, el) => {
            const text = $(el).text().replace(/^#/, '').trim()
            if (text && text.length > 1 && text.length < 40 && !tags.includes(text)) {
                tags.push(text)
            }
        })

        return {
            name,
            shortDescription,
            fullDescription,
            officialUrl,
            logo,
            screenshots: screenshots.slice(0, 5),
            pricing,
            tags: [...new Set(tags)].slice(0, 10),
            features: features.slice(0, 10),
        }
    } catch (err) {
        if (err.response?.status === 404) return null
        console.error(`      ❌ Detail error for ${fpSlug}: ${err.message}`)
        return null
    }
}

// ─── DB Connection ────────────────────────────────────────────────
const connectDB = async () => {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('✅ MongoDB Connected\n')
}

// ─── Ensure categories exist in DB ───────────────────────────────
async function ensureCategories() {
    const col = mongoose.connection.collection('categories')
    const map = {}

    for (const { igName, icon } of CATEGORIES) {
        const slug = slugify(igName, { lower: true, strict: true })
        let cat = await col.findOne({ slug })
        if (!cat) {
            const res = await col.insertOne({
                name: igName, slug,
                description: `Discover the best ${igName} AI tools`,
                icon, isActive: true, order: 0, toolCount: 0,
                createdAt: new Date(), updatedAt: new Date(),
            })
            cat = { _id: res.insertedId }
            console.log(`   ✅ Created category: ${igName}`)
        }
        map[igName] = cat._id
    }
    return map
}

// ─── Save tool to MongoDB ─────────────────────────────────────────
async function saveTool(tool, categoryMap) {
    const col = mongoose.connection.collection('tools')
    const slug = slugify(tool.name || '', { lower: true, strict: true })
    if (!slug) return 'skip'

    const categoryId = categoryMap[tool.igCategory] || null

    const doc = {
        name: tool.name,
        slug,
        officialUrl: tool.officialUrl || `https://www.futurepedia.io/tool/${tool.fpSlug}`,
        sourceUrl: `https://www.intelligrid.online/tools/${slug}`,
        shortDescription: (tool.shortDescription || `${tool.name} is an AI-powered tool.`).substring(0, 490),
        fullDescription: tool.fullDescription || tool.shortDescription || `${tool.name} is an AI-powered tool.`,
        category: categoryId,
        tags: tool.tags || [],
        pricing: tool.pricing || 'Unknown',
        features: tool.features || [],
        // Top-level image fields (ToolCard reads tool.logo directly)
        logo: tool.logo || '',
        screenshots: tool.screenshots || [],
        // metadata sub-doc (ToolScreenshots reads tool.metadata?.logo)
        metadata: {
            logo: tool.logo || '',
            screenshots: tool.screenshots || [],
            videoUrl: '',
        },
        status: 'active',
        isFeatured: false,
        isTrending: false,
        isVerified: false,
        ratings: { average: 0, count: 0 },
        views: 0,
        favorites: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    }

    try {
        const existing = await col.findOne({ slug })
        if (existing) {
            const updates = { updatedAt: new Date() }
            if (tool.logo && !existing.logo) {
                updates.logo = tool.logo
                updates['metadata.logo'] = tool.logo
            }
            if (tool.screenshots?.length && !existing.screenshots?.length) {
                updates.screenshots = tool.screenshots
                updates['metadata.screenshots'] = tool.screenshots
            }
            if (tool.officialUrl && !existing.officialUrl) updates.officialUrl = tool.officialUrl
            if ((tool.fullDescription?.length || 0) > (existing.fullDescription?.length || 0)) {
                updates.fullDescription = tool.fullDescription
            }
            if (categoryId && !existing.category) updates.category = categoryId
            if (tool.features?.length && !existing.features?.length) updates.features = tool.features
            if (tool.tags?.length && !existing.tags?.length) updates.tags = tool.tags

            if (Object.keys(updates).length > 1) {
                await col.updateOne({ slug }, { $set: updates })
                return 'updated'
            }
            return 'skip'
        } else {
            await col.insertOne(doc)
            return 'inserted'
        }
    } catch (err) {
        if (err.code === 11000) return 'skip'
        throw err
    }
}

// ─── Main ─────────────────────────────────────────────────────────
async function main() {
    console.log('🚀 IntelliGrid — Futurepedia Scraper (with Images)')
    console.log('═══════════════════════════════════════════════════')
    console.log(`Mode:          ${DRY_RUN ? '🔍 DRY RUN' : '📥 IMPORT'}`)
    console.log(`Detail limit:  ${DETAIL_LIMIT} tools per sub-category`)
    console.log(`Resume:        ${RESUME ? 'Yes' : 'No'}\n`)

    // Load progress
    let progress = { completedSubSlugs: [], allTools: [] }
    if (RESUME && fs.existsSync(PROGRESS_FILE)) {
        progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'))
        console.log(`📂 Resuming: ${progress.allTools.length} tools already scraped\n`)
    }

    if (!DRY_RUN) await connectDB()

    let categoryMap = {}
    if (!DRY_RUN) {
        console.log('📁 Ensuring categories...')
        categoryMap = await ensureCategories()
        console.log(`✅ ${Object.keys(categoryMap).length} categories ready\n`)
    }

    const allTools = [...progress.allTools]
    const seenSlugs = new Set(allTools.map(t => t.fpSlug))
    let totalInserted = 0, totalUpdated = 0, totalSkipped = 0

    for (const cat of CATEGORIES) {
        console.log(`\n🔍 Category: ${cat.igName}`)

        for (const fpSubSlug of cat.fpSlugs) {
            if (progress.completedSubSlugs.includes(fpSubSlug)) {
                console.log(`   ⏭️  Skipping sub-category: ${fpSubSlug} (already done)`)
                continue
            }

            console.log(`   📂 Sub-category: ${fpSubSlug}`)

            // Step 1: Collect tool slugs from listing pages
            const toolSlugs = []
            let page = 1, hasMore = true

            while (hasMore && page <= 10) {
                const { slugs, hasMore: more } = await scrapeListingPage(fpSubSlug, page)
                slugs.forEach(s => { if (!toolSlugs.includes(s)) toolSlugs.push(s) })
                hasMore = more
                page++
                if (hasMore) await politeDelay()
            }

            console.log(`   📦 Found ${toolSlugs.length} tool slugs`)

            // Step 2: Scrape detail pages
            const limit = Math.min(toolSlugs.length, DETAIL_LIMIT)
            let subInserted = 0, subUpdated = 0, subSkipped = 0

            for (let i = 0; i < limit; i++) {
                const fpSlug = toolSlugs[i]

                // Skip already-scraped tools
                if (seenSlugs.has(fpSlug)) { subSkipped++; continue }
                seenSlugs.add(fpSlug)

                const detail = await scrapeToolDetail(fpSlug)

                if (!detail || !detail.name) {
                    subSkipped++
                    await politeDelay()
                    continue
                }

                const tool = { ...detail, fpSlug, igCategory: cat.igName }
                allTools.push(tool)

                if (!DRY_RUN) {
                    try {
                        const result = await saveTool(tool, categoryMap)
                        if (result === 'inserted') { subInserted++; totalInserted++ }
                        else if (result === 'updated') { subUpdated++; totalUpdated++ }
                        else { subSkipped++; totalSkipped++ }
                    } catch (err) {
                        console.error(`   ❌ Save error: ${err.message}`)
                        subSkipped++; totalSkipped++
                    }
                }

                // Progress every 10 tools
                if ((i + 1) % 10 === 0) {
                    const recent = allTools.slice(-10)
                    const logos = recent.filter(t => t.logo).length
                    const shots = recent.filter(t => t.screenshots?.length > 0).length
                    console.log(`   ⏳ ${i + 1}/${limit} — logos: ${logos}/10, screenshots: ${shots}/10`)
                }

                await politeDelay()
            }

            console.log(`   ✅ ${fpSubSlug}: inserted ${subInserted}, updated ${subUpdated}, skipped ${subSkipped}`)

            // Save progress after each sub-category
            progress.completedSubSlugs.push(fpSubSlug)
            progress.allTools = allTools
            fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))

            await politeDelay()
        }
    }

    // ── Final Summary ─────────────────────────────────────────────
    const withLogos = allTools.filter(t => t.logo).length
    const withScreenshots = allTools.filter(t => t.screenshots?.length > 0).length

    console.log('\n✨ Scraping Complete!')
    console.log('═══════════════════════════════════════════════════')
    console.log(`   Total tools scraped:     ${allTools.length}`)
    console.log(`   Tools with logos:        ${withLogos} (${allTools.length ? Math.round(withLogos / allTools.length * 100) : 0}%)`)
    console.log(`   Tools with screenshots:  ${withScreenshots} (${allTools.length ? Math.round(withScreenshots / allTools.length * 100) : 0}%)`)

    if (!DRY_RUN) {
        console.log(`\n   ✅ Inserted:  ${totalInserted}`)
        console.log(`   🔄 Updated:   ${totalUpdated}`)
        console.log(`   ⏭️  Skipped:   ${totalSkipped}`)

        const finalCount = await mongoose.connection.collection('tools').countDocuments()
        console.log(`\n🗄️  Total tools in database: ${finalCount}`)
    }

    if (DRY_RUN && allTools.length > 0) {
        console.log('\n📝 Sample tools:')
        allTools.slice(0, 8).forEach((t, i) => {
            console.log(`\n   ${i + 1}. ${t.name} [${t.igCategory}] — ${t.pricing}`)
            console.log(`      Logo:        ${t.logo || '(none)'}`)
            console.log(`      Screenshots: ${t.screenshots?.length || 0}`)
            console.log(`      Tags:        ${t.tags?.slice(0, 3).join(', ')}`)
            console.log(`      Desc:        ${t.shortDescription?.substring(0, 80)}...`)
        })
        console.log('\n✋ DRY RUN done. Run without --dry-run to import.')
    }

    // Clean up progress file on full success (non-resume mode)
    if (!RESUME && fs.existsSync(PROGRESS_FILE)) {
        fs.unlinkSync(PROGRESS_FILE)
    }

    console.log('\n🎉 Next: run `node scripts/syncAlgolia.js` to update search index.')
    process.exit(0)
}

main().catch(err => {
    console.error('\n❌ Fatal:', err.message)
    process.exit(1)
})
