
import { useUser, UserButton, useClerk } from "@clerk/clerk-react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Package,
    Users,
    Settings,
    BarChart,
    ShieldAlert,
    LogOut,
    Menu,
    X
} from "lucide-react";
import { useState } from "react";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

const SidebarItem = ({ icon: Icon, label, to, active }) => (
    <Link
        to={to}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${active
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
    >
        <Icon size={18} />
        <span className="text-sm font-medium">{label}</span>
    </Link>
);

const AdminLayout = ({ children }) => {
    const { user } = useUser();
    const { signOut } = useClerk();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isActive = (path) => location.pathname === path;

    return (
        <div className="flex h-screen bg-[#0f1117] text-slate-200 overflow-hidden font-sans">

            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex w-64 flex-col border-r border-[#2a2d3a] bg-[#161922]">
                <div className="p-4 border-b border-[#2a2d3a] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
                            IG
                        </div>
                        <span className="font-bold text-slate-100 tracking-tight">IntelliGrid</span>
                        <span className="text-[10px] uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 ml-1">
                            Admin
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="mb-6">
                        <div className="text-[11px] uppercase text-slate-500 font-semibold mb-2 px-2 tracking-wider">
                            Management
                        </div>
                        <SidebarItem
                            icon={LayoutDashboard}
                            label="Overview"
                            to="/"
                            active={isActive("/")}
                        />
                        <SidebarItem
                            icon={Package}
                            label="Tool Queue"
                            to="/tools"
                            active={isActive("/tools")}
                        />
                        <SidebarItem
                            icon={ShieldAlert}
                            label="Review Moderation"
                            to="/reviews"
                            active={isActive("/reviews")}
                        />
                        <SidebarItem
                            icon={Users}
                            label="User Management"
                            to="/users"
                            active={isActive("/users")}
                        />
                    </div>

                    <div className="mb-6">
                        <div className="text-[11px] uppercase text-slate-500 font-semibold mb-2 px-2 tracking-wider">
                            System
                        </div>
                        <SidebarItem
                            icon={BarChart}
                            label="Revenue"
                            to="/revenue"
                            active={isActive("/revenue")}
                        />
                        <SidebarItem
                            icon={Settings}
                            label="System Health"
                            to="/system"
                            active={isActive("/system")}
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-[#2a2d3a]">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-[#0f1117] border border-[#2a2d3a]">
                        {/* Clerk User Button with dark theme override logic handled by Clerk logic generally, or custom css */}
                        <div className="clerk-user-button-wrapper">
                            <UserButton afterSignOutUrl="/"
                                appearance={{
                                    elements: {
                                        userButtonAvatarBox: "w-8 h-8",
                                        userButtonPopoverCard: "bg-slate-900 border border-slate-700 text-slate-200",
                                        userButtonPopoverFooter: "hidden"
                                    }
                                }}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-200 truncate">
                                {user?.fullName || user?.username}
                            </p>
                            <p className="text-xs text-slate-500 truncate capitalize">
                                {user?.publicMetadata?.role?.toLowerCase().replace('_', ' ') || 'Admin'}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#161922] border-b border-[#2a2d3a] flex items-center justify-between px-4 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white">
                        IG
                    </div>
                    <span className="font-bold text-slate-100">IntelliGrid Admin</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-400">
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 bg-[#0f1117] z-40 pt-20 px-4">
                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Overview"
                        to="/"
                        active={isActive("/")}
                    />
                    <SidebarItem
                        icon={Package}
                        label="Tool Queue"
                        to="/tools"
                        active={isActive("/tools")}
                    />
                    {/* ... other mobile items ... */}
                </div>
            )}


            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden md:pl-0 pt-16 md:pt-0">
                {/* Top Header */}
                <header className="h-16 border-b border-[#2a2d3a] bg-[#0f1117] flex items-center justify-between px-6 shrink-0">
                    {/* Breadcrumbs or Page Title could go here */}
                    <div className="flex items-center text-slate-400 text-sm">
                        <span className="hidden md:inline">Platform Operations</span>
                        <span className="mx-2 hidden md:inline">/</span>
                        <span className="text-slate-100 font-medium">
                            {isActive("/") ? "Dashboard Overview" :
                                isActive("/tools") ? "Tool Queue" :
                                    isActive("/reviews") ? "Review Moderation" :
                                        isActive("/users") ? "User Management" :
                                            isActive("/revenue") ? "Revenue & Finance" :
                                                isActive("/system") ? "System Health" : "Page"}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Workspace Switcher - The Critical Component */}
                        <div className="hidden md:block">
                            <WorkspaceSwitcher current="admin" />
                        </div>

                        {/* Notification Bell placeholder */}
                        <button className="text-slate-500 hover:text-slate-300 transition-colors relative">
                            <ShieldAlert size={18} />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        </button>
                    </div>
                </header>

                {/* Scrollable Page Content */}
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
