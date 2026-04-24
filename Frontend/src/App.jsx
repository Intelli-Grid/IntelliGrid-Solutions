import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import LoadingSpinner from './components/common/LoadingSpinner'

// Layout
import Layout from './components/layout/Layout'

// Auth
import ProtectedRoute from './components/auth/ProtectedRoute'

// Components
import CookieConsent from './components/CookieConsent'
import OnboardingDrawer from './components/common/OnboardingDrawer'
import FeedbackWidget from './components/common/FeedbackWidget'

// Auth Pages — Dedicated Clerk sign-in/sign-up (required by Clerk Dashboard "application domain" path setting)
// Lazy-loaded like all other pages to keep the initial bundle lean
const SignInPage = lazy(() => import('./pages/SignInPage'))
const SignUpPage = lazy(() => import('./pages/SignUpPage'))

// Lazy Load Pages — Public
const HomePage = lazy(() => import('./pages/HomePage'))
const ToolsPage = lazy(() => import('./pages/ToolsPage'))
const ToolDetailsPage = lazy(() => import('./pages/ToolDetailsPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'))
const CollectionDetailsPage = lazy(() => import('./pages/CollectionDetailsPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
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
const EmbedPage = lazy(() => import('./pages/EmbedPage'))
const IndustryPage = lazy(() => import('./pages/IndustryPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))

// Lazy Load Pages — Protected (User)
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AIStackAdvisorPage = lazy(() => import('./pages/AIStackAdvisorPage'))

// Lazy Load Pages — Protected (Admin: MODERATOR+)
const AdminPage = lazy(() => import('./pages/AdminPage'))
const RevenueDashboard = lazy(() => import('./pages/admin/RevenueDashboard'))
const SystemHealthPage = lazy(() => import('./pages/admin/SystemHealthPage'))
const AdminActivityPage = lazy(() => import('./pages/admin/AdminActivityPage'))
const VerificationSprintPage = lazy(() => import('./pages/VerificationSprintPage'))

// Analytics — logPageView tracks route changes; initGA is called ONLY from CookieConsent
import { logPageView } from './utils/analytics'
import ScrollToTop from './components/common/ScrollToTop'

function App() {
    const location = useLocation()

    // GA4 is NOT initialized here — it's initialized in CookieConsent.jsx
    // after the user explicitly accepts cookies (GDPR compliance)

    useEffect(() => {
        logPageView(location.pathname + location.search)
    }, [location])

    return (
        <>
        <ScrollToTop />
        <Routes>
            {/* ── Clerk Auth Pages (no site layout) ─────────── */}
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />

            {/* ── Embed widget (no layout — for iframe use) ──── */}
            <Route
                path="/embed/:toolSlug"
                element={
                    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}><LoadingSpinner /></div>}>
                        <EmbedPage />
                    </Suspense>
                }
            />

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
                            <Route path="/about" element={<AboutPage />} />
                            <Route path="/unsubscribe" element={<UnsubscribePage />} />
                            <Route path="/submit" element={<SubmitToolPage />} />
                            <Route path="/blog" element={<BlogPage />} />
                            <Route path="/blog/:slug" element={<BlogPostPage />} />
                            <Route path="/newsletter" element={<NewsletterPage />} />
                            <Route path="/alternatives/:toolName" element={<AlternativesPage />} />
                            <Route path="/best-tools/:role" element={<BestToolsForPage />} />
                            <Route path="/best-ai-tools-for/:useCase" element={<BestToolsForPage />} />
                            <Route path="/industry/:tag" element={<IndustryPage />} />

                            {/* ── Payment / Checkout Routes ──────────────────── */}
                            <Route
                                path="/checkout"
                                element={
                                    <ProtectedRoute>
                                        <CheckoutPage />
                                    </ProtectedRoute>
                                }
                            />
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
                            <Route
                                path="/admin/activity"
                                element={
                                    <ProtectedRoute requiredRole="MODERATOR">
                                        <AdminActivityPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/verify-sprint"
                                element={
                                    <ProtectedRoute requiredRole="MODERATOR">
                                        <VerificationSprintPage />
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
                <OnboardingDrawer />
                <FeedbackWidget />
            </>}
            />
        </Routes>
        </>
    )
}

export default App
