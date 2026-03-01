import { useState } from 'react'
import { Mail, Zap, CheckCircle, ArrowRight, Loader2, Calendar, Users, Star } from 'lucide-react'
import { newsletterService } from '../services'
import { useFlag } from '../hooks/useFeatureFlags'
import { Helmet } from 'react-helmet-async'

const SAMPLE_TOOLS = [
    { name: 'Perplexity AI', desc: 'AI-powered answer engine replacing Google for many power users.', tag: 'Search' },
    { name: 'Cursor', desc: 'The AI code editor that ships features, not just autocompletes.', tag: 'Dev' },
    { name: 'ElevenLabs', desc: 'Voice cloning so good it passed the Turing test in sound.', tag: 'Audio' },
    { name: 'Notion AI', desc: 'The knowledge base that can now write back to you.', tag: 'Productivity' },
    { name: 'Midjourney V6', desc: 'Photorealistic image generation available to everyone.', tag: 'Image' },
]

const BENEFITS = [
    { icon: Zap, title: '5 tools every Tuesday', desc: 'Curated picks — not a firehose. Only tools worth your time.' },
    { icon: Star, title: 'Practical breakdowns', desc: 'We test each tool and tell you exactly who it is and isn\'t for.' },
    { icon: Users, title: '5,000+ builders read it', desc: 'Founders, engineers, and creators who ship things.' },
    { icon: Calendar, title: 'Free, forever', desc: 'No paywalls. No upsells in the newsletter itself.' },
]

export default function NewsletterPage() {
    const newsletterEnabled = useFlag('NEWSLETTER_SIGNUP')
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState('idle') // idle | loading | success | error
    const [errMsg, setErrMsg] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email.trim() || status === 'loading') return
        setStatus('loading')
        setErrMsg('')
        try {
            await newsletterService.subscribe(email.trim(), 'newsletter_page')
            setStatus('success')
            setEmail('')
        } catch (err) {
            setErrMsg(err?.response?.data?.message || 'Something went wrong. Please try again.')
            setStatus('error')
        }
    }

    return (
        <>
            <Helmet>
                <title>The IntelliGrid Brief — Weekly AI Tools Digest</title>
                <meta
                    name="description"
                    content="5 AI tools worth your attention every Tuesday. Join 5,000+ founders, engineers and creators who stay ahead of the curve with IntelliGrid."
                />
            </Helmet>

            <div className="min-h-screen bg-black">
                {/* Hero */}
                <section className="relative overflow-hidden border-b border-white/8 pb-24 pt-20">
                    {/* Background glows */}
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-purple-600/10 blur-[120px]" />
                        <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-violet-600/10 blur-[80px]" />
                    </div>

                    <div className="relative mx-auto max-w-3xl px-4 text-center">
                        {/* Badge */}
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-300">
                            <Mail size={12} />
                            Free Weekly Newsletter
                        </div>

                        <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-6xl">
                            The{' '}
                            <span className="bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">
                                IntelliGrid Brief
                            </span>
                        </h1>
                        <p className="mb-3 text-xl text-gray-300">
                            5 AI tools worth your attention — every Tuesday.
                        </p>
                        <p className="mb-10 text-gray-500">
                            No fluff. No hype. Just practical picks tested by our team, with clear breakdowns
                            of who should use them and why.
                        </p>

                        {/* Signup or Coming Soon */}
                        {!newsletterEnabled ? (
                            <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/3 p-6">
                                <p className="text-sm text-gray-400">
                                    🚀 The newsletter is launching soon. Check back shortly or follow us on{' '}
                                    <a
                                        href="https://twitter.com/intelligrid_ai"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-purple-400 hover:text-purple-300"
                                    >
                                        @intelligrid_ai
                                    </a>{' '}
                                    for the launch announcement.
                                </p>
                            </div>
                        ) : status === 'success' ? (
                            <div className="mx-auto max-w-md rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                                <CheckCircle className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
                                <p className="font-semibold text-white">You're in! Welcome to the Brief.</p>
                                <p className="mt-1 text-sm text-gray-400">
                                    Check your inbox — first issue lands next Tuesday.
                                </p>
                            </div>
                        ) : (
                            <form
                                onSubmit={handleSubmit}
                                className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
                            >
                                <input
                                    id="newsletter-page-email"
                                    type="email"
                                    required
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setStatus('idle') }}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 text-sm transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:from-purple-500 hover:to-violet-500 disabled:opacity-50 whitespace-nowrap"
                                >
                                    {status === 'loading' ? (
                                        <><Loader2 size={14} className="animate-spin" /> Subscribing...</>
                                    ) : (
                                        <>Subscribe Free <ArrowRight size={14} /></>
                                    )}
                                </button>
                            </form>
                        )}

                        {status === 'error' && (
                            <p className="mt-3 text-sm text-red-400">{errMsg}</p>
                        )}

                        <p className="mt-4 text-xs text-gray-600">
                            No spam. Unsubscribe with one click anytime. ~2-minute read weekly.
                        </p>
                    </div>
                </section>

                {/* Benefits grid */}
                <section className="mx-auto max-w-5xl px-4 py-20">
                    <h2 className="mb-12 text-center text-2xl font-bold text-white">
                        Why 5,000+ builders read every issue
                    </h2>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {BENEFITS.map(({ icon: Icon, title, desc }) => (
                            <div
                                key={title}
                                className="rounded-xl border border-white/8 bg-white/3 p-5 transition-colors hover:border-purple-500/20 hover:bg-purple-500/5"
                            >
                                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                                    <Icon size={16} className="text-purple-400" />
                                </div>
                                <p className="mb-1 font-semibold text-white text-sm">{title}</p>
                                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Sample issue preview */}
                <section className="border-t border-white/8 bg-white/1 py-20">
                    <div className="mx-auto max-w-3xl px-4">
                        <div className="mb-8 text-center">
                            <p className="text-xs font-semibold uppercase tracking-widest text-purple-400">Sample Issue</p>
                            <h2 className="mt-2 text-2xl font-bold text-white">
                                What a typical Tuesday looks like
                            </h2>
                        </div>

                        {/* Mock email card */}
                        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">
                            {/* Email header bar */}
                            <div className="border-b border-white/8 bg-white/3 px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-600">
                                        <Mail size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">IntelliGrid Brief — Issue #12</p>
                                        <p className="text-xs text-gray-500">newsletter@intelligrid.online · Tuesday 9:00 AM</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                <p className="mb-6 text-sm text-gray-400 leading-relaxed">
                                    Hey — here are 5 tools that caught our attention this week.
                                    No filler, no sponsored slots. Just what we'd actually use.
                                </p>

                                <div className="space-y-4">
                                    {SAMPLE_TOOLS.map((tool, i) => (
                                        <div key={tool.name} className="flex gap-4 rounded-xl border border-white/5 bg-white/2 p-4">
                                            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-xs font-bold text-purple-400">
                                                {i + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-white text-sm">{tool.name}</span>
                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                                                        {tool.tag}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 leading-relaxed">{tool.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-6 text-xs text-gray-600 border-t border-white/5 pt-4">
                                    That's it for this week. If this was useful, forward it to a builder friend.
                                    See you next Tuesday. — The IntelliGrid Team
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Bottom CTA */}
                {newsletterEnabled && status !== 'success' && (
                    <section className="py-20">
                        <div className="mx-auto max-w-xl px-4 text-center">
                            <h2 className="mb-2 text-2xl font-bold text-white">Ready to stay ahead?</h2>
                            <p className="mb-8 text-gray-500">Join 5,000+ people who get the brief every Tuesday.</p>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
                                <input
                                    type="email"
                                    required
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setStatus('idle') }}
                                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-600 focus:border-purple-500 focus:outline-none text-sm transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50 whitespace-nowrap transition-colors"
                                >
                                    {status === 'loading' ? 'Subscribing...' : 'Subscribe Free'}
                                </button>
                            </form>
                        </div>
                    </section>
                )}
            </div>
        </>
    )
}
