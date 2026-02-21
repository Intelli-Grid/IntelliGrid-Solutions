import { useUser } from '@clerk/clerk-react'

// Only show workspace switcher to MODERATORS+
const ROLE_LEVELS = {
    'user': 1, 'premium': 1, 'admin': 4,
    'USER': 1, 'MODERATOR': 2, 'TRUSTED_OPERATOR': 3, 'SUPERADMIN': 4,
}

const WorkspaceSwitcher = ({ currentWorkspace = 'product' }) => {
    const { user } = useUser()
    const role = user?.publicMetadata?.role || 'USER'
    const roleLevel = ROLE_LEVELS[role] || 1

    return (
        <div className="flex items-center bg-[#1a1d27] rounded-lg p-1 border border-[#2a2d3a] h-9">
            {/* Product */}
            <a
                href="https://intelligrid.online/dashboard"
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${currentWorkspace === 'product'
                        ? 'bg-[#2a2d3a] text-slate-200 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-[#2a2d3a]/50'
                    }`}
                title="User Dashboard"
            >
                Product
            </a>

            {/* Admin */}
            <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${currentWorkspace === 'admin'
                        ? 'bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-[#2a2d3a]/50'
                    }`}
                title="Admin Workspace (Platform Operations)"
            >
                Admin
            </a>

            {/* Agent */}
            {roleLevel >= 3 && (
                <a
                    href="https://agent.intelligrid.online"
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${currentWorkspace === 'agent'
                            ? 'bg-purple-600/20 text-purple-400 font-semibold border border-purple-500/30'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-[#2a2d3a]/50 opacity-60 cursor-not-allowed'
                        }`}
                    title="Growth Agent Workspace (Coming Soon)"
                    // Disable for now
                    onClick={(e) => e.preventDefault()}
                >
                    Agent
                    <span className="text-[9px] uppercase tracking-wider bg-slate-800 text-slate-400 px-1 rounded ml-1 border border-slate-700">Soon</span>
                </a>
            )}
        </div>
    )
}

export default WorkspaceSwitcher
