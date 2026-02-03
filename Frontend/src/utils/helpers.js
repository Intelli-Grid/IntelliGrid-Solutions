import { clsx } from 'clsx'

/**
 * Utility function to merge class names
 */
export function cn(...inputs) {
    return clsx(inputs)
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num)
}

/**
 * Format date to readable string
 */
export function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date(date))
}

/**
 * Truncate text to specified length
 */
export function truncate(text, length = 100) {
    if (!text || text.length <= length) return text
    return text.slice(0, length) + '...'
}

/**
 * Debounce function
 */
export function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout)
            func(...args)
        }
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

/**
 * Get initials from name
 */
export function getInitials(name) {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Generate slug from text
 */
export function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch (err) {
        console.error('Failed to copy:', err)
        return false
    }
}

/**
 * Check if user is premium
 */
export function isPremiumUser(user) {
    return user?.subscription?.status === 'active' && user?.subscription?.plan !== 'free'
}

/**
 * Get pricing display
 */
export function getPricingDisplay(pricing) {
    if (!pricing) return 'Free'
    if (pricing.type === 'free') return 'Free'
    if (pricing.type === 'freemium') return 'Freemium'
    if (pricing.type === 'paid') {
        if (pricing.price) return `$${pricing.price}`
        return 'Paid'
    }
    return 'Contact for pricing'
}
