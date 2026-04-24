/**
 * instrument.js — Sentry ESM instrumentation entrypoint
 *
 * For ESM (Node --experimental-loader / --import) projects, Sentry MUST be
 * initialised in a separate file loaded via `node --import ./src/instrument.js`
 * BEFORE any other application code runs. This is the official Sentry ESM fix:
 * https://docs.sentry.io/platforms/javascript/guides/express/install/esm/
 *
 * Without this, @sentry/node cannot instrument the 'express' module because
 * the module is already loaded and its exports are frozen by the time Sentry
 * initialises inside app.js.
 *
 * Render start command in render.yaml should be updated to:
 *   node --import ./src/instrument.js src/server.js
 */
import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
        nodeProfilingIntegration(),
    ],
    environment: process.env.NODE_ENV || 'development',
    release: `intelligrid-backend@${process.env.npm_package_version || '2.4.0'}`,
    // 10% of transactions in production — 100% is too costly
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // 10% of profiles in production
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
})
