import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Tag, CheckCircle, Layers, ThumbsUp, ThumbsDown, XCircle,
    Zap, Users, GitBranch, DollarSign, Scale, Puzzle, Brain,
    HelpCircle, Star, AlertTriangle, ArrowRight, Clock, BookOpen,
    Shield, Cpu
} from 'lucide-react';
import ToolReviews from './ToolReviews';
import ToolCard from './ToolCard';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';

// ─── Helper: empty state placeholder ───────────────────────────────────────
function EmptyState({ icon: Icon = Layers, message = 'No data available yet.' }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600 gap-3">
            <Icon className="h-10 w-10 opacity-30" />
            <p className="text-sm">{message}</p>
        </div>
    );
}

// ─── Layer 1: Overview Tab ──────────────────────────────────────────────────
function OverviewTab({ tool }) {
    const ed = tool.enrichmentData || {};
    const brief = ed.intelligenceBrief || {};
    const description = brief.longDescription || tool.longDescription || tool.fullDescription || tool.description;
    const confidence = ed.enrichmentConfidence;

    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Confidence badge */}
            {confidence > 0 && (
                <div className="flex items-center gap-2">
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                        confidence >= 75 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : confidence >= 50 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-gray-500/10 border-gray-500/30 text-gray-400'
                    }`}>
                        <Shield className="h-3 w-3" />
                        Intelligence Confidence: {confidence}/100
                    </div>
                </div>
            )}

            {/* Description */}
            <div className="prose prose-invert max-w-none leading-relaxed text-gray-300">
                <h3 className="text-xl font-semibold text-white mb-4">What is {tool.name}?</h3>
                {description ? (
                    <div className="whitespace-pre-wrap text-gray-300 text-[15px] leading-7">
                        <ReactMarkdown>
                            {DOMPurify.sanitize(description)}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No description available yet.</p>
                )}
            </div>

            {/* Platforms + Audience tags */}
            {(tool.platforms?.length > 0 || tool.audienceTags?.length > 0) && (
                <div className="grid md:grid-cols-2 gap-6 pt-4">
                    {tool.audienceTags?.length > 0 && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <h4 className="font-semibold text-white mb-2 text-sm flex items-center gap-2"><Users className="h-4 w-4 text-purple-400"/> Best For</h4>
                            <div className="flex flex-wrap gap-2">
                                {tool.audienceTags.map(a => (
                                    <span key={a} className="px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">{a}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    {tool.platforms?.length > 0 && (
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <h4 className="font-semibold text-white mb-2 text-sm flex items-center gap-2"><Cpu className="h-4 w-4 text-blue-400"/> Available On</h4>
                            <div className="flex flex-wrap gap-2">
                                {tool.platforms.map(p => (
                                    <span key={p} className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300">{p}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Use case tags */}
            {tool.useCaseTags?.length > 0 && (
                <div className="pt-4 border-t border-white/5">
                    <h4 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">What you can do with it</h4>
                    <div className="flex flex-wrap gap-2">
                        {tool.useCaseTags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">
                                <Zap className="h-2.5 w-2.5" />{tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Tags */}
            {tool.tags?.length > 0 && (
                <div className="pt-2">
                    <h4 className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                        {tool.tags.map(tag => (
                            <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400 hover:bg-white/10 transition-colors">
                                <Tag className="h-3 w-3" />{tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Layer 2: Audience Intelligence ────────────────────────────────────────
function AudienceTab({ tool }) {
    const audiences = tool.enrichmentData?.audienceIntelligence || [];

    if (audiences.length === 0) {
        return <EmptyState icon={Users} message="Audience intelligence not yet generated for this tool." />;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            <h3 className="text-xl font-semibold text-white">Who is {tool.name} Built For?</h3>
            <div className="grid md:grid-cols-2 gap-4">
                {audiences.map((item, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/8 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all group">
                        <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400 flex-shrink-0 group-hover:bg-purple-500/25 transition-colors">
                                <Users className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-white text-sm mb-1">{item.persona}</h4>
                                <p className="text-gray-400 text-sm leading-relaxed">{item.valueProp}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Layer 3: Workflow Scenarios ────────────────────────────────────────────
function WorkflowTab({ tool }) {
    const [openIdx, setOpenIdx] = useState(0);
    const scenarios = tool.enrichmentData?.workflowScenarios || [];

    if (scenarios.length === 0) {
        return <EmptyState icon={GitBranch} message="Workflow scenarios not yet generated for this tool." />;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            <h3 className="text-xl font-semibold text-white">How to Use {tool.name} in Your Workflow</h3>
            <div className="space-y-3">
                {scenarios.map((scenario, i) => (
                    <div key={i} className="rounded-2xl border border-white/8 overflow-hidden">
                        <button
                            onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                            className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/8 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400 text-xs font-bold flex-shrink-0">
                                    {i + 1}
                                </div>
                                <span className="font-medium text-white text-sm">{scenario.scenarioName}</span>
                            </div>
                            <ArrowRight className={`h-4 w-4 text-gray-500 transition-transform ${openIdx === i ? 'rotate-90' : ''}`} />
                        </button>
                        {openIdx === i && scenario.steps?.length > 0 && (
                            <div className="px-5 pb-5 bg-white/3">
                                <ol className="mt-4 space-y-3">
                                    {scenario.steps.map((step, j) => (
                                        <li key={j} className="flex items-start gap-3 text-sm text-gray-300">
                                            <span className="h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">
                                                {j + 1}
                                            </span>
                                            {step}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Layer 4: Pricing Intelligence ─────────────────────────────────────────
function PricingTab({ tool }) {
    const pi = tool.enrichmentData?.pricingIntelligence || {};
    const hasPricingData = pi.model || tool.pricing || tool.startingPrice;

    if (!hasPricingData) {
        return <EmptyState icon={DollarSign} message="Pricing intelligence not yet generated for this tool." />;
    }

    const model = pi.model || tool.pricing || 'Unknown';
    const modelColors = {
        'Free': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        'Freemium': 'bg-blue-500/10 border-blue-500/30 text-blue-400',
        'Paid': 'bg-orange-500/10 border-orange-500/30 text-orange-400',
        'Trial': 'bg-purple-500/10 border-purple-500/30 text-purple-400',
        'Open Source': 'bg-teal-500/10 border-teal-500/30 text-teal-400',
        'Unknown': 'bg-gray-500/10 border-gray-500/30 text-gray-400',
    };
    const colorClass = modelColors[model] || modelColors['Unknown'];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            <h3 className="text-xl font-semibold text-white">Pricing Breakdown</h3>

            {/* Model badge + price */}
            <div className="flex flex-wrap gap-4 items-center">
                <span className={`px-4 py-2 rounded-xl border text-sm font-semibold ${colorClass}`}>
                    {model}
                </span>
                {(pi.startingPrice || tool.startingPrice) && (
                    <span className="text-2xl font-bold text-white">
                        {pi.startingPrice || tool.startingPrice}
                    </span>
                )}
                {pi.hasFreeTier === true && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                        ✓ Free tier available
                    </span>
                )}
            </div>

            {/* Hidden costs note */}
            {pi.hiddenCostsNote && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/8 border border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-semibold text-amber-400 mb-1">Watch Out For</p>
                        <p className="text-sm text-gray-300">{pi.hiddenCostsNote}</p>
                    </div>
                </div>
            )}

            {/* Pricing table note */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/8">
                <p className="text-sm text-gray-400">
                    Pricing data is sourced from the tool's official website and AI analysis.
                    Always verify current pricing at{' '}
                    <a
                        href={tool.officialUrl || tool.websiteUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 underline"
                    >
                        {tool.name}'s pricing page
                    </a>.
                </p>
            </div>
        </div>
    );
}

// ─── Layer 5: Honest Verdict ────────────────────────────────────────────────
function VerdictTab({ tool }) {
    const verdict = tool.enrichmentData?.honestVerdict || {};
    const pros = [
        ...(verdict.strengths || []),
        ...(tool.pros || [])
    ].filter(Boolean);
    const cons = [
        ...(verdict.weaknesses || []),
        ...(tool.cons || [])
    ].filter(Boolean);
    const hasData = pros.length > 0 || cons.length > 0 || verdict.buyIf || verdict.skipIf;

    if (!hasData) {
        return <EmptyState icon={Scale} message="Verdict data not yet generated for this tool." />;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            <h3 className="text-xl font-semibold text-white">Honest Verdict</h3>

            {/* Strengths + Weaknesses */}
            {(pros.length > 0 || cons.length > 0) && (
                <div className="grid md:grid-cols-2 gap-5">
                    {pros.length > 0 && (
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mb-4">
                                <ThumbsUp size={14} /> Strengths
                            </h4>
                            <ul className="space-y-3">
                                {pros.map((s, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                                        <CheckCircle size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                                        {typeof s === 'object' ? s.strength || JSON.stringify(s) : s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {cons.length > 0 && (
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-4">
                                <ThumbsDown size={14} /> Weaknesses
                            </h4>
                            <ul className="space-y-3">
                                {cons.map((w, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                                        <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                                        {typeof w === 'object' ? w.weakness || JSON.stringify(w) : w}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Buy if / Skip if */}
            {(verdict.buyIf || verdict.skipIf) && (
                <div className="grid md:grid-cols-2 gap-5">
                    {verdict.buyIf && (
                        <div className="p-5 rounded-2xl bg-purple-500/8 border border-purple-500/20">
                            <p className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1.5">
                                <Star className="h-3 w-3" /> BUY THIS IF
                            </p>
                            <p className="text-sm text-gray-300 leading-relaxed">{verdict.buyIf}</p>
                        </div>
                    )}
                    {verdict.skipIf && (
                        <div className="p-5 rounded-2xl bg-gray-500/8 border border-gray-500/20">
                            <p className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
                                <XCircle className="h-3 w-3" /> SKIP THIS IF
                            </p>
                            <p className="text-sm text-gray-300 leading-relaxed">{verdict.skipIf}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Layer 6: Competitor Intelligence ──────────────────────────────────────
function CompetitorsTab({ tool, relatedBuckets }) {
    const competitors = tool.enrichmentData?.competitorIntelligence || [];
    const alternatives = relatedBuckets?.alternatives || [];

    if (competitors.length === 0 && alternatives.length === 0) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                <h3 className="text-xl font-semibold text-white">Alternatives to {tool.name}</h3>
                <EmptyState icon={Scale} message="No competitor data yet." />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Alternatives to {tool.name}</h3>
                <Link to={`/alternatives/${tool.slug}`} className="text-xs text-purple-400 hover:text-purple-300 border border-purple-500/20 px-3 py-1 rounded-full hover:bg-purple-500/10 transition-colors">
                    See all →
                </Link>
            </div>

            {/* AI comparison table */}
            {competitors.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">AI Analysis</h4>
                    <div className="space-y-3">
                        {competitors.map((c, i) => (
                            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/8 hover:border-white/15 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-medium text-white text-sm">{c.competitorName}</p>
                                        <p className="text-gray-400 text-sm mt-1 leading-relaxed">{c.differentiation}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Related tool cards */}
            {alternatives.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Similar Tools on IntelliGrid</h4>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {alternatives.map(t => (
                            <ToolCard key={t._id} tool={t} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Layer 7: Integration Ecosystem ────────────────────────────────────────
function IntegrationsTab({ tool }) {
    const integrations = tool.enrichmentData?.integrationEcosystem || tool.integrationTags || [];

    if (integrations.length === 0) {
        return <EmptyState icon={Puzzle} message="Integration data not yet generated for this tool." />;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            <h3 className="text-xl font-semibold text-white">Integration Ecosystem</h3>
            <p className="text-gray-400 text-sm">Tools and platforms that work with {tool.name}:</p>
            <div className="flex flex-wrap gap-3">
                {integrations.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all">
                        <Puzzle className="h-3.5 w-3.5 text-purple-400" />
                        <span className="text-sm text-gray-200 font-medium">{item}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Layer 8: Learning Curve ────────────────────────────────────────────────
function LearningTab({ tool }) {
    const lc = tool.enrichmentData?.learningCurve || {};
    const hasData = lc.complexity || lc.setupTime;

    if (!hasData) {
        return <EmptyState icon={Brain} message="Learning curve data not yet generated for this tool." />;
    }

    const complexityColor = {
        Low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        High: 'text-red-400 bg-red-500/10 border-red-500/30',
    }[lc.complexity] || 'text-gray-400 bg-gray-500/10 border-gray-500/30';

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            <h3 className="text-xl font-semibold text-white">Learning Curve</h3>

            <div className="grid md:grid-cols-2 gap-4">
                {lc.complexity && (
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/8">
                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Complexity Level</p>
                        <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${complexityColor}`}>
                            {lc.complexity}
                        </span>
                    </div>
                )}
                {lc.setupTime && (
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/8">
                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" /> Time to First Result
                        </p>
                        <p className="text-white font-medium">{lc.setupTime}</p>
                    </div>
                )}
            </div>

            {/* docs link */}
            {(tool.officialUrl || tool.websiteUrl) && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/8">
                    <BookOpen className="h-4 w-4 text-blue-400 flex-shrink-0" />
                    <p className="text-sm text-gray-400">
                        Need help getting started?{' '}
                        <a
                            href={`${tool.officialUrl || tool.websiteUrl}/docs`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline"
                        >
                            Check the official documentation →
                        </a>
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── Layer 9: Deep FAQs ─────────────────────────────────────────────────────
function FAQTab({ tool }) {
    const [openIdx, setOpenIdx] = useState(null);
    const faqs = [
        ...(tool.enrichmentData?.deepFAQs || []),
        ...(tool.seoContent?.faqs || []),
    ];

    if (faqs.length === 0) {
        return <EmptyState icon={HelpCircle} message="No FAQs available yet for this tool." />;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
            <h3 className="text-xl font-semibold text-white">Frequently Asked Questions</h3>
            {/* Schema.org FAQ markup */}
            <script type="application/ld+json" dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    "mainEntity": faqs.map(f => ({
                        "@type": "Question",
                        "name": f.question,
                        "acceptedAnswer": { "@type": "Answer", "text": f.answer }
                    }))
                })
            }} />
            <div className="space-y-2">
                {faqs.map((faq, i) => (
                    <div key={i} className="rounded-xl border border-white/8 overflow-hidden">
                        <button
                            onClick={() => setOpenIdx(openIdx === i ? null : i)}
                            className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/8 transition-colors text-left"
                        >
                            <span className="font-medium text-white text-sm pr-4">{faq.question}</span>
                            <HelpCircle className={`h-4 w-4 flex-shrink-0 transition-colors ${openIdx === i ? 'text-purple-400' : 'text-gray-500'}`} />
                        </button>
                        {openIdx === i && (
                            <div className="px-4 pb-4 pt-2 bg-white/3">
                                <p className="text-sm text-gray-300 leading-relaxed">{faq.answer}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Reviews Tab ────────────────────────────────────────────────────────────
function ReviewsTab({ tool }) {
    return <ToolReviews tool={tool} />;
}

// ─── Tab Configuration ──────────────────────────────────────────────────────
const TABS = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'audience', label: 'Who It\'s For', icon: Users },
    { id: 'workflow', label: 'Workflows', icon: GitBranch },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'verdict', label: 'Verdict', icon: Scale },
    { id: 'competitors', label: 'Alternatives', icon: Scale },
    { id: 'integrations', label: 'Integrations', icon: Puzzle },
    { id: 'learning', label: 'Learning Curve', icon: Brain },
    { id: 'faqs', label: 'FAQs', icon: HelpCircle },
    { id: 'reviews', label: 'Reviews', icon: Star },
];

// ─── Main Export ────────────────────────────────────────────────────────────
export default function ToolContent({ tool, relatedBuckets = {} }) {
    const [activeTab, setActiveTab] = useState('overview');

    if (!tool) return null;

    // Determine which tabs to show — always show all if enrichmentData exists
    const hasEnrichment = !!(tool.enrichmentData);

    const visibleTabs = hasEnrichment
        ? TABS
        : TABS.filter(t => ['overview', 'verdict', 'competitors', 'faqs', 'reviews'].includes(t.id));

    return (
        <div className="mt-12 bg-white/5 backdrop-blur-3xl rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
            {/* Tabs Header — horizontal scroll on mobile */}
            <div className="border-b border-white/10 overflow-x-auto">
                <div className="flex gap-1 px-4 pt-4 min-w-max">
                    {visibleTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative pb-3 px-3 font-medium text-sm transition-all duration-200 whitespace-nowrap focus:outline-none flex items-center gap-1.5 ${
                                    isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {tab.label}
                                {isActive && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-t-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6 lg:p-8 min-h-[300px] text-gray-300">
                {activeTab === 'overview'      && <OverviewTab tool={tool} />}
                {activeTab === 'audience'      && <AudienceTab tool={tool} />}
                {activeTab === 'workflow'      && <WorkflowTab tool={tool} />}
                {activeTab === 'pricing'       && <PricingTab tool={tool} />}
                {activeTab === 'verdict'       && <VerdictTab tool={tool} />}
                {activeTab === 'competitors'   && <CompetitorsTab tool={tool} relatedBuckets={relatedBuckets} />}
                {activeTab === 'integrations'  && <IntegrationsTab tool={tool} />}
                {activeTab === 'learning'      && <LearningTab tool={tool} />}
                {activeTab === 'faqs'          && <FAQTab tool={tool} />}
                {activeTab === 'reviews'       && <ReviewsTab tool={tool} />}
            </div>
        </div>
    );
}
