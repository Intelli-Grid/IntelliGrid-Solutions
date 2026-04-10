/**
 * nudgeConfigs.js
 *
 * Defines all upgrade nudge triggers and their content.
 * Each config is keyed by a machine-readable errorCode returned by the API,
 * or by a named trigger string used internally by the frontend.
 *
 * The NudgeContext reads from this file — no other file needs to know the copy.
 */

export const NUDGE_CONFIGS = {

    // ── API error codes → nudge content ──────────────────────────────────────

    FAVORITES_LIMIT_REACHED: {
        trigger: 'FAVORITES_LIMIT_REACHED',
        title: 'You\'ve hit your 10 favourites limit',
        body: 'Pro users can save unlimited tools. Upgrade to keep building your perfect AI stack.',
        ctaLabel: 'Upgrade to Pro',
        ctaHref: '/pricing',
        dismissible: true,
        icon: '⭐',
        urgency: 'medium',
    },

    COLLECTIONS_LIMIT_REACHED: {
        trigger: 'COLLECTIONS_LIMIT_REACHED',
        title: '2-collection limit reached',
        body: 'Organise your tools into unlimited collections with Pro — by project, client, or use case.',
        ctaLabel: 'Upgrade to Pro',
        ctaHref: '/pricing',
        dismissible: true,
        icon: '📁',
        urgency: 'medium',
    },

    PRO_FEATURE_REQUIRED: {
        trigger: 'PRO_FEATURE_REQUIRED',
        title: 'This is a Pro feature',
        body: 'Start your 14-day free trial to unlock AI Stack Advisor, unlimited saves, and more.',
        ctaLabel: 'Start Free Trial',
        ctaHref: '/pricing',
        dismissible: true,
        icon: '⚡',
        urgency: 'high',
    },

    // ── Internal (UI-triggered) nudges ────────────────────────────────────────

    DEEP_BROWSER: {
        trigger: 'DEEP_BROWSER',
        title: '🔥 You\'ve explored 5 tools today',
        body: 'Save them all with one click. Pro users never lose track of a great tool — start free, no card needed.',
        ctaLabel: 'Start Free Trial',
        ctaHref: '/pricing',
        dismissible: true,
        icon: '📚',
        urgency: 'medium',
    },

    LAUNCH_DISCOUNT: {
        trigger: 'LAUNCH_DISCOUNT',
        title: '🎁 Launch Offer — 40% off Pro',
        body: 'We\'ve just launched. First 100 subscribers get Pro at $6.67/mo forever. 67 spots remaining.',
        ctaLabel: 'Claim Launch Price',
        ctaHref: '/pricing',
        dismissible: true,
        icon: '🏷️',
        urgency: 'high',
    },

    SEARCH_REPEAT: {
        trigger: 'SEARCH_REPEAT',
        title: 'Searching a lot?',
        body: 'Pro users get advanced filters so you find the right tool in one search. Save 20 min/week.',
        ctaLabel: 'See Pro Filters',
        ctaHref: '/pricing',
        dismissible: true,
        icon: '🔍',
        urgency: 'low',
    },

    COMPARE_LIMIT: {
        trigger: 'COMPARE_LIMIT',
        title: 'Compare more tools at once',
        body: 'Free plan compares 2 tools. Upgrade to Pro to compare up to 5 side-by-side.',
        ctaLabel: 'Upgrade',
        ctaHref: '/pricing',
        dismissible: true,
        icon: '⚖️',
        urgency: 'low',
    },

    TRIAL_EXPIRING_SOON: {
        trigger: 'TRIAL_EXPIRING_SOON',
        title: 'Your trial ends soon',
        body: 'Keep unlimited saves, collections, and AI advisor access with Pro at $6.67/mo annually.',
        ctaLabel: 'Upgrade Now — Keep Everything',
        ctaHref: '/pricing',
        dismissible: true,
        icon: '⏰',
        urgency: 'high',
    },

    EXPORT_COLLECTION: {
        trigger: 'EXPORT_COLLECTION',
        title: 'Export your collection',
        body: 'Pro users can export collections as CSV or JSON — great for sharing with your team.',
        ctaLabel: 'Unlock Export',
        ctaHref: '/pricing',
        dismissible: true,
        icon: '📤',
        urgency: 'low',
    },
}
