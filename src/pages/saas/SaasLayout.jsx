import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, Users, CreditCard, Settings, LayoutDashboard, LogOut, Loader2 } from 'lucide-react';
import { isAuthenticated, logout } from '../../api';

export default function SaasLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyAccess = () => {
            if (!isAuthenticated()) {
                navigate('/saas/login', { replace: true });
                return;
            }
            const role = localStorage.getItem('role');
            if (role !== 'super_admin') {
                navigate('/', { replace: true });
                return;
            }
            setLoading(false);
        };
        verifyAccess();
    }, [navigate]);

    const handleLogout = () => {
        logout();
        navigate('/saas/login');
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-[#0B1120] text-emerald-400"><Loader2 className="w-10 h-10 animate-spin" /></div>;
    }

    const navigation = [
        { name: 'Dashboard', href: '/saas/dashboard', icon: LayoutDashboard },
        { name: 'Academies', href: '/saas/academies', icon: ShieldAlert },
        { name: 'Subscriptions', href: '/saas/subscriptions', icon: CreditCard },
        { name: 'Settings', href: '/saas/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-[#0B1120] flex">
            {/* Sidebar */}
            <div className="w-64 border-r border-emerald-900/30 bg-[#0F172A] flex flex-col">
                <div className="h-20 flex items-center px-6 border-b border-emerald-900/30">
                    <ShieldAlert className="w-8 h-8 text-emerald-500 mr-3" />
                    <div>
                        <h1 className="text-emerald-50 font-black tracking-tight text-lg">SaaS ROOT</h1>
                        <p className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest">Platform Admin</p>
                    </div>
                </div>

                <nav className="flex-1 py-6 px-4 space-y-1">
                    {navigation.map((item) => {
                        const isActive = location.pathname.includes(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                    isActive 
                                    ? 'bg-emerald-500/10 text-emerald-400' 
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-emerald-900/30">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
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
