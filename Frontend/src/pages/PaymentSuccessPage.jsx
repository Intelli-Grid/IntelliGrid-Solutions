import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { paymentService } from '../services'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

import { useAuth } from '@clerk/clerk-react'

export default function PaymentSuccessPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { isLoaded, userId, getToken } = useAuth()
    const [status, setStatus] = useState('processing')
    const [message, setMessage] = useState('Processing your payment...')

    useEffect(() => {
        const checkAuthAndVerify = async () => {
            if (isLoaded && userId) {
                try {
                    const token = await getToken()
                    if (token) {
                        // Token is ready, interceptor should pick it up via window.Clerk or we can rely on session being active
                        verifyPayment()
                    } else {
                        console.log("Waiting for token...")
                    }
                } catch (e) {
                    console.error("Error getting token:", e)
                }
            } else if (isLoaded && !userId) {
                setStatus('error')
                setMessage('Authentication required. Please log in.')
            }
        }

        checkAuthAndVerify()
    }, [isLoaded, userId, getToken])

    const verifyPayment = async () => {
        try {
            const paymentMethod = searchParams.get('method') || 'paypal'

            let response
            if (paymentMethod === 'paypal') {
                const paymentId = searchParams.get('paymentId')
                const payerId = searchParams.get('PayerID')

                if (!paymentId || !payerId) {
                    setStatus('error')
                    setMessage('Missing payment details (ID or Payer).')
                    return
                }

                response = await paymentService.capturePayPalPayment(paymentId, payerId)
            } else {
                const orderId = searchParams.get('orderId')

                if (!orderId) {
                    setStatus('error')
                    setMessage('Invalid payment session')
                    return
                }

                response = await paymentService.verifyCashfreePayment(orderId)
            }

            console.log('Verification Response:', response)

            // Check multiple success indicators
            const isSuccess =
                response.success === true ||
                response.statusCode === 200 ||
                response.payment?.state === 'approved' ||
                response.order?.status === 'completed'

            if (isSuccess) {
                setStatus('success')
                setMessage('Payment successful! Your subscription is active.')
                setTimeout(() => navigate('/dashboard'), 3000)
            } else {
                setStatus('error')
                // Debugging: Show exactly what we got
                setMessage(`Failed: ${JSON.stringify(response)}`)
            }
        } catch (error) {
            console.error('Payment verification error:', error)
            setStatus('error')
            setMessage(`Error: ${error.message} | ${JSON.stringify(error.response?.data)}`)
        }
    }

    return (
        <div className="container mx-auto px-4 py-16">
            <div className="mx-auto max-w-md">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                    {status === 'processing' && (
                        <>
                            <Loader2 className="mx-auto mb-4 h-16 w-16 animate-spin text-purple-500" />
                            <h1 className="mb-2 text-2xl font-bold text-white">Processing Payment</h1>
                            <p className="text-gray-400">{message}</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
                            <h1 className="mb-2 text-2xl font-bold text-white">Payment Successful!</h1>
                            <p className="mb-6 text-gray-400">{message}</p>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-3 font-medium text-white transition hover:opacity-90"
                            >
                                Go to Dashboard
                            </button>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <XCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
                            <h1 className="mb-2 text-2xl font-bold text-white">Payment Failed</h1>
                            <p className="mb-6 text-gray-400">{message}</p>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => navigate('/pricing')}
                                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-6 py-3 font-medium text-white transition hover:bg-white/10"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="flex-1 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-3 font-medium text-white transition hover:opacity-90"
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
