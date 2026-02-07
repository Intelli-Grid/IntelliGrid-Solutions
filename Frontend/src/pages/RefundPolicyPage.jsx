import { useEffect } from 'react'

function RefundPolicyPage() {
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold mb-4">Refund Policy</h1>
            <p className="text-gray-600 mb-8">Last updated: February 07, 2026</p>

            <div className="prose prose-lg max-w-none">
                <h2>Our Commitment</h2>
                <p>At IntelliGrid, we want you to be completely satisfied with your subscription.</p>

                <h2>30-Day Money-Back Guarantee</h2>
                <p>We offer a <strong>30-day money-back guarantee</strong> on all subscription plans.</p>

                <h3>Eligibility</h3>
                <ul>
                    <li>Request must be made within 30 days of purchase</li>
                    <li>Applies to first-time subscribers only</li>
                    <li>One refund per customer</li>
                </ul>

                <h3>How to Request a Refund</h3>
                <ol>
                    <li>Email us at: <a href="mailto:support@intelligrid.store" className="text-blue-600 hover:underline">support@intelligrid.store</a></li>
                    <li>Include your order ID and reason for refund</li>
                    <li>We'll process your request within 3-5 business days</li>
                </ol>

                <h3>Refund Process</h3>
                <ul>
                    <li>Refunds are issued to the original payment method</li>
                    <li>Processing time: 5-10 business days</li>
                    <li>You'll receive email confirmation once processed</li>
                </ul>

                <h3>Non-Refundable Items</h3>
                <ul>
                    <li>Subscriptions older than 30 days</li>
                    <li>Promotional or discounted subscriptions (unless required by law)</li>
                    <li>Subscriptions cancelled after the renewal date</li>
                </ul>

                <h2>Cancellation</h2>
                <p>You can cancel your subscription anytime from your dashboard. Cancellation takes effect at the end of your current billing period.</p>

                <h2>Questions?</h2>
                <p>Contact us at <a href="mailto:support@intelligrid.store" className="text-blue-600 hover:underline">support@intelligrid.store</a></p>

                <hr className="my-8" />

                <p className="text-center text-gray-600">
                    <strong>IntelliGrid Solutions</strong><br />
                    <a href="https://www.intelligrid.online" className="text-blue-600 hover:underline">www.intelligrid.online</a>
                </p>
            </div>
        </div>
    )
}

export default RefundPolicyPage
