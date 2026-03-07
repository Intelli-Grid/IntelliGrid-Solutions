/**
 * timing.js
 * Response-time logging middleware.
 * - Logs any request > 1000ms as a warning
 * - Logs any request > 2000ms as a critical slow-query warning
 * - In production, slow requests are also captured by Sentry (if DSN is set)
 *
 * Usage: app.use(timingMiddleware) — imported in app.js before route mounts
 */

const SLOW_THRESHOLD_MS = 1000    // log as WARN
const CRITICAL_THRESHOLD_MS = 2000 // log as CRIT + Sentry

export function timingMiddleware(req, res, next) {
    const start = Date.now()

    res.on('finish', () => {
        const duration = Date.now() - start

        // Skip health check noise
        if (req.path === '/health') return

        if (duration > CRITICAL_THRESHOLD_MS) {
            console.warn(
                `[SLOW:CRIT] ${req.method} ${req.path} — ${duration}ms | status=${res.statusCode}`
            )

            // Capture in Sentry if DSN is configured (non-blocking)
            if (process.env.SENTRY_DSN) {
                import('../config/sentry.js')
                    .then(({ getSentry }) => {
                        const Sentry = getSentry?.()
                        if (Sentry) {
                            Sentry.captureMessage(`Slow request: ${req.method} ${req.path}`, {
                                level: 'warning',
                                extra: { duration, method: req.method, path: req.path, statusCode: res.statusCode },
                            })
                        }
                    })
                    .catch(() => { /* sentry unavailable — non-fatal */ })
            }
        } else if (duration > SLOW_THRESHOLD_MS) {
            console.warn(
                `[SLOW:WARN] ${req.method} ${req.path} — ${duration}ms | status=${res.statusCode}`
            )
        }
    })

    next()
}
