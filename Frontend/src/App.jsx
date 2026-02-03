import { Routes, Route } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'

// Layout
import Layout from './components/layout/Layout'

// Pages
import HomePage from './pages/HomePage'
import ToolsPage from './pages/ToolsPage'
import ToolDetailsPage from './pages/ToolDetailsPage'
import SearchPage from './pages/SearchPage'
import CategoryPage from './pages/CategoryPage'
import DashboardPage from './pages/DashboardPage'
import PricingPage from './pages/PricingPage'
import PaymentSuccessPage from './pages/PaymentSuccessPage'
import AdminPage from './pages/AdminPage'

function App() {
    return (
        <Layout>
            <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/tools" element={<ToolsPage />} />
                <Route path="/tools/:slug" element={<ToolDetailsPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/pricing" element={<PricingPage />} />

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
            </Routes>
        </Layout>
    )
}

export default App
