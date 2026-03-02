import { useState } from 'react';
import { Tag, CheckCircle, Layers, ThumbsUp, ThumbsDown, XCircle } from 'lucide-react';
import ToolReviews from './ToolReviews';
import ToolFAQSection from './ToolFAQSection';

export default function ToolContent({ tool }) {
    const [activeTab, setActiveTab] = useState('overview');

    if (!tool) return null;

    return (
        <div className="mt-12 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/5 shadow-2xl p-6 lg:p-8">

            {/* Tabs Header */}
            <div className="flex border-b border-white/10 overflow-x-auto gap-8 mb-8">
                {['overview', 'features', 'pros-cons', 'reviews', 'alternatives'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 font-medium text-sm lg:text-base transition-colors whitespace-nowrap focus:outline-none relative ${activeTab === tab
                            ? 'text-white'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        {tab === 'pros-cons' ? 'Pros & Cons' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {/* Tab Indicator */}
                        {activeTab === tab && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-500 rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[300px] text-gray-300">

                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Summary */}
                        <div className="prose prose-invert max-w-none text-balance leading-relaxed text-gray-300">
                            <h3 className="text-xl font-semibold text-white mb-4">What is {tool.name}?</h3>
                            <p className="whitespace-pre-wrap">
                                {tool.fullDescription || tool.description || "No detailed description available."}
                            </p>
                        </div>

                        {/* Use Cases (Example/Future) */}
                        <div className="grid md:grid-cols-2 gap-6 pt-4">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <h4 className="font-semibold text-white mb-2">Ideal For</h4>
                                <ul className="space-y-2 text-sm text-gray-400">
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Creators</li>
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Developers</li>
                                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Startups</li>
                                </ul>
                            </div>
                            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                <h4 className="font-semibold text-white mb-2">Platform</h4>
                                <div className="flex flex-wrap gap-2 text-sm text-gray-400">
                                    <span className="px-2 py-1 bg-white/5 rounded border border-white/10">Web</span>
                                    <span className="px-2 py-1 bg-white/5 rounded border border-white/10">API</span>
                                </div>
                            </div>
                        </div>

                        {/* Tags */}
                        {tool.tags && tool.tags.length > 0 && (
                            <div className="pt-4 border-t border-white/5">
                                <h4 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Tags</h4>
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

                        {/* Task Tags (enrichment data) */}
                        {tool.taskTags && tool.taskTags.length > 0 && (
                            <div className="pt-2">
                                <h4 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Use Cases</h4>
                                <div className="flex flex-wrap gap-2">
                                    {tool.taskTags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── AI-generated FAQ + Use Cases (PROGRAMMATIC_SEO flag) ── */}
                        <ToolFAQSection
                            slug={tool.slug}
                            staticPros={tool.pros || []}
                            staticCons={tool.cons || []}
                        />
                    </div>
                )}

                {/* 2. FEATURES TAB */}
                {activeTab === 'features' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-xl font-semibold text-white mb-6">Key Capabilities</h3>
                        {tool.features && tool.features.length > 0 ? (
                            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tool.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                        <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 group-hover:bg-green-500/20 transition-colors flex-shrink-0">
                                            <CheckCircle className="h-5 w-5" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-200">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-3">
                                <Layers className="h-10 w-10 opacity-30" />
                                <p className="text-sm">No features listed for this tool yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── 3. PROS & CONS TAB ───────────────────────────────────── */}
                {activeTab === 'pros-cons' && (() => {
                    const pros = tool.pros || []
                    const cons = tool.cons || []
                    const hasData = pros.length > 0 || cons.length > 0
                    return (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h3 className="text-xl font-semibold text-white mb-6">Pros &amp; Cons</h3>
                            {hasData ? (
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Pros */}
                                    <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-5">
                                        <h4 className="flex items-center gap-2 text-sm font-semibold text-green-400 mb-4">
                                            <ThumbsUp size={14} /> Pros
                                        </h4>
                                        {pros.length > 0 ? (
                                            <ul className="space-y-3">
                                                {pros.map((pro, i) => (
                                                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                                                        <CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
                                                        {pro}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-gray-600 italic">No pros listed yet.</p>
                                        )}
                                    </div>

                                    {/* Cons */}
                                    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                                        <h4 className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-4">
                                            <ThumbsDown size={14} /> Cons
                                        </h4>
                                        {cons.length > 0 ? (
                                            <ul className="space-y-3">
                                                {cons.map((con, i) => (
                                                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                                                        <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                                                        {con}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-gray-600 italic">No cons listed yet.</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-3">
                                    <Layers className="h-10 w-10 opacity-30" />
                                    <p className="text-sm">No pros &amp; cons data yet for this tool.</p>
                                    <p className="text-xs text-gray-600">Enrichment data is sourced via Browse AI imports — check the Admin → Enrichment tab.</p>
                                </div>
                            )}
                        </div>
                    )
                })()}

                {/* 3. REVIEWS TAB */}
                {activeTab === 'reviews' && (
                    <ToolReviews tool={tool} />
                )}

                {/* 4. ALTERNATIVES TAB */}
                {activeTab === 'alternatives' && (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <p>AI is analyzing similar tools to compare...</p>
                        {/* This is where we'd list direct competitors */}
                    </div>
                )}
            </div>
        </div>
    );
}
