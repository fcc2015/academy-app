import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Globe, CreditCard, Settings, LayoutDashboard, LogOut, Building2, Zap } from 'lucide-react';
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
        { name: 'Academy Plans', href: '/saas/subscriptions', icon: CreditCard },
        { name: 'Notifications', href: '/saas/notifications', icon: Bell },
        { name: 'Settings', href: '/saas/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-surface-50 flex">
            {/* Sidebar */}
            <div className="w-[260px] border-r border-surface-200 bg-white flex flex-col shrink-0">
                {/* Logo Block */}
                <div className="h-[72px] flex items-center px-5 border-b border-surface-200">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-3 shrink-0 bg-brand-900 border border-brand-800 shadow-sm">
                        <Zap className="w-5 h-5 text-brand-100" />
                    </div>
                    <div>
                        <h1 className="text-surface-900 font-bold tracking-tight text-[15px] leading-tight">Academy SaaS</h1>
                        <p className="text-[10px] text-surface-500 font-bold uppercase tracking-[0.15em]">Super Admin</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-5 px-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 px-3 mb-3">Management</p>
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href || 
                            (item.href !== '/saas/dashboard' && location.pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                            >
                                <item.icon className="w-4 h-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section + Logout */}
                <div className="p-4 border-t border-surface-200">
                    <div className="flex items-center gap-3 px-2 py-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-surface-100 border border-surface-200 flex items-center justify-center text-surface-700 text-xs font-bold shadow-sm">
                            SA
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-surface-900 truncate">Super Admin</p>
                            <p className="text-[10px] text-surface-500 truncate">{localStorage.getItem('user_id')?.slice(0, 8)}...</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 w-full rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="page-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
