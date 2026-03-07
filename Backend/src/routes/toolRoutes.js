import express from 'express'
import toolController from '../controllers/toolController.js'
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js'
import { validationRules, validate } from '../middleware/validate.js'
import cacheMiddleware from '../middleware/cache.js'
import Tool from '../models/Tool.js'
import ClickEvent from '../models/ClickEvent.js'
import { isFeatureEnabled } from '../services/featureFlags.js'

const router = express.Router()

// Public routes
router.get(
    '/',
    cacheMiddleware(600), // Cache for 10 minutes
    toolController.getAllTools
)

router.get(
    '/trending',
    cacheMiddleware(300), // Cache for 5 minutes
    toolController.getTrendingTools
)

router.get(
    '/featured',
    cacheMiddleware(300),
    toolController.getFeaturedTools
)

router.get(
    '/compare',
    // Cache for 60 minutes
    cacheMiddleware(3600),
    toolController.compareTools
)

router.get(
    '/search',
    toolController.searchTools
)

// ── Search Suggestions (typeahead) ───────────────────────────────────────────
// GET /api/v1/tools/suggestions?q=chatg
// Returns max 8 lightweight tool suggestions for instant search dropdowns.
// Short Redis cache (60s) avoids DB hammering on every keystroke.
router.get('/suggestions', cacheMiddleware(60), async (req, res) => {
    try {
        const q = (req.query.q || '').trim()
        if (!q || q.length < 2) {
            return res.json({ success: true, suggestions: [] })
        }

        // Sanitise input — only allow alphanumeric, spaces, hyphens, dots
        const safeQ = q.replace(/[^a-zA-Z0-9 \-\.]/g, '')
        if (!safeQ) return res.json({ success: true, suggestions: [] })
        const regex = new RegExp(safeQ, 'i')

        const suggestions = await Tool.find({
            status: 'active',
            $or: [
                { name: { $regex: regex } },
                { tags: { $regex: regex } },
            ],
        })
            .sort({ trendingScore: -1, views: -1 })
            .limit(8)
            .select('name slug logo pricing shortDescription')
            .lean()

        res.json({ success: true, suggestions })
    } catch (err) {
        console.error('[Suggestions] Error:', err.message)
        res.json({ success: true, suggestions: [] })
    }
})

router.get(
    '/managed',
    requireAuth,
    toolController.getManagedTools
)

// ── Phase 1.3: Hot Right Now ──────────────────────────────────────────────────
// GET /api/v1/tools/hot — top 8 by trendingScore, cached 30 min
router.get(
    '/hot',
    cacheMiddleware(1800),
    toolController.getHotTools
)

// ── Phase 2.1: Alternatives SEO pages ────────────────────────────────────────
// GET /api/v1/tools/alternatives/:toolName
// e.g. /alternatives/chatgpt → tools where alternativeTo includes "chatgpt"
router.get(
    '/alternatives/:toolName',
    cacheMiddleware(3600),
    toolController.getAlternatives
)

// ── Phase 2.2: Use-case landing pages ────────────────────────────────────────
// GET /api/v1/tools/use-case/:tag
// e.g. /use-case/write-blog-posts → tools with that useCaseTag
router.get(
    '/use-case/:tag',
    cacheMiddleware(3600),
    toolController.getToolsByUseCase
)

// ── Phase 2.3: Industry landing pages ────────────────────────────────────────
// GET /api/v1/tools/industry/:tag
// e.g. /industry/marketing → tools with that industryTag
router.get(
    '/industry/:tag',
    cacheMiddleware(3600),
    toolController.getToolsByIndustry
)

// ── Affiliate Visit Redirect ──────────────────────────────────────────────────
// GET /api/v1/tools/slug/:slug/visit
// Tracks the outbound click and redirects to affiliate URL (or direct URL).
// MUST be registered BEFORE /:id routes to avoid slug being treated as an ObjectId.
// Safe when AFFILIATE_TRACKING flag is disabled — still redirects, skips logging.
router.get('/slug/:slug/visit', optionalAuth, async (req, res) => {
    try {
        const tool = await Tool.findOne({ slug: req.params.slug, isActive: true })
            .select('slug officialUrl affiliateUrl affiliateNetwork affiliateStatus commissionType name')
            .lean()

        if (!tool) {
            return res.status(404).json({ error: 'Tool not found' })
        }

        const trackingEnabled = await isFeatureEnabled('AFFILIATE_TRACKING')

        // Determine destination: affiliate URL if flag is enabled and URL exists, else direct
        const isAffiliate = trackingEnabled && Boolean(tool.affiliateUrl)
        const destination = isAffiliate ? tool.affiliateUrl : tool.officialUrl

        if (!destination) {
            return res.status(422).json({ error: 'Tool has no website URL configured' })
        }

        // Increment view count on the tool document (fire-and-forget)
        Tool.updateOne({ _id: tool._id }, { $inc: { views: 1 } })
            .catch(err => console.error('[Visit] View increment failed:', err.message))

        // Log the click event with affiliate metadata when tracking is enabled
        if (trackingEnabled) {
            ClickEvent.create({
                toolId: tool._id,
                userId: req.user?._id || null,
                source: req.query.source || 'tool_page',
                ip: req.ip,
                userAgent: req.headers['user-agent'] || null,
                referrer: req.headers['referer'] || null,
                destination,
                wasAffiliate: isAffiliate,
                // Affiliate metadata — enables Revenue Dashboard breakdown by network
                affiliateNetwork: tool.affiliateNetwork || 'none',
                affiliateStatus: tool.affiliateStatus || 'not_started',
                commissionType: tool.commissionType || 'none',
            }).catch(err => console.error('[Visit] ClickEvent log failed:', err.message))
        }

        return res.redirect(302, destination)
    } catch (err) {
        console.error('[Visit] Error:', err.message)
        return res.status(500).json({ error: 'Failed to process visit redirect' })
    }
})

// ── Programmatic SEO Content ──────────────────────────────────────────────────
// GET /api/v1/tools/slug/:slug/seo-content
// Lazy-generates Groq content on first access, then caches in Redis + MongoDB.
// Returns { seoContent: null } when PROGRAMMATIC_SEO flag is OFF.
// Must be placed BEFORE /slug/:slug to avoid route shadowing.
router.get('/slug/:slug/seo-content', async (req, res) => {
    try {
        const { getSeoContent } = await import('../services/seoEnrichment.js')
        const seoContent = await getSeoContent(req.params.slug)
        res.json({ seoContent })
    } catch (err) {
        console.error('[SEO Content] Error:', err.message)
        res.json({ seoContent: null })
    }
})

// POST /api/v1/tools/slug/:slug/seo-content/regenerate  (admin only)
// Force-regenerates SEO content even if fresh content already exists.
router.post('/slug/:slug/seo-content/regenerate', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { regenerateSeoContent } = await import('../services/seoEnrichment.js')
        const seoContent = await regenerateSeoContent(req.params.slug)
        res.json({ success: true, seoContent })
    } catch (err) {
        console.error('[SEO Content] Regenerate error:', err.message)
        res.status(500).json({ success: false, message: err.message })
    }
})

router.get(
    '/slug/:slug',
    cacheMiddleware(600),
    toolController.getToolBySlug
)


router.get(
    '/:id',
    validationRules.objectId('id'),
    validate,
    cacheMiddleware(600),
    toolController.getToolById
)

router.post(
    '/:id/view',
    validationRules.objectId('id'),
    validate,
    toolController.incrementViews
)

router.get(
    '/:id/related',
    validationRules.objectId('id'),
    validate,
    cacheMiddleware(600),
    toolController.getRelatedTools
)

router.post(
    '/:id/claim',
    requireAuth,
    validationRules.objectId('id'),
    validate,
    toolController.submitClaimRequest
)
// Admin routes
router.post(
    '/',
    requireAuth,
    requireAdmin,
    validationRules.createTool(),
    validate,
    toolController.createTool
)

router.put(
    '/:id',
    requireAuth,
    requireAdmin,
    validationRules.objectId('id'),
    validate,
    toolController.updateTool
)

router.delete(
    '/:id',
    requireAuth,
    requireAdmin,
    validationRules.objectId('id'),
    validate,
    toolController.deleteTool
)

export default router

