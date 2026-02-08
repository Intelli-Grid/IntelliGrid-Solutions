import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Sparkles, TrendingUp, ArrowRight, Star, Users, Zap, ChevronDown } from 'lucide-react'
import { toolService } from '../services'
import ToolCard from '../components/tools/ToolCard'
import LoadingSpinner from '../components/common/LoadingSpinner'
import SEO from '../components/common/SEO'

export default function HomePage() {
    const [trendingTools, setTrendingTools] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchTrendingTools()
    }, [])

    const fetchTrendingTools = async () => {
        try {
            const response = await toolService.getTrendingTools(6)
            console.log('Trending tools response:', response) // Debug log
            setTrendingTools(response.data || response || [])
        } catch (error) {
            console.error('Error fetching trending tools:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen">
            <SEO
                title="IntelliGrid - Discover 3,690+ Best AI Tools | Updated Daily"
                description="Explore the largest curated directory of 3,690+ AI tools for every need. Find, compare, and discover the perfect AI solutions for your business. Updated daily with the latest AI innovations."
                keywords="AI tools, artificial intelligence, AI directory, AI software, machine learning tools, AI solutions, AI platforms, best AI tools, AI applications, AI tool directory"
                canonicalUrl="https://www.intelligrid.online"
            />
            {/* Hero Section with Animated Background */}
            <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 min-h-screen flex items-center">
                {/* Animated Background Blobs */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-accent-purple rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                    <div className="absolute top-40 right-20 w-72 h-72 bg-accent-cyan rounded-full mix-blend-multiply filter blur-3xl animate-blob" style={{ animationDelay: '2s' }}></div>
                    <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob" style={{ animationDelay: '4s' }}></div>
                </div>

                {/* Content */}
                <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 w-full">
                    <div className="text-center">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-8 animate-fade-in">
                            <span className="w-2 h-2 bg-accent-emerald rounded-full animate-pulse"></span>
                            <span className="text-sm font-medium text-white">3,690+ AI Tools Curated & Updated Daily</span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight animate-fade-in-up">
                            Discover the
                            <span className="block mt-2 bg-gradient-to-r from-accent-cyan via-accent-purple to-accent-rose bg-clip-text text-transparent">
                                Perfect AI Tool
                            </span>
                            for Every Task
                        </h1>

                        {/* Subheadline */}
                        <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            The world's most comprehensive AI tools directory. Find, compare, and choose from thousands of AI solutions—all in one place.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            <Link
                                to="/tools"
                                className="group relative px-8 py-4 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-xl font-semibold text-white shadow-2xl shadow-accent-purple/50 hover:shadow-accent-purple/70 transition-all duration-300 hover:scale-105 overflow-hidden"
                            >
                                <span className="relative z-10">Start Exploring Free</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-accent-purple to-accent-cyan opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </Link>

                            <Link
                                to="/search"
                                className="px-8 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl font-semibold text-white hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
                            >
                                <Search className="w-5 h-5" />
                                <span>Search Tools</span>
                            </Link>
                        </div>

                        {/* Social Proof */}
                        <div className="flex flex-wrap justify-center items-center gap-8 text-gray-400 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 text-accent-amber fill-accent-amber" />
                                <span className="text-sm">4.9/5 from 2,000+ users</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-accent-cyan" />
                                <span className="text-sm">50,000+ monthly visitors</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-accent-purple" />
                                <span className="text-sm">Updated daily</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
                    <ChevronDown className="w-6 h-6 text-white/50" />
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-20 bg-gradient-to-b from-primary-900 to-deep-space">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid gap-8 md:grid-cols-3">
                        <div className="group relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
                            <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl -z-10"></div>
                            <div className="mb-2 text-4xl font-bold bg-gradient-to-r from-accent-cyan to-accent-purple bg-clip-text text-transparent">3,690+</div>
                            <div className="text-sm text-gray-400 font-medium">AI Tools Curated</div>
                        </div>
                        <div className="group relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
                            <div className="absolute inset-0 bg-gradient-to-r from-accent-emerald/20 to-accent-cyan/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl -z-10"></div>
                            <div className="mb-2 text-4xl font-bold bg-gradient-to-r from-accent-emerald to-accent-cyan bg-clip-text text-transparent">50+</div>
                            <div className="text-sm text-gray-400 font-medium">Categories</div>
                        </div>
                        <div className="group relative rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:-translate-y-2">
                            <div className="absolute inset-0 bg-gradient-to-r from-accent-amber/20 to-accent-rose/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl -z-10"></div>
                            <div className="mb-2 text-4xl font-bold bg-gradient-to-r from-accent-amber to-accent-rose bg-clip-text text-transparent">Daily</div>
                            <div className="text-sm text-gray-400 font-medium">Updates & New Tools</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trending Tools Section */}
            <section className="py-20 bg-deep-space">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="mb-12 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-accent-purple to-accent-cyan rounded-lg">
                                <TrendingUp className="h-6 w-6 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-white">Trending Tools</h2>
                        </div>
                        <Link
                            to="/tools"
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group"
                        >
                            <span>View all</span>
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    {loading ? (
                        <LoadingSpinner text="Loading trending tools..." />
                    ) : trendingTools.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {trendingTools.map((tool, index) => (
                                <div
                                    key={tool._id}
                                    className="animate-fade-in-up"
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    <ToolCard tool={tool} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm">
                            <p className="text-gray-400 mb-4">No trending tools available at the moment.</p>
                            <Link
                                to="/tools"
                                className="inline-flex items-center gap-2 text-sm text-accent-purple hover:text-accent-cyan transition-colors"
                            >
                                <span>Browse all tools</span>
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    )}
                </div>
            </section>
        </div>
    )
}
