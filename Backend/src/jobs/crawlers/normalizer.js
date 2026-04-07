/**
 * normalizer.js
 * Maps raw scraped tool data from any source to the IntelliGrid Tool schema.
 *
 * Key rules:
 *  - officialUrl is required — tools without a valid URL are dropped
 *  - category is stored as a string slug (resolved to ObjectId by the importer)
 *  - pricing enum must match Tool.js: Free | Freemium | Paid | Trial | Unknown
 *  - slug is generated from name and must be URL-safe
 *  - status is always 'active' for crawled tools
 *  - sourceFoundBy is always 'scraper'
 */

// ── Category mapping: raw scraped text → IntelliGrid category slug ─────────────
const CATEGORY_MAP = {
    'writing': 'writing-content',
    'content': 'writing-content',
    'copywriting': 'writing-content',
    'image generation': 'image-generation',
    'image': 'image-generation',
    'art': 'image-generation',
    'photo': 'image-generation',
    'video': 'video-creation',
    'video generation': 'video-creation',
    'video editing': 'video-creation',
    'code': 'code-development',
    'coding': 'code-development',
    'developer': 'code-development',
    'development': 'code-development',
    'productivity': 'productivity',
    'marketing': 'marketing',
    'seo': 'marketing',
    'advertising': 'marketing',
    'chatbot': 'chatbots-assistants',
    'assistant': 'chatbots-assistants',
    'chat': 'chatbots-assistants',
    'research': 'research-search',
    'search': 'research-search',
    'audio': 'audio-music',
    'music': 'audio-music',
    'voice': 'audio-music',
    'design': 'design-creativity',
    'graphic': 'design-creativity',
    'ui': 'design-creativity',
    'data': 'data-analytics',
    'analytics': 'data-analytics',
    'education': 'education-learning',
    'learning': 'education-learning',
    'finance': 'finance-business',
    'business': 'finance-business',
    'health': 'health-wellness',
    'healthcare': 'health-wellness',
    'legal': 'legal',
    'hr': 'human-resources',
    'recruiting': 'human-resources',
    'customer': 'customer-support',
    'support': 'customer-support',
    'social media': 'social-media',
    'social': 'social-media',
    'presentation': 'productivity',
    'document': 'writing-content',
    'transcription': 'audio-music',
    'translation': 'writing-content',
    'summarization': 'research-search',
    'automation': 'productivity',
    'workflow': 'productivity',
    '3d': 'design-creativity',
    'avatar': 'image-generation',
    'game': 'design-creativity',
}

// ── Pricing mapping ────────────────────────────────────────────────────────────
const PRICING_MAP = {
    'free': 'Free',
    'freemium': 'Freemium',
    'free trial': 'Trial',
    'trial': 'Trial',
    'paid': 'Paid',
    'premium': 'Paid',
    'subscription': 'Paid',
    'contact': 'Paid',
    'open source': 'Free',
    'opensource': 'Free',
}

/**
 * Converts a raw category string to a known IntelliGrid category slug.
 * Falls back to 'other' if no match found.
 */
export function normalizeCategory(raw = '') {
    if (!raw) return 'other'
    const lower = raw.toLowerCase().trim()
    for (const [key, value] of Object.entries(CATEGORY_MAP)) {
        if (lower.includes(key)) return value
    }
    return 'other'
}

/**
 * Converts raw pricing string to a valid IntelliGrid pricing enum value.
 */
export function normalizePricing(raw = '') {
    if (!raw) return 'Unknown'
    const lower = raw.toLowerCase().trim()
    for (const [key, value] of Object.entries(PRICING_MAP)) {
        if (lower.includes(key)) return value
    }
    return 'Unknown'
}

/**
 * Generates a URL-safe slug from a tool name.
 * Ensures uniqueness is handled downstream by the deduplicator.
 */
export function generateSlug(name = '') {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .substring(0, 120) // Prevent extremely long slugs
}

/**
 * Maps a raw scraped tool object to the IntelliGrid Tool schema format.
 * Returns null if the tool lacks the minimum required fields (name + URL).
 *
 * @param {Object} raw - Raw scraped tool object from any crawler
 * @returns {Object|null} Normalized tool document ready for MongoDB insertion
 */
export function normalizeToSchema(raw) {
    if (!raw?.name?.trim() || !raw?.officialUrl?.trim()) return null

    const name = raw.name.trim()
    const slug = generateSlug(name)
    const desc = (raw.shortDescription || raw.description || '').trim()

    return {
        name,
        slug,
        officialUrl: raw.officialUrl.trim(),
        sourceUrl: raw.sourceUrl || null,
        shortDescription: desc.substring(0, 499) || `${name} is an AI-powered tool.`,
        fullDescription: raw.fullDescription || raw.longDescription || desc || null,
        // category stored as string slug — resolved to ObjectId at insert time
        categorySlug: normalizeCategory(raw.category),
        tags: Array.isArray(raw.tags)
            ? raw.tags.map(t => t.trim()).filter(Boolean).slice(0, 10)
            : [],
        pricing: normalizePricing(raw.pricing),
        logo: raw.logo || raw.imageUrl || null,
        screenshots: Array.isArray(raw.screenshots) ? raw.screenshots.slice(0, 5) : [],
        // Source tracking
        sourceFoundBy: 'scraper',
        dataSources: [raw.source].filter(Boolean),
        // Enrichment status
        isEnriched: false,
        // Link health
        linkStatus: 'unknown',
        isActive: true,
        status: 'active',
        // Analytics defaults
        views: 0,
        favorites: 0,
    }
}
