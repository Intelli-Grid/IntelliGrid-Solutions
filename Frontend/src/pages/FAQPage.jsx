import { useState } from 'react'
import { Search, ChevronDown, ChevronUp, Mail, HelpCircle } from 'lucide-react'
import SEO from '../components/common/SEO'

const faqData = [
    {
        category: 'General',
        questions: [
            {
                q: 'What is IntelliGrid?',
                a: 'IntelliGrid is a comprehensive AI tools directory that helps you discover, compare, and choose from over 3,690 AI tools across 50+ categories. We curate and update our database daily to ensure you have access to the latest AI solutions.'
            },
            {
                q: 'Is IntelliGrid free to use?',
                a: 'Yes! IntelliGrid offers a free tier that gives you access to our basic directory features. For advanced features like unlimited searches, saved favorites, detailed comparisons, and ad-free experience, you can upgrade to our Pro plan starting at $9.99/month.'
            },
            {
                q: 'How often is the database updated?',
                a: 'We update our AI tools database daily. New tools are added regularly, and existing tool information is verified and updated to ensure accuracy. Pro users get priority notifications about new tools in their favorite categories.'
            },
        ]
    },
    {
        category: 'Subscription & Pricing',
        questions: [
            {
                q: 'What are the subscription plans?',
                a: 'We offer three plans: Free (basic access), Pro Monthly ($9.99/month), and Pro Yearly ($99.99/year - save 17%). Pro plans include unlimited searches, advanced filters, saved favorites, detailed comparisons, priority support, and ad-free experience.'
            },
            {
                q: 'Can I cancel my subscription anytime?',
                a: 'Yes, you can cancel your subscription at any time from your account dashboard. Your Pro access will continue until the end of your current billing period. No questions asked.'
            },
            {
                q: 'Do you offer refunds?',
                a: 'Yes! We offer a 30-day money-back guarantee for first-time subscribers. If you\'re not satisfied with the Pro plan, request a full refund within 30 days of your initial purchase. See our Refund Policy for details.'
            },
            {
                q: 'What payment methods do you accept?',
                a: 'We accept PayPal and Cashfree (which supports credit/debit cards, UPI, net banking, and wallets). All payments are processed securely through our payment partners.'
            },
            {
                q: 'Will my subscription auto-renew?',
                a: 'Yes, subscriptions automatically renew to ensure uninterrupted service. You\'ll receive email reminders 7 days and 1 day before renewal. You can cancel anytime before the renewal date.'
            },
        ]
    },
    {
        category: 'Features & Usage',
        questions: [
            {
                q: 'How do I search for AI tools?',
                a: 'Use our powerful search bar to find tools by name, category, or use case. Pro users can access advanced filters to narrow results by pricing model, rating, features, and more. Our AI-powered search understands natural language queries.'
            },
            {
                q: 'Can I save my favorite tools?',
                a: 'Yes! Pro users can save unlimited favorite tools and create custom collections. Your favorites are synced across all devices and accessible from your dashboard.'
            },
            {
                q: 'How do tool ratings work?',
                a: 'Tools are rated by our community on a 5-star scale. Ratings are based on factors like ease of use, features, value for money, and customer support. Only verified users can submit ratings to ensure authenticity.'
            },
            {
                q: 'Can I submit a new AI tool?',
                a: 'Absolutely! We welcome tool submissions from both developers and users. Click "Submit Tool" in the navigation menu, fill out the form with tool details, and our team will review it within 2-3 business days.'
            },
        ]
    },
    {
        category: 'Account & Privacy',
        questions: [
            {
                q: 'How do I create an account?',
                a: 'Click "Sign Up" in the top right corner. You can sign up using your email, Google, or other supported authentication methods. Account creation is free and takes less than a minute.'
            },
            {
                q: 'Is my data secure?',
                a: 'Yes! We take security seriously. All data is encrypted in transit (HTTPS/TLS) and at rest. We use industry-leading authentication (Clerk) and never sell your personal information. See our Privacy Policy for details.'
            },
            {
                q: 'Can I delete my account?',
                a: 'Yes, you can request account deletion at any time from your account settings. We\'ll permanently delete your data within 30 days, in compliance with GDPR and privacy regulations.'
            },
            {
                q: 'Can I export my data?',
                a: 'Yes! Pro users can export all their data (favorites, search history, preferences) in JSON format from their account settings. This is part of our GDPR compliance.'
            },
        ]
    },
    {
        category: 'Technical Support',
        questions: [
            {
                q: 'I forgot my password. How do I reset it?',
                a: 'Click "Sign In" and then "Forgot Password". Enter your email address, and we\'ll send you a password reset link. The link is valid for 24 hours.'
            },
            {
                q: 'The website is not loading properly. What should I do?',
                a: 'Try clearing your browser cache and cookies, or use an incognito/private window. We recommend using the latest version of Chrome, Firefox, Safari, or Edge. If issues persist, contact support@intelligrid.store.'
            },
            {
                q: 'How do I contact customer support?',
                a: 'Email us at support@intelligrid.store. Pro users receive priority support with response times within 24 hours. Free users typically receive responses within 48-72 hours.'
            },
            {
                q: 'Do you have a mobile app?',
                a: 'Not yet, but our website is fully mobile-responsive and works great on all devices. A dedicated mobile app is on our roadmap for 2026.'
            },
        ]
    },
]

export default function FAQPage() {
    const [searchQuery, setSearchQuery] = useState('')
    const [openQuestion, setOpenQuestion] = useState(null)

    // Filter FAQs based on search query
    const filteredFAQs = faqData.map(category => ({
        ...category,
        questions: category.questions.filter(
            item =>
                item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(category => category.questions.length > 0)

    const toggleQuestion = (question) => {
        setOpenQuestion(openQuestion === question ? null : question)
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space">
            <SEO
                title="FAQ - Frequently Asked Questions | IntelliGrid"
                description="Find answers to common questions about IntelliGrid, our AI tools directory, subscription plans, features, and support. Get help with account management, pricing, and more."
                keywords="IntelliGrid FAQ, AI tools help, support, questions, pricing help, account help"
                canonicalUrl="https://www.intelligrid.online/faq"
            />
            <div className="max-w-4xl mx-auto px-6 py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-6">
                        <HelpCircle className="w-4 h-4 text-accent-cyan" />
                        <span className="text-sm font-medium text-white">Help Center</span>
                    </div>

                    <h1 className="text-5xl font-extrabold text-white mb-4">
                        Frequently Asked Questions
                    </h1>
                    <p className="text-xl text-gray-400">
                        Find answers to common questions about IntelliGrid
                    </p>
                </div>

                {/* Search Bar */}
                <div className="mb-12">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search for answers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-all"
                        />
                    </div>
                    {searchQuery && (
                        <p className="mt-3 text-sm text-gray-400">
                            Found {filteredFAQs.reduce((acc, cat) => acc + cat.questions.length, 0)} result(s)
                        </p>
                    )}
                </div>

                {/* FAQ Categories */}
                {filteredFAQs.length > 0 ? (
                    <div className="space-y-8">
                        {filteredFAQs.map((category, categoryIndex) => (
                            <div key={categoryIndex}>
                                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-gradient-to-b from-accent-cyan to-accent-purple rounded-full"></span>
                                    {category.category}
                                </h2>

                                <div className="space-y-3">
                                    {category.questions.map((item, questionIndex) => {
                                        const isOpen = openQuestion === item.q

                                        return (
                                            <div
                                                key={questionIndex}
                                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all"
                                            >
                                                <button
                                                    onClick={() => toggleQuestion(item.q)}
                                                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                                                >
                                                    <span className="text-lg font-semibold text-white pr-4">
                                                        {item.q}
                                                    </span>
                                                    <ChevronDown
                                                        className={`w-5 h-5 text-accent-cyan flex-shrink-0 transition-transform duration-300 ${isOpen ? 'transform rotate-180' : ''
                                                            }`}
                                                    />
                                                </button>

                                                <div
                                                    className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'
                                                        }`}
                                                >
                                                    <div className="px-6 pb-4 text-gray-300 leading-relaxed">
                                                        {item.a}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 rounded-full mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-400 text-lg">
                            No results found for "{searchQuery}"
                        </p>
                        <p className="text-gray-500 text-sm mt-2">
                            Try different keywords or browse all questions above
                        </p>
                    </div>
                )}

                {/* Contact Support */}
                <div className="mt-16 bg-gradient-to-r from-accent-cyan/10 to-accent-purple/10 border border-accent-cyan/30 rounded-2xl p-8 text-center">
                    <Mail className="w-12 h-12 text-accent-cyan mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">
                        Still have questions?
                    </h3>
                    <p className="text-gray-300 mb-6">
                        Can't find the answer you're looking for? Our support team is here to help.
                    </p>
                    <a
                        href="mailto:support@intelligrid.store"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-cyan to-accent-purple text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
                    >
                        <Mail className="w-5 h-5" />
                        <span>Contact Support</span>
                    </a>
                    <p className="text-sm text-gray-400 mt-4">
                        Pro users: 24-hour response time | Free users: 48-72 hours
                    </p>
                </div>
            </div>
        </div>
    )
}
