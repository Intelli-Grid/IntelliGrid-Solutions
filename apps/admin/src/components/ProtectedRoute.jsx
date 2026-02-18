
import { useUser, useClerk } from '@clerk/clerk-react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

// Role hierarchy levels — higher = more access
// Default minimum for ADMIN APP is MODERATOR (level 2)
const ROLE_LEVELS = {
    'user': 1, 'premium': 1, 'admin': 4,
    'USER': 1, 'MODERATOR': 2, 'TRUSTED_OPERATOR': 3, 'SUPERADMIN': 4,
}

const getRoleLevel = (role) => ROLE_LEVELS[role] || 0

const ProtectedRoute = ({ children, requiredRole = 'MODERATOR' }) => {
    const { user, isLoaded, isSignedIn } = useUser()
    const { redirectToSignIn } = useClerk()
    const location = useLocation()

    // Still loading Clerk session
    if (!isLoaded) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0f1117] text-slate-400">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        )
    }

    // Not signed in → redirect to sign-in on main site (or dedicated admin login if configured)
    if (!isSignedIn) {
        // Redirect to main site login, with callback to here
        // Ideally handled by Clerk middleware config, but frontend safeguard is good
        // Use window.location for cross-domain redirect if needed, otherwise navigate
        // For development/same domain, navigate works if router context spans.
        // But since we are likely on a subdomain, redirect to main site login URL
        // window.location.href = `https://intelligrid.online/sign-in?redirect_url=${window.location.href}`
        // simplified: Just use Clerk's internal redirect logic or fallback
        // Since we share Clerk session, <RedirectToSignIn /> component also works if configured
        return <Navigate to="/" replace /> // For now, redirect to root which will trigger sign-in flow via Clerk
    }

    // Role check
    const userRole = user?.publicMetadata?.role || 'USER'
    const userLevel = getRoleLevel(userRole)
    const requiredLevel = getRoleLevel(requiredRole)

    if (userLevel < requiredLevel) {
        // Logged in but insufficient role → redirect to user dashboard on main site
        window.location.href = 'https://intelligrid.online/dashboard'
        return null
    }

    return children
}

export default ProtectedRoute
