import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 60000, // 60s — handles Render/Railway cold starts
        })

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
        console.log(`📊 Database: ${conn.connection.name}`)

        // Connection event listeners
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err)
        })

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected')
        })

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected')
        })

        return conn
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message)
        process.exit(1)
    }
}

export default connectDB
