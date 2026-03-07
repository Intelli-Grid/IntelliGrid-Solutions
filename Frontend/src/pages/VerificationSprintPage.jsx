/**
 * VerificationSprintPage.jsx
 * Route: /admin/verify-sprint
 *
 * Keyboard-first tool verification UI.
 * Keys: → or Space = approve, ← or Backspace = skip, D = discard/reject
 * Goal: 200 verifications/hour.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '@clerk/clerk-react'
import { Link, useNavigate } from 'react-router-dom'
import SEO from '../components/common/SEO'
import { adminService } from '../services'
import {
    Check, X, ArrowLeft, ArrowRight, Keyboard, ExternalLink,
    Zap, CheckCircle2, SkipForward, AlertTriangle, ChevronLeft
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const ADMIN_ROLES = ['admin', 'ADMIN', 'MODERATOR', 'TRUSTED_OPERATOR', 'SUPERADMIN']
const BATCH_SIZE = 30

export default function VerificationSprintPage() {
    const { user } = useUser()
    const navigate = useNavigate()
    const [tools, setTools] = useState([])
    const [index, setIndex] = useState(0)
    const [loading, setLoading] = useState(true)
    const [session, setSession] = useState({ approved: 0, skipped: 0, rejected: 0, total: 0 })
    const [done, setDone] = useState(false)
    const [showKeys, setShowKeys] = useState(true)
    const containerRef = useRef(null)

    const isAdmin = ADMIN_ROLES.includes(user?.publicMetadata?.role)

    // Load tools needing verification — unverified active tools
    useEffect(() => {
        if (!isAdmin) return
        const load = async () => {
            setLoading(true)
            try {
                const data = await adminService.getTools({
                    page: 1,
                    limit: BATCH_SIZE,
                    status: 'active',
                    verified: 'false',
                })
                const items = data?.tools || data?.data?.tools || []
                setTools(items)
                setSession(s => ({ ...s, total: items.length }))
            } catch (err) {
                toast.error('Failed to load tools')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [isAdmin])

    const current = tools[index] || null

    const advance = useCallback(() => {
        if (index + 1 >= tools.length) {
            setDone(true)
        } else {
            setIndex(i => i + 1)
        }
    }, [index, tools.length])

    const handleApprove = useCallback(async () => {
        if (!current) return
        try {
            await adminService.approveTool(current._id)
            setSession(s => ({ ...s, approved: s.approved + 1 }))
            toast.success(`✅ ${current.name} approved`, { duration: 1000 })
            advance()
        } catch {
            toast.error('Failed to approve tool')
        }
    }, [current, advance])

    const handleSkip = useCallback(() => {
        if (!current) return
        setSession(s => ({ ...s, skipped: s.skipped + 1 }))
        advance()
    }, [current, advance])

    const handleReject = useCallback(async () => {
        if (!current) return
        try {
            await adminService.deleteTool(current._id)
            setSession(s => ({ ...s, rejected: s.rejected + 1 }))
            toast(`🗑️ ${current.name} removed`, { duration: 1000 })
            advance()
        } catch {
            toast.error('Failed to reject tool')
        }
    }, [current, advance])

    // Keyboard handler
    useEffect(() => {
        const handleKey = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); handleApprove() }
            if (e.key === 'ArrowLeft' || e.key === 'Backspace') { e.preventDefault(); handleSkip() }
            if (e.key === 'd' || e.key === 'D') { e.preventDefault(); handleReject() }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [handleApprove, handleSkip, handleReject])

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-white text-lg font-semibold">Access Denied</p>
                    <Link to="/admin" className="text-purple-400 text-sm mt-2 block">← Back to Admin</Link>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <Zap className="h-10 w-10 text-purple-400 mx-auto mb-3 animate-pulse" />
                    <p className="text-gray-400">Loading verification sprint...</p>
                </div>
            </div>
        )
    }

    if (done || tools.length === 0) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
                <SEO title="Verification Sprint — IntelliGrid Admin" noindex />
                <div className="text-center max-w-md">
                    <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-white mb-2">Sprint Complete!</h1>
                    <p className="text-gray-400 mb-6">
                        {session.total === 0
                            ? 'No tools pending verification right now.'
                            : `You processed ${session.total} tools this session.`}
                    </p>
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                            <div className="text-2xl font-bold text-emerald-400">{session.approved}</div>
                            <div className="text-xs text-gray-500 mt-1">Approved</div>
                        </div>
                        <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-4">
                            <div className="text-2xl font-bold text-gray-400">{session.skipped}</div>
                            <div className="text-xs text-gray-500 mt-1">Skipped</div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                            <div className="text-2xl font-bold text-red-400">{session.rejected}</div>
                            <div className="text-xs text-gray-500 mt-1">Rejected</div>
                        </div>
                    </div>
                    <Link
                        to="/admin"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-colors text-sm"
                    >
                        <ChevronLeft className="h-4 w-4" /> Back to Admin
                    </Link>
                </div>
            </div>
        )
    }

    const progress = Math.round((index / tools.length) * 100)
    const tool = current

    return (
        <div ref={containerRef} className="min-h-screen bg-[#080810] flex flex-col" tabIndex={-1}>
            <SEO title="Verification Sprint — IntelliGrid Admin" noindex />

            {/* Top bar */}
            <div className="border-b border-white/8 bg-[#0c0c18] px-4 py-3 flex items-center justify-between">
                <Link to="/admin" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                    <ChevronLeft className="h-4 w-4" /> Admin
                </Link>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{index + 1} / {tools.length}</span>
                    <div className="w-32 h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                    <span className="text-emerald-400">{session.approved} ✅</span>
                    <span className="text-gray-500">{session.skipped} skip</span>
                    <span className="text-red-400">{session.rejected} 🗑️</span>
                </div>
            </div>

            {/* Keyboard hint */}
            {showKeys && (
                <div className="bg-purple-500/5 border-b border-purple-500/15 px-4 py-2 flex items-center justify-center gap-6 text-xs text-gray-500">
                    <Keyboard className="h-3.5 w-3.5 text-purple-500" />
                    <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">→</kbd> / <kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">Space</kbd> Approve</span>
                    <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">←</kbd> Skip</span>
                    <span><kbd className="bg-white/10 px-1.5 py-0.5 rounded font-mono">D</kbd> Delete</span>
                    <button onClick={() => setShowKeys(false)} className="text-gray-700 hover:text-gray-500 ml-2">✕</button>
                </div>
            )}

            {/* Main card */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-2xl">
                    <div className="rounded-2xl border border-white/10 bg-[#0e0e1a] overflow-hidden">

                        {/* Tool header */}
                        <div className="p-6 border-b border-white/8 flex items-start gap-4">
                            <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                                {tool.logo ? (
                                    <img
                                        src={tool.logo}
                                        alt={tool.name}
                                        className="w-full h-full object-contain p-1"
                                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                                    />
                                ) : (
                                    <span className="text-2xl font-black text-white/20">{tool.name?.charAt(0)}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h1 className="text-xl font-bold text-white">{tool.name}</h1>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {tool.pricing && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                    {tool.pricing}
                                                </span>
                                            )}
                                            {tool.category?.name && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                    {tool.category.name}
                                                </span>
                                            )}
                                            {tool.views > 0 && (
                                                <span className="text-xs text-gray-600">{tool.views.toLocaleString()} views</span>
                                            )}
                                        </div>
                                    </div>
                                    {tool.officialUrl && (
                                        <a
                                            href={tool.officialUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-500 hover:text-purple-400 transition-colors"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Visit site
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="p-6">
                            <p className="text-gray-300 text-sm leading-relaxed">
                                {tool.shortDescription || tool.fullDescription?.slice(0, 300) || 'No description available.'}
                            </p>
                            {tool.fullDescription && tool.fullDescription.length > 300 && (
                                <p className="text-gray-600 text-xs mt-2 line-clamp-3">
                                    {tool.fullDescription.slice(300, 600)}...
                                </p>
                            )}
                            {tool.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-4">
                                    {tool.tags.slice(0, 6).map(tag => (
                                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500 border border-white/8">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Screenshot preview if exists */}
                        {tool.screenshotUrl && (
                            <div className="px-6 pb-4">
                                <img
                                    src={tool.screenshotUrl}
                                    alt={`${tool.name} screenshot`}
                                    className="w-full h-40 object-cover rounded-xl border border-white/8 opacity-80"
                                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="border-t border-white/8 p-4 flex gap-3">
                            <button
                                onClick={handleReject}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/20 bg-red-500/8 text-red-400 hover:bg-red-500/15 transition-all text-sm font-semibold"
                            >
                                <X className="h-4 w-4" /> Delete (D)
                            </button>
                            <button
                                onClick={handleSkip}
                                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-sm font-semibold"
                            >
                                <SkipForward className="h-4 w-4" /> Skip (←)
                            </button>
                            <button
                                onClick={handleApprove}
                                className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all text-sm font-bold"
                            >
                                <Check className="h-4 w-4" /> Approve (→)
                            </button>
                        </div>
                    </div>

                    {/* Next tool preview */}
                    {tools[index + 1] && (
                        <div className="mt-3 px-4 py-3 rounded-xl border border-white/5 bg-white/2 flex items-center gap-3 opacity-50">
                            <span className="text-xs text-gray-600">Next:</span>
                            <span className="text-xs text-gray-400 font-medium truncate">{tools[index + 1].name}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
