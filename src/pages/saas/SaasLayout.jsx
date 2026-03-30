import React from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, Globe, CreditCard, Settings, LayoutDashboard, LogOut, Building2, Zap } from 'lucide-react';
import { isAuthenticated, logout } from '../../api';

export default function SaasLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    // ── Synchronous Auth Guard (fixes 404 bug) ──
    if (!isAuthenticated()) {
        return <Navigate to="/saas/login" replace />;
    }
    const role = localStorage.getItem('role');
    if (role !== 'super_admin') {
        return <Navigate to="/" replace />;
    }

    const handleLogout = () => {
        logout();
        navigate('/saas/login');
    };

    const navigation = [
        { name: 'Dashboard', href: '/saas/dashboard', icon: LayoutDashboard },
        { name: 'Academies', href: '/saas/academies', icon: Building2 },
        { name: 'Domains', href: '/saas/domains', icon: Globe },
        { name: 'Subscriptions', href: '/saas/subscriptions', icon: CreditCard },
        { name: 'Settings', href: '/saas/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-[#0B1120] flex">
            {/* Sidebar */}
            <div className="w-[260px] border-r border-slate-800/60 bg-[#0F172A] flex flex-col shrink-0">
                {/* Logo Block */}
                <div className="h-[72px] flex items-center px-5 border-b border-slate-800/60">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-3 shrink-0"
                        style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-white font-black tracking-tight text-[15px] leading-tight">Academy SaaS</h1>
                        <p className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-[0.15em]">Super Admin</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-5 px-3 space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 mb-3">Management</p>
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href || 
                            (item.href !== '/saas/dashboard' && location.pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-150 ${
                                    isActive 
                                    ? 'bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/5' 
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                }`}
                            >
                                <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section + Logout */}
                <div className="p-3 border-t border-slate-800/60">
                    <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-xs font-black">
                            SA
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-300 truncate">Super Admin</p>
                            <p className="text-[10px] text-slate-500 truncate">{localStorage.getItem('user_id')?.slice(0, 8)}...</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-[13px] font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                        <LogOut className="w-[18px] h-[18px]" />
                        Log Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="max-w-7xl mx-auto py-8 px-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
