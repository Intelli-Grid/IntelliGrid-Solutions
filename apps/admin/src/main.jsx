import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

// Use the same Clerk publishable key as the main app
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_test_bW9kZXN0LXJhdHRsZXItNjkuY2xlcmsuYWNjb3VudHMuZGV2JA'

if (!PUBLISHABLE_KEY) {
    throw new Error("Missing Publishable Key")
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
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
