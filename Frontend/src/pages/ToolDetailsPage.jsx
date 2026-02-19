
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toolService } from '../services'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import SEO from '../components/common/SEO'
import { generateToolSchema, generateBreadcrumbSchema } from '../utils/seoHelpers'


// New Components (E-commerce Style)
import ToolScreenshots from '../components/tools/ToolScreenshots'
import ToolProductInfo from '../components/tools/ToolProductInfo'
import ToolContent from '../components/tools/ToolContent'
import SimilarTools from '../components/tools/SimilarTools'
import ClaimToolModal from '../components/tools/ClaimToolModal'
import EmbedToolModal from '../components/tools/EmbedToolModal'

export default function ToolDetailsPage() {
    const { slug } = useParams()
    const [tool, setTool] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [relatedTools, setRelatedTools] = useState([])
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false)
    const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false)

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
            <div className="flex h-screen items-center justify-center bg-gray-950">
                <LoadingSpinner text="Loading tool details..." />
            </div>
        )
    }

    if (error || !tool) {
        return (
            <div className="container mx-auto px-4 py-16 text-center text-white">
                <ErrorMessage message={error} onRetry={() => window.location.reload()} />
                <Link to="/tools" className="mt-8 inline-block text-purple-400 hover:text-purple-300 underline">
                    &larr; Back to Tools
                </Link>
            </div>
        )
    }

    const breadcrumbItems = [
        { name: 'Home', url: 'https://intelligrid.online' },
        { name: 'Tools', url: 'https://intelligrid.online/tools' }
    ]

    if (typeof tool.category === 'object') {
        breadcrumbItems.push({
            name: tool.category.name,
            url: `https://intelligrid.online/category/${tool.category.slug}`
        })
    }

    breadcrumbItems.push({ name: tool.name, url: `https://intelligrid.online/tools/${tool.slug}` })

    const toolSchemaStr = generateToolSchema(tool)
    const breadcrumbSchemaStr = generateBreadcrumbSchema(breadcrumbItems)
    const schemas = [
        toolSchemaStr ? JSON.parse(toolSchemaStr) : null,
        breadcrumbSchemaStr ? JSON.parse(breadcrumbSchemaStr) : null
    ].filter(Boolean)

    return (
        <div className="bg-gray-950 min-h-screen pb-24 text-white font-sans antialiased">
            <SEO
                title={`${tool.name} - AI Tool Review & Pricing | IntelliGrid`}
                description={tool.shortDescription}
                canonicalUrl={`https://www.intelligrid.online/tools/${tool.slug}`}
                ogImage={tool.logo || 'https://www.intelligrid.online/og-image.png'}
                ogType="website"
                structuredData={schemas}
            />

            <div className="container mx-auto px-4 pt-8 lg:pt-12 max-w-7xl">
                {/* 1. Breadcrumb */}
                <nav className="mb-8 flex items-center space-x-2 text-sm font-medium text-gray-500">
                    <Link to="/" className="hover:text-white transition-colors">Home</Link>
                    <span>/</span>
                    <Link to="/tools" className="hover:text-white transition-colors">Tools</Link>
                    <span>/</span>
                    {typeof tool.category === 'object' && (
                        <>
                            <Link to={`/category/${tool.category.slug}`} className="hover:text-white transition-colors">{tool.category.name}</Link>
                            <span>/</span>
                        </>
                    )}
                    <span className="text-gray-300 truncate max-w-[200px]">{tool.name}</span>
                </nav>

                {/* 2. Top Section: Product Grid (Gallery + Details) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                    {/* Left: Gallery */}
                    <ToolScreenshots tool={tool} />

                    {/* Right: Product Info */}
                    <div className="sticky top-24">
                        <ToolProductInfo
                            tool={tool}
                            onClaim={() => setIsClaimModalOpen(true)}
                            onEmbed={() => setIsEmbedModalOpen(true)}
                        />
                    </div>
                </div>

                {/* 3. Middle Section: Detailed Content Tabs */}
                <div className="mt-24">
                    <ToolContent tool={tool} />
                </div>

                {/* 4. Bottom Section: Related Tools (Carousel style) */}
                <div className="mt-24 border-t border-white/10 pt-16">
                    <SimilarTools tools={relatedTools} currentToolSlug={tool.slug} />
                </div>
            </div>

            {/* Modals */}
            <ClaimToolModal
                isOpen={isClaimModalOpen}
                onClose={() => setIsClaimModalOpen(false)}
                tool={tool}
            />
            <EmbedToolModal
                isOpen={isEmbedModalOpen}
                onClose={() => setIsEmbedModalOpen(false)}
                tool={tool}
            />
        </div>
    )
}
