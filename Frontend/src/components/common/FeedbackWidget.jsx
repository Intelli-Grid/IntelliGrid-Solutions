/**
 * FeedbackWidget.jsx
 * Floating feedback button (bottom-right corner).
 * Lets signed-in users submit suggestions, bug reports, or praise.
 * Posts to POST /api/v1/feedback — backend route in feedbackRoutes.js
 */
import { useState, useRef, useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquarePlus, X, Send, Loader2, CheckCircle2, Bug, Lightbulb, Heart } from 'lucide-react'
import toast from 'react-hot-toast'
import apiClient from '../../services/api'

const TYPES = [
    { id: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { id: 'bug', label: 'Bug', icon: Bug, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    { id: 'praise', label: 'Praise', icon: Heart, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
]

export default function FeedbackWidget() {
    const { isSignedIn } = useUser()
    const [open, setOpen] = useState(false)
    const [type, setType] = useState('suggestion')
    const [message, setMessage] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)
    const textareaRef = useRef(null)

    // Focus textarea when panel opens
    useEffect(() => {
        if (open && textareaRef.current) {
            setTimeout(() => textareaRef.current?.focus(), 120)
        }
    }, [open])

    // Reset state when panel closes
    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setMessage('')
                setType('suggestion')
                setDone(false)
            }, 250)
        }
    }, [open])

    // ESC key to close
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!message.trim() || message.trim().length < 8) {
            toast.error('Please enter a bit more detail (8+ chars).')
            return
        }
        setSubmitting(true)
        try {
            await apiClient.post('/feedback', {
                type,
                message: message.trim(),
                page: window.location.pathname,
            })
            setDone(true)
            toast.success('Thank you for the feedback! 🙌')
            setTimeout(() => setOpen(false), 1800)
        } catch {
            toast.error('Could not submit feedback. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    // Only show for signed-in users
    if (!isSignedIn) return null

    return (
        <>
            {/* Floating trigger button */}
            <motion.button
                id="feedback-widget-btn"
                onClick={() => setOpen(o => !o)}
                aria-label="Send feedback"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a1a2e] border border-white/10 shadow-xl shadow-black/40 text-gray-400 hover:text-purple-400 hover:border-purple-500/30 transition-colors"
            >
                {open
                    ? <X size={18} />
                    : <MessageSquarePlus size={18} />
                }
            </motion.button>

            {/* Feedback panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        key="feedback-panel"
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="fixed bottom-20 right-6 z-40 w-80 rounded-2xl border border-white/10 bg-[#111118] shadow-2xl shadow-black/60 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
                            <h3 className="text-sm font-semibold text-white">Share Feedback</h3>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-gray-600 hover:text-gray-400 transition-colors"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="p-4">
                            {done ? (
                                /* Success state */
                                <div className="flex flex-col items-center justify-center py-6 text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                                    >
                                        <CheckCircle2 size={36} className="text-emerald-400 mb-3" />
                                    </motion.div>
                                    <p className="text-white font-semibold text-sm mb-1">Feedback received!</p>
                                    <p className="text-gray-500 text-xs">We read every single one. Thank you.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-3">
                                    {/* Type selector */}
                                    <div className="flex gap-2">
                                        {TYPES.map(t => {
                                            const Icon = t.icon
                                            const active = type === t.id
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setType(t.id)}
                                                    className={`flex-1 flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all ${active ? t.color : 'border-white/8 bg-white/3 text-gray-500 hover:text-gray-300'}`}
                                                >
                                                    <Icon size={11} />
                                                    {t.label}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Message */}
                                    <textarea
                                        ref={textareaRef}
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        placeholder={
                                            type === 'bug' ? "Describe what happened and how to reproduce it..." :
                                                type === 'suggestion' ? "What would make IntelliGrid better for you?" :
                                                    "What do you love about IntelliGrid?"
                                        }
                                        maxLength={1000}
                                        rows={4}
                                        className="w-full resize-none rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:border-purple-500/40 focus:outline-none focus:ring-1 focus:ring-purple-500/20 transition-all"
                                    />

                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-gray-700">
                                            {message.length}/1000
                                        </span>
                                        <button
                                            type="submit"
                                            disabled={submitting || message.trim().length < 8}
                                            className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-xs font-semibold text-white transition-colors"
                                        >
                                            {submitting
                                                ? <><Loader2 size={12} className="animate-spin" /> Sending...</>
                                                : <><Send size={12} /> Send</>
                                            }
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
