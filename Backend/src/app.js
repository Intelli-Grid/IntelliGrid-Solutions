import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
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
import { startTrialCron } from './jobs/trialCron.js'
import { startWinBackCron } from './jobs/winBackCron.js'
import { getEnabledFlagKeys } from './services/featureFlags.js'

// ─────────────────────────────────────────────────────────────────────────────
// App bootstrap
// ─────────────────────────────────────────────────────────────────────────────
const app = express()

console.log(`🚀 INTELLIGRID BACKEND v2.4.0 | NODE_ENV=${process.env.NODE_ENV || 'development'}`)
console.log(`   PayPal mode: ${process.env.PAYPAL_MODE || 'sandbox'} | Cashfree env: ${process.env.CASHFREE_ENV || 'TEST'}`)

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

// ── Background jobs ────────────────────────────────────────────────────────
startTrialCron()
startWinBackCron()

// ── Security & general middleware ─────────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images to be served cross-origin
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

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:5174',
    'https://admin.intelligrid.online',
    'https://intelligrid.online',
    'https://www.intelligrid.online',
].filter(Boolean)

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, curl, health checkers)
        if (!origin) return callback(null, true)

        if (ALLOWED_ORIGINS.includes(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true)
        } else {
            console.warn(`🚫 CORS blocked origin: ${origin}`)
            callback(new Error(`Origin ${origin} not allowed by CORS`))
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
}))

// ── SEO Routes (sitemap.xml + robots.txt) — before rate limiter ───────────────
// These are public routes crawled frequently by bots; they must not be rate-limited
app.use('/', seoRoutes)

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip health check from rate limiting
    skip: (req) => req.path === '/health',
})
app.use('/api/', limiter)

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
        },
        environment: process.env.NODE_ENV,
        paypal_mode: process.env.PAYPAL_MODE || 'sandbox',
        cashfree_env: process.env.CASHFREE_ENV || 'TEST',
    })
})

// ── API Index ─────────────────────────────────────────────────────────────────
app.get('/api/v1', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'IntelliGrid API v1',
        version: '2.3.0',
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
app.use('/api/stack-advisor', stackAdvisorRoutes)

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
