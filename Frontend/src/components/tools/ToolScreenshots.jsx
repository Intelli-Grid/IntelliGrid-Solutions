
export default function ToolScreenshots({ tool }) {
    if (!tool) return null;

    // Use metadata logo as the main image for now
    const imageSrc = tool.metadata?.logo || tool.logo || 'https://via.placeholder.com/800x450';

    return (
        <div className="mx-auto w-full max-w-6xl -mt-12 relative z-20 px-4 md:px-0">
            {/* Mac Browser Window */}
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gray-900 shadow-2xl ring-1 ring-white/5 backdrop-blur-3xl transition-transform duration-500 hover:scale-[1.01]">

                {/* Browser Toolbar */}
                <div className="flex h-10 items-center gap-2 border-b border-white/5 bg-white/5 px-4 backdrop-blur-md">
                    <div className="flex gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-red-500/80" />
                        <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                        <div className="h-3 w-3 rounded-full bg-green-500/80" />
                    </div>

                    {/* Fake URL Bar */}
                    <div className="mx-auto flex w-full max-w-lg items-center justify-center rounded-md bg-black/20 px-3 py-1 text-xs text-gray-500">
                        {tool.officialUrl ? new URL(tool.officialUrl).hostname : 'www.tool.com'}
                    </div>
                </div>

                {/* Content Area */}
                <div className="aspect-video w-full bg-gray-800 relative group overflow-hidden">
                    {/* 
                        Ideally, we would use a real screenshot here. 
                        For now, we use a placeholder or the logo centered on a nice background.
                    */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black">
                        <img
                            src={imageSrc}
                            alt="Screenshot"
                            className="h-32 w-32 object-contain opacity-80 drop-shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:opacity-100"
                        />

                    </div>
                    {/* Overlay Text */}
                    <span className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 text-xs text-gray-400 rounded-lg backdrop-blur-sm">
                        Preview
                    </span>
                </div>
            </div>
        </div>
    );
}
