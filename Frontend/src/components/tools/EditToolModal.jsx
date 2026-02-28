import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { adminService, categoryService, toolService } from '../../services'
import { useToast } from '../../context/ToastContext'

export default function EditToolModal({ isOpen, onClose, toolId, onUpdate }) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState([])
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        shortDescription: '',
        fullDescription: '',
        category: '',
        pricing: 'Unknown',
        officialUrl: '',
        affiliateUrl: '',
        sourceUrl: '',
        tags: '',
        isVerified: false
    })

    useEffect(() => {
        if (isOpen) {
            fetchCategories()
            if (toolId) {
                fetchToolData()
            }
        }
    }, [isOpen, toolId])

    const fetchCategories = async () => {
        try {
            const data = await categoryService.getCategories()
            if (data.success) {
                setCategories(data.categories)
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error)
        }
    }

    const fetchToolData = async () => {
        try {
            setLoading(true)
            const data = await toolService.getToolById(toolId)
            const tool = data.data || data // Handle different response structures if any

            setFormData({
                name: tool.name || '',
                slug: tool.slug || '',
                shortDescription: tool.shortDescription || '',
                fullDescription: tool.fullDescription || '',
                category: typeof tool.category === 'object' ? tool.category._id : tool.category || '',
                pricing: typeof tool.pricing === 'object' ? tool.pricing.type : tool.pricing || 'Unknown',
                officialUrl: tool.officialUrl || '',
                affiliateUrl: tool.affiliateUrl || '',
                sourceUrl: tool.sourceUrl || '',
                tags: tool.tags ? tool.tags.join(', ') : '',
                isVerified: tool.isVerified || false,
                contactEmail: tool.contactEmail || ''
            })
        } catch (error) {
            console.error('Failed to fetch tool:', error)
            toast({
                title: 'Error',
                description: 'Failed to load tool data',
                variant: 'destructive',
            })
            onClose()
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            setLoading(true)

            // Format data for API
            const apiData = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
            }

            // Update Tool API call (using adminService which wraps apiClient for PUT /tools/:id is likely not there, adding it or using toolService if permission allows)
            // Actually toolRoutes PUT /:id requires auth+admin. toolService usually is public. 
            // We should use a service method that hits PUT /tools/:id. Let's add updateTool to adminService later or assume we can invoke apiClient directly.
            // Let's use toolService.updateTool (need to ensure it exists or use adminService.updateTool). 
            // I'll add updateTool to adminService in next step if not present.

            await adminService.updateTool(toolId, apiData)

            toast({
                title: 'Success',
                description: 'Tool updated successfully',
                variant: 'default',
            })
            onUpdate()
            onClose()
        } catch (error) {
            console.error('Update error:', error)
            toast({
                title: 'Error',
                description: error.response?.data?.message || 'Failed to update tool',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-gray-900 border border-white/10 shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-gray-900/95 px-6 py-4 backdrop-blur">
                    <h2 className="text-xl font-bold text-white">Edit Tool</h2>
                    <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {loading && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/50 backdrop-blur-[2px]">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Tool Name</label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Slug</label>
                            <input
                                name="slug"
                                value={formData.slug}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Short Description</label>
                        <textarea
                            name="shortDescription"
                            value={formData.shortDescription}
                            onChange={handleChange}
                            rows={2}
                            className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Full Description</label>
                        <textarea
                            name="fullDescription"
                            value={formData.fullDescription}
                            onChange={handleChange}
                            rows={6}
                            className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                        />
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Category</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                                required
                            >
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Pricing Model</label>
                            <select
                                name="pricing"
                                value={formData.pricing}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                            >
                                <option value="Free">Free</option>
                                <option value="Freemium">Freemium</option>
                                <option value="Paid">Paid</option>
                                <option value="Trial">Trial</option>
                                <option value="Unknown">Unknown</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Contact Email (Private)</label>
                            <input
                                name="contactEmail"
                                type="email"
                                value={formData.contactEmail || ''}
                                onChange={handleChange}
                                placeholder="founder@example.com"
                                className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Official Website URL</label>
                            <input
                                name="officialUrl"
                                value={formData.officialUrl}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Source URL (IntelliGrid Link)</label>
                            <input
                                name="sourceUrl"
                                value={formData.sourceUrl}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* ── Affiliate URL (Monetisation) ─────────────────── */}
                    <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                        <label className="text-sm font-medium text-amber-400 flex items-center gap-2">
                            💰 Affiliate URL
                            <span className="text-xs font-normal text-gray-500">(optional — overrides Visit button when AFFILIATE_TRACKING flag is ON)</span>
                        </label>
                        <input
                            name="affiliateUrl"
                            value={formData.affiliateUrl || ''}
                            onChange={handleChange}
                            placeholder="https://shareasale.com/r.cfm?b=...&u=...&m=..."
                            className="w-full rounded-lg border border-amber-500/30 bg-black/50 px-4 py-2 text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none"
                        />
                        <p className="text-xs text-gray-600">
                            When set + flag enabled: users who click &quot;Visit&quot; are redirected through this URL.
                            Leave blank to always send users to the Official Website URL.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Tags (comma separated)</label>
                        <input
                            name="tags"
                            value={formData.tags}
                            onChange={handleChange}
                            placeholder="AI, Chatbot, Image Generation..."
                            className="w-full rounded-lg border border-white/10 bg-black/50 px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isVerified"
                            name="isVerified"
                            checked={formData.isVerified}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-white/10 bg-black/50 text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor="isVerified" className="text-sm font-medium text-gray-300 select-none">
                            Verified (Claimed)
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
