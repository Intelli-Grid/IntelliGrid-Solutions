import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import LoadingSpinner from './components/common/LoadingSpinner'

// Layout
import Layout from './components/layout/Layout'

// Auth
import ProtectedRoute from './components/auth/ProtectedRoute'

// Components
import CookieConsent from './components/CookieConsent'

// Auth Pages — Dedicated Clerk sign-in/sign-up (required by Clerk Dashboard "application domain" path setting)
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'

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
const UnsubscribePage = lazy(() => import('./pages/UnsubscribePage'))
const SubmitToolPage = lazy(() => import('./pages/SubmitToolPage'))
const BlogPage = lazy(() => import('./pages/BlogPage'))
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'))
const AlternativesPage = lazy(() => import('./pages/AlternativesPage'))
const BestToolsForPage = lazy(() => import('./pages/BestToolsForPage'))
const NewsletterPage = lazy(() => import('./pages/NewsletterPage'))

// Lazy Load Pages — Protected (User)
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AIStackAdvisorPage = lazy(() => import('./pages/AIStackAdvisorPage'))

// Lazy Load Pages — Protected (Admin: MODERATOR+)
const AdminPage = lazy(() => import('./pages/AdminPage'))
const RevenueDashboard = lazy(() => import('./pages/admin/RevenueDashboard'))
const SystemHealthPage = lazy(() => import('./pages/admin/SystemHealthPage'))

// Analytics — logPageView tracks route changes; initGA is called ONLY from CookieConsent
import { logPageView } from './utils/analytics'


function App() {
    const location = useLocation()

    // GA4 is NOT initialized here — it's initialized in CookieConsent.jsx
    // after the user explicitly accepts cookies (GDPR compliance)

    useEffect(() => {
        logPageView(location.pathname + location.search)
    }, [location])

    return (
        <Routes>
            {/* ── Clerk Auth Pages (no site layout) ─────────── */}
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />

            {/* ── All other routes wrapped in site Layout ──── */}
            <Route path="*" element={<>
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
                            <Route path="/unsubscribe" element={<UnsubscribePage />} />
                            <Route path="/submit" element={<SubmitToolPage />} />
                            <Route path="/blog" element={<BlogPage />} />
                            <Route path="/blog/:slug" element={<BlogPostPage />} />
                            <Route path="/newsletter" element={<NewsletterPage />} />
                            <Route path="/alternatives/:toolSlug" element={<AlternativesPage />} />
                            <Route path="/best-tools/:role" element={<BestToolsForPage />} />

                            {/* ── Payment Routes ────────────────────────────── */}
                            <Route
                                path="/payment/success"
                                element={
                                    <ProtectedRoute>
                                        <PaymentSuccessPage />
                                    </ProtectedRoute>
                                }
                            />
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
                            <Route
                                path="/ai-stack-advisor"
                                element={
                                    <ProtectedRoute>
                                        <AIStackAdvisorPage />
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
            </>}
            />
        </Routes>
    )
}

export default App
