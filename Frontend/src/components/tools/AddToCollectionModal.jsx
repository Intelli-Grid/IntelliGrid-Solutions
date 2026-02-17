import { useState, useEffect } from 'react'
import { X, Plus, Check, Loader2, FolderPlus } from 'lucide-react'
import { collectionService } from '../../services'
import { toast } from 'react-hot-toast'

export default function AddToCollectionModal({ isOpen, onClose, toolId }) {
    const [collections, setCollections] = useState([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [newCollectionName, setNewCollectionName] = useState('')
    const [processingId, setProcessingId] = useState(null)

    useEffect(() => {
        if (isOpen) {
            fetchCollections()
        }
    }, [isOpen])

    const fetchCollections = async () => {
        try {
            setLoading(true)
            const response = await collectionService.getMyCollections()
            setCollections(response.data || response || [])
        } catch (error) {
            console.error('Failed to load collections', error)
            toast.error('Failed to load your collections')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateCollection = async (e) => {
        e.preventDefault()
        if (!newCollectionName.trim()) return

        try {
            setCreating(true)
            const response = await collectionService.createCollection({ name: newCollectionName })
            const newCollection = response.data || response

            // Automatically add tool to new collection
            await collectionService.addTool(newCollection._id, toolId)

            toast.success('Collection created and tool added!')
            setNewCollectionName('')
            fetchCollections() // Refresh list
        } catch (error) {
            console.error('Failed to create collection', error)
            toast.error('Failed to create collection')
        } finally {
            setCreating(false)
        }
    }

    const toggleToolInCollection = async (collection) => {
        const isPresent = collection.tools.some(t => (t._id ? t._id.toString() : t.toString()) === toolId.toString())
        setProcessingId(collection._id)

        try {
            if (isPresent) {
                await collectionService.removeTool(collection._id, toolId)
                toast.success('Removed from collection')
            } else {
                await collectionService.addTool(collection._id, toolId)
                toast.success('Added to collection')
            }
            // Refresh list to update UI
            fetchCollections()
        } catch (error) {
            console.error('Failed to update collection', error)
            toast.error('Failed to update collection')
        } finally {
            setProcessingId(null)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-gray-900 border border-white/10 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h3 className="text-xl font-bold text-white">Save to Collection</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                        </div>
                    ) : collections.length > 0 ? (
                        <div className="space-y-3">
                            {collections.map(collection => {
                                const isAdded = collection.tools.some(t => (t._id ? t._id.toString() : t.toString()) === toolId.toString())
                                return (
                                    <button
                                        key={collection._id}
                                        onClick={() => toggleToolInCollection(collection)}
                                        disabled={processingId === collection._id} // Fix: Disable only the specific button processing
                                        className="w-full flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition group"
                                    >
                                        <div className="text-left">
                                            <div className="font-medium text-white group-hover:text-purple-400 transition">
                                                {collection.name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {collection.tools.length} items • {collection.isPublic ? 'Public' : 'Private'}
                                            </div>
                                        </div>
                                        <div>
                                            {processingId === collection._id ? (
                                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                            ) : isAdded ? (
                                                <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                                    <Check size={16} />
                                                </div>
                                            ) : (
                                                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 group-hover:bg-purple-500 group-hover:text-white transition">
                                                    <Plus size={16} />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <FolderPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No collections yet. Create one below!</p>
                        </div>
                    )}
                </div>

                {/* Footer: Create New */}
                <div className="p-6 border-t border-white/10 bg-black/20">
                    <form onSubmit={handleCreateCollection} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="New collection name..."
                            value={newCollectionName}
                            onChange={(e) => setNewCollectionName(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                        />
                        <button
                            type="submit"
                            disabled={!newCollectionName.trim() || creating}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                            Create
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
