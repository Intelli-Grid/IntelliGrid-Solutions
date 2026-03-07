/**
 * EmptyState.jsx
 * Reusable empty state component with icon, title, description, and optional CTA.
 *
 * Usage:
 *   <EmptyState
 *     icon={Heart}
 *     title="No favourites yet"
 *     description="Save tools you love to find them quickly."
 *     action={{ label: 'Browse Tools', href: '/tools' }}
 *   />
 */
import { Link } from 'react-router-dom'

export default function EmptyState({
    icon: Icon,
    title,
    description,
    action,          // { label, href?, onClick? }
    secondaryAction, // { label, href?, onClick? }
    size = 'md',     // 'sm' | 'md' | 'lg'
    className = '',
}) {
    const sizes = {
        sm: { wrap: 'py-12', iconBox: 'h-12 w-12', icon: 'h-5 w-5', title: 'text-sm font-semibold', desc: 'text-xs', btn: 'px-4 py-1.5 text-xs' },
        md: { wrap: 'py-16', iconBox: 'h-16 w-16', icon: 'h-6 w-6', title: 'text-base font-semibold', desc: 'text-sm', btn: 'px-5 py-2 text-sm' },
        lg: { wrap: 'py-24', iconBox: 'h-20 w-20', icon: 'h-8 w-8', title: 'text-xl font-bold', desc: 'text-sm', btn: 'px-6 py-2.5 text-sm' },
    }
    const s = sizes[size] || sizes.md

    const ActionButton = ({ act, variant = 'primary' }) => {
        const base = `inline-flex items-center gap-2 font-semibold rounded-xl transition-all duration-200 ${s.btn}`
        const cls = variant === 'primary'
            ? `${base} bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20`
            : `${base} bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10`

        if (act.href) {
            return <Link to={act.href} className={cls}>{act.label}</Link>
        }
        return <button onClick={act.onClick} className={cls}>{act.label}</button>
    }

    return (
        <div className={`flex flex-col items-center justify-center text-center ${s.wrap} ${className}`}>
            {/* Icon */}
            {Icon && (
                <div className={`${s.iconBox} rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mb-4 ring-1 ring-white/5`}>
                    <Icon className={`${s.icon} text-gray-600`} />
                </div>
            )}

            {/* Text */}
            <h3 className={`${s.title} text-white mb-2`}>{title}</h3>
            {description && (
                <p className={`${s.desc} text-gray-500 max-w-xs leading-relaxed mb-6`}>{description}</p>
            )}

            {/* Actions */}
            {(action || secondaryAction) && (
                <div className="flex items-center gap-3 flex-wrap justify-center">
                    {action && <ActionButton act={action} variant="primary" />}
                    {secondaryAction && <ActionButton act={secondaryAction} variant="secondary" />}
                </div>
            )}
        </div>
    )
}
