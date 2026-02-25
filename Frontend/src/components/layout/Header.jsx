import { Link } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, SignInButton, useUser, useAuth } from '@clerk/clerk-react'
import { Search, Menu, X, LayoutDashboard } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { user } = useUser()
    const { isLoaded, isSignedIn } = useAuth()
    const role = user?.publicMetadata?.role
    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN' || role === 'MODERATOR'

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-xl">
            <nav className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Logo */}
                <Link to="/" className="flex items-center space-x-2 group flex-shrink-0">
                    <img
                        src="/logo.png"
                        alt="IntelliGrid Logo"
                        className="h-8 w-8 rounded-lg object-cover shadow-lg transition-transform group-hover:scale-105"
                    />
                    <span className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">IntelliGrid</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden items-center space-x-8 md:flex">
                    <Link to="/tools" className="text-sm text-gray-300 transition hover:text-white">
                        Tools
                    </Link>
                    <Link to="/search" className="text-sm text-gray-300 transition hover:text-white">
                        Search
                    </Link>
                    <Link to="/blog" className="text-sm text-gray-300 transition hover:text-white">
                        Blog
                    </Link>
                    <Link to="/pricing" className="text-sm text-gray-300 transition hover:text-white">
                        Pricing
                    </Link>
                    <Link to="/submit" className="text-sm text-purple-400 transition hover:text-purple-300 font-medium">
                        + Submit Tool
                    </Link>
                    {isAdmin && (
                        <a
                            href="https://admin.intelligrid.online"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-indigo-400 transition hover:text-indigo-300"
                        >
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            Admin
                        </a>
                    )}
                </div>

                {/* Auth & Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Search icon — always visible, quick shortcut */}
                    <Link
                        to="/search"
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white"
                        aria-label="Search"
                    >
                        <Search className="h-4 w-4" />
                    </Link>

                    {/* Auth buttons — show skeleton width while Clerk loads to avoid layout shift */}
                    {!isLoaded ? (
                        <div className="h-9 w-20 rounded-lg bg-white/5 animate-pulse" />
                    ) : isSignedIn ? (
                        <div className="flex items-center gap-2">
                            <Link
                                to="/dashboard"
                                className="hidden text-sm text-gray-300 transition hover:text-white md:block"
                            >
                                Dashboard
                            </Link>
                            <UserButton afterSignOutUrl="/" />
                        </div>
                    ) : (
                        <SignInButton>
                            <button className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 whitespace-nowrap">
                                Sign In
                            </button>
                        </SignInButton>
                    )}

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white md:hidden"
                        aria-label="Toggle menu"
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
                            to="/blog"
                            className="block rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Blog
                        </Link>
                        <Link
                            to="/pricing"
                            className="block rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Pricing
                        </Link>
                        <Link
                            to="/submit"
                            className="block rounded-lg px-4 py-2 text-sm text-purple-400 font-medium transition hover:bg-purple-500/10 hover:text-purple-300"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            + Submit a Tool
                        </Link>
                        {isSignedIn ? (
                            <Link
                                to="/dashboard"
                                className="block rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <div className="px-4 py-2">
                                <SignInButton>
                                    <button
                                        className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Sign In
                                    </button>
                                </SignInButton>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}
