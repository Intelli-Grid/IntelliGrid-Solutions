import { useEffect } from 'react'

function PrivacyPolicyPage() {
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-gray-600 mb-8">Last updated: February 07, 2026</p>

            <div className="prose prose-lg max-w-none">
                <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>

                <p>We use Your Personal Data to provide and improve the Service. By using the Service, You agree to the collection and use of information in accordance with this Privacy Policy.</p>

                <h2>Interpretation and Definitions</h2>
                <h3>Interpretation</h3>
                <p>The words whose initial letters are capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>

                <h3>Definitions</h3>
                <p>For the purposes of this Privacy Policy:</p>
                <ul>
                    <li><strong>Account</strong> means a unique account created for You to access our Service or parts of our Service.</li>
                    <li><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Privacy Policy) refers to IntelliGrid Solutions.</li>
                    <li><strong>Country</strong> refers to: Maharashtra, India</li>
                    <li><strong>Device</strong> means any device that can access the Service such as a computer, a cell phone or a digital tablet.</li>
                    <li><strong>Personal Data</strong> is any information that relates to an identified or identifiable individual.</li>
                    <li><strong>Service</strong> refers to the Website.</li>
                    <li><strong>Website</strong> refers to IntelliGrid Solutions, accessible from <a href="https://www.intelligrid.online" className="text-blue-600 hover:underline">www.intelligrid.online</a>.</li>
                    <li><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
                </ul>

                <h2>Collecting and Using Your Personal Data</h2>
                <h3>Types of Data Collected</h3>
                <h4>Personal Data</h4>
                <p>While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to:</p>
                <ul>
                    <li>Email address</li>
                    <li>First name and last name</li>
                    <li>Phone number</li>
                </ul>

                <h4>Usage Data</h4>
                <p>Usage Data is collected automatically when using the Service.</p>
                <p>Usage Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>

                <h3>Use of Your Personal Data</h3>
                <p>The Company may use Personal Data for the following purposes:</p>
                <ul>
                    <li><strong>To provide and maintain our Service</strong>, including to monitor the usage of our Service.</li>
                    <li><strong>To manage Your Account:</strong> to manage Your registration as a user of the Service.</li>
                    <li><strong>To contact You:</strong> To contact You by email, telephone calls, SMS, or other equivalent forms of electronic communication.</li>
                    <li><strong>To provide You</strong> with news, special offers, and general information about other goods, services and events which We offer.</li>
                </ul>

                <h3>Security of Your Personal Data</h3>
                <p>The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially reasonable means to protect Your Personal Data, We cannot guarantee its absolute security.</p>

                <h2>Children's Privacy</h2>
                <p>Our Service does not address anyone under the age of 16. We do not knowingly collect personally identifiable information from anyone under the age of 16.</p>

                <h2>Changes to this Privacy Policy</h2>
                <p>We may update Our Privacy Policy from time to time. We will notify You of any changes by posting the new Privacy Policy on this page.</p>

                <h2>Contact Us</h2>
                <p>If you have any questions about this Privacy Policy, You can contact us:</p>
                <ul>
                    <li>By email: <a href="mailto:support@intelligrid.store" className="text-blue-600 hover:underline">support@intelligrid.store</a></li>
                </ul>
            </div>
        </div>
    )
}

export default PrivacyPolicyPage
