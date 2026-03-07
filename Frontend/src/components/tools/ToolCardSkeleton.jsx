/**
 * ToolCardSkeleton.jsx
 * Shimmer skeleton that matches the exact ToolCard layout.
 * Uses CSS shimmer animation for premium feel over plain animate-pulse.
 */
export default function ToolCardSkeleton() {
    return (
        <div className="flex flex-col bg-[#0d0d0d] border border-white/8 rounded-2xl overflow-hidden h-full shimmer-card">
            {/* Banner skeleton */}
            <div className="w-full bg-white/5 flex-shrink-0 shimmer-bar" style={{ height: '140px' }} />

            {/* Body */}
            <div className="flex flex-col flex-1 px-4 pb-4 pt-3 gap-3">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                    <div className="h-4 w-2/3 bg-white/10 rounded-md shimmer-bar" />
                    <div className="h-4 w-8 bg-white/8 rounded-md shimmer-bar flex-shrink-0" />
                </div>
                {/* Description */}
                <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-full bg-white/7 rounded-md shimmer-bar" />
                    <div className="h-3 w-4/5 bg-white/7 rounded-md shimmer-bar" />
                    <div className="h-3 w-3/5 bg-white/5 rounded-md shimmer-bar" />
                </div>
                {/* Tags */}
                <div className="flex gap-1.5">
                    <div className="h-4 w-12 bg-white/8 rounded-md shimmer-bar" />
                    <div className="h-4 w-16 bg-white/7 rounded-md shimmer-bar" />
                    <div className="h-4 w-10 bg-white/6 rounded-md shimmer-bar" />
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-auto">
                    <div className="h-5 w-16 bg-white/10 rounded-md shimmer-bar" />
                    <div className="h-7 w-20 bg-white/10 rounded-lg shimmer-bar" />
                </div>
            </div>
        </div>
    )
}
