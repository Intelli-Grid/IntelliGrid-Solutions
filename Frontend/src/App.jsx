import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import LoadingSpinner from './components/common/LoadingSpinner'

// Layout
import Layout from './components/layout/Layout'

// Auth
import ProtectedRoute from './components/auth/ProtectedRoute'

// Components
import CookieConsent from './components/CookieConsent'

// Lazy Load Pages — Public
const HomePage = lazy(() => import('./pages/HomePage'))
const ToolsPage = lazy(() => import('./pages/ToolsPage'))
const ToolDetailsPage = lazy(() => import('./pages/ToolDetailsPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'))
const CollectionDetailsPage = lazy(() => import('./pages/CollectionDetailsPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'))
const PaymentCancelPage = lazy(() => import('./pages/PaymentCancelPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'))
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage'))
const FAQPage = lazy(() => import('./pages/FAQPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

// Lazy Load Pages — Protected (User)
const DashboardPage = lazy(() => import('./pages/DashboardPage'))

// Lazy Load Pages — Protected (Admin: MODERATOR+)
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
                        {/* ── Public Routes ─────────────────────────────── */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/tools" element={<ToolsPage />} />
                        <Route path="/tools/:slug" element={<ToolDetailsPage />} />
                        <Route path="/collections/:idOrSlug" element={<CollectionDetailsPage />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/category/:slug" element={<CategoryPage />} />
                        <Route path="/compare/:slugs" element={<ComparisonPage />} />
                        <Route path="/pricing" element={<PricingPage />} />

                        {/* ── Legal Routes ──────────────────────────────── */}
                        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                        <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                        <Route path="/refund-policy" element={<RefundPolicyPage />} />
                        <Route path="/faq" element={<FAQPage />} />

                        {/* ── Payment Routes ────────────────────────────── */}
                        <Route path="/payment/success" element={<PaymentSuccessPage />} />
                        <Route path="/payment/cancel" element={<PaymentCancelPage />} />

                        {/* ── Protected: Any logged-in user ─────────────── */}
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <DashboardPage />
                                </ProtectedRoute>
                            }
                        />

                        {/* ── Protected: MODERATOR or above ─────────────── */}
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute requiredRole="MODERATOR">
                                    <AdminPage />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/revenue"
                            element={
                                <ProtectedRoute requiredRole="MODERATOR">
                                    <RevenueDashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/health"
                            element={
                                <ProtectedRoute requiredRole="MODERATOR">
                                    <SystemHealthPage />
                                </ProtectedRoute>
                            }
                        />

                        {/* ── Catch-all ─────────────────────────────────── */}
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
