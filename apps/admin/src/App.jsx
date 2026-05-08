
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./components/Layout";

// Core pages
import Overview from "./pages/Overview";
import ToolQueue from "./pages/ToolQueue";
import ReviewModeration from "./pages/ReviewModeration";
import UserManagement from "./pages/UserManagement";
import Revenue from "./pages/Revenue";
import SystemHealth from "./pages/SystemHealth";

// New pages
import DiscoveryQueue from "./pages/DiscoveryQueue";
import ClaimRequests from "./pages/ClaimRequests";
import FeaturedListings from "./pages/FeaturedListings";
import FeatureFlags from "./pages/FeatureFlags";
import WarRoom from "./pages/WarRoom";

// ── Auth guard — wraps every admin route ──────────────────────────────────────
// Forces sign-in via Clerk for any unauthenticated visitor.
// Role-level enforcement is handled by the backend (requireAdmin middleware).
const RequireAuth = ({ children }) => (
    <>
        <SignedIn>{children}</SignedIn>
        <SignedOut><RedirectToSignIn /></SignedOut>
    </>
);

// ── Route factory — keeps JSX terse ──────────────────────────────────────────
const AdminRoute = ({ path, element: PageComponent }) => (
    <Route
        path={path}
        element={
            <RequireAuth>
                <AdminLayout>
                    <PageComponent />
                </AdminLayout>
            </RequireAuth>
        }
    />
);

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => (
    <Routes>
        {/* ── Dashboard ──────────────────────────────────────────────────── */}
        <AdminRoute path="/"         element={Overview} />

        {/* ── Tool Management ────────────────────────────────────────────── */}
        <AdminRoute path="/tools"     element={ToolQueue} />
        <AdminRoute path="/discovery" element={DiscoveryQueue} />

        {/* ── Content Moderation ─────────────────────────────────────────── */}
        <AdminRoute path="/reviews"   element={ReviewModeration} />
        <AdminRoute path="/claims"    element={ClaimRequests} />

        {/* ── User Management ────────────────────────────────────────────── */}
        <AdminRoute path="/users"     element={UserManagement} />

        {/* ── Revenue & Growth ───────────────────────────────────────────── */}
        <AdminRoute path="/revenue"   element={Revenue} />
        <AdminRoute path="/featured"  element={FeaturedListings} />

        {/* ── Platform Control ───────────────────────────────────────────── */}
        <AdminRoute path="/war-room" element={WarRoom} />
        <AdminRoute path="/flags"     element={FeatureFlags} />
        <AdminRoute path="/system"    element={SystemHealth} />

        {/* ── Catch-all ──────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
);

export default App;
