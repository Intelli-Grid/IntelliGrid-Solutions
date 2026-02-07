import { useEffect } from 'react'

function TermsOfServicePage() {
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
            <p className="text-gray-600 mb-8">Last updated: February 07, 2026</p>

            <div className="prose prose-lg max-w-none">
                <p>Please read these Terms of Service carefully before using Our Service.</p>

                <h2>Interpretation and Definitions</h2>
                <h3>Interpretation</h3>
                <p>The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>

                <h3>Definitions</h3>
                <p>For the purposes of these Terms of Service:</p>
                <ul>
                    <li><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Agreement) refers to IntelliGrid Solutions.</li>
                    <li><strong>Service</strong> refers to the Website.</li>
                    <li><strong>Website</strong> refers to IntelliGrid Solutions, accessible from <a href="https://www.intelligrid.online" className="text-blue-600 hover:underline">www.intelligrid.online</a></li>
                    <li><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
                </ul>

                <h2>Acknowledgment</h2>
                <p>These are the Terms of Service governing the use of this Service and the agreement that operates between You and the Company. These Terms of Service set out the rights and obligations of all users regarding the use of the Service.</p>
                <p>Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms of Service. These Terms of Service apply to all visitors, users and others who access or use the Service.</p>
                <p>By accessing or using the Service You agree to be bound by these Terms of Service. If You disagree with any part of these Terms of Service then You may not access the Service.</p>

                <h2>User Accounts</h2>
                <p>When You create an account with Us, You must provide Us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of Your account on Our Service.</p>
                <p>You are responsible for safeguarding the password that You use to access the Service and for any activities or actions under Your password, whether Your password is with Our Service or a Third-Party Social Media Service.</p>
                <p>You agree not to disclose Your password to any third party. You must notify Us immediately upon becoming aware of any breach of security or unauthorized use of Your account.</p>

                <h2>Subscriptions</h2>
                <h3>Subscription Period</h3>
                <p>The Service or some parts of the Service are available only with a paid Subscription. You will be billed in advance on a recurring and periodic basis (such as monthly or annually), depending on the type of Subscription plan you select when purchasing the Subscription.</p>

                <h3>Subscription Cancellations</h3>
                <p>You may cancel Your Subscription renewal either through Your Account settings page or by contacting Us. You will not receive a refund for the fees You already paid for Your current Subscription period and You will be able to access the Service until the end of Your current Subscription period.</p>

                <h3>Billing</h3>
                <p>You shall provide the Company with accurate and complete billing information including full name, address, state, zip code, telephone number, and a valid payment method information.</p>
                <p>Should automatic billing fail to occur for any reason, the Company will issue an electronic invoice indicating that you must proceed manually, within a certain deadline date, with the full payment corresponding to the billing period as indicated on the invoice.</p>

                <h3>Refunds</h3>
                <p>We offer a 30-day money-back guarantee on all subscription plans. Please refer to our Refund Policy for detailed information.</p>

                <h2>Prohibited Uses</h2>
                <p>You may use the Service only for lawful purposes and in accordance with these Terms. You agree not to use the Service:</p>
                <ul>
                    <li>In any way that violates any applicable national or international law or regulation.</li>
                    <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter," "spam," or any other similar solicitation.</li>
                    <li>To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity.</li>
                    <li>In any way that infringes upon the rights of others, or in any way is illegal, threatening, fraudulent, or harmful.</li>
                </ul>

                <h2>Intellectual Property</h2>
                <p>The Service and its original content (excluding Content provided by You or other users), features and functionality are and will remain the exclusive property of the Company and its licensors.</p>
                <p>The Service is protected by copyright, trademark, and other laws of both the Country and foreign countries.</p>
                <p>Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of the Company.</p>

                <h2>Termination</h2>
                <p>We may terminate or suspend Your Account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if You breach these Terms of Service.</p>
                <p>Upon termination, Your right to use the Service will cease immediately. If You wish to terminate Your Account, You may simply discontinue using the Service.</p>

                <h2>Limitation of Liability</h2>
                <p>Notwithstanding any damages that You might incur, the entire liability of the Company and any of its suppliers under any provision of these Terms and Your exclusive remedy for all of the foregoing shall be limited to the amount actually paid by You through the Service.</p>
                <p>To the maximum extent permitted by applicable law, in no event shall the Company or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever.</p>

                <h2>Disclaimer</h2>
                <p>The Service is provided to You "AS IS" and "AS AVAILABLE" and with all faults and defects without warranty of any kind. To the maximum extent permitted under applicable law, the Company, on its own behalf and on behalf of its Affiliates and its and their respective licensors and service providers, expressly disclaims all warranties, whether express, implied, statutory or otherwise.</p>

                <h2>Governing Law</h2>
                <p>The laws of the Country, excluding its conflicts of law rules, shall govern these Terms and Your use of the Service. Your use of the Application may also be subject to other local, state, national, or international laws.</p>

                <h2>Changes to These Terms of Service</h2>
                <p>We reserve the right, at Our sole discretion, to modify or replace these Terms at any time. If a revision is material We will make reasonable efforts to provide at least 30 days' notice prior to any new terms taking effect.</p>
                <p>By continuing to access or use Our Service after those revisions become effective, You agree to be bound by the revised terms. If You do not agree to the new terms, in whole or in part, please stop using the website and the Service.</p>

                <h2>Contact Us</h2>
                <p>If you have any questions about these Terms of Service, You can contact us:</p>
                <ul>
                    <li>By email: <a href="mailto:support@intelligrid.store" className="text-blue-600 hover:underline">support@intelligrid.store</a></li>
                </ul>
            </div>
        </div>
    )
}

export default TermsOfServicePage
