
import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'

export default function EmbedToolModal({ isOpen, onClose, tool }) {
    const [copied, setCopied] = useState(false)

    if (!isOpen || !tool) return null

    const embedCode = `<a href="https://intelligrid.online/tools/${tool.slug}" target="_blank" title="Review ${tool.name} on IntelliGrid"><img src="https://intelligrid.online/assets/badges/featured.svg" alt="Featured on IntelliGrid" width="200" /></a>`

    const handleCopy = () => {
        navigator.clipboard.writeText(embedCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 border border-white/10 p-6 shadow-2xl transition-all">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <X size={20} />
                </button>

                <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">Embed Badge</h3>
                    <p className="text-sm text-gray-400">
                        Showcase your IntelliGrid listing on your website to build trust and get more reviews.
                    </p>
                </div>

                {/* Preview */}
                <div className="mb-6 flex justify-center p-6 bg-white/5 rounded-xl border border-white/10 border-dashed">
                    {/* Placeholder Badge Visualization */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 rounded-lg border border-purple-500/30 shadow-lg">
                        <div className="h-8 w-8 bg-purple-600 rounded-md flex items-center justify-center font-bold text-white">IG</div>
                        <div className="text-left">
                            <div className="text-[10px] uppercase tracking-wider text-purple-400 font-semibold">Featured on</div>
                            <div className="text-sm font-bold text-white">IntelliGrid</div>
                        </div>
                    </div>
                </div>

                {/* Code Snippet */}
                <div className="relative">
                    <label className="mb-2 block text-xs font-medium text-gray-500 uppercase tracking-wider">Embed Code</label>
                    <pre className="w-full rounded-lg border border-white/10 bg-black/50 p-4 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap break-all selection:bg-purple-500/30">
                        {embedCode}
                    </pre>

                    <button
                        onClick={handleCopy}
                        className="absolute top-8 right-2 p-2 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                        title="Copy to clipboard"
                    >
                        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                    </button>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleCopy}
                        className="ml-3 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 transition-colors"
                    >
                        {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                </div>
            </div>
        </div>
    )
}
