
import { useState, useEffect } from 'react'
import { Check, X, ExternalLink, Clock, AlertCircle, Search, Trash2, Loader2, ListFilter } from 'lucide-react'
import { adminService } from '../services'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const ToolQueue = () => {
    const [tools, setTools] = useState([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(null) // ID of tool being processed
    const [rejectingTool, setRejectingTool] = useState(null) // Tool object to reject
    const [rejectReason, setRejectReason] = useState('')

    useEffect(() => {
        fetchTools()
    }, [])

    const fetchTools = async () => {
        try {
            const data = await adminService.getPendingTools()
            if (data.success) {
                setTools(data.tools)
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to load pending tools')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (id) => {
        setProcessing(id)
        const loadToast = toast.loading('Approving tool...')
        try {
            await adminService.approveTool(id)
            setTools(prev => prev.filter(t => t._id !== id))
            toast.success('Tool approved and published', { id: loadToast })
        } catch (error) {
            toast.error('Failed to approve tool', { id: loadToast })
        } finally {
            setProcessing(null)
        }
    }

    const handleReject = async (e) => {
        e.preventDefault()
        if (!rejectingTool || !rejectReason.trim()) return

        setProcessing(rejectingTool._id)
        const loadToast = toast.loading('Rejecting tool...')
        try {
            await adminService.rejectTool(rejectingTool._id, rejectReason)
            setTools(prev => prev.filter(t => t._id !== rejectingTool._id))
            toast.success('Tool rejected', { id: loadToast })
            setRejectingTool(null)
            setRejectReason('')
        } catch (error) {
            toast.error('Failed to reject tool', { id: loadToast })
        } finally {
            setProcessing(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 mb-1">Tool Approval Queue</h1>
                    <p className="text-slate-400 text-sm">Review and publish user-submitted AI tools.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search tools..."
                            className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 w-full sm:w-64 transition-colors"
                        />
                    </div>
                    {/* Add Filter buttons later if needed */}
                </div>
            </div>

            {/* List */}
            {tools.length === 0 ? (
                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                        <Check className="text-emerald-500" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-200 mb-2">All Caught Up!</h3>
                    <p className="text-slate-500 max-w-sm">No pending tools in the queue. New submissions will appear here.</p>
                </div>
            ) : (
                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#2a2d3a] bg-[#222530]">
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Tool Name</th>
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Submitted</th>
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Pricing</th>
                                    <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#2a2d3a]">
                                {tools.map(tool => (
                                    <tr key={tool._id} className="group hover:bg-[#222530] transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                {/* Tool Icon placeholder or image */}
                                                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-lg overflow-hidden shrink-0">
                                                    {tool.name.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-200 group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                                                        {tool.name}
                                                        <a
                                                            href={tool.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1 line-clamp-1 max-w-[240px]">
                                                        {tool.shortDescription || 'No description provided'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <Clock size={14} className="text-slate-600" />
                                                {tool.createdAt ? formatDistanceToNow(new Date(tool.createdAt), { addSuffix: true }) : 'Unknown'}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-wrap gap-1">
                                                {tool.pricing && tool.pricing.length > 0 ? tool.pricing.map((p, i) => (
                                                    <span key={i} className="px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-300 rounded border border-slate-700">
                                                        {p}
                                                    </span>
                                                )) : (
                                                    <span className="text-xs text-slate-500 italic">Unspecified</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setRejectingTool(tool)}
                                                    disabled={processing === tool._id}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Reject"
                                                >
                                                    <X size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(tool._id)}
                                                    disabled={processing === tool._id}
                                                    className="p-2 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/20 hover:border-emerald-500/40 disabled:opacity-50 flex items-center gap-2 font-medium text-sm px-3"
                                                >
                                                    {processing === tool._id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                    Approve
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {rejectingTool && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl w-full max-w-md shadow-2xl p-6 relative">
                        <button
                            onClick={() => { setRejectingTool(null); setRejectReason(''); }}
                            className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-100">Reject Tool?</h3>
                                <p className="text-sm text-slate-500">This will remove "{rejectingTool.name}" from the queue.</p>
                            </div>
                        </div>

                        <form onSubmit={handleReject}>
                            <div className="mb-4">
                                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                                    Reason for Rejection
                                </label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="e.g. Duplicate listing, inappropriate content, broken link..."
                                    className="w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg p-3 text-slate-200 text-sm focus:outline-none focus:border-red-500/50 min-h-[100px] resize-none placeholder:text-slate-600"
                                    autoFocus
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setRejectingTool(null); setRejectReason(''); }}
                                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!rejectReason.trim() || processing}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {processing ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Rejection'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ToolQueue
