import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import {
    LayoutDashboard,
    Package,
    Users,
    Star,
    DollarSign,
    BarChart3,
    Settings,
    Plus,
    Edit,
    Trash2,
    Search,
    Check,
    X,
    Filter,
    ShieldCheck,
    Mail,
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import ErrorMessage from '../components/common/ErrorMessage'
import { adminService, toolService } from '../services'
import { useToast } from '../context/ToastContext'
import EditToolModal from '../components/tools/EditToolModal'
import WorkspaceSwitcher from '../components/admin/WorkspaceSwitcher'

export default function AdminPage() {
    const { user } = useUser()
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState('overview')
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalTools: 0,
        totalUsers: 0,
        totalReviews: 0,
        totalRevenue: 0,
    })

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            // The axios interceptor already unwraps response.data
            // so `data` here IS the response body: { success, stats }
            const data = await adminService.getStats()
            if (data && data.success) {
                setStats({
                    totalTools: data.stats?.totalTools ?? 0,
                    totalUsers: data.stats?.totalUsers ?? 0,
                    totalReviews: data.stats?.totalReviews ?? 0,
                    totalRevenue: data.stats?.totalRevenue ?? 0,
                })
            } else if (data) {
                // API responded but without success flag — use whatever data we got
                setStats(prev => ({ ...prev, ...data.stats }))
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error)
            toast({
                title: 'Error',
                description: 'Failed to load dashboard statistics',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    // Role check — support all admin-tier roles (legacy + new RBAC)
    const ADMIN_ROLES = ['admin', 'MODERATOR', 'TRUSTED_OPERATOR', 'SUPERADMIN']
    const userRole = user?.publicMetadata?.role
    const isAdmin = ADMIN_ROLES.includes(userRole)

    if (!isAdmin) {
        return (
            <div className="container mx-auto px-4 py-16">
                <div className="mx-auto max-w-md rounded-lg border border-red-500/20 bg-red-500/10 p-8 text-center">
                    <h1 className="mb-2 text-2xl font-bold text-white">Access Denied</h1>
                    <p className="text-gray-400">You don't have permission to access the admin panel.</p>
                    <p className="mt-2 text-xs text-gray-600">Role: {userRole || 'none'}</p>
                </div>
            </div>
        )
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'tools', label: 'Tools', icon: Package },
        { id: 'claims', label: 'Claims', icon: ShieldCheck },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'reviews', label: 'Reviews', icon: Star },
        { id: 'payments', label: 'Payments', icon: DollarSign },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: Settings },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex items-start justify-between">
                    <div>
                        <h1 className="mb-2 text-4xl font-bold text-white">Admin Panel</h1>
                        <p className="text-gray-400">Manage your IntelliGrid platform</p>
                    </div>
                    <WorkspaceSwitcher currentWorkspace="admin" />
                </div>

                {/* Stats Grid */}
                <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-white/10 bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-6">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm text-gray-400">Total Tools</div>
                            <Package className="h-5 w-5 text-purple-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">{stats.totalTools.toLocaleString()}</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm text-gray-400">Total Users</div>
                            <Users className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">{stats.totalUsers.toLocaleString()}</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-6">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm text-gray-400">Total Reviews</div>
                            <Star className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">{stats.totalReviews.toLocaleString()}</div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-gradient-to-br from-green-500/10 to-green-500/5 p-6">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm text-gray-400">Revenue</div>
                            <DollarSign className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">${stats.totalRevenue.toLocaleString()}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-8 flex space-x-2 overflow-x-auto border-b border-white/10 pb-4">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${activeTab === tab.id
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Tab Content */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                    {activeTab === 'overview' && <OverviewTab />}
                    {activeTab === 'tools' && <ToolsTab />}
                    {activeTab === 'claims' && <ClaimsTab />}
                    {activeTab === 'users' && <UsersTab />}
                    {activeTab === 'reviews' && <ReviewsTab />}
                    {activeTab === 'payments' && <PaymentsTab />}
                    {activeTab === 'analytics' && <AnalyticsTab />}
                    {activeTab === 'settings' && <SettingsTab />}
                </div>
            </div>
        </div>
    )
}

// Tab Components
function OverviewTab() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                    <h3 className="mb-4 font-semibold text-white">Recent Activity</h3>
                    <p className="text-sm text-gray-400">No recent activity</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                    <h3 className="mb-4 font-semibold text-white">Quick Actions</h3>
                    <div className="space-y-2">
                        <button className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm text-white transition hover:bg-purple-700">
                            Add New Tool
                        </button>
                        <button className="w-full rounded-lg border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/5">
                            Moderate Reviews
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ToolsTab() {
    const [activeView, setActiveView] = useState('pending') // 'pending' or 'all'
    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingToolId, setEditingToolId] = useState(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        fetchTools()
    }, [activeView])

    const fetchTools = async () => {
        setLoading(true)
        try {
            let data
            if (activeView === 'pending') {
                data = await adminService.getPendingTools()
                if (data.success) setTools(data.tools)
            } else {
                // Fetch all tools (limit 50 for now)
                data = await toolService.getTools({ limit: 50, sort: '-createdAt' })
                if (data.success) setTools(data.data) // toolService.getTools returns { success: true, count: N, data: [...] } usually. Standard wrapper returns data directly? Let's check service logic.
                // In service: return response.data.  Backend: res.status(200).json({ success: true, count: tools.length, data: tools }) usually.
                // Wait, toolController.getAllTools returns { success: true, count: ..., data: tools }? 
                // Let's assume standard response structure. If fails, I'll fix it.
                // toolService.getTools returns response.data.
                // It likely has `data` property with array.
                if (data.data) setTools(data.data)
                else if (Array.isArray(data)) setTools(data) // Fallback
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to fetch tools',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id) => {
        try {
            await adminService.approveTool(id)
            toast({ title: 'Success', description: 'Tool approved', variant: 'default' })
            fetchTools()
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to approve tool', variant: 'destructive' })
        }
    }

    const handleReject = async (id) => {
        if (!window.confirm('Delete this tool?')) return
        try {
            await adminService.deleteTool(id)
            toast({ title: 'Success', description: 'Tool deleted', variant: 'default' })
            fetchTools()
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete tool', variant: 'destructive' })
        }
    }

    const handleEdit = (id) => {
        setEditingToolId(id)
        setIsEditModalOpen(true)
    }

    const handleInvite = async (id) => {
        const email = window.prompt("Enter new contact email (leave blank to use existing tool email):")
        if (email === null) return // Cancelled

        try {
            const data = {}
            if (email) data.contactEmail = email

            await adminService.sendInvitation(id, data)
            toast({ title: 'Success', description: 'Invitation sent successfully', variant: 'default' })
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to send invitation',
                variant: 'destructive'
            })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex space-x-2 bg-white/5 p-1 rounded-lg border border-white/10">
                    <button
                        onClick={() => setActiveView('pending')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${activeView === 'pending' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        Pending Review
                    </button>
                    <button
                        onClick={() => setActiveView('all')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${activeView === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        All Tools
                    </button>
                </div>

                <button className="flex items-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white transition hover:bg-purple-700">
                    <Plus className="h-4 w-4" />
                    <span>Add Tool</span>
                </button>
            </div>

            {loading ? (
                <div className="py-12 flex justify-center"><LoadingSpinner /></div>
            ) : tools.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white/5 rounded-lg border border-white/10">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No tools found.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {tools.map((tool) => (
                        <div key={tool._id} className="flex items-center justify-between p-4 rounded-lg border border-white/10 bg-white/5 transition hover:border-white/20">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-white">{tool.name}</h3>
                                    {tool.status === 'pending' && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded">Pending</span>}
                                    {tool.status === 'active' && <span className="text-[10px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded">Active</span>}
                                </div>
                                <p className="text-sm text-gray-400 line-clamp-1">{tool.shortDescription}</p>
                                <div className="flex gap-2 mt-2 text-xs">
                                    <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-300">
                                        {tool.pricing?.type || tool.pricing}
                                    </span>
                                    <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                                        {typeof tool.category === 'object' ? tool.category.name : 'Uncategorized'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                                {activeView === 'pending' ? (
                                    <>
                                        <button
                                            onClick={() => handleInvite(tool._id)}
                                            className="p-2 rounded-lg bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 transition"
                                            title="Send Claim Invitation"
                                        >
                                            <Mail className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleApprove(tool._id)}
                                            className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
                                            title="Approve"
                                        >
                                            <Check className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleReject(tool._id)}
                                            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                                            title="Reject"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleEdit(tool._id)}
                                            className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
                                            title="Edit"
                                        >
                                            <Edit className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleReject(tool._id)}
                                            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <EditToolModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                toolId={editingToolId}
                onUpdate={fetchTools}
            />
        </div>
    )
}

function ClaimsTab() {
    const [claims, setClaims] = useState([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    useEffect(() => {
        fetchPendingClaims()
    }, [])

    const fetchPendingClaims = async () => {
        try {
            const data = await adminService.getPendingClaims()
            if (data.success) {
                setClaims(data.claims)
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to fetch pending claims',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id) => {
        try {
            await adminService.approveClaim(id)
            toast({
                title: 'Success',
                description: 'Claim approved successfully',
                variant: 'default',
            })
            fetchPendingClaims()
        } catch (error) {
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to approve claim',
                variant: 'destructive',
            })
        }
    }

    const handleReject = async (id) => {
        if (!window.confirm('Are you sure you want to reject this claim?')) return

        try {
            await adminService.rejectClaim(id)
            toast({
                title: 'Success',
                description: 'Claim rejected successfully',
                variant: 'default',
            })
            fetchPendingClaims()
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to reject claim',
                variant: 'destructive',
            })
        }
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Pending Claims ({claims.length})</h2>

            {claims.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white/5 rounded-lg border border-white/10">
                    <ShieldCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending claims to review.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {claims.map((claim) => (
                        <div key={claim._id} className="p-4 rounded-lg border border-white/10 bg-white/5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-semibold text-white text-lg">{claim.tool?.name || 'Unknown Tool'}</h3>
                                        <span className="text-xs text-gray-500">ID: {claim.tool?._id || claim.tool}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-300">
                                        <div>
                                            <span className="text-gray-500 block text-xs uppercase">Claimant Email</span>
                                            {claim.email}
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block text-xs uppercase">Role</span>
                                            {claim.role}
                                        </div>
                                        {claim.verificationInfo && (
                                            <div className="col-span-2 mt-2 pt-2 border-t border-white/5">
                                                <span className="text-gray-500 block text-xs uppercase">Verification Info</span>
                                                {claim.verificationInfo}
                                            </div>
                                        )}
                                        {claim.user && (
                                            <div className="col-span-2 mt-2 flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-300">
                                                    {claim.user.firstName?.[0] || 'U'}
                                                </div>
                                                <span className="text-xs text-gray-400">Linked User: {claim.user.firstName} {claim.user.lastName}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => handleApprove(claim._id)}
                                        className="px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 text-sm font-medium transition flex items-center gap-1"
                                    >
                                        <Check className="h-4 w-4" /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(claim._id)}
                                        className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-sm font-medium transition flex items-center gap-1"
                                    >
                                        <X className="h-4 w-4" /> Reject
                                    </button>
                                </div>
                            </div>
                            <div className="mt-3 text-xs text-gray-600">
                                Submitted: {new Date(claim.createdAt).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function UsersTab() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">User Management</h2>
            <p className="text-gray-400">Manage users, subscriptions, and permissions</p>
        </div>
    )
}

function ReviewsTab() {
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    useEffect(() => {
        fetchPendingReviews()
    }, [])

    const fetchPendingReviews = async () => {
        try {
            const data = await adminService.getPendingReviews()
            if (data.success) {
                setReviews(data.reviews)
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to fetch pending reviews',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id) => {
        try {
            await adminService.approveReview(id)
            toast({
                title: 'Success',
                description: 'Review approved successfully',
                variant: 'default',
            })
            fetchPendingReviews() // Refresh
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to approve review',
                variant: 'destructive',
            })
        }
    }

    const handleReject = async (id) => {
        if (!window.confirm('Are you sure you want to reject this review?')) return

        try {
            await adminService.rejectReview(id)
            toast({
                title: 'Success',
                description: 'Review rejected successfully',
                variant: 'default',
            })
            fetchPendingReviews() // Refresh
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to reject review',
                variant: 'destructive',
            })
        }
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Pending Reviews ({reviews.length})</h2>

            {reviews.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white/5 rounded-lg border border-white/10">
                    <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No pending reviews to moderate.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review._id} className="p-4 rounded-lg border border-white/10 bg-white/5 hover:border-white/20 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-white">{review.tool?.name || 'Unknown Tool'}</span>
                                        <span className="flex text-yellow-400">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-current' : 'text-gray-600'}`} />
                                            ))}
                                        </span>
                                    </div>
                                    <h4 className="font-medium text-white mb-1">{review.title}</h4>
                                    <p className="text-gray-300 text-sm mb-2">{review.content}</p>

                                    {(review.pros?.length > 0 || review.cons?.length > 0) && (
                                        <div className="grid grid-cols-2 gap-4 text-xs mt-2 p-2 bg-black/20 rounded">
                                            {review.pros?.length > 0 && (
                                                <div>
                                                    <span className="text-green-400 font-semibold block mb-1">Pros</span>
                                                    <ul className="list-disc pl-4 text-gray-400">
                                                        {review.pros.map((p, i) => <li key={i}>{p}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {review.cons?.length > 0 && (
                                                <div>
                                                    <span className="text-red-400 font-semibold block mb-1">Cons</span>
                                                    <ul className="list-disc pl-4 text-gray-400">
                                                        {review.cons.map((c, i) => <li key={i}>{c}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2 min-w-[100px]">
                                    <button
                                        onClick={() => handleApprove(review._id)}
                                        className="px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 text-sm font-medium transition flex items-center justify-center gap-1"
                                    >
                                        <Check className="h-4 w-4" /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(review._id)}
                                        className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-sm font-medium transition flex items-center justify-center gap-1"
                                    >
                                        <X className="h-4 w-4" /> Reject
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 border-t border-white/5 pt-2 mt-2">
                                <span className="flex items-center gap-1">
                                    <User size={12} />
                                    {review.user ? `${review.user.firstName} ${review.user.lastName}` : 'Unknown User'}
                                </span>
                                <span>•</span>
                                <span>{review.user?.email}</span>
                                <span>•</span>
                                <span>{new Date(review.createdAt).toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function PaymentsTab() {
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    useEffect(() => {
        fetchPayments()
    }, [])

    const fetchPayments = async () => {
        try {
            const data = await adminService.getPayments({ limit: 20 })
            if (data.success) {
                setPayments(data.payments)
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to fetch payments',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <LoadingSpinner />

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Recent Transactions</h2>

            <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-white/5 text-xs uppercase text-gray-200">
                        <tr>
                            <th className="px-6 py-3">ID</th>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {payments.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center">No payments found</td>
                            </tr>
                        ) : (
                            payments.map((payment) => (
                                <tr key={payment._id} className="hover:bg-white/5">
                                    <td className="px-6 py-4 font-mono text-xs">{payment.paymentId ? payment.paymentId.substring(0, 12) + '...' : payment._id}</td>
                                    <td className="px-6 py-4">{payment.userId}</td>
                                    <td className="px-6 py-4 text-white font-medium">${payment.amount}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${payment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                            payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                            {payment.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{new Date(payment.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function AnalyticsTab() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Analytics & Reports</h2>
            <p className="text-gray-400">View detailed analytics and generate reports</p>
        </div>
    )
}

function SettingsTab() {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
            <div className="space-y-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-2 font-semibold text-white">General Settings</h3>
                    <p className="text-sm text-gray-400">Configure platform-wide settings</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-2 font-semibold text-white">Payment Settings</h3>
                    <p className="text-sm text-gray-400">Manage PayPal and Cashfree configurations</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-2 font-semibold text-white">Email Settings</h3>
                    <p className="text-sm text-gray-400">Configure email notifications</p>
                </div>
            </div>
        </div>
    )
}
