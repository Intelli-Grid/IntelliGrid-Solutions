import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Sparkles, TrendingUp, ArrowRight } from 'lucide-react'
import { toolService } from '../services'
import ToolCard from '../components/tools/ToolCard'
import LoadingSpinner from '../components/common/LoadingSpinner'

export default function HomePage() {
    const [trendingTools, setTrendingTools] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchTrendingTools()
    }, [])

    const fetchTrendingTools = async () => {
        try {
            const response = await toolService.getTrendingTools(6)
            setTrendingTools(response.tools || [])
        } catch (error) {
            console.error('Error fetching trending tools:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="container mx-auto px-4 py-16">
            {/* Hero Section */}
            <div className="mx-auto max-w-4xl text-center">
                <div className="mb-6 inline-flex items-center space-x-2 rounded-full bg-white/5 px-4 py-2 backdrop-blur-sm">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-gray-300">Discover 3,690+ AI Tools</span>
                </div>

                <h1 className="mb-6 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-5xl font-bold text-transparent md:text-7xl">
                    Find the Perfect
                    <br />
                    AI Tool for Your Needs
                </h1>

                <p className="mb-8 text-lg text-gray-400 md:text-xl">
                    Explore our curated collection of AI tools. From productivity to creativity,
                    <br className="hidden md:block" />
                    find the perfect solution for your workflow.
                </p>

                <div className="flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
                    <Link
                        to="/tools"
                        className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-3 text-center font-medium text-white transition hover:opacity-90 sm:w-auto"
                    >
                        Browse Tools
                    </Link>
                    <Link
                        to="/search"
                        className="flex w-full items-center justify-center space-x-2 rounded-lg bg-white/5 px-8 py-3 font-medium text-white backdrop-blur-sm transition hover:bg-white/10 sm:w-auto"
                    >
                        <Search className="h-5 w-5" />
                        <span>Search</span>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="mx-auto mt-24 grid max-w-4xl gap-8 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <div className="mb-2 text-3xl font-bold text-white">3,690+</div>
                    <div className="text-sm text-gray-400">AI Tools</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <div className="mb-2 text-3xl font-bold text-white">50+</div>
                    <div className="text-sm text-gray-400">Categories</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <div className="mb-2 text-3xl font-bold text-white">Daily</div>
                    <div className="text-sm text-gray-400">Updates</div>
                </div>
            </div>

            {/* Trending Tools Section */}
            <div className="mt-24">
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <TrendingUp className="h-6 w-6 text-purple-400" />
                        <h2 className="text-2xl font-bold text-white">Trending Tools</h2>
                    </div>
                    <Link
                        to="/tools"
                        className="flex items-center space-x-1 text-sm text-gray-400 transition hover:text-white"
                    >
                        <span>View all</span>
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                {loading ? (
                    <LoadingSpinner text="Loading trending tools..." />
                ) : trendingTools.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {trendingTools.map((tool) => (
                            <ToolCard key={tool._id} tool={tool} />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-lg border border-white/10 bg-white/5 p-12 text-center">
                        <p className="text-gray-400">No trending tools available at the moment.</p>
                        <Link
                            to="/tools"
                            className="mt-4 inline-block text-sm text-purple-400 hover:text-purple-300"
                        >
                            Browse all tools →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}
