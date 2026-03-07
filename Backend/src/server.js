import app from './app.js'
import renewalService from './services/renewalService.js'
import linkValidationService from './services/linkValidationService.js'
import discoveryScheduler from './services/discoveryScheduler.js'
import { startTrialCron } from './jobs/trialCron.js'
import { startWinBackCron } from './jobs/winBackCron.js'
import { startEnrichmentCron } from './jobs/enrichmentCron.js'
import './jobs/linkHealthCron.js'   // Phase 6: registers Sunday 04:00 UTC cron on import

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

    // Start legacy schedulers
    renewalService.startScheduler()
    // NOTE: linkValidationService.startScheduler() removed — its link-checking logic
    // duplicates linkHealthCron (Sunday 04:00 UTC). linkHealthCron is the canonical
    // link health job. linkValidationService is retained for its utility functions only.
    discoveryScheduler.startScheduler()

    // Start cron jobs
    startTrialCron()       // Daily 08:00 UTC — trial lifecycle (expire, urgency, reminder, midpoint)
    startWinBackCron()     // Daily 09:00 UTC — win-back emails for cancelled/expired users
    startEnrichmentCron()  // Weekly Sun 02:00 UTC — flag stale tools for re-enrichment
    // linkHealthCron auto-starts on import (Sunday 04:00 UTC)
})
