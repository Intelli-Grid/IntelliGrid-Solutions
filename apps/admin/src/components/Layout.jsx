
import { useUser, UserButton } from "@clerk/clerk-react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Package,
    Users,
    Settings,
    BarChart,
    ShieldAlert,
    Menu,
    X,
    Globe,
    ShieldCheck,
    Star,
    ToggleLeft,
    Radio,
    Zap
} from "lucide-react";
import { useState } from "react";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

const SidebarItem = ({ icon: Icon, label, to, active, badge }) => (
    <Link
        to={to}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 relative ${active
            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
    >
        <Icon size={18} />
        <span className="text-sm font-medium flex-1">{label}</span>
        {badge != null && badge > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
                {badge > 99 ? '99+' : badge}
            </span>
        )}
    </Link>
);

const SidebarSection = ({ label, children }) => (
    <div className="mb-5">
        <div className="text-[10px] uppercase text-slate-600 font-bold mb-2 px-2 tracking-widest">
            {label}
        </div>
        {children}
    </div>
);

const PAGE_TITLES = {
    '/': 'Dashboard Overview',
    '/tools': 'Tool Queue',
    '/discovery': 'Discovery Queue',
    '/reviews': 'Review Moderation',
    '/users': 'User Management',
    '/claims': 'Claim Requests',
    '/revenue': 'Revenue & Finance',
    '/featured': 'Featured Listings',
    '/war-room': 'War Room ⚡',
    '/flags': 'Feature Flags',
    '/system': 'System Health',
}

const AdminLayout = ({ children }) => {
    const { user } = useUser();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isActive = (path) => location.pathname === path;
    const pageTitle = PAGE_TITLES[location.pathname] || 'Admin';

    const closeMobile = () => setIsMobileMenuOpen(false);

    const navItems = {
        management: [
            { icon: LayoutDashboard, label: 'Overview', to: '/' },
            { icon: Package, label: 'Tool Queue', to: '/tools' },
            { icon: Globe, label: 'Discovery Queue', to: '/discovery' },
            { icon: ShieldAlert, label: 'Review Moderation', to: '/reviews' },
            { icon: ShieldCheck, label: 'Claim Requests', to: '/claims' },
            { icon: Users, label: 'User Management', to: '/users' },
        ],
        revenue: [
            { icon: BarChart, label: 'Revenue', to: '/revenue' },
            { icon: Star, label: 'Featured Listings', to: '/featured' },
        ],
        platform: [
            { icon: Zap,        label: 'War Room',      to: '/war-room' },
            { icon: ToggleLeft, label: 'Feature Flags',  to: '/flags' },
            { icon: Settings,   label: 'System Health',  to: '/system' },
        ],
    };

    const SidebarNav = ({ onLinkClick }) => (
        <>
            <SidebarSection label="Management">
                {navItems.management.map(item => (
                    <SidebarItem
                        key={item.to}
                        icon={item.icon}
                        label={item.label}
                        to={item.to}
                        active={isActive(item.to)}
                        badge={item.badge}
                        onClick={onLinkClick}
                    />
                ))}
            </SidebarSection>
            <SidebarSection label="Revenue">
                {navItems.revenue.map(item => (
                    <SidebarItem
                        key={item.to}
                        icon={item.icon}
                        label={item.label}
                        to={item.to}
                        active={isActive(item.to)}
                        onClick={onLinkClick}
                    />
                ))}
            </SidebarSection>
            <SidebarSection label="Platform">
                {navItems.platform.map(item => (
                    <SidebarItem
                        key={item.to}
                        icon={item.icon}
                        label={item.label}
                        to={item.to}
                        active={isActive(item.to)}
                        onClick={onLinkClick}
                    />
                ))}
            </SidebarSection>
        </>
    );

    return (
        <div className="flex h-screen bg-[#0f1117] text-slate-200 overflow-hidden font-sans">

            {/* ── Sidebar — Desktop ─────────────────────────────────────────────── */}
            <aside className="hidden md:flex w-60 flex-col border-r border-[#2a2d3a] bg-[#161922] shrink-0">
                {/* Logo */}
                <div className="p-4 border-b border-[#2a2d3a] flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 shrink-0">
                        IG
                    </div>
                    <span className="font-bold text-slate-100 tracking-tight">IntelliGrid</span>
                    <span className="text-[10px] uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                        Admin
                    </span>
                </div>

                {/* Nav */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <SidebarNav />
                </div>

                {/* User */}
                <div className="p-4 border-t border-[#2a2d3a] shrink-0">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-[#0f1117] border border-[#2a2d3a]">
                        <UserButton afterSignOutUrl="/"
                            appearance={{
                                elements: {
                                    userButtonAvatarBox: "w-8 h-8",
                                    userButtonPopoverCard: "bg-slate-900 border border-slate-700 text-slate-200",
                                    userButtonPopoverFooter: "hidden"
                                }
                            }}
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">
                                {user?.fullName || user?.username || 'Admin'}
                            </p>
                            <p className="text-xs text-slate-500 truncate capitalize">
                                {user?.publicMetadata?.role?.toLowerCase().replace('_', ' ') || 'admin'}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── Mobile Header ─────────────────────────────────────────────────── */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#161922] border-b border-[#2a2d3a] flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-xs">IG</div>
                    <span className="font-bold text-slate-100 text-sm">IntelliGrid Admin</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-400 p-1">
                    {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* ── Mobile Drawer ─────────────────────────────────────────────────── */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 bg-[#0f1117] z-40 pt-14 px-4 overflow-y-auto">
                    <div className="pt-4">
                        <SidebarNav onLinkClick={closeMobile} />
                    </div>
                </div>
            )}

            {/* ── Main Content ──────────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden pt-14 md:pt-0">
                {/* Top Header */}
                <header className="h-14 border-b border-[#2a2d3a] bg-[#0f1117] flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center text-sm text-slate-400">
                        <span className="hidden md:inline text-slate-600">Platform Operations</span>
                        <span className="mx-2 hidden md:inline text-slate-700">/</span>
                        <span className="text-slate-100 font-medium">{pageTitle}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden md:block">
                            <WorkspaceSwitcher current="admin" />
                        </div>
                        {/* Live indicator */}
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                            <Radio size={12} className="animate-pulse" />
                            <span className="hidden sm:inline font-medium">Live</span>
                        </div>
                        {/* Alert bell */}
                        <button className="text-slate-500 hover:text-slate-300 transition-colors relative p-1">
                            <ShieldAlert size={17} />
                            <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        </button>
                    </div>
                </header>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar scroll-smooth">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
