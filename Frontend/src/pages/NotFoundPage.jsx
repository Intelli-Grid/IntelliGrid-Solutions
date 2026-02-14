import { Link } from 'react-router-dom'
import { Home, Search } from 'lucide-react'

export default function NotFoundPage() {
    return (
        <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
            <h1 className="mb-2 text-8xl md:text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-accent-purple animate-pulse">404</h1>
            <h2 className="mb-6 text-2xl md:text-3xl font-bold text-white">Page Not Found</h2>
            <p className="mb-8 max-w-md text-gray-400">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
                <Link
                    to="/"
                    className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-700 shadow-lg hover:shadow-purple-600/20"
                >
                    <Home className="h-5 w-5" />
                    Back Home
                </Link>
                <Link
                    to="/search"
                    className="flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/10 hover:border-white/20"
                >
                    <Search className="h-5 w-5" />
                    Search Tools
                </Link>
            </div>
        </div>
    )
}
