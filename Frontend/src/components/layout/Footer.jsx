import { Link } from 'react-router-dom'
import { Twitter, Linkedin, Github, Mail, Sparkles, ArrowUpRight } from 'lucide-react'
import NewsletterForm from '../common/NewsletterForm'

export default function Footer() {
    const currentYear = new Date().getFullYear()

    const footerLinks = {
        Discover: [
            { label: 'Browse All Tools', to: '/tools' },
            { label: 'Search', to: '/search' },
            { label: 'AI Stack Advisor', to: '/ai-stack-advisor', badge: 'AI' },
            { label: 'Categories', to: '/tools' },
            { label: 'Newsletter', to: '/newsletter', badge: 'New' },
        ],
        Popular: [
            { label: 'Writing AI', to: '/category/writing-and-content' },
            { label: 'Image Generators', to: '/category/image-generation' },
            { label: 'Video AI', to: '/category/video-generation' },
            { label: 'Coding Tools', to: '/category/developer-tools' },
            { label: 'ChatBots', to: '/category/chatbots' },
        ],
        'Best Tools For': [
            { label: 'Developers', to: '/best-tools/developers' },
            { label: 'Marketers', to: '/best-tools/marketers' },
            { label: 'Founders', to: '/best-tools/founders' },
            { label: 'Content Creators', to: '/best-tools/content-creators' },
            { label: 'Designers', to: '/best-tools/designers' },
        ],
        Company: [
            { label: 'Blog & Guides', to: '/blog' },
            { label: 'Pricing', to: '/pricing' },
            { label: 'Submit a Tool', to: '/submit' },
            { label: 'Help Center', to: '/faq' },
            { label: 'Contact', href: 'mailto:support@intelligrid.online' },
        ],
        Legal: [
            { label: 'Privacy Policy', to: '/privacy-policy' },
            { label: 'Terms of Service', to: '/terms-of-service' },
            { label: 'Refund Policy', to: '/refund-policy' },
            { label: 'FAQ', to: '/faq' },
        ],
    }

    return (
        <footer className="relative border-t border-white/8 bg-[#07071a] overflow-hidden">
            {/* Subtle background gradient */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-0 left-1/4 w-96 h-64 bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-80 h-56 bg-blue-900/8 rounded-full blur-[100px]" />
            </div>

            <div className="relative container mx-auto px-6 pt-16 pb-10">
                {/* Newsletter strip */}
                <div className="mb-14 rounded-2xl bg-gradient-to-r from-purple-900/30 via-violet-900/20 to-blue-900/20 border border-purple-500/15 p-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-purple-400" />
                                <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">Weekly Newsletter</span>
                            </div>
                            <h3 className="text-white font-bold text-xl mb-1">Stay ahead of the AI curve</h3>
                            <p className="text-sm text-gray-400">The best new AI tools, curated every week. Free, forever.</p>
                        </div>
                        <div className="md:min-w-[320px]">
                            <NewsletterForm source="footer" />
                        </div>
                    </div>
                </div>

                {/* Links grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-10 mb-14">
                    {/* Brand column */}
                    <div className="col-span-2 sm:col-span-3 lg:col-span-1 space-y-5">
                        <Link to="/" className="flex items-center gap-2 group">
                            <img src="/logo.png" alt="IntelliGrid" className="h-8 w-8 rounded-lg object-cover shadow-lg group-hover:scale-105 transition-transform" />
                            <span className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">IntelliGrid</span>
                        </Link>
                        <p className="text-sm text-gray-500 leading-relaxed">
                            The world's most comprehensive AI tools directory. Discover, compare, and choose the best AI for every task.
                        </p>
                        <div className="flex gap-4">
                            {[
                                { href: 'https://twitter.com/IntelliGridHQ', icon: <Twitter className="h-4 w-4" />, label: 'Twitter' },
                                { href: 'https://linkedin.com/company/intelligrid', icon: <Linkedin className="h-4 w-4" />, label: 'LinkedIn' },
                                { href: 'https://github.com/intelligrid', icon: <Github className="h-4 w-4" />, label: 'GitHub' },
                                { href: 'mailto:support@intelligrid.online', icon: <Mail className="h-4 w-4" />, label: 'Email' },
                            ].map(s => (
                                <a
                                    key={s.label}
                                    href={s.href}
                                    target={s.href.startsWith('http') ? '_blank' : undefined}
                                    rel="noopener noreferrer"
                                    aria-label={s.label}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white transition-all duration-200"
                                >
                                    {s.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    {Object.entries(footerLinks).map(([heading, links]) => (
                        <div key={heading}>
                            <h3 className="mb-4 text-xs font-bold text-white uppercase tracking-widest">{heading}</h3>
                            <ul className="space-y-2.5">
                                {links.map(link => (
                                    <li key={link.label}>
                                        {link.href ? (
                                            <a
                                                href={link.href}
                                                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors group"
                                            >
                                                {link.label}
                                                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </a>
                                        ) : (
                                            <Link
                                                to={link.to}
                                                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors"
                                            >
                                                {link.label}
                                                {link.badge && (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${link.badge === 'AI'
                                                            ? 'bg-violet-500/20 text-violet-400'
                                                            : 'bg-emerald-500/20 text-emerald-400'
                                                        }`}>
                                                        {link.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="border-t border-white/6 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-gray-600">
                        © {currentYear} IntelliGrid. All rights reserved. Built for the AI community.
                    </p>
                    <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            All systems operational
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
