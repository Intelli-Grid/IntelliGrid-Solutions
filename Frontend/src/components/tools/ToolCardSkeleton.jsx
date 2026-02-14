export default function ToolCardSkeleton() {
    return (
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full flex flex-col justify-between animate-pulse">
            <div>
                {/* Title Skeleton */}
                <div className="flex justify-between items-start mb-4">
                    <div className="h-6 w-3/4 bg-white/10 rounded"></div>
                    <div className="h-6 w-8 bg-white/10 rounded-full"></div>
                </div>

                {/* Description Skeleton */}
                <div className="space-y-2 mb-4">
                    <div className="h-4 w-full bg-white/10 rounded"></div>
                    <div className="h-4 w-5/6 bg-white/10 rounded"></div>
                </div>

                {/* Tags Skeleton */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <div className="h-6 w-16 bg-white/10 rounded-full"></div>
                    <div className="h-6 w-20 bg-white/10 rounded-full"></div>
                    <div className="h-6 w-12 bg-white/10 rounded-full"></div>
                </div>
            </div>

            {/* Footer Skeleton */}
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <div className="h-4 w-20 bg-white/10 rounded"></div>
                <div className="h-9 w-24 bg-white/10 rounded-xl"></div>
            </div>
        </div>
    )
}
