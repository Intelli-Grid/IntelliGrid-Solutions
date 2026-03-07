/**
 * DashboardSkeleton.jsx
 * Skeleton loader for the Dashboard page initial load.
 * Mirrors the real layout: stats row → tabs → content grid.
 */
export default function DashboardSkeleton() {
    return (
        <div className="container mx-auto px-4 py-16 animate-pulse">
            {/* Header */}
            <div className="mb-8">
                <div className="h-10 w-48 bg-white/8 rounded-xl mb-3" />
                <div className="h-4 w-64 bg-white/5 rounded-lg" />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-5">
                        <div className="h-3 w-20 bg-white/8 rounded mb-3" />
                        <div className="h-8 w-16 bg-white/10 rounded-lg" />
                    </div>
                ))}
            </div>

            {/* Tab bar */}
            <div className="flex gap-6 border-b border-white/8 pb-4 mb-8 overflow-hidden">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className={`h-3 rounded ${i === 0 ? 'w-20 bg-white/15' : 'w-16 bg-white/6'}`} />
                ))}
            </div>

            {/* Content cards */}
            <div className="grid gap-6 md:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-6">
                        <div className="h-5 w-32 bg-white/10 rounded mb-5" />
                        <div className="space-y-3">
                            {[...Array(3)].map((_, j) => (
                                <div key={j} className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-white/8 flex-shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 w-3/4 bg-white/8 rounded" />
                                        <div className="h-2.5 w-1/2 bg-white/5 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
