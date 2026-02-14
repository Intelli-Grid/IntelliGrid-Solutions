import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, SignInButton, useUser } from '@clerk/clerk-react'
import { Search, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { user } = useUser()
    const isAdmin = user?.publicMetadata?.role === 'admin'

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
            <nav className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Logo */}
                <Link to="/" className="flex items-center space-x-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
                    <span className="text-xl font-bold text-white">IntelliGrid</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden items-center space-x-8 md:flex">
                    <Link to="/tools" className="text-sm text-gray-300 transition hover:text-white">
                        Tools
                    </Link>
                    <Link to="/search" className="text-sm text-gray-300 transition hover:text-white">
                        Search
                    </Link>
                    <Link to="/pricing" className="text-sm text-gray-300 transition hover:text-white">
                        Pricing
                    </Link>
                </div>

                {/* Auth & Actions */}
                <div className="flex items-center space-x-4">
                    <Link
                        to="/search"
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
                    >
                        <Search className="h-4 w-4" />
                    </Link>

                    <SignedOut>
                        <SignInButton mode="modal">
                            <button className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
                                Sign In
                            </button>
                        </SignInButton>
                    </SignedOut>

                    <SignedIn>
                        <Link
                            to="/dashboard"
                            className="hidden text-sm text-gray-300 transition hover:text-white md:block"
                        >
                            Dashboard
                        </Link>
                        <UserButton afterSignOutUrl="/" />
                    </SignedIn>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white md:hidden"
                    >
                        {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="border-t border-white/10 bg-black/95 backdrop-blur-xl md:hidden">
                    <div className="container mx-auto space-y-1 px-4 py-4">
                        <Link
                            to="/tools"
                            className="block rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Tools
                        </Link>
                        <Link
                            to="/search"
                            className="block rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Search
                        </Link>
                        <Link
                            to="/pricing"
                            className="block rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Pricing
                        </Link>
                        <SignedIn>
                            <Link
                                to="/dashboard"
                                className="block rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Dashboard
                            </Link>
                        </SignedIn>
                    </div>
                </div>
            )}
        </header>
    )
}
