import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Sparkles, TrendingUp, ArrowRight, Star, Users, Zap, ChevronDown, ArrowUpRight } from 'lucide-react'
import { toolService, categoryService } from '../services'
import ToolCard from '../components/tools/ToolCard'
import ToolCardSkeleton from '../components/tools/ToolCardSkeleton'
import SEO from '../components/common/SEO'
import FeaturedSpot from '../components/tools/FeaturedSpot'

// Top categories to feature — slugs must match actual DB slugs from /api/v1/categories
// Verified against live API: writing-and-content, image-generation, video-generation,
// developer-tools, chatbots, marketing, research, productivity
const CATEGORY_SHOWCASE = [
    { emoji: '✍️', label: 'Writing', slug: 'writing-and-content' },
    { emoji: '🎨', label: 'Image AI', slug: 'image-generation' },
    { emoji: '💻', label: 'Coding', slug: 'developer-tools' },
    { emoji: '🎬', label: 'Video', slug: 'video-generation' },
    { emoji: '🤖', label: 'Chatbots', slug: 'chatbots' },
    { emoji: '📈', label: 'Marketing', slug: 'marketing-and-seo' },
    { emoji: '🔍', label: 'Research', slug: 'research' },
    { emoji: '⚡', label: 'Productivity', slug: 'productivity' },
]

export default function HomePage() {
    const [trendingTools, setTrendingTools] = useState([])
    const [recentTools, setRecentTools] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [trendingDocs, recentDocs, catDocs] = await Promise.all([
                    toolService.getTrendingTools(6),
                    toolService.getTools({ sort: '-createdAt', limit: 6 }),
                    categoryService.getCategories().catch(() => ({ data: [] }))
                ])
                setTrendingTools(trendingDocs.data || trendingDocs || [])
                setRecentTools(recentDocs.data || recentDocs.tools || [])
                setCategories(catDocs.data || catDocs || [])
            } catch (error) {
                console.error('Error fetching homepage data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleHeroSearch = (e) => {
        e.preventDefault()
        if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
        else navigate('/tools')
    }

    // Build category display: prefer live data with counts, fall back to static
    const displayCategories = categories.length > 0
        ? categories.slice(0, 8).map(c => {
            const match = CATEGORY_SHOWCASE.find(s => s.slug === c.slug)
            return { emoji: match?.emoji || '🛠️', label: c.name, slug: c.slug, count: c.toolCount }
        })
        : CATEGORY_SHOWCASE

    return (
        <div className="min-h-screen">
            <SEO
                title="IntelliGrid - Discover 4,000+ Best AI Tools | Updated Daily"
                description="Explore the largest curated directory of AI tools for every need. Find, compare, and discover the perfect AI solutions for your business. Updated daily."
                keywords="AI tools, artificial intelligence, AI directory, AI software, machine learning tools, best AI tools"
                canonicalUrl="https://www.intelligrid.online"
            />

            {/* ════════════════ HERO ════════════════ */}
            <section className="relative overflow-hidden bg-gradient-to-br from-[#07071a] via-[#0c0c22] to-[#07071a] min-h-[90vh] flex items-center">
                {/* Animated blobs */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] animate-blob" />
                    <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '2s' }} />
                    <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-violet-500/10 rounded-full blur-[100px] animate-blob" style={{ animationDelay: '4s' }} />
                </div>

                <div className="relative z-10 max-w-5xl mx-auto px-6 py-24 w-full text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/8 backdrop-blur-md rounded-full border border-white/15 mb-8">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-gray-300">4,000+ AI Tools — Curated & Updated Daily</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-5 leading-[1.08] tracking-tight">
                        Discover the
                        <span className="block bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mt-2">
                            Perfect AI Tool
                        </span>
                        for Every Task
                    </h1>

                    <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        The world's most comprehensive AI tools directory. Search, compare, and choose from thousands of solutions — all in one place.
                    </p>

                    {/* Hero Search */}
                    <form onSubmit={handleHeroSearch} className="max-w-2xl mx-auto mb-10 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search AI tools — e.g. 'image generation', 'code review'..."
                            className="w-full pl-12 pr-36 py-4 rounded-2xl bg-white/8 border border-white/12 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:bg-white/10 transition-all"
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/25"
                        >
                            Search
                        </button>
                    </form>

                    {/* CTA */}
                    <div className="flex flex-wrap gap-3 justify-center items-center mb-14">
                        <Link
                            to="/tools"
                            className="group px-7 py-3.5 bg-white text-black rounded-xl font-bold text-sm hover:bg-gray-100 transition-all flex items-center gap-2 shadow-lg"
                        >
                            Browse All Tools <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                        <Link
                            to="/pricing"
                            className="px-7 py-3.5 bg-white/8 border border-white/12 rounded-xl font-semibold text-sm text-white hover:bg-white/12 transition-all"
                        >
                            View Pricing
                        </Link>
                    </div>

                    {/* Social proof */}
                    <div className="flex flex-wrap justify-center items-center gap-6 text-gray-500 text-sm">
                        <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span>4.9/5 from 2,000+ users</span>
                        </div>
                        <span className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-purple-400" />
                            <span>50,000+ monthly visitors</span>
                        </div>
                        <span className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-cyan-400" />
                            <span>Updated daily</span>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
                    <ChevronDown className="w-5 h-5 text-white/30" />
                </div>
            </section>

            {/* ════════════════ STATS ════════════════ */}
            <section className="py-16 border-y border-white/5 bg-[#08081a]">
                <div className="max-w-5xl mx-auto px-6 grid gap-6 grid-cols-3">
                    {[
                        { value: '4,000+', label: 'AI Tools Indexed', gradient: 'from-violet-400 to-purple-400' },
                        { value: '50+', label: 'Categories', gradient: 'from-cyan-400 to-blue-400' },
                        { value: 'Daily', label: 'New Tools Added', gradient: 'from-amber-400 to-orange-400' },
                    ].map(stat => (
                        <div key={stat.label} className="text-center p-6">
                            <div className={`text-4xl font-black bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-1`}>
                                {stat.value}
                            </div>
                            <div className="text-sm text-gray-500">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ════════════════ FEATURED (SPONSORED) ════════════════ */}
            <FeaturedSpot />

            {/* ════════════════ BROWSE BY CATEGORY ════════════════ */}
            <section className="py-20 bg-gray-950">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-1">Browse by Category</h2>
                            <p className="text-sm text-gray-500">Find the right tool for your specific use-case</p>
                        </div>
                        <Link to="/tools" className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                            All categories <ArrowRight size={14} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                        {displayCategories.map((cat, i) => (
                            <Link
                                key={i}
                                to={`/category/${cat.slug}`}
                                className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white/3 border border-white/6 hover:bg-white/7 hover:border-purple-500/25 hover:-translate-y-0.5 transition-all duration-200 text-center"
                            >
                                <span className="text-3xl">{cat.emoji}</span>
                                <span className="text-xs font-medium text-gray-400 group-hover:text-white transition-colors leading-tight">{cat.label}</span>
                                {cat.count > 0 && (
                                    <span className="text-[10px] text-gray-600">{cat.count} tools</span>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════ TRENDING TOOLS ════════════════ */}
            <section className="py-20 bg-[#070714] border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="mb-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">Trending Now</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Most visited this week</p>
                            </div>
                        </div>
                        <Link to="/tools" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors group">
                            View all <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {[...Array(6)].map((_, i) => <ToolCardSkeleton key={i} />)}
                        </div>
                    ) : trendingTools.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {trendingTools.map(tool => (
                                <ToolCard key={tool._id} tool={tool} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-white/8 bg-white/3 p-12 text-center">
                            <p className="text-gray-500 text-sm mb-4">No trending tools yet.</p>
                            <Link to="/tools" className="text-purple-400 hover:text-purple-300 text-sm font-medium">
                                Browse all tools →
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            {/* ════════════════ NEW ARRIVALS ════════════════ */}
            <section className="py-20 bg-gray-950 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="mb-10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">New Arrivals</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Just added to the directory</p>
                            </div>
                        </div>
                        <Link to="/tools" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors group">
                            View all <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    {loading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {[...Array(6)].map((_, i) => <ToolCardSkeleton key={i} />)}
                        </div>
                    ) : recentTools.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {recentTools.map(tool => (
                                <ToolCard key={tool._id} tool={tool} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-600 text-sm py-12">No recent tools found.</div>
                    )}
                </div>
            </section>

            {/* ════════════════ BOTTOM CTA ════════════════ */}
            <section className="py-24 bg-[#07071a] border-t border-white/5">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs text-purple-400 mb-6">
                        <Sparkles size={11} /> Premium Access Available
                    </div>
                    <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">
                        Ready to find your<br />
                        <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">perfect AI tool?</span>
                    </h2>
                    <p className="text-gray-500 text-base mb-8 max-w-xl mx-auto">
                        Get unlimited access to our full directory, advanced filters, collections, and weekly AI tool picks.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Link
                            to="/tools"
                            className="px-7 py-3.5 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-purple-500/25 flex items-center gap-2"
                        >
                            Browse Free <ArrowUpRight size={15} />
                        </Link>
                        <Link
                            to="/pricing"
                            className="px-7 py-3.5 bg-white/6 border border-white/10 rounded-xl text-white font-semibold text-sm hover:bg-white/10 transition-all"
                        >
                            See Premium Plans
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}
