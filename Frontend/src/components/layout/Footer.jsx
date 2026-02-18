import { Link } from 'react-router-dom'
import { Github, Twitter, Linkedin } from 'lucide-react'
import NewsletterForm from '../common/NewsletterForm'

export default function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl">
            <div className="container mx-auto px-4 py-12">
                <NewsletterForm source="footer" className="mb-16" />

                <div className="grid gap-8 md:grid-cols-5">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.9" />
                                    <rect x="11" y="1" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.6" />
                                    <rect x="1" y="11" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.6" />
                                    <rect x="11" y="11" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.9" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold text-white">IntelliGrid</span>
                        </div>
                        <p className="text-sm text-gray-400">
                            Discover and explore the best AI tools for your needs.
                        </p>
                        <div className="flex space-x-4">
                            <a
                                href="https://twitter.com/intelligrid_ai"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 transition hover:text-white"
                                aria-label="Twitter / X"
                            >
                                <Twitter className="h-5 w-5" />
                            </a>
                            <a
                                href="https://linkedin.com/company/intelligrid"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 transition hover:text-white"
                                aria-label="LinkedIn"
                            >
                                <Linkedin className="h-5 w-5" />
                            </a>
                            <a
                                href="https://github.com/intelligrid"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 transition hover:text-white"
                                aria-label="GitHub"
                            >
                                <Github className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    {/* Product */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-white">Product</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/tools" className="text-sm text-gray-400 transition hover:text-white">
                                    Browse Tools
                                </Link>
                            </li>
                            <li>
                                <Link to="/search" className="text-sm text-gray-400 transition hover:text-white">
                                    Search
                                </Link>
                            </li>
                            <li>
                                <Link to="/pricing" className="text-sm text-gray-400 transition hover:text-white">
                                    Pricing
                                </Link>
                            </li>
                            <li>
                                <Link to="/faq" className="text-sm text-gray-400 transition hover:text-white">
                                    FAQ
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Popular Categories (Phase 2.3) */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-white">Popular</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/category/text-generators" className="text-sm text-gray-400 transition hover:text-white">
                                    Writing AI
                                </Link>
                            </li>
                            <li>
                                <Link to="/category/image-generators" className="text-sm text-gray-400 transition hover:text-white">
                                    Image Generators
                                </Link>
                            </li>
                            <li>
                                <Link to="/category/video-generators" className="text-sm text-gray-400 transition hover:text-white">
                                    Video AI
                                </Link>
                            </li>
                            <li>
                                <Link to="/category/coding-assistants" className="text-sm text-gray-400 transition hover:text-white">
                                    Coding Tools
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-white">Support</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/faq" className="text-sm text-gray-400 transition hover:text-white">
                                    Help Center
                                </Link>
                            </li>
                            <li>
                                <a href="mailto:support@intelligrid.store" className="text-sm text-gray-400 transition hover:text-white">
                                    Contact Support
                                </a>
                            </li>
                            <li>
                                <Link to="/refund-policy" className="text-sm text-gray-400 transition hover:text-white">
                                    Refunds
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-white">Legal</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link to="/privacy-policy" className="text-sm text-gray-400 transition hover:text-white">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link to="/terms-of-service" className="text-sm text-gray-400 transition hover:text-white">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link to="/refund-policy" className="text-sm text-gray-400 transition hover:text-white">
                                    Refund Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 border-t border-white/10 pt-8 text-center">
                    <p className="text-sm text-gray-400">
                        © {currentYear} IntelliGrid. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}
