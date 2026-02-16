/**
 * Bulk Polish All Tools - Complete Database Update
 * 
 * This script processes ALL tools in the database:
 * 1. Fetches missing logos and descriptions
 * 2. Migrates string-based categories to ObjectIds
 * 3. Updates MongoDB
 * 4. Syncs to Algolia
 * 
 * Usage: node scripts/bulkPolishAllTools.js
 */

import puppeteer from 'puppeteer'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import algoliasearch from 'algoliasearch'
import path from 'path'
import { fileURLToPath } from 'url'
import Tool from '../src/models/Tool.js'
import Category from '../src/models/Category.js'

// --- Setup ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env') })

// Configuration
const BATCH_SIZE = 50; // Process 50 tools at a time
const CONCURRENT_PAGES = 5; // Number of parallel browser pages
const PAGE_TIMEOUT = 15000; // 15 seconds per page

// Algolia Init
const client = algoliasearch(process.env.ALGOLIA_APP_ID, process.env.ALGOLIA_ADMIN_KEY)
const index = client.initIndex('ai_tools_index')

// Global Cache
let categoryMap = new Map();
let stats = {
    total: 0,
    processed: 0,
    logosAdded: 0,
    descriptionsUpdated: 0,
    categoriesMigrated: 0,
    errors: 0,
    skipped: 0
};

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

// --- Load Categories ---
async function loadCategories() {
    const categories = await Category.find({});
    categories.forEach(c => {
        categoryMap.set(c.name.toLowerCase(), c._id);
        categoryMap.set(c.slug.toLowerCase(), c._id);
    });
    console.log(`📚 Loaded ${categories.length} categories\n`);
}

// --- Match Category ---
function matchCategory(text) {
    if (!text) return null;
    text = text.toLowerCase();

    if (categoryMap.has(text)) return categoryMap.get(text);

    for (const [name, id] of categoryMap.entries()) {
        if (text.includes(name)) return id;
    }

    // Heuristics
    if (text.includes('image') || text.includes('art')) return categoryMap.get('image generator');
    if (text.includes('code') || text.includes('developer')) return categoryMap.get('developer tools');
    if (text.includes('text') || text.includes('writing')) return categoryMap.get('text & writing');
    if (text.includes('video')) return categoryMap.get('video generator');

    return null;
}

// --- Extract Metadata ---
async function extractMetadata(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });

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
            }
        });

        return data;
    } catch (error) {
        return null;
    }
}

// --- Process Single Tool ---
async function processTool(tool, page) {
    try {
        let updated = false;
        const updates = {};

        // Fix category if it's a string
        if (typeof tool.category === 'string') {
            const fixedCat = matchCategory(tool.category);
            if (fixedCat) {
                updates.category = fixedCat;
                stats.categoriesMigrated++;
                updated = true;
            } else {
                const defaultCat = await Category.findOne({ slug: 'productivity' });
                if (defaultCat) {
                    updates.category = defaultCat._id;
                    stats.categoriesMigrated++;
                    updated = true;
                }
            }
        }

        // Fetch metadata if needed
        if (tool.officialUrl && (!tool.metadata?.logo || tool.shortDescription?.length < 30)) {
            const meta = await extractMetadata(page, tool.officialUrl);

            if (meta) {
                // Add logo
                if (meta.image && (!tool.metadata?.logo || tool.metadata.logo.length < 5)) {
                    if (!updates['metadata']) updates['metadata'] = {};
                    updates['metadata.logo'] = meta.image;
                    stats.logosAdded++;
                    updated = true;
                }

                // Update description
                if (meta.description && (!tool.shortDescription || tool.shortDescription.length < 30)) {
                    updates.shortDescription = meta.description.substring(0, 150) + (meta.description.length > 150 ? '...' : '');
                    updates.fullDescription = meta.description;
                    stats.descriptionsUpdated++;
                    updated = true;
                }
            }
        }

        // Save updates
        if (updated) {
            await Tool.updateOne({ _id: tool._id }, { $set: updates });

            // Sync to Algolia
            try {
                await index.saveObject({
                    objectID: tool._id.toString(),
                    name: tool.name,
                    description: updates.shortDescription || tool.shortDescription,
                    category: updates.category || tool.category,
                    pricing: tool.pricing,
                    slug: tool.slug,
                    logo: updates['metadata.logo'] || tool.metadata?.logo
                });
            } catch (algErr) {
                // Algolia errors are non-critical
            }
        }

        stats.processed++;
        return true;
    } catch (error) {
        stats.errors++;
        return false;
    }
}

// --- Process Batch ---
async function processBatch(tools, browser) {
    const pages = [];

    // Create page pool
    for (let i = 0; i < Math.min(CONCURRENT_PAGES, tools.length); i++) {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        pages.push(page);
    }

    // Process tools
    const promises = tools.map((tool, index) => {
        const page = pages[index % pages.length];
        return processTool(tool, page);
    });

    await Promise.all(promises);

    // Close pages
    for (const page of pages) {
        await page.close();
    }
}

// --- Main Function ---
async function main() {
    console.log('🚀 Starting BULK Polish Operation...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await connectDB();
    await loadCategories();

    // Count total tools needing polish
    const totalCount = await Tool.countDocuments({
        status: 'active',
        $or: [
            { 'metadata.logo': { $exists: false } },
            { 'metadata.logo': '' },
            { shortDescription: { $regex: /^.{0,30}$/ } },
            { category: { $type: 'string' } } // String categories need migration
        ]
    });

    stats.total = totalCount;
    console.log(`📊 Found ${totalCount} tools needing polish\n`);

    if (totalCount === 0) {
        console.log('✅ All tools are already polished!\n');
        process.exit(0);
    }

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    try {
        let processedCount = 0;
        const totalBatches = Math.ceil(totalCount / BATCH_SIZE);

        while (processedCount < totalCount) {
            const currentBatch = Math.floor(processedCount / BATCH_SIZE) + 1;

            console.log(`\n📦 Processing Batch ${currentBatch}/${totalBatches} (${processedCount}/${totalCount} tools)...`);

            // Fetch batch
            const tools = await Tool.find({
                status: 'active',
                $or: [
                    { 'metadata.logo': { $exists: false } },
                    { 'metadata.logo': '' },
                    { shortDescription: { $regex: /^.{0,30}$/ } },
                    { category: { $type: 'string' } }
                ]
            }).limit(BATCH_SIZE).lean();

            if (tools.length === 0) break;

            await processBatch(tools, browser);
            processedCount += tools.length;

            // Progress update
            const percentage = ((processedCount / totalCount) * 100).toFixed(1);
            console.log(`   ✅ Batch complete! Progress: ${percentage}%`);
        }

    } catch (error) {
        console.error('\n❌ Critical Error:', error);
    } finally {
        await browser.close();
        await mongoose.disconnect();
    }

    // Final Report
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ BULK POLISH COMPLETE!\n');
    console.log('📊 Final Statistics:');
    console.log(`   Total Tools Processed: ${stats.processed}`);
    console.log(`   Logos Added: ${stats.logosAdded}`);
    console.log(`   Descriptions Updated: ${stats.descriptionsUpdated}`);
    console.log(`   Categories Migrated: ${stats.categoriesMigrated}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
}

main();
