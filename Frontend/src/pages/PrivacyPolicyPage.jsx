import { useEffect } from 'react'
import { Link } from 'react-router-dom'

function PrivacyPolicyPage() {
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-gray-600 mb-8">Last updated: February 07, 2026</p>

            <div className="prose prose-lg max-w-none space-y-6">
                <p className="text-lg">This Privacy Policy describes how IntelliGrid Solutions ("we", "us", or "our") collects, uses, and shares your personal information when you use our AI tools directory platform at www.intelligrid.online (the "Service").</p>

                <p>By using the Service, you agree to the collection and use of information in accordance with this Privacy Policy.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">1. Information We Collect</h2>

                <h3 className="text-xl font-semibold mt-6 mb-3">1.1 Information You Provide</h3>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Account Information:</strong> Name, email address, password when you create an account</li>
                    <li><strong>Payment Information:</strong> Billing details, payment method information (processed securely by PayPal and Cashfree)</li>
                    <li><strong>Profile Information:</strong> Optional profile details, preferences, and settings</li>
                    <li><strong>User Content:</strong> Tool reviews, ratings, comments, and tool submissions you provide</li>
                    <li><strong>Communications:</strong> Messages you send to our support team</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">1.2 Information Collected Automatically</h3>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Usage Data:</strong> Pages viewed, tools searched, features used, time spent on platform</li>
                    <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                    <li><strong>Search Data:</strong> Search queries, filters used, search results clicked</li>
                    <li><strong>Analytics Data:</strong> Tool popularity, user engagement metrics, conversion data</li>
                    <li><strong>Cookies and Tracking:</strong> See Section 3 for details</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8 mb-4">2. How We Use Your Information</h2>

                <p>We use your information for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Provide the Service:</strong> Process subscriptions, enable account features, deliver search results</li>
                    <li><strong>Process Payments:</strong> Handle billing, subscriptions, and refunds</li>
                    <li><strong>Personalization:</strong> Recommend relevant AI tools, save preferences, customize experience</li>
                    <li><strong>Communications:</strong> Send subscription confirmations, renewal reminders, service updates, and marketing emails (with opt-out option)</li>
                    <li><strong>Analytics:</strong> Analyze tool popularity, improve search algorithms, optimize platform performance</li>
                    <li><strong>Security:</strong> Prevent fraud, detect abuse, enforce our Terms of Service</li>
                    <li><strong>Legal Compliance:</strong> Comply with applicable laws and regulations</li>
                    <li><strong>Business Operations:</strong> Customer support, platform improvements, research and development</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8 mb-4">3. Cookies and Tracking Technologies</h2>

                <p>We use cookies and similar technologies to enhance your experience:</p>

                <h3 className="text-xl font-semibold mt-6 mb-3">3.1 Types of Cookies</h3>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Essential Cookies:</strong> Required for authentication, session management, security (Clerk)</li>
                    <li><strong>Analytics Cookies:</strong> Track usage patterns, search performance (Algolia, Sentry)</li>
                    <li><strong>Preference Cookies:</strong> Remember your settings, language, theme preferences</li>
                    <li><strong>Functional Cookies:</strong> Enable features like saved searches, favorites, recently viewed tools</li>
                </ul>

                <p className="mt-4">You can control cookies through your browser settings. Note that disabling essential cookies may affect platform functionality.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">4. Third-Party Services</h2>

                <p>We use the following third-party services that may collect your information:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Clerk:</strong> Authentication and user account management</li>
                    <li><strong>PayPal & Cashfree:</strong> Payment processing and subscription billing</li>
                    <li><strong>Algolia:</strong> Search functionality and analytics</li>
                    <li><strong>Sentry:</strong> Error tracking and performance monitoring</li>
                    <li><strong>MongoDB Atlas:</strong> Database hosting and storage</li>
                    <li><strong>Railway & Vercel:</strong> Platform hosting and infrastructure</li>
                </ul>

                <p className="mt-4">Each service has its own privacy policy. We recommend reviewing their policies to understand how they handle your data.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">5. Data Sharing and Disclosure</h2>

                <p>We may share your information in the following circumstances:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Service Providers:</strong> Third-party vendors who help us operate the platform (listed in Section 4)</li>
                    <li><strong>Tool Providers:</strong> Anonymized usage statistics to help them understand tool popularity</li>
                    <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                    <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                    <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
                    <li><strong>Public Information:</strong> Reviews and ratings you post are publicly visible</li>
                </ul>

                <p className="mt-4"><strong>We do NOT sell your personal information to third parties.</strong></p>

                <h2 className="text-2xl font-bold mt-8 mb-4">6. Data Retention</h2>

                <p>We retain your information for as long as necessary to provide the Service and comply with legal obligations:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Account Data:</strong> Duration of account + 24 months after closure</li>
                    <li><strong>Payment Records:</strong> 7 years (tax and legal compliance)</li>
                    <li><strong>Support Tickets:</strong> 24 months from ticket closure</li>
                    <li><strong>Usage Analytics:</strong> 24 months from collection</li>
                    <li><strong>Server Logs:</strong> 24 months for security monitoring</li>
                </ul>

                <p className="mt-4">You can request deletion of your data at any time (see Section 9).</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">7. Data Security</h2>

                <p>We implement industry-standard security measures to protect your information:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Encryption in transit (HTTPS/TLS) and at rest</li>
                    <li>Secure authentication via Clerk</li>
                    <li>Regular security audits and monitoring via Sentry</li>
                    <li>Access controls and employee training</li>
                    <li>Automated backups with 30-day retention</li>
                </ul>

                <p className="mt-4">However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">8. International Data Transfers</h2>

                <p>Your information may be transferred to and processed in countries other than your country of residence, including India and the United States. We ensure appropriate safeguards are in place for international transfers, including:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Standard Contractual Clauses (SCCs) for EU data transfers</li>
                    <li>Compliance with GDPR for European users</li>
                    <li>Adequate security measures as required by applicable laws</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8 mb-4">9. Your Privacy Rights</h2>

                <h3 className="text-xl font-semibold mt-6 mb-3">9.1 General Rights (All Users)</h3>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Access:</strong> Request a copy of your personal data</li>
                    <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                    <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                    <li><strong>Export:</strong> Download your data in a portable format</li>
                    <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails</li>
                    <li><strong>Cookie Control:</strong> Manage cookie preferences via browser settings</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">9.2 GDPR Rights (European Users)</h3>
                <p>If you are located in the European Economic Area (EEA), UK, or Switzerland, you have additional rights under GDPR:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
                    <li><strong>Right to Restrict:</strong> Request restriction of processing</li>
                    <li><strong>Right to Portability:</strong> Receive your data in a structured, machine-readable format</li>
                    <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time (doesn't affect prior processing)</li>
                    <li><strong>Right to Lodge Complaint:</strong> File a complaint with your local data protection authority</li>
                </ul>

                <p className="mt-4"><strong>Legal Basis for Processing (GDPR):</strong></p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Contract Performance:</strong> Providing subscription services</li>
                    <li><strong>Legitimate Interests:</strong> Platform improvement, fraud prevention, analytics</li>
                    <li><strong>Consent:</strong> Marketing communications, non-essential cookies</li>
                    <li><strong>Legal Obligation:</strong> Tax compliance, legal requirements</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">9.3 CCPA/CPRA Rights (California Users)</h3>
                <p>If you are a California resident, you have rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Right to Know:</strong> What personal information we collect, use, disclose, and sell</li>
                    <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
                    <li><strong>Right to Opt-Out:</strong> Opt-out of sale/sharing of personal information (we don't sell data)</li>
                    <li><strong>Right to Correct:</strong> Request correction of inaccurate information</li>
                    <li><strong>Right to Limit:</strong> Limit use of sensitive personal information</li>
                    <li><strong>Right to Non-Discrimination:</strong> Equal service regardless of privacy rights exercise</li>
                </ul>

                <p className="mt-4"><strong>California Categories of Personal Information Collected:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>Identifiers (name, email, IP address)</li>
                    <li>Commercial information (subscription history, purchases)</li>
                    <li>Internet activity (browsing history, search queries)</li>
                    <li>Geolocation data (approximate location from IP)</li>
                    <li>Inferences (preferences, interests based on usage)</li>
                </ul>

                <p className="mt-4"><strong>We do NOT sell or share personal information for cross-context behavioral advertising.</strong></p>

                <h3 className="text-xl font-semibold mt-6 mb-3">9.4 CalOPPA Compliance (California)</h3>
                <p>Under California Online Privacy Protection Act (CalOPPA):</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>We allow third-party behavioral tracking (analytics, error monitoring)</li>
                    <li>You can manage cookies via browser settings</li>
                    <li>We honor "Do Not Track" signals when technically feasible</li>
                    <li>We notify users of Privacy Policy changes via email and website notice</li>
                </ul>

                <h3 className="text-xl font-semibold mt-6 mb-3">9.5 How to Exercise Your Rights</h3>
                <p>To exercise any of your privacy rights:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Email:</strong> <a href="mailto:support@intelligrid.store" className="text-blue-600 hover:underline">support@intelligrid.store</a></li>
                    <li><strong>Account Settings:</strong> Manage preferences in your dashboard</li>
                    <li><strong>Response Time:</strong> We respond within 30 days (45 days for complex requests)</li>
                    <li><strong>Verification:</strong> We may verify your identity before processing requests</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8 mb-4">10. Children's Privacy (Under 13)</h2>

                <p className="font-semibold">Our Service is NOT intended for children under 13 years of age.</p>

                <p>We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at <a href="mailto:support@intelligrid.store" className="text-blue-600 hover:underline">support@intelligrid.store</a>.</p>

                <p>If we discover we have collected personal information from a child under 13 without parental consent, we will:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Delete the information immediately</li>
                    <li>Terminate the account</li>
                    <li>Notify the parent/guardian if contact information is available</li>
                </ul>

                <p className="mt-4"><strong>Age Verification:</strong> By creating an account, you represent that you are at least 18 years old. Users between 13-17 must have parental consent.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">11. Marketing Communications</h2>

                <p>We may send you marketing emails about:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>New AI tools added to the directory</li>
                    <li>Platform updates and new features</li>
                    <li>Special offers and promotions</li>
                    <li>Industry news and insights</li>
                </ul>

                <p className="mt-4"><strong>Opt-Out:</strong> You can unsubscribe from marketing emails at any time by:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Clicking "Unsubscribe" in any marketing email</li>
                    <li>Updating preferences in your account settings</li>
                    <li>Emailing <a href="mailto:support@intelligrid.store" className="text-blue-600 hover:underline">support@intelligrid.store</a></li>
                </ul>

                <p className="mt-4">Note: You will still receive transactional emails (subscription confirmations, password resets, etc.) even if you opt out of marketing.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">12. Changes to This Privacy Policy</h2>

                <p>We may update this Privacy Policy from time to time. When we make material changes, we will:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Update the "Last updated" date at the top</li>
                    <li>Send email notification to registered users</li>
                    <li>Display a prominent notice on the website</li>
                    <li>Provide 30 days notice before changes take effect</li>
                </ul>

                <p className="mt-4">Continued use of the Service after changes constitutes acceptance of the updated Privacy Policy.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4">13. Contact Us</h2>

                <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices:</p>

                <div className="bg-gray-50 p-6 rounded-lg mt-4">
                    <p className="font-semibold mb-2">IntelliGrid Solutions</p>
                    <p>Email: <a href="mailto:support@intelligrid.store" className="text-blue-600 hover:underline">support@intelligrid.store</a></p>
                    <p>Website: <a href="https://www.intelligrid.online" className="text-blue-600 hover:underline">www.intelligrid.online</a></p>
                    <p className="mt-2 text-sm text-gray-600">Location: Maharashtra, India</p>
                </div>

                <p className="mt-6"><strong>Data Protection Officer:</strong> For GDPR-related inquiries, contact our DPO at <a href="mailto:support@intelligrid.store" className="text-blue-600 hover:underline">support@intelligrid.store</a></p>

                <div className="mt-12 pt-6 border-t">
                    <p className="text-sm text-gray-600">
                        Related Documents: <Link to="/terms-of-service" className="text-blue-600 hover:underline">Terms of Service</Link> | <Link to="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</Link>
                    </p>
                </div>

                <div className="mt-8 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
                    <p className="text-sm"><strong>Summary:</strong> We collect information to provide our AI tools directory service, process subscriptions, and improve your experience. We don't sell your data. You have rights to access, delete, and control your information. Contact us anytime with questions.</p>
                </div>
            </div>
        </div>
    )
}

export default PrivacyPolicyPage
