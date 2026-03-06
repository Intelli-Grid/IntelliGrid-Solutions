import { useState, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import {
    LayoutDashboard,
    Package,
    Users,
    User as UserIcon,
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
    ShieldCheck,
    Mail,
    TrendingUp,
    Activity,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Crown,
    RefreshCw,
    Wifi,
    Radar,
    RotateCcw,
    AlertTriangle,
    Zap,
    ToggleLeft,
    ToggleRight,
    Flag,
    Megaphone,
    BadgeDollarSign,
    Link2,
    BadgePercent,
    Flame,
    Database,
} from 'lucide-react'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { adminService, toolService, submissionService, blogService, couponService } from '../services'
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
                // API responded but without success flag â€” use whatever data we got
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

    // Role check â€” support all admin-tier roles (legacy + new RBAC)
    const ADMIN_ROLES = ['admin', 'ADMIN', 'MODERATOR', 'TRUSTED_OPERATOR', 'SUPERADMIN']
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
        { id: 'affiliate', label: 'Affiliate', icon: Link2 },
        { id: 'enrichment', label: 'Enrichment', icon: Database },
        { id: 'link-health', label: 'Link Health', icon: Wifi },
        { id: 'discovery', label: 'Discovery', icon: Radar },
        { id: 'claims', label: 'Claims', icon: ShieldCheck },
        { id: 'submissions', label: 'Submissions', icon: Plus },
        { id: 'featured-listings', label: 'Sponsored', icon: Megaphone },
        { id: 'blog', label: 'Blog', icon: TrendingUp },
        { id: 'coupons', label: 'Coupons', icon: DollarSign },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'reviews', label: 'Reviews', icon: Star },
        { id: 'payments', label: 'Payments', icon: DollarSign },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'feature-flags', label: 'Feature Flags', icon: Flag },
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
                    {activeTab === 'overview' && <OverviewTab setActiveTab={setActiveTab} stats={stats} />}
                    {activeTab === 'tools' && <ToolsTab />}
                    {activeTab === 'affiliate' && <AffiliateTab />}
                    {activeTab === 'enrichment' && <EnrichmentTab />}
                    {activeTab === 'link-health' && <LinkHealthTab />}
                    {activeTab === 'discovery' && <DiscoveryTab />}
                    {activeTab === 'claims' && <ClaimsTab />}
                    {activeTab === 'submissions' && <SubmissionsTab />}
                    {activeTab === 'featured-listings' && <FeaturedListingsAdminTab />}
                    {activeTab === 'blog' && <BlogAdminTab />}
                    {activeTab === 'coupons' && <CouponsAdminTab />}
                    {activeTab === 'users' && <UsersTab />}
                    {activeTab === 'reviews' && <ReviewsTab />}
                    {activeTab === 'payments' && <PaymentsTab />}
                    {activeTab === 'analytics' && <AnalyticsTab />}
                    {activeTab === 'feature-flags' && <FeatureFlagsTab />}
                    {activeTab === 'settings' && <SettingsTab />}
                </div>
            </div>
        </div>
    )
}

// Tab Components
function OverviewTab({ setActiveTab, stats }) {
    const [recentUsers, setRecentUsers] = useState([])
    const [systemHealth, setSystemHealth] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            adminService.getUsers({ limit: 5, page: 1 }).catch(() => null),
            fetch(`${import.meta.env.VITE_API_BASE_URL}/health`)
                .then(r => r.json()).catch(() => null)
        ]).then(([usersData, health]) => {
            if (usersData?.success) setRecentUsers(usersData.users || [])
            if (health) setSystemHealth(health)
        }).finally(() => setLoading(false))
    }, [])

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>

            {/* System Status Banner */}
            <div className={`flex items-center gap-3 rounded-lg border p-4 ${systemHealth?.services?.database === 'connected'
                ? 'border-green-500/20 bg-green-500/5'
                : 'border-yellow-500/20 bg-yellow-500/5'
                }`}>
                <Activity className={`h-5 w-5 ${systemHealth?.services?.database === 'connected' ? 'text-green-400' : 'text-yellow-400'
                    }`} />
                <div>
                    <p className="text-sm font-medium text-white">
                        {systemHealth ? 'All Systems Operational' : 'Checking system status...'}
                    </p>
                    {systemHealth && (
                        <p className="text-xs text-gray-400">
                            DB: {systemHealth.services?.database} Â· Redis: {systemHealth.services?.redis} Â· PayPal: {systemHealth.paypal_mode} Â· Cashfree: {systemHealth.cashfree_env}
                        </p>
                    )}
                </div>
                <Link to="/admin/system" target="_blank" className="ml-auto flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
                    System Details <ExternalLink className="h-3 w-3" />
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Users */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="font-semibold text-white">Recent Signups</h3>
                        <button onClick={() => setActiveTab('users')} className="text-xs text-purple-400 hover:text-purple-300">View all â†’</button>
                    </div>
                    {loading ? <LoadingSpinner /> : recentUsers.length === 0 ? (
                        <p className="text-sm text-gray-400">No users yet</p>
                    ) : (
                        <div className="space-y-3">
                            {recentUsers.map(u => (
                                <div key={u._id} className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-medium text-purple-300">
                                        {u.firstName?.[0] || u.email?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{u.firstName} {u.lastName}</p>
                                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${u.subscription?.tier !== 'Free'
                                        ? 'bg-purple-500/20 text-purple-300'
                                        : 'bg-white/5 text-gray-500'
                                        }`}>{u.subscription?.tier || 'Free'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                    <h3 className="mb-4 font-semibold text-white">Quick Actions</h3>
                    <div className="space-y-2">
                        <button onClick={() => setActiveTab('tools')} className="flex w-full items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white transition hover:bg-purple-700">
                            <Plus className="h-4 w-4" /> Manage Tools ({stats.pendingTools || 0} pending)
                        </button>
                        <button onClick={() => setActiveTab('reviews')} className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/5">
                            <Star className="h-4 w-4" /> Moderate Reviews ({stats.pendingReviews || 0} pending)
                        </button>
                        <button onClick={() => setActiveTab('claims')} className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/5">
                            <ShieldCheck className="h-4 w-4" /> Review Claims
                        </button>
                        <button onClick={() => setActiveTab('analytics')} className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/5">
                            <BarChart3 className="h-4 w-4" /> View Revenue Analytics
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
    const { toast } = useToast()
    const [claims, setClaims] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('pending')
    const [actionLoading, setActionLoading] = useState({})
    const [rejectReason, setRejectReason] = useState({})
    const [showRejectInput, setShowRejectInput] = useState({})

    const fetchClaims = async (status) => {
        setLoading(true)
        try {
            const res = await adminService.getClaims({ status, limit: 50 })
            setClaims(res?.data?.claims || res?.claims || [])
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to load claims', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchClaims(statusFilter) }, [statusFilter])

    const handleApprove = async (claim) => {
        setActionLoading(prev => ({ ...prev, [claim._id]: 'approve' }))
        try {
            await adminService.approveClaimById(claim._id)
            toast({ title: 'Approved', description: `${claim.tool?.name || 'Tool'} is now verified âœ…` })
            setClaims(prev => prev.filter(c => c._id !== claim._id))
        } catch (err) {
            toast({ title: 'Error', description: err?.response?.data?.message || 'Approval failed', variant: 'destructive' })
        } finally {
            setActionLoading(prev => ({ ...prev, [claim._id]: null }))
        }
    }

    const handleReject = async (claim) => {
        const reason = rejectReason[claim._id] || ''
        setActionLoading(prev => ({ ...prev, [claim._id]: 'reject' }))
        try {
            await adminService.rejectClaimById(claim._id, reason)
            toast({ title: 'Rejected', description: `Claim for ${claim.tool?.name || 'tool'} rejected` })
            setClaims(prev => prev.filter(c => c._id !== claim._id))
        } catch (err) {
            toast({ title: 'Error', description: err?.response?.data?.message || 'Rejection failed', variant: 'destructive' })
        } finally {
            setActionLoading(prev => ({ ...prev, [claim._id]: null }))
            setShowRejectInput(prev => ({ ...prev, [claim._id]: false }))
        }
    }

    const STATUS_COLORS = {
        pending:  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Tool Claim Requests</h2>
                    <p className="text-sm text-gray-500 mt-1">Review and approve tool ownership claims</p>
                </div>
                <div className="flex gap-2">
                    {['pending', 'approved', 'rejected'].map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                                statusFilter === s ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
                </div>
            ) : claims.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
                    <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                    <h3 className="text-lg font-semibold text-white mb-1">No {statusFilter} claims</h3>
                    <p className="text-sm text-gray-500">All caught up!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {claims.map(claim => (
                        <div key={claim._id} className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    {claim.tool?.logo && (
                                        <img src={claim.tool.logo} alt="" className="h-9 w-9 rounded-lg object-contain bg-white/5 border border-white/10 flex-shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-white">{claim.tool?.name || 'Unknown Tool'}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[claim.status]}`}>
                                                {claim.status}
                                            </span>
                                        </div>
                                        {claim.tool?.slug && (
                                            <a
                                                href={`https://www.intelligrid.online/tools/${claim.tool.slug}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 mt-0.5"
                                            >
                                                /tools/{claim.tool.slug} <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <span className="text-xs text-gray-600 flex-shrink-0">
                                    {new Date(claim.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                <div className="rounded-lg bg-white/5 border border-white/8 p-3">
                                    <div className="text-xs text-gray-500 mb-0.5">Email</div>
                                    <div className="text-white font-medium break-all">{claim.email}</div>
                                </div>
                                <div className="rounded-lg bg-white/5 border border-white/8 p-3">
                                    <div className="text-xs text-gray-500 mb-0.5">Role / Position</div>
                                    <div className="text-white font-medium">{claim.role || 'â€”'}</div>
                                </div>
                                <div className="rounded-lg bg-white/5 border border-white/8 p-3">
                                    <div className="text-xs text-gray-500 mb-0.5">Verification Info</div>
                                    <div className="text-gray-300 text-xs leading-relaxed line-clamp-2">{claim.verificationInfo || 'â€”'}</div>
                                </div>
                            </div>

                            {claim.status === 'pending' && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleApprove(claim)}
                                            disabled={!!actionLoading[claim._id]}
                                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all disabled:opacity-50"
                                        >
                                            {actionLoading[claim._id] === 'approve'
                                                ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                                : <Check className="h-4 w-4" />}
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => setShowRejectInput(prev => ({ ...prev, [claim._id]: !prev[claim._id] }))}
                                            disabled={!!actionLoading[claim._id]}
                                            className="flex items-center gap-1.5 rounded-lg bg-red-600/40 hover:bg-red-600/70 px-4 py-2 text-sm font-medium text-red-300 transition-all disabled:opacity-50"
                                        >
                                            <X className="h-4 w-4" />
                                            Reject
                                        </button>
                                    </div>
                                    {showRejectInput[claim._id] && (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Optional rejection reason (sent to claimant by email)"
                                                value={rejectReason[claim._id] || ''}
                                                onChange={e => setRejectReason(prev => ({ ...prev, [claim._id]: e.target.value }))}
                                                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
                                            />
                                            <button
                                                onClick={() => handleReject(claim)}
                                                disabled={!!actionLoading[claim._id]}
                                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium text-white transition disabled:opacity-50"
                                            >
                                                {actionLoading[claim._id] === 'reject'
                                                    ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin inline-block" />
                                                    : 'Confirm Reject'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {claim.status !== 'pending' && claim.reviewedAt && (
                                <p className="text-xs text-gray-600">
                                    Reviewed on {new Date(claim.reviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function UsersTab() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [pagination, setPagination] = useState({ total: 0, pages: 1 })
    const [searchTimeout, setSearchTimeout] = useState(null)
    // Subscription override modal state
    const [subModal, setSubModal] = useState(null) // null | { userId, userName, currentTier }
    const [subAction, setSubAction] = useState('activate')
    const [subTier, setSubTier] = useState('Premium')
    const [subDuration, setSubDuration] = useState('monthly')
    const [subLoading, setSubLoading] = useState(false)
    const { toast } = useToast()

    const fetchUsers = async (searchVal = search, pageVal = page) => {
        setLoading(true)
        try {
            const data = await adminService.getUsers({ search: searchVal, page: pageVal, limit: 20 })
            if (data.success) {
                setUsers(data.users)
                setPagination(data.pagination)
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchUsers() }, [page])

    const handleSearch = (val) => {
        setSearch(val)
        setPage(1)
        clearTimeout(searchTimeout)
        setSearchTimeout(setTimeout(() => fetchUsers(val, 1), 400))
    }

    const openSubModal = (user) => {
        setSubModal({ userId: user._id, userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email, currentTier: user.subscription?.tier || 'Free' })
        setSubAction('activate')
        setSubTier('Premium')
        setSubDuration('monthly')
    }

    const handleSubOverride = async () => {
        if (!subModal) return
        setSubLoading(true)
        try {
            const res = await adminService.overrideSubscription(subModal.userId, subAction, subTier, subDuration)
            if (res.success) {
                toast({ title: 'âœ… Done', description: res.message })
                setSubModal(null)
                fetchUsers()
            }
        } catch (error) {
            toast({ title: 'Error', description: error?.response?.data?.message || 'Override failed', variant: 'destructive' })
        } finally {
            setSubLoading(false)
        }
    }

    const TIER_COLORS = {
        Free: 'bg-white/5 text-gray-400',
        Basic: 'bg-blue-500/20 text-blue-300',
        Premium: 'bg-purple-500/20 text-purple-300',
        Enterprise: 'bg-amber-500/20 text-amber-300',
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <span className="text-sm text-gray-400">{pagination.total} total users</span>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                />
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : users.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/5 py-12 text-center text-gray-400">
                    <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No users found</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-xs uppercase text-gray-400">
                            <tr>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Tier</th>
                                <th className="px-4 py-3">Sub Status</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Joined</th>
                                <th className="px-4 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map(u => (
                                <tr key={u._id} className="hover:bg-white/5">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm font-medium text-purple-300">
                                                {u.firstName?.[0] || u.email?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{u.firstName} {u.lastName}</p>
                                                <p className="text-xs text-gray-400">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIER_COLORS[u.subscription?.tier] || TIER_COLORS.Free}`}>
                                            {u.subscription?.tier || 'Free'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs ${u.subscription?.status === 'active' ? 'text-green-400' : 'text-gray-500'}`}>
                                            {u.subscription?.status || 'inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-gray-400">{u.role || 'user'}</span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-400">
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => openSubModal(u)}
                                            title="Manage subscription"
                                            className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-300 hover:bg-purple-500/20 transition-colors"
                                        >
                                            <Crown className="h-3 w-3" />
                                            Manage Sub
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">Page {page} of {pagination.pages}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="rounded-lg border border-white/10 p-2 text-white hover:bg-white/5 disabled:opacity-30"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={page === pagination.pages}
                            className="rounded-lg border border-white/10 p-2 text-white hover:bg-white/5 disabled:opacity-30"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Subscription Override Modal */}
            {subModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gray-900 p-6 shadow-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Crown className="h-5 w-5 text-amber-400" />
                                    Manage Subscription
                                </h3>
                                <p className="text-sm text-gray-400 mt-0.5">{subModal.userName}</p>
                                <p className="text-xs text-gray-500 mt-0.5">Current: <span className="text-purple-300 font-medium">{subModal.currentTier}</span></p>
                            </div>
                            <button onClick={() => setSubModal(null)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Action */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Action</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['activate', 'downgrade', 'cancel'].map(a => (
                                        <button
                                            key={a}
                                            onClick={() => setSubAction(a)}
                                            className={`py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${subAction === a
                                                ? a === 'activate' ? 'bg-green-500/20 border-green-500/50 text-green-300'
                                                    : a === 'downgrade' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                                        : 'bg-red-500/20 border-red-500/50 text-red-300'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                }`}
                                        >
                                            {a}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tier â€” only shown for activate */}
                            {subAction === 'activate' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Tier</label>
                                        <select
                                            value={subTier}
                                            onChange={e => setSubTier(e.target.value)}
                                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                                        >
                                            <option value="Premium">Premium ($9.99/mo)</option>
                                            <option value="Basic">Basic ($4.99/mo)</option>
                                            <option value="Enterprise">Enterprise ($24.99/mo)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Duration</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['monthly', 'yearly'].map(d => (
                                                <button
                                                    key={d}
                                                    onClick={() => setSubDuration(d)}
                                                    className={`py-2 rounded-lg text-xs font-semibold capitalize border transition-all ${subDuration === d
                                                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {d}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Warning for destructive actions */}
                            {(subAction === 'cancel' || subAction === 'downgrade') && (
                                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                                    <p className="text-xs text-amber-300">
                                        {subAction === 'cancel'
                                            ? 'âš ï¸ This will mark the subscription as cancelled. The user will lose Pro access on their next session.'
                                            : 'âš ï¸ This will immediately move the user to the Free tier.'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setSubModal(null)}
                                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubOverride}
                                disabled={subLoading}
                                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50 ${subAction === 'activate' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90'
                                    : subAction === 'downgrade' ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90'
                                        : 'bg-gradient-to-r from-red-600 to-rose-600 hover:opacity-90'
                                    }`}
                            >
                                {subLoading ? 'Processing...' : `Confirm ${subAction.charAt(0).toUpperCase() + subAction.slice(1)}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Admin Tab: Featured Listings (Vendor Sponsorships)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FeaturedListingsAdminTab() {
    const { toast } = useToast()
    const [listings, setListings] = useState([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({
        toolSlug: '',
        tier: 'standard',
        durationDays: 30,
        priceUSD: '',
        vendorName: '',
        vendorEmail: '',
        campaignNotes: '',
    })

    const TIERS = [
        { value: 'standard', label: 'Standard', desc: 'Tool card badge + category boost' },
        { value: 'premium', label: 'Premium', desc: 'Homepage hero slot + category top' },
        { value: 'exclusive', label: 'Exclusive', desc: 'Full exclusive placement suite' },
    ]

    const TIER_COLORS = {
        standard: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        premium: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        exclusive: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    }

    useEffect(() => { fetchListings() }, [])

    const fetchListings = async () => {
        try {
            setLoading(true)
            const data = await adminService.getFeaturedListings()
            setListings(data.listings || [])
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to load featured listings', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!form.toolSlug.trim() || !form.priceUSD) return
        try {
            setCreating(true)
            await adminService.createFeaturedListing(form)
            toast({ title: 'Created', description: `Sponsored listing created for "${form.toolSlug}"` })
            setShowForm(false)
            setForm({ toolSlug: '', tier: 'standard', durationDays: 30, priceUSD: '', vendorName: '', vendorEmail: '', campaignNotes: '' })
            fetchListings()
        } catch (err) {
            toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to create listing', variant: 'destructive' })
        } finally {
            setCreating(false)
        }
    }

    const handleDeactivate = async (id, toolName) => {
        if (!window.confirm(`Deactivate featured listing for "${toolName}"?`)) return
        try {
            await adminService.deactivateFeaturedListing(id)
            toast({ title: 'Deactivated', description: `Listing for "${toolName}" deactivated` })
            fetchListings()
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to deactivate listing', variant: 'destructive' })
        }
    }

    const handleExpireStale = async () => {
        try {
            const data = await adminService.expireStaleFeaturedListings()
            toast({ title: 'Done', description: `Expired ${data.count ?? 0} stale listings` })
            fetchListings()
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to expire stale listings', variant: 'destructive' })
        }
    }

    const activeListings = listings.filter(l => l.active)
    const inactiveListings = listings.filter(l => !l.active)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Megaphone className="h-6 w-6 text-amber-400" />
                        Sponsored Listings
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Manage paid vendor placements across the directory</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExpireStale}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white text-sm transition-colors"
                    >
                        <RefreshCw size={13} /> Expire Stale
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors"
                    >
                        <Plus size={14} /> New Listing
                    </button>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                    <p className="text-xs text-gray-500 mb-1">Active</p>
                    <p className="text-2xl font-bold text-emerald-400">{activeListings.length}</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                    <p className="text-xs text-gray-500 mb-1">Total Revenue (est.)</p>
                    <p className="text-2xl font-bold text-white">
                        ${listings.reduce((sum, l) => sum + (parseFloat(l.priceUSD) || 0), 0).toFixed(0)}
                    </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/3 p-4">
                    <p className="text-xs text-gray-500 mb-1">Expired</p>
                    <p className="text-2xl font-bold text-gray-400">{inactiveListings.length}</p>
                </div>
            </div>

            {/* Create form */}
            {showForm && (
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <BadgeDollarSign size={16} className="text-purple-400" /> Create Sponsored Listing
                    </h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Tool Slug <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. chatgpt"
                                    value={form.toolSlug}
                                    onChange={e => setForm(f => ({ ...f, toolSlug: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Tier</label>
                                <select
                                    value={form.tier}
                                    onChange={e => setForm(f => ({ ...f, tier: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                                >
                                    {TIERS.map(t => (
                                        <option key={t.value} value={t.value}>{t.label} â€” {t.desc}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Duration (days)</label>
                                <input
                                    type="number"
                                    min={1} max={365}
                                    value={form.durationDays}
                                    onChange={e => setForm(f => ({ ...f, durationDays: parseInt(e.target.value) }))}
                                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Price (USD) <span className="text-red-400">*</span></label>
                                <input
                                    type="number"
                                    min={0} step="0.01"
                                    placeholder="299.00"
                                    value={form.priceUSD}
                                    onChange={e => setForm(f => ({ ...f, priceUSD: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Vendor Name</label>
                                <input
                                    type="text"
                                    placeholder="Acme Corp"
                                    value={form.vendorName}
                                    onChange={e => setForm(f => ({ ...f, vendorName: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Vendor Email</label>
                                <input
                                    type="email"
                                    placeholder="billing@acme.com"
                                    value={form.vendorEmail}
                                    onChange={e => setForm(f => ({ ...f, vendorEmail: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Campaign Notes</label>
                            <textarea
                                rows={2}
                                placeholder="Internal notes about this campaign..."
                                value={form.campaignNotes}
                                onChange={e => setForm(f => ({ ...f, campaignNotes: e.target.value }))}
                                className="w-full px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={creating}
                                className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                            >
                                {creating ? 'Creating...' : 'Create Listing'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:text-white text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Active listings */}
            {loading ? (
                <LoadingSpinner text="Loading listings..." />
            ) : activeListings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/2 py-16 text-center">
                    <Megaphone className="mx-auto mb-3 h-10 w-10 text-gray-700" />
                    <p className="text-gray-500 text-sm">No active sponsored listings.</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="mt-4 text-sm text-purple-400 hover:text-purple-300"
                    >
                        Create your first listing â†’
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white">Active Listings ({activeListings.length})</h3>
                    {activeListings.map(listing => {
                        const endsAt = listing.endsAt ? new Date(listing.endsAt) : null
                        const daysLeft = endsAt ? Math.ceil((endsAt - Date.now()) / 86400000) : null
                        const tool = listing.tool
                        return (
                            <div key={listing._id} className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/3 p-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-white text-sm">
                                            {tool?.name || listing.toolSlug}
                                        </span>
                                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${TIER_COLORS[listing.tier] || TIER_COLORS.standard}`}>
                                            {listing.tier}
                                        </span>
                                        {daysLeft !== null && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${daysLeft <= 3 ? 'bg-red-500/10 text-red-400' :
                                                daysLeft <= 7 ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-emerald-500/10 text-emerald-400'
                                                }`}>
                                                {daysLeft}d left
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {listing.vendorName || 'Unknown vendor'}
                                        {listing.priceUSD ? ` Â· $${listing.priceUSD}` : ''}
                                        {endsAt ? ` Â· Expires ${endsAt.toLocaleDateString()}` : ''}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {tool?.slug && (
                                        <a
                                            href={`/tools/${tool.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                                            title="View tool"
                                        >
                                            <ExternalLink size={13} />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => handleDeactivate(listing._id, tool?.name || listing.toolSlug)}
                                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        title="Deactivate"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Expired / inactive listings */}
            {inactiveListings.length > 0 && (
                <details className="group">
                    <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-400 transition-colors list-none flex items-center gap-1">
                        <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
                        {inactiveListings.length} expired / inactive listing{inactiveListings.length > 1 ? 's' : ''}
                    </summary>
                    <div className="mt-3 space-y-2 opacity-50">
                        {inactiveListings.map(listing => (
                            <div key={listing._id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/2 px-4 py-2.5">
                                <span className="text-sm text-gray-500 flex-1">{listing.tool?.name || listing.toolSlug}</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${TIER_COLORS[listing.tier] || TIER_COLORS.standard}`}>{listing.tier}</span>
                                <span className="text-xs text-gray-600">{listing.priceUSD ? `$${listing.priceUSD}` : ''}</span>
                            </div>
                        ))}
                    </div>
                </details>
            )}

            {/* Pricing reference */}
            <div className="rounded-xl border border-white/5 bg-white/2 p-4">
                <p className="text-xs text-gray-600">
                    <strong className="text-gray-400">Pricing reference:</strong>{' '}
                    Standard $99â€“299/mo Â· Premium $299â€“999/mo Â· Exclusive $999â€“2,999/mo.
                    All deals negotiated manually â€” this panel records the agreed price.
                </p>
            </div>
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
                                    <UserIcon size={12} />
                                    {review.user ? `${review.user.firstName} ${review.user.lastName}` : 'Unknown User'}
                                </span>
                                <span>â€¢</span>
                                <span>{review.user?.email}</span>
                                <span>â€¢</span>
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
                                    <td className="px-6 py-4 font-mono text-xs">{(payment.paymentId || payment._id?.toString() || '').substring(0, 14)}...</td>
                                    <td className="px-6 py-4">
                                        {payment.user ? (
                                            <div>
                                                <p className="text-white text-sm">{payment.user.firstName} {payment.user.lastName}</p>
                                                <p className="text-xs text-gray-400">{payment.user.email}</p>
                                            </div>
                                        ) : (
                                            <span className="text-gray-500 text-xs font-mono">{payment.userId || 'â€”'}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-white font-medium">${(payment.amount?.total ?? payment.amount ?? 0).toFixed(2)}</td>
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
    const [revenue, setRevenue] = useState(null)
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    useEffect(() => {
        adminService.getRevenueAnalytics()
            .then(data => { if (data?.success) setRevenue(data.data) })
            .catch(() => toast({ title: 'Error', description: 'Failed to load analytics', variant: 'destructive' }))
            .finally(() => setLoading(false))
    }, [])

    const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Analytics &amp; Revenue</h2>
                <Link to="/admin/revenue" target="_blank" className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300">
                    Full Revenue Dashboard <ExternalLink className="h-4 w-4" />
                </Link>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : revenue ? (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: 'MRR', value: fmt(revenue.mrr), icon: TrendingUp, color: 'text-purple-400' },
                            { label: 'ARR', value: fmt(revenue.arr), icon: BarChart3, color: 'text-blue-400' },
                            { label: 'Total Revenue', value: fmt(revenue.totalRevenue), icon: DollarSign, color: 'text-green-400' },
                            { label: 'Paid Users', value: revenue.activeSubscriptions || 0, icon: Crown, color: 'text-amber-400' },
                        ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs text-gray-400">{label}</span>
                                    <Icon className={`h-4 w-4 ${color}`} />
                                </div>
                                <p className="text-2xl font-bold text-white">{value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                        <h3 className="mb-4 font-semibold text-white">Subscription Breakdown</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Free Users', key: 'free', color: 'bg-gray-500' },
                                { label: 'Basic', key: 'basic', color: 'bg-blue-500' },
                                { label: 'Premium', key: 'premium', color: 'bg-purple-500' },
                                { label: 'Enterprise', key: 'enterprise', color: 'bg-amber-500' },
                            ].map(({ label, key, color }) => {
                                const value = revenue.subscriptionBreakdown?.[key] || 0
                                const total = Object.values(revenue.subscriptionBreakdown || {}).reduce((a, b) => a + b, 0) || 1
                                const pct = Math.round((value / total) * 100)
                                return (
                                    <div key={label}>
                                        <div className="mb-1 flex justify-between text-sm">
                                            <span className="text-gray-300">{label}</span>
                                            <span className="text-white font-medium">{value} <span className="text-gray-500">({pct}%)</span></span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-white/10">
                                            <div className={`h-1.5 rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {revenue.paymentStats && (
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-center">
                                <p className="text-xs text-gray-400 mb-1">Successful Payments</p>
                                <p className="text-2xl font-bold text-green-400">{revenue.paymentStats.successful}</p>
                            </div>
                            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center">
                                <p className="text-xs text-gray-400 mb-1">Failed Payments</p>
                                <p className="text-2xl font-bold text-red-400">{revenue.paymentStats.failed}</p>
                            </div>
                            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-center">
                                <p className="text-xs text-gray-400 mb-1">Success Rate</p>
                                <p className="text-2xl font-bold text-blue-400">{revenue.paymentStats.successRate}%</p>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="rounded-lg border border-white/10 bg-white/5 py-12 text-center text-gray-400">
                    <BarChart3 className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p>No analytics data available yet</p>
                </div>
            )}
        </div>
    )
}
function SettingsTab() {

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
            <div className="grid gap-4 sm:grid-cols-2">
                {/* System Tools */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                    <h3 className="mb-3 font-semibold text-white flex items-center gap-2">
                        <Activity className="h-4 w-4 text-green-400" /> System Health
                    </h3>
                    <p className="mb-4 text-sm text-gray-400">Monitor server uptime, memory, DB latency, and Node.js version.</p>
                    <Link to="/admin/system" target="_blank"
                        className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition"
                    >
                        Open System Monitor <ExternalLink className="h-4 w-4" />
                    </Link>
                </div>

                {/* Revenue */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                    <h3 className="mb-3 font-semibold text-white flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-400" /> Revenue Dashboard
                    </h3>
                    <p className="mb-4 text-sm text-gray-400">Full MRR/ARR charts, subscription breakdown, and transaction history.</p>
                    <Link to="/admin/revenue" target="_blank"
                        className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/20 transition"
                    >
                        Open Revenue Dashboard <ExternalLink className="h-4 w-4" />
                    </Link>
                </div>

                {/* Payment Gateways */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                    <h3 className="mb-3 font-semibold text-white flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-purple-400" /> Payment Gateways
                    </h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">PayPal</span>
                            <span className="text-green-400 font-medium">Live Mode âœ“</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Cashfree</span>
                            <span className="text-green-400 font-medium">PROD Mode âœ“</span>
                        </div>
                    </div>
                </div>

                {/* API Status */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                    <h3 className="mb-3 font-semibold text-white flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-400" /> API &amp; Services
                    </h3>
                    <div className="space-y-2 text-sm">
                        {[
                            { name: 'Backend API', url: 'https://api.intelligrid.online' },
                            { name: 'Frontend', url: 'https://www.intelligrid.online' },
                        ].map(({ name, url }) => (
                            <div key={name} className="flex justify-between items-center">
                                <span className="text-gray-400">{name}</span>
                                <a href={url} target="_blank" rel="noreferrer"
                                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                                    {url.replace('https://', '')} <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// â”€â”€â”€ Submissions Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SubmissionsTab() {
    const { toast } = useToast()
    const [submissions, setSubmissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('pending')
    const [reviewing, setReviewing] = useState(null)   // { id, action }
    const [reviewNotes, setReviewNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [pagination, setPagination] = useState({})
    const [page, setPage] = useState(1)

    const fetchSubmissions = async (s = statusFilter, p = page) => {
        setLoading(true)
        try {
            const data = await submissionService.getAll({ status: s, page: p, limit: 15 })
            if (data.success) {
                setSubmissions(data.submissions || [])
                setPagination(data.pagination || {})
            }
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to load submissions', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchSubmissions() }, [])

    const handleFilterChange = (s) => {
        setStatusFilter(s)
        setPage(1)
        fetchSubmissions(s, 1)
    }

    const openReview = (id, action) => {
        setReviewing({ id, action })
        setReviewNotes('')
    }

    const submitReview = async () => {
        if (!reviewing) return
        setSubmitting(true)
        try {
            await submissionService.review(reviewing.id, reviewing.action, reviewNotes)
            toast({
                title: reviewing.action === 'approve' ? 'âœ… Approved!' : 'âŒ Rejected',
                description: reviewing.action === 'approve'
                    ? 'Tool has been created and submitter notified.'
                    : 'Submission rejected and submitter notified.',
            })
            setReviewing(null)
            fetchSubmissions()
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to submit review', variant: 'destructive' })
        } finally {
            setSubmitting(false)
        }
    }

    const STATUS_COLORS = {
        pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Community Submissions</h2>
                <span className="text-sm text-gray-500">{pagination.total || 0} total</span>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
                {['pending', 'approved', 'rejected', 'all'].map(s => (
                    <button
                        key={s}
                        onClick={() => handleFilterChange(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${statusFilter === s ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}`}
                    >
                        {s}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : submissions.length === 0 ? (
                <div className="py-12 text-center text-gray-500">No {statusFilter} submissions found</div>
            ) : (
                <div className="space-y-3">
                    {submissions.map(sub => (
                        <div key={sub._id} className="rounded-xl border border-white/8 bg-white/3 p-5">
                            <div className="flex items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h3 className="font-semibold text-white">{sub.toolName}</h3>
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${STATUS_COLORS[sub.status]}`}>
                                            {sub.status}
                                        </span>
                                        {sub.pricing && (
                                            <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{sub.pricing}</span>
                                        )}
                                        {sub.category && (
                                            <span className="text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/15 px-2 py-0.5 rounded-full">{sub.category}</span>
                                        )}
                                    </div>
                                    <a href={sub.officialUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 mb-2">
                                        {sub.officialUrl} <ExternalLink className="h-3 w-3" />
                                    </a>
                                    <p className="text-sm text-gray-400 line-clamp-2">{sub.shortDescription}</p>
                                    {sub.submittedBy?.name && (
                                        <p className="mt-2 text-xs text-gray-600">
                                            Submitted by <span className="text-gray-500">{sub.submittedBy.name}</span>
                                            {sub.submittedBy.email && <> Â· {sub.submittedBy.email}</>}
                                            {' Â· '}{new Date(sub.createdAt).toLocaleDateString()}
                                        </p>
                                    )}
                                    {sub.reviewNotes && (
                                        <p className="mt-2 text-xs text-amber-500/60 italic">Notes: {sub.reviewNotes}</p>
                                    )}
                                </div>
                                {sub.status === 'pending' && (
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => openReview(sub._id, 'approve')}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
                                        >
                                            <Check className="h-3.5 w-3.5" /> Approve
                                        </button>
                                        <button
                                            onClick={() => openReview(sub._id, 'reject')}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" /> Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex gap-2 justify-center">
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => { setPage(p); fetchSubmissions(statusFilter, p) }}
                            className={`h-8 w-8 rounded-lg text-xs transition-all ${page === p ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}`}>
                            {p}
                        </button>
                    ))}
                </div>
            )}

            {/* Review Modal */}
            {reviewing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d0d] p-6">
                        <h3 className="text-lg font-bold text-white mb-4">
                            {reviewing.action === 'approve' ? 'âœ… Approve Submission' : 'âŒ Reject Submission'}
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">
                            {reviewing.action === 'approve'
                                ? 'This will create the tool in the database and notify the submitter.'
                                : 'Provide a reason (optional) â€” it will be sent to the submitter.'}
                        </p>
                        <textarea
                            value={reviewNotes}
                            onChange={e => setReviewNotes(e.target.value)}
                            placeholder={reviewing.action === 'approve' ? 'Optional notes...' : 'Reason for rejection...'}
                            rows={3}
                            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none mb-4"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={submitReview}
                                disabled={submitting}
                                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm text-white transition-colors ${reviewing.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'} disabled:opacity-50`}
                            >
                                {submitting ? 'Submitting...' : reviewing.action === 'approve' ? 'Approve & Publish' : 'Reject'}
                            </button>
                            <button onClick={() => setReviewing(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// â”€â”€â”€ Blog Admin Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function BlogAdminTab() {
    const { toast } = useToast()
    const [posts, setPosts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editId, setEditId] = useState(null)  // null = create mode, string = edit mode
    const BLANK_FORM = { title: '', slug: '', category: '', content: '', excerpt: '', tags: '', featuredImage: '', status: 'draft' }
    const [form, setForm] = useState(BLANK_FORM)

    const CATEGORIES = ['AI News', 'Tutorials', 'Reviews', 'Comparison', 'Industry', 'Tips & Tricks']

    const fetchPosts = async () => {
        setLoading(true)
        try {
            const data = await blogService.getAllPosts()
            setPosts(data.posts || [])
        } catch {
            toast({ title: 'Error', description: 'Failed to load posts', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchPosts() }, [])

    const handleField = (e) => {
        const { name, value } = e.target
        if (name === 'title' && !editId) {
            // Auto-generate slug only in create mode
            setForm(f => ({
                ...f, title: value,
                slug: f.slug || value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            }))
        } else {
            setForm(f => ({ ...f, [name]: value }))
        }
    }

    const handleEdit = (post) => {
        setEditId(post._id)
        setForm({
            title: post.title || '',
            slug: post.slug || '',
            category: post.category || '',
            content: post.content || '',
            excerpt: post.excerpt || '',
            tags: Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || ''),
            featuredImage: post.featuredImage || '',
            status: post.status || 'draft',
        })
        setShowForm(true)
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!form.title || !form.content) {
            toast({ title: 'Required', description: 'Title and content are required', variant: 'destructive' })
            return
        }
        setSaving(true)
        try {
            const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }
            if (editId) {
                await blogService.update(editId, payload)
                toast({ title: 'âœ… Post updated!', description: `"${form.title}" saved.` })
            } else {
                await blogService.create(payload)
                toast({ title: 'âœ… Post created!', description: `"${form.title}" saved as ${form.status}.` })
            }
            setShowForm(false)
            setEditId(null)
            setForm(BLANK_FORM)
            fetchPosts()
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed to save post', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete "${title}"?`)) return
        try {
            await blogService.remove(id)
            setPosts(p => p.filter(x => x._id !== id))
            toast({ title: 'Deleted' })
        } catch {
            toast({ title: 'Error', description: 'Delete failed', variant: 'destructive' })
        }
    }

    const handleTogglePublish = async (post) => {
        try {
            const newStatus = post.status === 'published' ? 'draft' : 'published'
            await blogService.update(post._id, { status: newStatus })
            setPosts(p => p.map(x => x._id === post._id ? { ...x, status: newStatus } : x))
        } catch {
            toast({ title: 'Error', description: 'Update failed', variant: 'destructive' })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Blog Management</h2>
                <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(BLANK_FORM) }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">
                    <Plus className="h-4 w-4" /> New Post
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSave} className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-6 space-y-4">
                    <h3 className="font-semibold text-white">{editId ? 'âœï¸ Edit Post' : 'Create New Post'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Title *</label>
                            <input name="title" value={form.title} onChange={handleField} required placeholder="Post title"
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Slug</label>
                            <input name="slug" value={form.slug} onChange={handleField} placeholder="url-slug"
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none font-mono" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Category</label>
                            <select name="category" value={form.category} onChange={handleField}
                                className="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white focus:border-purple-500/50 focus:outline-none">
                                <option value="">Select...</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Status</label>
                            <select name="status" value={form.status} onChange={handleField}
                                className="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white focus:border-purple-500/50 focus:outline-none">
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-400 mb-1">Excerpt</label>
                            <input name="excerpt" value={form.excerpt} onChange={handleField} placeholder="Short summary for listing..."
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-400 mb-1">Featured Image URL</label>
                            <input name="featuredImage" value={form.featuredImage} onChange={handleField} placeholder="https://..."
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-400 mb-1">Tags (comma-separated)</label>
                            <input name="tags" value={form.tags} onChange={handleField} placeholder="ai, tools, productivity"
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs text-gray-400 mb-1">Content (HTML) *</label>
                            <textarea name="content" value={form.content} onChange={handleField} rows={14} required
                                placeholder="<p>Your post content. HTML is supported.</p>"
                                className="w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none font-mono" />
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(BLANK_FORM) }}
                            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
                        <button type="submit" disabled={saving}
                            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                            {saving ? 'Saving...' : editId ? 'Save Changes' : (form.status === 'published' ? 'Publish Post' : 'Save Draft')}
                        </button>
                    </div>
                </form>
            )}

            {loading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : (
                <div className="space-y-2">
                    {posts.length === 0 ? (
                        <p className="py-8 text-center text-gray-600">No posts yet. Create your first!</p>
                    ) : posts.map(post => (
                        <div key={post._id} className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/3 px-5 py-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-white">{post.title}</p>
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${post.status === 'published' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}>{post.status}</span>
                                    {post.category && <span className="text-[10px] text-purple-400">{post.category}</span>}
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5">/blog/{post.slug} Â· {post.views || 0} views</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => handleTogglePublish(post)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${post.status === 'published' ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-600/80 hover:bg-emerald-600 text-white'}`}>
                                    {post.status === 'published' ? 'Unpublish' : 'Publish'}
                                </button>
                                <button onClick={() => handleEdit(post)} className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors" title="Edit post">
                                    <Edit className="h-4 w-4" />
                                </button>
                                <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" className="p-1.5 text-gray-500 hover:text-white transition-colors">
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                                <button onClick={() => handleDelete(post._id, post.title)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// â”€â”€â”€ Coupons Admin Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CouponsAdminTab() {
    const { toast } = useToast()
    const [coupons, setCoupons] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        code: '', discountType: 'percentage', discountValue: '',
        maxDiscount: '', maxUses: '', expiresAt: '',
        applicablePlans: [], description: '', isActive: true,
    })

    const PLANS = ['BASIC', 'PRO', 'ENTERPRISE']

    const fetchCoupons = async () => {
        setLoading(true)
        try {
            const data = await couponService.getAll()
            setCoupons(data.coupons || [])
        } catch {
            toast({ title: 'Error', description: 'Failed to load coupons', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchCoupons() }, [])

    const handleField = (e) => {
        const { name, value } = e.target
        setForm(f => ({ ...f, [name]: value }))
    }

    const togglePlan = (plan) => {
        setForm(f => ({
            ...f,
            applicablePlans: f.applicablePlans.includes(plan)
                ? f.applicablePlans.filter(p => p !== plan)
                : [...f.applicablePlans, plan],
        }))
    }

    const handleSave = async (e) => {
        e.preventDefault()
        if (!form.code || !form.discountValue) {
            toast({ title: 'Required', description: 'Code and discount are required', variant: 'destructive' })
            return
        }
        setSaving(true)
        try {
            const payload = {
                ...form,
                code: form.code.toUpperCase().trim(),
                discountValue: Number(form.discountValue),
                maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
                maxUses: form.maxUses ? Number(form.maxUses) : undefined,
                expiresAt: form.expiresAt || undefined,
                applicablePlans: form.applicablePlans.length ? form.applicablePlans : undefined,
            }
            const data = await couponService.create(payload)
            toast({ title: 'âœ… Coupon created!', description: `${payload.code} is ready to use.` })
            setCoupons(c => [data.coupon, ...c])
            setShowForm(false)
            setForm({ code: '', discountType: 'percentage', discountValue: '', maxDiscount: '', maxUses: '', expiresAt: '', applicablePlans: [], description: '', isActive: true })
        } catch (err) {
            toast({ title: 'Error', description: err.response?.data?.message || 'Failed', variant: 'destructive' })
        } finally {
            setSaving(false)
        }
    }

    const handleToggle = async (coupon) => {
        try {
            await couponService.update(coupon._id, { isActive: !coupon.isActive })
            setCoupons(c => c.map(x => x._id === coupon._id ? { ...x, isActive: !x.isActive } : x))
        } catch {
            toast({ title: 'Error', description: 'Update failed', variant: 'destructive' })
        }
    }

    const handleDelete = async (id, code) => {
        if (!window.confirm(`Delete coupon "${code}"?`)) return
        try {
            await couponService.remove(id)
            setCoupons(c => c.filter(x => x._id !== id))
            toast({ title: 'Deleted', description: `Coupon ${code} removed.` })
        } catch {
            toast({ title: 'Error', description: 'Delete failed', variant: 'destructive' })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Coupon Codes</h2>
                <button onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors">
                    <Plus className="h-4 w-4" /> New Coupon
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSave} className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-6 space-y-4">
                    <h3 className="font-semibold text-white">Create Coupon</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Code *</label>
                            <input name="code" value={form.code} onChange={handleField} required placeholder="LAUNCH50"
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none font-mono uppercase tracking-widest" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Discount Type</label>
                            <select name="discountType" value={form.discountType} onChange={handleField}
                                className="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white focus:border-purple-500/50 focus:outline-none">
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed ($)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">
                                {form.discountType === 'percentage' ? 'Discount %' : 'Discount $'} *
                            </label>
                            <input name="discountValue" type="number" min="0"
                                max={form.discountType === 'percentage' ? 100 : undefined}
                                value={form.discountValue} onChange={handleField} required
                                placeholder={form.discountType === 'percentage' ? '20' : '10'}
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none" />
                        </div>
                        {form.discountType === 'percentage' && (
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Max Discount Cap ($)</label>
                                <input name="maxDiscount" type="number" min="0" value={form.maxDiscount} onChange={handleField} placeholder="20"
                                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none" />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Max Uses (blank = unlimited)</label>
                            <input name="maxUses" type="number" min="1" value={form.maxUses} onChange={handleField} placeholder="500"
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Expiry (blank = never)</label>
                            <input name="expiresAt" type="date" value={form.expiresAt} onChange={handleField}
                                className="w-full rounded-lg border border-white/10 bg-gray-800 px-3 py-2 text-sm text-white focus:border-purple-500/50 focus:outline-none" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs text-gray-400 mb-2">Applicable Plans (blank = all)</label>
                            <div className="flex gap-2">
                                {PLANS.map(p => (
                                    <button key={p} type="button" onClick={() => togglePlan(p)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${form.applicablePlans.includes(p) ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'}`}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-xs text-gray-400 mb-1">Description (shown to user)</label>
                            <input name="description" value={form.description} onChange={handleField} placeholder="20% off for launch week"
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none" />
                        </div>
                    </div>
                    <div className="flex gap-3 justify-end">
                        <button type="button" onClick={() => setShowForm(false)}
                            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
                        <button type="submit" disabled={saving}
                            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                            {saving ? 'Creating...' : 'Create Coupon'}
                        </button>
                    </div>
                </form>
            )}

            {loading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : (
                <div className="space-y-2">
                    {coupons.length === 0 ? (
                        <p className="py-8 text-center text-gray-600">No coupons yet.</p>
                    ) : coupons.map(coupon => (
                        <div key={coupon._id} className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/3 px-5 py-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono font-bold text-white tracking-wider">{coupon.code}</span>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${coupon.isActive ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-gray-500 bg-white/5 border-white/10'}`}>
                                        {coupon.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <span className="text-xs text-purple-400">
                                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}% off` : `$${coupon.discountValue} off`}
                                        {coupon.maxDiscount ? ` (max $${coupon.maxDiscount})` : ''}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5">
                                    {coupon.usedCount || 0}/{coupon.maxUses || 'âˆž'} uses
                                    {coupon.expiresAt ? ` Â· Expires ${new Date(coupon.expiresAt).toLocaleDateString()}` : ''}
                                    {coupon.description ? ` Â· ${coupon.description}` : ''}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => handleToggle(coupon)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${coupon.isActive ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-600/80 hover:bg-emerald-600 text-white'}`}>
                                    {coupon.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button onClick={() => handleDelete(coupon._id, coupon.code)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// â”€â”€ Batch 7: Link Health Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LinkHealthTab() {
    const [stats, setStats] = useState(null)
    const [deadTools, setDeadTools] = useState([])
    const [loading, setLoading] = useState(true)
    const [restoring, setRestoring] = useState(null)
    const { toast } = useToast()

    const load = async () => {
        setLoading(true)
        try {
            const [healthData, deadData] = await Promise.all([
                adminService.getLinkHealth(),
                adminService.getDeadTools({ limit: 50 }),
            ])
            if (healthData?.success) setStats(healthData.linkHealth)
            if (deadData?.success) setDeadTools(deadData.tools || [])
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to load link health data', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const handleRestore = async (id, name) => {
        setRestoring(id)
        try {
            await adminService.restoreTool(id)
            toast({ title: 'Restored', description: `"${name}" is now active again` })
            load()
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to restore tool', variant: 'destructive' })
        } finally {
            setRestoring(null)
        }
    }

    if (loading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>

    const healthPct = stats ? parseFloat(stats.healthRate) : 0
    const healthColor = healthPct >= 90 ? 'text-green-400' : healthPct >= 70 ? 'text-yellow-400' : 'text-red-400'
    const barColor = healthPct >= 90 ? 'bg-green-500' : healthPct >= 70 ? 'bg-yellow-500' : 'bg-red-500'

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Link Health Monitor</h2>
                <button onClick={load} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </button>
            </div>

            {/* Stats cards */}
            {stats && (
                <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
                    {[
                        { label: 'Total Active', value: stats.total, color: 'text-white', bg: 'bg-white/5' },
                        { label: 'Live', value: stats.live, color: 'text-green-400', bg: 'bg-green-500/10' },
                        { label: 'Redirected', value: stats.redirected, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        { label: 'Unknown', value: stats.unknown, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                        { label: 'Dead (hidden)', value: stats.dead, color: 'text-red-400', bg: 'bg-red-500/10' },
                    ].map(s => (
                        <div key={s.label} className={`rounded-lg border border-white/10 ${s.bg} p-4`}>
                            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                            <p className={`text-2xl font-bold ${s.color}`}>{s.value?.toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Health rate bar */}
            {stats && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-gray-400">Overall Health Rate</p>
                        <p className={`text-2xl font-bold ${healthColor}`}>{stats.healthRate}</p>
                    </div>
                    <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${healthPct}%` }} />
                    </div>
                    {stats.pendingPurge > 0 && (
                        <p className="mt-3 flex items-center gap-2 text-xs text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {stats.pendingPurge} tool(s) dead {'>'}7 days â€” eligible for hard-delete
                            {stats.purgeEnabled ? ' (LINK_PURGE_ENABLED=true â€” daily auto-purge active)' : ' (set LINK_PURGE_ENABLED=true to enable auto-purge)'}
                        </p>
                    )}
                </div>
            )}

            {/* Dead tools table */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4">Dead Tools ({deadTools.length})</h3>
                {deadTools.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-white/5 py-10 text-center text-gray-500">
                        <Wifi className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>No dead tools â€” everything looks healthy!</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-white/10">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-xs uppercase text-gray-400">
                                <tr>
                                    <th className="px-4 py-3">Tool</th>
                                    <th className="px-4 py-3">URL</th>
                                    <th className="px-4 py-3">Last Checked</th>
                                    <th className="px-4 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {deadTools.map(t => (
                                    <tr key={t._id} className="hover:bg-white/5">
                                        <td className="px-4 py-3 font-medium text-white">{t.name}</td>
                                        <td className="px-4 py-3 max-w-[220px] truncate">
                                            <a href={t.officialUrl} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-purple-400 flex items-center gap-1">
                                                {t.officialUrl} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                            </a>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            {t.lastLinkCheck ? new Date(t.lastLinkCheck).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleRestore(t._id, t.name)}
                                                disabled={restoring === t._id}
                                                className="flex items-center gap-1 rounded px-2 py-1 text-xs bg-green-500/15 text-green-400 hover:bg-green-500/25 disabled:opacity-50 transition"
                                            >
                                                <RotateCcw className="h-3 w-3" />
                                                {restoring === t._id ? 'Restoring...' : 'Restore'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

// â”€â”€ Batch 7: Discovery Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function DiscoveryTab() {
    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(true)
    const [triggering, setTriggering] = useState(false)
    const [pagination, setPagination] = useState({ total: 0 })
    const { toast } = useToast()

    const load = async () => {
        setLoading(true)
        try {
            const data = await adminService.getDiscoveryPending({ limit: 50 })
            if (data?.success) {
                setTools(data.tools || [])
                setPagination(data.pagination || { total: 0 })
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to load discovery queue', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const handleApprove = async (id) => {
        try {
            await adminService.approveTool(id)
            toast({ title: 'âœ… Approved', description: 'Tool is now live and tweeted' })
            load()
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to approve tool', variant: 'destructive' })
        }
    }

    const handleDiscard = async (id, name) => {
        if (!window.confirm(`Permanently discard "${name}"?`)) return
        try {
            await adminService.discardDiscoveredTool(id)
            toast({ title: 'Discarded', description: `"${name}" removed from queue` })
            load()
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to discard tool', variant: 'destructive' })
        }
    }

    const handleTrigger = async () => {
        setTriggering(true)
        try {
            const data = await adminService.triggerDiscovery(1)
            toast({ title: 'ðŸ” Discovery Started', description: data?.message || 'Check back in 1â€“2 min' })
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to trigger discovery', variant: 'destructive' })
        } finally {
            setTimeout(() => setTriggering(false), 3000)
        }
    }

    const SOURCE_BADGE = {
        producthunt: { label: 'Product Hunt', color: 'bg-orange-500/20 text-orange-400' },
        scraper: { label: 'Scraper', color: 'bg-blue-500/20 text-blue-400' },
        'hacker-news': { label: 'Hacker News', color: 'bg-amber-500/20 text-amber-400' },
        twitter: { label: 'Twitter/X', color: 'bg-sky-500/20 text-sky-400' },
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Discovery Queue</h2>
                    <p className="text-sm text-gray-500 mt-1">{pagination.total} tools awaiting your review</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={load} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition">
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </button>
                    <button
                        onClick={handleTrigger}
                        disabled={triggering}
                        className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-1.5 text-sm text-white hover:bg-purple-700 disabled:opacity-60 transition"
                    >
                        <Zap className="h-4 w-4" />
                        {triggering ? 'Running...' : 'Trigger Discovery'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><LoadingSpinner /></div>
            ) : tools.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/5 py-14 text-center">
                    <Radar className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400 font-medium">No auto-discovered tools pending review</p>
                    <p className="text-sm text-gray-600 mt-1">Click "Trigger Discovery" to run a manual fetch from Product Hunt</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {tools.map(tool => {
                        const badge = SOURCE_BADGE[tool.sourceFoundBy] || { label: tool.sourceFoundBy, color: 'bg-white/10 text-gray-400' }
                        return (
                            <div key={tool._id} className="flex items-start gap-4 rounded-lg border border-white/10 bg-white/5 p-4 hover:border-white/20 transition">
                                {/* Logo */}
                                <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-white/10 overflow-hidden flex items-center justify-center">
                                    {tool.logo
                                        ? <img src={tool.logo} alt={tool.name} className="h-full w-full object-contain" onError={e => e.target.style.display = 'none'} />
                                        : <Package className="h-6 w-6 text-gray-500" />
                                    }
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold text-white">{tool.name}</h3>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>
                                        {tool.pricing && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{tool.pricing}</span>}
                                    </div>
                                    <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{tool.shortDescription}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <a href={tool.officialUrl} target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                                            Visit site <ExternalLink className="h-3 w-3" />
                                        </a>
                                        {tool.sourceUrl && (
                                            <a href={tool.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
                                                Source <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
                                        <span className="text-xs text-gray-600">{new Date(tool.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => handleApprove(tool._id)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm font-medium transition"
                                    >
                                        <Check className="h-4 w-4" /> Approve
                                    </button>
                                    <button
                                        onClick={() => handleDiscard(tool._id, tool.name)}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition"
                                    >
                                        <X className="h-4 w-4" /> Discard
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Feature Flags Tab â€” deployment control panel
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FeatureFlagsTab() {
    const [flags, setFlags] = useState([])
    const [loading, setLoading] = useState(true)
    const [toggling, setToggling] = useState(null) // key of flag being toggled
    const [seeding, setSeeding] = useState(false)
    const { toast } = useToast()

    const fetchFlags = async () => {
        setLoading(true)
        try {
            const res = await adminService.getFeatureFlags()
            if (res.success) setFlags(res.flags || [])
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to load feature flags', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchFlags() }, [])

    const handleToggle = async (flag) => {
        setToggling(flag.key)
        try {
            const res = await adminService.toggleFeatureFlag(flag.key, !flag.enabled)
            if (res.success) {
                setFlags(prev => prev.map(f => f.key === flag.key ? res.flag : f))
                toast({
                    title: res.flag.enabled ? 'âœ… Flag Enabled' : 'â¸ Flag Disabled',
                    description: `${flag.key} is now ${res.flag.enabled ? 'ON' : 'OFF'}. Takes effect within 60 seconds.`,
                })
            } else {
                throw new Error(res.message || 'Update failed')
            }
        } catch (err) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' })
        } finally {
            setToggling(null)
        }
    }

    const handleSeed = async () => {
        if (!window.confirm('This will insert any missing default flags. Existing flags will NOT be changed. Continue?')) return
        setSeeding(true)
        try {
            const res = await adminService.seedFeatureFlags()
            if (res.success) {
                toast({ title: 'âœ… Seeded', description: res.message })
                fetchFlags()
            } else {
                throw new Error(res.message)
            }
        } catch (err) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' })
        } finally {
            setSeeding(false)
        }
    }

    const enabledCount = flags.filter(f => f.enabled).length


    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Flag className="h-6 w-6 text-purple-400" />
                        Feature Flags
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Deployment control panel â€” toggle features on/off without a code deploy.
                        Changes propagate within 60 seconds.
                    </p>
                </div>
                <button
                    onClick={handleSeed}
                    disabled={seeding}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${seeding ? 'animate-spin' : ''}`} />
                    Seed Defaults
                </button>
            </div>

            {/* Status banner */}
            <div className="flex items-center gap-3 rounded-lg border border-purple-500/20 bg-purple-500/5 px-4 py-3">
                <Zap className="h-4 w-4 text-purple-400 flex-shrink-0" />
                <p className="text-sm text-gray-300">
                    <span className="font-semibold text-white">{enabledCount} of {flags.length}</span> flags currently enabled.
                    {' '}All flags default to <span className="text-red-400 font-medium">OFF</span> for safe production deploys.
                    Enable only after verifying on staging.
                </p>
            </div>

            {/* Flags list */}
            {loading ? (
                <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : flags.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/5 py-12 text-center">
                    <Flag className="mx-auto mb-4 h-12 w-12 text-gray-600" />
                    <p className="text-gray-400 mb-4">No feature flags found.</p>
                    <button
                        onClick={handleSeed}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 transition"
                    >
                        Seed Default Flags
                    </button>
                </div>
            ) : (
                <div className="grid gap-3">
                    {flags.map(flag => (
                        <div
                            key={flag.key}
                            className={`flex items-start justify-between rounded-lg border p-4 transition ${flag.enabled
                                ? 'border-green-500/30 bg-green-500/5'
                                : 'border-white/10 bg-white/5'
                                }`}
                        >
                            <div className="flex-1 min-w-0 mr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <code className="text-sm font-mono font-bold text-white">{flag.key}</code>
                                    {flag.enabled ? (
                                        <span className="text-[10px] rounded-full bg-green-500/20 px-2 py-0.5 text-green-400 font-medium">
                                            ENABLED
                                        </span>
                                    ) : (
                                        <span className="text-[10px] rounded-full bg-white/10 px-2 py-0.5 text-gray-500 font-medium">
                                            DISABLED
                                        </span>
                                    )}
                                    {flag.enabledForRoles?.length > 0 && (
                                        <span className="text-[10px] rounded-full bg-purple-500/20 px-2 py-0.5 text-purple-400">
                                            roles: {flag.enabledForRoles.join(', ')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-400">{flag.description || 'No description'}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                    Last updated: {flag.updatedAt ? new Date(flag.updatedAt).toLocaleString() : 'Never'}
                                </p>
                            </div>
                            <button
                                onClick={() => handleToggle(flag)}
                                disabled={toggling === flag.key}
                                title={flag.enabled ? 'Disable this flag' : 'Enable this flag'}
                                className={`flex-shrink-0 rounded-lg p-1 transition ${toggling === flag.key ? 'opacity-50 cursor-wait' : 'hover:opacity-80 cursor-pointer'
                                    }`}
                            >
                                {flag.enabled ? (
                                    <ToggleRight className="h-8 w-8 text-green-400" />
                                ) : (
                                    <ToggleLeft className="h-8 w-8 text-gray-500" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Rollback reference */}
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    <h3 className="text-sm font-semibold text-yellow-400">60-Second Rollback Reference</h3>
                </div>
                <p className="text-xs text-gray-400">
                    If any feature causes issues, <strong className="text-white">toggle it off here.</strong> The change takes effect within
                    60 seconds as the Redis cache expires. No deployment or downtime required. For database rollbacks,
                    run <code className="text-purple-300">npm run migrate:down</code> on the backend (after taking a MongoDB Atlas snapshot).
                </p>
            </div>
        </div>
    )
}


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Affiliate Analytics Tab
// GET /api/v1/analytics/affiliate-clicks â†’ byNetwork, byTool, timeline, totals
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AffiliateTab() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState('30')
    const [networkFilter, setNetworkFilter] = useState('')
    const [data, setData] = useState({ totalClicks: 0, approvedLinksCount: 0, topNetwork: 'none', byNetwork: [], byTool: [], timeline: [] })

    const NETWORK_COLORS = {
        partnerstack: 'text-blue-400',
        impact: 'text-purple-400',
        shareasale: 'text-orange-400',
        cj: 'text-green-400',
        appsumo: 'text-amber-400',
        direct: 'text-cyan-400',
        none: 'text-gray-400',
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            const end = new Date()
            const start = new Date()
            start.setDate(start.getDate() - parseInt(dateRange))
            params.set('startDate', start.toISOString())
            params.set('endDate', end.toISOString())
            if (networkFilter) params.set('network', networkFilter)

            const res = await adminService.getAffiliateClickAnalytics(params.toString())
            if (res.success) setData(res.data)
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to load affiliate analytics', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [dateRange, networkFilter])

    const maxTimeline = Math.max(...(data.timeline?.map(d => d.clicks) || [0])) || 1

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Link2 className="h-6 w-6 text-green-400" /> Affiliate Analytics
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Click tracking, network breakdown, and top-earning tools</p>
                </div>
                <div className="flex gap-2 items-center">
                    <select value={networkFilter} onChange={e => setNetworkFilter(e.target.value)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500">
                        <option value="">All Networks</option>
                        <option value="partnerstack">PartnerStack</option>
                        <option value="impact">Impact</option>
                        <option value="shareasale">ShareASale</option>
                        <option value="cj">CJ Affiliate</option>
                        <option value="appsumo">AppSumo</option>
                        <option value="direct">Direct</option>
                    </select>
                    <select value={dateRange} onChange={e => setDateRange(e.target.value)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500">
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                    </select>
                    <button onClick={fetchData} className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 hover:text-white transition-colors">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {loading ? <div className="flex justify-center py-16"><LoadingSpinner /></div> : (
                <>
                    {/* KPI cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Clicks</p>
                            <p className="text-3xl font-bold text-white">{data.totalClicks.toLocaleString()}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Approved Links</p>
                            <p className="text-3xl font-bold text-green-400">{data.approvedLinksCount}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Top Network</p>
                            <p className={`text-2xl font-bold capitalize ${NETWORK_COLORS[data.topNetwork] || 'text-white'}`}>
                                {data.topNetwork === 'none' ? 'â€”' : data.topNetwork}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* By Network breakdown */}
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                <BadgePercent size={14} className="text-green-400" /> Clicks by Network
                            </h3>
                            {data.byNetwork.length === 0 ? (
                                <p className="text-center text-sm text-gray-500 py-8">No affiliate clicks yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {data.byNetwork.map(n => {
                                        const pct = Math.round((n.clicks / data.totalClicks) * 100) || 0
                                        return (
                                            <div key={n._id}>
                                                <div className="flex justify-between mb-1">
                                                    <span className={`text-sm capitalize ${NETWORK_COLORS[n._id] || 'text-gray-300'}`}>{n._id}</span>
                                                    <span className="text-sm text-white font-semibold">{n.clicks} <span className="text-xs text-gray-500">({pct}%)</span></span>
                                                </div>
                                                <div className="h-1.5 w-full rounded-full bg-white/10">
                                                    <div className="h-1.5 rounded-full bg-green-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Daily timeline bar chart */}
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                                <TrendingUp size={14} className="text-green-400" /> Daily Timeline
                            </h3>
                            {data.timeline.length === 0 ? (
                                <p className="text-center text-sm text-gray-500 py-8">No data for selected range</p>
                            ) : (
                                <div className="flex items-end gap-1 h-32">
                                    {data.timeline.map(day => (
                                        <div key={day._id} className="group relative flex-1 flex flex-col items-center gap-1">
                                            <div
                                                className="w-full rounded-t bg-green-500/60 hover:bg-green-500 transition-colors cursor-default"
                                                style={{ height: `${(day.clicks / maxTimeline) * 100}%`, minHeight: '3px' }}
                                            />
                                            {/* Tooltip */}
                                            <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 border border-white/10 px-2 py-1 rounded text-xs whitespace-nowrap z-10 pointer-events-none">
                                                {day._id}: {day.clicks}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top tools by affiliate clicks */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <Flame size={14} className="text-amber-400" /> Top Tools by Affiliate Clicks
                        </h3>
                        {data.byTool.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-6">No affiliate clicks tracked yet.<br />
                                <span className="text-xs">Enable the AFFILIATE_TRACKING feature flag and add affiliate URLs to tools.</span>
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs uppercase text-gray-500 border-b border-white/5">
                                            <th className="text-left py-2 px-3">#</th>
                                            <th className="text-left py-2 px-3">Tool</th>
                                            <th className="text-left py-2 px-3">Network</th>
                                            <th className="text-left py-2 px-3">Commission</th>
                                            <th className="text-right py-2 px-3">Clicks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.byTool.map((t, i) => (
                                            <tr key={t._id} className="hover:bg-white/5 transition-colors">
                                                <td className="py-2.5 px-3 text-gray-600 font-mono text-xs">{i + 1}</td>
                                                <td className="py-2.5 px-3 font-medium text-white">{t.toolName || 'Unknown'}</td>
                                                <td className="py-2.5 px-3">
                                                    <span className={`capitalize text-xs ${NETWORK_COLORS[t.network] || 'text-gray-400'}`}>{t.network}</span>
                                                </td>
                                                <td className="py-2.5 px-3 text-xs text-gray-400 capitalize">{t.commissionType} {t.commissionRate ? `Â· ${t.commissionRate}` : ''}</td>
                                                <td className="py-2.5 px-3 text-right font-bold text-green-400">{t.clicks}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Enrichment Tab
// GET /api/v1/admin/tools/enrichment-stats â†’ stats, staleTools
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EnrichmentTab() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ fullyEnriched: 0, partial: 0, notEnriched: 0, stale: 0, needsEnrichmentCount: 0 })
    const [staleTools, setStaleTools] = useState([])

    const fetchStats = async () => {
        setLoading(true)
        try {
            const res = await adminService.getEnrichmentStats()
            if (res.success) {
                setStats(res.stats)
                setStaleTools(res.staleTools || [])
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to load enrichment stats', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchStats() }, [])

    const totalTools = stats.fullyEnriched + stats.partial + stats.notEnriched
    const pct = (n) => totalTools > 0 ? Math.round((n / totalTools) * 100) : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Database className="h-6 w-6 text-blue-400" /> Database Enrichment
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Tool data completeness scores and re-enrichment queue</p>
                </div>
                <button onClick={fetchStats} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                    <RefreshCw size={13} /> Refresh
                </button>
            </div>

            {loading ? <div className="flex justify-center py-16"><LoadingSpinner /></div> : (
                <>
                    {/* Score distribution */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fully Enriched</p>
                            <p className="text-3xl font-bold text-green-400">{stats.fullyEnriched}</p>
                            <p className="text-xs text-gray-600 mt-1">Score â‰¥ 80 Â· {pct(stats.fullyEnriched)}% of total</p>
                        </div>
                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Partial</p>
                            <p className="text-3xl font-bold text-blue-400">{stats.partial}</p>
                            <p className="text-xs text-gray-600 mt-1">Score 30â€“79 Â· {pct(stats.partial)}% of total</p>
                        </div>
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Not Enriched</p>
                            <p className="text-3xl font-bold text-red-400">{stats.notEnriched}</p>
                            <p className="text-xs text-gray-600 mt-1">Score &lt; 30 Â· {pct(stats.notEnriched)}% of total</p>
                        </div>
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Stale / Flagged</p>
                            <p className="text-3xl font-bold text-amber-400">{stats.needsEnrichmentCount}</p>
                            <p className="text-xs text-gray-600 mt-1">No update in 90+ days</p>
                        </div>
                    </div>

                    {/* Completeness bar */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                        <h3 className="text-sm font-semibold text-white mb-3">Enrichment Score Distribution</h3>
                        <div className="flex h-4 w-full overflow-hidden rounded-full">
                            <div className="bg-green-500 transition-all" style={{ width: `${pct(stats.fullyEnriched)}%` }} title={`Fully enriched: ${pct(stats.fullyEnriched)}%`} />
                            <div className="bg-blue-500 transition-all" style={{ width: `${pct(stats.partial)}%` }} title={`Partial: ${pct(stats.partial)}%`} />
                            <div className="bg-red-500/70 transition-all" style={{ width: `${pct(stats.notEnriched)}%` }} title={`Not enriched: ${pct(stats.notEnriched)}%`} />
                        </div>
                        <div className="flex gap-4 mt-2">
                            <span className="flex items-center gap-1 text-xs text-gray-400"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />Fully enriched ({pct(stats.fullyEnriched)}%)</span>
                            <span className="flex items-center gap-1 text-xs text-gray-400"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />Partial ({pct(stats.partial)}%)</span>
                            <span className="flex items-center gap-1 text-xs text-gray-400"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />Not enriched ({pct(stats.notEnriched)}%)</span>
                        </div>
                    </div>

                    {/* Stale tools queue */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <Flame size={14} className="text-amber-400" />
                            Re-Enrichment Priority Queue
                            <span className="ml-auto text-xs text-gray-500 font-normal">Sorted by traffic (most visits first)</span>
                        </h3>

                        {staleTools.length === 0 ? (
                            <div className="text-center py-10 text-gray-500">
                                <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No stale tools â€” all data is fresh! ðŸŽ‰</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-3 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-300">
                                    ðŸ’¡ To re-enrich: run Browse AI robot â†’ export CSV â†’ then run{' '}
                                    <code className="text-purple-300">node src/scripts/importEnrichmentData.js ./exports/browse_ai_export.csv</code>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-xs uppercase text-gray-500 border-b border-white/5">
                                                <th className="text-left py-2 px-3">Tool</th>
                                                <th className="text-left py-2 px-3">Slug</th>
                                                <th className="text-right py-2 px-3">Views</th>
                                                <th className="text-right py-2 px-3">Score</th>
                                                <th className="text-right py-2 px-3">Last Enriched</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {staleTools.map(tool => (
                                                <tr key={tool._id} className="hover:bg-white/5 transition-colors">
                                                    <td className="py-2.5 px-3 font-medium text-white">{tool.name}</td>
                                                    <td className="py-2.5 px-3 text-xs text-gray-500 font-mono">{tool.slug}</td>
                                                    <td className="py-2.5 px-3 text-right text-gray-300">{(tool.views || 0).toLocaleString()}</td>
                                                    <td className="py-2.5 px-3 text-right">
                                                        <span className={`text-xs font-bold ${tool.enrichmentScore >= 80 ? 'text-green-400' : tool.enrichmentScore >= 30 ? 'text-blue-400' : 'text-red-400'}`}>
                                                            {tool.enrichmentScore ?? 0}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right text-xs text-gray-500">
                                                        {tool.lastEnriched ? new Date(tool.lastEnriched).toLocaleDateString() : 'Never'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
