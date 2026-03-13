import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
    ArrowLeft, Check, Shield, Lock, Tag, X,
    CheckCircle2, Loader2, Gift, Star, Zap, Users,
    CreditCard, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useUser } from '@clerk/clerk-react'
import { paymentService, couponService } from '../services'
import SEO from '../components/common/SEO'

// ─── Checkout plan catalogue (mirrors PricingPage plans) ────────────────────
const PLAN_CATALOGUE = {
    pro_monthly: {
        name: 'Professional',
        price: 9.99,
        priceDisplay: '$9.99',
        billingLabel: 'per month',
        billing: 'monthly',
        icon: Zap,
        features: [
            'Unlimited favourites & collections',
            'Advanced search filters',
            'Ad-free experience',
            'Priority in search results',
            'Weekly curated AI digest',
            'Export favourites and collections',
        ],
    },
    pro_yearly: {
        name: 'Professional',
        price: 79.99,
        priceDisplay: '$79.99',
        billingLabel: 'per year · just $6.67/mo',
        billing: 'annual',
        monthlyEquivalent: 6.67,
        icon: Zap,
        features: [
            'Unlimited favourites & collections',
            'Advanced search filters',
            'Ad-free experience',
            'Priority in search results',
            'Weekly curated AI digest',
            'Export favourites and collections',
        ],
        savings: 'Save $39.89 vs monthly',
    },
    enterprise_monthly: {
        name: 'Team',
        price: 24.99,
        priceDisplay: '$24.99',
        billingLabel: 'per month',
        billing: 'monthly',
        icon: Users,
        features: [
            'Everything in Professional',
            'Team workspace (up to 10 members)',
            'Shared collections and favourites',
            'API access (1,000 calls/month)',
            'Verified Business badge',
            'Dedicated support — 24h SLA',
        ],
    },
    enterprise_yearly: {
        name: 'Team',
        price: 249.99,
        priceDisplay: '$249.99',
        billingLabel: 'per year · $20.83/mo',
        billing: 'annual',
        monthlyEquivalent: 20.83,
        icon: Users,
        features: [
            'Everything in Professional',
            'Team workspace (up to 10 members)',
            'Shared collections and favourites',
            'API access (1,000 calls/month)',
            'Verified Business badge',
            'Dedicated support — 24h SLA',
        ],
        savings: 'Save $49.89 vs monthly',
    },
}

// ─── Plan upgrade/switch map (monthly ↔ yearly pairs) ───────────────────────
const BILLING_SWITCH = {
    pro_monthly: 'pro_yearly',
    pro_yearly: 'pro_monthly',
    enterprise_monthly: 'enterprise_yearly',
    enterprise_yearly: 'enterprise_monthly',
}

// ─── Helper: compute first charge date (14 days from today) ─────────────────
function getTrialEndDate() {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ─── Helper: discount calculator ────────────────────────────────────────────
function applyDiscount(basePrice, couponData) {
    if (!couponData || basePrice === 0) return basePrice
    if (couponData.discountType === 'percentage') {
        const off = basePrice * (couponData.discountValue / 100)
        const capped = couponData.maxDiscount ? Math.min(off, couponData.maxDiscount) : off
        return Math.max(0, basePrice - capped)
    }
    return Math.max(0, basePrice - couponData.discountValue)
}

export default function CheckoutPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, isSignedIn, isLoaded } = useUser()

    // ── Resolve plan from router state (primary) or sessionStorage (fallback) ──
    const stateplanId = location.state?.planId
    const stateBilling = location.state?.billing
    const storedPlanId = sessionStorage.getItem('checkoutPlan')
    const storedBilling = sessionStorage.getItem('checkoutBilling')

    const initialPlanId = stateplanId || storedPlanId
    const initialBilling = stateBilling || storedBilling || 'annual'

    // ── Redirect if no plan found (direct URL access) ───────────────────────
    useEffect(() => {
        if (isLoaded && !initialPlanId) {
            navigate('/pricing', { replace: true })
        }
    }, [isLoaded, initialPlanId, navigate])

    const [planId, setPlanId] = useState(initialPlanId || 'pro_yearly')
    const [paymentMethod, setPaymentMethod] = useState('paypal')

    // Coupon state
    const [couponExpanded, setCouponExpanded] = useState(false)
    const [couponInput, setCouponInput] = useState('')
    const [couponCode, setCouponCode] = useState('')
    const [couponData, setCouponData] = useState(null)
    const [couponError, setCouponError] = useState(null)
    const [couponLoading, setCouponLoading] = useState(false)

    // Order summary collapsed on mobile
    const [summaryExpanded, setSummaryExpanded] = useState(false)

    // Payment loading / error
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const plan = PLAN_CATALOGUE[planId]
    const trialEndDate = getTrialEndDate()
    const discountedPrice = couponData ? applyDiscount(plan?.price, couponData) : null
    const finalPrice = discountedPrice !== null ? discountedPrice : plan?.price
    const isBillingAnnual = plan?.billing === 'annual'
    const switchPlanId = BILLING_SWITCH[planId]
    const switchPlan = PLAN_CATALOGUE[switchPlanId]

    // ── Coupon handlers ──────────────────────────────────────────────────────
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

    // ── Billing period switch ────────────────────────────────────────────────
    const handleBillingSwitch = (newPlanId) => {
        setPlanId(newPlanId)
        sessionStorage.setItem('checkoutPlan', newPlanId)
        // Reset coupon on plan switch as price changes
        handleRemoveCoupon()
        setCouponExpanded(false)
    }

    // ── Main payment trigger ─────────────────────────────────────────────────
    const handleSubscribe = async () => {
        if (!isSignedIn || !plan) return
        setLoading(true)
        setError(null)

        try {
            if (paymentMethod === 'paypal') {
                const response = await paymentService.createPayPalSubscription(planId)
                const result = response?.data || response

                if (result?.approveUrl) {
                    sessionStorage.setItem('pendingPlan', planId)
                    window.location.href = result.approveUrl
                } else {
                    setError("Couldn't reach PayPal right now — please try again or switch to Cashfree.")
                }

            } else if (paymentMethod === 'cashfree') {
                const customerPhone = user?.primaryPhoneNumber?.phoneNumber || null
                const response = await paymentService.createCashfreeOrder(planId, couponCode || null, customerPhone)
                const result = response?.data || response

                if (result?.paymentSessionId || result?.payment_session_id) {
                    const sessionId = result.paymentSessionId || result.payment_session_id

                    if (window.Cashfree) {
                        try {
                            const isProd =
                                window.location.hostname === 'www.intelligrid.online' ||
                                window.location.hostname === 'intelligrid.online'
                            const cashfree = window.Cashfree({ mode: isProd ? 'production' : 'sandbox' })
                            cashfree.checkout({ paymentSessionId: sessionId })
                        } catch (err) {
                            console.error('Cashfree SDK Error:', err)
                            setError('Error initializing Cashfree checkout. Please try again.')
                        }
                    } else if (result?.payment_link || result?.paymentUrl) {
                        window.location.href = result.payment_link || result.paymentUrl
                    } else {
                        setError('Cashfree SDK is not available. Please refresh the page and try again.')
                    }
                } else if (result?.payment_link || result?.paymentUrl) {
                    window.location.href = result.payment_link || result.paymentUrl
                } else {
                    setError('Failed to create Cashfree order. Please try again.')
                }
            }
        } catch (err) {
            console.error('Payment error:', err)
            setError(err.response?.data?.message || 'Failed to initiate payment. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // ── Loading guard ────────────────────────────────────────────────────────
    if (!isLoaded || !plan) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent-purple" />
            </div>
        )
    }

    const PlanIcon = plan.icon

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space">
            <SEO
                title={`Checkout — ${plan.name} Plan | IntelliGrid`}
                description={`Subscribe to IntelliGrid ${plan.name} plan. Start your 14-day free trial today.`}
                noindex={true}
            />

            {/* ── Top bar ── */}
            <div className="border-b border-white/10 bg-deep-space/80 backdrop-blur-sm">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/pricing')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Plans
                    </button>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Lock className="w-3.5 h-3.5 text-accent-emerald" />
                        <span>Secure Checkout</span>
                    </div>
                </div>
            </div>

            {/* ── Mobile: Order summary accordion ── */}
            <div className="md:hidden border-b border-white/10 bg-white/5">
                <button
                    onClick={() => setSummaryExpanded(v => !v)}
                    className="w-full px-6 py-4 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-accent-purple to-accent-cyan">
                            <PlanIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-white">{plan.name} Plan</p>
                            <p className="text-xs text-gray-400">{plan.billingLabel}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                            {discountedPrice !== null ? `$${discountedPrice.toFixed(2)}` : plan.priceDisplay}
                        </span>
                        {summaryExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                    </div>
                </button>
                {summaryExpanded && (
                    <div className="px-6 pb-4 border-t border-white/10">
                        <ul className="space-y-2 pt-3">
                            {plan.features.map((f, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                                    <Check className="w-4 h-4 text-accent-cyan flex-shrink-0 mt-0.5" />
                                    <span>{f}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                            <div className="flex justify-between text-sm text-gray-400">
                                <span>14-day free trial</span>
                                <span className="text-accent-emerald font-medium">$0.00 today</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-400">
                                <span>First charge</span>
                                <span className="text-white">{trialEndDate}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Main 2-panel layout ── */}
            <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8 md:gap-10">

                    {/* ─────────────────────────────────────────────────────── */}
                    {/* LEFT PANEL — Order Summary (sticky on desktop)          */}
                    {/* ─────────────────────────────────────────────────────── */}
                    <div className="hidden md:block md:w-2/5 flex-shrink-0">
                        <div className="sticky top-8">
                            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">

                                {/* Plan header */}
                                <div className="p-6 border-b border-white/10 bg-gradient-to-br from-accent-purple/10 to-accent-cyan/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-cyan">
                                            <PlanIcon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-white text-lg">{plan.name} Plan</h2>
                                            <p className="text-xs text-gray-400">{plan.billingLabel}</p>
                                        </div>
                                    </div>

                                    {/* Features */}
                                    <ul className="space-y-2.5">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2.5">
                                                <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-accent-purple/30 flex items-center justify-center">
                                                    <Check className="w-2.5 h-2.5 text-accent-cyan" />
                                                </span>
                                                <span className="text-sm text-gray-300 leading-snug">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Trial & charge info */}
                                <div className="p-6 border-b border-white/10 space-y-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0" />
                                        <span className="text-gray-300">
                                            <strong className="text-white">14-day free trial</strong> — no charge today
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-2 text-sm">
                                        <Gift className="w-4 h-4 text-accent-emerald flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-400">
                                            Your first charge will be on{' '}
                                            <strong className="text-white">{trialEndDate}</strong>
                                        </span>
                                    </div>
                                    {plan.savings && (
                                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mt-1">
                                            <Gift className="w-3.5 h-3.5 flex-shrink-0" />
                                            {plan.savings}
                                        </div>
                                    )}
                                </div>

                                {/* Price breakdown */}
                                <div className="p-6 space-y-2">
                                    <div className="flex justify-between text-sm text-gray-400">
                                        <span>Subtotal</span>
                                        <span className={discountedPrice !== null ? 'line-through text-gray-600' : 'text-gray-300'}>
                                            {plan.priceDisplay}
                                        </span>
                                    </div>
                                    {couponData && discountedPrice !== null && (
                                        <div className="flex justify-between text-sm text-emerald-400">
                                            <span className="flex items-center gap-1">
                                                <Tag className="w-3 h-3" />
                                                {couponCode}
                                            </span>
                                            <span>−${(plan.price - discountedPrice).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {!couponData && (
                                        <div className="flex justify-between text-sm text-gray-500">
                                            <span>Coupon</span>
                                            <span>—</span>
                                        </div>
                                    )}
                                    <div className="border-t border-white/10 pt-2 mt-1 flex justify-between font-bold">
                                        <span className="text-white">Total</span>
                                        <span className="text-white text-lg">
                                            {discountedPrice !== null
                                                ? `$${discountedPrice.toFixed(2)}`
                                                : plan.priceDisplay}
                                            {isBillingAnnual ? '/yr' : '/mo'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 text-center pt-1">
                                        Billed after 14-day free trial
                                    </p>
                                </div>

                                {/* Security badge */}
                                <div className="px-6 pb-6">
                                    <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                                        <Shield className="w-3.5 h-3.5 text-accent-emerald" />
                                        <span>SSL secured · 256-bit encryption</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─────────────────────────────────────────────────────── */}
                    {/* RIGHT PANEL — Payment Form                              */}
                    {/* ─────────────────────────────────────────────────────── */}
                    <div className="flex-1 min-w-0">

                        {/* STEP 1 — Account */}
                        <div className="mb-8">
                            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                Step 1 · Account
                            </h2>
                            <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-accent-purple to-accent-cyan flex items-center justify-center flex-shrink-0">
                                    <Check className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Signed in as</p>
                                    <p className="text-xs text-gray-400">{user?.primaryEmailAddress?.emailAddress}</p>
                                </div>
                            </div>
                        </div>

                        {/* STEP 2 — Billing Period */}
                        <div className="mb-8">
                            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                Step 2 · Billing Period
                            </h2>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleBillingSwitch(isBillingAnnual ? switchPlanId : planId)}
                                    className={`rounded-xl border p-4 text-left transition-all duration-200 ${!isBillingAnnual
                                        ? 'border-accent-purple bg-accent-purple/10 shadow-lg shadow-accent-purple/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${!isBillingAnnual ? 'border-accent-purple bg-accent-purple' : 'border-gray-500'}`}>
                                            {!isBillingAnnual && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </div>
                                        <span className="text-sm font-semibold text-white">Monthly</span>
                                    </div>
                                    <span className="text-xs text-gray-400 pl-5">
                                        {PLAN_CATALOGUE[isBillingAnnual ? switchPlanId : planId]?.priceDisplay}/month
                                    </span>
                                </button>

                                <button
                                    onClick={() => handleBillingSwitch(isBillingAnnual ? planId : switchPlanId)}
                                    className={`rounded-xl border p-4 text-left transition-all duration-200 ${isBillingAnnual
                                        ? 'border-accent-purple bg-accent-purple/10 shadow-lg shadow-accent-purple/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isBillingAnnual ? 'border-accent-purple bg-accent-purple' : 'border-gray-500'}`}>
                                            {isBillingAnnual && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                        </div>
                                        <span className="text-sm font-semibold text-white">Annual</span>
                                        <span className="text-xs font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/20">
                                            Save 33%
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-400 pl-5">
                                        {PLAN_CATALOGUE[isBillingAnnual ? planId : switchPlanId]?.priceDisplay}/year
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* STEP 3 — Payment Method */}
                        <div className="mb-8">
                            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                Step 3 · Payment Method
                            </h2>
                            <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                                <button
                                    id="payment-paypal"
                                    onClick={() => setPaymentMethod('paypal')}
                                    className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all ${paymentMethod === 'paypal'
                                        ? 'bg-white/15 text-white border border-white/20 shadow-sm'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <div className="font-semibold text-sm">🔵 PayPal</div>
                                    <div className="text-xs text-gray-500 mt-0.5">Cards & PayPal · Worldwide</div>
                                </button>
                                <button
                                    id="payment-cashfree"
                                    onClick={() => setPaymentMethod('cashfree')}
                                    className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all ${paymentMethod === 'cashfree'
                                        ? 'bg-white/15 text-white border border-white/20 shadow-sm'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <div className="font-semibold text-sm">🟢 Cashfree</div>
                                    <div className="text-xs text-gray-500 mt-0.5">UPI · Net Banking · India</div>
                                </button>
                            </div>

                            {/* Context note */}
                            <div className="mt-3 text-xs text-gray-500 text-center">
                                {paymentMethod === 'paypal'
                                    ? 'PayPal supports international credit/debit cards and PayPal balance'
                                    : 'Cashfree supports UPI, net banking, cards, and wallets (India)'}
                            </div>
                        </div>

                        {/* STEP 4 — Coupon (collapsed by default) */}
                        <div className="mb-8">
                            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                Step 4 · Coupon <span className="normal-case font-normal">(optional)</span>
                            </h2>

                            {couponData ? (
                                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
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
                            ) : !couponExpanded ? (
                                <button
                                    onClick={() => setCouponExpanded(true)}
                                    className="text-sm text-accent-cyan hover:text-accent-purple transition-colors flex items-center gap-1.5"
                                >
                                    <Tag className="w-3.5 h-3.5" />
                                    Have a coupon code? Click to apply
                                </button>
                            ) : (
                                <div className="animate-fade-in">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Tag className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                            <input
                                                id="coupon-input"
                                                value={couponInput}
                                                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                                onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                                                placeholder="ENTER CODE"
                                                autoFocus
                                                className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 py-3 text-sm text-white placeholder-gray-600 tracking-widest font-mono focus:border-accent-purple/50 focus:outline-none focus:ring-2 focus:ring-accent-purple/15 transition-all"
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
                                        <button
                                            onClick={() => { setCouponExpanded(false); setCouponInput('') }}
                                            className="px-3 py-2 rounded-xl text-gray-500 hover:text-white transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    {couponError && <p className="mt-2 text-xs text-red-400">{couponError}</p>}
                                </div>
                            )}

                            {/* Coupon + PayPal warning */}
                            {couponData && paymentMethod === 'paypal' && (
                                <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                    Coupon discounts apply to <strong className="mx-1">Cashfree</strong> payments only. Switch payment method to apply your coupon.
                                </div>
                            )}
                        </div>

                        {/* ── Legal ── */}
                        <p className="text-xs text-gray-500 mb-5">
                            By subscribing you agree to our{' '}
                            <Link to="/terms-of-service" className="text-white hover:underline transition-colors">Terms of Service</Link>
                            {' '}and{' '}
                            <Link to="/privacy-policy" className="text-white hover:underline transition-colors">Privacy Policy</Link>.
                            Your subscription starts after the 14-day free trial on {trialEndDate}.
                        </p>

                        {/* ── Error ── */}
                        {error && (
                            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p>{error}</p>
                                    <p className="text-xs text-red-500/70 mt-1">If this persists, try switching payment method or contact support.</p>
                                </div>
                            </div>
                        )}

                        {/* ── Subscribe button (desktop) ── */}
                        <button
                            id="subscribe-btn"
                            onClick={handleSubscribe}
                            disabled={loading}
                            className="hidden md:flex w-full items-center justify-center gap-3 rounded-xl py-4 text-sm font-bold tracking-wide transition-all duration-200 bg-gradient-to-r from-accent-cyan to-accent-purple text-white hover:shadow-xl hover:shadow-accent-purple/30 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>One moment...</span>
                                </>
                            ) : (
                                <>
                                    <Lock className="w-4 h-4" />
                                    <span>
                                        Subscribe Now —{' '}
                                        {discountedPrice !== null ? `$${discountedPrice.toFixed(2)}` : plan.priceDisplay}
                                        {isBillingAnnual ? '/yr' : '/mo'}
                                    </span>
                                </>
                            )}
                        </button>
                        <p className="hidden md:block text-center text-xs text-gray-500 mt-2">
                            🏆 30-day money-back guarantee, no questions asked · Cancel anytime in one click
                        </p>

                    </div>
                </div>
            </div>

            {/* ── Mobile sticky Pay button ── */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-deep-space/95 border-t border-white/10 z-50 md:hidden">
                <button
                    id="subscribe-btn-mobile"
                    onClick={handleSubscribe}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-purple py-4 font-bold text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>One moment...</span>
                        </>
                    ) : (
                        <>
                            <Lock className="w-4 h-4" />
                            <span>
                                Subscribe Now —{' '}
                                {discountedPrice !== null ? `$${discountedPrice.toFixed(2)}` : plan.priceDisplay}
                                {isBillingAnnual ? '/yr' : '/mo'}
                            </span>
                        </>
                    )}
                </button>
                <p className="text-center text-xs text-gray-500 mt-1.5">Cancel anytime · 30-day guarantee</p>
            </div>

            {/* Spacer so content is not hidden behind mobile button */}
            <div className="h-24 md:hidden" />
        </div>
    )
}
