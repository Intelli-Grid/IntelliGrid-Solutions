import mongoose from 'mongoose'
import redisClient from '../src/config/redis.js'

afterAll(async () => {
    await mongoose.default.disconnect()
    if (redisClient.isOpen) {
        await redisClient.quit()
    }
})
