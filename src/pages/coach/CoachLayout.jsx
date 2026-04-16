import React, { useState, useCallback } from 'react';
import SectionErrorBoundary from '../../components/SectionErrorBoundary';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    LogOut,
    Menu,
    X,
    Users,
    CalendarCheck,
    Star,
    MessageCircle,
    Trophy
} from 'lucide-react';
import NotificationsDropdown from '../../components/NotificationsDropdown';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useLanguage } from '../../i18n/LanguageContext';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import SessionWarning from '../../components/SessionWarning';
import PWAInstallPrompt from '../../components/PWAInstallPrompt';

function checkCoachAuth() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const expires = parseInt(localStorage.getItem('token_expires') || '0');
    return token && role === 'coach' && (expires === 0 || Date.now() < expires);
}

const CoachLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const { t, isRTL, dir } = useLanguage();
    const coachName = localStorage.getItem('user_name') || localStorage.getItem('email') || 'Coach';

    const [isValid] = useState(checkCoachAuth);

    if (!isValid) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('token_expires');
        return <Navigate to="/login" replace />;
    }

    const navItems = [
        { path: '/coach/dashboard', name: t('sidebar.dashboard'), icon: LayoutDashboard },
        { path: '/coach/squads', name: t('coach.mySquads'), icon: Users },
        { path: '/coach/attendance', name: t('sidebar.attendance'), icon: CalendarCheck },
        { path: '/coach/evaluations', name: t('sidebar.evaluations'), icon: Star },
        { path: '/coach/matches', name: t('sidebar.matches') || (isRTL ? 'المباريات' : 'Matches'), icon: Trophy },
        { path: '/coach/chat', name: t('sidebar.chat') || 'Chat', icon: MessageCircle },
    ];

    const handleLogout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('token_expires');
        navigate('/login');
    }, [navigate]);

    // 🔒 Session Security — تسجيل خروج بعد 10 دقائق بدون نشاط
    const { showWarning, remainingSeconds, extendSession } = useIdleTimer(handleLogout);

    return (
        <div className="min-h-screen bg-slate-50 relative flex overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {!isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(true)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed lg:static inset-y-0 z-50
                    bg-white transition-all duration-300 ease-in-out
                    flex flex-col shrink-0 overflow-hidden
                    ${isRTL ? 'right-0 border-l border-slate-200' : 'left-0 border-r border-slate-200'}
                    ${isSidebarOpen ? 'w-72 translate-x-0' : isRTL ? 'w-0 translate-x-full lg:translate-x-0 lg:w-20' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-20'}
                `}
            >
                <div className="w-72 h-full flex flex-col">
                    <div className="h-20 flex items-center px-6 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                        <div className="hidden w-10 h-10 bg-gradient-to-tr from-green-500 to-emerald-600 rounded-xl items-center justify-center shadow-lg transform rotate-3">
                            <span className="text-white font-black text-xl tracking-tighter -rotate-3">CA</span>
                        </div>
                        <div>
                            <span className="text-xl font-extrabold text-slate-800 tracking-tight block leading-tight">Coach</span>
                            <span className="text-[11px] font-bold text-emerald-600 tracking-wider uppercase">Portal</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.includes(item.path);

                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`nav-item w-full ${isActive ? 'active' : ''} ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                            >
                                <Icon size={20} className={isActive ? 'text-surface-900' : 'text-surface-400'} />
                                <span className={isActive ? 'font-semibold' : 'font-medium'}>{item.name}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-slate-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                        <LogOut size={18} />
                        {t('common.logout')}
                    </button>
                </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <header className="h-20 bg-white border-b border-slate-200 flex items-center px-4 lg:px-8 justify-between shrink-0 transition-all">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-sm bg-white"
                    >
                        {isSidebarOpen ? <X size={20} className="lg:hidden" /> : <Menu size={20} />}
                        {isSidebarOpen && <Menu size={20} className="hidden lg:block" />}
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        <LanguageSwitcher />
                        <NotificationsDropdown />
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-sm font-bold text-slate-800">{coachName}</span>
                            <span className="text-[11px] font-medium text-emerald-600 uppercase tracking-widest">Coach</span>
                        </div>
                        <div className="w-11 h-11 bg-slate-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(coachName)}&background=10b981&color=fff`} alt="Coach" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </header>

                {location.pathname.includes('/chat') ? (
                    <div className="flex-1 overflow-hidden" dir={dir}>
                        <SectionErrorBoundary name="Page">
                            <Outlet />
                            </SectionErrorBoundary>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto bg-slate-50/50 p-4 lg:p-8">
                        <div className="max-w-7xl mx-auto">
                            <SectionErrorBoundary name="Page">
                            <Outlet />
                            </SectionErrorBoundary>
                        </div>
                    </div>
                )}
            </main>

            {/* 🔒 Session Security Warning */}
            {showWarning && (
                <SessionWarning
                    remainingSeconds={remainingSeconds}
                    onExtend={extendSession}
                    isRTL={isRTL}
                />
            )}

            {/* 📱 PWA Install Prompt */}
            <PWAInstallPrompt isRTL={isRTL} />
        </div>
    );
};

export default CoachLayout;
