/**
 * OutcomeChips.jsx
 * v2.5.0 — Renders anti-slop outcome signal chips.
 *
 * Shows quantifiable outcome data extracted by the enrichment pipeline:
 *  - timeSaved (e.g. "2 hours/day")
 *  - costReduction (e.g. "30% cheaper than agency")
 *  - skillLevel (Beginner | Intermediate | Expert)
 *
 * Returns null if no outcome data is present so it can be placed unconditionally.
 *
 * Props:
 *   tool    — tool object (reads tool.outcomes, tool.isWaitlist, tool.trueFreeTier, tool.requiresCreditCardForTrial)
 *   compact — boolean; if true shows a smaller, single-row layout (ToolCard)
 *             if false shows a labelled block layout (ToolProductInfo)
 */
import { Clock, DollarSign, Gauge, AlertTriangle, CreditCard, CheckCircle2 } from 'lucide-react'

const SKILL_COLOR = {
    Beginner:     'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    Intermediate: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    Expert:       'text-rose-400 bg-rose-400/10 border-rose-400/20',
}

export default function OutcomeChips({ tool, compact = false }) {
    const outcomes = tool?.outcomes || {}
    const hasTimeSaved      = !!outcomes.timeSaved
    const hasCostReduction  = !!outcomes.costReduction
    const hasSkillLevel     = !!outcomes.skillLevel && outcomes.skillLevel !== 'Unknown'
    const hasWaitlist       = tool?.isWaitlist
    const hasTrueFreeTier   = tool?.trueFreeTier === true
    const requiresCC        = tool?.requiresCreditCardForTrial === true

    const hasAnyOutcome = hasTimeSaved || hasCostReduction || hasSkillLevel
    const hasAnyFlag    = hasWaitlist || hasTrueFreeTier || requiresCC

    if (!hasAnyOutcome && !hasAnyFlag) return null

    if (compact) {
        // Small inline chips — used inside ToolCard
        return (
            <div className="flex flex-wrap gap-1 mt-1.5">
                {hasTimeSaved && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400">
                        <Clock className="h-2.5 w-2.5" />
                        {outcomes.timeSaved}
                    </span>
                )}
                {hasCostReduction && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400">
                        <DollarSign className="h-2.5 w-2.5" />
                        {outcomes.costReduction}
                    </span>
                )}
                {hasSkillLevel && (
                    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${SKILL_COLOR[outcomes.skillLevel] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>
                        <Gauge className="h-2.5 w-2.5" />
                        {outcomes.skillLevel}
                    </span>
                )}
                {hasWaitlist && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Waitlist
                    </span>
                )}
                {hasTrueFreeTier && !requiresCC && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Truly Free
                    </span>
                )}
                {requiresCC && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                        <CreditCard className="h-2.5 w-2.5" />
                        CC Required
                    </span>
                )}
            </div>
        )
    }

    // Full labelled block — used in ToolProductInfo sidebar
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Outcome Signals
            </p>
            <div className="space-y-2">
                {hasTimeSaved && (
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-sky-400 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500">Time Saved</p>
                            <p className="text-sm font-medium text-white">{outcomes.timeSaved}</p>
                        </div>
                    </div>
                )}
                {hasCostReduction && (
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500">Cost Reduction</p>
                            <p className="text-sm font-medium text-white">{outcomes.costReduction}</p>
                        </div>
                    </div>
                )}
                {hasSkillLevel && (
                    <div className="flex items-center gap-2">
                        <Gauge className="h-4 w-4 text-amber-400 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500">Skill Level</p>
                            <p className="text-sm font-medium text-white">{outcomes.skillLevel}</p>
                        </div>
                    </div>
                )}
                {/* Pricing trust signals */}
                {hasTrueFreeTier && !requiresCC && (
                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                        <p className="text-sm text-emerald-300 font-medium">Truly free — no credit card needed</p>
                    </div>
                )}
                {requiresCC && (
                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                        <CreditCard className="h-4 w-4 text-red-400 flex-shrink-0" />
                        <p className="text-sm text-red-300 font-medium">Credit card required for trial</p>
                    </div>
                )}
                {hasWaitlist && (
                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                        <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0" />
                        <p className="text-sm text-orange-300 font-medium">Currently on waitlist</p>
                    </div>
                )}
            </div>
        </div>
    )
}
