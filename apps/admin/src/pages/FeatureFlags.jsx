import { useState, useEffect } from 'react'
import {
    ToggleLeft, ToggleRight, RefreshCw, Loader2, AlertTriangle,
    CheckCircle2, XCircle, Zap, ChevronDown, ChevronUp, Search, Sprout
} from 'lucide-react'
import { adminService } from '../services'
import { toast } from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const FLAG_DESCRIPTIONS = {
    REVERSE_TRIAL: '14-day Pro trial on first signup',
    NEW_PRICING_TIERS: '3-tier pricing page with annual toggle',
    AI_STACK_ADVISOR: 'Groq AI tool recommendations (hallucination guard active)',
    CONTEXTUAL_NUDGES: 'Upgrade nudge panels triggered by user actions',
    VENDOR_LISTINGS: 'B2B vendor featured listing programme',
    NEWSLETTER_SIGNUP: 'Newsletter opt-in forms and Brevo delivery',
    ONBOARDING_EMAILS: '14-day email onboarding sequence post-signup',
    AFFILIATE_TRACKING: 'Affiliate click tracking + redirect layer',
    FEATURED_LISTINGS: 'Sponsored tool placements on homepage (paid B2B slots)',
    PROGRAMMATIC_SEO: 'Groq-expanded tool pages with FAQ + use case content',
    ANNUAL_PRICING_V2: 'Annual pricing with "4 months free" framing',
    CANCELLATION_RESCUE: 'Exit-intent interstitial on subscription cancel',
}

const FeatureFlags = () => {
    const [flags, setFlags] = useState([])
    const [loading, setLoading] = useState(true)
    const [toggling, setToggling] = useState(null)
    const [search, setSearch] = useState('')
    const [seeding, setSeeding] = useState(false)

    useEffect(() => {
        fetchFlags()
    }, [])

    const fetchFlags = async () => {
        setLoading(true)
        try {
            const data = await adminService.getFeatureFlags()
            if (data.success) setFlags(data.flags)
        } catch (err) {
            console.error(err)
            toast.error('Failed to load feature flags')
        } finally {
            setLoading(false)
        }
    }

    const handleToggle = async (flag) => {
        setToggling(flag.key)
        const newEnabled = !flag.enabled
        const t = toast.loading(`${newEnabled ? 'Enabling' : 'Disabling'} ${flag.key}...`)
        try {
            const res = await adminService.updateFeatureFlag(flag.key, { enabled: newEnabled })
            if (res.success) {
                setFlags(prev => prev.map(f => f.key === flag.key ? { ...f, enabled: newEnabled } : f))
                toast.success(`${flag.key} is now ${newEnabled ? 'ENABLED' : 'DISABLED'}`, { id: t })
            }
        } catch (err) {
            toast.error(`Failed to update ${flag.key}`, { id: t })
        } finally {
            setToggling(null)
        }
    }

    const handleSeed = async () => {
        if (!window.confirm('This will insert any missing standard flags. Existing flags will not be overwritten. Continue?')) return
        setSeeding(true)
        const t = toast.loading('Seeding feature flags...')
        try {
            const res = await adminService.seedFeatureFlags()
            toast.success(res.message || 'Flags seeded', { id: t })
            fetchFlags()
        } catch (err) {
            toast.error('Seed failed', { id: t })
        } finally {
            setSeeding(false)
        }
    }

    const filtered = flags.filter(f =>
        !search || f.key.toLowerCase().includes(search.toLowerCase()) ||
        f.description?.toLowerCase().includes(search.toLowerCase())
    )

    const enabled = filtered.filter(f => f.enabled)
    const disabled = filtered.filter(f => !f.enabled)

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 mb-1">Feature Flags</h1>
                    <p className="text-slate-400 text-sm">Toggle platform features in real-time without code deployments.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            type="text"
                            placeholder="Search flags..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-[#1a1d27] border border-[#2a2d3a] rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 w-48 transition-colors"
                        />
                    </div>
                    <button onClick={handleSeed} disabled={seeding}
                        className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg hover:border-[#3a3d4a] transition-all disabled:opacity-50">
                        {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sprout size={14} />}
                        Seed Defaults
                    </button>
                    <button onClick={fetchFlags} className="p-2 text-slate-400 hover:text-slate-200 bg-[#1a1d27] border border-[#2a2d3a] rounded-lg hover:border-[#3a3d4a] transition-all">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-slate-100">{flags.length}</div>
                    <div className="text-xs text-slate-500 mt-1">Total Flags</div>
                </div>
                <div className="bg-[#1a1d27] border border-emerald-500/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-400">{flags.filter(f => f.enabled).length}</div>
                    <div className="text-xs text-slate-500 mt-1">Enabled</div>
                </div>
                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-slate-400">{flags.filter(f => !f.enabled).length}</div>
                    <div className="text-xs text-slate-500 mt-1">Disabled</div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-[#1a1d27] border border-dashed border-slate-700 rounded-xl p-12 text-center">
                    <p className="text-slate-500">No flags found. Click "Seed Defaults" to initialize standard feature flags.</p>
                </div>
            ) : (
                <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#2a2d3a] bg-[#222530]">
                                <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Flag Key</th>
                                <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Description</th>
                                <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold">Last Updated</th>
                                <th className="py-3 px-6 text-xs text-slate-400 uppercase tracking-wider font-semibold text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2a2d3a]">
                            {filtered.map(flag => (
                                <tr key={flag.key} className="group hover:bg-[#222530] transition-colors">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-2">
                                            {flag.enabled
                                                ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                                                : <XCircle size={14} className="text-slate-600 shrink-0" />}
                                            <span className={`font-mono text-sm font-semibold ${flag.enabled ? 'text-slate-100' : 'text-slate-500'}`}>
                                                {flag.key}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm text-slate-400">
                                            {FLAG_DESCRIPTIONS[flag.key] || flag.description || '—'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-xs text-slate-500">
                                            {flag.updatedAt ? formatDistanceToNow(new Date(flag.updatedAt), { addSuffix: true }) : '—'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <button
                                            onClick={() => handleToggle(flag)}
                                            disabled={toggling === flag.key}
                                            title={flag.enabled ? 'Click to disable' : 'Click to enable'}
                                            className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border disabled:opacity-50 ${flag.enabled
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                                : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700 hover:text-slate-300'
                                                }`}
                                        >
                                            {toggling === flag.key ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : flag.enabled ? (
                                                <ToggleRight size={16} />
                                            ) : (
                                                <ToggleLeft size={16} />
                                            )}
                                            {flag.enabled ? 'ENABLED' : 'DISABLED'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Warning notice */}
            <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-300/80 leading-relaxed">
                    <strong>Production Warning:</strong> Feature flags take effect immediately for all users. Enabling experimental features may impact revenue or user experience. Test in staging before enabling on live traffic.
                </div>
            </div>
        </div>
    )
}

export default FeatureFlags
