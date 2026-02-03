import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { paymentService } from '../services'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function PaymentSuccessPage() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [status, setStatus] = useState('processing')
    const [message, setMessage] = useState('Processing your payment...')

    useEffect(() => {
        verifyPayment()
    }, [])

    const verifyPayment = async () => {
        try {
            const orderId = searchParams.get('orderId') || searchParams.get('token')
            const paymentMethod = searchParams.get('method') || 'paypal'

            if (!orderId) {
                setStatus('error')
                setMessage('Invalid payment session')
                return
            }

            let response
            if (paymentMethod === 'paypal') {
                response = await paymentService.capturePayPalPayment(orderId)
            } else {
                response = await paymentService.verifyCashfreePayment(orderId)
            }

            if (response.success) {
                setStatus('success')
                setMessage('Payment successful! Your subscription is now active.')
                setTimeout(() => navigate('/dashboard'), 3000)
            } else {
                setStatus('error')
                setMessage(response.message || 'Payment verification failed')
            }
        } catch (error) {
            console.error('Payment verification error:', error)
            setStatus('error')
            setMessage(error.response?.data?.message || 'Payment verification failed')
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
