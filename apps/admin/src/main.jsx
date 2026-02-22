import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import ClerkTokenBridge from './components/ClerkTokenBridge.jsx'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_bW9kZXN0LXJhdHRsZXItNjkuY2xlcmsuYWNjb3VudHMuZGV2JA'

if (!PUBLISHABLE_KEY) {
    throw new Error("Missing Publishable Key")
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ClerkProvider
            publishableKey={PUBLISHABLE_KEY}
            signInUrl="https://intelligrid.online/sign-in"
            signUpUrl="https://intelligrid.online/sign-up"
            afterSignOutUrl="https://admin.intelligrid.online"
            domain="intelligrid.online"
            isSatellite={true}
        >
            {/* Bridge: registers Clerk's getToken into the api.js interceptor */}
            <ClerkTokenBridge />
            <BrowserRouter>
                <App />
                <Toaster
                    position="bottom-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#334155',
                            color: '#fff',
                            border: '1px solid #475569',
                        },
                    }}
                />
            </BrowserRouter>
        </ClerkProvider>
    </StrictMode>,
)
