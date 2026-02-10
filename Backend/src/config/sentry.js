import * as Sentry from "@sentry/node"
import { nodeProfilingIntegration } from "@sentry/profiling-node"

export const initSentry = (app) => {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [
            nodeProfilingIntegration(),
        ],
        // Performance Monitoring
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
        environment: process.env.NODE_ENV || 'development',
    });
}

export const sentryErrorHandler = (app) => {
    // The error handler must be registered before any other error middleware and after all controllers
    Sentry.setupExpressErrorHandler(app);
}
