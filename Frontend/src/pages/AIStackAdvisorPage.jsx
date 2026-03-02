import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import {
    Sparkles, Code2, Paintbrush, TrendingUp, PenLine, FlaskConical,
    ShoppingCart, Settings, GraduationCap, Database, Rocket,
    ChevronRight, ChevronLeft, Loader2, Star, ExternalLink,
    Trash2, History, Zap, CheckCircle2, AlertCircle, X, Clock,
} from 'lucide-react'
import { stackAdvisorService } from '../services'
import SEO from '../components/common/SEO'
import { useNudge } from '../components/common/NudgeContext'

// ─── Data ──────────────────────────────────────────────────────────────────────
const ROLES = [
    { id: 'developer', label: 'Developer', icon: Code2, desc: 'Build, test, ship code faster' },
    { id: 'designer', label: 'Designer', icon: Paintbrush, desc: 'Create stunning visuals and UX' },
    { id: 'marketer', label: 'Marketer', icon: TrendingUp, desc: 'Grow reach, leads, and revenue' },
    { id: 'writer', label: 'Writer', icon: PenLine, desc: 'Create content at scale' },
    { id: 'researcher', label: 'Researcher', icon: FlaskConical, desc: 'Synthesise knowledge faster' },
    { id: 'sales', label: 'Sales', icon: ShoppingCart, desc: 'Close deals and drive pipeline' },
    { id: 'operations', label: 'Operations', icon: Settings, desc: 'Automate and streamline workflows' },
    { id: 'educator', label: 'Educator', icon: GraduationCap, desc: 'Teach and engage learners' },
    { id: 'data_scientist', label: 'Data Scientist', icon: Database, desc: 'Analyse, model, and visualise data' },
    { id: 'entrepreneur', label: 'Entrepreneur', icon: Rocket, desc: 'Build and grow a business' },
]

const USE_CASE_SUGGESTIONS = {
    developer: ['Code review automation', 'Documentation generation', 'Unit test writing', 'Bug detection', 'CI/CD optimisation'],
    designer: ['Image generation', 'UI mockup creation', 'Brand asset generation', 'Video editing', 'Colour palette generation'],
    marketer: ['SEO content writing', 'Social media scheduling', 'Ad copy generation', 'Email campaign creation', 'Analytics reporting'],
    writer: ['Blog post writing', 'Research summarisation', 'Content repurposing', 'Proofreading', 'Outline generation'],
    researcher: ['Literature review', 'Data extraction', 'Source summarisation', 'Citation management', 'Trend analysis'],
    sales: ['Lead qualification', 'Email outreach', 'CRM automation', 'Proposal writing', 'Call transcription'],
    operations: ['Workflow automation', 'Meeting scheduling', 'Document processing', 'HR onboarding', 'Reporting'],
    educator: ['Quiz generation', 'Lesson planning', 'Student feedback', 'Course creation', 'Assessment grading'],
    data_scientist: ['Data cleaning', 'Model training', 'Visualisation', 'Report generation', 'Feature engineering'],
    entrepreneur: ['Business plan generation', 'Market research', 'Investor deck creation', 'Customer support', 'Financial modelling'],
}

const BUDGET_OPTIONS = [
    { id: 'free', label: 'Free only', desc: 'Free and freemium tools only' },
    { id: 'any', label: 'Free + Paid', desc: 'Best tools regardless of price' },
    { id: 'paid', label: 'Paid tools', desc: 'Premium tools with more features' },
]

const PRIORITY_STYLES = {
    'must-have': { bg: 'bg-accent-emerald/15 border-accent-emerald/30', text: 'text-accent-emerald', label: 'Must-Have' },
    'nice-to-have': { bg: 'bg-accent-cyan/10 border-accent-cyan/25', text: 'text-accent-cyan', label: 'Nice to Have' },
    'consider-later': { bg: 'bg-white/8 border-white/15', text: 'text-gray-400', label: 'Consider Later' },
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepDots({ current, total }) {
    return (
        <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-300 ${i === current
                        ? 'w-8 bg-accent-cyan'
                        : i < current
                            ? 'w-2 bg-accent-purple'
                            : 'w-2 bg-white/20'
                        }`}
                />
            ))}
        </div>
    )
}

// ─── Result Card ──────────────────────────────────────────────────────────────
function ToolRecommendationCard({ rec, index }) {
    const style = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES['consider-later']
    return (
        <div className={`flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${style.bg} group`}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    {rec.logo ? (
                        <img src={rec.logo} alt={rec.name} className="w-10 h-10 rounded-xl object-cover bg-white/10" onError={(e) => { e.target.style.display = 'none' }} />
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-gray-400" />
                        </div>
                    )}
                    <div>
                        <div className="font-bold text-white">{rec.name}</div>
                        <div className="text-xs text-gray-500">{rec.category}</div>
                    </div>
                </div>
                <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${style.bg} ${style.text}`}>
                    {style.label}
                </span>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed mb-4 flex-1">{rec.reason}</p>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                <div className="flex items-center gap-3">
                    {rec.rating && (
                        <span className="flex items-center gap-1 text-xs text-yellow-400">
                            <Star className="w-3 h-3 fill-current" />
                            {Number(rec.rating).toFixed(1)}
                        </span>
                    )}
                    {rec.pricing?.model && (
                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                            {rec.pricing.model}
                        </span>
                    )}
                    {rec.pricingNote && !rec.pricing?.model && (
                        <span className="text-xs text-gray-500">{rec.pricingNote}</span>
                    )}
                </div>
                {rec.slug && (
                    <Link
                        to={`/tools/${rec.slug}`}
                        className="flex items-center gap-1 text-xs font-semibold text-accent-cyan hover:text-white transition-colors group-hover:gap-2"
                    >
                        View <ExternalLink className="w-3 h-3" />
                    </Link>
                )}
            </div>

            {rec.replaces && (
                <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-amber-400">
                        ↳ Consider replacing <strong>{rec.replaces}</strong>
                    </p>
                </div>
            )}
        </div>
    )
}

// ─── History Card ─────────────────────────────────────────────────────────────
function HistoryCard({ item, onDelete, onRestore }) {
    const role = ROLES.find(r => r.id === item.input?.role)
    return (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-all">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    {role ? <role.icon className="w-4 h-4 text-accent-cyan" /> : <Sparkles className="w-4 h-4 text-accent-cyan" />}
                </div>
                <div className="min-w-0">
                    <div className="font-semibold text-white text-sm truncate">{role?.label || item.input?.role} Stack</div>
                    <div className="text-xs text-gray-500 truncate">
                        {item.recommendations?.length} tools · {item.input?.useCases?.slice(0, 2).join(', ') || 'General'}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-600 hidden sm:block">
                    {new Date(item.createdAt).toLocaleDateString()}
                </span>
                <button
                    onClick={() => onRestore(item)}
                    className="text-xs text-accent-cyan hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15"
                >
                    View
                </button>
                <button
                    onClick={() => onDelete(item._id)}
                    className="text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AIStackAdvisorPage() {
    const { user, isLoaded } = useUser()
    const navigate = useNavigate()

    // Multi-step form state
    const [step, setStep] = useState(0)  // 0=role, 1=usecases, 2=budget, 3=existing
    const [role, setRole] = useState(null)
    const [useCases, setUseCases] = useState([])
    const [useCaseInput, setUseCaseInput] = useState('')
    const [budget, setBudget] = useState('any')
    const [existing, setExisting] = useState([])
    const [existingInput, setExistingInput] = useState('')

    // Results
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    // History
    const [history, setHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [showHistory, setShowHistory] = useState(false)

    const { fireNudge } = useNudge()

    const isPro = ['Basic', 'Pro', 'Premium', 'Business', 'Enterprise'].includes(
        user?.publicMetadata?.subscriptionTier || 'Free'
    )

    useEffect(() => {
        if (isLoaded && user) {
            loadHistory()
        }
    }, [isLoaded, user])

    // Fire PRO_FEATURE_REQUIRED nudge when non-Pro user hits the gate
    useEffect(() => {
        if (isLoaded && user && !isPro) {
            if (!sessionStorage.getItem('nudge_pro_feature_fired')) {
                fireNudge('PRO_FEATURE_REQUIRED')
                sessionStorage.setItem('nudge_pro_feature_fired', '1')
            }
        }
    }, [isLoaded, user, isPro, fireNudge])

    const loadHistory = async () => {
        setHistoryLoading(true)
        try {
            const res = await stackAdvisorService.getHistory()
            setHistory(res?.data || [])
        } catch { /* silent */ }
        finally { setHistoryLoading(false) }
    }

    const addUseCase = (val) => {
        const trimmed = (val || useCaseInput).trim()
        if (trimmed && useCases.length < 5 && !useCases.includes(trimmed)) {
            setUseCases(prev => [...prev, trimmed])
            setUseCaseInput('')
        }
    }

    const addExisting = (val) => {
        const trimmed = (val || existingInput).trim()
        if (trimmed && existing.length < 10 && !existing.includes(trimmed)) {
            setExisting(prev => [...prev, trimmed])
            setExistingInput('')
        }
    }

    const handleSubmit = async () => {
        setLoading(true)
        setError(null)
        setResult(null)

        try {
            const res = await stackAdvisorService.getRecommendations({
                role, useCases, existing, budget,
            })
            setResult(res?.data || res)
            setStep(5) // results step
            loadHistory()
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Something went wrong'
            if (msg.includes('RATE_LIMIT_EXCEEDED')) {
                const hours = msg.split(':')[1] || '24'
                setError(`You've used all 10 recommendations for today. Come back in ${hours} hour${hours === '1' ? '' : 's'}.`)
            } else if (msg.includes('PRO_FEATURE_REQUIRED')) {
                setError('PRO_REQUIRED')
            } else {
                setError(msg)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteHistory = async (stackId) => {
        try {
            await stackAdvisorService.deleteStack(stackId)
            setHistory(prev => prev.filter(h => h._id !== stackId))
        } catch { /* silent */ }
    }

    const handleRestoreHistory = (item) => {
        setResult(item)
        setStep(5)
        setShowHistory(false)
    }

    const resetForm = () => {
        setStep(0)
        setRole(null)
        setUseCases([])
        setBudget('any')
        setExisting([])
        setResult(null)
        setError(null)
    }

    // ── Not signed in ─────────────────────────────────────────────────────────
    if (isLoaded && !user) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space flex items-center justify-center px-6">
                <div className="max-w-md text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-accent-cyan to-accent-purple flex items-center justify-center mx-auto mb-6">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">AI Stack Advisor</h1>
                    <p className="text-gray-400 mb-8">Sign in to get personalised AI tool recommendations for your role.</p>
                    <Link to="/sign-in?redirect_url=/ai-stack-advisor" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-purple text-white font-semibold hover:shadow-glow-cyan transition-all">
                        Sign In to Continue <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        )
    }

    // ── Pro Gate ──────────────────────────────────────────────────────────────
    const userTier = user?.publicMetadata?.subscriptionTier || 'Free'
    const isOnTrial = userTier === 'Pro'  // during trial tier is 'Pro'
    const hasAccess = isPro

    if (isLoaded && !hasAccess) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space flex items-center justify-center px-6">
                <SEO title="AI Stack Advisor — IntelliGrid" description="Get personalised AI tool recommendations for your role." />
                <div className="max-w-lg text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-accent-purple to-accent-rose flex items-center justify-center mx-auto mb-6">
                        <Zap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">AI Stack Advisor</h1>
                    <p className="text-gray-400 mb-2">This feature is available on the <strong className="text-white">Pro plan</strong> and above.</p>
                    <p className="text-gray-400 mb-8">Start your free 14-day trial to access AI recommendations, unlimited saves, and more.</p>
                    <Link to="/pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-purple to-accent-cyan text-white font-semibold hover:shadow-glow-cyan transition-all">
                        View Plans — 14-Day Free Trial <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-primary-900 to-deep-space">
            <SEO
                title="AI Stack Advisor — IntelliGrid | Personalised Tool Recommendations"
                description="Tell us your role and use cases. We'll recommend the best AI tools for your exact situation from our database of 3,500+ tools."
                canonicalUrl="https://www.intelligrid.online/ai-stack-advisor"
            />

            <div className="container mx-auto px-6 py-12 max-w-5xl">

                {/* ── Header ── */}
                <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-accent-cyan to-accent-purple flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-semibold text-accent-cyan uppercase tracking-wide">AI Stack Advisor</span>
                        </div>
                        <h1 className="text-4xl font-bold text-white">Your perfect AI stack,<br />recommended by AI.</h1>
                        <p className="text-gray-400 mt-2 text-sm">Tell us your role → get personalised tool recommendations from 3,500+ tools.</p>
                        <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> 10 recommendations per day on Pro
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {result && (
                            <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 text-gray-300 text-sm hover:bg-white/15 transition-all">
                                <Sparkles className="w-4 h-4" /> New Analysis
                            </button>
                        )}
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 text-gray-300 text-sm hover:bg-white/15 transition-all"
                        >
                            <History className="w-4 h-4" />
                            History {history.length > 0 && <span className="bg-accent-cyan/20 text-accent-cyan text-xs px-1.5 rounded-full">{history.length}</span>}
                        </button>
                    </div>
                </div>

                {/* ── History Panel ── */}
                {showHistory && (
                    <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-white">Past Recommendations</h2>
                            <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                        {historyLoading ? (
                            <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading history...
                            </div>
                        ) : history.length === 0 ? (
                            <p className="text-gray-500 text-sm py-4">No saved stacks yet. Run your first analysis below.</p>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item) => (
                                    <HistoryCard
                                        key={item._id}
                                        item={item}
                                        onDelete={handleDeleteHistory}
                                        onRestore={handleRestoreHistory}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Error States ── */}
                {error === 'PRO_REQUIRED' && (
                    <div className="mb-8 rounded-2xl border border-accent-purple/30 bg-accent-purple/10 p-6 text-center">
                        <Zap className="w-8 h-8 text-accent-purple mx-auto mb-3" />
                        <p className="text-white font-semibold mb-1">Pro access required</p>
                        <p className="text-gray-400 text-sm mb-4">Your trial may have expired.</p>
                        <Link to="/pricing" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-cyan text-white text-sm font-semibold hover:shadow-glow-cyan transition-all">
                            Upgrade Now <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                )}

                {error && error !== 'PRO_REQUIRED' && (
                    <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-400 text-sm font-semibold">{error}</p>
                            <button onClick={() => setError(null)} className="text-xs text-gray-500 mt-1 hover:text-white">Dismiss</button>
                        </div>
                    </div>
                )}

                {/* ── Results View ── */}
                {step === 5 && result && (
                    <div className="space-y-8">
                        {/* Stack Summary */}
                        <div className="rounded-2xl border border-accent-cyan/20 bg-gradient-to-br from-accent-cyan/5 to-accent-purple/5 p-6">
                            <div className="flex items-start gap-3 mb-4">
                                <CheckCircle2 className="w-6 h-6 text-accent-emerald flex-shrink-0 mt-0.5" />
                                <div>
                                    <h2 className="font-bold text-white text-lg mb-1">Your Recommended Stack</h2>
                                    <p className="text-gray-300 text-sm leading-relaxed">{result.stackSummary}</p>
                                </div>
                            </div>
                            {result.estimatedMonthlyCost && (
                                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Estimated monthly cost:</span>
                                    <span className="text-sm font-semibold text-white">{result.estimatedMonthlyCost}</span>
                                </div>
                            )}
                        </div>

                        {/* Recommendations Grid */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">
                                {result.recommendations?.length} tool{result.recommendations?.length !== 1 ? 's' : ''} recommended for your {result.input?.role || role} workflow
                            </h3>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {(result.recommendations || []).map((rec, i) => (
                                    <ToolRecommendationCard key={i} rec={rec} index={i} />
                                ))}
                            </div>
                        </div>

                        {/* Gaps */}
                        {result.gaps?.length > 0 && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                                <h3 className="font-semibold text-amber-300 mb-3 text-sm">Gaps in our database for this role</h3>
                                <ul className="space-y-1.5">
                                    {result.gaps.map((gap, i) => (
                                        <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                                            <span className="text-amber-500 mt-0.5">·</span> {gap}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button onClick={resetForm} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-purple text-white font-semibold hover:shadow-glow-cyan transition-all text-sm">
                                <Sparkles className="w-4 h-4" /> Analyse Another Role
                            </button>
                            <Link to="/tools" className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 bg-white/5 text-gray-300 font-semibold hover:bg-white/15 transition-all text-sm">
                                Browse All Tools
                            </Link>
                        </div>
                    </div>
                )}

                {/* ── Form Steps (0–3) + Generating (4) ── */}
                {step < 5 && (
                    <div className="max-w-3xl mx-auto">
                        <StepDots current={step} total={4} />

                        {/* Step 0 — Role Selection */}
                        {step === 0 && (
                            <div>
                                <h2 className="text-2xl font-bold text-white text-center mb-2">What's your primary role?</h2>
                                <p className="text-gray-400 text-center text-sm mb-8">We'll filter tools relevant to your work.</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                    {ROLES.map((r) => {
                                        const Icon = r.icon
                                        const selected = role === r.id
                                        return (
                                            <button
                                                key={r.id}
                                                id={`role-${r.id}`}
                                                onClick={() => { setRole(r.id); setStep(1) }}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 hover:-translate-y-1 text-center group ${selected
                                                    ? 'border-accent-cyan bg-accent-cyan/15 shadow-glow-cyan'
                                                    : 'border-white/10 bg-white/5 hover:border-accent-cyan/50 hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${selected ? 'bg-accent-cyan/30' : 'bg-white/10 group-hover:bg-white/20'}`}>
                                                    <Icon className={`w-5 h-5 ${selected ? 'text-accent-cyan' : 'text-gray-400 group-hover:text-white'}`} />
                                                </div>
                                                <span className={`text-xs font-semibold leading-tight ${selected ? 'text-accent-cyan' : 'text-gray-300'}`}>{r.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Step 1 — Use Cases */}
                        {step === 1 && (
                            <div>
                                <h2 className="text-2xl font-bold text-white text-center mb-2">What are you trying to do?</h2>
                                <p className="text-gray-400 text-center text-sm mb-6">Select up to 5 use cases (or add your own).</p>

                                {/* Suggestions */}
                                <div className="flex flex-wrap gap-2 mb-5 justify-center">
                                    {(USE_CASE_SUGGESTIONS[role] || []).map((uc) => {
                                        const selected = useCases.includes(uc)
                                        return (
                                            <button
                                                key={uc}
                                                onClick={() => selected
                                                    ? setUseCases(prev => prev.filter(u => u !== uc))
                                                    : addUseCase(uc)
                                                }
                                                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${selected
                                                    ? 'border-accent-cyan bg-accent-cyan/20 text-accent-cyan'
                                                    : 'border-white/15 bg-white/5 text-gray-400 hover:border-accent-cyan/50 hover:text-white'
                                                    }`}
                                            >
                                                {selected ? '✓ ' : ''}{uc}
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Custom input */}
                                <div className="flex gap-2 mb-4">
                                    <input
                                        value={useCaseInput}
                                        onChange={e => setUseCaseInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addUseCase()}
                                        placeholder="Add a custom use case..."
                                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-accent-cyan/50 focus:outline-none focus:ring-2 focus:ring-accent-cyan/15 transition-all"
                                    />
                                    <button
                                        onClick={() => addUseCase()}
                                        disabled={!useCaseInput.trim() || useCases.length >= 5}
                                        className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-semibold hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Add
                                    </button>
                                </div>

                                {/* Selected chips */}
                                {useCases.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {useCases.map(uc => (
                                            <span key={uc} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-accent-purple/20 border border-accent-purple/30 text-accent-cyan">
                                                {uc}
                                                <button onClick={() => setUseCases(prev => prev.filter(u => u !== uc))} className="hover:text-white"><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button onClick={() => setStep(0)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-gray-400 text-sm hover:bg-white/15 transition-all">
                                        <ChevronLeft className="w-4 h-4" /> Back
                                    </button>
                                    <button
                                        onClick={() => setStep(2)}
                                        className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-purple text-white font-semibold text-sm hover:shadow-glow-cyan transition-all disabled:opacity-50"
                                    >
                                        Continue <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2 — Budget */}
                        {step === 2 && (
                            <div>
                                <h2 className="text-2xl font-bold text-white text-center mb-2">What's your budget preference?</h2>
                                <p className="text-gray-400 text-center text-sm mb-8">We'll prioritise tools that match.</p>
                                <div className="grid gap-4 sm:grid-cols-3 mb-8">
                                    {BUDGET_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            id={`budget-${opt.id}`}
                                            onClick={() => setBudget(opt.id)}
                                            className={`flex flex-col items-start gap-1 p-5 rounded-xl border transition-all duration-200 ${budget === opt.id
                                                ? 'border-accent-cyan bg-accent-cyan/15 shadow-glow-cyan'
                                                : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                                                }`}
                                        >
                                            <span className={`font-bold text-sm ${budget === opt.id ? 'text-accent-cyan' : 'text-white'}`}>{opt.label}</span>
                                            <span className="text-xs text-gray-500">{opt.desc}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-gray-400 text-sm hover:bg-white/15 transition-all">
                                        <ChevronLeft className="w-4 h-4" /> Back
                                    </button>
                                    <button onClick={() => setStep(3)} className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-purple text-white font-semibold text-sm hover:shadow-glow-cyan transition-all">
                                        Continue <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3 — Existing Tools */}
                        {step === 3 && (
                            <div>
                                <h2 className="text-2xl font-bold text-white text-center mb-2">What tools do you already use?</h2>
                                <p className="text-gray-400 text-center text-sm mb-6">Optional — we'll avoid recommending what you have and suggest upgrades where they exist.</p>

                                <div className="flex gap-2 mb-4">
                                    <input
                                        value={existingInput}
                                        onChange={e => setExistingInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addExisting()}
                                        placeholder="e.g. ChatGPT, Notion, Grammarly..."
                                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-accent-cyan/50 focus:outline-none focus:ring-2 focus:ring-accent-cyan/15 transition-all"
                                    />
                                    <button
                                        onClick={() => addExisting()}
                                        disabled={!existingInput.trim() || existing.length >= 10}
                                        className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-sm font-semibold hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Add
                                    </button>
                                </div>

                                {existing.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {existing.map(t => (
                                            <span key={t} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-white/8 border border-white/15 text-gray-300">
                                                {t}
                                                <button onClick={() => setExisting(prev => prev.filter(e => e !== t))} className="hover:text-white"><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-gray-400 text-sm hover:bg-white/15 transition-all">
                                        <ChevronLeft className="w-4 h-4" /> Back
                                    </button>
                                    <button
                                        id="get-recommendations-btn"
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-purple text-white font-semibold text-sm hover:shadow-glow-cyan transition-all disabled:opacity-70"
                                    >
                                        {loading
                                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing your stack...</>
                                            : <><Sparkles className="w-4 h-4" /> Get Recommendations</>
                                        }
                                    </button>
                                </div>
                                {loading && (
                                    <p className="text-center text-xs text-gray-500 mt-4 animate-pulse">
                                        Searching {Math.floor(Math.random() * 20 + 60)} candidate tools · Asking AI · Building your stack...
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
