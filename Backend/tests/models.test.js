import mongoose from 'mongoose'
import User from '../src/models/User.js'
import Tool from '../src/models/Tool.js'
import Review from '../src/models/Review.js'
import Order from '../src/models/Order.js'
import Collection from '../src/models/Collection.js'

describe('Database Models - Schema Validation', () => {

    describe('User Model', () => {
        it('Should validate required fields', async () => {
            const user = new User({})

            await expect(user.validate()).rejects.toThrow()
        })

        it('Should create user with valid data', async () => {
            const userData = {
                clerkId: `test_clerk_${Date.now()}`,
                email: `test${Date.now()}@example.com`,
                firstName: 'Test',
                lastName: 'User',
                referralCode: 'TEST123'
            }

            const user = new User(userData)
            await expect(user.validate()).resolves.not.toThrow()
        })

        it('Should have default subscription tier as free', () => {
            const user = new User({
                clerkId: 'test',
                email: 'test@example.com'
            })

            expect(user.subscription.tier).toBe('free')
            expect(user.subscription.status).toBe('active')
        })
    })

    describe('Tool Model', () => {
        it('Should validate required fields', async () => {
            const tool = new Tool({})

            await expect(tool.validate()).rejects.toThrow()
        })

        it('Should create tool with valid data', async () => {
            const toolData = {
                name: 'Test Tool',
                slug: `test-tool-${Date.now()}`,
                shortDescription: 'A test tool',
                category: new mongoose.Types.ObjectId(),
                officialUrl: 'https://example.com',
                pricing: {
                    type: 'Free'
                }
            }

            const tool = new Tool(toolData)
            await expect(tool.validate()).resolves.not.toThrow()
        })

        it('Should have default values', () => {
            const tool = new Tool({
                name: 'Test',
                slug: 'test',
                shortDescription: 'Test',
                category: new mongoose.Types.ObjectId(),
                officialUrl: 'https://example.com'
            })

            expect(tool.isVerified).toBe(false)
            expect(tool.isFeatured).toBe(false)
            expect(tool.views).toBe(0)
        })
    })

    describe('Review Model', () => {
        it('Should validate rating range', async () => {
            const review = new Review({
                user: new mongoose.Types.ObjectId(),
                tool: new mongoose.Types.ObjectId(),
                rating: 6, // Invalid
                comment: 'Test'
            })

            await expect(review.validate()).rejects.toThrow()
        })

        it('Should accept valid rating', async () => {
            const review = new Review({
                user: new mongoose.Types.ObjectId(),
                tool: new mongoose.Types.ObjectId(),
                rating: 4,
                comment: 'Good tool'
            })

            await expect(review.validate()).resolves.not.toThrow()
        })
    })

    describe('Order Model', () => {
        it('Should validate subscription tier enum', async () => {
            const order = new Order({
                orderId: `ORDER_${Date.now()}`,
                user: new mongoose.Types.ObjectId(),
                subscription: {
                    tier: 'invalid', // Invalid
                    duration: 'monthly'
                },
                amount: {
                    total: 9.99
                },
                paymentGateway: 'paypal'
            })

            await expect(order.validate()).rejects.toThrow()
        })

        it('Should create order with valid data', async () => {
            const order = new Order({
                orderId: `ORDER_${Date.now()}`,
                user: new mongoose.Types.ObjectId(),
                subscription: {
                    tier: 'pro',
                    duration: 'monthly'
                },
                amount: {
                    currency: 'USD',
                    total: 9.99
                },
                paymentGateway: 'paypal',
                status: 'pending'
            })

            await expect(order.validate()).resolves.not.toThrow()
        })
    })

    describe('Collection Model', () => {
        it('Should validate required fields', async () => {
            const collection = new Collection({})

            await expect(collection.validate()).rejects.toThrow()
        })

        it('Should create collection with valid data', async () => {
            const collection = new Collection({
                name: 'My Collection',
                slug: `my-collection-${Date.now()}`,
                owner: new mongoose.Types.ObjectId(), // Changed from 'user' to 'owner'
                tools: [],
                isPublic: true
            })

            await expect(collection.validate()).resolves.not.toThrow()
        })

        it('Should have default values', () => {
            const collection = new Collection({
                name: 'Test',
                slug: 'test',
                owner: new mongoose.Types.ObjectId() // Changed from 'user' to 'owner'
            })

            expect(collection.isPublic).toBe(true) // Default is true, not false
            expect(collection.views).toBe(0)
            expect(Array.isArray(collection.tools)).toBe(true)
        })
    })
})
