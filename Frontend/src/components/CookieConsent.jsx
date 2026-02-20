import { useState, useEffect } from 'react'
import { X, Cookie } from 'lucide-react'
import { initGA } from '../utils/analytics'

export default function CookieConsent() {
    const [showBanner, setShowBanner] = useState(false)

    useEffect(() => {
        const consent = localStorage.getItem('cookieConsent')

        if (!consent) {
            // Show banner after 1s delay
            setTimeout(() => setShowBanner(true), 1000)
        } else if (consent === 'accepted') {
            // User already accepted in a previous session — initialize analytics now
            initGA()
        }
        // If 'declined', do nothing — analytics stays off
    }, [])

    const acceptCookies = () => {
        localStorage.setItem('cookieConsent', 'accepted')
        localStorage.setItem('cookieConsentDate', new Date().toISOString())
        setShowBanner(false)
        // ✅ Bug #4 Fix: GA4 only fires AFTER user explicitly accepts cookies (GDPR)
        initGA()
    }

    const declineCookies = () => {
        localStorage.setItem('cookieConsent', 'declined')
        localStorage.setItem('cookieConsentDate', new Date().toISOString())
        setShowBanner(false)
        // Analytics is NOT initialized — user declined
    }

    if (!showBanner) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-slide-up">
            <div className="max-w-7xl mx-auto">
                <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl">
                    {/* Close button — treated as decline */}
                    <button
                        onClick={declineCookies}
                        className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
                        aria-label="Close cookie banner and decline"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 pr-12">
                        {/* Icon */}
                        <div className="flex-shrink-0 p-3 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-xl">
                            <Cookie className="w-6 h-6 text-white" />
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-2">
                                We value your privacy
                            </h3>
                            <p className="text-sm text-gray-300 leading-relaxed">
                                We use cookies to enhance your browsing experience, analyze site traffic, and personalize content.
                                By clicking <strong>Accept All</strong>, you consent to analytics cookies per our{' '}
                                <a
                                    href="/privacy-policy"
                                    className="text-accent-cyan hover:text-accent-purple transition-colors underline"
                                >
                                    Privacy Policy
                                </a>
                                . Essential cookies are always active.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <button
                                id="cookie-accept-btn"
                                onClick={acceptCookies}
                                className="px-6 py-3 bg-gradient-to-r from-accent-cyan to-accent-purple text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 whitespace-nowrap"
                            >
                                Accept All
                            </button>
                            <button
                                id="cookie-decline-btn"
                                onClick={declineCookies}
                                className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 whitespace-nowrap"
                            >
                                Decline
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
