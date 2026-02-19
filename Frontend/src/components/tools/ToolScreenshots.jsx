import { useState } from 'react'

export default function ToolScreenshots({ tool }) {
    if (!tool) return null

    // Build image list: screenshots first, then fall back to logo/metadata.logo
    const logoSrc = tool.metadata?.logo || tool.logo || ''
    const screenshotList = (tool.screenshots || tool.metadata?.screenshots || []).filter(Boolean)

    // Screenshots preferred, logo as final fallback
    const allImages = screenshotList.length > 0 ? screenshotList : (logoSrc ? [logoSrc] : [])
    const hasImages = allImages.length > 0

    const [activeIdx, setActiveIdx] = useState(0)
    const mainSrc = hasImages ? allImages[activeIdx] : null

    return (
        <div className="relative z-10 w-full">
            {/* Mac Browser Window */}
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gray-900 shadow-2xl ring-1 ring-white/5 transition-transform duration-500 hover:scale-[1.01]">

                {/* Browser Toolbar */}
                <div className="flex h-8 items-center gap-2 border-b border-white/5 bg-white/5 px-4">
                    <div className="flex gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                    </div>
                    {tool.officialUrl && (
                        <div className="ml-2 flex-1 bg-white/5 rounded text-[10px] text-gray-500 px-2 py-0.5 truncate">
                            {tool.officialUrl.replace(/^https?:\/\//, '').split('?')[0]}
                        </div>
                    )}
                </div>

                {/* Image Frame — fixed aspect ratio, image fills it completely */}
                <div className="relative w-full" style={{ aspectRatio: '16/10' }}>
                    {mainSrc ? (
                        <>
                            <img
                                key={mainSrc}
                                src={mainSrc}
                                alt={`${tool.name} preview`}
                                loading="lazy"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                                onError={(e) => {
                                    e.target.onerror = null
                                    e.target.parentElement.querySelector('.no-img-fallback').style.display = 'flex'
                                    e.target.style.display = 'none'
                                }}
                            />
                            {/* Counter badge */}
                            {allImages.length > 1 && (
                                <span className="absolute bottom-3 right-3 bg-black/70 px-2 py-1 text-[10px] text-gray-300 rounded-md backdrop-blur-sm border border-white/10 z-10">
                                    {activeIdx + 1} / {allImages.length}
                                </span>
                            )}
                            {!allImages.length > 1 && (
                                <span className="absolute bottom-3 right-3 bg-black/60 px-2 py-1 text-[10px] text-gray-400 rounded-md backdrop-blur-sm border border-white/5 z-10">
                                    Preview
                                </span>
                            )}
                        </>
                    ) : null}

                    {/* Placeholder — shown when no image or image errors */}
                    <div
                        className="no-img-fallback absolute inset-0 flex-col items-center justify-center gap-4 bg-gradient-to-br from-gray-800 to-gray-900"
                        style={{ display: mainSrc ? 'none' : 'flex' }}
                    >
                        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-600/20 border border-white/10 flex items-center justify-center text-3xl font-bold text-white/40">
                            {tool.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <p className="text-sm text-gray-600">No preview available</p>
                    </div>
                </div>
            </div>

            {/* Thumbnails — only shown when multiple images exist */}
            {allImages.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {allImages.map((src, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveIdx(i)}
                            className={`flex-shrink-0 h-14 w-20 rounded-lg border overflow-hidden transition-all duration-200 ${i === activeIdx
                                    ? 'border-purple-500/80 ring-2 ring-purple-500/30 opacity-100'
                                    : 'border-white/10 hover:border-purple-500/40 opacity-60 hover:opacity-90'
                                }`}
                        >
                            <img
                                src={src}
                                alt={`${tool.name} ${i + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.onerror = null; e.target.style.opacity = '0.2' }}
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
