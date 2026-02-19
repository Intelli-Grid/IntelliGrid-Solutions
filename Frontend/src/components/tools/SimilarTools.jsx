import { Link, useNavigate } from 'react-router-dom';
import { Star, ArrowRight } from 'lucide-react';

export default function SimilarTools({ tools, currentToolSlug }) {
    const navigate = useNavigate()
    if (!tools || tools.length === 0) return null;

    return (
        <section className="mt-12 space-y-4">
            <h2 className="text-xl font-bold text-white">
                Similar Tools
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tools.map((tool) => (
                    <div
                        key={tool._id}
                        onClick={() => navigate(`/tools/${tool.slug}`)}
                        className="group relative overflow-hidden rounded-xl border border-white/8 bg-white/3 p-4 cursor-pointer transition-all duration-200 hover:border-purple-500/30 hover:bg-white/6 hover:shadow-lg hover:shadow-purple-500/5"
                    >
                        <div className="flex items-start gap-3">
                            {/* Logo */}
                            <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gray-900 border border-white/10 overflow-hidden">
                                {(tool.logo || tool.metadata?.logo) ? (
                                    <img
                                        src={tool.logo || tool.metadata?.logo}
                                        alt={`${tool.name} logo`}
                                        className="h-full w-full object-cover"
                                        onError={(e) => { e.target.onerror = null; e.target.style.display = 'none' }}
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-sm font-bold text-white/40 bg-gradient-to-br from-purple-500/20 to-blue-600/20">
                                        {tool.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="truncate text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
                                        {tool.name}
                                    </h3>
                                    {tool.ratings?.average > 0 && (
                                        <div className="flex items-center gap-0.5 text-xs text-amber-400 flex-shrink-0">
                                            <Star className="h-3 w-3 fill-current" />
                                            <span>{tool.ratings.average.toFixed(1)}</span>
                                        </div>
                                    )}
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                                    {tool.shortDescription}
                                </p>

                                {/* Compare link — proper Link, stops propagation to avoid double navigation */}
                                {currentToolSlug && (
                                    <Link
                                        to={`/compare/${currentToolSlug}-vs-${tool.slug}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-purple-400 hover:text-purple-300 transition-colors"
                                    >
                                        Compare <ArrowRight size={10} />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
