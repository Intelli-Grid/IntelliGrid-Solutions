import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collectionService } from '../services'
import { useUser } from '@clerk/clerk-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import ToolCard from '../components/tools/ToolCard'
import SEO from '../components/common/SEO'
import { Share2, Lock, Globe, User, ArrowLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function CollectionDetailsPage() {
    const { idOrSlug } = useParams()
    const { user } = useUser()
    const [collection, setCollection] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [isOwner, setIsOwner] = useState(false)

    useEffect(() => {
        fetchCollection()
    }, [idOrSlug, user])

    const fetchCollection = async () => {
        try {
            setLoading(true)
            let data;

            // Fetch by ID or Slug (Backend handles both via the same endpoint)
            const response = await collectionService.getCollectionById(idOrSlug)
            data = response.data || response

            setCollection(data)

            if (user && data.owner) {
                const ownerId = typeof data.owner === 'object' ? data.owner._id : data.owner
                // Flexible check for ownership (handling potential string vs object ID mismatch)
                setIsOwner(
                    user.id === ownerId ||
                    user.publicMetadata?.userId === ownerId ||
                    String(user.publicMetadata?.mongoId) === String(ownerId)
                )
            }

        } catch (err) {
            console.error('Error fetching collection:', err)
            setError('Collection not found or private.')
        } finally {
            setLoading(false)
        }
    }

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href)
        toast.success('Link copied to clipboard!')
    }

    if (loading) return <div className="py-20"><LoadingSpinner text="Loading collection..." /></div>
    if (error || !collection) return <div className="py-20 container mx-auto text-center"><ErrorMessage message={error || 'Collection not found'} /></div>

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <SEO
                title={`${collection.name} | IntelliGrid Collections`}
                description={collection.description || `Check out this collection of ${collection.tools.length} AI tools on IntelliGrid.`}
                canonicalUrl={collection.isPublic ? `https://www.intelligrid.online/collections/${collection._id}` : undefined}
                noindex={!collection.isPublic}
                structuredData={collection.isPublic && collection.tools.length > 0 ? {
                    '@context': 'https://schema.org',
                    '@type': 'ItemList',
                    name: collection.name,
                    description: collection.description || `A curated collection of ${collection.tools.length} AI tools`,
                    numberOfItems: collection.tools.length,
                    itemListElement: collection.tools.map((tool, i) => ({
                        '@type': 'ListItem',
                        position: i + 1,
                        name: tool.name,
                        url: `https://www.intelligrid.online/tools/${tool.slug}`,
                    }))
                } : null}
            />

            <div className="bg-gray-900 border-b border-white/10">
                <div className="container mx-auto px-4 py-8 md:py-12">
                    <Link to="/dashboard" className="inline-flex items-center text-sm text-gray-400 hover:text-white mb-6">
                        <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                {collection.isPublic ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                                        <Globe size={12} /> Public
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 border border-gray-500/20 px-2 py-0.5 text-xs font-medium text-gray-400">
                                        <Lock size={12} /> Private
                                    </span>
                                )}
                                <span className="text-gray-500 text-xs">• {collection.views} views</span>
                            </div>

                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{collection.name}</h1>
                            {collection.description && (
                                <p className="text-xl text-gray-300 max-w-2xl mb-6">{collection.description}</p>
                            )}

                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold">
                                    {collection.owner?.imageUrl ? (
                                        <img src={collection.owner.imageUrl} alt={collection.owner.fullName} className="w-full h-full rounded-full" />
                                    ) : (
                                        <User size={16} />
                                    )}
                                </div>
                                <span className="text-gray-400 text-sm">
                                    Curated by <span className="text-white font-medium">{collection.owner?.fullName || 'Anonymous'}</span>
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition">
                                <Share2 size={18} />
                                Share
                            </button>
                            {/* Edit buttons would go here for owner */}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12">
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-white mb-6">Tools in this Collection ({collection.tools.length})</h2>

                    {collection.tools.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {collection.tools.map(tool => (
                                <ToolCard key={tool._id} tool={tool} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                            <p className="text-gray-400">This collection is empty.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
