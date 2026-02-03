import { Link } from 'react-router-dom'
import { Github, Twitter, Linkedin } from 'lucide-react'

export default function Footer() {
    const currentYear = new Date().getFullYear()

    return (
        <footer className="border-t border-white/10 bg-black/50 backdrop-blur-xl">
            <div className="container mx-auto px-4 py-12">
                <div className="grid gap-8 md:grid-cols-4">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
                            <span className="text-xl font-bold text-white">IntelliGrid</span>
                        </div>
                        <p className="text-sm text-gray-400">
                            Discover and explore the best AI tools for your needs.
                        </p>
                        <div className="flex space-x-4">
                            <a
                                href="#"
                                className="text-gray-400 transition hover:text-white"
                                aria-label="Twitter"
                            >
                                <Twitter className="h-5 w-5" />
                            </a>
                            <a
                                href="#"
                                className="text-gray-400 transition hover:text-white"
                                aria-label="LinkedIn"
                            >
                                <Linkedin className="h-5 w-5" />
                            </a>
                            <a
                                href="#"
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
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-white">Company</h3>
                        <ul className="space-y-2">
                            <li>
                                <a href="#" className="text-sm text-gray-400 transition hover:text-white">
                                    About
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-sm text-gray-400 transition hover:text-white">
                                    Blog
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-sm text-gray-400 transition hover:text-white">
                                    Contact
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="mb-4 text-sm font-semibold text-white">Legal</h3>
                        <ul className="space-y-2">
                            <li>
                                <a href="#" className="text-sm text-gray-400 transition hover:text-white">
                                    Privacy Policy
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-sm text-gray-400 transition hover:text-white">
                                    Terms of Service
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-sm text-gray-400 transition hover:text-white">
                                    Cookie Policy
                                </a>
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
