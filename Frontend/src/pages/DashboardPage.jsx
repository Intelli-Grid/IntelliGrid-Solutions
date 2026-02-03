import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { userService } from '../services'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import ToolCard from '../components/tools/ToolCard'
import { User, Heart, Star, Eye, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
    const { user, isLoaded } = useUser()
    const [stats, setStats] = useState(null)
    const [favorites, setFavorites] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('overview')

    useEffect(() => {
        if (isLoaded && user) {
            fetchDashboardData()
        }
    }, [isLoaded, user])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)
            setError(null)

            // Fetch user stats and favorites in parallel, handle errors gracefully
            const [statsResponse, favoritesResponse] = await Promise.allSettled([
                userService.getStats(),
                userService.getFavorites(),
            ])

            // Handle stats response
            if (statsResponse.status === 'fulfilled') {
                setStats(statsResponse.value.stats)
            } else {
                console.log('Stats not available:', statsResponse.reason?.message)
                setStats({ reviewsCount: 0, totalViews: 0, activityScore: 0 })
            }

            // Handle favorites response
            if (favoritesResponse.status === 'fulfilled') {
                setFavorites(favoritesResponse.value.favorites || [])
            } else {
                console.log('Favorites not available:', favoritesResponse.reason?.message)
                setFavorites([])
            }
        } catch (err) {
            console.error('Error fetching dashboard data:', err)
            // Don't show error, just use default values
            setStats({ reviewsCount: 0, totalViews: 0, activityScore: 0 })
            setFavorites([])
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

                <div className="rounded-lg border border-white/10 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6">
                    <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm text-gray-400">Reviews</div>
                        <Star className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {stats?.reviewsCount || 0}
                    </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-6">
                    <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm text-gray-400">Views</div>
                        <Eye className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {stats?.totalViews || 0}
                    </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-gradient-to-br from-green-500/10 to-green-500/5 p-6">
                    <div className="mb-2 flex items-center justify-between">
                        <div className="text-sm text-gray-400">Activity</div>
                        <TrendingUp className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {stats?.activityScore || 0}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-8 flex space-x-4 border-b border-white/10">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-4 text-sm font-medium transition ${activeTab === 'overview'
                        ? 'border-b-2 border-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('favorites')}
                    className={`pb-4 text-sm font-medium transition ${activeTab === 'favorites'
                        ? 'border-b-2 border-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Favorites ({favorites.length})
                </button>
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`pb-4 text-sm font-medium transition ${activeTab === 'profile'
                        ? 'border-b-2 border-purple-500 text-white'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    Profile
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                        <h2 className="mb-4 text-xl font-bold text-white">Recent Activity</h2>
                        <p className="text-center text-gray-400">No recent activity to display.</p>
                    </div>
                </div>
            )}

            {activeTab === 'favorites' && (
                <div>
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
            )}

            {activeTab === 'profile' && (
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
            )}
        </div>
    )
}
