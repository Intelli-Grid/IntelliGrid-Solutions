/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Role Hierarchy (highest to lowest):
 *   SUPERADMIN       → Full access (owner only)
 *   TRUSTED_OPERATOR → AI Agent dashboard access
 *   MODERATOR        → Admin panel (tools/reviews only)
 *   USER             → User dashboard only
 * 
 * Legacy roles (backward compatible):
 *   admin   → treated as SUPERADMIN
 *   premium → treated as USER
 *   user    → treated as USER
 */

import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

// Role hierarchy levels — higher number = more access
export const ROLE_LEVELS = {
    // Legacy roles
    'user': 1,
    'premium': 1,
    'admin': 4,
    // New RBAC roles
    'USER': 1,
    'MODERATOR': 2,
    'TRUSTED_OPERATOR': 3,
    'SUPERADMIN': 4,
}

/**
 * Get the numeric level of a role
 */
export const getRoleLevel = (role) => ROLE_LEVELS[role] || 0

/**
 * Check if a role meets the minimum required level
 */
export const hasMinimumRole = (userRole, requiredRole) => {
    return getRoleLevel(userRole) >= getRoleLevel(requiredRole)
}

/**
 * Middleware: Require one of the specified roles
 * Usage: requireRole('SUPERADMIN', 'MODERATOR')
 */
export const requireRole = (...allowedRoles) => asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw ApiError.unauthorized('Authentication required')
    }

    const userRole = req.user.role

    // Check if user has any of the allowed roles
    const isAllowed = allowedRoles.some(requiredRole => {
        // Exact match OR user's level >= required level
        return userRole === requiredRole || hasMinimumRole(userRole, requiredRole)
    })

    if (!isAllowed) {
        throw ApiError.forbidden(`Access denied. Required: ${allowedRoles.join(' or ')}. Your role: ${userRole}`)
    }

    next()
})

/**
 * Middleware: Require SUPERADMIN or legacy 'admin' role
 */
export const requireSuperAdmin = requireRole('SUPERADMIN')

/**
 * Middleware: Require MODERATOR or above (admin panel access)
 */
export const requireModerator = requireRole('MODERATOR')

/**
 * Middleware: Require TRUSTED_OPERATOR or above (agent dashboard access)
 */
export const requireTrustedOperator = requireRole('TRUSTED_OPERATOR')

/**
 * Helper: Get normalized role name (maps legacy roles to new system)
 */
export const normalizeRole = (role) => {
    const legacyMap = {
        'user': 'USER',
        'premium': 'USER',
        'admin': 'SUPERADMIN',
    }
    return legacyMap[role] || role
}
