/**
 * OnboardingDrawer.jsx
 * A sticky bottom 3-step first-run guide for new users.
 * Persists dismissed state in localStorage — never shown again after dismissed.
 * Shows only to authenticated users who haven't seen it yet.
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, ChevronRight, Search, Heart, Zap, CheckCircle2, Sparkles
} from 'lucide-react'

const LS_KEY = 'ig_onboarding_dismissed_v1'

const STEPS = [
    {
        id: 'explore',
        icon: Search,
        iconColor: 'text-violet-400 bg-violet-500/10',
        title: 'Discover 3,000+ AI Tools',
        description: 'Browse by category, use-case or industry. Use our AI Stack Advisor to find the perfect combo.',
        cta: 'Browse Tools',
        href: '/tools',
    },
    {
        id: 'save',
        icon: Heart,
        iconColor: 'text-rose-400 bg-rose-500/10',
        title: 'Save Your Favourites',
        description: 'Favourite any tool to save it. Organise tools into Collections to build your personal AI stack.',
        cta: 'My Dashboard',
        href: '/dashboard',
    },
    {
        id: 'submit',
        icon: Zap,
        iconColor: 'text-amber-400 bg-amber-500/10',
        title: 'Share a Tool You Love',
        description: 'Know an AI tool that\'s not listed? Submit it in 60 seconds and help the community.',
        cta: 'Submit a Tool',
        href: '/submit',
    },
]

export default function OnboardingDrawer() {
    const { isSignedIn, isLoaded } = useUser()
    const [step, setStep] = useState(0)
    const [visible, setVisible] = useState(false)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        if (!isLoaded) return
        // Only show to signed-in users who haven't dismissed yet
        if (!isSignedIn) return
        const already = localStorage.getItem(LS_KEY)
        if (already) { setDismissed(true); return }

        // Small delay so drawer doesn't flash on page mount
        const timeout = setTimeout(() => setVisible(true), 1200)
        return () => clearTimeout(timeout)
    }, [isLoaded, isSignedIn])

    const handleDismiss = () => {
        localStorage.setItem(LS_KEY, '1')
        setDismissed(true)
        setVisible(false)
    }

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(s => s + 1)
        } else {
            handleDismiss()
        }
    }

    if (!isLoaded || !isSignedIn || dismissed) return null

    const current = STEPS[step]
    const Icon = current.icon
    const isLast = step === STEPS.length - 1

    return (
        <AnimatePresence>
            {visible && (
                <>
                    {/* Backdrop (light) */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
                        onClick={handleDismiss}
                    />

                    {/* Drawer */}
                    <motion.div
                        key="drawer"
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                        className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg px-4 pb-4 sm:pb-6"
                    >
                        <div className="rounded-2xl border border-white/12 bg-[#111118] shadow-2xl overflow-hidden">

                            {/* Progress dots */}
                            <div className="flex justify-center gap-1.5 pt-4">
                                {STEPS.map((s, i) => (
                                    <button
                                        key={s.id}
                                        onClick={() => setStep(i)}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === step
                                            ? 'w-6 bg-purple-500'
                                            : 'w-1.5 bg-white/15'
                                            }`}
                                    />
                                ))}
                            </div>

                            <div className="px-6 pt-4 pb-6">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-400 uppercase tracking-widest">
                                        <Sparkles size={11} />
                                        Getting Started · {step + 1} of {STEPS.length}
                                    </div>
                                    <button
                                        onClick={handleDismiss}
                                        className="rounded-lg p-1 text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors"
                                        aria-label="Dismiss onboarding"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Content */}
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={step}
                                        initial={{ x: 24, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -24, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${current.iconColor}`}>
                                            <Icon size={22} />
                                        </div>
                                        <h2 className="text-xl font-bold text-white mb-2">
                                            {current.title}
                                        </h2>
                                        <p className="text-sm text-gray-400 leading-relaxed mb-5">
                                            {current.description}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>

                                {/* Actions */}
                                <div className="flex items-center gap-3">
                                    <Link
                                        to={current.href}
                                        onClick={handleDismiss}
                                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                                    >
                                        {current.cta}
                                        <ChevronRight size={15} />
                                    </Link>
                                    <button
                                        onClick={handleNext}
                                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/8 hover:text-white transition-colors ${isLast ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/8 hover:bg-emerald-500/12' : ''}`}
                                    >
                                        {isLast
                                            ? <><CheckCircle2 size={14} /> Got it!</>
                                            : <>Next <ChevronRight size={14} /></>
                                        }
                                    </button>
                                </div>

                                {/* Skip */}
                                <button
                                    onClick={handleDismiss}
                                    className="mt-3 w-full text-center text-xs text-gray-700 hover:text-gray-500 transition-colors"
                                >
                                    Skip onboarding
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
