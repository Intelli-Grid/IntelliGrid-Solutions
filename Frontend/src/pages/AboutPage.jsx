import { Link } from 'react-router-dom'
import { Users, Target, Globe, Zap, Shield, BookOpen, ArrowRight, Star, Search, BarChart2 } from 'lucide-react'
import SEO from '../components/common/SEO'

// ─── Team members ──────────────────────────────────────────────────────────────
const TEAM = [
    {
        name: 'IntelliGrid Team',
        role: 'Founders & Curators',
        bio: 'A team of AI enthusiasts, engineers, and product builders who got tired of searching 12 different sites to find the right AI tool. We built IntelliGrid so you don\'t have to.',
        emoji: '🚀',
    },
]

// ─── Stats ─────────────────────────────────────────────────────────────────────
const STATS = [
    { value: '4,000+', label: 'AI Tools Indexed' },
    { value: '50+', label: 'Categories' },
    { value: 'Daily', label: 'Updates' },
    { value: '99%', label: 'Uptime SLA' },
]

// ─── Values ────────────────────────────────────────────────────────────────────
const VALUES = [
    {
        icon: Search,
        title: 'Discovery First',
        description: 'We believe finding the right AI tool shouldn\'t require 10 browser tabs. IntelliGrid is a single, curated source of truth — updated every day.',
    },
    {
        icon: Shield,
        title: 'Honest Reviews',
        description: 'No pay-to-rank. Featured listings are clearly labeled. Community reviews are moderated for quality, not suppressed for criticism.',
    },
    {
        icon: BarChart2,
        title: 'Data-Driven',
        description: 'Every tool listing is enriched with real pricing, platform support, use-case tags, and verified affiliate data — so you can compare apples to apples.',
    },
    {
        icon: Globe,
        title: 'Global by Design',
        description: 'We support both INR and USD pricing, Cashfree for Indian users, and a fully localised checkout experience — because great tools exist everywhere.',
    },
    {
        icon: Zap,
        title: 'Built for Speed',
        description: 'No paywalls for browsing, no login required to explore. IntelliGrid loads fast and works on every device, from mobile to desktop.',
    },
    {
        icon: BookOpen,
        title: 'Always Learning',
        description: 'Our blog, newsletter, and Stack Advisor feature help you stay current with the AI landscape — not just find tools once and forget.',
    },
]

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <SEO
                title="About IntelliGrid — The AI Tools Discovery Platform"
                description="Learn about IntelliGrid's mission to help developers, founders, and creators discover the right AI tools faster. 4,000+ tools, honest reviews, updated daily."
                canonicalUrl="https://www.intelligrid.online/about"
                keywords="about IntelliGrid, AI tools directory, AI discovery platform, team"
            />

            {/* ── Hero ── */}
            <section className="relative overflow-hidden bg-gradient-to-b from-[#07071a] to-gray-950 pt-24 pb-20">
                {/* Background blobs */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-1/4 top-1/4 h-80 w-80 rounded-full bg-purple-600/10 blur-[100px]" />
                    <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-cyan-500/8 blur-[90px]" />
                </div>

                <div className="relative mx-auto max-w-4xl px-6 text-center">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-purple-400">
                        <Users className="h-3.5 w-3.5" />
                        About Us
                    </div>

                    <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
                        We built the AI tools{' '}
                        <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                            directory we wished existed
                        </span>
                    </h1>

                    <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-400">
                        IntelliGrid started from a simple frustration: finding the right AI tool for a job took hours
                        of searching across scattered blogs, Reddit threads, and outdated lists. We fixed that.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <Link
                            to="/tools"
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-105 hover:shadow-purple-500/30"
                        >
                            Browse AI Tools <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            to="/pricing"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-gray-300 transition-all hover:bg-white/10 hover:text-white"
                        >
                            View Pricing
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Stats ── */}
            <section className="border-y border-white/5 bg-white/[0.02] py-12">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                        {STATS.map(({ value, label }) => (
                            <div key={label} className="text-center">
                                <p className="text-3xl font-extrabold text-white md:text-4xl">{value}</p>
                                <p className="mt-1 text-sm text-gray-500">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Mission ── */}
            <section className="py-20">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="grid gap-12 md:grid-cols-2 md:items-center">
                        <div>
                            <div className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
                                <Target className="h-4 w-4" />
                                Our Mission
                            </div>
                            <h2 className="mb-6 text-3xl font-extrabold leading-tight text-white md:text-4xl">
                                Cut through the noise.<br />Find the right tool — fast.
                            </h2>
                            <p className="mb-4 text-gray-400 leading-relaxed">
                                The AI tools landscape is growing faster than any single person can track. New products launch
                                daily, pricing changes weekly, and half the "best AI tools" lists online are six months out of date.
                            </p>
                            <p className="mb-4 text-gray-400 leading-relaxed">
                                IntelliGrid's automated pipeline discovers, enriches, and validates thousands of AI tools continuously —
                                so the data you see is fresh, complete, and honest.
                            </p>
                            <p className="text-gray-400 leading-relaxed">
                                We earn affiliate commissions from some tool listings. We always disclose this. It never influences
                                which tools get indexed — every tool in our directory earned its place through quality, not payment.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { emoji: '🔍', label: 'Daily discovery crawls' },
                                { emoji: '✅', label: 'Verified pricing & links' },
                                { emoji: '⭐', label: 'Community reviews' },
                                { emoji: '📊', label: 'Enriched metadata' },
                                { emoji: '🌍', label: 'Global pricing (INR + USD)' },
                                { emoji: '🔔', label: 'Weekly AI digest' },
                            ].map(({ emoji, label }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4 text-sm text-gray-300"
                                >
                                    <span className="text-xl">{emoji}</span>
                                    <span>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Values ── */}
            <section className="border-t border-white/5 bg-[#080813] py-20">
                <div className="mx-auto max-w-5xl px-6">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-extrabold text-white md:text-4xl">What we believe in</h2>
                        <p className="mt-3 text-gray-500">The principles that guide every product decision we make.</p>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {VALUES.map(({ icon: Icon, title, description }) => (
                            <div
                                key={title}
                                className="rounded-2xl border border-white/8 bg-white/3 p-6 transition-all hover:border-purple-500/20 hover:bg-white/5"
                            >
                                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="mb-2 font-bold text-white">{title}</h3>
                                <p className="text-sm leading-relaxed text-gray-500">{description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Team ── */}
            <section className="py-20">
                <div className="mx-auto max-w-3xl px-6 text-center">
                    <h2 className="mb-4 text-3xl font-extrabold text-white md:text-4xl">Who we are</h2>
                    <p className="mb-12 text-gray-500">A small, focused team obsessed with making AI tool discovery effortless.</p>
                    {TEAM.map(({ name, role, bio, emoji }) => (
                        <div
                            key={name}
                            className="rounded-2xl border border-white/8 bg-white/3 p-8 text-left"
                        >
                            <div className="mb-6 flex items-center gap-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-2xl">
                                    {emoji}
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-white">{name}</p>
                                    <p className="text-sm text-purple-400">{role}</p>
                                </div>
                            </div>
                            <p className="leading-relaxed text-gray-400">{bio}</p>
                        </div>
                    ))}
                    <p className="mt-8 text-sm text-gray-600">
                        Want to join us or partner with IntelliGrid?{' '}
                        <a
                            href="mailto:support@intelligrid.online"
                            className="text-purple-400 hover:text-purple-300 transition-colors"
                        >
                            Drop us an email →
                        </a>
                    </p>
                </div>
            </section>

            {/* ── Transparency note ── */}
            <section className="border-t border-white/5 bg-[#080813] py-14">
                <div className="mx-auto max-w-3xl px-6">
                    <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-8">
                        <div className="mb-4 flex items-center gap-3">
                            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                            <h3 className="font-bold text-white">Affiliate Transparency</h3>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-400">
                            IntelliGrid participates in affiliate programs with some AI tool vendors. When you click a link and
                            make a purchase, we may earn a commission at no extra cost to you. Affiliate relationships are
                            clearly labeled on tool pages. They do not influence our editorial decisions, tool rankings, or
                            review moderation. Tools are indexed on merit — not because a company paid us to list them.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="py-20">
                <div className="mx-auto max-w-3xl px-6 text-center">
                    <h2 className="mb-4 text-3xl font-extrabold text-white md:text-4xl">
                        Ready to find your next AI tool?
                    </h2>
                    <p className="mb-8 text-gray-500">
                        4,000+ tools across 50+ categories. Search, filter, and compare — all for free.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link
                            to="/tools"
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-105"
                        >
                            Browse Tools <ArrowRight className="h-4 w-4" />
                        </Link>
                        <Link
                            to="/blog"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 text-sm font-semibold text-gray-300 transition-all hover:bg-white/10 hover:text-white"
                        >
                            Read Our Blog
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    )
}
