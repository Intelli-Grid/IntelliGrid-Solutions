import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import SEO from '../components/common/SEO'

function RefundPolicyPage() {
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space">
            <SEO
                title="Refund Policy | IntelliGrid - 30-Day Money-Back Guarantee"
                description="IntelliGrid offers a 30-day money-back guarantee on all subscriptions. Learn about our hassle-free refund process and customer-first approach."
                keywords="refund policy, money-back guarantee, IntelliGrid refund, subscription refund, cancellation policy"
                canonicalUrl="https://www.intelligrid.online/refund-policy"
            />
            <div className="max-w-4xl mx-auto px-6 py-16">
                {/* Header */}
                <div className="mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6">
                        <CreditCard className="w-4 h-4 text-accent-cyan" />
                        <span className="text-sm font-medium text-white">Refund & Cancellation</span>
                    </div>

                    <h1 className="text-5xl font-extrabold text-white mb-4">Refund Policy</h1>
                    <p className="text-gray-400 text-lg">Last updated: February 07, 2026</p>
                </div>

                <div className="prose prose-lg prose-invert max-w-none space-y-6">
                    <h2 className="text-2xl font-bold mt-8 mb-4 text-white">Our Commitment</h2>
                    <p className="text-gray-300">At IntelliGrid, we want you to be completely satisfied with your subscription.</p>

                    <h2 className="text-2xl font-bold mt-8 mb-4 text-white">30-Day Money-Back Guarantee</h2>
                    <p className="text-gray-300">We offer a <strong>30-day money-back guarantee</strong> on all subscription plans.</p>

                    <h3 className="text-xl font-semibold mt-6 mb-3 text-white">Eligibility</h3>
                    <ul className="list-disc pl-6 space-y-2 text-gray-300">
                        <li>Request must be made within 30 days of purchase</li>
                        <li>Applies to first-time subscribers only</li>
                        <li>One refund per customer</li>
                    </ul>

                    <h3 className="text-xl font-semibold mt-6 mb-3 text-white">How to Request a Refund</h3>
                    <ol className="list-decimal pl-6 space-y-2 text-gray-300">
                        <li>Email us at: <a href="mailto:support@intelligrid.store" className="text-accent-cyan hover:underline">support@intelligrid.store</a></li>
                        <li>Include your order ID and reason for refund</li>
                        <li>We'll process your request within 3-5 business days</li>
                    </ol>

                    <h3 className="text-xl font-semibold mt-6 mb-3 text-white">Refund Process</h3>
                    <ul className="list-disc pl-6 space-y-2 text-gray-300">
                        <li>Refunds are issued to the original payment method</li>
                        <li>Processing time: 5-10 business days</li>
                        <li>You'll receive email confirmation once processed</li>
                    </ul>

                    <h3 className="text-xl font-semibold mt-6 mb-3 text-white">Non-Refundable Items</h3>
                    <ul className="list-disc pl-6 space-y-2 text-gray-300">
                        <li>Subscriptions older than 30 days</li>
                        <li>Promotional or discounted subscriptions (unless required by law)</li>
                        <li>Subscriptions cancelled after the renewal date</li>
                    </ul>

                    <h2 className="text-2xl font-bold mt-8 mb-4 text-white">Cancellation</h2>
                    <p className="text-gray-300">You can cancel your subscription anytime from your dashboard. Cancellation takes effect at the end of your current billing period.</p>

                    <h2 className="text-2xl font-bold mt-8 mb-4 text-white">Questions?</h2>
                    <p className="text-gray-300">Contact us at <a href="mailto:support@intelligrid.store" className="text-accent-cyan hover:underline">support@intelligrid.store</a></p>

                    <div className="bg-white/5 p-6 rounded-lg mt-8 border border-white/10">
                        <p className="font-semibold mb-2 text-white">IntelliGrid Solutions</p>
                        <p className="text-gray-300">Email: <a href="mailto:support@intelligrid.store" className="text-accent-cyan hover:underline">support@intelligrid.store</a></p>
                        <p className="text-gray-300">Website: <a href="https://www.intelligrid.online" className="text-accent-cyan hover:underline">www.intelligrid.online</a></p>
                    </div>

                    <div className="mt-12 pt-6 border-t border-white/10">
                        <p className="text-sm text-gray-400">
                            Related Documents: <Link to="/terms-of-service" className="text-accent-cyan hover:underline">Terms of Service</Link> | <Link to="/privacy-policy" className="text-accent-cyan hover:underline">Privacy Policy</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RefundPolicyPage
