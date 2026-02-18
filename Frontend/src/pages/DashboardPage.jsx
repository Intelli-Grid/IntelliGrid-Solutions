import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { userService, collectionService } from '../services'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import ToolCard from '../components/tools/ToolCard'
import { User, Heart, Star, Eye, TrendingUp, Folder, FolderPlus, Plus, Trash2, ExternalLink, Briefcase, Pencil } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import EditToolModal from '../components/tools/EditToolModal'

export default function DashboardPage() {
    const { user, isLoaded } = useUser()
    const [stats, setStats] = useState(null)
    const [subscription, setSubscription] = useState(null)
    const [favorites, setFavorites] = useState([])
    const [collections, setCollections] = useState([])
    const [managedTools, setManagedTools] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('overview')
    const [newCollectionName, setNewCollectionName] = useState('')
    const [creatingCollection, setCreatingCollection] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingToolId, setEditingToolId] = useState(null)

    useEffect(() => {
        if (isLoaded && user) {
            fetchDashboardData()
        }
    }, [isLoaded, user])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)
            setError(null)

            const [statsResponse, favoritesResponse, collectionsResponse, managedResponse] = await Promise.allSettled([
                userService.getStats(),
                userService.getFavorites(),
                collectionService.getMyCollections(),
                toolService.getManagedTools()
            ])

            if (statsResponse.status === 'fulfilled') {
                setStats(statsResponse.value.stats)
                setSubscription(statsResponse.value.subscription)
            } else {
                setStats({ reviewsCount: 0, totalViews: 0, activityScore: 0 })
                setSubscription(null)
            }

            if (favoritesResponse.status === 'fulfilled') {
                setFavorites(favoritesResponse.value.favorites || [])
            } else {
                setFavorites([])
            }

            if (collectionsResponse.status === 'fulfilled') {
                setCollections(collectionsResponse.value.data || collectionsResponse.value || [])
            } else {
                setCollections([])
            }

            if (managedResponse.status === 'fulfilled') {
                setManagedTools(managedResponse.value.data || managedResponse.value || [])
            } else {
                setManagedTools([])
            }

        } catch (err) {
            console.error('Error fetching dashboard data:', err)
            setStats({ reviewsCount: 0, totalViews: 0, activityScore: 0 })
            setFavorites([])
            setCollections([])
            setManagedTools([])
        } finally {
            setLoading(false)
        }
    }

    const handleRemoveFavorite = async (toolId) => {
        try {
            await userService.removeFavorite(toolId)
            setFavorites((prev) => prev.filter((tool) => tool._id !== toolId))
        } catch (err) {
            console.error('Error removing favorite:', err)
        }
    }

    const handleCreateCollection = async (e) => {
        e.preventDefault()
        if (!newCollectionName.trim()) return

        try {
            setCreatingCollection(true)
            const response = await collectionService.createCollection({ name: newCollectionName })
            const newCollection = response.data || response // Adjust based on API response structure
            setCollections([newCollection, ...collections])
            setNewCollectionName('')
            toast.success('Collection created successfully!')
        } catch (err) {
            console.error('Error creating collection:', err)
            toast.error('Failed to create collection')
        } finally {
            setCreatingCollection(false)
        }
    }

    const handleDeleteCollection = async (id) => {
        if (!window.confirm('Are you sure you want to delete this collection?')) return

        try {
            await collectionService.deleteCollection(id)
            setCollections(collections.filter(c => c._id !== id))
            toast.success('Collection deleted')
        } catch (err) {
            console.error('Error deleting collection:', err)
            toast.error('Failed to delete collection')
        }
    }

    const handleEditTool = (toolId) => {
        setEditingToolId(toolId)
        setIsEditModalOpen(true)
    }

    const handleEditSuccess = () => {
        setIsEditModalOpen(false)
        setEditingToolId(null)
        fetchDashboardData() // Refresh data
        toast.success('Tool updated successfully')
    }

    if (!isLoaded || loading) {
        return (
            <div className="container mx-auto px-4 py-16">
                <LoadingSpinner text="Loading dashboard..." />
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-16">
                <ErrorMessage message={error} onRetry={fetchDashboardData} />
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-16">
            {/* Header */}
            <div className="mb-8">
                <h1 className="mb-2 text-4xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-400">Welcome back, {user?.firstName || 'User'}!</p>
            </div>

            {/* Stats Grid */}
            <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-6">
                    <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm text-gray-400">Favorites</div>
                        <Heart className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {favorites.length}
                    </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-6">
                    <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm text-gray-400">Collections</div>
                        <Folder className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {collections.length}
                    </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6">
                    <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm text-gray-400">Reviews</div>
                        <Star className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {stats?.reviewsCount || 0}
                    </div>
                </div>


                {managedTools.length > 0 && (
                    <div className="rounded-lg border border-white/10 bg-gradient-to-br from-pink-500/10 to-pink-500/5 p-6">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm text-gray-400">My Tools</div>
                            <Briefcase className="h-5 w-5 text-pink-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {managedTools.length}
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="mb-8 flex space-x-4 border-b border-white/10 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-4 text-sm font-medium transition whitespace-nowrap ${activeTab === 'overview'
                        ? 'border-b-2 border-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Overview
                </button>
                {managedTools.length > 0 && (
                    <button
                        onClick={() => setActiveTab('my-tools')}
                        className={`pb-4 text-sm font-medium transition whitespace-nowrap ${activeTab === 'my-tools'
                            ? 'border-b-2 border-purple-500 text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        My Tools ({managedTools.length})
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('collections')}
                    className={`pb-4 text-sm font-medium transition whitespace-nowrap ${activeTab === 'collections'
                        ? 'border-b-2 border-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Collections ({collections.length})
                </button>
                <button
                    onClick={() => setActiveTab('favorites')}
                    className={`pb-4 text-sm font-medium transition whitespace-nowrap ${activeTab === 'favorites'
                        ? 'border-b-2 border-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Favorites ({favorites.length})
                </button>
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`pb-4 text-sm font-medium transition whitespace-nowrap ${activeTab === 'profile'
                        ? 'border-b-2 border-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Profile
                </button>
            </div>

            {/* Tab Content */}
            {
                activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Recent Activity */}
                            <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                                <h2 className="mb-4 text-xl font-bold text-white">Recent Activity</h2>
                                {collections.length > 0 || managedTools.length > 0 ? (
                                    <div className="text-gray-300">
                                        You have {collections.length} collections, {favorites.length} saved tools, and {managedTools.length} managed tools.
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-400">No recent activity to display.</p>
                                )}
                            </div>

                            {/* Subscription Status */}
                            <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                                <h2 className="mb-4 text-xl font-bold text-white">Current Plan</h2>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="text-2xl font-bold text-white capitalize">
                                            {subscription?.tier || 'Free'} Plan
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            {subscription?.status === 'active'
                                                ? `Active until ${new Date(subscription.endDate).toLocaleDateString()}`
                                                : 'Upgrade to unlock more features'}
                                        </div>
                                    </div>
                                    {subscription?.tier === 'pro' && subscription?.status === 'active' ? (
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                                            <TrendingUp size={24} />
                                        </div>
                                    ) : (
                                        <Link to="/pricing" className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white font-medium hover:opacity-90 transition">
                                            Upgrade
                                        </Link>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Favorites Limit</span>
                                        <span className="text-white">{subscription?.tier === 'pro' ? 'Unlimited' : '10'}</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                                        <div
                                            className={`h-1.5 rounded-full ${favorites.length >= 10 && subscription?.tier !== 'pro' ? 'bg-red-500' : 'bg-purple-500'}`}
                                            style={{ width: `${Math.min((favorites.length / (subscription?.tier === 'pro' ? favorites.length * 1.5 || 100 : 10)) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'my-tools' && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {managedTools.map((tool) => (
                            <div key={tool._id} className="relative">
                                <ToolCard tool={tool} />
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <button
                                        onClick={() => handleEditTool(tool._id)}
                                        className="rounded-lg bg-black/60 backdrop-blur-md p-2 text-white hover:bg-black/80 transition shadow-lg border border-white/10"
                                        title="Edit Tool"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <span className="rounded-lg bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-lg border border-white/10 flex items-center">
                                        {tool.views} Views
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            {
                activeTab === 'collections' && (
                    <div className="space-y-8">
                        {/* Create New Collection */}
                        <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Create New Collection</h3>
                            <form onSubmit={handleCreateCollection} className="flex gap-4">
                                <input
                                    type="text"
                                    placeholder="e.g., Marketing Stack, Design Tools..."
                                    value={newCollectionName}
                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                                />
                                <button
                                    type="submit"
                                    disabled={!newCollectionName.trim() || creatingCollection}
                                    className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {creatingCollection ? <LoadingSpinner size="sm" /> : <Plus size={18} />}
                                    Create
                                </button>
                            </form>
                        </div>

                        {/* Collections Grid */}
                        {collections.length > 0 ? (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {collections.map((collection) => (
                                    <div key={collection._id} className="group relative rounded-xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10">
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                            <button
                                                onClick={() => handleDeleteCollection(collection._id)}
                                                className="p-2 text-gray-400 hover:text-red-400 transition"
                                                title="Delete collection"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="mb-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Folder className="h-6 w-6 text-purple-400 fill-purple-400/20" />
                                                <h3 className="text-xl font-bold text-white">{collection.name}</h3>
                                            </div>
                                            <p className="text-sm text-gray-400">
                                                {collection.tools.length} Tools • {collection.isPublic ? 'Public' : 'Private'}
                                            </p>
                                        </div>

                                        {/* Preview Icons (first 3) */}
                                        <div className="flex -space-x-2 mb-6">
                                            {collection.tools.slice(0, 3).map((tool, i) => (
                                                <div key={tool._id || i} className="h-8 w-8 rounded-full border border-gray-800 bg-gray-700 flex items-center justify-center text-xs text-white overflow-hidden">
                                                    {tool.logo ? (
                                                        <img src={tool.logo} alt={tool.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        tool.name?.[0]
                                                    )}
                                                </div>
                                            ))}
                                            {collection.tools.length === 0 && (
                                                <div className="h-8 w-8 rounded-full border border-gray-800 bg-gray-800 flex items-center justify-center text-[10px] text-gray-500">
                                                    0
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="text-xs text-gray-500">
                                                {collection.views} views
                                            </div>
                                            <div className="flex gap-2">
                                                <Link
                                                    to={`/collections/${collection.slug || collection._id}`}
                                                    className="inline-flex items-center gap-1 text-sm font-medium text-purple-400 hover:text-purple-300"
                                                >
                                                    View
                                                    <ExternalLink size={14} />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
                                <FolderPlus className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                                <h3 className="mb-2 text-lg font-semibold text-white">No collections yet</h3>
                                <p className="text-sm text-gray-400">
                                    Create your first collection to start organizing tools.
                                </p>
                            </div>
                        )}
                    </div>
                )
            }

            {
                activeTab === 'favorites' && (
                    <div>
                        <div className="flex justify-end mb-4">
                            <button
                                onClick={() => {
                                    if (subscription?.tier !== 'pro') {
                                        toast.error('Exporting favorites is a Pro feature')
                                        return
                                    }

                                    // Generate CSV
                                    const headers = ['Name', 'Description', 'Category', 'URL', 'Added At']
                                    const csvContent = [
                                        headers.join(','),
                                        ...favorites.map(f => {
                                            const tool = f.tool || {}
                                            return [
                                                `"${tool.name || ''}"`,
                                                `"${(tool.shortDescription || '').replace(/"/g, '""')}"`,
                                                `"${(typeof tool.category === 'object' ? tool.category?.name : tool.category) || ''}"`,
                                                `"${tool.officialUrl || ''}"`,
                                                `"${new Date(f.createdAt).toLocaleDateString()}"`
                                            ].join(',')
                                        })
                                    ].join('\n')

                                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                                    const link = document.createElement('a')
                                    if (link.download !== undefined) {
                                        const url = URL.createObjectURL(blob)
                                        link.setAttribute('href', url)
                                        link.setAttribute('download', 'intelligrid_favorites.csv')
                                        link.style.visibility = 'hidden'
                                        document.body.appendChild(link)
                                        link.click()
                                        document.body.removeChild(link)
                                    }
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${subscription?.tier === 'pro'
                                    ? 'bg-white/10 text-white hover:bg-white/20'
                                    : 'bg-white/5 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                {subscription?.tier === 'pro' ? 'Export CSV' : 'Export CSV (Pro)'}
                            </button>
                        </div>

                        {favorites.length > 0 ? (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {favorites.map((tool) => (
                                    <div key={tool._id} className="relative">
                                        <ToolCard tool={tool} />
                                        <button
                                            onClick={() => handleRemoveFavorite(tool._id)}
                                            className="absolute right-4 top-4 rounded-lg bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
                                            title="Remove from favorites"
                                        >
                                            <Heart className="h-4 w-4 fill-current" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-white/10 bg-white/5 p-12 text-center">
                                <Heart className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                                <h3 className="mb-2 text-lg font-semibold text-white">No favorites yet</h3>
                                <p className="mb-4 text-sm text-gray-400">
                                    Start exploring and save your favorite AI tools
                                </p>
                                <a
                                    href="/tools"
                                    className="inline-block rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
                                >
                                    Browse Tools
                                </a>
                            </div>
                        )}
                    </div>
                )
            }

            {
                activeTab === 'profile' && (
                    <div className="space-y-6">
                        <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                            <div className="mb-6 flex items-center space-x-4">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
                                    {user?.imageUrl ? (
                                        <img
                                            src={user.imageUrl}
                                            alt={user.fullName}
                                            className="h-full w-full rounded-full"
                                        />
                                    ) : (
                                        <User className="h-8 w-8 text-white" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{user?.fullName || 'User'}</h2>
                                    <p className="text-sm text-gray-400">
                                        {user?.primaryEmailAddress?.emailAddress}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm text-gray-400">Full Name</label>
                                    <div className="rounded-lg border border-white/10 bg-gray-800 px-4 py-3 text-white">
                                        {user?.fullName || 'Not set'}
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm text-gray-400">Email</label>
                                    <div className="rounded-lg border border-white/10 bg-gray-800 px-4 py-3 text-white">
                                        {user?.primaryEmailAddress?.emailAddress || 'Not set'}
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm text-gray-400">Member Since</label>
                                    <div className="rounded-lg border border-white/10 bg-gray-800 px-4 py-3 text-white">
                                        {user?.createdAt
                                            ? new Date(user.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })
                                            : 'Unknown'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }


            <EditToolModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false)
                    setEditingToolId(null)
                }}
                toolId={editingToolId}
                onSuccess={handleEditSuccess}
            />
        </div >
    )
}
