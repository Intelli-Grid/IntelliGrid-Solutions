import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    Check, Sparkles, Star, Zap, Users, Shield,
    CreditCard, Clock, Gift, ChevronDown,
} from 'lucide-react'
import { useUser } from '@clerk/clerk-react'
import SEO from '../components/common/SEO'
import { useFlag } from '../hooks/useFeatureFlags'

// ─── Plan definitions ──────────────────────────────────────────────────────────
const MONTHLY_PLANS = [
    {
        id: 'free',
        name: 'Explorer',
        price: 0,
        priceDisplay: '$0',
        priceNote: 'Free forever',
        description: 'Discover AI tools at your own pace',
        features: [
            'Browse all 4,000+ AI tools',
            'Save up to 10 favourites',
            'Create up to 2 collections',
            'Basic search filters',
            'Write and read reviews',
            'Submit tools for review',
        ],
        icon: Star,
        cta: 'Continue with Explorer',
        ctaNote: null,
        highlighted: false,
        badge: null,
        savings: null,
    },
    {
        id: 'pro_monthly',
        name: 'Professional',
        price: 9.99,
        priceDisplay: '$9.99',
        priceNote: 'per month',
        description: 'For professionals building their AI stack',
        features: [
            'Everything in Explorer',
            'Unlimited favourites & collections',
            'Advanced search filters',
            'Ad-free experience',
            'Priority in search results',
            'Weekly curated AI digest',
            'Export favourites and collections',
        ],
        icon: Zap,
        cta: 'Try Professional Free',
        ctaNote: 'No credit card required · 14-day trial',
        highlighted: true,
        badge: 'Most Popular',
        savings: null,
    },
    {
        id: 'enterprise_monthly',
        name: 'Team',
        price: 24.99,
        priceDisplay: '$24.99',
        priceNote: 'per month',
        description: 'For teams evaluating AI tools together',
        features: [
            'Everything in Professional',
            'Team workspace (up to 10 members)',
            'Shared collections and favourites',
            'Bulk export for stakeholder reviews',
            'Verified Business badge on your tools',
            'API access (1,000 calls/month)',
            'Admin dashboard — manage team',
            'Dedicated support (24h SLA)',
        ],
        icon: Users,
        cta: 'Try Team for Free',
        ctaNote: 'No credit card required · 14-day trial',
        highlighted: false,
        badge: null,
        savings: null,
    },
]

const ANNUAL_PLANS = [
    {
        id: 'free',
        name: 'Explorer',
        price: 0,
        priceDisplay: '$0',
        priceNote: 'Free forever',
        description: 'Discover AI tools at your own pace',
        features: [
            'Browse all 4,000+ AI tools',
            'Save up to 10 favourites',
            'Create up to 2 collections',
            'Basic search filters',
            'Write and read reviews',
            'Submit tools for review',
        ],
        icon: Star,
        cta: 'Continue with Explorer',
        ctaNote: null,
        highlighted: false,
        badge: null,
        savings: null,
    },
    {
        id: 'pro_yearly',
        name: 'Professional',
        price: 79.99,
        monthlyEquivalent: 6.67,
        priceDisplay: '$79.99',
        priceNote: 'per year',
        description: 'For professionals building their AI stack',
        features: [
            'Everything in Explorer',
            'Unlimited favourites & collections',
            'Advanced search filters',
            'Ad-free experience',
            'Priority in search results',
            'Weekly curated AI digest',
            'Export favourites and collections',
        ],
        icon: Zap,
        cta: 'Try Professional Free',
        ctaNote: 'No credit card required · 14-day trial',
        highlighted: true,
        badge: 'Most Popular',
        savings: '4 months free',
    },
    {
        id: 'enterprise_yearly',
        name: 'Team',
        price: 249.99,
        monthlyEquivalent: 20.83,
        priceDisplay: '$249.99',
        priceNote: 'per year',
        description: 'For teams evaluating AI tools together',
        features: [
            'Everything in Professional',
            'Team workspace (up to 10 members)',
            'Shared collections and favourites',
            'Bulk export for stakeholder reviews',
            'Verified Business badge on your tools',
            'API access (1,000 calls/month)',
            'Admin dashboard — manage team',
            'Dedicated support (24h SLA)',
        ],
        icon: Users,
        cta: 'Try Team for Free',
        ctaNote: 'No credit card required · 14-day trial',
        highlighted: false,
        badge: null,
        savings: '2 months free',
    },
]

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQS = [
    {
        q: 'What happens after the free trial?',
        a: "After 14 days, your account moves to the free Explorer plan automatically — no charge. You keep all your data (favourites, collections, reviews). To keep Pro access, upgrade anytime from your dashboard.",
    },
    {
        q: 'Do I need a credit card for the trial?',
        a: "No. Your 14-day Pro trial starts the moment you create an account. No payment details required. You only add a payment method if you decide to upgrade.",
    },
    {
        q: 'Can I change plans later?',
        a: "Yes. Upgrade, downgrade, or cancel any time from your dashboard. Changes take effect immediately.",
    },
    {
        q: 'What payment methods do you accept?',
        a: "We accept PayPal (credit/debit cards, PayPal balance) and Cashfree (UPI, net banking, credit/debit cards, wallets — ideal for Indian users). All payments are processed securely.",
    },
    {
        q: 'What about refunds?',
        a: "We offer a 30-day money-back guarantee, no questions asked, for first-time subscribers. If you're not satisfied within 30 days of your first payment, contact us for a full refund.",
    },
]

// ─── Annual savings map ───────────────────────────────────────────────────────
const ANNUAL_SAVINGS = { pro_yearly: 39.89, enterprise_yearly: 49.89 }

export default function PricingPage() {
    const navigate = useNavigate()
    const { isSignedIn } = useUser()
    const annualV2 = useFlag('ANNUAL_PRICING_V2')
    const [billing, setBilling] = useState('annual')
    const [openFaq, setOpenFaq] = useState(null)

    const plans = billing === 'annual' ? ANNUAL_PLANS : MONTHLY_PLANS

    // Sort plans so the highlighted card appears first on mobile
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

        // Navigate to the dedicated checkout page with selected plan in router state
        // Also store in sessionStorage as a fallback for hard refresh
        sessionStorage.setItem('checkoutPlan', planId)
        sessionStorage.setItem('checkoutBilling', billing)
        navigate('/checkout', { state: { planId, billing } })
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space">
            <SEO
                title="Pricing — IntelliGrid | 14-Day Free Trial, No Card Required"
                description="Start with a 14-day free Pro trial. Explore 4,000+ AI tools with unlimited saves, advanced filters, and collections. Upgrade for $9.99/month or $79.99/year."
                keywords="AI tools pricing, IntelliGrid Pro, AI directory subscription, premium AI tools, free trial"
                canonicalUrl="https://www.intelligrid.online/pricing"
            />

            <div className="container mx-auto px-6 pt-12 pb-20">

                {/* ── Hero — slim, max vertical footprint ── */}
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

                {/* ── Annual V2 — switch nudge when monthly is active ── */}
                {annualV2 && billing === 'monthly' && (
                    <div className="mx-auto mb-6 max-w-xl">
                        <button
                            onClick={() => setBilling('annual')}
                            className="w-full rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 px-5 py-3 text-sm text-emerald-300 hover:border-emerald-500/70 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2"
                        >
                            <Gift size={14} />
                            Switch to Annual and save $39.89 — that&apos;s 4 months free on Pro
                        </button>
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

                {/* ── Pricing Cards — THE DOMINANT ELEMENT ── */}
                {/* Desktop: render in original order. Mobile: highlighted card first via CSS order */}
                <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3 mb-16 items-stretch">
                    {mobileSortedPlans.map((plan) => {
                        const Icon = plan.icon
                        return (
                            <div
                                key={plan.id}
                                className={`
                                    group relative flex flex-col rounded-2xl border p-8 transition-all duration-300
                                    ${plan.highlighted
                                        ? 'border-accent-purple bg-gradient-to-br from-accent-purple/10 via-deep-space to-accent-cyan/5 shadow-2xl shadow-accent-purple/20 lg:scale-[1.03] lg:z-10'
                                        : 'border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20 hover:-translate-y-1'
                                    }
                                `}
                                style={plan.highlighted ? { marginTop: '-0.5rem', marginBottom: '-0.5rem' } : {}}
                            >
                                {/* Most Popular badge */}
                                {plan.badge && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-lg bg-gradient-to-r from-accent-purple to-accent-cyan whitespace-nowrap">
                                        ✦ {plan.badge}
                                    </div>
                                )}

                                {/* Savings badge */}
                                {plan.savings && (
                                    <div className={`absolute -top-3 -right-3 rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg ${annualV2
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse shadow-emerald-500/30'
                                        : 'bg-gradient-to-r from-accent-emerald to-accent-cyan'
                                        }`}>
                                        {annualV2 && plan.id === 'pro_yearly' ? '4 Months FREE 🎁' : plan.savings}
                                    </div>
                                )}

                                {/* Icon */}
                                <div className={`mb-5 inline-flex w-fit p-3 rounded-xl ${plan.highlighted
                                    ? 'bg-gradient-to-r from-accent-purple to-accent-cyan'
                                    : 'bg-white/10'
                                    }`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>

                                {/* Plan name + description */}
                                <div className="mb-4">
                                    <h3 className="mb-1 text-xl font-bold text-white">{plan.name}</h3>
                                    <p className="text-sm text-gray-400">{plan.description}</p>
                                </div>

                                {/* Price */}
                                <div className="mb-6 pb-6 border-b border-white/10">
                                    <div className="flex items-end gap-2 flex-wrap">
                                        <span className="text-4xl font-extrabold text-white tracking-tight">{plan.priceDisplay}</span>
                                        {plan.price > 0 && (
                                            <span className="text-gray-400 text-sm mb-1">{plan.priceNote}</span>
                                        )}
                                    </div>
                                    {plan.monthlyEquivalent && billing === 'annual' && (
                                        <p className="text-sm text-accent-emerald mt-1 font-medium">
                                            ≈ ${plan.monthlyEquivalent}/mo when billed annually
                                        </p>
                                    )}
                                    {annualV2 && billing === 'annual' && ANNUAL_SAVINGS[plan.id] && (
                                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                                            <Gift size={10} /> You save ${ANNUAL_SAVINGS[plan.id].toFixed(2)}/year
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
                                        <p className="mt-2 text-center text-xs text-gray-500">{plan.ctaNote}</p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
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
                        <Link
                            to="/faq"
                            className="inline-flex items-center gap-2 text-accent-cyan hover:text-accent-purple transition-colors font-medium"
                        >
                            <span>View all FAQs</span>
                            <span>→</span>
                        </Link>
                    </div>
                </div>

            </div>
        </div>
    )
}
