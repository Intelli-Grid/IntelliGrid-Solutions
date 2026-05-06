/**
 * enrichmentService.js
 * Core AI enrichment logic for IntelliGrid tools.
 *
 * Pipeline per tool:
 *   1. Scrape homepage with Cheerio (extract pricing signals, platform signals, body text)
 *   2. Call Groq LLaMA with structured prompt → get JSON with 15+ enrichment fields
 *   3. Validate + merge Groq output with existing tool data (never overwrite populated fields)
 *   4. Compute enrichmentScore (0-100)
 *   5. Save to MongoDB + re-sync to Algolia
 */

import { scrapeToolWebsite } from './toolWebScraper.js'
import Groq from 'groq-sdk'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js' // register schema for populate()
import { syncToolToAlgolia } from '../config/algolia.js'
import { normalizeCategory } from '../jobs/crawlers/normalizer.js'

// ─────────────────────────────────────────────────────────────
// Groq Key Rotator — supports up to 9 keys
// Set GROQ_API_KEY (key 1) + GROQ_API_KEY_2 ... GROQ_API_KEY_9 in .env
// When a key hits its daily token limit it is marked exhausted and the
// rotator automatically switches to the next available key.
// ─────────────────────────────────────────────────────────────
class GroqKeyRotator {
    constructor() {
        // Collect all configured keys
        const keys = [
            process.env.GROQ_API_KEY,
            process.env.GROQ_API_KEY_2,
            process.env.GROQ_API_KEY_3,
            process.env.GROQ_API_KEY_4,
            process.env.GROQ_API_KEY_5,
            process.env.GROQ_API_KEY_6,
            process.env.GROQ_API_KEY_7,
            process.env.GROQ_API_KEY_8,
            process.env.GROQ_API_KEY_9,
            process.env.GROQ_API_KEY_10,
        ].filter(Boolean) // remove undefined/empty

        if (keys.length === 0) throw new Error('No GROQ_API_KEY found in environment')

        this.clients = keys.map((key, i) => ({
            index: i + 1,
            key,
            client: new Groq({ apiKey: key }),
            exhausted: false,
        }))

        this.currentIndex = 0
        console.log(`🔑 Groq key rotator initialized with ${keys.length} key(s)`)
    }

    get current() {
        return this.clients[this.currentIndex]
    }

    get availableCount() {
        return this.clients.filter(c => !c.exhausted).length
    }

    markCurrentExhausted() {
        this.clients[this.currentIndex].exhausted = true
        console.warn(`⚠️  Key #${this.currentIndex + 1} daily limit reached — rotating to next key...`)
        // Find next non-exhausted key
        const next = this.clients.findIndex((c, i) => i > this.currentIndex && !c.exhausted)
        if (next !== -1) {
            this.currentIndex = next
            console.log(`✅ Switched to key #${this.currentIndex + 1}`)
            return true
        }
        // Try wrapping from the start (in case earlier keys reset overnight)
        const fromStart = this.clients.findIndex(c => !c.exhausted)
        if (fromStart !== -1) {
            this.currentIndex = fromStart
            console.log(`✅ Switched to key #${this.currentIndex + 1}`)
            return true
        }
        return false // all keys exhausted
    }

    async complete(params) {
        // Try current key, rotate on daily limit, retry on TPM with backoff
        const MAX_TPM_RETRIES = 2
        let tpmRetries = 0

        while (true) {
            if (this.current.exhausted) {
                const rotated = this.markCurrentExhausted()
                if (!rotated) throw new DailyTokenLimitError()
            }

            try {
                return await this.current.client.chat.completions.create(params)
            } catch (err) {
                const msg = err.message || ''
                const status = err.status || err.statusCode || 0

                if (status === 429 || msg.includes('rate_limit_exceeded') || msg.includes('Rate limit')) {
                    // Daily token limit — rotate key
                    if (msg.includes('tokens per day') || msg.includes('TPD')) {
                        const rotated = this.markCurrentExhausted()
                        if (!rotated) throw new DailyTokenLimitError()
                        tpmRetries = 0
                        continue // retry with new key
                    }

                    // Per-minute/request limit — wait then retry same key
                    if (tpmRetries < MAX_TPM_RETRIES) {
                        let waitMs = 65000
                        const timeSection = msg.match(/try again in (.*?)$/i)
                        if (timeSection) {
                            const timeStr = timeSection[1]
                            let totalSecs = 0
                            
                            const hMatch = timeStr.match(/(\d+(?:\.\d+)?)h/i)
                            const mMatch = timeStr.match(/(\d+(?:\.\d+)?)m(?!s)/i)
                            const sMatch = timeStr.match(/(\d+(?:\.\d+)?)s/i)
                            const msMatch = timeStr.match(/(\d+(?:\.\d+)?)ms/i)
                            
                            if (hMatch) totalSecs += parseFloat(hMatch[1]) * 3600
                            if (mMatch) totalSecs += parseFloat(mMatch[1]) * 60
                            if (sMatch) totalSecs += parseFloat(sMatch[1])
                            if (msMatch) totalSecs += parseFloat(msMatch[1]) / 1000
                            
                            if (totalSecs > 0) {
                                waitMs = Math.ceil(totalSecs * 1000) + 2000
                            }
                        }
                        tpmRetries++
                        console.warn(`  ⏳ TPM limit — waiting ${Math.round(waitMs / 1000)}s (retry ${tpmRetries}/${MAX_TPM_RETRIES})...`)
                        await new Promise(r => setTimeout(r, waitMs))
                        continue
                    }
                }
                throw err // propagate non-rate-limit errors
            }
        }
    }
}

// Lazy initialisation — only create the rotator on first enrichment call.
// This prevents a missing GROQ_API_KEY from crashing the module at import
// time, which would kill all cron jobs (crawlers, trending-score, etc.).
let _groqRotator = null
function getGroqRotator() {
    if (!_groqRotator) {
        _groqRotator = new GroqKeyRotator() // throws clearly if no key is set
    }
    return _groqRotator
}


// ─────────────────────────────────────────────────────────────
// STEP 2: Groq AI enrichment
// ─────────────────────────────────────────────────────────────

// Custom error class so bulkEnrich can detect daily limit and stop cleanly
export class DailyTokenLimitError extends Error {
    constructor() { super('groq_daily_limit_reached'); this.code = 'daily_limit' }
}

export async function enrichWithGroq(tool, scrapeData) {
    const scrapeContext = scrapeData
        ? `
Scraped Homepage Title: ${scrapeData.title || 'N/A'}
Scraped Meta Description: ${scrapeData.metaDescription || 'N/A'}
Scraped H1: ${scrapeData.h1 || 'N/A'}
Scraped H2 Headings: ${(scrapeData.h2s || []).join(' | ') || 'N/A'}
Scraped Body Text (first 2500 chars): ${scrapeData.bodyText || 'N/A'}
        `.trim()
        : 'Website scraping failed — use only the tool name and description below.'

    const prompt = `You are a professional AI tool database curator following a strict NO-ADJECTIVES rule. Analyze this AI tool and return ONLY valid JSON with no markdown, no backticks, no extra text.

CRITICAL RULE — NO ADJECTIVES IN outcome_driven_summary:
Bad: "Powerful AI writing assistant that intelligently automates content creation"
Good: "Generates blog posts and social captions from topic inputs"
Bad: "Revolutionary tool that seamlessly integrates with your workflow"
Good: "Connects to Notion and Slack to sync task updates automatically"
All other fields follow normal descriptive rules. Only outcome_driven_summary enforces the no-adjectives constraint.

Tool Name: ${tool.name}
Website URL: ${tool.officialUrl || tool.websiteUrl || 'N/A'}
Current Short Description: ${tool.shortDescription || 'N/A'}
Current Tags: ${(tool.tags || []).join(', ') || 'N/A'}

${scrapeContext}

Return EXACTLY this JSON structure (no extra fields, no missing fields):
{
  "pricingModel": "<one of: Free | Freemium | Paid | Free Trial | Contact for Pricing | Open Source | Unknown>",
  "startingPrice": "<e.g. '$0', '$12/mo', 'From $29/mo' — empty string if unknown>",
  "hasFreeVersion": <true or false or null>,
  "hasFreeTrialDays": <number of trial days or null>,
  "hasAPI": <true or false or null>,
  "platforms": ["<items from: Web | iOS | Android | Chrome Extension | Firefox Extension | API | Desktop (Mac) | Desktop (Windows) | Discord Bot | Slack App | VS Code Extension>"],
  "useCaseTags": ["<5 to 10 specific task phrases like: write blog posts, generate social media captions, transcribe audio files, remove image backgrounds>"],
  "audienceTags": ["<2 to 4 from: Marketers | Developers | Designers | Students | Entrepreneurs | HR Teams | Sales Teams | Researchers | Content Creators | Small Business>"],
  "industryTags": ["<1 to 3 relevant industries like: Healthcare | Education | Finance | E-commerce | Legal | Real Estate | General>"],
  "integrationTags": ["<0 to 5 integrations if clearly mentioned, e.g.: Zapier | Notion | Slack | Google Sheets | Shopify | HubSpot — empty array if none mentioned>"],
  "keyFeatures": ["<3 to 6 specific factual feature bullet points, not vague marketing language>"],
  "useCaseExamples": ["<2 to 3 concrete examples starting with 'Use this tool to...' or 'Perfect for...'>"],
  "longDescription": "<150 to 250 word SEO-optimized description. Include: what the tool does, who it's for, key differentiators, and a natural call to action. Do not keyword stuff.>",
  "seoTitle": "<60 character max page title, format: [Tool Name] — [category] AI Tool | IntelliGrid>",
  "seoDescription": "<150 character max compelling meta description for search results>",
  "seoKeywords": ["<5 to 8 long-tail keywords a person would search to find this tool>"],
  "targetAudience": "<one sentence starting with 'Best for...' describing the ideal user>",
  "alternativeTo": ["<0 to 3 well-known tools this replaces, e.g.: ChatGPT | Grammarly | Canva | Midjourney — only include if truly similar>"],
  "companyName": "<company or product name, empty string if unknown>",
  "foundedYear": <4-digit year number or null>,
  "hqCountry": "<country name or empty string if unknown>",
  "twitterHandle": "<twitter username without @ symbol, empty string if unknown>",
  "isActivelyMaintained": <true or false or null>,
  "outcome_driven_summary": "<Describe the tool's PRIMARY function in 15 words or fewer. Use ONLY verbs and nouns. Zero adjectives. Example: 'Transcribes audio files and generates formatted meeting notes automatically.' NOT 'Powerful AI that intelligently transcribes...'>",
  "estimated_time_saved": "<One specific, quantifiable time claim if found on the homepage. Examples: '2 hours/day', '3x faster than manual', '10 minutes per report'. Empty string if no specific claim found — DO NOT invent this.>",
  "estimated_cost_reduction": "<One specific, quantifiable cost claim if found. Examples: '30% less than agency fees', 'replaces $500/mo VA'. Empty string if no claim found — DO NOT invent.>",
  "detected_skill_level": "<one of: Beginner | Intermediate | Expert | Unknown — based on technical complexity of the tool>",
  "detected_waitlist": <true if the homepage mentions 'waitlist', 'join the waitlist', 'coming soon', 'request access', 'early access only' — otherwise false>,
  "requires_credit_card_for_trial": <true if the free trial or free tier explicitly requires a credit card — otherwise false>,
  "true_free_tier_exists": <true if there is a free tier with no time limit AND no credit card required — false if trial-only — null if unclear>
}`

    try {
        // groqRotator handles TPD rotation + TPM retry internally
        const response = await getGroqRotator().complete({
            model: 'llama-3.1-8b-instant',
            max_tokens: 1800,
            temperature: 0.15,
            messages: [{ role: 'user', content: prompt }],
        })

        const raw = response.choices[0].message.content.trim()
        const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
        return JSON.parse(cleaned)

    } catch (err) {
        // DailyTokenLimitError must propagate up to bulkEnrich to stop the run
        if (err.code === 'daily_limit') throw err

        console.error(`[Enrichment] Groq failed for "${tool.name}":`, (err.message || '').substring(0, 120))
        return null
    }
}

// ─────────────────────────────────────────────────────────────
// STEP 3: Compute enrichment score (0-100)
// ─────────────────────────────────────────────────────────────

export function computeEnrichmentScore(tool) {
    let score = 0

    // Description quality
    if ((tool.shortDescription || '').length > 80) score += 8
    if ((tool.longDescription || '').length > 200) score += 12

    // Screenshot (15 pts — highest single signal)
    if (tool.screenshotUrl) {
        const ageMs = tool.screenshotTakenAt ? Date.now() - new Date(tool.screenshotTakenAt).getTime() : Infinity
        const ageDays = ageMs / (1000 * 60 * 60 * 24)
        if (ageDays <= 30) score += 15
        else score += 5  // partial credit for old screenshot
    }

    // Pricing intelligence
    const pricingSet = tool.pricing && tool.pricing !== 'Unknown'
    if (pricingSet) score += 8
    if (tool.hasFreeTier !== null && tool.hasFreeTier !== undefined) score += 4

    // Tagging richness
    if ((tool.useCaseTags || []).length >= 3) score += 10
    if ((tool.useCaseTags || []).length >= 7) score += 5   // bonus
    if ((tool.audienceTags || []).length >= 1) score += 5
    if ((tool.industryTags || []).length >= 1) score += 3

    // Platform coverage
    if ((tool.platforms || []).length >= 1) score += 6

    // Feature & content depth
    if ((tool.keyFeatures || []).length >= 3) score += 8
    if ((tool.alternativeTo || []).length >= 1) score += 5

    // Media richness
    if (tool.videoEmbedUrl) score += 7

    // SEO signals
    if (tool.metaTitle && tool.metaDescription) score += 4

    // Company info
    if (tool.targetAudience) score += 3

    // Human verification bonus
    if (tool.humanVerified) score += 5

    // v2.5.0 — Outcome data bonus (rewards anti-slop enrichment)
    if (tool.outcomes?.timeSaved || tool.outcomes?.costReduction) score += 6
    if (tool.outcomes?.skillLevel && tool.outcomes.skillLevel !== '') score += 2
    // Waitlist penalty — incomplete/inaccessible tools should not rank high
    if (tool.isWaitlist) score = Math.max(0, score - 15)

    return Math.min(Math.round(score), 100)
}

// ─────────────────────────────────────────────────────────────
// STEP 3b: Auto-resolve category ObjectId from slug
// ─────────────────────────────────────────────────────────────

// In-memory cache: categorySlug → ObjectId (avoids repeated DB lookups per batch)
const _categoryCache = {}

/**
 * Resolves a category slug string to a MongoDB ObjectId.
 * Sources (in priority order):
 *   1. Tool's existing category ObjectId — skip if already categorized
 *   2. Tool's categorySlug from the crawler normalizer
 *   3. Groq's suggested useCaseTags (each mapped through normalizeCategory)
 *   4. Falls back to 'other' category
 *
 * Returns the Category ObjectId or null if not found / already set.
 */
export async function resolveCategoryId(tool, groqData) {
    // Priority 1: tool already has a category ObjectId — don't reassign
    if (tool.category) return null

    // Priority 2: tool has a categorySlug from the crawler normalizer
    let slug = tool.categorySlug || null

    // Priority 3: infer from Groq's use-case tags
    if (!slug && groqData) {
        const allHints = [
            ...(groqData.useCaseTags || []),
            ...(groqData.industryTags || []),
            ...(groqData.audienceTags || []),
        ]
        for (const hint of allHints) {
            const mapped = normalizeCategory(hint)
            if (mapped && mapped !== 'other') { slug = mapped; break }
        }
    }

    // Priority 4: fallback
    if (!slug) slug = 'other'

    // Check in-memory cache first
    if (_categoryCache[slug]) return _categoryCache[slug]

    try {
        const cat = await Category.findOne({ slug }).select('_id').lean()
        if (cat) {
            _categoryCache[slug] = cat._id
            return cat._id
        }
        // Fallback to 'other'
        if (slug !== 'other') {
            const fallback = await Category.findOne({ slug: 'other' }).select('_id').lean()
            if (fallback) {
                _categoryCache['other'] = fallback._id
                return fallback._id
            }
        }
    } catch {
        // Non-fatal — enrichment continues without category assignment
    }
    return null
}

// ─────────────────────────────────────────────────────────────
// STEP 4: Merge Groq output + existing tool data
// ─────────────────────────────────────────────────────────────

export function buildUpdatePayload(tool, groqData, scrapeData) {
    const updates = {}

    if (!groqData) return updates

    // Pricing — map Groq output to existing schema fields
    const pricingModelMap = {
        'Free': 'Free',
        'Freemium': 'Freemium',
        'Paid': 'Paid',
        'Free Trial': 'Trial',
        'Contact for Pricing': 'Unknown',
        'Open Source': 'Free',
        'Unknown': 'Unknown',
    }
    if (groqData.pricingModel && !tool.pricing || tool.pricing === 'Unknown') {
        updates.pricing = pricingModelMap[groqData.pricingModel] || 'Unknown'
    }

    // startingPrice — only set if currently empty
    if (groqData.startingPrice && !tool.startingPrice) {
        updates.startingPrice = groqData.startingPrice
    }

    // hasFreeTier — only set if currently null/undefined
    if (groqData.hasFreeVersion !== null && groqData.hasFreeVersion !== undefined && tool.hasFreeTier == null) {
        updates.hasFreeTier = groqData.hasFreeVersion
    }

    // New enrichment array fields — always set (these are new fields, will be empty by default)
    if (Array.isArray(groqData.platforms) && groqData.platforms.length > 0) {
        updates.platforms = groqData.platforms
    }

    if (Array.isArray(groqData.useCaseTags) && groqData.useCaseTags.length > 0) {
        updates.useCaseTags = groqData.useCaseTags
    }

    if (Array.isArray(groqData.audienceTags) && groqData.audienceTags.length > 0) {
        updates.audienceTags = groqData.audienceTags
    }

    if (Array.isArray(groqData.industryTags) && groqData.industryTags.length > 0) {
        updates.industryTags = groqData.industryTags
    }

    if (Array.isArray(groqData.integrationTags) && groqData.integrationTags.length > 0) {
        updates.integrationTags = groqData.integrationTags
    }

    if (Array.isArray(groqData.keyFeatures) && groqData.keyFeatures.length > 0) {
        updates.keyFeatures = groqData.keyFeatures
    }

    if (Array.isArray(groqData.useCaseExamples) && groqData.useCaseExamples.length > 0) {
        updates.useCaseExamples = groqData.useCaseExamples
    }

    if (Array.isArray(groqData.alternativeTo) && groqData.alternativeTo.length > 0) {
        updates.alternativeTo = groqData.alternativeTo
    }

    // longDescription — set if we got one and current is empty
    if (groqData.longDescription && groqData.longDescription.length > 100) {
        if (!tool.longDescription || tool.longDescription.length < 100) {
            updates.longDescription = groqData.longDescription
        }
    }

    // SEO fields — only set if currently empty
    if (groqData.seoTitle && !tool.metaTitle) {
        updates.metaTitle = groqData.seoTitle.substring(0, 70)
    }
    if (groqData.seoDescription && !tool.metaDescription) {
        updates.metaDescription = groqData.seoDescription.substring(0, 160)
    }

    // targetAudience
    if (groqData.targetAudience && !tool.targetAudience) {
        updates.targetAudience = groqData.targetAudience.substring(0, 200)
    }

    // twitterHandle from Groq or scraper (Groq preferred)
    const twitterHandle = groqData.twitterHandle || scrapeData?.twitterHandle || ''
    if (twitterHandle && !tool.twitterHandle) {
        updates.twitterHandle = twitterHandle.replace(/^@/, '').substring(0, 50)
    }

    // Logo fallback from og:image
    if (scrapeData?.ogImage && !tool.logo) {
        updates.logo = scrapeData.ogImage
    }

    // Enrichment tracking fields
    updates.enrichmentVersion = (tool.enrichmentVersion || 0) + 1
    updates.lastEnrichedAt = new Date()
    updates.enrichmentSource = 'groq-v2'
    updates.needsEnrichment = false

    // ── v2.5.0 — Outcome and pricing trust signal mapping ────────────────────
    const adjectives = /\b(powerful|revolutionary|seamless|intelligent|innovative|cutting-edge|robust|comprehensive|advanced|best-in-class)\b/i

    if (groqData.outcome_driven_summary && groqData.outcome_driven_summary.length > 10) {
        // Only overwrite shortDescription if it currently contains marketing-fluff adjectives
        if (!tool.shortDescription || adjectives.test(tool.shortDescription)) {
            updates.shortDescription = groqData.outcome_driven_summary
        }
    }

    if (groqData.estimated_time_saved && groqData.estimated_time_saved.length > 0) {
        updates['outcomes.timeSaved'] = groqData.estimated_time_saved
    }

    if (groqData.estimated_cost_reduction && groqData.estimated_cost_reduction.length > 0) {
        updates['outcomes.costReduction'] = groqData.estimated_cost_reduction
    }

    if (groqData.detected_skill_level && groqData.detected_skill_level !== 'Unknown') {
        updates['outcomes.skillLevel'] = groqData.detected_skill_level
    }

    if (typeof groqData.detected_waitlist === 'boolean') {
        updates.isWaitlist = groqData.detected_waitlist
    }

    if (typeof groqData.requires_credit_card_for_trial === 'boolean') {
        updates.requiresCreditCardForTrial = groqData.requires_credit_card_for_trial
    }

    if (groqData.true_free_tier_exists !== undefined && groqData.true_free_tier_exists !== null) {
        updates.trueFreeTier = groqData.true_free_tier_exists
    }

    return updates
}

// ─────────────────────────────────────────────────────────────
// STEP 5: Master enrichTool function (orchestrates all steps)
// ─────────────────────────────────────────────────────────────

export async function enrichTool(tool) {
    try {
        // 1. Scrape
        const scrapeData = await scrapeToolWebsite(tool.officialUrl || tool.websiteUrl)

        // 2. Groq enrichment
        const groqData = await enrichWithGroq(tool, scrapeData)

        if (!groqData) {
            // Groq failed — do NOT set lastEnrichedAt so this tool is retried next run
            await Tool.findByIdAndUpdate(tool._id, {
                $addToSet: { dataQualityFlags: 'groq_failed' },
            })
            return { success: false, reason: 'groq_failed' }
        }

        // 3. Build update payload (merge, never overwrite good existing data)
        const updates = buildUpdatePayload(tool, groqData, scrapeData)

        // 3b. Auto-resolve category ObjectId if tool is uncategorized
        const categoryId = await resolveCategoryId(tool, groqData)
        if (categoryId) {
            updates.category = categoryId
        }

        // BUG FIX: isEnriched must be set unconditionally — was previously only
        // set inside if(categoryId), so tools that already had a category were
        // never marked as enriched → infinite re-enrichment loop on every batch.
        updates.isEnriched = true

        // 4. Compute enrichment score on the merged document
        const merged = { ...tool.toObject ? tool.toObject() : tool, ...updates }
        updates.enrichmentScore = computeEnrichmentScore(merged)

        // 5. Save to MongoDB
        const updatedTool = await Tool.findByIdAndUpdate(
            tool._id,
            { $set: updates },
            { new: true }
        ).populate('category', 'name slug').lean()

        // 6. Re-sync to Algolia (non-blocking)
        syncToolToAlgolia(updatedTool).catch(err =>
            console.error(`[Enrichment] Algolia sync failed for ${tool.name}:`, err.message)
        )

        return { success: true, score: updates.enrichmentScore }

    } catch (err) {
        // Re-throw daily limit so bulkEnrich can stop cleanly
        if (err.code === 'daily_limit') throw err

        console.error(`[Enrichment] Unexpected error for "${tool.name}":`, err.message)
        await Tool.findByIdAndUpdate(tool._id, {
            $addToSet: { dataQualityFlags: 'enrichment_error' },
        }).catch(() => { })
        return { success: false, reason: err.message }
    }
}

// ─────────────────────────────────────────────────────────────
// Helper: priority batch for cron — lowest score first
// ─────────────────────────────────────────────────────────────

export async function getEnrichmentBatch(batchSize = 50) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return Tool.find({
        // Include both active AND pending (so freshly imported tools get enriched)
        status: { $in: ['active', 'pending', 'auto_approved'] },
        isActive: { $ne: false },
        $or: [
            { lastEnrichedAt: null },
            { enrichmentScore: { $lt: 50 } },
            { lastEnrichedAt: { $lt: thirtyDaysAgo } },
        ],
    })
        .sort({ enrichmentScore: 1, lastEnrichedAt: 1 })
        .limit(batchSize)
        .lean()
}
