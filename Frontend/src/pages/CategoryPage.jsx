import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { categoryService } from '../services'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ToolCard from '../components/tools/ToolCard'
import SEO from '../components/common/SEO'
import { generateCategorySchema, generateBreadcrumbSchema } from '../utils/seoHelpers'


export default function CategoryPage() {
    const { slug } = useParams()
    const [category, setCategory] = useState(null)
    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true)

                const response = await categoryService.getToolsByCategory(slug)

                // API returns: { statusCode, data: { category, tools, pagination } }
                // categoryService.getToolsByCategory does `return response.data`
                // so response here = { statusCode, data: { category, tools, ... } }
                const payload = response?.data || response

                if (payload && payload.category) {
                    setCategory(payload.category)
                    setTools(payload.tools || [])
                } else {
                    setError('Category not found')
                }
            } catch (err) {
                console.error('Error fetching category data:', err)
                setError('Failed to load category')
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [slug])

    if (loading) return <div className="flex justify-center py-20"><LoadingSpinner /></div>
    if (error || !category) return <div className="text-center text-white py-20">Category not found</div>

    // Sort tools to find Top Rated (by rating, then views)
    const topTools = [...tools]
        .sort((a, b) => (b.ratings?.average || 0) - (a.ratings?.average || 0) || (b.views || 0) - (a.views || 0))
        .slice(0, 3)

    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const topToolNames = topTools.map(t => t.name).join(', ')

    const breadcrumbItems = [
        { name: 'Home', url: 'https://intelligrid.online' },
        { name: category.name, url: `https://intelligrid.online/category/${category.slug}` }
    ]

    const categorySchema = JSON.parse(generateCategorySchema(category, tools))
    const breadcrumbSchema = JSON.parse(generateBreadcrumbSchema(breadcrumbItems))

    return (
        <div className="container mx-auto px-4 py-16">
            <SEO
                title={`Best ${category.name} AI Tools (${currentDate}) - IntelliGrid`}
                description={`Discover the ${tools.length}+ best ${category.name} AI Tools including ${topToolNames}. Compare features, pricing, and reviews. Updated for ${currentDate}.`}
                canonicalUrl={`https://www.intelligrid.online/category/${category.slug}`}
                structuredData={[categorySchema, breadcrumbSchema]}
            />

            {/* Hero Section */}
            <div className="mb-16 text-center">
                <h1 className="mb-6 text-4xl md:text-5xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                    Best {category.name} AI Tools
                </h1>
                <p className="mx-auto max-w-3xl text-lg text-gray-300 leading-relaxed">
                    Browse our curated list of <strong>{tools.length}</strong> top-rated AI tools for {category.name}.
                    Whether you're looking for {topTools[0]?.name || 'industry leaders'} or rising stars like {topTools[1]?.name || 'new alternatives'},
                    we've ranked them by popularity and user reviews.
                    <br />
                    <span className="text-sm text-gray-500 mt-2 block">Last updated: {currentDate}</span>
                </p>
            </div>

            {/* Top Rated Section */}
            {topTools.length > 0 && (
                <div className="mb-20">
                    <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
                        <span className="text-yellow-400">🏆</span> Editor's Choice: Top 3
                    </h2>
                    <div className="grid gap-8 md:grid-cols-3">
                        {topTools.map((tool, index) => (
                            <div key={tool._id} className="relative">
                                <div className="absolute -top-4 -left-4 z-10 bg-yellow-400 text-black font-bold h-10 w-10 flex items-center justify-center rounded-full shadow-lg border-2 border-gray-900">
                                    #{index + 1}
                                </div>
                                <ToolCard tool={tool} featured={true} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Grid */}
            <div className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-8">All {category.name} Tools</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {tools.map((tool) => (
                        <ToolCard key={tool._id} tool={tool} />
                    ))}
                </div>
            </div>

            {tools.length === 0 && (
                <div className="text-center text-gray-500 py-24 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-xl">No tools found in this category yet.</p>
                    <Link to="/" className="mt-4 inline-block text-purple-400 hover:text-purple-300">
                        Explore other categories &rarr;
                    </Link>
                </div>
            )}

            {/* SEO Content Block (Phase 2.2) */}
            {tools.length > 0 && (
                <div className="mt-20 border-t border-white/10 pt-16">
                    <h2 className="text-2xl font-bold text-white mb-6">About {category.name} AI Tools</h2>
                    <div className="prose prose-invert max-w-none text-gray-300">
                        <p className="text-lg leading-relaxed mb-6">
                            Finding the best <strong>{category.name}</strong> software can be challenging with so many options available.
                            In this guide, we compare the top {tools.length} most popular tools, including industry leaders like
                            {topTools[0] && <> <strong>{topTools[0].name}</strong></>}
                            {topTools[1] && <>, <strong>{topTools[1].name}</strong></>}
                            {topTools[2] && <>, and <strong>{topTools[2].name}</strong></>}.
                            Our ranking is updated for {currentDate} based on verified user reviews and engagement data.
                        </p>
                        <p>
                            Browse the complete list above to find the perfect tool for your needs, compare features, and read real user reviews.
                            Whether you are a beginner or a professional, this curated directory of {category.name} AI tools will help you boost productivity.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
