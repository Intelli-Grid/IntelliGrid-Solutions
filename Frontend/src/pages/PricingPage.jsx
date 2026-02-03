import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { paymentService } from '../services'
import { Check, Loader2, CreditCard } from 'lucide-react'

const plans = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        period: 'forever',
        description: 'Perfect for getting started',
        features: [
            'Browse all AI tools',
            'Basic search functionality',
            'Save up to 10 favorites',
            'Community support',
        ],
    },
    {
        id: 'pro_monthly',
        name: 'Pro',
        price: 9,
        period: 'month',
        description: 'For power users and professionals',
        features: [
            'Everything in Free',
            'Unlimited favorites',
            'Advanced search filters',
            'Priority support',
            'Early access to new tools',
            'Ad-free experience',
        ],
        highlighted: true,
    },
    {
        id: 'pro_yearly',
        name: 'Pro Yearly',
        price: 89,
        period: 'year',
        description: 'Save 17% with annual billing',
        features: [
            'Everything in Pro Monthly',
            '2 months free',
            'Priority support',
            'Early access to new tools',
            'Ad-free experience',
        ],
    },
]

export default function PricingPage() {
    const { user, isSignedIn } = useUser()
    const [loading, setLoading] = useState(null)
    const [error, setError] = useState(null)
    const [paymentMethod, setPaymentMethod] = useState('paypal')

    const handleSubscribe = async (planId) => {
        if (!isSignedIn) {
            window.location.href = '/sign-in?redirect_url=/pricing'
            return
        }

        if (planId === 'free') {
            return
        }

        try {
            setLoading(planId)
            setError(null)

            if (paymentMethod === 'paypal') {
                const response = await paymentService.createPayPalOrder(planId)
                console.log('PayPal response:', response)

                if (response.approvalUrl) {
                    window.location.href = response.approvalUrl
                } else {
                    setError('Failed to create PayPal order. Please try again.')
                }
            } else if (paymentMethod === 'cashfree') {
                const response = await paymentService.createCashfreeOrder(planId)
                console.log('Cashfree response:', response)

                if (response.payment_session_id && response.payment_link) {
                    window.location.href = response.payment_link
                } else if (response.paymentUrl) {
                    window.location.href = response.paymentUrl
                } else {
                    setError('Failed to create Cashfree order. Please try again.')
                    console.error('Missing payment URL in response:', response)
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
        <div className="container mx-auto px-4 py-16">
            {/* Header */}
            <div className="mx-auto mb-16 max-w-3xl text-center">
                <h1 className="mb-4 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-5xl font-bold text-transparent">
                    Simple, Transparent Pricing
                </h1>
                <p className="text-lg text-gray-400">
                    Choose the perfect plan for your needs. Upgrade, downgrade, or cancel anytime.
                </p>
            </div>

            {/* Payment Method Selection */}
            {isSignedIn && (
                <div className="mx-auto mb-8 max-w-md">
                    <label className="mb-2 block text-center text-sm text-gray-400">
                        Select Payment Method
                    </label>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setPaymentMethod('paypal')}
                            className={`flex-1 rounded-lg border p-4 transition ${paymentMethod === 'paypal'
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                        >
                            <CreditCard className="mx-auto mb-2 h-6 w-6 text-white" />
                            <div className="text-sm font-medium text-white">PayPal</div>
                        </button>
                        <button
                            onClick={() => setPaymentMethod('cashfree')}
                            className={`flex-1 rounded-lg border p-4 transition ${paymentMethod === 'cashfree'
                                ? 'border-purple-500 bg-purple-500/10'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                }`}
                        >
                            <CreditCard className="mx-auto mb-2 h-6 w-6 text-white" />
                            <div className="text-sm font-medium text-white">Cashfree</div>
                        </button>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mx-auto mb-8 max-w-md rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* Pricing Cards */}
            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`relative rounded-2xl border p-8 transition-all duration-300 ${plan.highlighted
                            ? 'border-purple-500 bg-gradient-to-br from-purple-500/10 to-blue-500/10 shadow-xl shadow-purple-500/20'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                            }`}
                    >
                        {plan.highlighted && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-1 text-sm font-medium text-white">
                                Most Popular
                            </div>
                        )}

                        <div className="mb-6">
                            <h3 className="mb-2 text-2xl font-bold text-white">{plan.name}</h3>
                            <p className="text-sm text-gray-400">{plan.description}</p>
                        </div>

                        <div className="mb-6">
                            <div className="flex items-baseline">
                                <span className="text-5xl font-bold text-white">${plan.price}</span>
                                <span className="ml-2 text-gray-400">/{plan.period}</span>
                            </div>
                        </div>

                        <ul className="mb-8 space-y-4">
                            {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-start space-x-3">
                                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-400" />
                                    <span className="text-sm text-gray-300">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={loading === plan.id || plan.id === 'free'}
                            className={`w-full rounded-lg py-3 font-medium transition ${plan.highlighted
                                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90 disabled:opacity-50'
                                : 'border border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-50'
                                } disabled:cursor-not-allowed`}
                        >
                            {loading === plan.id ? (
                                <span className="flex items-center justify-center space-x-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Processing...</span>
                                </span>
                            ) : plan.id === 'free' ? (
                                'Current Plan'
                            ) : (
                                `Subscribe with ${paymentMethod === 'paypal' ? 'PayPal' : 'Cashfree'}`
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* FAQ Section */}
            <div className="mx-auto mt-24 max-w-3xl">
                <h2 className="mb-8 text-center text-3xl font-bold text-white">
                    Frequently Asked Questions
                </h2>
                <div className="space-y-6">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                        <h3 className="mb-2 font-semibold text-white">Can I change plans later?</h3>
                        <p className="text-sm text-gray-400">
                            Yes! You can upgrade, downgrade, or cancel your subscription at any time. Changes
                            take effect immediately.
                        </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                        <h3 className="mb-2 font-semibold text-white">What payment methods do you accept?</h3>
                        <p className="text-sm text-gray-400">
                            We accept PayPal and Cashfree. Both support major credit cards, debit cards, and other
                            popular payment methods.
                        </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                        <h3 className="mb-2 font-semibold text-white">Is there a free trial?</h3>
                        <p className="text-sm text-gray-400">
                            Our Free plan is available forever with no credit card required. You can upgrade to
                            Pro anytime to unlock additional features.
                        </p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                        <h3 className="mb-2 font-semibold text-white">What about refunds?</h3>
                        <p className="text-sm text-gray-400">
                            We offer a 30-day money-back guarantee. If you're not satisfied, contact us for a
                            full refund.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
