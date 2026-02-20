import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle, Loader, Mail } from 'lucide-react'
import SEO from '../components/common/SEO'
import { newsletterService } from '../services'

/**
 * UnsubscribePage
 * Handles email unsubscribe requests linked from the email footer.
 * URL: /unsubscribe?email=user@example.com&type=transactional|marketing
 */
export default function UnsubscribePage() {
    const [searchParams] = useSearchParams()
    const email = searchParams.get('email') || ''
    const type = searchParams.get('type') || 'marketing'

    const [status, setStatus] = useState('idle') // idle | loading | success | error
    const [message, setMessage] = useState('')

    const handleUnsubscribe = async () => {
        if (!email) {
            setStatus('error')
            setMessage('No email address found in the unsubscribe link. Please contact support.')
            return
        }

        setStatus('loading')

        try {
            await newsletterService.unsubscribe(email, type)
            setStatus('success')
            setMessage(`You've been successfully unsubscribed from IntelliGrid ${type} emails.`)
        } catch (err) {
            console.error('Unsubscribe error:', err)
            setStatus('error')
            setMessage(
                err?.response?.data?.message ||
                'Something went wrong. Please try again or contact support@intelligrid.online.'
            )
        }
    }

    // Auto-trigger unsubscribe if email + type present in URL
    useEffect(() => {
        if (email) {
            handleUnsubscribe()
        } else {
            setStatus('error')
            setMessage('Invalid unsubscribe link — email address is missing.')
        }
        // Only run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <SEO
                title="Unsubscribe | IntelliGrid"
                description="Manage your IntelliGrid email preferences."
                noIndex={true}
            />

            <div className="min-h-screen flex items-center justify-center px-4 py-24">
                <div className="w-full max-w-md">
                    <div className="glass-card rounded-2xl p-10 text-center border border-white/10 shadow-2xl">

                        {/* Loading state */}
                        {status === 'loading' && (
                            <>
                                <div className="flex justify-center mb-6">
                                    <Loader className="w-16 h-16 text-accent-cyan animate-spin" />
                                </div>
                                <h1 className="text-2xl font-bold text-white mb-3">Processing…</h1>
                                <p className="text-gray-400">Removing {email} from our mailing list.</p>
                            </>
                        )}

                        {/* Idle state (shouldn't normally show, but just in case) */}
                        {status === 'idle' && (
                            <>
                                <div className="flex justify-center mb-6">
                                    <Mail className="w-16 h-16 text-accent-cyan" />
                                </div>
                                <h1 className="text-2xl font-bold text-white mb-3">Unsubscribe</h1>
                                <p className="text-gray-400 mb-6">Click below to unsubscribe <strong className="text-white">{email}</strong> from IntelliGrid emails.</p>
                                <button
                                    onClick={handleUnsubscribe}
                                    className="btn-primary w-full"
                                >
                                    Confirm Unsubscribe
                                </button>
                            </>
                        )}

                        {/* Success state */}
                        {status === 'success' && (
                            <>
                                <div className="flex justify-center mb-6">
                                    <CheckCircle className="w-16 h-16 text-green-400" />
                                </div>
                                <h1 className="text-2xl font-bold text-white mb-3">Unsubscribed</h1>
                                <p className="text-gray-400 mb-2">{message}</p>
                                <p className="text-gray-500 text-sm mb-8">
                                    Note: You may still receive essential transactional emails related to your account and purchases.
                                </p>
                                <Link
                                    to="/"
                                    className="inline-block px-6 py-3 bg-gradient-to-r from-accent-cyan to-accent-purple text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                                >
                                    Back to IntelliGrid
                                </Link>
                            </>
                        )}

                        {/* Error state */}
                        {status === 'error' && (
                            <>
                                <div className="flex justify-center mb-6">
                                    <XCircle className="w-16 h-16 text-red-400" />
                                </div>
                                <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
                                <p className="text-gray-400 mb-8">{message}</p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleUnsubscribe}
                                        className="px-6 py-3 bg-gradient-to-r from-accent-cyan to-accent-purple text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                                    >
                                        Try Again
                                    </button>
                                    <Link
                                        to="/"
                                        className="px-6 py-3 bg-white/10 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300"
                                    >
                                        Back to Home
                                    </Link>
                                </div>
                            </>
                        )}

                    </div>
                </div>
            </div>
        </>
    )
}
