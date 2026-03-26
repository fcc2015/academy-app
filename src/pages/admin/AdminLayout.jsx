import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BottomNav from '../../components/layout/BottomNav';
import NotificationsDropdown from '../../components/NotificationsDropdown';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import ThemeToggle from '../../components/ThemeToggle';
import { useLanguage } from '../../i18n/LanguageContext';
import { useEffect, useState } from 'react';

const AdminLayout = () => {
    const { isRTL, dir } = useLanguage();
    const location = useLocation();
    const [authChecked, setAuthChecked] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const isChatPage = location.pathname.includes('/chat');

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        const expires = parseInt(localStorage.getItem('token_expires') || '0');

        const valid = token && role === 'admin' && (expires === 0 || Date.now() < expires);

        if (!valid) {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('user_id');
            localStorage.removeItem('token_expires');
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsAuthorized(false);
        } else {
            setIsAuthorized(true);
        }
        setAuthChecked(true);
    }, []);

    if (!authChecked) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0c29' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                    <p className="text-indigo-300/60 text-xs font-black uppercase tracking-widest">Vérification...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className={`min-h-screen bg-[#f8fafc] text-[#0f172a] flex`} dir={dir}>
            <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
                isRTL 
                    ? (sidebarCollapsed ? 'lg:pr-[72px]' : 'lg:pr-[240px]') 
                    : (sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]')
            }`}>
                <header
                    className={`sticky top-0 z-50 h-16 flex items-center px-4 sm:px-6 lg:px-8 gap-3 border-b ${
                        isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-end'
                    }`}
                    style={{
                        background: 'rgba(248, 250, 252, 0.85)',
                        backdropFilter: 'blur(8px)',
                        borderColor: 'rgba(148, 163, 184, 0.15)'
                    }}
                >
                    <div className="flex-1"></div>
                    <ThemeToggle />
                    <NotificationsDropdown />
                    <LanguageSwitcher />
                </header>

                {isChatPage ? (
                    <main className="flex-1 overflow-hidden">
                        <Outlet />
                    </main>
                ) : (
                    <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 pb-28 lg:pb-10">
                        <div className="max-w-7xl mx-auto w-full">
                            <Outlet />
                        </div>
                    </main>
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default AdminLayout;
