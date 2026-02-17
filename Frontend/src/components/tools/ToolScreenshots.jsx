
export default function ToolScreenshots({ tool }) {
    if (!tool) return null;

    // Use metadata logo as the main image for now
    // In a real product page, this would be an array of images.
    const imageSrc = tool.metadata?.logo || tool.logo || 'https://via.placeholder.com/800x450';

    return (
        <div className="relative z-10 w-full">
            {/* Mac Browser Window */}
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gray-900 shadow-2xl ring-1 ring-white/5 backdrop-blur-3xl transition-transform duration-500 hover:scale-[1.01]">

                {/* Browser Toolbar (Minimal) */}
                <div className="flex h-8 items-center gap-2 border-b border-white/5 bg-white/5 px-4 backdrop-blur-md">
                    <div className="flex gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                    </div>
                </div>

                {/* Content Area */}
                <div className="aspect-[4/3] w-full bg-gray-800 relative group overflow-hidden flex items-center justify-center">
                    {/* Placeholder Background Gradient */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black opacity-80" />

                    {/* Main Image */}
                    <img
                        src={imageSrc}
                        alt={`${tool.name} Screenshot`}
                        loading="lazy"
                        width="800"
                        height="600"
                        className="relative z-10 max-h-[80%] max-w-[80%] object-contain drop-shadow-2xl transition-all duration-500 group-hover:scale-105"
                    />

                    {/* Overlay Label */}
                    <span className="absolute bottom-3 right-3 bg-black/60 px-2 py-1 text-[10px] text-gray-400 rounded-md backdrop-blur-sm border border-white/5">
                        Preview
                    </span>
                </div>
            </div>

            {/* Thumbnails (Future Feature) */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 w-16 flex-shrink-0 rounded-lg border border-white/10 bg-white/5 hover:border-purple-500/50 cursor-pointer overflow-hidden">
                        <div className="w-full h-full bg-gray-800 animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}
