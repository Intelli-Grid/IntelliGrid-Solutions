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

import * as cheerio from 'cheerio'
import Groq from 'groq-sdk'
import Tool from '../models/Tool.js'
import { syncToolToAlgolia } from '../config/algolia.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ─────────────────────────────────────────────────────────────
// STEP 1: Website scraper (Cheerio — lightweight, no Puppeteer)
// ─────────────────────────────────────────────────────────────

export async function scrapeToolWebsite(url) {
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 12000)

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; IntelliGridBot/1.0; +https://intelligrid.online/bot)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            },
        })
        clearTimeout(timeout)

        if (!response.ok) return null

        const html = await response.text()
        const $ = cheerio.load(html)

        // Strip noise
        $('script, style, nav, footer, iframe, noscript, [class*="cookie"], [id*="cookie"], [class*="banner"]').remove()

        // Extract pricing signals from raw HTML
        const pricingSignals = {
            hasFree: /\bfree\b/i.test(html),
            hasFreeForever: /free forever|always free|free plan/i.test(html),
            hasFreeTrial: /free trial|try free|start free|try for free/i.test(html),
            hasPricing: /pricing|plans & pricing|choose a plan/i.test(html),
            priceMatches: (html.match(/\$[\d,]+(?:\.?\d{2})?(?:\s*\/\s*mo(?:nth)?)?/gi) || []).slice(0, 5),
        }

        // Platform signals
        const platformSignals = {
            hasWeb: true, // assume web if website exists
            hasIOS: /app store|ios app|iphone|ipad|download on the app store/i.test(html),
            hasAndroid: /google play|android app|get it on google play/i.test(html),
            hasChromeExt: /chrome extension|chrome web store|add to chrome/i.test(html),
            hasFirefoxExt: /firefox extension|firefox add-on|addons\.mozilla/i.test(html),
            hasAPI: /\bapi\b.*\bdocumentation\b|\bdocs\.\w+|\/api\/|api reference|developer api/i.test(html),
            hasVSCode: /visual studio code|vscode extension|vs code marketplace/i.test(html),
            hasDiscord: /discord bot|discord server|discord\.gg/i.test(html),
            hasSlack: /slack app|slack integration|add to slack/i.test(html),
        }

        // Twitter handle extraction
        const twitterMatch = html.match(/twitter\.com\/([A-Za-z0-9_]{1,20})(?:["'\/\s])/i)
        const twitterHandle = twitterMatch ? twitterMatch[1].replace(/^@/, '') : ''

        // OG image as logo fallback
        const ogImage = $('meta[property="og:image"]').attr('content') || ''

        // Body text for Groq context (first 3000 chars)
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 3000)

        return {
            title: $('title').text().trim().substring(0, 200),
            metaDescription: ($('meta[name="description"]').attr('content') || '').substring(0, 500),
            h1: $('h1').first().text().trim().substring(0, 200),
            h2s: $('h2').map((_, el) => $(el).text().trim()).get().slice(0, 5),
            bodyText,
            ogImage,
            twitterHandle,
            pricingSignals,
            platformSignals,
        }
    } catch (err) {
        // Timeout, DNS failure, 4xx, etc. — non-fatal, return null
        return null
    }
}

// ─────────────────────────────────────────────────────────────
// STEP 2: Groq AI enrichment
// ─────────────────────────────────────────────────────────────

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

    const prompt = `You are a professional AI tool database curator. Analyze this AI tool and return ONLY valid JSON with no markdown, no backticks, no extra text.

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
  "isActivelyMaintained": <true or false or null>
}`

    try {
        const response = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',  // fast + free
            max_tokens: 1800,
            temperature: 0.15,              // low = consistent structured output
            messages: [{ role: 'user', content: prompt }],
        })

        const raw = response.choices[0].message.content.trim()

        // Parse — strip accidental markdown fences if LLM slips
        const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
        return JSON.parse(cleaned)

    } catch (err) {
        console.error(`[Enrichment] Groq failed for "${tool.name}":`, err.message)
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

    return Math.min(Math.round(score), 100)
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
    updates.lastEnriched = new Date() // keep legacy field in sync
    updates.enrichmentSource = 'groq-v1'
    updates.needsEnrichment = false

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
            // Groq failed — mark as attempted but not enriched
            await Tool.findByIdAndUpdate(tool._id, {
                $set: { lastEnrichedAt: new Date(), lastEnriched: new Date() },
                $addToSet: { dataQualityFlags: 'groq_failed' },
            })
            return { success: false, reason: 'groq_failed' }
        }

        // 3. Build update payload (merge, never overwrite good existing data)
        const updates = buildUpdatePayload(tool, groqData, scrapeData)

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
        status: 'active',
        isActive: { $ne: false },
        $or: [
            { lastEnrichedAt: null },
            { lastEnriched: null },
            { enrichmentScore: { $lt: 50 } },
            { lastEnrichedAt: { $lt: thirtyDaysAgo } },
        ],
    })
        .sort({ enrichmentScore: 1, lastEnrichedAt: 1 })
        .limit(batchSize)
        .lean()
}
