/**
 * autoCategorize.js — Batch 4C
 *
 * Uses GPT-4o-mini to auto-classify a tool into one of IntelliGrid's
 * existing Category slugs. Falls back to the first active category
 * if OpenAI is unavailable or the key is not set.
 *
 * Cost: ~$0.000015 per tool (gpt-4o-mini input pricing).
 * For 100 tools/day this is < $0.002/day.
 */

import axios from 'axios'
import Category from '../models/Category.js'

// Allowed category slugs — fetched from DB once and cached in memory
let CATEGORY_CACHE = null
let CATEGORY_ID_MAP = {}  // slug -> _id

async function getCategories() {
    if (CATEGORY_CACHE) return CATEGORY_CACHE
    const cats = await Category.find({ isActive: { $ne: false } })
        .select('_id name slug')
        .lean()
    CATEGORY_CACHE = cats
    CATEGORY_ID_MAP = Object.fromEntries(cats.map(c => [c.slug, c._id]))
    // Reset cache every hour to pick up new categories
    setTimeout(() => { CATEGORY_CACHE = null }, 60 * 60 * 1000)
    return cats
}

/**
 * Classify a tool into one of the existing categories using GPT-4o-mini.
 * Returns { categoryId, categorySlug } or falls back to first category as default.
 *
 * @param {string} name - Tool name
 * @param {string} description - Tool short description
 * @returns {{ categoryId: ObjectId|null, categorySlug: string|null }}
 */
export async function autoCategorize(name, description) {
    const categories = await getCategories()

    if (!categories.length) {
        return { categoryId: null, categorySlug: null }
    }

    if (!process.env.OPENAI_API_KEY) {
        console.warn('[AutoCategorize] OPENAI_API_KEY not set — skipping AI classification')
        return { categoryId: null, categorySlug: null }
    }

    const categoryList = categories.map(c => `${c.slug} (${c.name})`).join('\n')

    try {
        const res = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content: `You are categorizing an AI tool for a directory website.

Available categories (slug format):
${categoryList}

Tool name: ${name}
Tool description: ${description || 'No description available'}

Reply with ONLY the slug of the most appropriate category. No explanation, no punctuation — just the slug.`,
                }],
                max_tokens: 30,
                temperature: 0,
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 8000,
            }
        )

        const slug = res.data.choices[0]?.message?.content?.trim().toLowerCase()

        // Validate returned slug is actually in our category list
        if (slug && CATEGORY_ID_MAP[slug]) {
            return { categoryId: CATEGORY_ID_MAP[slug], categorySlug: slug }
        }

        // If GPT returned something invalid, fall back to null (admin will assign)
        console.warn(`[AutoCategorize] GPT returned unknown slug "${slug}" for "${name}"`)
        return { categoryId: null, categorySlug: null }

    } catch (err) {
        console.error(`[AutoCategorize] OpenAI error for "${name}": ${err.message}`)
        return { categoryId: null, categorySlug: null }
    }
}
