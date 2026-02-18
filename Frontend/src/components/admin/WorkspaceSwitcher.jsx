import { useUser } from '@clerk/clerk-react'

/**
 * WorkspaceSwitcher — visible only to SUPERADMIN
 * Shows navigation between the three workspaces:
 *   Product (intelligrid.online)
 *   Admin   (admin.intelligrid.online) — coming soon
 *   Agent   (agent.intelligrid.online) — coming soon
 */

const ROLE_LEVELS = {
    'user': 1, 'premium': 1, 'admin': 4,
    'USER': 1, 'MODERATOR': 2, 'TRUSTED_OPERATOR': 3, 'SUPERADMIN': 4,
}

const WorkspaceSwitcher = ({ currentWorkspace = 'product' }) => {
    const { user } = useUser()
    const role = user?.publicMetadata?.role || 'USER'
    const roleLevel = ROLE_LEVELS[role] || 1

    // Only show to MODERATOR and above
    if (roleLevel < 2) return null

    const workspaces = [
        {
            id: 'product',
            label: '← Product',
            href: 'https://intelligrid.online',
            minLevel: 1,
            title: 'User-facing product',
        },
        {
            id: 'admin',
            label: 'Admin',
            href: '/admin',
            minLevel: 2,
            title: 'Platform operations',
        },
        {
            id: 'agent',
            label: 'Agent →',
            href: '#', // Will be: https://agent.intelligrid.online
            minLevel: 3,
            title: 'AI Growth Agent (coming soon)',
            comingSoon: true,
        },
    ]

    return (
        <div className="workspace-switcher" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '12px',
            fontFamily: 'monospace',
        }}>
            {workspaces.map((ws) => {
                if (roleLevel < ws.minLevel) return null

                const isActive = currentWorkspace === ws.id
                const isDisabled = ws.comingSoon

                return (
                    <a
                        key={ws.id}
                        href={isDisabled ? undefined : ws.href}
                        title={ws.title}
                        style={{
                            padding: '3px 10px',
                            borderRadius: '5px',
                            color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                            background: isActive ? 'rgba(99,102,241,0.8)' : 'transparent',
                            textDecoration: 'none',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            opacity: isDisabled ? 0.4 : 1,
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap',
                        }}
                        onClick={isDisabled ? (e) => e.preventDefault() : undefined}
                    >
                        {ws.label}
                        {ws.comingSoon && <span style={{ fontSize: '9px', marginLeft: '3px', opacity: 0.7 }}>soon</span>}
                    </a>
                )
            })}
        </div>
    )
}

export default WorkspaceSwitcher
