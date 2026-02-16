import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toolService } from '../services'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import { Helmet } from 'react-helmet-async'

// New Components
import ToolHero from '../components/tools/ToolHero'
import ToolScreenshots from '../components/tools/ToolScreenshots'
import ToolContent from '../components/tools/ToolContent'
import SimilarTools from '../components/tools/SimilarTools'

export default function ToolDetailsPage() {
    const { slug } = useParams()
    const [tool, setTool] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [relatedTools, setRelatedTools] = useState([])

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true)
                setError(null)

                // 1. Fetch main tool data
                const response = await toolService.getToolBySlug(slug)
                const toolData = response.data || response
                setTool(toolData)

                // 2. Fetch related tools (if we have an ID)
                if (toolData?._id) {
                    toolService.incrementViews(toolData._id).catch(console.error)
                    try {
                        const related = await toolService.getRelatedTools(toolData._id)
                        setRelatedTools(related.data || related)
                    } catch (relatedErr) {
                        console.warn("Failed to load related tools", relatedErr);
                    }
                }

            } catch (err) {
                console.error('Error fetching tool:', err)
                setError(err.response?.data?.message || 'Failed to load tool details')
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [slug])

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900">
                <LoadingSpinner text="Loading tool details..." />
            </div>
        )
    }

    if (error || !tool) {
        return (
            <div className="container mx-auto px-4 py-16 text-center">
                <ErrorMessage message={error} onRetry={() => window.location.reload()} />
                <Link to="/tools" className="mt-8 inline-block text-purple-400 hover:text-purple-300">
                    &larr; Back to Tools
                </Link>
            </div>
        )
    }

    return (
        <div className="bg-gray-900 min-h-screen pb-16">
            <Helmet>
                <title>{`${tool.name} - IntelliGrid AI Tools`}</title>
                <meta name="description" content={tool.shortDescription} />
                {/* Schema Markup */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        "name": tool.name,
                        "description": tool.shortDescription,
                        "applicationCategory": typeof tool.category === 'object' ? tool.category.name : tool.category || "BusinessApplication",
                        "offers": {
                            "@type": "Offer",
                            "price": "0",
                            "priceCurrency": "USD"
                        }
                    })}
                </script>
            </Helmet>

            <div className="container mx-auto px-4 pt-8">
                {/* 1. Breadcrumb */}
                <nav className="mb-6 flex items-center space-x-2 text-sm text-gray-500">
                    <Link to="/" className="hover:text-white transition-colors">Home</Link>
                    <span>/</span>
                    <Link to="/tools" className="hover:text-white transition-colors">Tools</Link>
                    <span>/</span>
                    <span className="text-gray-300 truncate max-w-[200px]">{tool.name}</span>
                </nav>

                {/* 2. Hero Section */}
                <ToolHero tool={tool} />

                {/* 3. Screenshots / Preview */}
                <ToolScreenshots tool={tool} />

                {/* 4. Main Content (Tabs + Sidebar) */}
                <ToolContent tool={tool} />

                {/* 5. Similar Tools */}
                <SimilarTools tools={relatedTools} />
            </div>
        </div>
    )
}
