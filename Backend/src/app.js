import express from 'express'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import mongoSanitize from 'express-mongo-sanitize' // Added import for mongoSanitize
import { initSentry, sentryErrorHandler } from './config/sentry.js'
import connectDB from './config/database.js'
import redisClient, { connectRedis } from './config/redis.js'
import mongoose from 'mongoose'

// Load environment variables FIRST before anything else reads process.env
dotenv.config()

// Import routes
import toolRoutes from './routes/toolRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import userRoutes from './routes/userRoutes.js'
import authRoutes from './routes/authRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'
import gdprRoutes from './routes/gdprRoutes.js'
import adminRoutes from './routes/admin.routes.js'
import seoRoutes from './routes/seoRoutes.js'
import collectionRoutes from './routes/collectionRoutes.js'
import newsletterRoutes from './routes/newsletterRoutes.js'
import submissionRoutes from './routes/submissionRoutes.js'
import couponRoutes from './routes/couponRoutes.js'
import blogRoutes from './routes/blogRoutes.js'
import stackAdvisorRoutes from './routes/stackAdvisorRoutes.js'
import feedbackRoutes from './routes/feedbackRoutes.js'
import telegramRoutes from './routes/telegram.routes.js'
import communityTelegramRoutes from './routes/communityTelegram.routes.js'
import { initialiseTelegramBot } from './services/telegramBot.js'
import { initialiseCommunityBot } from './services/communityBot.js'
import { startCrawlerScheduler } from './jobs/crawlerScheduler.js'
import { getEnabledFlagKeys } from './services/featureFlags.js'
import { timingMiddleware } from './middleware/timing.js'

// ─────────────────────────────────────────────────────────────────────────────
// App bootstrap
// ─────────────────────────────────────────────────────────────────────────────
const app = express()

console.log(`🚀 INTELLIGRID BACKEND v2.4.0 | NODE_ENV=${process.env.NODE_ENV || 'development'}`)
console.log(`   PayPal mode: ${process.env.PAYPAL_MODE || 'live'} | Cashfree env: ${process.env.CASHFREE_ENV || 'PROD'}`)

// Trust proxy (Railway sits behind a proxy layer)
app.set('trust proxy', 1)

// ── Sentry must be initialised before any other middleware ────────────────────
if (process.env.SENTRY_DSN) {
    initSentry(app)
    console.log('✅ Sentry backend monitoring active')
} else {
    console.warn('⚠️  SENTRY_DSN not set — backend error monitoring disabled')
}

// ── Database connections ──────────────────────────────────────────────────────
connectDB()
connectRedis()

// ── Telegram Owner Bot ───────────────────────────────────────────────────────
// Initialised after DB connect so bot commands can query MongoDB immediately.
// Silently no-ops when TELEGRAM_BOT_TOKEN / OWNER_TELEGRAM_ID are not set.
initialiseTelegramBot()

// ── Telegram Community Bot ───────────────────────────────────────────────────
// Public-facing bot — silently no-ops if COMMUNITY_BOT_TOKEN is not set.
// Set COMMUNITY_BOT_TOKEN + COMMUNITY_CHANNEL_ID in Railway to activate.
initialiseCommunityBot()

// ── Crawler Scheduler ───────────────────────────────────────────────────────
// Only starts when CRAWLER_ENABLED=true is set in Railway — off by default in dev.
if (process.env.CRAWLER_ENABLED === 'true') {
    startCrawlerScheduler()
} else {
    console.log('⚠️  [CrawlerScheduler] Disabled (set CRAWLER_ENABLED=true to activate nightly crawls)')
}

// ── CORS — must be before helmet and any other middleware ────────────────────
const ALLOWED_ORIGINS = [
    process.env.FRONTEND_URL,
    process.env.RENDER_EXTERNAL_URL,   // Auto-set by Render — e.g. https://intelligrid-backend.onrender.com
    'http://localhost:5173',
    'http://localhost:5174',
    'https://admin.intelligrid.online',
    'https://intelligrid.online',
    'https://www.intelligrid.online',
].filter(Boolean)

// Pattern-based origins — Vercel preview deployments + Railway/Render internal services
const ALLOWED_ORIGIN_PATTERNS = [
    /^https:\/\/intelli-grid-solutions[a-z0-9-]*\.vercel\.app$/,  // all Vercel preview URLs
    /^https:\/\/[a-z0-9-]+\.railway\.app$/,                       // Railway internal services (legacy)
    /^https:\/\/[a-z0-9-]+\.onrender\.com$/,                      // Render preview & internal URLs
]

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, curl, health checkers)
        if (!origin) return callback(null, true)

        // Exact match check
        if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)

        // Pattern match check (Vercel previews + Railway)
        if (ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin))) {
            return callback(null, true)
        }

        // Allow all origins in development
        if (process.env.NODE_ENV === 'development') return callback(null, true)

        console.warn(`🚫 CORS blocked origin: ${origin}`)
        callback(new Error(`Origin ${origin} not allowed by CORS`))
    },
    credentials: true,
    optionsSuccessStatus: 200,
}

// Explicitly handle ALL preflight OPTIONS requests before any other middleware
app.options('*', cors(corsOptions))
app.use(cors(corsOptions))

// ── Security & general middleware ─────────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images to be served cross-origin
    crossOriginOpenerPolicy: false, // Do not override CORS headers set by cors()
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://js.clerk.dev", "https://www.googletagmanager.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://api.intelligrid.online", "https://backend.intelligrid.online", "https://*.onrender.com", "https://*.algolia.net", "https://*.sentry.io", "https://clerk.intelligrid.online", "https://*.clerk.accounts.dev"],
            frameSrc: ["'self'", "https://www.paypal.com", "https://js.cashfree.com"],
        }
    }
}))
app.use(compression())

// Only log requests in development — Railway has its own request logs
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'))
} else {
    app.use(morgan('combined'))
}

// Reduce body limit for most routes (10mb is excessive — 1mb is safer)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// Sanitize data against NoSQL query injection
app.use(mongoSanitize()) // Added mongoSanitize middleware

// ── SEO Routes (sitemap.xml + robots.txt) — before rate limiter ───────────────
// These are public routes crawled frequently by bots; they must not be rate-limited
app.use('/', seoRoutes)

// ── Rate Limiting ─────────────────────────────────────────────────────────────

// Admin limiter — must be registered BEFORE the global limiter.
// Admin panel fires 8-10 parallel requests per tab-switch; standard limits are
// not appropriate for authenticated, role-gated internal routes.
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 1000,                   // 1000 req / 15 min per IP — generous for power users
    message: {
        status: 'error',
        message: 'Too many admin requests from this IP. Please wait a moment.',
    },
    standardHeaders: true,
    legacyHeaders: false,
})
app.use('/api/v1/admin', adminLimiter)

// Global limiter — broad protection for all other /api/ routes
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 300,               // raised: 100 → 300
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip health check from rate limiting
    skip: (req) => req.path === '/health' || req.originalUrl === '/api/health',
})
app.use('/api/', limiter)

// Auth endpoints — 20 requests per 15 min (prevent brute-force / token flooding)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { status: 'error', message: 'Too many auth requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
})
app.use('/api/v1/auth/sync', authLimiter)
app.use('/api/v1/auth/me', authLimiter)

// Payment creation — 10 requests per 15 min per IP (prevent order flooding)
const paymentCreateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { status: 'error', message: 'Too many payment requests. Please wait before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
})
app.use('/api/v1/payment/paypal/create-order', paymentCreateLimiter)
app.use('/api/v1/payment/paypal/create-subscription', paymentCreateLimiter)
app.use('/api/v1/payment/cashfree/create-order', paymentCreateLimiter)

// Submission endpoint — 5 per 30 min per IP (prevent spam submissions)
const submissionLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 5,
    message: { status: 'error', message: 'Too many submissions. Please wait before submitting again.' },
    standardHeaders: true,
    legacyHeaders: false,
})
app.use('/api/v1/submissions', submissionLimiter)

// Review write endpoint — 15 per 15 min per IP
const reviewWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { status: 'error', message: 'Too many review requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'GET', // Only limit writes
})
app.use('/api/v1/reviews', reviewWriteLimiter)

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    // redisClient may be null if REDIS_URL is invalid — treat as degraded, not fatal
    const redisStatus = redisClient?.isOpen ? 'connected' : 'unavailable'
    // Only gate health on DB. Redis is cache-only; a missing/invalid REDIS_URL
    // should NOT cause Railway to restart the container in a crash loop.
    const isHealthy = dbStatus === 'connected'

    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'success' : 'error',
        message: isHealthy ? 'All systems operational' : 'Database unavailable',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        services: {
            database: dbStatus,
            redis: redisStatus,
            algolia: (process.env.ALGOLIA_ADMIN_KEY || process.env.ALGOLIA_API_KEY) ? 'Active' : 'Missing',
            brevo: process.env.BREVO_API_KEY ? 'Active' : 'Missing',
            clerk: process.env.CLERK_SECRET_KEY ? 'Active' : 'Missing'
        },
        paypal_mode: process.env.PAYPAL_MODE || 'live',
        cashfree_env: process.env.CASHFREE_ENV || 'PROD'
    })
})

// Quick health check for external monitoring (checklist 12.8)
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

// ── Geo Detection ──────────────────────────────────────────────────────────────
// Cloudflare injects CF-IPCountry on every request — free, zero latency.
// Railway's reverse proxy also preserves this header.
// Returns { country: 'IN' } | { country: 'US' } etc.
app.get('/api/v1/geo/country', (req, res) => {
    const country = req.headers['cf-ipcountry'] || req.headers['x-country-code'] || 'US'
    // Cloudflare sentinel for unknown countries — treat as US
    const resolved = country === 'XX' ? 'US' : country.toUpperCase().slice(0, 2)
    res.set('Cache-Control', 'no-store')
    res.json({ country: resolved })
})

// ── API Index ─────────────────────────────────────────────────────────────────
app.get('/api/v1', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'IntelliGrid API v1',
        version: '2.4.0',
        endpoints: {
            health: '/health',
            tools: '/api/v1/tools',
            categories: '/api/v1/categories',
            user: '/api/v1/user',
            auth: '/api/v1/auth',
            reviews: '/api/v1/reviews',
            payment: '/api/v1/payment',
            analytics: '/api/v1/analytics',
            gdpr: '/api/v1/gdpr',
            admin: '/api/v1/admin',
            collections: '/api/v1/collections',
            newsletter: '/api/v1/newsletter',
            submissions: '/api/v1/submissions',
            coupons: '/api/v1/coupons',
            blog: '/api/v1/blog',
        },
    })
})

// ── Performance Timing Middleware ────────────────────────────────────────────
// Logs slow requests (>1s warn, >2s crit+Sentry). Must be before route mounts.
app.use(timingMiddleware)

// ── Global Pagination Middleware ──────────────────────────────────────────────
app.use((req, res, next) => {
    if (req.query.limit) {
        const limit = parseInt(req.query.limit, 10)
        req.query.limit = (!isNaN(limit) && limit > 0) ? Math.min(limit, 100) : 20
    }
    if (req.query.page) {
        const page = parseInt(req.query.page, 10)
        req.query.page = (!isNaN(page) && page > 0) ? page : 1
    }
    next()
})

// ── Request Correlation IDs ──────────────────────────────────────────────────
// BUG-24 fix: Attach a unique requestId to every request so errors in Sentry
// and Railway logs can be correlated with user-reported incidents.
// Propagates the upstream X-Request-Id header if already set (e.g. by Cloudflare).
app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || randomUUID()
    res.setHeader('X-Request-Id', req.requestId)
    next()
})

// ── Mount API Routes ──────────────────────────────────────────────────────────
app.use('/api/v1/tools', toolRoutes)
app.use('/api/v1/categories', categoryRoutes)
app.use('/api/v1/user', userRoutes)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/reviews', reviewRoutes)
app.use('/api/v1/payment', paymentRoutes)
app.use('/api/v1/analytics', analyticsRoutes)
app.use('/api/v1/gdpr', gdprRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/collections', collectionRoutes)
app.use('/api/v1/newsletter', newsletterRoutes)
app.use('/api/v1/submissions', submissionRoutes)
app.use('/api/v1/coupons', couponRoutes)
app.use('/api/v1/blog', blogRoutes)
app.use('/api/v1/stack-advisor', stackAdvisorRoutes)
app.use('/api/v1/feedback', feedbackRoutes)
app.use('/api/v1/telegram', telegramRoutes)
app.use('/api/v1/telegram', communityTelegramRoutes)

// ── Feature Flags Public Endpoint ────────────────────────────────────────────
// Returns only the list of enabled flag keys — no auth required, no sensitive data.
// Used by the frontend FeatureFlagProvider to conditionally render features.
app.get('/api/v1/config/features', async (req, res) => {
    try {
        const features = await getEnabledFlagKeys()
        res.json({ features })
    } catch (err) {
        console.error('[FeatureFlags] Public endpoint error:', err.message)
        res.json({ features: [] }) // Always succeed — features just default to off
    }
})

// ── Platform Stats Public Endpoint ───────────────────────────────────────────
// Returns live tool count, category count for the homepage stats section.
// Cached in Redis for 5 minutes. No auth required — public-facing data only.
app.get('/api/v1/platform-stats', async (req, res) => {
    try {
        const CACHE_KEY = 'platform_stats_public'
        const CACHE_TTL = 300 // 5 minutes

        // Try Redis cache first
        if (redisClient?.isOpen) {
            const cached = await redisClient.get(CACHE_KEY).catch(() => null)
            if (cached) return res.json(JSON.parse(cached))
        }

        const [{ default: Tool }, { default: Category }] = await Promise.all([
            import('./models/Tool.js'),
            import('./models/Category.js'),
        ])

        const [totalTools, totalCategories] = await Promise.all([
            Tool.countDocuments({ status: 'active', isActive: { $ne: false } }),
            Category.countDocuments({ isActive: true }),
        ])

        const payload = {
            success: true,
            data: {
                totalTools,
                totalCategories,
                uptime: 99, // SLA uptime — static by design
            }
        }

        // Cache the result
        if (redisClient?.isOpen) {
            await redisClient.set(CACHE_KEY, JSON.stringify(payload), { EX: CACHE_TTL }).catch(() => {})
        }

        res.json(payload)
    } catch (err) {
        console.error('[PlatformStats] Error:', err.message)
        // Graceful fallback — never block homepage load
        res.json({ success: true, data: { totalTools: 4000, totalCategories: 50, uptime: 99 } })
    }
})

// ── Featured Listings Public Endpoint ────────────────────────────────────────
// Returns active sponsored listings (FEATURED_LISTINGS flag must be ON).
// Data is cached in Redis for 5 minutes to avoid hammering MongoDB on every page load.
app.get('/api/v1/featured', async (req, res) => {
    try {
        const { isFeatureEnabled } = await import('./services/featureFlags.js')
        const flagOn = await isFeatureEnabled('FEATURED_LISTINGS')
        if (!flagOn) return res.json({ listings: [] })

        const CACHE_KEY = 'featured_listings_public'
        // BUG-18 fix: Featured listings only change when an admin updates them.
        // 5 min was too aggressive — raise to 30 min to reduce DB load on busy pages.
        const CACHE_TTL = 1800 // 30 minutes

        // Try Redis cache first
        if (redisClient?.isOpen) {
            const cached = await redisClient.get(CACHE_KEY).catch(() => null)
            if (cached) return res.json({ listings: JSON.parse(cached) })
        }

        const FeaturedListing = (await import('./models/FeaturedListing.js')).default
        const listings = await FeaturedListing.find({
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() },
        })
            .populate('tool', 'name slug logo shortDescription officialUrl affiliateUrl ratings')
            .sort({ tier: 1, createdAt: -1 }) // premium first
            .lean()

        // Cache the result
        if (redisClient?.isOpen) {
            redisClient.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(listings)).catch(() => { })
        }

        res.json({ listings })
    } catch (err) {
        console.error('[Featured] Public endpoint error:', err.message)
        res.json({ listings: [] })
    }
})


// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
        path: req.originalUrl,
    })
})

// ── Sentry Error Handler (must be before global error handler) ────────────────
if (process.env.SENTRY_DSN) {
    sentryErrorHandler(app)
}

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    // Don't log CORS errors as critical — they are expected for invalid origins
    if (err.message && err.message.includes('not allowed by CORS')) {
        return res.status(403).json({ status: 'error', message: err.message })
    }

    console.error('❌ Unhandled Error:', {
        requestId: req.requestId,
        userId: req.user?._id?.toString() || 'anonymous',
        message: err.message,
        statusCode: err.statusCode,
        path: req.originalUrl,
        method: req.method,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    })

    const statusCode = err.statusCode || 500
    const message = err.message || 'Internal Server Error'

    // Never expose stack traces in production
    res.status(statusCode).json({
        status: 'error',
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    })
})

export default app
