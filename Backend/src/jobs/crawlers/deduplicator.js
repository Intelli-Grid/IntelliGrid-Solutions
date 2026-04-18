/**
 * deduplicator.js
 * Prevents duplicate tools from being inserted into MongoDB.
 *
 * Strategy (runs in order, stops on first match):
 *  1. Exact URL hostname match — most reliable (chatgpt.com == chatgpt.com)
 *  2. Exact slug match       — catches same name, different source
 *  3. Fuzzy name similarity  — catches "ChatGPT" vs "Chat GPT" vs "chat-gpt"
 *
 * On duplicate found → updates existing record with new source/tags (enriches data).
 * On unique tool     → inserts fresh document.
 */

import stringSimilarity from 'string-similarity'
import Tool from '../../models/Tool.js'
import Category from '../../models/Category.js'
import { generateSlug } from './normalizer.js'

/**
 * Safely extracts the hostname from a URL string.
 * Returns empty string on invalid URL.
 */
function extractHostname(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '')
    } catch {
        return ''
    }
}

/**
 * Resolves a category slug string to its MongoDB ObjectId.
 * Falls back to the 'other' category if not found.
 * Caches results to avoid hitting DB on every tool.
 */
const categoryCache = new Map()
async function resolveCategoryId(slug) {
    if (categoryCache.has(slug)) return categoryCache.get(slug)
    const cat = await Category.findOne({ slug }).select('_id').lean()
    const id = cat?._id || null
    categoryCache.set(slug, id)
    return id
}

/**
 * Main deduplication + upsert function.
 * Takes an array of normalized tool objects and inserts only truly new ones.
 *
 * @param {Array} normalizedTools - Tools already passed through normalizeToSchema()
 * @returns {{ inserted: number, updated: number, skipped: number, errors: number }}
 */
export async function deduplicateAndUpsert(normalizedTools) {
    const stats = { inserted: 0, updated: 0, skipped: 0, errors: 0 }
    if (!normalizedTools?.length) return stats

    // ── Load existing tools for comparison (names + URLs + slugs only) ─────────
    // BUG FIX: was { isActive: true } — this missed pending/inactive tools and
    // allowed duplicate inserts for tools that hadn't been activated yet.
    // Load ALL tools (active + pending + inactive) for duplicate checking.
    const existingTools = await Tool.find(
        {},
        { name: 1, slug: 1, officialUrl: 1 }
    ).lean()

    const existingHostnames = new Set(
        existingTools.map(t => extractHostname(t.officialUrl)).filter(Boolean)
    )
    const existingSlugs = new Set(existingTools.map(t => t.slug).filter(Boolean))
    const existingNames = existingTools.map(t => t.name?.toLowerCase()).filter(Boolean)

    console.log(`[Deduplicator] Checking ${normalizedTools.length} tools against ${existingTools.length} existing records`)

    for (const tool of normalizedTools) {
        if (!tool) { stats.skipped++; continue }

        try {
            const hostname = extractHostname(tool.officialUrl)
            const slug = tool.slug || generateSlug(tool.name)

            // ── Check 1: Exact hostname match ──────────────────────────────────
            if (hostname && existingHostnames.has(hostname)) {
                // Enrich existing record with any new source data / tags
                await Tool.updateOne(
                    { officialUrl: { $regex: hostname.replace('.', '\\.'), $options: 'i' } },
                    {
                        $addToSet: {
                            ...(tool.dataSources?.length ? { dataSources: { $each: tool.dataSources } } : {}),
                            ...(tool.tags?.length ? { tags: { $each: tool.tags } } : {}),
                        },
                        $set: { lastUpdatedAt: new Date() },
                    }
                )
                stats.updated++
                continue
            }

            // ── Check 2: Exact slug match ──────────────────────────────────────
            if (slug && existingSlugs.has(slug)) {
                stats.skipped++
                continue
            }

            // ── Check 3: Fuzzy name similarity (>85% = likely duplicate) ───────
            if (existingNames.length > 0) {
                const { bestMatch } = stringSimilarity.findBestMatch(
                    tool.name.toLowerCase(),
                    existingNames
                )
                if (bestMatch.rating > 0.85) {
                    stats.skipped++
                    continue
                }
            }

            // ── New unique tool — resolve category ObjectId and insert ─────────
            const categoryId = tool.categorySlug
                ? await resolveCategoryId(tool.categorySlug)
                : null

            // Build the final document, removing the helper categorySlug field
            const { categorySlug, ...toolData } = tool
            const doc = {
                ...toolData,
                slug,
                ...(categoryId ? { category: categoryId } : {}),
                createdAt: new Date(),
                updatedAt: new Date(),
            }

            await Tool.create(doc)

            // Update in-memory sets so subsequent tools in the same batch are deduplicated
            if (hostname) existingHostnames.add(hostname)
            existingSlugs.add(slug)
            existingNames.push(tool.name.toLowerCase())

            stats.inserted++
        } catch (err) {
            if (err.code === 11000) {
                // MongoDB duplicate key — slug collision
                stats.skipped++
            } else {
                console.error(`[Deduplicator] Error inserting "${tool.name}":`, err.message)
                stats.errors++
            }
        }
    }

    console.log(`[Deduplicator] Done — inserted: ${stats.inserted}, updated: ${stats.updated}, skipped: ${stats.skipped}, errors: ${stats.errors}`)
    return stats
}
