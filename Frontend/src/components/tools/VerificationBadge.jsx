/**
 * VerificationBadge.jsx
 * v2.5.0 — Displays a human-verified trust signal badge.
 *
 * Renders a ShieldCheck badge only when tool.humanVerified === true.
 * Returns null for unverified tools so it can be placed unconditionally.
 *
 * Props:
 *   tool    — tool object (needs humanVerified, verifiedBy)
 *   size    — 'sm' (inline chip, ToolCard) | 'md' (sidebar block, ToolProductInfo)
 */
import { ShieldCheck } from 'lucide-react'

export default function VerificationBadge({ tool, size = 'sm' }) {
    if (!tool?.humanVerified) return null

    if (size === 'sm') {
        return (
            <span
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-400"
                title="This tool has been manually reviewed and verified by the IntelliGrid team."
            >
                <ShieldCheck className="h-3 w-3" />
                Verified
            </span>
        )
    }

    // size === 'md' — richer block for the tool detail sidebar
    return (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
                <p className="text-sm font-semibold text-emerald-300">IntelliGrid Verified</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Manually reviewed by the IntelliGrid editorial team for accuracy and data quality.
                </p>
            </div>
        </div>
    )
}
