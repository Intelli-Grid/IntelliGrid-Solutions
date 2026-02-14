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

// Load environment variables
dotenv.config()

// Initialize Express app
const app = express()

console.log('🚀 INTELLIGRID BACKEND - VERSION 2.1 (Fixes Applied)')

// Trust proxy (for Railway deployment)
app.set('trust proxy', 1)

// Initialize Sentry (Must be first middleware)
if (process.env.SENTRY_DSN) {
    initSentry(app)
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
// Health Check Route
app.get('/health', async (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    const redisStatus = redisClient.isOpen ? 'connected' : 'disconnected'

    const isHealthy = dbStatus === 'connected' && redisStatus === 'connected'

    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'success' : 'error',
        message: isHealthy ? 'All systems operational' : 'System issues detected',
        timestamp: new Date().toISOString(),
        services: {
            database: dbStatus,
            redis: redisStatus
        },
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

            gdpr: '/api/v1/gdpr',
            admin: '/api/v1/admin',
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

app.use('/api/v1/gdpr', gdprRoutes)
app.use('/api/v1/admin', adminRoutes)

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
    sentryErrorHandler(app)
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

export default app
