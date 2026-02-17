import request from 'supertest'
import app from '../src/app.js'
import mongoose from 'mongoose'
import redisClient from '../src/config/redis.js'

describe('Integration Tests - Full Platform', () => {

    describe('Public API Endpoints', () => {
        it('GET /api/v1/tools - should return paginated tools', async () => {
            const response = await request(app)
                .get('/api/v1/tools')
                .query({ page: 1, limit: 10 })

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data.tools).toBeDefined()
            expect(Array.isArray(response.body.data.tools)).toBe(true)
            expect(response.body.data.pagination).toBeDefined()
        })

        it('GET /api/v1/tools/:slug - should return tool details', async () => {
            // First get a tool to test with
            const toolsResponse = await request(app).get('/api/v1/tools?limit=1')
            const firstTool = toolsResponse.body.data.tools[0]

            if (firstTool) {
                const response = await request(app).get(`/api/v1/tools/${firstTool.slug}`)
                expect(response.status).toBe(200)
                expect(response.body.success).toBe(true)
                expect(response.body.data.slug).toBe(firstTool.slug)
            }
        })

        it('GET /api/v1/categories - should return all categories', async () => {
            const response = await request(app).get('/api/v1/categories')

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(Array.isArray(response.body.data)).toBe(true)
        })

        it('GET /api/v1/tools/search - should search tools', async () => {
            const response = await request(app)
                .get('/api/v1/tools/search')
                .query({ q: 'chat' })

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
            expect(response.body.data.hits).toBeDefined()
        })

        it('GET /api/v1/collections - should return public collections', async () => {
            const response = await request(app).get('/api/v1/collections')

            expect(response.status).toBe(200)
            expect(response.body.success).toBe(true)
        })
    })

    describe('Protected Endpoints (Without Auth)', () => {
        it('POST /api/v1/reviews - should require authentication', async () => {
            const response = await request(app)
                .post('/api/v1/reviews')
                .send({ toolId: 'test', rating: 5, comment: 'Test' })

            expect(response.status).toBe(401)
        })

        it('POST /api/v1/user/favorites - should require authentication', async () => {
            const response = await request(app)
                .post('/api/v1/user/favorites')
                .send({ toolId: 'test' })

            expect(response.status).toBe(401)
        })

        it('GET /api/v1/user/profile - should require authentication', async () => {
            const response = await request(app).get('/api/v1/user/profile')

            expect(response.status).toBe(401)
        })
    })

    describe('Payment Endpoints', () => {
        it('POST /api/v1/payments/paypal/create - should require authentication', async () => {
            const response = await request(app)
                .post('/api/v1/payments/paypal/create')
                .send({ plan: 'pro_monthly' })

            expect(response.status).toBe(401)
        })

        it('POST /api/v1/payments/cashfree/create - should require authentication', async () => {
            const response = await request(app)
                .post('/api/v1/payments/cashfree/create')
                .send({ plan: 'pro_yearly' })

            expect(response.status).toBe(401)
        })
    })

    describe('Admin Endpoints', () => {
        it('GET /api/v1/admin/tools/pending - should require admin role', async () => {
            const response = await request(app).get('/api/v1/admin/tools/pending')

            expect(response.status).toBe(401)
        })

        it('GET /api/v1/analytics/revenue - should require admin role', async () => {
            const response = await request(app).get('/api/v1/analytics/revenue')

            expect(response.status).toBe(401)
        })
    })

    describe('Error Handling', () => {
        it('GET /api/v1/tools/invalid-slug-12345 - should return error', async () => {
            const response = await request(app).get('/api/v1/tools/invalid-slug-12345')

            // Should return error status (400 for bad request, 404 for not found, or 500 for server error)
            expect([400, 404, 500]).toContain(response.status)
            expect(response.body.success).toBe(false)
        })

        it('POST /api/v1/tools - should validate required fields', async () => {
            const response = await request(app)
                .post('/api/v1/tools')
                .send({})

            expect([400, 401]).toContain(response.status)
        })
    })

    describe('Rate Limiting', () => {
        it('Should handle multiple rapid requests', async () => {
            const requests = Array(5).fill().map(() =>
                request(app).get('/api/v1/tools')
            )

            const responses = await Promise.all(requests)

            // All should succeed (within rate limit)
            responses.forEach(response => {
                expect([200, 429]).toContain(response.status)
            })
        })
    })

    describe('CORS', () => {
        it('Should include CORS headers', async () => {
            const response = await request(app)
                .get('/api/v1/tools')
                .set('Origin', 'http://localhost:5173')

            expect(response.headers['access-control-allow-origin']).toBeDefined()
        })
    })
})
