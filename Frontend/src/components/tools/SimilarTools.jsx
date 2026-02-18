import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

export default function SimilarTools({ tools, currentToolSlug }) {
    if (!tools || tools.length === 0) return null;

    return (
        <section className="mt-12 space-y-4">
            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Tools like this
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {tools.map((tool) => (
                    <Link
                        key={tool._id}
                        to={`/tools/${tool.slug}`}
                        className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 hover:shadow-xl"
                    >
                        {/* Background Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative z-10 flex items-start gap-4">
                            {/* Logo */}
                            <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-gray-900 border border-white/10 overflow-hidden">
                                {(tool.logo || tool.metadata?.logo) ? (
                                    <img
                                        src={tool.logo || tool.metadata?.logo}
                                        alt={`${tool.name} logo`}
                                        className="h-full w-full object-contain p-1"
                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                    />
                                ) : null}
                                <div
                                    className="h-full w-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-purple-500/30 to-blue-600/30"
                                    style={{ display: (tool.logo || tool.metadata?.logo) ? 'none' : 'flex' }}
                                >
                                    {tool.name?.charAt(0)?.toUpperCase()}
                                </div>
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="truncate font-medium text-white group-hover:text-purple-400 transition-colors">
                                        {tool.name}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-yellow-500">
                                        <Star className="h-3 w-3 fill-current" />
                                        <span>{tool.ratings?.average?.toFixed(1) || 'N/A'}</span>
                                    </div>
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-gray-400 group-hover:text-gray-300">
                                    {tool.shortDescription}
                                </p>

                                {/* Comparison Link */}
                                {currentToolSlug && (
                                    <div className="mt-3">
                                        <object>
                                            <Link
                                                to={`/compare/${currentToolSlug}-vs-${tool.slug}`}
                                                className="inline-flex items-center text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors z-20 relative"
                                                onClick={(e) => e.stopPropagation()} // Prevent parent Link click
                                            >
                                                Compare vs {tool.name} &rarr;
                                            </Link>
                                        </object>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
