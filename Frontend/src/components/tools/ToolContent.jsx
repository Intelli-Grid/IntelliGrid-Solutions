import { useState } from 'react';
import { Tag, Globe, Calendar, Share, ExternalLink } from 'lucide-react';

export default function ToolContent({ tool }) {
    if (!tool) return null;

    const [activeTab, setActiveTab] = useState('overview');

    // Generate Share link
    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: tool.name,
                url: window.location.href,
            });
        } else {
            // Fallback for desktop: copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            // Optionally show toast
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12 bg-white/5 backdrop-blur-3xl rounded-3xl p-6 border border-white/5 shadow-2xl">

            {/* Main Content Area (Left 66%) */}
            <div className="lg:col-span-2 space-y-8">

                {/* Tabs Navigation */}
                <div className="flex border-b border-white/10 overflow-x-auto">
                    {['overview', 'features', 'alternatives'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap focus:outline-none ${activeTab === tab
                                    ? 'text-white border-b-2 border-purple-500 bg-purple-500/10'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[300px] text-gray-300">
                    {activeTab === 'overview' && (
                        <div className="prose prose-invert max-w-none text-balance animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h3 className="text-xl font-semibold text-white mb-4">About {tool.name}</h3>
                            <p className="whitespace-pre-wrap leading-relaxed">
                                {tool.fullDescription || tool.description || "No detailed description available."}
                            </p>

                            {/* Tags Cloud */}
                            {tool.tags && tool.tags.length > 0 && (
                                <div className="mt-8">
                                    <h4 className="text-sm font-medium text-gray-400 mb-2">Popular Tags</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {tool.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/30 transition-colors cursor-pointer"
                                            >
                                                <Tag className="h-3 w-3" /> {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'features' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h3 className="text-xl font-semibold text-white">Key Features</h3>
                            {/* Placeholder Features - Replace with real data later */}
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {['Real-time Processing', 'API Access', 'Mobile Friendly', 'Secure Data'].map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                            <CheckCircleIcon className="h-4 w-4" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-200">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {activeTab === 'alternatives' && (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <p>Loading alternatives via AI...</p>
                            {/* This will be populated by SimilarTools later */}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar (Right 33%) */}
            <div className="lg:col-span-1 border-l border-white/10 pl-0 lg:pl-8 space-y-8">

                {/* Information Card */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Information</h3>

                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2 border-b border-white/5">
                            <span className="text-gray-400">Category</span>
                            <span className="text-white font-medium">{tool.category?.name || tool.category}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/5">
                            <span className="text-gray-400">Launch Date</span>
                            <span className="text-white font-medium">
                                {tool.createdAt ? new Date(tool.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-white/5">
                            <span className="text-gray-400">Pricing Model</span>
                            <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 font-medium">
                                {tool.pricing?.type || 'Freemium'}
                            </span>
                        </div>
                        <div className="flex justify-between py-2">
                            <span className="text-gray-400">Website</span>
                            <a href={tool.officialUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-purple-400 hover:text-purple-300">
                                {new URL(tool.officialUrl).hostname.replace('www.', '')} <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Share Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-white/10">
                    <h3 className="text-sm font-semibold text-white mb-3">Share this tool</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={handleShare}
                            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <Share className="h-4 w-4" /> Copy Link
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

function CheckCircleIcon({ className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
    )
}
