import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { HelmetProvider } from 'react-helmet-async'
import * as Sentry from '@sentry/react'
import ErrorFallback from './components/ErrorFallback.jsx'
import App from './App'
import './index.css'
import { ToastProvider } from './context/ToastContext'
import Toaster from './components/common/Toaster'
import { initGA } from './utils/analytics'
import ClerkTokenBridge from './components/auth/ClerkTokenBridge'

// Initialize Sentry
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_ENV || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  })
}

// Get Clerk publishable key
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn('Missing Clerk Publishable Key')
}

// NOTE: GA4 is intentionally NOT initialized here.
// initGA() is called only after the user explicitly accepts cookies
// in CookieConsent.jsx — required for GDPR compliance.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        afterSignOutUrl="/"
      >
        {/* Bridge: registers Clerk's getToken into the api.js interceptor */}
        <ClerkTokenBridge />
        <Sentry.ErrorBoundary fallback={({ error }) => <ErrorFallback error={error} />}>
          <ToastProvider>
            <BrowserRouter>
              <App />
              <Toaster />
            </BrowserRouter>
          </ToastProvider>
        </Sentry.ErrorBoundary>
      </ClerkProvider>
    </HelmetProvider>
  </React.StrictMode>
)
