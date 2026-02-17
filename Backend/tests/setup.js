import mongoose from 'mongoose'
import redisClient from '../src/config/redis.js'
import connectDB from '../src/config/database.js'

beforeAll(async () => {
    // Connect to database before running tests
    await connectDB()
}, 30000)

afterAll(async () => {
    // Clean up connections after all tests
    await mongoose.disconnect()
    if (redisClient.isOpen) {
        await redisClient.quit()
    }
}, 30000)
