import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import LoadingSpinner from './components/common/LoadingSpinner'

// Layout
import Layout from './components/layout/Layout'

// Components
import CookieConsent from './components/CookieConsent'

// Lazy Load Pages
const HomePage = lazy(() => import('./pages/HomePage'))
const ToolsPage = lazy(() => import('./pages/ToolsPage'))
const ToolDetailsPage = lazy(() => import('./pages/ToolDetailsPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'))
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage'))
const FAQPage = lazy(() => import('./pages/FAQPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

// Protected Pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const RevenueDashboard = lazy(() => import('./pages/admin/RevenueDashboard'))
const SystemHealthPage = lazy(() => import('./pages/admin/SystemHealthPage'))

// Analytics
import { initGA, logPageView } from './utils/analytics'


function App() {
    const location = useLocation()

    useEffect(() => {
        initGA()
    }, [])

    useEffect(() => {
        logPageView(location.pathname + location.search)
    }, [location])

    return (
        <>
            <Layout>
                <Suspense fallback={<div className="flex h-screen items-center justify-center"><LoadingSpinner /></div>}>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/tools" element={<ToolsPage />} />
                        <Route path="/tools/:slug" element={<ToolDetailsPage />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/category/:slug" element={<CategoryPage />} />
                        <Route path="/pricing" element={<PricingPage />} />

                        {/* Legal Routes */}
                        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                        <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                        <Route path="/refund-policy" element={<RefundPolicyPage />} />
                        <Route path="/faq" element={<FAQPage />} />

                        {/* Payment Routes */}
                        <Route path="/payment/success" element={<PaymentSuccessPage />} />
                        <Route path="/payment/cancel" element={<PaymentSuccessPage />} />

                        {/* Protected Routes */}
                        <Route
                            path="/dashboard"
                            element={
                                <>
                                    <SignedIn>
                                        <DashboardPage />
                                    </SignedIn>
                                    <SignedOut>
                                        <RedirectToSignIn />
                                    </SignedOut>
                                </>
                            }
                        />

                        <Route
                            path="/admin"
                            element={
                                <>
                                    <SignedIn>
                                        <AdminPage />
                                    </SignedIn>
                                    <SignedOut>
                                        <RedirectToSignIn />
                                    </SignedOut>
                                </>
                            }
                        />

                        <Route
                            path="/admin/revenue"
                            element={
                                <>
                                    <SignedIn>
                                        <RevenueDashboard />
                                    </SignedIn>
                                    <SignedOut>
                                        <RedirectToSignIn />
                                    </SignedOut>
                                </>
                            }
                        />

                        <Route
                            path="/admin/health"
                            element={
                                <>
                                    <SignedIn>
                                        <SystemHealthPage />
                                    </SignedIn>
                                    <SignedOut>
                                        <RedirectToSignIn />
                                    </SignedOut>
                                </>
                            }
                        />

                        {/* Catch-all Route */}
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </Layout>

            {/* Global Components */}
            <CookieConsent />
        </>
    )
}

export default App
