import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toolService } from '../services'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import { Star, ExternalLink, Eye, Heart, Calendar, TrendingUp } from 'lucide-react'
import { formatNumber, formatDate, getPricingDisplay } from '../utils/helpers'

export default function ToolDetailsPage() {
    const { slug } = useParams()
    const [tool, setTool] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchTool()
    }, [slug])

    const fetchTool = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await toolService.getToolBySlug(slug)
            console.log('Tool details response:', response) // Debug log
            const toolData = response.data || response
            setTool(toolData)

            // Track view
            if (toolData?._id) {
                toolService.incrementViews(toolData._id).catch(console.error)
            }
        } catch (err) {
            console.error('Error fetching tool:', err)
            setError(err.response?.data?.message || 'Failed to load tool details')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-16">
                <LoadingSpinner text="Loading tool details..." />
            </div>
        )
    }

    if (error || !tool) {
        return (
            <div className="container mx-auto px-4 py-16">
                <ErrorMessage message={error} onRetry={fetchTool} />
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-16">
            {/* Breadcrumb */}
            <div className="mb-8 flex items-center space-x-2 text-sm text-gray-400">
                <Link to="/" className="hover:text-white">
                    Home
                </Link>
                <span>/</span>
                <Link to="/tools" className="hover:text-white">
                    Tools
                </Link>
                <span>/</span>
                <span className="text-white">{tool.name}</span>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h1 className="mb-2 text-4xl font-bold text-white">{tool.name}</h1>
                                <p className="text-lg text-gray-400">{tool.shortDescription}</p>
                            </div>
                            {tool.isTrending && (
                                <span className="inline-flex items-center space-x-1 rounded-full bg-orange-500/10 px-3 py-1 text-sm text-orange-400">
                                    <TrendingUp className="h-4 w-4" />
                                    <span>Trending</span>
                                </span>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap items-center gap-6 text-sm">
                            <div className="flex items-center space-x-2">
                                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                                <span className="font-semibold text-white">
                                    {tool.ratings?.average?.toFixed(1) || '0.0'}
                                </span>
                                <span className="text-gray-400">
                                    ({formatNumber(tool.ratings?.count || 0)} reviews)
                                </span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-400">
                                <Eye className="h-5 w-5" />
                                <span>{formatNumber(tool.views || 0)} views</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-400">
                                <Heart className="h-5 w-5" />
                                <span>{formatNumber(tool.favorites || 0)} favorites</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-400">
                                <Calendar className="h-5 w-5" />
                                <span>Added {formatDate(tool.createdAt)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
                        <h2 className="mb-4 text-2xl font-bold text-white">About</h2>
                        <p className="whitespace-pre-wrap text-gray-300">{tool.fullDescription}</p>
                    </div>

                    {/* Tags */}
                    {tool.tags && tool.tags.length > 0 && (
                        <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-6">
                            <h2 className="mb-4 text-2xl font-bold text-white">Tags</h2>
                            <div className="flex flex-wrap gap-2">
                                {tool.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="rounded-full bg-purple-500/10 px-4 py-2 text-sm text-purple-400"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reviews Section Placeholder */}
                    <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                        <h2 className="mb-4 text-2xl font-bold text-white">Reviews</h2>
                        <p className="text-center text-gray-400">Reviews coming soon...</p>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6">
                        {/* CTA Card */}
                        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-6">
                            <div className="mb-4">
                                <div className="mb-2 text-sm text-gray-400">Pricing</div>
                                <div className="text-2xl font-bold text-white">
                                    {getPricingDisplay(tool.pricing)}
                                </div>
                            </div>

                            <a
                                href={tool.officialUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-medium text-white transition hover:opacity-90"
                            >
                                <span>Visit Website</span>
                                <ExternalLink className="h-5 w-5" />
                            </a>

                            {tool.sourceUrl && (
                                <a
                                    href={tool.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 block w-full rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-center font-medium text-white transition hover:bg-white/10"
                                >
                                    Learn More
                                </a>
                            )}
                        </div>

                        {/* Info Card */}
                        <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                            <h3 className="mb-4 font-semibold text-white">Information</h3>
                            <div className="space-y-3 text-sm">
                                {tool.category && (
                                    <div>
                                        <div className="mb-1 text-gray-400">Category</div>
                                        <div className="text-white">{tool.category}</div>
                                    </div>
                                )}
                                <div>
                                    <div className="mb-1 text-gray-400">Status</div>
                                    <div className="text-white capitalize">{tool.status || 'Active'}</div>
                                </div>
                                {tool.isFeatured && (
                                    <div>
                                        <div className="mb-1 text-gray-400">Featured</div>
                                        <div className="text-purple-400">Yes</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
