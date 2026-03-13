import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { paymentService } from '../services'
import {
    CheckCircle, XCircle, Loader2, RefreshCw,
    Zap, Star, Search, LayoutDashboard, BookOpen,
    Shield, Clock,
} from 'lucide-react'
import { logEvent } from '../utils/analytics'
import { useAuth } from '@clerk/clerk-react'
import SEO from '../components/common/SEO'

// ─── Plan name resolver ───────────────────────────────────────────────────────
const PLAN_NAMES = {
    pro_monthly: 'Professional',
    pro_yearly: 'Professional',
    enterprise_monthly: 'Team',
    enterprise_yearly: 'Team',
}

const PLAN_PRICES = {
    pro_monthly: 9.99,
    pro_yearly: 79.99,
    enterprise_monthly: 24.99,
    enterprise_yearly: 249.99,
}

// ─── What each plan unlocks ───────────────────────────────────────────────────
const PLAN_UNLOCKS = {
    Professional: [
        'Unlimited favourites & collections unlocked',
        'Ad-free experience enabled across all pages',
        'Advanced search filters — now active',
        'Weekly AI digest — first edition ships Friday',
        'Priority in search results — boosted visibility',
    ],
    Team: [
        'Team workspace created — invite up to 10 members',
        'Shared collections — collaborate with your team',
        'API access (1,000 calls/month) — now active',
        'Verified Business badge — appearing on your tools',
        'Dedicated 24h support — we respond within one business day',
    ],
}

export default function PaymentSuccessPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { isLoaded, userId } = useAuth()
    const [status, setStatus] = useState('processing')
    const [message, setMessage] = useState('Processing your payment...')
    const [subMessage, setSubMessage] = useState('')
    const [planName, setPlanName] = useState('Professional')
    const [countdown, setCountdown] = useState(8)

    const isVerifyStarted = useRef(false)
    const countdownRef = useRef(null)

    // ── Auto-redirect countdown ───────────────────────────────────────────────
    const startCountdown = () => {
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current)
                    navigate('/dashboard')
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    useEffect(() => {
        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current)
        }
    }, [])

    useEffect(() => {
        const verifyPayment = async () => {
            if (isVerifyStarted.current) return
            isVerifyStarted.current = true

            try {
                const paymentMethod = searchParams.get('method') || 'paypal'

                // ── PayPal Subscriptions API v2 ───────────────────────────────
                // Activation is handled ASYNCHRONOUSLY by the
                // BILLING.SUBSCRIPTION.ACTIVATED webhook — not a frontend call.
                if (paymentMethod === 'paypal-subscription') {
                    const subscriptionId = searchParams.get('subscription_id')
                    const baToken = searchParams.get('ba_token')

                    if (!subscriptionId && !baToken) {
                        setStatus('error')
                        setMessage('Missing subscription confirmation from PayPal.')
                        setSubMessage('Please contact support if you were charged.')
                        return
                    }

                    const pendingPlan = sessionStorage.getItem('pendingPlan') || 'pro_monthly'
                    const purchaseValue = PLAN_PRICES[pendingPlan] || 9.99
                    const resolvedPlanName = PLAN_NAMES[pendingPlan] || 'Professional'
                    sessionStorage.removeItem('pendingPlan')

                    logEvent('purchase', {
                        transaction_id: subscriptionId || baToken || 'paypal-sub',
                        value: purchaseValue,
                        currency: 'USD',
                    })

                    setPlanName(resolvedPlanName)
                    setStatus('success')
                    setMessage(`You're all set — welcome to ${resolvedPlanName} 🎉`)
                    setSubMessage(
                        'PayPal is activating your subscription. Your Pro features will be live within a few seconds.'
                    )
                    startCountdown()
                    return
                }

                // ── PayPal legacy one-time order (fallback) ───────────────────
                if (paymentMethod === 'paypal') {
                    const paymentId = searchParams.get('paymentId')
                    const payerId = searchParams.get('PayerID')

                    if (!paymentId || !payerId) {
                        setStatus('error')
                        setMessage('Missing payment details (ID or Payer).')
                        setSubMessage('Please contact support if you completed this payment.')
                        return
                    }

                    const response = await paymentService.capturePayPalPayment(paymentId, payerId)

                    // Trust explicit success flag; fall back to order status as secondary signal
                    const isSuccess =
                        response.success === true ||
                        response.payment?.state === 'approved' ||
                        response.order?.status === 'completed'

                    if (isSuccess) {
                        logEvent('purchase', {
                            transaction_id: paymentId,
                            value: response.amount?.total || 9.99,
                            currency: 'USD',
                        })
                        setPlanName('Professional')
                        setStatus('success')
                        const paidAmount = response.amount?.total ? `$${response.amount.total}` : ''
                        setMessage(`You're all set — welcome to Professional 🎉`)
                        setSubMessage(`Your ${paidAmount} subscription is now active. Redirecting to your dashboard...`)
                        startCountdown()
                    } else {
                        setStatus('error')
                        setMessage(`Payment capture failed: ${response.message || 'Unknown error'}`)
                        setSubMessage('Please try again or contact support.')
                    }
                    return
                }

                // ── Cashfree one-time order ───────────────────────────────────
                const orderId = searchParams.get('orderId')

                if (!orderId) {
                    setStatus('error')
                    setMessage('Invalid payment session — no order ID found.')
                    setSubMessage('Please contact support if you completed this payment.')
                    return
                }

                const response = await paymentService.verifyCashfreePayment(orderId)

                // ✅ ONLY trust the explicit success flag from the backend.
                // Never use response.statusCode === 200 — that's true even for
                // cancelled/failed payments since the HTTP request itself succeeds.
                if (response.success === true) {
                    logEvent('purchase', {
                        transaction_id: orderId,
                        value: response.amount?.total || 9.99,
                        currency: 'INR',
                    })
                    setPlanName('Professional')
                    setStatus('success')
                    const paidAmount = response.amount?.total ? `₹${Number(response.amount.total).toLocaleString('en-IN')} ` : ''
                    setMessage(`You're all set — welcome to Professional 🎉`)
                    setSubMessage(`Your ${paidAmount}subscription is now active. Redirecting to your dashboard...`)
                    startCountdown()
                } else {
                    setStatus('error')
                    setMessage(response.message || 'Payment was not completed.')
                    setSubMessage('No charge was made. You can try again or contact support if needed.')
                }
            } catch (error) {
                console.error('Payment verification error:', error)
                setStatus('error')
                setMessage(error.response?.data?.message || 'Payment verification failed.')
                setSubMessage("We couldn't verify this payment. Please contact support — we'll sort it within 24h.")
            }
        }

        if (isLoaded && userId && !isVerifyStarted.current) {
            verifyPayment()
        } else if (isLoaded && !userId) {
            setStatus('error')
            setMessage('Authentication required. Please log in.')
            setSubMessage('Sign in to verify your payment.')
        }
    }, [isLoaded, userId, searchParams, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

    const unlocks = PLAN_UNLOCKS[planName] || PLAN_UNLOCKS['Professional']

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space flex items-center justify-center px-4 py-16">
            <SEO
                title="Payment Processing | IntelliGrid"
                description="Processing your IntelliGrid subscription payment."
                noindex={true}
            />

            <div className="w-full max-w-lg">

                {/* ── Processing ── */}
                {status === 'processing' && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-10 text-center shadow-xl">
                        <div className="mb-6 flex justify-center">
                            <div className="rounded-full bg-accent-purple/10 p-5 border border-accent-purple/20">
                                <Loader2 className="h-14 w-14 animate-spin text-accent-purple" />
                            </div>
                        </div>
                        <h1 className="mb-2 text-2xl font-bold text-white">Processing Payment</h1>
                        <p className="text-gray-400">Please do not close this window.</p>
                    </div>
                )}

                {/* ── Success ── */}
                {status === 'success' && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden shadow-2xl">

                        {/* Success header */}
                        <div className="bg-gradient-to-r from-accent-purple/20 via-accent-cyan/10 to-accent-emerald/10 p-8 text-center border-b border-white/10">
                            <div className="mb-4 flex justify-center">
                                <div className="rounded-full bg-emerald-500/15 p-4 border border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                                    <CheckCircle className="h-12 w-12 text-emerald-400" />
                                </div>
                            </div>
                            <h1 className="text-2xl font-extrabold text-white mb-2">{message}</h1>
                            {subMessage && <p className="text-sm text-gray-400">{subMessage}</p>}
                        </div>

                        {/* What you unlocked */}
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                                ✅ What you just unlocked
                            </h2>
                            <ul className="space-y-2.5">
                                {unlocks.map((unlock, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5">
                                            <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                                        </span>
                                        <span className="text-sm text-gray-300">{unlock}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Quick actions */}
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                                What would you like to do first?
                            </h2>
                            <div className="grid grid-cols-3 gap-3">
                                <Link
                                    to="/tools"
                                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-accent-cyan/30 hover:bg-white/10 transition-all group text-center"
                                >
                                    <Search className="w-5 h-5 text-accent-cyan group-hover:scale-110 transition-transform" />
                                    <span className="text-xs text-gray-300 font-medium">Explore Tools</span>
                                </Link>
                                <Link
                                    to="/dashboard"
                                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-accent-purple/30 hover:bg-white/10 transition-all group text-center"
                                >
                                    <LayoutDashboard className="w-5 h-5 text-accent-purple group-hover:scale-110 transition-transform" />
                                    <span className="text-xs text-gray-300 font-medium">Dashboard</span>
                                </Link>
                                <Link
                                    to="/tools"
                                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-accent-emerald/30 hover:bg-white/10 transition-all group text-center"
                                >
                                    <BookOpen className="w-5 h-5 text-accent-emerald group-hover:scale-110 transition-transform" />
                                    <span className="text-xs text-gray-300 font-medium">Collections</span>
                                </Link>
                            </div>
                        </div>

                        {/* Redirect footer */}
                        <div className="p-6 text-center">
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-4">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                <span>Redirecting to dashboard in {countdown}s...</span>
                            </div>
                            <button
                                onClick={() => {
                                    if (countdownRef.current) clearInterval(countdownRef.current)
                                    navigate('/dashboard')
                                }}
                                className="w-full rounded-xl bg-gradient-to-r from-accent-cyan to-accent-purple px-6 py-3 font-bold text-white text-sm transition hover:opacity-90 hover:scale-[1.01]"
                            >
                                Go to Dashboard Now →
                            </button>
                            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> 30-day guarantee
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Cancel anytime
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Error ── */}
                {status === 'error' && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center shadow-xl">
                        <div className="mb-6 flex justify-center">
                            <div className="rounded-full bg-red-500/10 p-5 border border-red-500/20">
                                <XCircle className="h-14 w-14 text-red-400" />
                            </div>
                        </div>
                        <h1 className="mb-2 text-2xl font-bold text-white">Verification Failed</h1>
                        <p className="mb-2 text-sm text-gray-300">{message}</p>
                        {subMessage && (
                            <p className="mb-6 text-xs text-gray-500">{subMessage}</p>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate('/pricing')}
                                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-medium text-white transition hover:bg-white/10"
                            >
                                ← Try Again
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex-1 rounded-xl bg-gradient-to-r from-accent-purple to-accent-cyan px-5 py-3 font-medium text-white transition hover:opacity-90"
                            >
                                Dashboard
                            </button>
                        </div>
                        <p className="mt-4 text-xs text-gray-600">
                            Need help?{' '}
                            <a href="mailto:support@intelligrid.online" className="text-accent-cyan hover:underline">
                                Contact support →
                            </a>
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
