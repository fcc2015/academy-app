import React from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BottomNav from '../../components/layout/BottomNav';
import NotificationsDropdown from '../../components/NotificationsDropdown';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import ThemeToggle from '../../components/ThemeToggle';
import { useLanguage } from '../../i18n/LanguageContext';
import { useEffect, useState, useCallback } from 'react';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import SessionWarning from '../../components/SessionWarning';

const AdminLayout = () => {
    const { isRTL, dir } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const [authChecked, setAuthChecked] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const isChatPage = location.pathname.includes('/chat');

    // 🔒 Session Security — تسجيل خروج بعد 10 دقائق بدون نشاط
    const handleIdleLogout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('token_expires');
        navigate('/login', { state: { message: 'تم تسجيل الخروج تلقائياً بسبب عدم النشاط' } });
    }, [navigate]);

    const { showWarning, remainingSeconds, extendSession } = useIdleTimer(handleIdleLogout);

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
            <div className="min-h-screen flex items-center justify-center bg-surface-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-surface-200 border-t-brand-600 rounded-full animate-spin" />
                    <p className="text-surface-500 text-xs font-bold uppercase tracking-widest">Vérification...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-surface-50 text-surface-900 flex" dir={dir}>
            <AdminSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
                isRTL 
                    ? (sidebarCollapsed ? 'lg:pr-[72px]' : 'lg:pr-[240px]') 
                    : (sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]')
            }`}>
                <header
                    className={`sticky top-0 z-50 h-16 flex items-center px-4 sm:px-6 lg:px-8 gap-3 border-b border-surface-200 bg-white/90 backdrop-blur-sm ${
                        isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-end'
                    }`}
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

            {/* 🔒 Session Security Warning */}
            {showWarning && (
                <SessionWarning
                    remainingSeconds={remainingSeconds}
                    onExtend={extendSession}
                    isRTL={isRTL}
                />
            )}
        </div>
    );
};

export default AdminLayout;
