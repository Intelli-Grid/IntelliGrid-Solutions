import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Check, X, Sparkles, Star, Zap, TrendingUp, Users, Shield,
    CreditCard, Clock, Loader2, Tag, CheckCircle2, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { paymentService, couponService } from '../services'
import SEO from '../components/common/SEO'

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
            'Browse all 3,500+ AI tools',
            'Save up to 10 favourites',
            'Create up to 2 collections',
            'Basic search filters',
            'Write and read reviews',
            'Submit tools for review',
        ],
        icon: Star,
        cta: 'Get Started Free',
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
            'Unlimited favourites — save your entire stack',
            'Unlimited collections — organise by project',
            'Advanced search filters',
            'Ad-free experience',
            'Priority in search results',
            'Weekly curated AI digest',
            'Export favourites and collections',
        ],
        icon: Zap,
        cta: 'Start 14-Day Free Trial',
        ctaNote: 'No credit card required',
        highlighted: true,
        badge: 'Most Popular',
        savings: null,
    },
    {
        id: 'business_monthly',
        name: 'Team',
        price: 39.00,
        priceDisplay: '$39',
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
        cta: 'Start Team Trial',
        ctaNote: 'No credit card required',
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
            'Browse all 3,500+ AI tools',
            'Save up to 10 favourites',
            'Create up to 2 collections',
            'Basic search filters',
            'Write and read reviews',
            'Submit tools for review',
        ],
        icon: Star,
        cta: 'Get Started Free',
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
        priceNote: 'per year — just $6.67/mo',
        description: 'For professionals building their AI stack',
        features: [
            'Everything in Explorer',
            'Unlimited favourites — save your entire stack',
            'Unlimited collections — organise by project',
            'Advanced search filters',
            'Ad-free experience',
            'Priority in search results',
            'Weekly curated AI digest',
            'Export favourites and collections',
        ],
        icon: Zap,
        cta: 'Start 14-Day Free Trial',
        ctaNote: 'No credit card required',
        highlighted: true,
        badge: 'Most Popular',
        savings: '4 months free',
    },
    {
        id: 'business_yearly',
        name: 'Team',
        price: 390.00,
        monthlyEquivalent: 32.50,
        priceDisplay: '$390',
        priceNote: 'per year — $32.50/mo',
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
        cta: 'Start Team Trial',
        ctaNote: 'No credit card required',
        highlighted: false,
        badge: null,
        savings: '2 months free',
    },
]

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQS = [
    {
        q: 'What happens after the free trial?',
        a: "After 14 days, your account moves to the free plan automatically — no charge. You keep all your data (favourites, collections, reviews). To keep Pro access, upgrade anytime from your dashboard or the pricing page.",
    },
    {
        q: 'Do I need a credit card for the trial?',
        a: "No. Your 14-day Pro trial starts the moment you create an account. No payment details required. You only add a card if you decide to upgrade.",
    },
    {
        q: 'Can I change plans later?',
        a: "Yes. Upgrade, downgrade, or cancel any time from your dashboard. Changes take effect immediately.",
    },
    {
        q: 'What payment methods do you accept?',
        a: "We accept PayPal (credit/debit cards) and Cashfree (UPI, net banking, cards, wallets). All payments are processed securely.",
    },
    {
        q: 'What about refunds?',
        a: "We offer a 30-day money-back guarantee for first-time subscribers. If you're not satisfied within 30 days of your first payment, contact us for a full refund. See our Refund Policy for details.",
    },
]

export default function PricingPage() {
    const { user, isSignedIn } = useUser()
    const [billing, setBilling] = useState('annual')
    const [loading, setLoading] = useState(null)
    const [error, setError] = useState(null)
    const [paymentMethod, setPaymentMethod] = useState('paypal')
    const [openFaq, setOpenFaq] = useState(null)

    // Coupon state
    const [couponCode, setCouponCode] = useState('')
    const [couponInput, setCouponInput] = useState('')
    const [couponData, setCouponData] = useState(null)
    const [couponError, setCouponError] = useState(null)
    const [couponLoading, setCouponLoading] = useState(false)

    const plans = billing === 'annual' ? ANNUAL_PLANS : MONTHLY_PLANS

    const applyDiscount = (basePrice) => {
        if (!couponData || basePrice === 0) return basePrice
        if (couponData.discountType === 'percentage') {
            const off = basePrice * (couponData.discountValue / 100)
            const capped = couponData.maxDiscount ? Math.min(off, couponData.maxDiscount) : off
            return Math.max(0, basePrice - capped)
        }
        return Math.max(0, basePrice - couponData.discountValue)
    }

    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) return
        setCouponLoading(true)
        setCouponError(null)
        try {
            const res = await couponService.validate(couponInput.trim())
            if (res.success) {
                setCouponData(res.coupon)
                setCouponCode(couponInput.trim().toUpperCase())
                setCouponError(null)
            }
        } catch (err) {
            setCouponError(err.response?.data?.message || 'Invalid coupon code')
            setCouponData(null)
            setCouponCode('')
        } finally {
            setCouponLoading(false)
        }
    }

    const handleRemoveCoupon = () => {
        setCouponData(null)
        setCouponCode('')
        setCouponInput('')
        setCouponError(null)
    }

    const handleSubscribe = async (planId) => {
        if (!isSignedIn) {
            window.location.href = '/sign-in?redirect_url=/pricing'
            return
        }

        if (planId === 'free') return

        try {
            setLoading(planId)
            setError(null)

            if (paymentMethod === 'paypal') {
                const response = await paymentService.createPayPalSubscription(planId)
                const result = response?.data || response

                if (result?.approveUrl) {
                    sessionStorage.setItem('pendingPlan', planId)
                    window.location.href = result.approveUrl
                } else {
                    setError('Failed to create PayPal subscription. Please try again.')
                }

            } else if (paymentMethod === 'cashfree') {
                const response = await paymentService.createCashfreeOrder(planId, couponCode || null)
                const result = response?.data || response

                if (result?.payment_link) {
                    window.location.href = result.payment_link
                } else if (result?.paymentUrl) {
                    window.location.href = result.paymentUrl
                } else {
                    setError('Failed to create Cashfree order. Please try again.')
                }
            }
        } catch (err) {
            console.error('Payment error:', err)
            setError(err.response?.data?.message || 'Failed to initiate payment. Please try again.')
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space">
            <SEO
                title="Pricing — IntelliGrid | 14-Day Free Trial, No Card Required"
                description="Start with a 14-day free Pro trial. Explore 3,500+ AI tools with unlimited saves, advanced filters, and collections. Upgrade for $9.99/month or $79.99/year."
                keywords="AI tools pricing, IntelliGrid Pro, AI directory subscription, premium AI tools, free trial"
                canonicalUrl="https://www.intelligrid.online/pricing"
            />

            <div className="container mx-auto px-6 py-16">

                {/* ── Header ── */}
                <div className="mx-auto mb-12 max-w-3xl text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6">
                        <Sparkles className="w-4 h-4 text-accent-cyan" />
                        <span className="text-sm font-medium text-white">14-day free trial — no credit card required</span>
                    </div>

                    <h1 className="mb-4 text-5xl md:text-6xl font-extrabold text-white leading-tight">
                        Build Your AI Stack
                        <span className="block mt-2 bg-gradient-to-r from-accent-cyan via-accent-purple to-accent-rose bg-clip-text text-transparent">
                            Intelligently
                        </span>
                    </h1>
                    <p className="text-xl text-gray-400">
                        Every new account starts with a full 14-day Pro trial. No card, no commitment.
                    </p>
                </div>

                {/* ── Billing Toggle ── */}
                <div className="flex items-center justify-center gap-4 mb-12">
                    <span className={`text-sm font-medium transition-colors ${billing === 'monthly' ? 'text-white' : 'text-gray-500'}`}>
                        Monthly
                    </span>
                    <button
                        id="billing-toggle"
                        onClick={() => setBilling(b => b === 'annual' ? 'monthly' : 'annual')}
                        className="relative flex items-center"
                        aria-label="Toggle billing period"
                    >
                        <div className={`w-14 h-7 rounded-full transition-all duration-300 ${billing === 'annual' ? 'bg-accent-purple' : 'bg-white/20'}`}>
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${billing === 'annual' ? 'left-8' : 'left-1'}`} />
                        </div>
                    </button>
                    <span className={`text-sm font-medium transition-colors ${billing === 'annual' ? 'text-white' : 'text-gray-500'}`}>
                        Annual
                        <span className="ml-2 px-2 py-0.5 bg-accent-emerald/20 text-accent-emerald text-xs font-semibold rounded-full border border-accent-emerald/30">
                            Save 33%
                        </span>
                    </span>
                </div>

                {/* ── Coupon Code ── */}
                {isSignedIn && (
                    <div className="mx-auto mb-10 max-w-md">
                        <label className="mb-2 block text-center text-sm font-medium text-gray-400">
                            Have a coupon code?
                        </label>
                        {couponData ? (
                            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-emerald-400">{couponCode} applied!</p>
                                    <p className="text-xs text-gray-500">
                                        {couponData.description || (couponData.discountType === 'percentage'
                                            ? `${couponData.discountValue}% off`
                                            : `$${couponData.discountValue} off`)}
                                    </p>
                                </div>
                                <button onClick={handleRemoveCoupon} className="text-gray-500 hover:text-white transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Tag className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                    <input
                                        id="coupon-input"
                                        value={couponInput}
                                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                                        placeholder="ENTER CODE"
                                        className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-3 text-sm text-white placeholder-gray-600 tracking-widest font-mono focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/15 transition-all"
                                    />
                                </div>
                                <button
                                    id="apply-coupon-btn"
                                    onClick={handleApplyCoupon}
                                    disabled={couponLoading || !couponInput.trim()}
                                    className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-semibold hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                                >
                                    {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                                </button>
                            </div>
                        )}
                        {couponError && <p className="mt-2 text-center text-xs text-red-400">{couponError}</p>}
                    </div>
                )}

                {/* ── Payment Method Selection ── */}
                {isSignedIn && (
                    <div className="mx-auto mb-10 max-w-md">
                        <label className="mb-3 block text-center text-sm font-medium text-gray-400">
                            Payment Method
                        </label>
                        <div className="flex gap-4">
                            <button
                                id="payment-paypal"
                                onClick={() => setPaymentMethod('paypal')}
                                className={`flex-1 rounded-xl border p-4 transition-all duration-300 ${paymentMethod === 'paypal'
                                    ? 'border-accent-cyan bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 shadow-glow-cyan'
                                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                    }`}
                            >
                                <CreditCard className="mx-auto mb-2 h-6 w-6 text-white" />
                                <div className="text-sm font-semibold text-white">PayPal</div>
                                <div className="text-xs text-gray-400 mt-1">Cards &amp; PayPal</div>
                            </button>
                            <button
                                id="payment-cashfree"
                                onClick={() => setPaymentMethod('cashfree')}
                                className={`flex-1 rounded-xl border p-4 transition-all duration-300 ${paymentMethod === 'cashfree'
                                    ? 'border-accent-emerald bg-gradient-to-r from-accent-emerald/20 to-accent-cyan/20 shadow-glow-emerald'
                                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                    }`}
                            >
                                <CreditCard className="mx-auto mb-2 h-6 w-6 text-white" />
                                <div className="text-sm font-semibold text-white">Cashfree</div>
                                <div className="text-xs text-gray-400 mt-1">UPI, Cards, Net Banking</div>
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Coupon + PayPal notice ── */}
                {isSignedIn && couponData && paymentMethod === 'paypal' && (
                    <div className="mx-auto mb-6 max-w-md rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs text-amber-300">
                        ⚠️ Coupon discounts apply to <strong>Cashfree</strong> payments only.
                    </div>
                )}

                {/* ── Error Message ── */}
                {error && (
                    <div className="mx-auto mb-8 max-w-md rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400 animate-fade-in">
                        {error}
                    </div>
                )}

                {/* ── Pricing Cards ── */}
                <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3 mb-16">
                    {plans.map((plan) => {
                        const Icon = plan.icon
                        const discountedPrice = couponData && plan.price > 0
                            ? applyDiscount(plan.price)
                            : null

                        return (
                            <div
                                key={plan.id}
                                className={`group relative flex flex-col rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-2 ${plan.highlighted
                                    ? 'border-accent-purple bg-gradient-to-br from-accent-purple/10 to-accent-cyan/10 shadow-2xl shadow-accent-purple/20'
                                    : 'border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20 hover:shadow-glow-cyan'
                                    }`}
                            >
                                {/* Badge */}
                                {plan.badge && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-lg bg-gradient-to-r from-accent-purple to-accent-cyan">
                                        {plan.badge}
                                    </div>
                                )}

                                {/* Savings Badge */}
                                {plan.savings && (
                                    <div className="absolute -top-3 -right-3 rounded-full bg-gradient-to-r from-accent-emerald to-accent-cyan px-3 py-1 text-xs font-bold text-white shadow-lg">
                                        {plan.savings}
                                    </div>
                                )}

                                {/* Icon */}
                                <div className={`mb-6 inline-flex w-fit p-3 rounded-xl ${plan.highlighted
                                    ? 'bg-gradient-to-r from-accent-purple to-accent-cyan'
                                    : 'bg-white/10'
                                    }`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>

                                {/* Plan name + description */}
                                <div className="mb-4">
                                    <h3 className="mb-1 text-2xl font-bold text-white">{plan.name}</h3>
                                    <p className="text-sm text-gray-400">{plan.description}</p>
                                </div>

                                {/* Price */}
                                <div className="mb-6">
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        {discountedPrice !== null && (
                                            <span className="text-2xl font-bold text-gray-600 line-through">{plan.priceDisplay}</span>
                                        )}
                                        <span className="text-5xl font-bold text-white">
                                            {discountedPrice !== null
                                                ? `$${discountedPrice.toFixed(2)}`
                                                : plan.priceDisplay}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1">{plan.priceNote}</p>
                                    {plan.monthlyEquivalent && billing === 'annual' && !discountedPrice && (
                                        <p className="text-sm text-accent-emerald mt-1">
                                            ${plan.monthlyEquivalent}/mo — billed annually
                                        </p>
                                    )}
                                </div>

                                {/* Features */}
                                <ul className="mb-8 space-y-3 flex-1">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <Check className={`mt-0.5 h-5 w-5 flex-shrink-0 ${plan.highlighted ? 'text-accent-cyan' : 'text-accent-emerald'}`} />
                                            <span className="text-sm text-gray-300">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA */}
                                <div className="mt-auto">
                                    <button
                                        id={`cta-${plan.id}`}
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={loading === plan.id || plan.id === 'free'}
                                        className={`w-full rounded-xl py-3.5 font-semibold transition-all duration-300 text-sm ${plan.highlighted
                                            ? 'bg-gradient-to-r from-accent-cyan to-accent-purple text-white hover:shadow-lg hover:scale-105 disabled:opacity-50'
                                            : plan.id === 'free'
                                                ? 'border border-white/20 bg-white/10 text-white cursor-default opacity-70'
                                                : 'border border-white/20 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50'
                                            } disabled:cursor-not-allowed`}
                                    >
                                        {loading === plan.id ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                <span>Processing...</span>
                                            </span>
                                        ) : (
                                            plan.cta
                                        )}
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
                            <p className="text-sm text-gray-400">Full refund if you're not satisfied within 30 days of payment</p>
                        </div>
                        <div className="text-center p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                            <CreditCard className="w-8 h-8 text-accent-cyan mx-auto mb-3" />
                            <h3 className="font-semibold text-white mb-2">No Card for Trial</h3>
                            <p className="text-sm text-gray-400">Full Pro access for 14 days — no payment details needed</p>
                        </div>
                        <div className="text-center p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                            <Clock className="w-8 h-8 text-accent-purple mx-auto mb-3" />
                            <h3 className="font-semibold text-white mb-2">Cancel Anytime</h3>
                            <p className="text-sm text-gray-400">No lock-in. Cancel from your dashboard in one click</p>
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
                                    <span className={`text-gray-400 ml-4 flex-shrink-0 transition-transform duration-200 ${openFaq === index ? 'rotate-45' : ''}`}>
                                        +
                                    </span>
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
