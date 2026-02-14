import app from './app.js'
import renewalService from './services/renewalService.js'

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
    console.log(`   - Admin: /api/v1/admin`)

    // Start Renewal Scheduler
    renewalService.startScheduler()
})
