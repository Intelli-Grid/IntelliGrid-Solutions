import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Eye, Tag, ArrowRight, Sparkles, Loader2 } from 'lucide-react'
import SEO from '../components/common/SEO'
import apiClient from '../services/api'

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
}

function PostCard({ post, featured = false }) {
    return (
        <Link
            to={`/blog/${post.slug}`}
            className={`group flex flex-col rounded-2xl border border-white/8 bg-[#0d0d0d] overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-0.5 h-full ${featured ? 'md:flex-row' : ''}`}
        >
            {/* Cover */}
            {post.featuredImage ? (
                <div className={`overflow-hidden bg-white/5 ${featured ? 'md:w-2/5 h-56 md:h-auto' : 'h-48'}`}>
                    <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.target.parentElement.style.display = 'none' }}
                    />
                </div>
            ) : (
                <div className={`flex items-center justify-center bg-gradient-to-br from-purple-600/10 to-blue-600/10 border-b border-white/5 ${featured ? 'md:w-2/5 h-56 md:h-auto' : 'h-48'}`}>
                    <Sparkles className="h-8 w-8 text-purple-500/40" />
                </div>
            )}

            {/* Content */}
            <div className="flex flex-col flex-1 p-6">
                <div className="flex items-center gap-2 mb-3">
                    {post.category && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                            {post.category}
                        </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-gray-600">
                        <Calendar className="h-3 w-3" />
                        {formatDate(post.publishedAt || post.createdAt)}
                    </span>
                    {post.views > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-600">
                            <Eye className="h-3 w-3" /> {post.views}
                        </span>
                    )}
                </div>

                <h2 className={`font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2 mb-2 ${featured ? 'text-2xl' : 'text-lg'}`}>
                    {post.title}
                </h2>
                {post.excerpt && (
                    <p className="text-sm text-gray-500 line-clamp-2 flex-1">{post.excerpt}</p>
                )}

                <div className="mt-4 flex items-center gap-2">
                    {post.author && (
                        <div className="flex items-center gap-1.5">
                            {post.author.imageUrl ? (
                                <img src={post.author.imageUrl} alt={post.author.firstName} className="h-6 w-6 rounded-full object-cover" />
                            ) : (
                                <div className="h-6 w-6 rounded-full bg-purple-600/30 flex items-center justify-center text-[10px] font-bold text-purple-300">
                                    {post.author.firstName?.[0] || '?'}
                                </div>
                            )}
                            <span className="text-xs text-gray-500">{post.author.firstName} {post.author.lastName}</span>
                        </div>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-xs font-medium text-purple-400 group-hover:text-purple-300">
                        Read more <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                </div>
            </div>
        </Link>
    )
}

export default function BlogPage() {
    const [posts, setPosts] = useState([])
    const [categories, setCategories] = useState([])
    const [pagination, setPagination] = useState({})
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [activeCategory, setActiveCategory] = useState('')

    const fetchPosts = async (pageVal = page, cat = activeCategory) => {
        setLoading(true)
        try {
            const params = { page: pageVal, limit: 9 }
            if (cat) params.category = cat
            const data = await apiClient.get('/blog', { params })
            setPosts(data.posts || [])
            setCategories(data.categories || [])
            setPagination(data.pagination || {})
        } catch (e) {
            console.error('Failed to load blog posts:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchPosts() }, [])

    const handleCategory = (cat) => {
        setActiveCategory(cat)
        setPage(1)
        fetchPosts(1, cat)
    }

    const handlePage = (p) => {
        setPage(p)
        fetchPosts(p)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const featuredPost = posts[0]
    const restPosts = posts.slice(1)

    return (
        <div className="min-h-screen bg-gray-950">
            <SEO
                title="Blog — AI Tools Insights & Guides | IntelliGrid"
                description="Explore expert guides, comparisons, and insights on the best AI tools. Stay ahead with IntelliGrid's AI tools blog."
                keywords="AI tools blog, AI guides, AI insights, best AI tools 2025, IntelliGrid blog"
                canonicalUrl="https://www.intelligrid.online/blog"
            />

            {/* Hero */}
            <div className="relative border-b border-white/5 bg-gradient-to-b from-[#0c0c14] to-gray-950 pt-14 pb-10 px-4">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-purple-600/8 blur-[100px]" />
                </div>
                <div className="relative container mx-auto max-w-4xl text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-medium text-gray-400 mb-5">
                        <Sparkles className="h-3 w-3 text-purple-400" />
                        AI Tools Insights
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-tight">
                        IntelliGrid Blog
                    </h1>
                    <p className="text-gray-500">Guides, comparisons, and deep dives on the AI tools powering modern workflows</p>
                </div>
            </div>

            <div className="container mx-auto max-w-6xl px-4 py-10">

                {/* Category filter */}
                {categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                        <button
                            onClick={() => handleCategory('')}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${!activeCategory ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/8'}`}
                        >
                            All
                        </button>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => handleCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${activeCategory === cat ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/8'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-24">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="py-24 text-center">
                        <p className="text-gray-600 text-lg mb-2">No posts yet</p>
                        <p className="text-gray-700 text-sm">Check back soon — we publish weekly guides and AI tool reviews.</p>
                    </div>
                ) : (
                    <>
                        {/* Featured post */}
                        {featuredPost && (
                            <div className="mb-8">
                                <PostCard post={featuredPost} featured={true} />
                            </div>
                        )}

                        {/* Grid */}
                        {restPosts.length > 0 && (
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-10">
                                {restPosts.map(post => (
                                    <PostCard key={post._id} post={post} />
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => handlePage(p)}
                                        className={`h-9 w-9 rounded-lg text-sm transition-all ${page === p ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/8'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
