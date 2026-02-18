import { useUser } from '@clerk/clerk-react'
import { Navigate, useLocation } from 'react-router-dom'
import LoadingSpinner from '../common/LoadingSpinner'

/**
 * Role hierarchy levels — higher = more access
 * Supports both legacy roles and new RBAC roles
 */
const ROLE_LEVELS = {
    // Legacy roles (backward compatible)
    'user': 1,
    'premium': 1,
    'admin': 4,
    // New RBAC roles
    'USER': 1,
    'MODERATOR': 2,
    'TRUSTED_OPERATOR': 3,
    'SUPERADMIN': 4,
}

const getRoleLevel = (role) => ROLE_LEVELS[role] || 0

/**
 * ProtectedRoute — wraps routes that require authentication and/or a minimum role
 * 
 * Usage:
 *   <ProtectedRoute>                          → requires login only
 *   <ProtectedRoute requiredRole="MODERATOR"> → requires MODERATOR or above
 *   <ProtectedRoute requiredRole="SUPERADMIN">→ requires SUPERADMIN only
 */
const ProtectedRoute = ({ children, requiredRole = null }) => {
    const { user, isLoaded, isSignedIn } = useUser()
    const location = useLocation()

    // Still loading Clerk session
    if (!isLoaded) {
        return (
            <div className="flex h-screen items-center justify-center">
                <LoadingSpinner />
            </div>
        )
    }

    // Not signed in → redirect to sign-in, preserving intended destination
    if (!isSignedIn) {
        return <Navigate to="/sign-in" state={{ from: location }} replace />
    }

    // Role check (if a role is required)
    if (requiredRole) {
        const userRole = user?.publicMetadata?.role || 'USER'
        const userLevel = getRoleLevel(userRole)
        const requiredLevel = getRoleLevel(requiredRole)

        if (userLevel < requiredLevel) {
            // Silently redirect — don't reveal that the route exists
            return <Navigate to="/dashboard" replace />
        }
    }

    return children
}

export default ProtectedRoute
