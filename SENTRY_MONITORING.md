# 🦅 Sentry Monitoring Guide

**Status:** Active  
**Implementation Date:** February 10, 2026

---

## 🔍 **Overview**

Sentry is integrated on both Backend (Node.js/Express) and Frontend (React) to provide full-stack visibility into errors and performance issues.

---

## ⚙️ **Backend Configuration (Express)**

### **Key Features:**
- **Requests Tracing:** Tracks every incoming HTTP request.
- **Profiling:** Enabled via `@sentry/profiling-node` for CPU usage analysis.
- **Error Capturing:** Automatically captures uncaught exceptions and rejected promises.
- **Middleware Integration:** `initSentry` initializes Sentry before any other middleware.

### **Usage:**
Errors thrown in async handlers are automatically captured if they propagate to the global error handler.

**Manual Error Reporting:**
```javascript
import * as Sentry from '@sentry/node'

try {
    // ... code
} catch (error) {
    Sentry.captureException(error)
}
```

### **Profiling:**
Profiles are automatically collected based on `profilesSampleRate: 1.0` (100% of transactions).

---

## 🖥️ **Frontend Configuration (React)**

### **Key Features:**
- **Error Boundary:** Wraps the entire application to catch rendering errors.
- **Custom Fallback UI:** Users see a friendly "Something Went Wrong" screen instead of a white page.
- **Browser Tracing:** Tracks page loads and navigation performance.
- **Session Replay:** Records user sessions (video-like playback) to debug issues (10% sampling).

### **Error Boundary:**
Located in `Frontend/src/main.jsx`. Wraps `<App />`.

**Fallback Component:**
`Frontend/src/components/ErrorFallback.jsx` - Displays a polished error message and "Refresh Page" button.

---

## 🔑 **Environment Variables**

### **Backend (.env):**
```env
SENTRY_DSN=your_backend_dsn_here
NODE_ENV=production  # Set to 'production' for cleaner stack traces
```

### **Frontend (.env):**
```env
VITE_SENTRY_DSN=your_frontend_dsn_here
VITE_ENV=production
```

---

## 🚀 **Testing Sentry**

### **Backend Test:**
Trigger an error in any route:
```javascript
app.get('/debug-sentry', function mainHandler(req, res) {
  throw new Error('My first Sentry error!');
});
```

### **Frontend Test:**
Create a component that throws an error:
```javascript
const BreakApp = () => {
    throw new Error('React Error Test')
}
```

---

## 📊 **Dashboard**

Visit your [Sentry Dashboard](https://sentry.io) to:
1. View active issues
2. Analyze performance transactions
3. Watch session replays
4. Configure alerts (Slack/Email)

---

**Next Steps:**
- Configure Alert Rules in Sentry UI (e.g., notify on >10 errors/hour)
- Upload Source Maps for better stack traces (optional, requires additional build config)
