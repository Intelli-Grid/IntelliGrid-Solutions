/**
 * assignCategories.js
 * One-time script to assign Category ObjectIds to all tools that have category=null.
 * Matches tools to categories using keyword heuristics on name + shortDescription + tags.
 *
 * Usage (from Backend/ directory):
 *   node src/scripts/assignCategories.js
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Tool from '../models/Tool.js'
import Category from '../models/Category.js'

dotenv.config()

await mongoose.connect(process.env.MONGODB_URI)
console.log('✅ Connected to MongoDB')

// Load all categories
const categories = await Category.find({}).lean()
console.log(`📂 Found ${categories.length} categories:`, categories.map(c => `${c.name} (${c._id})`))

// Build a keyword → categoryId map
// Each keyword array is matched against: tool.name + tool.shortDescription + tool.tags (all lowercased)
const KEYWORD_MAP = [
    {
        categoryId: categories.find(c => c.slug === 'image-generation')?._id,
        keywords: ['image', 'photo', 'picture', 'visual', 'art', 'illustration', 'diffusion', 'midjourney', 'dall-e', 'stable diffusion', 'logo', 'avatar', 'headshot', 'design'],
    },
    {
        categoryId: categories.find(c => c.slug === 'video-generation')?._id,
        keywords: ['video', 'animation', 'motion', 'film', 'clip', 'reel', 'synthetic media', 'deepfake', 'screen record', 'explainer'],
    },
    {
        categoryId: categories.find(c => c.slug === 'audio-and-music')?._id,
        keywords: ['audio', 'music', 'sound', 'voice', 'speech', 'podcast', 'transcription', 'text-to-speech', 'tts', 'singing', 'melody', 'beat', 'noise'],
    },
    {
        categoryId: categories.find(c => c.slug === 'writing-and-content')?._id,
        keywords: ['writing', 'content', 'copy', 'blog', 'article', 'seo writing', 'text', 'grammar', 'paraphrase', 'summarize', 'essay', 'book', 'novel', 'story', 'script'],
    },
    {
        categoryId: categories.find(c => c.slug === 'chatbots')?._id,
        keywords: ['chatbot', 'chat', 'conversational', 'assistant', 'dialogue', 'customer support', 'helpdesk', 'live chat', 'ai chat', 'gpt'],
    },
    {
        categoryId: categories.find(c => c.slug === 'developer-tools')?._id,
        keywords: ['code', 'coding', 'developer', 'api', 'github', 'programming', 'debugging', 'copilot', 'devops', 'sql', 'testing', 'deployment', 'infrastructure', 'cli', 'terminal', 'sdk'],
    },
    {
        categoryId: categories.find(c => c.slug === 'marketing-and-seo')?._id,
        keywords: ['marketing', 'seo', 'ads', 'advertising', 'campaign', 'social media', 'email marketing', 'lead', 'funnel', 'growth', 'brand', 'analytics'],
    },
    {
        categoryId: categories.find(c => c.slug === 'business-and-finance')?._id,
        keywords: ['business', 'finance', 'accounting', 'invoice', 'payroll', 'crm', 'sales', 'legal', 'contract', 'hr', 'hiring', 'recruitment', 'meeting', 'presentation', 'slides'],
    },
    {
        categoryId: categories.find(c => c.slug === 'data-and-analytics')?._id,
        keywords: ['data', 'analytics', 'dashboard', 'visualization', 'chart', 'spreadsheet', 'database', 'bi', 'report', 'insight', 'metrics', 'excel', 'csv'],
    },
    {
        categoryId: categories.find(c => c.slug === 'research')?._id,
        keywords: ['research', 'academic', 'paper', 'citation', 'literature', 'science', 'study', 'survey', 'knowledge', 'fact check', 'search engine', 'wikipedia'],
    },
    {
        categoryId: categories.find(c => c.slug === 'education')?._id,
        keywords: ['education', 'learning', 'teaching', 'student', 'tutor', 'quiz', 'course', 'e-learning', 'school', 'university', 'training', 'skill'],
    },
    {
        categoryId: categories.find(c => c.slug === 'productivity')?._id,
        keywords: ['productivity', 'task', 'todo', 'workflow', 'automation', 'project management', 'note', 'calendar', 'schedule', 'planner', 'reminder', 'focus', 'time management'],
    },
    {
        categoryId: categories.find(c => c.slug === 'email-and-communication')?._id,
        keywords: ['email', 'communication', 'messaging', 'slack', 'newsletter', 'outreach', 'inbox', 'reply', 'gmail', 'outlook'],
    },
    {
        categoryId: categories.find(c => c.slug === 'automation')?._id,
        keywords: ['automation', 'no-code', 'low-code', 'workflow automation', 'zapier', 'make', 'n8n', 'robotic process', 'rpa', 'integration', 'connector'],
    },
]

function assignCategory(tool) {
    // Build a searchable text blob from the tool
    const blob = [
        tool.name || '',
        tool.shortDescription || '',
        tool.description || '',
        ...(tool.tags || []),
        ...(tool.categories || []),
    ].join(' ').toLowerCase()

    // Try each category in order, return first match
    for (const { categoryId, keywords } of KEYWORD_MAP) {
        if (!categoryId) continue
        for (const keyword of keywords) {
            if (blob.includes(keyword)) {
                return categoryId
            }
        }
    }
    return null
}

// Get all tools with no category
const uncategorized = await Tool.find({ category: null }).select('_id name shortDescription description tags categories').lean()
console.log(`\n🔍 Found ${uncategorized.length} uncategorized tools. Processing...`)

let assigned = 0
let skipped = 0
const categoryCountDelta = {} // track per-category increments

for (const tool of uncategorized) {
    const categoryId = assignCategory(tool)
    if (categoryId) {
        await Tool.updateOne({ _id: tool._id }, { $set: { category: categoryId } })
        const key = categoryId.toString()
        categoryCountDelta[key] = (categoryCountDelta[key] || 0) + 1
        assigned++
    } else {
        skipped++
    }

    if ((assigned + skipped) % 200 === 0) {
        console.log(`  → ${assigned + skipped}/${uncategorized.length} processed, ${assigned} assigned, ${skipped} unmatched...`)
    }
}

// Update toolCount on each affected category
console.log('\n📊 Updating Category toolCount...')
for (const [catId, delta] of Object.entries(categoryCountDelta)) {
    await Category.updateOne({ _id: catId }, { $inc: { toolCount: delta } })
    const cat = categories.find(c => c._id.toString() === catId)
    console.log(`  ${cat?.name || catId}: +${delta}`)
}

console.log(`\n✅ DONE:`)
console.log(`  - ${assigned} tools categorized`)
console.log(`  - ${skipped} tools had no keyword match (left as uncategorized)`)

await mongoose.disconnect()
process.exit(0)
