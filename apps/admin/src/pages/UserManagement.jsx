
import { useState, useEffect } from 'react'
import { Search, User, Shield, CreditCard, MoreVertical, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminService } from '../services'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'

const UserManagement = () => {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            fetchUsers()
        }, 500)
        return () => clearTimeout(delaySearch) // Debounce
    }, [search, page])

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const data = await adminService.getUsers({
                search,
                page,
                limit: 20
            })
            if (data.success) {
                setUsers(data.users)
                setTotalPages(data.pagination.pages)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'SUPERADMIN': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            case 'admin': return 'bg-purple-500/10 text-purple-400 border-purple-500/20' // Legacy
            case 'MODERATOR': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            case 'TRUSTED_OPERATOR': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            case 'premium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20' // Legacy
            default: return 'bg-slate-700/30 text-slate-400 border-slate-700/50' // USER
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 mb-1">User Management</h1>
                    <p className="text-slate-400 text-sm">View and manage registered users.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 w-full sm:w-64 transition-colors"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden min-h-[400px] flex flex-col">
                {loading && users.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="animate-spin text-indigo-500" size={32} />
                    </div>
                ) : users.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                        <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                            <Search className="text-slate-500" size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-300">No users found</h3>
                        <p className="text-slate-500">Try adjusting your search terms.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#2a2d3a] bg-[#222530]">
                                        <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">User</th>
                                        <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Role</th>
                                        <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Plan</th>
                                        <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Joined</th>
                                        <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#2a2d3a]">
                                    {users.map(user => (
                                        <tr key={user._id} className="group hover:bg-[#222530] transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    {user.avatar ? (
                                                        <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover bg-slate-800" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                                            {user.firstName ? user.firstName[0] : 'U'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-medium text-slate-200">{user.firstName} {user.lastName}</div>
                                                        <div className="text-xs text-slate-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${getRoleBadgeColor(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    {user.subscription?.tier !== 'Free' ? (
                                                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                                                            <CreditCard size={12} />
                                                            {user.subscription?.tier}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 text-xs">Free</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-slate-400">
                                                {format(new Date(user.createdAt), 'MMM d, yyyy')}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <button className="text-slate-500 hover:text-slate-300 transition-colors p-2 rounded hover:bg-slate-700/50">
                                                    <MoreVertical size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        <div className="border-t border-[#2a2d3a] p-4 flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                                Page {page} of {totalPages}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1 px-2 rounded border border-[#2a2d3a] text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3a] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1 px-2 rounded border border-[#2a2d3a] text-slate-400 hover:text-slate-200 hover:bg-[#2a2d3a] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default UserManagement
