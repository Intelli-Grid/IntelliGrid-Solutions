import os

file_path = r'E:\Awesome Projects\INTELLIGRID NEW\Frontend\src\pages\AdminPage.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Replace Tab string
text = text.replace(
    "        { id: 'affiliate', label: 'Affiliate', icon: Link2 },", 
    "        { id: 'affiliate-mapper', label: 'Affiliates (Edit)', icon: DollarSign },\n        { id: 'affiliate', label: 'Affiliates (Stats)', icon: Link2 },"
)

# Replace Render logic
text = text.replace(
    "                    {activeTab === 'affiliate' && <AffiliateTab />}", 
    "                    {activeTab === 'affiliate-mapper' && <AffiliateMapperTab />}\n                    {activeTab === 'affiliate' && <AffiliateTab />}"
)

# Add Component
content_to_add = """
// ─────────────────────────────────────────────────────────────────────────────
// Affiliate Mapper (Bulk Editor) Tab
// ─────────────────────────────────────────────────────────────────────────────
function AffiliateMapperTab() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [tools, setTools] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const [pagination, setPagination] = useState({ total: 0, pages: 1 })
    
    // Track row loading states (e.g. { 'toolId': true })
    const [saving, setSaving] = useState({})

    const fetchTools = async (currentPage = page, q = searchQuery) => {
        setLoading(true)
        try {
            const data = await toolService.getTools({ page: currentPage, limit: 15, search: q, sort: '-createdAt' })
            const items = data.data || data.tools || (Array.isArray(data) ? data : [])
            setTools(items)
            setPagination({ 
                total: data.total || data.count || items.length, 
                pages: data.pages || Math.ceil((data.total || data.count || items.length) / 15) || 1 
            })
            setPage(data.page || data.currentPage || currentPage)
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to search tools', variant: 'destructive' })
        } finally {
            setLoading(false)
        }
    }

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchTools(1, searchQuery)
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleUpdate = async (id, field, value) => {
        setSaving(prev => ({ ...prev, [id]: true }))
        try {
            await adminService.updateTool(id, { [field]: value })
            // Optimistic update
            setTools(prev => prev.map(t => t._id === id ? { ...t, [field]: value } : t))
            toast({ title: 'Saved ✅', description: `Updated ${field}` })
        } catch (error) {
            toast({ title: 'Error', description: error?.response?.data?.message || 'Update failed', variant: 'destructive' })
            fetchTools(page) // Re-fetch to reset
        } finally {
            setSaving(prev => ({ ...prev, [id]: false }))
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-green-400" />
                        Affiliate Bulk Editor
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                        Map affiliate URLs and statuses real-time without refreshing. Changes are saved instantly.
                    </p>
                </div>
                <div className="flex gap-2 items-center flex-1 max-w-sm ml-auto">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tools..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><LoadingSpinner /></div>
            ) : tools.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-white/5 py-14 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400 font-medium">No tools found for "{searchQuery}"</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {/* Header Row */}
                    <div className="hidden md:grid grid-cols-[250px_1fr_180px] gap-4 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <div>Tool</div>
                        <div>Affiliate Link</div>
                        <div>Status</div>
                    </div>

                    {tools.map(tool => (
                        <div key={tool._id} className="grid grid-cols-1 md:grid-cols-[250px_1fr_180px] gap-4 items-center rounded-lg border border-white/10 bg-white/5 p-4 hover:border-white/20 transition group">
                            {/* Left Col: Tool Details */}
                            <div className="min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-white truncate">{tool.name}</h3>
                                    {saving[tool._id] && <Loader2 className="h-3 w-3 animate-spin text-green-400 flex-shrink-0" />}
                                </div>
                                <a href={tool.officialUrl} target="_blank" rel="noreferrer" className="text-xs text-gray-400 hover:text-green-400 flex items-center gap-1 w-max max-w-full overflow-hidden truncate">
                                    {tool.officialUrl ? new URL(tool.officialUrl).hostname.replace('www.', '') : 'No URL'} <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>

                            {/* Middle Col: Affiliate Link Input */}
                            <div>
                                <input
                                    type="text"
                                    placeholder="https://... (Enter to save)"
                                    defaultValue={tool.affiliateUrl || ''}
                                    onBlur={(e) => {
                                        if (e.target.value !== (tool.affiliateUrl || '')) {
                                            handleUpdate(tool._id, 'affiliateUrl', e.target.value)
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.target.blur() // trigger update
                                        }
                                    }}
                                    className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-green-100 placeholder-green-100/30 focus:border-green-500 focus:outline-none focus:bg-green-500/10 font-mono transition-all"
                                />
                            </div>

                            {/* Right Col: Affiliate Status Dropdown */}
                            <div>
                                <select
                                    value={tool.affiliateStatus || 'not_started'}
                                    onChange={(e) => handleUpdate(tool._id, 'affiliateStatus', e.target.value)}
                                    className={`w-full rounded-md border border-white/10 px-3 py-2 text-sm focus:outline-none transition-colors appearance-none cursor-pointer ${
                                        tool.affiliateStatus === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                        tool.affiliateStatus === 'pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                        tool.affiliateStatus === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                        tool.affiliateStatus === 'not_available' ? 'bg-gray-800 text-gray-500' :
                                        'bg-black/40 text-gray-400 hover:bg-white/5'
                                    }`}
                                >
                                    <option value="not_started">Not Started</option>
                                    <option value="pending">⏳ Pending</option>
                                    <option value="approved">✅ Approved</option>
                                    <option value="rejected">❌ Rejected</option>
                                    <option value="not_available">🚫 Not Available</option>
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                    <button
                        onClick={() => fetchTools(page - 1)}
                        disabled={page === 1}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 transition"
                    >
                        Previous
                    </button>
                    <span className="flex items-center px-4 text-sm text-gray-400">
                        Page {page} of {pagination.pages}
                    </span>
                    <button
                        onClick={() => fetchTools(page + 1)}
                        disabled={page === pagination.pages}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 transition"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}

"""

if "function AffiliateMapperTab" not in text:
    text = text.replace("// Affiliate Analytics Tab", content_to_add + "// Affiliate Analytics Tab")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Modified AdminPage.jsx")
