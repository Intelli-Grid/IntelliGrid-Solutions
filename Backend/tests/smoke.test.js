import request from 'supertest'
import app from '../src/app.js'
import mongoose from 'mongoose'
import redisClient from '../src/config/redis.js'

beforeAll(async () => {
    // Wait for Mongoose connection
    if (mongoose.connection.readyState !== 1) {
        await new Promise(resolve => mongoose.connection.once('open', resolve))
    }

    // Wait for Redis connection
    if (!redisClient.isOpen) {
        await redisClient.connect().catch(() => { }) // Might be already connecting
        // Wait a bit for it to be ready if needed, but connect() should resolve when ready
    }
})

describe('Smoke Tests - Health & Basic Functionality', () => {
    it('GET /health should return 200 OK', async () => {
        const response = await request(app).get('/health')
        expect(response.status).toBe(200)
        expect(response.body.status).toBe('success')
        expect(response.body.services.database).toBe('connected')
        expect(response.body.services.redis).toBe('connected')
    })

    it('GET /api/v1/tools should return a list of tools', async () => {
        const response = await request(app).get('/api/v1/tools')
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(Array.isArray(response.body.data.tools)).toBe(true)
    })

    it('GET /api/v1/categories should return a list of categories', async () => {
        const response = await request(app).get('/api/v1/categories')
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(Array.isArray(response.body.data)).toBe(true)
    })

    it('GET /api/v1/tools/search should work', async () => {
        const response = await request(app).get('/api/v1/tools/search?q=video')
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.hits).toBeDefined()
    })

    it('GET /api/v1/unknown-route should return 404', async () => {
        const response = await request(app).get('/api/v1/unknown-route')
        expect(response.status).toBe(404)
        expect(response.body.status).toBe('error')
    })
})
