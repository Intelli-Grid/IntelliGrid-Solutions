import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    Check, Sparkles, Star, Zap, Users, Shield,
    CreditCard, Clock, Gift, ChevronDown,
} from 'lucide-react'
import { useUser } from '@clerk/clerk-react'
import SEO from '../components/common/SEO'
import { useFlag } from '../hooks/useFeatureFlags'
import { useGeoLocation } from '../hooks/useGeoLocation'
import apiClient from '../services/api'

// ─── Pricing data per currency ─────────────────────────────────────────────────
const PLAN_PRICING = {
    USD: {
        monthly: {
            free:               { price: 0,     display: '$0',    note: 'Free forever',  monthly: null,        savings: null },
            pro_monthly:        { price: 9.99,  display: '$9.99',  note: 'per month',    monthly: null,        savings: null },
            enterprise_monthly: { price: 24.99, display: '$24.99', note: 'per month',    monthly: null,        savings: null },
        },
        annual: {
            free:               { price: 0,      display: '$0',     note: 'Free forever', monthly: null,          savings: null },
            pro_yearly:         { price: 79.99,  display: '$79.99', note: 'per year',     monthly: '$6.67/mo',    savings: 'Save $39.89/yr' },
            enterprise_yearly:  { price: 249.99, display: '$249.99',note: 'per year',     monthly: '$20.83/mo',   savings: 'Save $49.89/yr' },
        },
    },
    INR: {
        monthly: {
            free:               { price: 0,    display: '₹0',      note: 'Free forever', monthly: null,         savings: null },
            pro_monthly:        { price: 999,  display: '₹999',    note: 'per month',    monthly: null,         savings: null },
            enterprise_monthly: { price: 2499, display: '₹2,499',  note: 'per month',    monthly: null,         savings: null },
        },
        annual: {
            free:               { price: 0,     display: '₹0',      note: 'Free forever', monthly: null,           savings: null },
            pro_yearly:         { price: 7999,  display: '₹7,999',  note: 'per year',     monthly: '₹666/mo',       savings: 'Save ₹3,989/yr' },
            enterprise_yearly:  { price: 24999, display: '₹24,999', note: 'per year',     monthly: '₹2,083/mo',     savings: 'Save ₹4,989/yr' },
        },
    },
}

// ─── Plan feature lists ────────────────────────────────────────────────────────
const FEATURES = {
    free: [
        'Browse all 4,000+ AI tools',
        'Save up to 10 favourites',
        'Create up to 2 collections',
        'Basic search filters',
        'Write and read reviews',
        'Submit tools for review',
    ],
    pro: [
        'Everything in Explorer',
        'Unlimited favourites & collections',
        'Advanced search filters',
        'Ad-free experience',
        'Priority in search results',
        'Weekly curated AI digest',
        'Export favourites and collections',
    ],
    enterprise: [
        'Everything in Professional',
        'Team workspace (up to 10 members)',
        'Shared collections and favourites',
        'Bulk export for stakeholder reviews',
        'Verified Business badge on your tools',
        'API access (1,000 calls/month)',
        'Admin dashboard — manage team',
        'Dedicated support (24h SLA)',
    ],
}

// ─── Build the 3-plan array dynamically from billing + currency ────────────────
function buildPlans(billing, currency) {
    const key = billing === 'annual' ? 'annual' : 'monthly'
    const p = PLAN_PRICING[currency][key]
    return [
        {
            id: 'free',
            name: 'Explorer',
            tier: 'free',
            ...p.free,
            description: 'Discover AI tools at your own pace',
            features: FEATURES.free,
            icon: Star,
            cta: 'Continue with Explorer',
            ctaNote: null,
            highlighted: false,
            badge: null,
        },
        {
            id: billing === 'annual' ? 'pro_yearly' : 'pro_monthly',
            name: 'Professional',
            tier: 'pro',
            ...p[billing === 'annual' ? 'pro_yearly' : 'pro_monthly'],
            description: 'For professionals building their AI stack',
            features: FEATURES.pro,
            icon: Zap,
            cta: 'Try Professional Free',
            ctaNote: 'No credit card required · 14-day trial',
            highlighted: true,
            badge: 'Most Popular',
        },
        {
            id: billing === 'annual' ? 'enterprise_yearly' : 'enterprise_monthly',
            name: 'Team',
            tier: 'enterprise',
            ...p[billing === 'annual' ? 'enterprise_yearly' : 'enterprise_monthly'],
            description: 'For teams evaluating AI tools together',
            features: FEATURES.enterprise,
            icon: Users,
            cta: 'Try Team for Free',
            ctaNote: 'No credit card required · 14-day trial',
            highlighted: false,
            badge: null,
        },
    ]
}

// ─── Annual savings label ──────────────────────────────────────────────────────
const ANNUAL_SAVINGS_USD = { pro_yearly: 39.89, enterprise_yearly: 49.89 }
const ANNUAL_SAVINGS_INR = { pro_yearly: 3989,  enterprise_yearly: 4989 }

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQS = [
    {
        q: 'What happens after the free trial?',
        a: "After 14 days, your account moves to the free Explorer plan automatically — no charge. You keep all your data. To keep Pro access, upgrade anytime from your dashboard.",
    },
    {
        q: 'Do I need a credit card for the trial?',
        a: "No. Your 14-day Pro trial starts the moment you create an account. No payment details required.",
    },
    {
        q: 'Can I change plans later?',
        a: "Yes. Upgrade, downgrade, or cancel any time from your dashboard. Changes take effect immediately.",
    },
    {
        q: 'What payment methods do you accept?',
        a: "Indian users can pay via Cashfree — UPI, net banking, credit/debit cards, and wallets in Indian Rupees (INR) with no foreign exchange fees. International users pay via PayPal (credit/debit cards and PayPal balance) in USD. All payments are processed securely.",
    },
    {
        q: 'What about refunds?',
        a: "We offer a 30-day money-back guarantee, no questions asked, for first-time subscribers. Contact us within 30 days of your first payment for a full refund.",
    },
]

export default function PricingPage() {
    const navigate = useNavigate()
    const { isSignedIn } = useUser()
    const annualV2 = useFlag('ANNUAL_PRICING_V2')

    // ── Geo-detection ──────────────────────────────────────────────────────────
    const { isIndia, currency, loading: geoLoading, override: currencyOverride } = useGeoLocation()

    const [billing, setBilling] = useState('annual')
    const [openFaq, setOpenFaq] = useState(null)
    const [timeLeft, setTimeLeft] = useState('')
    // Real weekly trial count — fetched from backend, falls back gracefully
    const [weeklyTrials, setWeeklyTrials] = useState(null)

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date()
            const midnight = new Date()
            midnight.setHours(24, 0, 0, 0)
            const diff = midnight - now
            const hours = Math.floor(diff / 3600000)
            const mins = Math.floor((diff % 3600000) / 60000)
            setTimeLeft(`${hours}h ${mins}m`)
        }
        updateTimer()
        const interval = setInterval(updateTimer, 60000)
        return () => clearInterval(interval)
    }, [])

    // Fetch real weekly trial signups from backend
    // Endpoint: GET /api/v1/platform-stats → res.data.stats.weeklyTrials
    useEffect(() => {
        apiClient.get('/platform-stats')
            .then(res => {
                const weeklyCount = res.data?.stats?.weeklyTrials
                if (typeof weeklyCount === 'number' && weeklyCount > 0) {
                    setWeeklyTrials(weeklyCount)
                }
            })
            .catch(() => { /* non-fatal — badge simply hidden if fetch fails */ })
    }, [])

    // Build plans from current billing + currency
    const plans = buildPlans(billing, currency)

    // Mobile sort — highlighted (Pro) card first
    const mobileSortedPlans = [...plans].sort((a, b) => {
        if (a.highlighted) return -1
        if (b.highlighted) return 1
        return 0
    })

    const handleSelectPlan = (planId) => {
        if (planId === 'free') {
            if (!isSignedIn) {
                window.location.href = '/sign-up'
            } else {
                navigate('/dashboard')
            }
            return
        }

        if (!isSignedIn) {
            window.location.href = `/sign-in?redirect_url=/checkout?plan=${planId}`
            return
        }

        // Persist plan + currency to sessionStorage for checkout page fallback
        sessionStorage.setItem('checkoutPlan', planId)
        sessionStorage.setItem('checkoutBilling', billing)
        sessionStorage.setItem('checkoutCurrency', currency)

        // Pass via router state (primary) — checkout reads this first
        navigate('/checkout', {
            state: {
                planId,
                billing,
                currency,
                // Pre-select the correct gateway based on user's country
                defaultPaymentMethod: isIndia ? 'cashfree' : 'paypal',
            },
        })
    }

    const annualSavings = currency === 'INR' ? ANNUAL_SAVINGS_INR : ANNUAL_SAVINGS_USD

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space">
            <SEO
                title="Pricing — IntelliGrid | 14-Day Free Trial 2026"
                description="Start with a 14-day free Pro trial. Explore 4,000+ AI tools with unlimited saves, advanced filters, and collections. Upgrade for $9.99/month or $79.99/year."
                keywords="AI tools pricing, IntelliGrid Pro, AI directory subscription, premium AI tools, free trial"
                canonicalUrl="https://www.intelligrid.online/pricing"
            />

            <div className="container mx-auto px-6 pt-12 pb-20">

                {/* ── Hero ── */}
                <div className="mx-auto mb-8 max-w-2xl text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-5">
                        <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
                        <span className="text-xs font-medium text-white">14-day free trial · No credit card required</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 leading-tight">
                        Choose Your Plan
                    </h1>
                    <p className="text-lg text-gray-400">
                        Every account starts with a full 14-day Pro trial.
                    </p>
                </div>

                {/* ── Billing Toggle ── */}
                <div className="flex items-center justify-center gap-4 mb-5">
                    <button
                        onClick={() => setBilling('monthly')}
                        className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${billing === 'monthly' ? 'text-white bg-white/10' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Monthly
                    </button>

                    <button
                        id="billing-toggle"
                        onClick={() => setBilling(b => b === 'annual' ? 'monthly' : 'annual')}
                        className="relative flex items-center"
                        aria-label="Toggle billing period"
                    >
                        <div className={`w-12 h-6 rounded-full transition-all duration-300 ${billing === 'annual' ? 'bg-accent-purple' : 'bg-white/20'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${billing === 'annual' ? 'left-7' : 'left-1'}`} />
                        </div>
                    </button>

                    <button
                        onClick={() => setBilling('annual')}
                        className={`text-sm font-medium transition-colors px-3 py-1.5 rounded-lg flex items-center gap-2 ${billing === 'annual' ? 'text-white bg-white/10' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Annual
                        <span className="px-2 py-0.5 bg-accent-emerald/20 text-accent-emerald text-xs font-bold rounded-full border border-accent-emerald/30">
                            {annualV2 ? '4 Months FREE' : 'Save 33%'}
                        </span>
                    </button>
                </div>

                {/* ── Annual V2 nudge ── */}
                {annualV2 && billing === 'monthly' && (
                    <div className="mx-auto mb-5 max-w-xl">
                        <button
                            onClick={() => setBilling('annual')}
                            className="w-full rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 px-5 py-3 text-sm text-emerald-300 hover:border-emerald-500/70 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2"
                        >
                            <Gift size={14} />
                            Switch to Annual and save {currency === 'INR' ? '₹3,989' : '$39.89'} — that&apos;s 4 months free on Pro
                        </button>
                    </div>
                )}

                {/* ── Launch Offer Countdown ── */}
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-6 mb-8 text-center max-w-2xl mx-auto backdrop-blur-sm">
                    <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3">
                        <Clock className="w-3.5 h-3.5" /> Launch Offer Ends in {timeLeft}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Lock in 40% Off For Life.</h2>
                    <p className="text-sm text-gray-400">First subscribers lock in launch pricing — current rate stays yours as long as you remain subscribed.</p>
                </div>

                {/* ── Currency indicator ── */}
                {!geoLoading && (
                    <div className="flex items-center justify-center mb-6">
                        {isIndia ? (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-full">
                                <span className="text-sm">🇮🇳</span>
                                <span className="text-xs font-medium text-orange-300">
                                    Showing prices in Indian Rupees (INR)
                                </span>
                                <button
                                    onClick={() => currencyOverride('US')}
                                    className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors ml-1"
                                >
                                    View in USD
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => currencyOverride('IN')}
                                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                            >
                                🇮🇳 View prices in INR
                            </button>
                        )}
                    </div>
                )}

                {/* ── Social proof strip ── */}
                <div className="flex items-center justify-center gap-5 py-3 mb-8 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span><strong className="text-white">4.9/5</strong> avg rating</span>
                    </div>
                    <div className="w-px h-4 bg-white/10 hidden sm:block" />
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Zap className="w-3.5 h-3.5 text-accent-cyan" />
                        <span><strong className="text-white">4,000+</strong> AI tools</span>
                    </div>
                    <div className="w-px h-4 bg-white/10 hidden sm:block" />
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Users className="w-3.5 h-3.5 text-accent-purple" />
                        <span><strong className="text-white">Loved</strong> by builders worldwide</span>
                    </div>
                </div>

                {/* ── Daily Deal Strip ── */}
                <div className="mx-auto max-w-xl mb-6">
                    <div className="flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                        <span className="text-amber-400 text-sm">⏳</span>
                        <p className="text-sm text-gray-300">
                            <span className="text-amber-400 font-bold">Launch pricing</span> resets in{' '}
                            <span className="font-mono text-amber-400 font-bold">{timeLeft}</span>
                            {' '}— current rates locked for active subscribers
                        </p>
                    </div>
                </div>

                {/* ── Pricing Cards ── */}
                <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3 mb-16 items-stretch">
                    {mobileSortedPlans.map((plan) => {
                        const Icon = plan.icon
                        const desktopOrder = plan.id === 'free'
                            ? 'lg:order-1'
                            : plan.highlighted
                                ? 'lg:order-2'
                                : 'lg:order-3'
                        return (
                            <div
                                key={plan.id}
                                className={`
                                    group relative flex flex-col rounded-2xl border p-8 transition-all duration-300
                                    ${desktopOrder}
                                    ${plan.highlighted
                                        ? 'border-accent-purple bg-gradient-to-br from-accent-purple/10 via-deep-space to-accent-cyan/5 shadow-2xl shadow-accent-purple/20 lg:scale-[1.03] lg:z-10'
                                        : 'border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20 hover:-translate-y-1'
                                    }
                                `}
                                style={plan.highlighted ? { marginTop: '-0.5rem', marginBottom: '-0.5rem' } : {}}
                            >
                                {/* Badge — Most Popular */}
                                {plan.badge && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-lg bg-gradient-to-r from-accent-purple to-accent-cyan whitespace-nowrap">
                                        ✦ {plan.badge}
                                    </div>
                                )}

                                {/* Badge — Savings */}
                                {plan.savings && (
                                    <div className={`absolute -top-3 -right-3 rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg ${annualV2
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse shadow-emerald-500/30'
                                        : 'bg-gradient-to-r from-accent-emerald to-accent-cyan'
                                        }`}>
                                        {annualV2 && plan.id === 'pro_yearly'
                                            ? '4 Months FREE 🎁'
                                            : plan.savings}
                                    </div>
                                )}

                                {/* Icon */}
                                <div className={`mb-5 inline-flex w-fit p-3 rounded-xl ${plan.highlighted
                                    ? 'bg-gradient-to-r from-accent-purple to-accent-cyan'
                                    : 'bg-white/10'
                                    }`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>

                                {/* Name + description */}
                                <div className="mb-4">
                                    <h3 className="mb-1 text-xl font-bold text-white">{plan.name}</h3>
                                    <p className="text-sm text-gray-400">{plan.description}</p>
                                </div>

                                {/* Price */}
                                <div className="mb-6 pb-6 border-b border-white/10">
                                    <div className="flex items-end gap-2 flex-wrap">
                                        <span className="text-4xl font-extrabold text-white tracking-tight">{plan.display}</span>
                                        {plan.price > 0 && (
                                            <span className="text-gray-400 text-sm mb-1">{plan.note}</span>
                                        )}
                                    </div>
                                    {plan.monthly && billing === 'annual' && (
                                        <p className="text-sm text-accent-emerald mt-1 font-medium">
                                            ≈ {plan.monthly} when billed annually
                                        </p>
                                    )}
                                    {annualV2 && billing === 'annual' && annualSavings[plan.id] && (
                                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                                            <Gift size={10} />
                                            You save {currency === 'INR' ? '₹' : '$'}{annualSavings[plan.id].toLocaleString()}/year
                                        </div>
                                    )}
                                </div>

                                {/* Features */}
                                <ul className="mb-8 space-y-3 flex-1">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${plan.highlighted ? 'bg-accent-purple/30' : 'bg-white/10'}`}>
                                                <Check className={`w-2.5 h-2.5 ${plan.highlighted ? 'text-accent-cyan' : 'text-accent-emerald'}`} />
                                            </span>
                                            <span className="text-sm text-gray-300 leading-snug">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA */}
                                <div className="mt-auto">
                                    {plan.highlighted && weeklyTrials !== null && (
                                        <div className="mb-3 py-2 px-3 rounded-lg bg-white/4 border border-white/6 text-center">
                                            <p className="text-xs text-gray-400">
                                                🔥 <span className="text-white font-semibold">{weeklyTrials} people</span> started their trial this week
                                            </p>
                                        </div>
                                    )}
                                    <button
                                        id={`cta-${plan.id}`}
                                        onClick={() => handleSelectPlan(plan.id)}
                                        className={`
                                            w-full rounded-xl py-3.5 text-sm font-bold tracking-wide transition-all duration-200
                                            ${plan.highlighted
                                                ? 'bg-gradient-to-r from-accent-cyan to-accent-purple text-white hover:shadow-lg hover:shadow-accent-purple/30 hover:scale-[1.02]'
                                                : plan.id === 'free'
                                                    ? 'border border-white/15 bg-white/5 text-white hover:bg-white/10'
                                                    : 'border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:border-white/30'
                                            }
                                        `}
                                    >
                                        {plan.cta}
                                    </button>
                                    {plan.ctaNote && (
                                        <div className="mt-3 space-y-1.5">
                                            <p className="text-center text-xs text-gray-500">{plan.ctaNote}</p>
                                            {plan.highlighted && (
                                                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600">
                                                    <Shield size={10} className="text-emerald-400" />
                                                    <span>30-day money-back guarantee, no questions asked</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Payment Method Info — based on country ── */}
                <div className="mx-auto max-w-3xl mb-16">
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center mb-4">
                            How you'll pay
                        </p>
                        {!geoLoading && isIndia ? (
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Cashfree — Recommended for India */}
                                <div className="flex-1 flex items-start gap-3 p-4 rounded-xl border border-orange-500/30 bg-orange-500/5">
                                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-lg font-bold text-orange-400">₹</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold text-white">Cashfree</span>
                                            <span className="text-xs font-bold px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-500/20">Recommended</span>
                                        </div>
                                        <p className="text-xs text-gray-400">UPI · Net Banking · Debit/Credit Cards · Wallets</p>
                                        <p className="text-xs text-emerald-400 font-medium mt-1">Pay in INR — no foreign transaction fees</p>
                                    </div>
                                </div>
                                {/* PayPal — Secondary for India */}
                                <div className="flex-1 flex items-start gap-3 p-4 rounded-xl border border-white/10 bg-white/5">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-bold text-blue-400">PP</span>
                                    </div>
                                    <div>
                                        <span className="text-sm font-semibold text-white">PayPal (International)</span>
                                        <p className="text-xs text-gray-400 mt-1">PayPal account or international cards</p>
                                        <p className="text-xs text-amber-400 mt-1">⚠ Charged in USD — FX fees may apply</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* PayPal — Primary for international */}
                                <div className="flex-1 flex items-start gap-3 p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-bold text-blue-400">PP</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-semibold text-white">PayPal</span>
                                            <span className="text-xs font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/20">Recommended</span>
                                        </div>
                                        <p className="text-xs text-gray-400">Visa · Mastercard · Amex · PayPal balance</p>
                                        <p className="text-xs text-emerald-400 font-medium mt-1">Secure recurring billing in USD</p>
                                    </div>
                                </div>
                                {/* India note */}
                                <div className="flex-1 flex items-start gap-3 p-4 rounded-xl border border-white/10 bg-white/5">
                                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0 text-lg">
                                        🇮🇳
                                    </div>
                                    <div>
                                        <span className="text-sm font-semibold text-white">India? Pay via Cashfree</span>
                                        <p className="text-xs text-gray-400 mt-1">UPI, net banking and wallets in INR</p>
                                        <button
                                            onClick={() => currencyOverride('IN')}
                                            className="text-xs text-orange-400 hover:text-orange-300 transition-colors mt-1 underline"
                                        >
                                            Switch to India pricing →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Trust Signals ── */}
                <div className="mx-auto max-w-4xl mb-20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                            <Shield className="w-8 h-8 text-accent-emerald mx-auto mb-3" />
                            <h3 className="font-semibold text-white mb-2">30-Day Guarantee</h3>
                            <p className="text-sm text-gray-400">30-day money-back, no questions asked for first-time subscribers</p>
                        </div>
                        <div className="text-center p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                            <CreditCard className="w-8 h-8 text-accent-cyan mx-auto mb-3" />
                            <h3 className="font-semibold text-white mb-2">Start free — no card needed</h3>
                            <p className="text-sm text-gray-400">Full Pro access for 14 days — no payment details required to start</p>
                        </div>
                        <div className="text-center p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                            <Clock className="w-8 h-8 text-accent-purple mx-auto mb-3" />
                            <h3 className="font-semibold text-white mb-2">Cancel in one click</h3>
                            <p className="text-sm text-gray-400">No lock-in. Cancel from your dashboard in one click, anytime</p>
                        </div>
                    </div>
                </div>

                {/* ── FAQ ── */}
                <div className="mx-auto max-w-3xl">
                    <h2 className="mb-8 text-center text-3xl font-bold text-white">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-3">
                        {FAQS.map((faq, index) => (
                            <div
                                key={index}
                                className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden transition-all duration-200 hover:border-white/20"
                            >
                                <button
                                    id={`faq-${index}`}
                                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                    className="w-full flex items-center justify-between p-6 text-left"
                                >
                                    <span className="font-semibold text-white text-sm">{faq.q}</span>
                                    <ChevronDown className={`text-gray-400 ml-4 flex-shrink-0 w-4 h-4 transition-transform duration-200 ${openFaq === index ? 'rotate-180' : ''}`} />
                                </button>
                                {openFaq === index && (
                                    <div className="px-6 pb-6 pt-0">
                                        <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                                        {index === 4 && (
                                            <Link to="/refund-policy" className="mt-2 inline-block text-xs text-accent-cyan hover:text-accent-purple transition-colors">
                                                View full Refund Policy →
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-8 text-center">
                        <Link to="/faq" className="inline-flex items-center gap-2 text-accent-cyan hover:text-accent-purple transition-colors font-medium">
                            <span>View all FAQs</span>
                            <span>→</span>
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    )
}
