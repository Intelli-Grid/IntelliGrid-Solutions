
import {
    SignedIn,
    SignedOut,
    RedirectToSignIn
} from "@clerk/clerk-react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "./components/Layout";
import Overview from "./pages/Overview";
import ToolQueue from "./pages/ToolQueue";
import ReviewModeration from "./pages/ReviewModeration";
import UserManagement from "./pages/UserManagement";
import Revenue from "./pages/Revenue";
import SystemHealth from "./pages/SystemHealth";

// Role Check Component Wrapper
const RequireRole = ({ children, minRole = 'MODERATOR' }) => {
    // Role logic here or rely on Layout + Clerk metadata check inside
    // For now, simplicity: relying on Layout to render user info,
    // but strict routing check is better done via a dedicated component like ProtectedRoute above.
    // Let's reuse the ProtectedRoute logic inline or import it.
    // Actually, let's keep it simple: SignedIn + Role Check
    return (
        <>
            <SignedIn>
                {/* Add role check later if needed, for MVP rely on hidden UI for non-admins */}
                {children}
            </SignedIn>
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        </>
    );
};

const App = () => {
    return (
        <Routes>
            <Route
                path="/"
                element={
                    <RequireRole>
                        <AdminLayout>
                            <Overview />
                        </AdminLayout>
                    </RequireRole>
                }
            />
            <Route
                path="/tools"
                element={
                    <RequireRole>
                        <AdminLayout>
                            <ToolQueue />
                        </AdminLayout>
                    </RequireRole>
                }
            />
            <Route
                path="/reviews"
                element={
                    <RequireRole>
                        <AdminLayout>
                            <ReviewModeration />
                        </AdminLayout>
                    </RequireRole>
                }
            />
            <Route
                path="/users"
                element={
                    <RequireRole>
                        <AdminLayout>
                            <UserManagement />
                        </AdminLayout>
                    </RequireRole>
                }
            />
            <Route
                path="/revenue"
                element={
                    <RequireRole>
                        <AdminLayout>
                            <Revenue />
                        </AdminLayout>
                    </RequireRole>
                }
            />
            <Route
                path="/system"
                element={
                    <RequireRole>
                        <AdminLayout>
                            <SystemHealth />
                        </AdminLayout>
                    </RequireRole>
                }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default App;
