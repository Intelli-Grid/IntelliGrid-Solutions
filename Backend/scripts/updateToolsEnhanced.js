/**
 * Enhanced AI Tools Manager
 * 
 * Capabilities:
 * 1. Polishes existing data (fetches missing logos, descriptions)
 * 2. Scrapes new tools from sources (Product Hunt, GitHub)
 * 3. Categorizes tools automatically
 * 4. Queues new tools for Admin Review ('pending' status)
 * 5. Syncs updates to Algolia
 * 
 * Usage: node scripts/updateToolsEnhanced.js [--polish-only] [--scrape-only]
 */

import puppeteer from 'puppeteer'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import algoliasearch from 'algoliasearch'
import path from 'path'
import { fileURLToPath } from 'url'
import Tool from '../src/models/Tool.js'
import Category from '../src/models/Category.js'

// --- Configuration ---
const POLISH_BATCH_SIZE = 100; // Number of existing tools to polish per run
const SCRAPE_LIMIT = 50;      // Max new tools to scrape per source
const HEADLESS_MODE = true;   // Set to false for debugging

// --- Setup ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

// Algolia Init
const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_KEY)
const index = client.initIndex('ai_tools_index')

// Global Cache
let categoryMap = new Map(); // Name -> ObjectId
let domainBlocklist = new Set(['google.com', 'facebook.com', 'twitter.com', 'github.com', 'youtube.com']);

// --- Database Connection ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('✅ MongoDB connected')
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error)
        process.exit(1)
    }
}

// --- Helpers ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function normalizeUrl(url) {
    if (!url) return '';
    try {
        const u = new URL(url);
        return u.hostname.replace('www.', '').toLowerCase();
    } catch (e) {
        return '';
    }
}

function createSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

async function loadCategories() {
    const categories = await Category.find({});
    categories.forEach(c => {
        categoryMap.set(c.name.toLowerCase(), c._id);
        // Also map slug
        categoryMap.set(c.slug.toLowerCase(), c._id);
    });
    console.log(`📚 Loaded ${categories.length} categories for matching.`);
}

function matchCategory(text) {
    if (!text) return null;
    text = text.toLowerCase();

    // 1. Exact Match
    if (categoryMap.has(text)) return categoryMap.get(text);

    // 2. Keyword Match
    for (const [name, id] of categoryMap.entries()) {
        if (text.includes(name)) return id;
    }

    // 3. Fallback Heuristics
    if (text.includes('image') || text.includes('art') || text.includes('drawing')) return categoryMap.get('image generator');
    if (text.includes('code') || text.includes('programming') || text.includes('developer')) return categoryMap.get('developer tools');
    if (text.includes('text') || text.includes('writing') || text.includes('copy')) return categoryMap.get('text & writing');
    if (text.includes('video') || text.includes('movie')) return categoryMap.get('video generator');

    return null; // Defined by Admin later
}

// --- Core Logic: Extract Metadata ---
async function extractMetadata(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

        // Basic extraction
        const data = await page.evaluate(() => {
            const getMeta = (name) => {
                const element = document.querySelector(`meta[name="${name}"]`) ||
                    document.querySelector(`meta[property="${name}"]`)
                return element ? element.getAttribute('content') : null
            }

            return {
                title: document.title || getMeta('og:title'),
                description: getMeta('description') || getMeta('og:description'),
                image: getMeta('og:image') || getMeta('twitter:image'),
                icon: document.querySelector('link[rel="icon"]')?.href
            }
        });

        return data;
    } catch (error) {
        // console.warn(`   ⚠️ Warning: Could not fully load ${url}: ${error.message}`);
        return null;
    }
}

// --- Task 1: Polish Existing Tools ---
async function polishExistingTools(browser) {
    console.log('\n✨ Starting Polish Phase (Enriching existing tools)...');

    // Find tools that have missing metadata or very short descriptions
    // Focusing on Active tools first
    const toolsToPolish = await Tool.find({
        status: 'active',
        $or: [
            { 'metadata.logo': { $exists: false } },
            { 'metadata.logo': '' },
            { shortDescription: { $regex: /^.{0,30}$/ } } // Less than 30 chars
        ]
    }).limit(POLISH_BATCH_SIZE).lean(); // Use lean() to avoid CastError on load

    if (toolsToPolish.length === 0) {
        console.log('   ✅ No tools need polishing right now.');
        return;
    }

    console.log(`   found ${toolsToPolish.length} tools to polish.`);

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    for (const tool of toolsToPolish) {
        console.log(`   ➡️ Polishing: ${tool.name} (${tool.officialUrl})...`);

        if (!tool.officialUrl) continue;

        // MIGRATION FIX: If category is a string, try to fix it
        if (typeof tool.category === 'string') {
            const fixedCat = matchCategory(tool.category);
            if (fixedCat) {
                tool.category = fixedCat;
                console.log(`      (Migrated Category: ${tool.category})`);
            } else {
                // Fallback to default
                const defaultCat = await Category.findOne({ slug: 'productivity' });
                if (defaultCat) tool.category = defaultCat._id;
            }
        }

        const meta = await extractMetadata(page, tool.officialUrl);

        if (meta) {
            let updated = false;

            // Update Logo
            if (meta.image && (!tool.metadata?.logo || tool.metadata.logo.length < 5)) {
                if (!tool.metadata) tool.metadata = {};
                tool.metadata.logo = meta.image;
                console.log(`      + Added Logo`);
                updated = true;
            }

            // Update Description if current is bad
            if (meta.description && (!tool.shortDescription || tool.shortDescription.length < 30)) {
                // Truncate to 150 chars for shortDesc
                tool.shortDescription = meta.description.substring(0, 150) + (meta.description.length > 150 ? '...' : '');
                tool.fullDescription = meta.description; // Potentially longer
                console.log(`      + Updated Description`);
                updated = true;
            }

            if (updated) {
                // Use updateOne instead of save() because we are using lean() objects
                await Tool.updateOne({ _id: tool._id }, {
                    $set: {
                        category: tool.category, // Save the migrated category
                        'metadata.logo': tool.metadata.logo,
                        shortDescription: tool.shortDescription,
                        fullDescription: tool.fullDescription
                    }
                });

                // Sync to Algolia
                await index.saveObject({
                    objectID: tool._id.toString(),
                    name: tool.name,
                    description: tool.shortDescription,
                    category: tool.category,
                    pricing: tool.pricing,
                    slug: tool.slug,
                    logo: tool.metadata.logo
                }).catch(e => console.error(`      Algolia Sync Error: ${e.message}`));
            } else {
                console.log(`      (No better data found)`);
            }
        }
    }
    await page.close();
}

// --- Task 2: Scrape New Tools ---
async function scrapeProductHunt(browser) {
    console.log('\n🔍 Scraping Product Hunt for NEW tools...');
    const page = await browser.newPage();
    const newTools = [];

    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.goto('https://www.producthunt.com/topics/artificial-intelligence', { waitUntil: 'networkidle2', timeout: 30000 });

        // Basic scraper logic for Product Hunt list
        const extracted = await page.evaluate(() => {
            const nodes = document.querySelectorAll('[class*="styles_item__"]');
            return Array.from(nodes).map(n => {
                const title = n.querySelector('h3, [class*="title"]')?.innerText;
                const desc = n.querySelector('[class*="tagline"]')?.innerText;
                const link = n.querySelector('a[href*="/posts/"]')?.href;
                return { title, desc, link };
            }).filter(x => x.title && x.link);
        });

        console.log(`   Found ${extracted.length} raw items on PH.`);

        // Process found tools
        for (const item of extracted) {
            if (newTools.length >= SCRAPE_LIMIT) break;

            const slug = createSlug(item.title);

            // Check De-duplication (DB)
            const exists = await Tool.findOne({
                $or: [{ slug: slug }, { name: item.title }]
            });

            if (!exists) {
                // Need to visit the PH page to get the REAL URL (external link)
                // This is expensive, so we do it sparingly
                try {
                    const detailPage = await browser.newPage();
                    await detailPage.goto(item.link, { waitUntil: 'domcontentloaded', timeout: 15000 });

                    // Try to find the "Visit" button
                    const realUrl = await detailPage.evaluate(() => {
                        // Product Hunt buttons usually say "Visit" or "Get it"
                        const links = Array.from(document.querySelectorAll('a'));
                        const visitLink = links.find(a => a.innerText.includes('Visit') || a.innerText.includes('Get It'));
                        return visitLink ? visitLink.href : null;
                    });

                    await detailPage.close();

                    if (realUrl) {
                        const domain = normalizeUrl(realUrl);
                        // Check domain duplication
                        const domainExists = await Tool.findOne({ officialUrl: { $regex: domain } });

                        if (!domainExists) {
                            newTools.push({
                                name: item.title,
                                slug: slug,
                                shortDescription: item.desc,
                                fullDescription: item.desc, // Fallback
                                officialUrl: realUrl,
                                sourceUrl: realUrl, // For now
                                status: 'pending',   // <--- IMPORTANT
                                category: matchCategory(item.desc),
                                pricing: 'Unknown',
                                source: 'Product Hunt'
                            });
                            console.log(`   + Queueing: ${item.title}`);
                        }
                    }
                } catch (e) {
                    console.log(`   Skipping ${item.title}: ${e.message}`);
                }
            }
        }

    } catch (e) {
        console.error(`   Product Hunt Scrape Error: ${e.message}`);
    } finally {
        await page.close();
    }

    return newTools;
}

// --- Main Runner ---
async function main() {
    console.log('🚀 Starting Intelligent Tool Updater...');
    await connectDB();
    await loadCategories();

    const browser = await puppeteer.launch({
        headless: HEADLESS_MODE ? "new" : false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const args = process.argv.slice(2);
    const runPolish = !args.includes('--scrape-only');
    const runScrape = !args.includes('--polish-only');

    try {
        // 1. Polish
        if (runPolish) {
            await polishExistingTools(browser);
        }

        // 2. Scrape
        if (runScrape) {
            const newTools = await scrapeProductHunt(browser);

            // Save new tools
            if (newTools.length > 0) {
                console.log(`\n💾 Saving ${newTools.length} new Pending tools...`);
                for (const toolData of newTools) {
                    try {
                        // Final categorization validation
                        const defaultCategory = await Category.findOne({ slug: 'productivity' });
                        if (!toolData.category) toolData.category = defaultCategory?._id;

                        const t = new Tool(toolData);
                        await t.save();
                    } catch (err) {
                        console.error(`   Failed to save ${toolData.name}: ${err.message}`);
                    }
                }
                console.log('✅ New tools saved to "Pending" status. Review them in Admin Dashboard.');
            } else {
                console.log('\n🤷 No new unique tools found this run.');
            }
        }

    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    } finally {
        await browser.close();
        await mongoose.disconnect();
        process.exit(0);
    }
}

main();
