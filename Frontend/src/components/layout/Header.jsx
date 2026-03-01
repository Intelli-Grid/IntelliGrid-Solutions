import { Link, useLocation } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, SignInButton, useUser, useAuth } from '@clerk/clerk-react'
import { Search, Menu, X, LayoutDashboard, Sparkles } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { user } = useUser()
    const { isLoaded, isSignedIn } = useAuth()
    const location = useLocation()
    const role = user?.publicMetadata?.role
    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN' || role === 'MODERATOR'

    const navLinks = [
        { to: '/tools', label: 'Tools' },
        { to: '/search', label: 'Search' },
        { to: '/ai-stack-advisor', label: 'AI Advisor', highlight: true, icon: <Sparkles className="h-3 w-3" /> },
        { to: '/blog', label: 'Blog' },
        { to: '/pricing', label: 'Pricing' },
    ]

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-[#08081a]/80 backdrop-blur-xl">
            <nav className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Logo */}
                <Link to="/" className="flex items-center space-x-2 group flex-shrink-0">
                    <img
                        src="/logo.png"
                        alt="IntelliGrid Logo"
                        className="h-8 w-8 rounded-lg object-cover shadow-lg transition-transform group-hover:scale-105"
                    />
                    <span className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                        IntelliGrid
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden items-center space-x-1 md:flex">
                    {navLinks.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                ${link.highlight
                                    ? isActive(link.to)
                                        ? 'text-violet-300 bg-violet-500/15'
                                        : 'text-violet-400 hover:text-violet-300 hover:bg-violet-500/10'
                                    : isActive(link.to)
                                        ? 'text-white bg-white/10'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {link.icon && link.icon}
                            {link.label}
                            {isActive(link.to) && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-purple-400 rounded-full" />
                            )}
                        </Link>
                    ))}

                    <Link
                        to="/submit"
                        className="ml-2 flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-purple-300 border border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-400/50 transition-all duration-200"
                    >
                        + Submit Tool
                    </Link>

                    {isAdmin && (
                        <a
                            href="https://admin.intelligrid.online"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-all duration-200"
                        >
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            Admin
                        </a>
                    )}
                </div>

                {/* Auth & Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Search icon */}
                    <Link
                        to="/search"
                        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200
                            ${isActive('/search') ? 'bg-white/12 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                        aria-label="Search"
                    >
                        <Search className="h-4 w-4" />
                    </Link>

                    {/* Auth buttons */}
                    {!isLoaded ? (
                        <div className="h-9 w-20 rounded-lg bg-white/5 animate-pulse" />
                    ) : isSignedIn ? (
                        <div className="flex items-center gap-2">
                            <Link
                                to="/dashboard"
                                className={`hidden text-sm font-medium transition-all md:block px-3 py-2 rounded-lg
                                    ${isActive('/dashboard') ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                            >
                                Dashboard
                            </Link>
                            <UserButton afterSignOutUrl="/" />
                        </div>
                    ) : (
                        <SignInButton>
                            <button className="rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 px-4 py-2 text-sm font-semibold text-white transition-all shadow-lg shadow-purple-500/20 whitespace-nowrap">
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
                <div className="border-t border-white/8 bg-[#08081a]/98 backdrop-blur-xl md:hidden">
                    <div className="container mx-auto space-y-1 px-4 py-4">
                        {navLinks.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all
                                    ${link.highlight
                                        ? 'text-violet-400 hover:bg-violet-500/10'
                                        : isActive(link.to)
                                            ? 'text-white bg-white/8'
                                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.icon && link.icon}
                                {link.label}
                            </Link>
                        ))}
                        <Link
                            to="/submit"
                            className="block rounded-lg px-4 py-2.5 text-sm text-purple-400 font-medium hover:bg-purple-500/10 hover:text-purple-300 transition-all"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            + Submit a Tool
                        </Link>
                        {isSignedIn ? (
                            <Link
                                to="/dashboard"
                                className="block rounded-lg px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-all"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <div className="px-4 py-2">
                                <SignInButton>
                                    <button
                                        className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-purple-500 hover:to-violet-500 transition-all"
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
