import * as Sentry from "@sentry/node"
import { nodeProfilingIntegration } from "@sentry/profiling-node"

export const initSentry = (app) => {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [
            nodeProfilingIntegration(),
        ],
        environment: process.env.NODE_ENV || 'development',
        release: `intelligrid-backend@${process.env.npm_package_version || '2.2.0'}`,
        // Sample 10% of transactions in production — 100% is costly and unneeded
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        // Sample 10% of profiles in production
        profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    })
}

export const sentryErrorHandler = (app) => {
    // The error handler must be registered before any other error middleware and after all controllers
    Sentry.setupExpressErrorHandler(app);
}
