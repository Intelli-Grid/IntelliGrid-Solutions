import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X, Sparkles, Star, Zap, TrendingUp, Shield, CreditCard, Clock, Loader2 } from 'lucide-react'
import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { paymentService } from '../services'
import SEO from '../components/common/SEO'

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
        icon: Star,
    },
    {
        id: 'pro_monthly',
        name: 'Pro Monthly',
        price: 9.99,
        period: 'month',
        description: 'For power users and professionals',
        features: [
            'Everything in Free',
            'Unlimited favorites',
            'Advanced search filters',
            'Detailed tool comparisons',
            'Priority support (24h response)',
            'Ad-free experience',
            'Early access to new tools',
            'Export favorites list',
        ],
        highlighted: true,
        badge: 'Most Popular',
        icon: Zap,
        savings: null,
    },
    {
        id: 'pro_yearly',
        name: 'Pro Yearly',
        price: 99.99,
        period: 'year',
        monthlyPrice: 8.33,
        description: 'Best value - Save 17%',
        features: [
            'Everything in Pro Monthly',
            '2 months free ($19.98 value)',
            'Priority support (12h response)',
            'Early access to new tools',
            'Ad-free experience',
            'Export favorites list',
            'Annual feature roadmap input',
        ],
        badge: 'Best Value',
        icon: TrendingUp,
        savings: '17%',
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
        <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space">
            <SEO
                title="Pricing - IntelliGrid Pro | Unlock Premium AI Tools"
                description="Choose the perfect plan for your needs. Get unlimited access to 3,690+ AI tools, advanced search, and priority support. Start free or upgrade to Pro for $9.99/month."
                keywords="AI tools pricing, IntelliGrid Pro, AI directory subscription, premium AI tools, AI tools membership"
                canonicalUrl="https://www.intelligrid.online/pricing"
            />
            <div className="container mx-auto px-6 py-16">
                {/* Header */}
                <div className="mx-auto mb-16 max-w-3xl text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6">
                        <Sparkles className="w-4 h-4 text-accent-cyan" />
                        <span className="text-sm font-medium text-white">Simple, Transparent Pricing</span>
                    </div>

                    <h1 className="mb-4 text-5xl md:text-6xl font-extrabold text-white leading-tight">
                        Choose Your
                        <span className="block mt-2 bg-gradient-to-r from-accent-cyan via-accent-purple to-accent-rose bg-clip-text text-transparent">
                            Perfect Plan
                        </span>
                    </h1>
                    <p className="text-xl text-gray-400">
                        Upgrade, downgrade, or cancel anytime. No questions asked.
                    </p>
                </div>

                {/* Payment Method Selection */}
                {isSignedIn && (
                    <div className="mx-auto mb-12 max-w-md">
                        <label className="mb-3 block text-center text-sm font-medium text-gray-300">
                            Select Payment Method
                        </label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setPaymentMethod('paypal')}
                                className={`flex-1 rounded-xl border p-4 transition-all duration-300 ${paymentMethod === 'paypal'
                                    ? 'border-accent-cyan bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 shadow-glow-cyan'
                                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                    }`}
                            >
                                <CreditCard className="mx-auto mb-2 h-6 w-6 text-white" />
                                <div className="text-sm font-semibold text-white">PayPal</div>
                                <div className="text-xs text-gray-400 mt-1">Cards & PayPal</div>
                            </button>
                            {/* Cashfree temporarily disabled - sandbox environment issues */}
                            {/* <button
                                onClick={() => setPaymentMethod('cashfree')}
                                className={`flex-1 rounded-xl border p-4 transition-all duration-300 ${paymentMethod === 'cashfree'
                                    ? 'border-accent-emerald bg-gradient-to-r from-accent-emerald/20 to-accent-cyan/20 shadow-glow-emerald'
                                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                                    }`}
                            >
                                <CreditCard className="mx-auto mb-2 h-6 w-6 text-white" />
                                <div className="text-sm font-semibold text-white">Cashfree</div>
                                <div className="text-xs text-gray-400 mt-1">UPI, Cards, Net Banking</div>
                            </button> */}
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mx-auto mb-8 max-w-md rounded-xl border border-error/30 bg-error/10 p-4 text-center text-sm text-error animate-fade-in">
                        {error}
                    </div>
                )}

                {/* Pricing Cards */}
                <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3 mb-16">
                    {plans.map((plan) => {
                        const Icon = plan.icon
                        return (
                            <div
                                key={plan.id}
                                className={`group relative rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-2 ${plan.highlighted
                                    ? 'border-accent-purple bg-gradient-to-br from-accent-purple/10 to-accent-cyan/10 shadow-2xl shadow-accent-purple/20'
                                    : 'border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20 hover:shadow-glow-cyan'
                                    }`}
                            >
                                {/* Badge */}
                                {plan.badge && (
                                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-lg ${plan.highlighted
                                        ? 'bg-gradient-to-r from-accent-purple to-accent-cyan'
                                        : 'bg-gradient-to-r from-accent-emerald to-accent-cyan'
                                        }`}>
                                        {plan.badge}
                                    </div>
                                )}

                                {/* Savings Badge */}
                                {plan.savings && (
                                    <div className="absolute -top-4 -right-4 rounded-full bg-gradient-to-r from-accent-amber to-accent-rose px-3 py-1.5 text-xs font-bold text-white shadow-lg animate-pulse">
                                        Save {plan.savings}
                                    </div>
                                )}

                                {/* Icon */}
                                <div className={`mb-6 inline-flex p-3 rounded-xl ${plan.highlighted
                                    ? 'bg-gradient-to-r from-accent-purple to-accent-cyan'
                                    : 'bg-white/10'
                                    }`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>

                                {/* Plan Info */}
                                <div className="mb-6">
                                    <h3 className="mb-2 text-2xl font-bold text-white">{plan.name}</h3>
                                    <p className="text-sm text-gray-400">{plan.description}</p>
                                </div>

                                {/* Price */}
                                <div className="mb-6">
                                    <div className="flex items-baseline">
                                        <span className="text-5xl font-bold text-white">${plan.price}</span>
                                        <span className="ml-2 text-gray-400">/{plan.period}</span>
                                    </div>
                                    {plan.monthlyPrice && (
                                        <p className="text-sm text-accent-emerald mt-1">
                                            ${plan.monthlyPrice}/month when billed annually
                                        </p>
                                    )}
                                </div>

                                {/* Features */}
                                <ul className="mb-8 space-y-3">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <Check className={`mt-0.5 h-5 w-5 flex-shrink-0 ${plan.highlighted ? 'text-accent-cyan' : 'text-accent-emerald'
                                                }`} />
                                            <span className="text-sm text-gray-300">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <button
                                    onClick={() => handleSubscribe(plan.id)}
                                    disabled={loading === plan.id || plan.id === 'free'}
                                    className={`w-full rounded-xl py-3 font-semibold transition-all duration-300 ${plan.highlighted
                                        ? 'bg-gradient-to-r from-accent-cyan to-accent-purple text-white hover:shadow-lg hover:scale-105 disabled:opacity-50'
                                        : 'border border-white/20 bg-white/10 text-white hover:bg-white/20 disabled:opacity-50'
                                        } disabled:cursor-not-allowed`}
                                >
                                    {loading === plan.id ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Processing...</span>
                                        </span>
                                    ) : plan.id === 'free' ? (
                                        'Current Plan'
                                    ) : (
                                        `Get Started with ${plan.name}`
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>

                {/* Trust Signals */}
                <div className="mx-auto max-w-4xl mb-16">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                            <Shield className="w-8 h-8 text-accent-emerald mx-auto mb-3" />
                            <h3 className="font-semibold text-white mb-2">30-Day Guarantee</h3>
                            <p className="text-sm text-gray-400">Full refund if you're not satisfied</p>
                        </div>
                        <div className="text-center p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                            <CreditCard className="w-8 h-8 text-accent-cyan mx-auto mb-3" />
                            <h3 className="font-semibold text-white mb-2">Secure Payments</h3>
                            <p className="text-sm text-gray-400">SSL encrypted transactions</p>
                        </div>
                        <div className="text-center p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
                            <Zap className="w-8 h-8 text-accent-purple mx-auto mb-3" />
                            <h3 className="font-semibold text-white mb-2">Instant Access</h3>
                            <p className="text-sm text-gray-400">Upgrade takes effect immediately</p>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mx-auto mt-24 max-w-3xl">
                    <h2 className="mb-8 text-center text-3xl font-bold text-white">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-4">
                        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-white/20 transition-all">
                            <h3 className="mb-2 font-semibold text-white">Can I change plans later?</h3>
                            <p className="text-sm text-gray-400">
                                Yes! You can upgrade, downgrade, or cancel your subscription at any time from your dashboard. Changes take effect immediately.
                            </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-white/20 transition-all">
                            <h3 className="mb-2 font-semibold text-white">What payment methods do you accept?</h3>
                            <p className="text-sm text-gray-400">
                                We accept PayPal (credit/debit cards) and Cashfree (UPI, net banking, cards, wallets). All payments are processed securely.
                            </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-white/20 transition-all">
                            <h3 className="mb-2 font-semibold text-white">Is there a free trial?</h3>
                            <p className="text-sm text-gray-400">
                                Our Free plan is available forever with no credit card required. You can upgrade to Pro anytime to unlock additional features.
                            </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 hover:border-white/20 transition-all">
                            <h3 className="mb-2 font-semibold text-white">What about refunds?</h3>
                            <p className="text-sm text-gray-400">
                                We offer a 30-day money-back guarantee for first-time subscribers. If you're not satisfied, contact us for a full refund. See our <Link to="/refund-policy" className="text-accent-cyan hover:text-accent-purple transition-colors">Refund Policy</Link> for details.
                            </p>
                        </div>
                    </div>

                    {/* Link to Full FAQ */}
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
