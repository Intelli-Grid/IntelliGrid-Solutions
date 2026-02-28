/**
 * ToolFAQSection.jsx
 *
 * Renders Groq-generated FAQ + Use Cases + Pros/Cons for a tool detail page.
 *
 * - Fetches from GET /api/v1/tools/slug/:slug/seo-content
 * - Only renders when PROGRAMMATIC_SEO flag is ON and content exists
 * - FAQ uses <details>/<summary> for native HTML accordion (SEO-friendly)
 * - Emits JSON-LD FAQ schema for Google rich results
 * - Completely silent when flag is off or content is null
 */

import { useState, useEffect } from 'react'
import { HelpCircle, Lightbulb, ThumbsUp, ThumbsDown, ChevronDown } from 'lucide-react'
import { useFlag } from '../../hooks/useFeatureFlags'

const API_BASE = import.meta.env.VITE_API_URL || ''

export default function ToolFAQSection({ slug }) {
    const seoEnabled = useFlag('PROGRAMMATIC_SEO')
    const [seoContent, setSeoContent] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!seoEnabled || !slug) {
            setLoading(false)
            return
        }

        const fetchSeo = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/v1/tools/slug/${slug}/seo-content`)
                const data = await res.json()
                setSeoContent(data.seoContent || null)
            } catch (err) {
                console.warn('[ToolFAQSection] Failed to load SEO content:', err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchSeo()
    }, [seoEnabled, slug])

    // Render nothing while loading or when no content is available
    if (loading || !seoEnabled || !seoContent) return null

    const { faqs = [], useCases = [], pros = [], cons = [], verdict = '' } = seoContent

    if (faqs.length === 0 && useCases.length === 0) return null

    // Build JSON-LD FAQ schema for Google
    const faqSchema = faqs.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    } : null

    return (
        <div className="mt-10 space-y-8">
            {/* JSON-LD FAQ Schema — injected for Google rich results */}
            {faqSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
                />
            )}

            {/* ── Editorial Verdict ─────────────────────────────────────────── */}
            {verdict && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-500/8 border border-purple-500/20">
                    <Lightbulb size={16} className="mt-0.5 text-purple-400 flex-shrink-0" />
                    <p className="text-sm text-gray-300 leading-relaxed italic">{verdict}</p>
                </div>
            )}

            {/* ── Pros & Cons ───────────────────────────────────────────────── */}
            {(pros.length > 0 || cons.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pros */}
                    {pros.length > 0 && (
                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                            <div className="flex items-center gap-2 mb-3">
                                <ThumbsUp size={14} className="text-emerald-400" />
                                <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">Pros</span>
                            </div>
                            <ul className="space-y-2">
                                {pros.map((pro, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                                        {pro}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Cons */}
                    {cons.length > 0 && (
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                            <div className="flex items-center gap-2 mb-3">
                                <ThumbsDown size={14} className="text-red-400" />
                                <span className="text-sm font-semibold text-red-400 uppercase tracking-wide">Cons</span>
                            </div>
                            <ul className="space-y-2">
                                {cons.map((con, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                                        {con}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* ── Use Cases ─────────────────────────────────────────────────── */}
            {useCases.length > 0 && (
                <div>
                    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                        <Lightbulb size={15} className="text-amber-400" />
                        Use Cases
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {useCases.map((uc, i) => (
                            <div
                                key={i}
                                className="p-4 rounded-xl bg-white/4 border border-white/8 hover:bg-white/7 hover:border-purple-500/20 transition-colors"
                            >
                                <h4 className="text-sm font-semibold text-white mb-1.5">{uc.title}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed">{uc.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── FAQ Accordion ─────────────────────────────────────────────── */}
            {faqs.length > 0 && (
                <div>
                    <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                        <HelpCircle size={15} className="text-purple-400" />
                        Frequently Asked Questions
                    </h3>
                    <div className="space-y-2">
                        {faqs.map((faq, i) => (
                            <FAQItem key={i} question={faq.question} answer={faq.answer} />
                        ))}
                    </div>
                    <p className="mt-4 text-[10px] text-gray-700 text-right tracking-wide">
                        AI-generated content · May not be 100% accurate
                    </p>
                </div>
            )}
        </div>
    )
}

// ── Sub-component: individual FAQ item using <details> for native accordion ───
function FAQItem({ question, answer }) {
    const [open, setOpen] = useState(false)

    return (
        <details
            className="group rounded-xl border border-white/8 bg-white/3 overflow-hidden"
            onToggle={(e) => setOpen(e.target.open)}
        >
            <summary className="flex items-center justify-between gap-4 px-4 py-3.5 cursor-pointer list-none select-none hover:bg-white/5 transition-colors">
                <span className="text-sm font-medium text-gray-200">{question}</span>
                <ChevronDown
                    size={14}
                    className={`text-gray-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </summary>
            <div className="px-4 pb-4 pt-1 text-sm text-gray-400 leading-relaxed border-t border-white/5 bg-white/2">
                {answer}
            </div>
        </details>
    )
}
