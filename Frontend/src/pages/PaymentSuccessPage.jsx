import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { paymentService } from '../services'
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { logEvent } from '../utils/analytics'
import { useAuth } from '@clerk/clerk-react'
import SEO from '../components/common/SEO'

export default function PaymentSuccessPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { isLoaded, userId } = useAuth()
    const [status, setStatus] = useState('processing')
    const [message, setMessage] = useState('Processing your payment...')
    const [subMessage, setSubMessage] = useState('')

    const isVerifyStarted = useRef(false)

    useEffect(() => {
        const verifyPayment = async () => {
            if (isVerifyStarted.current) return
            isVerifyStarted.current = true

            try {
                const paymentMethod = searchParams.get('method') || 'paypal'

                // ── PayPal Subscriptions API v2 ────────────────────────────────────
                // After user approves on PayPal, they are redirected back with:
                //   ?method=paypal-subscription&subscription_id=I-xxx&ba_token=BA-xxx
                //
                // IMPORTANT: Activation is handled ASYNCHRONOUSLY by the
                // BILLING.SUBSCRIPTION.ACTIVATED webhook — NOT by a frontend API call.
                // The page just confirms success and redirects to dashboard.
                if (paymentMethod === 'paypal-subscription') {
                    const subscriptionId = searchParams.get('subscription_id')
                    const baToken = searchParams.get('ba_token')

                    // Both params confirm a genuine PayPal subscription approval
                    if (!subscriptionId && !baToken) {
                        setStatus('error')
                        setMessage('Missing subscription confirmation from PayPal.')
                        setSubMessage('Please contact support if you were charged.')
                        return
                    }

                    // Track subscription start event in GA4
                    logEvent('purchase', {
                        transaction_id: subscriptionId || baToken || 'paypal-sub',
                        value: 9.99,
                        currency: 'USD',
                    })

                    setStatus('success')
                    setMessage('Subscription confirmed! Your account is being activated.')
                    setSubMessage(
                        'PayPal is processing your subscription. Your Pro features will be active within a few seconds. Redirecting to dashboard...'
                    )
                    // Give webhook a few seconds to arrive before redirecting
                    setTimeout(() => navigate('/dashboard'), 4000)
                    return
                }

                // ── PayPal legacy one-time order (fallback) ────────────────────────
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
                    const isSuccess =
                        response.success === true ||
                        response.statusCode === 200 ||
                        response.payment?.state === 'approved' ||
                        response.order?.status === 'completed' ||
                        response.status === 'completed'

                    if (isSuccess) {
                        logEvent('purchase', {
                            transaction_id: paymentId,
                            value: response.amount?.total || 9.99,
                            currency: 'USD',
                        })
                        setStatus('success')
                        setMessage('Payment successful! Your subscription is now active.')
                        setSubMessage('Redirecting you to your dashboard...')
                        setTimeout(() => navigate('/dashboard'), 3000)
                    } else {
                        setStatus('error')
                        setMessage(`Payment capture failed: ${response.message || 'Unknown error'}`)
                        setSubMessage('Please try again or contact support.')
                    }
                    return
                }

                // ── Cashfree one-time order ────────────────────────────────────────
                const orderId = searchParams.get('orderId')

                if (!orderId) {
                    setStatus('error')
                    setMessage('Invalid payment session — no order ID found.')
                    setSubMessage('Please contact support if you completed this payment.')
                    return
                }

                const response = await paymentService.verifyCashfreePayment(orderId)
                const isSuccess =
                    response.success === true ||
                    response.statusCode === 200 ||
                    response.order?.status === 'completed' ||
                    response.status === 'completed'

                if (isSuccess) {
                    logEvent('purchase', {
                        transaction_id: orderId,
                        value: response.amount?.total || 9.99,
                        currency: 'INR',
                    })
                    setStatus('success')
                    setMessage('Payment successful! Your subscription is now active.')
                    setSubMessage('Redirecting you to your dashboard...')
                    setTimeout(() => navigate('/dashboard'), 3000)
                } else {
                    setStatus('error')
                    setMessage(`Payment verification failed: ${response.message || 'Unknown error'}`)
                    setSubMessage('Please try again or contact support.')
                }
            } catch (error) {
                console.error('Payment verification error:', error)
                setStatus('error')
                setMessage(error.response?.data?.message || 'Payment verification failed.')
                setSubMessage('Please contact support if you were charged.')
            }
        }

        if (isLoaded && userId && !isVerifyStarted.current) {
            verifyPayment()
        } else if (isLoaded && !userId) {
            setStatus('error')
            setMessage('Authentication required. Please log in.')
            setSubMessage('Sign in to verify your payment.')
        }
    }, [isLoaded, userId, searchParams, navigate])

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-16">
            <SEO
                title="Payment Processing | IntelliGrid"
                description="Processing your IntelliGrid subscription payment."
                noindex={true}
            />
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center shadow-xl">

                    {/* Processing */}
                    {status === 'processing' && (
                        <>
                            <div className="mb-6 flex justify-center">
                                <div className="rounded-full bg-purple-500/10 p-5">
                                    <Loader2 className="h-14 w-14 animate-spin text-purple-400" />
                                </div>
                            </div>
                            <h1 className="mb-2 text-2xl font-bold text-white">Processing Payment</h1>
                            <p className="text-gray-400">{message}</p>
                            <p className="mt-2 text-xs text-gray-600">Please do not close this window.</p>
                        </>
                    )}

                    {/* Success */}
                    {status === 'success' && (
                        <>
                            <div className="mb-6 flex justify-center">
                                <div className="rounded-full bg-emerald-500/10 p-5">
                                    <CheckCircle className="h-14 w-14 text-emerald-400" />
                                </div>
                            </div>
                            <h1 className="mb-2 text-2xl font-bold text-white">{message}</h1>
                            {subMessage && (
                                <p className="mb-6 text-sm text-gray-400">{subMessage}</p>
                            )}
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-600 mb-6">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                <span>Redirecting automatically...</span>
                            </div>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 px-6 py-3 font-semibold text-white transition hover:opacity-90"
                            >
                                Go to Dashboard Now
                            </button>
                        </>
                    )}

                    {/* Error */}
                    {status === 'error' && (
                        <>
                            <div className="mb-6 flex justify-center">
                                <div className="rounded-full bg-red-500/10 p-5">
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
                                    Try Again
                                </button>
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 px-5 py-3 font-medium text-white transition hover:opacity-90"
                                >
                                    Dashboard
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
