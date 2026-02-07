import { useEffect } from 'react'
import { Link } from 'react-router-dom'

function TermsOfServicePage() {
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-gray-600 mb-8">Last updated: February 07, 2026</p>

            <div className="prose prose-lg max-w-none space-y-6">
                <p className="text-lg">These Terms of Service ("Terms") govern your access to and use of IntelliGrid Solutions' AI tools directory platform at www.intelligrid.online (the "Service").</p>

                <p><strong>By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access the Service.</strong></p>

                <h2 className="text-2xl font-bold mt-8 mb-4">1. Service Description</h2>

                <p>IntelliGrid is an AI tools directory platform that provides:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Curated database of AI tools and services</li>
                    <li>Search and discovery features powered by advanced algorithms</li>
                    <li>Tool reviews, ratings, and comparisons</li>
                    <li>Subscription-based access to premium features</li>
                    <li>User accounts with personalized recommendations</li>
                    <li>Tool submission and review capabilities</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8 mb-4">2. Eligibility</h2>

                <p>To use the Service, you must:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Be at least 18 years old</li>
                    <li>Have the legal capacity to enter into binding contracts</li>
                    <li>Not be prohibited from using the Service under applicable laws</li>
                    <li>Provide accurate and complete registration information</li>
                </ul>

                <p className="mt-4"><strong>Minors (13-17):</strong> Users between 13-17 years old must have explicit parental or guardian consent to use the Service.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">3. Account Registration</h2>

                <h3 className="text-xl font-semibold mt-6 mb-3">3.1 Account Creation</h3>
                <p>When you create an account, you agree to:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Provide accurate, current, and complete information</li>
                    <li>Maintain and update your information to keep it accurate</li>
                    <li>Keep your password secure and confidential</li>
                    <li>Notify us immediately of any unauthorized account access</li>
                    <li>Accept responsibility for all activities under your account</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">3.2 Account Security</h3>
                <p>You are solely responsible for maintaining the confidentiality of your account credentials. We are not liable for any loss or damage arising from your failure to protect your account information.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">4. Subscription Plans and Pricing</h2>

                <h3 className="text-xl font-semibold mt-6 mb-3">4.1 Subscription Tiers</h3>

                <div className="bg-gray-50 p-6 rounded-lg my-4">
                    <p className="font-semibold mb-3">Free Tier</p>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Basic access to AI tools directory</li>
                        <li>Limited search functionality</li>
                        <li>View tool information and basic details</li>
                    </ul>
                </div>

                <div className="bg-blue-50 p-6 rounded-lg my-4">
                    <p className="font-semibold mb-3">Pro Tier (Paid Subscription)</p>
                    <ul className="list-disc pl-6 space-y-1 text-sm">
                        <li>Unlimited access to all AI tools</li>
                        <li>Advanced search filters and sorting</li>
                        <li>Save searches and create favorites</li>
                        <li>Detailed tool comparisons</li>
                        <li>Priority customer support</li>
                        <li>Ad-free experience</li>
                    </ul>
                </div>

                <h3 className="text-xl font-semibold mt-6 mb-3">4.2 Billing and Payment</h3>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Payment Methods:</strong> We accept payments via PayPal and Cashfree</li>
                    <li><strong>Billing Cycle:</strong> Monthly or annual, depending on your selected plan</li>
                    <li><strong>Auto-Renewal:</strong> Subscriptions automatically renew unless cancelled</li>
                    <li><strong>Payment Processing:</strong> All payments are processed securely by our payment partners</li>
                    <li><strong>Currency:</strong> Prices are displayed in USD or INR based on your location</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">4.3 Price Changes</h3>
                <p>We reserve the right to modify subscription prices. We will:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Provide at least 30 days advance notice of price changes</li>
                    <li>Notify you via email and platform notification</li>
                    <li>Honor your current rate until your next renewal after the notice period</li>
                    <li>Allow you to cancel before the price change takes effect</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">4.4 Cancellation</h3>
                <p>You may cancel your subscription at any time:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Via your account settings dashboard</li>
                    <li>By contacting support@intelligrid.store</li>
                    <li>Cancellation takes effect at the end of your current billing period</li>
                    <li>You retain access until the end of the paid period</li>
                    <li>No refund for the current billing period (see Refund Policy for exceptions)</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">4.5 Refund Policy</h3>
                <p>We offer a 30-day money-back guarantee on first-time subscriptions. For complete details, see our <Link to="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</Link>.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">5. User Content and Conduct</h2>

                <h3 className="text-xl font-semibold mt-6 mb-3">5.1 User-Generated Content</h3>
                <p>You may submit content including:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Tool reviews and ratings</li>
                    <li>Comments and feedback</li>
                    <li>Tool submissions and suggestions</li>
                    <li>Profile information and preferences</li>
                </ul>

                <p className="mt-4">By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, reproduce, and distribute your content on the platform.</p>

                <h3 className="text-xl font-semibold mt-6 mb-3">5.2 Content Guidelines</h3>
                <p>Your content must:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Be honest, accurate, and based on your genuine experience</li>
                    <li>Not contain false, misleading, or deceptive information</li>
                    <li>Not violate any third-party rights (copyright, trademark, privacy)</li>
                    <li>Not contain offensive, abusive, or discriminatory language</li>
                    <li>Not include spam, promotional content, or affiliate links</li>
                    <li>Not contain malware, viruses, or malicious code</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">5.3 Content Moderation</h3>
                <p>We reserve the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Review, edit, or remove any user content</li>
                    <li>Reject tool submissions that don't meet our quality standards</li>
                    <li>Remove reviews that violate our guidelines</li>
                    <li>Suspend or terminate accounts for policy violations</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8 mb-4">6. Prohibited Uses</h2>

                <p>You agree NOT to:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Violate Laws:</strong> Use the Service for any illegal purpose or in violation of any laws</li>
                    <li><strong>Scrape Data:</strong> Use automated tools (bots, scrapers, crawlers) to extract data</li>
                    <li><strong>Reverse Engineer:</strong> Attempt to reverse engineer, decompile, or hack the platform</li>
                    <li><strong>Circumvent Security:</strong> Bypass any security measures or access restrictions</li>
                    <li><strong>Create Fake Accounts:</strong> Register multiple accounts or impersonate others</li>
                    <li><strong>Manipulate Reviews:</strong> Post fake reviews or manipulate ratings</li>
                    <li><strong>Spam:</strong> Send unsolicited messages or promotional content</li>
                    <li><strong>Interfere:</strong> Disrupt or interfere with the Service or servers</li>
                    <li><strong>Resell Access:</strong> Sell, rent, or share your account with others</li>
                    <li><strong>Harmful Content:</strong> Upload viruses, malware, or malicious code</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8 mb-4">7. Intellectual Property</h2>

                <h3 className="text-xl font-semibold mt-6 mb-3">7.1 Our Intellectual Property</h3>
                <p>The Service and its content (excluding user content) are owned by IntelliGrid Solutions and protected by copyright, trademark, and other intellectual property laws. This includes:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Platform design, code, and functionality</li>
                    <li>IntelliGrid logo, branding, and trademarks</li>
                    <li>Curated tool database and categorization</li>
                    <li>Search algorithms and recommendation systems</li>
                    <li>Original content, articles, and guides</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">7.2 Tool Provider Content</h3>
                <p>Tool logos, descriptions, and screenshots are owned by their respective providers. We display this content under license for the purpose of operating the directory.</p>

                <h3 className="text-xl font-semibold mt-6 mb-3">7.3 DMCA Policy</h3>
                <p>If you believe content on our platform infringes your copyright, contact us at support@intelligrid.store with:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Description of the copyrighted work</li>
                    <li>URL of the infringing content</li>
                    <li>Your contact information</li>
                    <li>Statement of good faith belief</li>
                    <li>Statement of accuracy under penalty of perjury</li>
                    <li>Physical or electronic signature</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8 mb-4">8. Third-Party Tools and Services</h2>

                <p><strong>Disclaimer:</strong> IntelliGrid is a directory platform. We do not develop, own, or operate the AI tools listed on our platform.</p>

                <ul className="list-disc pl-6 space-y-2">
                    <li>We are not responsible for the functionality, quality, or availability of third-party tools</li>
                    <li>Tool providers are solely responsible for their products and services</li>
                    <li>We do not guarantee the accuracy of tool information</li>
                    <li>Your use of third-party tools is subject to their own terms and policies</li>
                    <li>We are not liable for any issues arising from your use of listed tools</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8 mb-4">9. Disclaimers and Warranties</h2>

                <p className="font-semibold">THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.</p>

                <p>We disclaim all warranties, express or implied, including:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Merchantability and fitness for a particular purpose</li>
                    <li>Non-infringement of third-party rights</li>
                    <li>Accuracy, reliability, or completeness of information</li>
                    <li>Uninterrupted or error-free service</li>
                    <li>Security of data transmission</li>
                </ul>

                <p className="mt-4">We do not warrant that:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>The Service will meet your specific requirements</li>
                    <li>Tool information is always current or accurate</li>
                    <li>Defects will be corrected</li>
                    <li>The Service is free from viruses or harmful components</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8 mb-4">10. Limitation of Liability</h2>

                <p className="font-semibold">TO THE MAXIMUM EXTENT PERMITTED BY LAW, INTELLIGRID SOLUTIONS SHALL NOT BE LIABLE FOR:</p>

                <ul className="list-disc pl-6 space-y-2">
                    <li>Indirect, incidental, special, consequential, or punitive damages</li>
                    <li>Loss of profits, revenue, data, or business opportunities</li>
                    <li>Service interruptions or data loss</li>
                    <li>Third-party tool failures or issues</li>
                    <li>Unauthorized access to your account</li>
                    <li>Errors or omissions in tool information</li>
                </ul>

                <p className="mt-4"><strong>Maximum Liability:</strong> Our total liability shall not exceed the amount you paid us in the 12 months preceding the claim, or $100 USD, whichever is greater.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">11. Indemnification</h2>

                <p>You agree to indemnify and hold harmless IntelliGrid Solutions, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Your use of the Service</li>
                    <li>Your violation of these Terms</li>
                    <li>Your violation of any third-party rights</li>
                    <li>Your user-generated content</li>
                    <li>Your use of third-party tools listed on the platform</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8 mb-4">12. Termination</h2>

                <h3 className="text-xl font-semibold mt-6 mb-3">12.1 Termination by You</h3>
                <p>You may terminate your account at any time by:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Cancelling your subscription via account settings</li>
                    <li>Contacting support@intelligrid.store to request account deletion</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">12.2 Termination by Us</h3>
                <p>We may suspend or terminate your account immediately, without notice, if:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>You violate these Terms</li>
                    <li>You engage in fraudulent activity</li>
                    <li>Your payment fails or is disputed</li>
                    <li>We are required to do so by law</li>
                    <li>We discontinue the Service</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">12.3 Effect of Termination</h3>
                <p>Upon termination:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Your right to use the Service immediately ceases</li>
                    <li>Your account data may be deleted (subject to legal retention requirements)</li>
                    <li>No refund for unused subscription time (except as per Refund Policy)</li>
                    <li>Sections of these Terms that should survive termination will remain in effect</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8 mb-4">13. Governing Law and Disputes</h2>

                <h3 className="text-xl font-semibold mt-6 mb-3">13.1 Governing Law</h3>
                <p>These Terms are governed by the laws of Maharashtra, India, without regard to conflict of law principles.</p>

                <h3 className="text-xl font-semibold mt-6 mb-3">13.2 Dispute Resolution</h3>
                <p>If you have a dispute, you agree to first contact us at support@intelligrid.store to attempt informal resolution.</p>

                <h3 className="text-xl font-semibold mt-6 mb-3">13.3 Jurisdiction</h3>
                <p>Any legal action must be brought in the courts of Maharashtra, India. You consent to the exclusive jurisdiction of these courts.</p>

                <h3 className="text-xl font-semibold mt-6 mb-3">13.4 EU Users</h3>
                <p>If you are a European Union consumer, you benefit from mandatory provisions of the law of your country of residence.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">14. Changes to Terms</h2>

                <p>We may modify these Terms at any time. When we make material changes:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>We will update the "Last updated" date</li>
                    <li>We will notify you via email and platform notification</li>
                    <li>We will provide at least 30 days notice before changes take effect</li>
                    <li>Continued use after changes constitutes acceptance</li>
                </ul>

                <p className="mt-4">If you don't agree to the new Terms, you must stop using the Service and cancel your account.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">15. General Provisions</h2>

                <h3 className="text-xl font-semibold mt-6 mb-3">15.1 Entire Agreement</h3>
                <p>These Terms, together with our Privacy Policy and Refund Policy, constitute the entire agreement between you and IntelliGrid Solutions.</p>

                <h3 className="text-xl font-semibold mt-6 mb-3">15.2 Severability</h3>
                <p>If any provision is found unenforceable, the remaining provisions will remain in full effect.</p>

                <h3 className="text-xl font-semibold mt-6 mb-3">15.3 Waiver</h3>
                <p>Our failure to enforce any right or provision does not constitute a waiver of that right or provision.</p>

                <h3 className="text-xl font-semibold mt-6 mb-3">15.4 Assignment</h3>
                <p>You may not assign these Terms without our consent. We may assign these Terms to any affiliate or successor.</p>

                <h3 className="text-xl font-semibold mt-6 mb-3">15.5 Force Majeure</h3>
                <p>We are not liable for delays or failures due to circumstances beyond our reasonable control.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">16. Contact Information</h2>

                <div className="bg-gray-50 p-6 rounded-lg mt-4">
                    <p className="font-semibold mb-2">IntelliGrid Solutions</p>
                    <p>Email: <a href="mailto:support@intelligrid.store" className="text-blue-600 hover:underline">support@intelligrid.store</a></p>
                    <p>Website: <a href="https://www.intelligrid.online" className="text-blue-600 hover:underline">www.intelligrid.online</a></p>
                    <p className="mt-2 text-sm text-gray-600">Location: Maharashtra, India</p>
                </div>

                <div className="mt-12 pt-6 border-t">
                    <p className="text-sm text-gray-600">
                        Related Documents: <Link to="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link> | <Link to="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</Link>
                    </p>
                </div>

                <div className="mt-8 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
                    <p className="text-sm"><strong>By using IntelliGrid, you agree to these Terms of Service. Please read them carefully.</strong></p>
                </div>
            </div>
        </div>
    )
}

export default TermsOfServicePage
