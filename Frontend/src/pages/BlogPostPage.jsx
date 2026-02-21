import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, Eye, Tag, ArrowRight, ArrowLeft, Sparkles, Loader2, Share2 } from 'lucide-react'
import SEO from '../components/common/SEO'
import apiClient from '../services/api'

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date(date))
}

function RelatedCard({ post }) {
    return (
        <Link
            to={`/blog/${post.slug}`}
            className="group flex gap-3 p-3 rounded-xl border border-white/8 bg-white/3 hover:border-purple-500/20 hover:bg-white/5 transition-all"
        >
            {post.featuredImage && (
                <img src={post.featuredImage} alt={post.title} className="h-14 w-14 rounded-lg object-cover flex-shrink-0 bg-white/5" onError={(e) => { e.target.style.display = 'none' }} />
            )}
            <div className="min-w-0">
                <p className="text-sm font-medium text-white group-hover:text-purple-300 line-clamp-2 transition-colors">{post.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{formatDate(post.publishedAt || post.createdAt)}</p>
            </div>
        </Link>
    )
}

export default function BlogPostPage() {
    const { slug } = useParams()
    const [post, setPost] = useState(null)
    const [related, setRelated] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const data = await apiClient.get(`/blog/${slug}`)
                setPost(data.post)
                setRelated(data.related || [])
            } catch (e) {
                setError(e.response?.status === 404 ? 'Post not found' : 'Failed to load post')
            } finally {
                setLoading(false)
            }
        }
        load()
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [slug])

    const handleShare = async () => {
        const url = window.location.href
        if (navigator.share) {
            await navigator.share({ title: post?.title, url })
        } else {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
        )
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
                <p className="text-gray-400 text-lg mb-4">{error || 'Post not found'}</p>
                <Link to="/blog" className="text-purple-400 hover:text-purple-300 flex items-center gap-1.5 text-sm">
                    <ArrowLeft className="h-4 w-4" /> Back to Blog
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-950">
            <SEO
                title={`${post.title} — IntelliGrid Blog`}
                description={post.excerpt || post.content?.slice(0, 160)}
                canonicalUrl={`https://www.intelligrid.online/blog/${post.slug}`}
                keywords={post.tags?.join(', ')}
            />

            {/* Cover image */}
            {post.featuredImage && (
                <div className="h-72 md:h-96 w-full overflow-hidden bg-[#0c0c14]">
                    <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="h-full w-full object-cover opacity-80"
                        onError={(e) => { e.target.parentElement.style.display = 'none' }}
                    />
                </div>
            )}

            <div className="container mx-auto max-w-4xl px-4 py-10">
                <div className="flex flex-col lg:flex-row gap-10">

                    {/* ── Main Article ── */}
                    <article className="flex-1 min-w-0">

                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-xs text-gray-600 mb-6">
                            <Link to="/blog" className="hover:text-gray-400 transition-colors">Blog</Link>
                            <span>/</span>
                            {post.category && (
                                <>
                                    <span className="text-purple-400">{post.category}</span>
                                    <span>/</span>
                                </>
                            )}
                            <span className="text-gray-500 truncate">{post.title}</span>
                        </div>

                        {/* Category + Meta */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            {post.category && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                                    {post.category}
                                </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatDate(post.publishedAt || post.createdAt)}
                            </span>
                            {post.views > 0 && (
                                <span className="flex items-center gap-1 text-xs text-gray-600">
                                    <Eye className="h-3.5 w-3.5" /> {post.views} views
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4 tracking-tight">
                            {post.title}
                        </h1>

                        {/* Author */}
                        {post.author && (
                            <div className="flex items-center gap-3 mb-8 pb-8 border-b border-white/8">
                                {post.author.imageUrl ? (
                                    <img src={post.author.imageUrl} alt={post.author.firstName} className="h-10 w-10 rounded-full object-cover" />
                                ) : (
                                    <div className="h-10 w-10 rounded-full bg-purple-600/30 flex items-center justify-center text-sm font-bold text-purple-300">
                                        {post.author.firstName?.[0] || '?'}
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-medium text-white">{post.author.firstName} {post.author.lastName}</p>
                                    <p className="text-xs text-gray-600">IntelliGrid Team</p>
                                </div>
                                <button
                                    onClick={handleShare}
                                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 text-xs text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                                >
                                    <Share2 className="h-3.5 w-3.5" />
                                    {copied ? 'Copied!' : 'Share'}
                                </button>
                            </div>
                        )}

                        {/* Content — render as HTML (admin inputs Markdown/HTML) */}
                        <div
                            className="prose prose-invert prose-sm md:prose-base max-w-none
                                prose-headings:font-extrabold prose-headings:text-white
                                prose-p:text-gray-400 prose-p:leading-relaxed
                                prose-a:text-purple-400 prose-a:no-underline hover:prose-a:underline
                                prose-strong:text-white
                                prose-code:text-purple-300 prose-code:bg-purple-500/10 prose-code:px-1 prose-code:rounded
                                prose-pre:bg-[#0d0d0d] prose-pre:border prose-pre:border-white/8
                                prose-blockquote:border-l-purple-500 prose-blockquote:text-gray-500
                                prose-li:text-gray-400
                                prose-img:rounded-xl"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />

                        {/* Tags */}
                        {post.tags?.length > 0 && (
                            <div className="mt-10 pt-8 border-t border-white/8 flex flex-wrap gap-2">
                                {post.tags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-xs text-gray-500">
                                        <Tag className="h-3 w-3" />#{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* CTA */}
                        <div className="mt-10 rounded-2xl border border-purple-500/15 bg-gradient-to-r from-purple-500/5 to-blue-500/5 p-6 text-center">
                            <Sparkles className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                            <p className="text-base font-semibold text-white mb-1">Discover 4,000+ AI tools</p>
                            <p className="text-sm text-gray-500 mb-4">Browse the full IntelliGrid directory — filtered by category, pricing, and ratings.</p>
                            <Link to="/tools" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">
                                Browse AI Tools <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </article>

                    {/* ── Sidebar ── */}
                    <aside className="lg:w-72 flex-shrink-0">
                        <div className="sticky top-20 space-y-6">

                            {/* Back link */}
                            <Link to="/blog" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                                <ArrowLeft className="h-3.5 w-3.5" /> Back to Blog
                            </Link>

                            {/* Related posts */}
                            {related.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Related Posts</h3>
                                    <div className="space-y-2">
                                        {related.map(r => <RelatedCard key={r._id} post={r} />)}
                                    </div>
                                </div>
                            )}

                            {/* Newsletter CTA */}
                            <div className="rounded-xl border border-white/8 bg-[#0d0d0d] p-5">
                                <p className="text-sm font-semibold text-white mb-1">📬 Weekly AI digest</p>
                                <p className="text-xs text-gray-600 mb-4">Get the best AI tools and guides delivered to your inbox every week.</p>
                                <Link to="/#newsletter" className="block w-full text-center py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors">
                                    Subscribe Free
                                </Link>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    )
}
