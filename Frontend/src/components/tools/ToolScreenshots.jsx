import { useState } from 'react'

export default function ToolScreenshots({ tool }) {
    if (!tool) return null

    // Build image list: screenshots first, then fall back to logo/metadata.logo
    const logoSrc = tool.metadata?.logo || tool.logo || ''
    const screenshotList = (tool.screenshots || tool.metadata?.screenshots || []).filter(Boolean)

    // All images available — screenshots preferred, logo as final fallback
    const allImages = screenshotList.length > 0 ? screenshotList : (logoSrc ? [logoSrc] : [])
    const hasImages = allImages.length > 0

    const [activeIdx, setActiveIdx] = useState(0)
    const mainSrc = hasImages ? allImages[activeIdx] : null

    return (
        <div className="relative z-10 w-full">
            {/* Mac Browser Window */}
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gray-900 shadow-2xl ring-1 ring-white/5 backdrop-blur-3xl transition-transform duration-500 hover:scale-[1.01]">

                {/* Browser Toolbar */}
                <div className="flex h-8 items-center gap-2 border-b border-white/5 bg-white/5 px-4 backdrop-blur-md">
                    <div className="flex gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                    </div>
                    {tool.officialUrl && (
                        <div className="ml-2 flex-1 bg-white/5 rounded text-[10px] text-gray-500 px-2 py-0.5 truncate">
                            {tool.officialUrl.replace(/^https?:\/\//, '').replace(/\?.*$/, '')}
                        </div>
                    )}
                </div>

                {/* Content Area */}
                <div className="aspect-[4/3] w-full bg-gray-800 relative group overflow-hidden flex items-center justify-center">
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black opacity-80" />

                    {mainSrc ? (
                        <img
                            key={mainSrc}
                            src={mainSrc}
                            alt={`${tool.name} preview`}
                            loading="lazy"
                            className="relative z-10 w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.02]"
                            onError={(e) => {
                                e.target.onerror = null
                                e.target.style.display = 'none'
                            }}
                        />
                    ) : (
                        // No image — stylised placeholder with tool initials
                        <div className="relative z-10 flex flex-col items-center justify-center gap-4">
                            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center text-3xl font-bold text-white/30">
                                {tool.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <p className="text-sm text-gray-600">No preview available</p>
                        </div>
                    )}

                    {/* Label */}
                    <span className="absolute bottom-3 right-3 bg-black/60 px-2 py-1 text-[10px] text-gray-400 rounded-md backdrop-blur-sm border border-white/5 z-20">
                        {allImages.length > 1 ? `${activeIdx + 1} / ${allImages.length}` : 'Preview'}
                    </span>
                </div>
            </div>

            {/* Thumbnails — only shown when multiple images exist */}
            {allImages.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                    {allImages.map((src, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveIdx(i)}
                            className={`flex-shrink-0 h-16 w-24 rounded-lg border overflow-hidden transition-all duration-200 ${i === activeIdx
                                    ? 'border-purple-500/70 ring-2 ring-purple-500/30'
                                    : 'border-white/10 hover:border-purple-500/40'
                                }`}
                        >
                            <img
                                src={src}
                                alt={`${tool.name} screenshot ${i + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.onerror = null; e.target.style.opacity = '0.3' }}
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
