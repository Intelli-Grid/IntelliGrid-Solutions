import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import * as Sentry from '@sentry/node'
import connectDB from './config/database.js'
import { connectRedis } from './config/redis.js'

// Import routes
import toolRoutes from './routes/toolRoutes.js'
import categoryRoutes from './routes/categoryRoutes.js'
import userRoutes from './routes/userRoutes.js'
import authRoutes from './routes/authRoutes.js'
import reviewRoutes from './routes/reviewRoutes.js'
import paymentRoutes from './routes/paymentRoutes.js'
import analyticsRoutes from './routes/analyticsRoutes.js'

// Load environment variables
dotenv.config()

// Initialize Express app
const app = express()

// Initialize Sentry
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 1.0,
    })
    app.use(Sentry.Handlers.requestHandler())
    app.use(Sentry.Handlers.tracingHandler())
}

// Connect to Database
connectDB()

// Connect to Redis
connectRedis()

// Middleware
app.use(helmet()) // Security headers
app.use(compression()) // Compress responses
app.use(morgan('dev')) // Logging
app.use(express.json({ limit: '10mb' })) // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })) // Parse URL-encoded bodies

// CORS Configuration
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    optionsSuccessStatus: 200,
}
app.use(cors(corsOptions))

// Rate Limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
})
app.use('/api/', limiter)

// Health Check Route
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'IntelliGrid API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    })
})

// API Routes
app.get('/api/v1', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'IntelliGrid API v1',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            tools: '/api/v1/tools',
            categories: '/api/v1/categories',
            user: '/api/v1/user',
            auth: '/api/v1/auth',
            reviews: '/api/v1/reviews',
            payment: '/api/v1/payment',
            analytics: '/api/v1/analytics',
        },
    })
})

// Mount API routes
app.use('/api/v1/tools', toolRoutes)
app.use('/api/v1/categories', categoryRoutes)
app.use('/api/v1/user', userRoutes)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/reviews', reviewRoutes)
app.use('/api/v1/payment', paymentRoutes)
app.use('/api/v1/analytics', analyticsRoutes)

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
        path: req.originalUrl,
    })
})

// Sentry Error Handler
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler())
}

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err)

    const statusCode = err.statusCode || 500
    const message = err.message || 'Internal Server Error'

    res.status(statusCode).json({
        status: 'error',
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    })
})

// Start Server
const PORT = process.env.PORT || 10000
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
    console.log(`📡 API: http://localhost:${PORT}/api/v1`)
    console.log(`💚 Health: http://localhost:${PORT}/health`)
    console.log(`\n📋 Available Routes:`)
    console.log(`   - Tools: /api/v1/tools`)
    console.log(`   - Categories: /api/v1/categories`)
    console.log(`   - User: /api/v1/user`)
    console.log(`   - Auth: /api/v1/auth`)
    console.log(`   - Reviews: /api/v1/reviews`)
    console.log(`   - Payment: /api/v1/payment`)
    console.log(`   - Analytics: /api/v1/analytics`)
})

export default app
