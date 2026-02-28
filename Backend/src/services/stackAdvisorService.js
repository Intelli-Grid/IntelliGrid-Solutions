import Groq from 'groq-sdk'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js'
import User from '../models/User.js'
import redisClient from '../config/redis.js'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Role → category slug mapping. Category slugs must match what exists in MongoDB.
// This mapping is a best-effort grouping; the pre-filter step will handle
// cases where a slug doesn't exist (Tool.find returns an empty subset).
const ROLE_CATEGORY_MAP = {
    developer: [
        'coding', 'developer-tools', 'devops', 'code-generation', 'testing',
        'documentation', 'api', 'low-code-no-code',
    ],
    designer: [
        'design', 'image-generation', 'video', 'ui-ux', 'art', 'creative',
        '3d', 'animation',
    ],
    marketer: [
        'marketing', 'copywriting', 'seo', 'social-media', 'email-marketing',
        'advertising', 'analytics', 'content-creation',
    ],
    writer: [
        'writing', 'copywriting', 'content-creation', 'research', 'summarization',
        'blogging', 'storytelling',
    ],
    researcher: [
        'research', 'data-analysis', 'productivity', 'summarization',
        'knowledge-management', 'education',
    ],
    sales: [
        'sales', 'crm', 'email-marketing', 'customer-support', 'lead-generation',
        'business',
    ],
    operations: [
        'productivity', 'automation', 'project-management', 'hr', 'workflow',
        'business', 'scheduling',
    ],
    educator: [
        'education', 'e-learning', 'research', 'writing', 'content-creation',
        'productivity',
    ],
    data_scientist: [
        'data-analysis', 'machine-learning', 'research', 'visualization',
        'developer-tools', 'api',
    ],
    entrepreneur: [
        'business', 'marketing', 'productivity', 'automation', 'finance',
        'research', 'content-creation',
    ],
}

/**
 * Recommends AI tools based on user's role, use cases, and existing tools.
 *
 * @param {object} input
 * @param {string} input.role         - One of the keys in ROLE_CATEGORY_MAP
 * @param {string[]} input.useCases   - Free-text use cases (max 3)
 * @param {string[]} input.existing   - Names of tools already in their stack
 * @param {string} input.budget       - 'free' | 'paid' | 'any'
 * @param {string} userId             - MongoDB User._id (for saving + rate limiting)
 * @returns {Promise<object>}
 */
async function getRecommendations(input, userId) {
    // ── Rate limit: 10 requests per user per 24h ──────────────────────────────
    const rateLimitKey = `stack_advisor:${userId}`
    if (redisClient?.isOpen) {
        const count = await redisClient.incr(rateLimitKey)
        if (count === 1) {
            await redisClient.expire(rateLimitKey, 86400) // 24h
        }
        if (count > 10) {
            const ttl = await redisClient.ttl(rateLimitKey)
            const hoursLeft = Math.ceil(ttl / 3600)
            const error = new Error(`RATE_LIMIT_EXCEEDED:${hoursLeft}`)
            error.statusCode = 429
            throw error
        }
    }

    const { role, useCases = [], existing = [], budget = 'any' } = input

    // ── Pre-filter tools by relevant categories ───────────────────────────────
    const categorySlugs = ROLE_CATEGORY_MAP[role] || []
    const relevantCategories = await Category.find({ slug: { $in: categorySlugs } }).select('_id').lean()
    const categoryIds = relevantCategories.map(c => c._id)

    const toolQuery = {
        isActive: true,
        ...(categoryIds.length > 0 && { category: { $in: categoryIds } }),
        ...(budget === 'free' && { 'pricing.model': { $in: ['Free', 'Freemium'] } }),
    }

    const candidateTools = await Tool.find(toolQuery)
        .select('name slug shortDescription pricing ratings category logo')
        .populate('category', 'name slug')
        .sort({ 'ratings.average': -1, views: -1 })
        .limit(80)
        .lean()

    if (candidateTools.length === 0) {
        const error = new Error('No tools found for this role. Please try a different role.')
        error.statusCode = 400
        throw error
    }

    // ── Build the Groq prompt ─────────────────────────────────────────────────
    const toolList = candidateTools.map(t =>
        `- ${t.name} (${t.category?.name || 'General'}): ${t.shortDescription || ''} | Pricing: ${t.pricing?.model || 'Unknown'} | Rating: ${t.ratings?.average?.toFixed(1) || 'N/A'}/5`
    ).join('\n')

    const systemPrompt = `You are an expert AI tool advisor helping professionals build the optimal AI stack for their specific role and use cases. You have access to a curated database of AI tools. Your job is to recommend the best combination of tools, explain WHY each is a good fit, and identify any gaps.

Be specific, practical, and opinionated. Don't hedge. If a tool is the best for a job, say so.

Always respond with valid JSON only. No markdown, no preamble.`

    const userPrompt = `Role: ${role}
Use cases: ${useCases.join(', ') || 'General productivity'}
Existing tools in stack: ${existing.length > 0 ? existing.join(', ') : 'None'}
Budget preference: ${budget}

Available tools from our database:
${toolList}

Respond with this exact JSON structure:
{
  "recommendations": [
    {
      "name": "tool name exactly as listed",
      "category": "the tool category",
      "reason": "2-3 sentence explanation of why this tool fits their specific role and use cases",
      "priority": "must-have" | "nice-to-have" | "consider-later",
      "replaces": "name of existing tool it replaces, or null",
      "pricingNote": "brief note on pricing for this role"
    }
  ],
  "stackSummary": "2-3 sentence summary of the recommended stack and how the tools work together",
  "gaps": ["any important missing tool types not covered by the available tools above"],
  "estimatedMonthlyCost": "rough estimate for the paid tools recommended"
}

Rules:
- Recommend 4-8 tools maximum
- Only recommend tools from the list above (exact name match required)
- Prioritise tools the user doesn't already have
- Focus on the most impactful tools for their specific use cases
- Mark as "must-have" only tools that are clearly essential for their role`

    // ── Groq API call ─────────────────────────────────────────────────────────
    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
        throw new Error('No response from AI model')
    }

    let parsed
    try {
        parsed = JSON.parse(responseText)
    } catch {
        throw new Error('AI returned invalid JSON. Please try again.')
    }

    // ── Enrich recommendations with tool slugs for linking ────────────────────
    const toolMap = new Map(candidateTools.map(t => [t.name.toLowerCase(), t]))
    const enriched = (parsed.recommendations || []).map(rec => {
        const tool = toolMap.get(rec.name?.toLowerCase())
        return {
            ...rec,
            slug: tool?.slug || null,
            logo: tool?.logo || null,
            pricing: tool?.pricing || null,
            rating: tool?.ratings?.average || null,
        }
    })

    const result = {
        ...parsed,
        recommendations: enriched,
        input,
        generatedAt: new Date().toISOString(),
    }

    // ── Save to user's savedStacks (cap at 10) ────────────────────────────────
    await User.findByIdAndUpdate(userId, {
        $push: {
            savedStacks: {
                $each: [{ input, recommendations: enriched, createdAt: new Date() }],
                $slice: -10,  // keep only the 10 most recent
                $position: 0, // insert at the front
            },
        },
    })

    return result
}

/**
 * Get a user's saved stack history
 */
async function getStackHistory(userId) {
    const user = await User.findById(userId).select('savedStacks').lean()
    return user?.savedStacks || []
}

/**
 * Delete a specific saved stack by its _id
 */
async function deleteStack(userId, stackId) {
    await User.findByIdAndUpdate(userId, {
        $pull: { savedStacks: { _id: stackId } },
    })
}

export default { getRecommendations, getStackHistory, deleteStack }
