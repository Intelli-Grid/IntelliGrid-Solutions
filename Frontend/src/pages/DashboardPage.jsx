import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { userService, collectionService, toolService, gdprService, submissionService, paymentService } from '../services'
import LoadingSpinner from '../components/common/LoadingSpinner'
import DashboardSkeleton from '../components/common/DashboardSkeleton'
import EmptyState from '../components/common/EmptyState'
import ErrorMessage from '../components/common/ErrorMessage'
import ToolCard from '../components/tools/ToolCard'
import { User, Heart, Star, Eye, TrendingUp, Folder, FolderPlus, Plus, Trash2, ExternalLink, Briefcase, Pencil, Shield, Download, AlertTriangle, Loader2, XCircle, Clock, Package, Share2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import EditToolModal from '../components/tools/EditToolModal'
import CancellationRescueModal from '../components/common/CancellationRescueModal'
import TrialBanner from '../components/common/TrialBanner'
import { useFlag } from '../hooks/useFeatureFlags'
import { useNudge } from '../components/common/NudgeContext'

export default function DashboardPage() {
    const { user, isLoaded } = useUser()
    const rescueEnabled = useFlag('CANCELLATION_RESCUE')
    const { fireNudgeFromError } = useNudge()
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
    // Cancellation rescue modal state
    const [rescueOpen, setRescueOpen] = useState(false)
    const [cancellingSubscription, setCancellingSubscription] = useState(false)
    // View History tab — lazy loaded
    const [viewHistory, setViewHistory] = useState(null)
    const [historyLoading, setHistoryLoading] = useState(false)

    useEffect(() => {
        if (isLoaded && user) {
            fetchDashboardData()
        }
    }, [isLoaded, user])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)
            setError(null)

            const [statsResponse, favoritesResponse, collectionsResponse, managedResponse, historyResponse] = await Promise.allSettled([
                userService.getStats(),
                userService.getFavorites(),
                collectionService.getMyCollections(),
                toolService.getManagedTools(),
                userService.getHistory(20)
            ])

            if (historyResponse.status === 'fulfilled') {
                setViewHistory(historyResponse.value.history || [])
            } else {
                setViewHistory([])
            }

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
            const msg = err?.response?.data?.message || err?.message || ''
            if (msg.includes('COLLECTIONS_LIMIT_REACHED')) {
                fireNudgeFromError(err)
            } else {
                toast.error('Failed to create collection')
            }
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

    // ── Cancellation Rescue ──────────────────────────────────────────────────
    // When flag is ON: show rescue modal first, confirm fires actual cancel
    // When flag is OFF: cancel immediately on button click
    const handleCancelClick = () => {
        if (rescueEnabled) {
            setRescueOpen(true)
        } else {
            executeCancelSubscription()
        }
    }

    const executeCancelSubscription = async () => {
        try {
            setCancellingSubscription(true)
            await paymentService.cancelPayPalSubscription()
            toast.success('Subscription cancelled. Your Pro access continues until the end of the billing period.')
            setRescueOpen(false)
            // Refresh subscription state
            fetchDashboardData()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to cancel subscription. Please contact support.')
        } finally {
            setCancellingSubscription(false)
        }
    }

    if (!isLoaded || loading) {
        return <DashboardSkeleton />
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

            {/* Trial Banner — only visible when user is on an active reverse trial */}
            {subscription?.reverseTrial?.active && (
                <div className="mb-6">
                    <TrialBanner subscription={subscription} />
                </div>
            )}

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
                <button
                    onClick={() => setActiveTab('submissions')}
                    className={`pb-4 text-sm font-medium transition whitespace-nowrap ${activeTab === 'submissions'
                        ? 'border-b-2 border-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    My Submissions
                </button>
                <button
                    onClick={() => setActiveTab('privacy')}
                    className={`pb-4 text-sm font-medium transition whitespace-nowrap ${activeTab === 'privacy'
                        ? 'border-b-2 border-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    🔒 Privacy
                </button>
                <button
                    onClick={() => {
                        setActiveTab('history')
                        if (viewHistory === null) {
                            setHistoryLoading(true)
                            userService.getHistory(20)
                                .then(res => setViewHistory(res?.history || []))
                                .catch(() => setViewHistory([]))
                                .finally(() => setHistoryLoading(false))
                        }
                    }}
                    className={`pb-4 text-sm font-medium transition whitespace-nowrap ${activeTab === 'history'
                        ? 'border-b-2 border-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    🕐 History
                </button>
            </div>

            {/* Tab Content */}
            {
                activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Recent Activity */}
                            <div className="rounded-lg border border-white/10 bg-white/5 p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                                        {viewHistory && viewHistory.length > 3 && (
                                            <button
                                                onClick={() => setActiveTab('history')}
                                                className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition"
                                            >
                                                View All
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {viewHistory && viewHistory.length > 0 ? (
                                            viewHistory.slice(0, 3).map((entry) => entry.tool && (
                                                <div key={entry._id} className="flex items-center justify-between border-b border-white/5 pb-3 pt-1 last:border-0 last:pb-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-800 flex items-center justify-center">
                                                            {entry.tool.logo || entry.tool.imageUrl ? (
                                                                <img
                                                                    src={entry.tool.logo || entry.tool.imageUrl}
                                                                    alt={entry.tool.name || entry.tool.toolName}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="text-xs font-bold text-gray-400">
                                                                    {(entry.tool.name || entry.tool.toolName || '?').charAt(0).toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <Link to={`/tool/${entry.tool.slug}`} className="text-sm font-semibold text-white transition hover:text-purple-400">
                                                                {entry.tool.name || entry.tool.toolName}
                                                            </Link>
                                                            <div className="text-xs text-gray-400">
                                                                {new Date(entry.viewedAt).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <Link to={`/tool/${entry.tool.slug}`} className="rounded bg-white/5 px-3 py-1 text-xs text-gray-300 hover:bg-white/10 transition whitespace-nowrap">
                                                        Visit
                                                    </Link>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-gray-400 mt-4 text-sm">No recent activity to display.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Current Plan card */}
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
                                    {/* isPaidSubscriber: match User model enum 'Free'|'Basic'|'Premium'|'Enterprise' */}
                                    {['Pro', 'Premium', 'Business', 'Enterprise', 'Basic'].includes(subscription?.tier) && subscription?.status === 'active' ? (
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
                                        <span className="text-gray-400">Favourites Limit</span>
                                        <span className="text-white">{['Premium', 'Enterprise'].includes(subscription?.tier) ? 'Unlimited' : '10'}</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                                        <div
                                            className={`h-1.5 rounded-full ${favorites.length >= 10 && !['Premium', 'Enterprise'].includes(subscription?.tier) ? 'bg-red-500' : 'bg-purple-500'}`}
                                            style={{ width: `${Math.min((favorites.length / (['Premium', 'Enterprise'].includes(subscription?.tier) ? Math.max(favorites.length * 1.5, 100) : 10)) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Cancel Subscription button — only for active paid subscribers */}
                                {['Pro', 'Premium', 'Business', 'Enterprise', 'Basic'].includes(subscription?.tier) && subscription?.status === 'active' && (
                                    <div className="mt-5 pt-4 border-t border-white/5">
                                        <button
                                            id="cancel-subscription-btn"
                                            onClick={handleCancelClick}
                                            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors"
                                        >
                                            <XCircle size={12} />
                                            Cancel Subscription
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'my-tools' && (
                    managedTools.length === 0 ? (
                        <EmptyState
                            icon={Package}
                            title="No tools yet"
                            description="Submit your AI tool to reach thousands of discovery-ready users."
                            action={{ label: 'Submit a Tool', href: '/submit' }}
                        />
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 cards-grid">
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
                                                {collection.isPublic && collection.slug && (
                                                    <button
                                                        onClick={() => {
                                                            const url = `${window.location.origin}/collections/${collection.slug}`
                                                            navigator.clipboard.writeText(url)
                                                                .then(() => toast.success('Collection link copied!'))
                                                                .catch(() => toast.error('Failed to copy link'))
                                                        }}
                                                        className="inline-flex items-center gap-1 text-sm font-medium text-gray-400 hover:text-white transition"
                                                        title="Copy shareable link"
                                                    >
                                                        <Share2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState
                                icon={FolderPlus}
                                title="No collections yet"
                                description="Create your first collection to organise and share your favourite AI tools."
                                size="sm"
                            />
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
                                    if (!['Basic', 'Pro', 'Premium', 'Business', 'Enterprise'].includes(subscription?.tier)) {
                                        toast.error('Exporting favorites is a paid plan feature')
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
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${['Basic', 'Pro', 'Premium', 'Business', 'Enterprise'].includes(subscription?.tier)
                                    ? 'bg-white/10 text-white hover:bg-white/20'
                                    : 'bg-white/5 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                {['Basic', 'Pro', 'Premium', 'Business', 'Enterprise'].includes(subscription?.tier) ? 'Export CSV' : 'Export CSV (Paid Plan)'}
                            </button>
                        </div>

                        {favorites.length > 0 ? (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 cards-grid">
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
                            <EmptyState
                                icon={Heart}
                                title="No favourites yet"
                                description="Save tools you love so you can find them instantly."
                                action={{ label: 'Browse Tools', href: '/tools' }}
                            />
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

            {/* GDPR / Privacy Tab */}
            {activeTab === 'privacy' && <PrivacyTab user={user} />}

            {/* My Submissions Tab */}
            {activeTab === 'submissions' && <MySubmissionsTab />}

            {/* View History Tab */}
            {activeTab === 'history' && (
                <div>
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">Recently Viewed</h2>
                            <p className="text-sm text-gray-500 mt-0.5">Tools you have visited, newest first</p>
                        </div>
                        {viewHistory && viewHistory.length > 0 && (
                            <span className="text-xs text-gray-600">{viewHistory.length} tools</span>
                        )}
                    </div>

                    {historyLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <LoadingSpinner text="Loading history..." />
                        </div>
                    ) : viewHistory && viewHistory.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {viewHistory.map((entry) => (
                                entry.tool && (
                                    <div key={entry.tool._id} className="relative">
                                        <ToolCard tool={entry.tool} />
                                        <div className="absolute bottom-3 right-3">
                                            <span className="text-[10px] text-gray-600 bg-black/60 px-2 py-0.5 rounded-full">
                                                {new Date(entry.viewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-12 text-center">
                            <Eye className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                            <h3 className="mb-2 text-lg font-semibold text-white">No history yet</h3>
                            <p className="mb-4 text-sm text-gray-400">
                                Tools you visit will appear here automatically
                            </p>
                            <Link
                                to="/tools"
                                className="inline-block rounded-lg bg-purple-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-purple-700"
                            >
                                Browse Tools
                            </Link>
                        </div>
                    )}
                </div>
            )}

            <EditToolModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false)
                    setEditingToolId(null)
                }}
                toolId={editingToolId}
                onSuccess={handleEditSuccess}
            />

            {/* Cancellation Rescue Modal — only mounts when CANCELLATION_RESCUE flag is ON */}
            {rescueEnabled && (
                <CancellationRescueModal
                    isOpen={rescueOpen}
                    onClose={() => setRescueOpen(false)}
                    onConfirmCancel={executeCancelSubscription}
                    planName={subscription?.tier || 'Professional'}
                    isLoading={cancellingSubscription}
                />
            )}
        </div >
    )
}

// ─── GDPR / Privacy Tab ───────────────────────────────────────────────────────
function PrivacyTab({ user }) {
    const [summary, setSummary] = useState(null)
    const [summaryLoading, setSummaryLoading] = useState(true)
    const [exportLoading, setExportLoading] = useState(false)
    const [deleteStage, setDeleteStage] = useState(0)  // 0=idle 1=confirm 2=deleting
    const [deleteError, setDeleteError] = useState(null)

    useEffect(() => {
        gdprService.getSummary()
            .then(d => setSummary(d.summary || d))
            .catch(() => { })
            .finally(() => setSummaryLoading(false))
    }, [])

    const handleExport = async () => {
        setExportLoading(true)
        try {
            const res = await gdprService.exportData()
            const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `intelligrid-data-${Date.now()}.json`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('Your data export has been downloaded!')
        } catch {
            toast.error('Export failed. Please try again.')
        } finally {
            setExportLoading(false)
        }
    }

    const handleDelete = async () => {
        if (deleteStage < 2) { setDeleteStage(deleteStage + 1); return }
        setDeleteStage(3)
        try {
            await gdprService.deleteData()
            toast.success('Your account has been scheduled for deletion. You will be logged out shortly.')
            setTimeout(() => window.location.href = '/', 3000)
        } catch (e) {
            setDeleteError(e.response?.data?.message || 'Failed to process deletion request.')
            setDeleteStage(0)
        }
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">Privacy & Your Data</h2>
                <p className="text-sm text-gray-500">You have full rights over your personal data under GDPR.</p>
            </div>

            {/* Data Summary */}
            <div className="rounded-xl border border-white/8 bg-white/3 p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-400" /> Data We Hold About You
                </h3>
                {summaryLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading summary...</div>
                ) : summary ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {Object.entries(summary).map(([key, val]) => (
                            <div key={key} className="rounded-lg bg-white/5 border border-white/8 px-4 py-3">
                                <p className="text-xs text-gray-500 capitalize mb-0.5">{key.replace(/([A-Z])/g, ' $1')}</p>
                                <p className="text-lg font-bold text-white">{typeof val === 'number' ? val.toLocaleString() : val}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-600">Summary unavailable</p>
                )}
            </div>

            {/* Export */}
            <div className="rounded-xl border border-white/8 bg-white/3 p-6">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <Download className="h-4 w-4 text-blue-400" /> Export Your Data
                </h3>
                <p className="text-sm text-gray-500 mb-4">Download a complete copy of all data we hold about you in JSON format.</p>
                <button
                    onClick={handleExport}
                    disabled={exportLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                    {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {exportLoading ? 'Generating export...' : 'Download My Data'}
                </button>
            </div>

            {/* Deletion */}
            <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-6">
                <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" /> Request Account Deletion
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    This will permanently delete your account and all associated data. This action is irreversible.
                </p>
                {deleteError && <p className="text-xs text-red-400 mb-3">{deleteError}</p>}
                {deleteStage === 0 && (
                    <button onClick={handleDelete} className="px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-sm font-semibold transition-colors">
                        Request Deletion
                    </button>
                )}
                {deleteStage === 1 && (
                    <div className="space-y-3">
                        <p className="text-sm text-amber-400 font-medium">⚠️ Are you sure? This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={handleDelete} className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors">Yes, delete everything</button>
                            <button onClick={() => setDeleteStage(0)} className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
                        </div>
                    </div>
                )}
                {deleteStage === 3 && (
                    <div className="flex items-center gap-2 text-sm text-red-400"><Loader2 className="h-4 w-4 animate-spin" /> Processing deletion request...</div>
                )}
            </div>
        </div>
    )
}

// ─── My Submissions Tab ──────────────────────────────────────────────────────
function MySubmissionsTab() {
    const [submissions, setSubmissions] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        submissionService.getMine()
            .then(d => setSubmissions(d.submissions || d || []))
            .catch(() => setSubmissions([]))
            .finally(() => setLoading(false))
    }, [])

    const STATUS_STYLES = {
        pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    }

    if (loading) {
        return <div className="flex justify-center py-12"><LoadingSpinner /></div>
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">My Submissions</h2>
                    <p className="text-sm text-gray-500">Tools you've submitted for review.</p>
                </div>
                <Link
                    to="/submit"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
                >
                    <Plus className="h-4 w-4" /> Submit Another
                </Link>
            </div>

            {submissions.length === 0 ? (
                <EmptyState
                    icon={Package}
                    title="No submissions yet"
                    description="Share an AI tool with the IntelliGrid community and help others discover it."
                    action={{ label: 'Submit Your First Tool', href: '/submit' }}
                    size="sm"
                />
            ) : (
                <div className="space-y-3">
                    {submissions.map(sub => (
                        <div key={sub._id} className="rounded-xl border border-white/8 bg-white/3 p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-white">{sub.toolName}</h3>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLES[sub.status] || STATUS_STYLES.pending}`}>
                                            {sub.status}
                                        </span>
                                        {sub.category && (
                                            <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/15 px-2 py-0.5 rounded-full">{sub.category}</span>
                                        )}
                                        {sub.pricing && (
                                            <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{sub.pricing}</span>
                                        )}
                                    </div>
                                    <a href={sub.officialUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">
                                        {sub.officialUrl}
                                    </a>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{sub.shortDescription}</p>
                                    {sub.reviewNotes && (
                                        <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${sub.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            <span className="font-semibold">Reviewer note:</span> {sub.reviewNotes}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-600 flex-shrink-0 whitespace-nowrap">{new Date(sub.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

        </div>
    )
}
