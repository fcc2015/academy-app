import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import SectionErrorBoundary from '../../components/SectionErrorBoundary';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    LogOut,
    Menu,
    X,
    CalendarCheck,
    Star,
    CreditCard,
    User,
    GraduationCap,
    MessageCircle
} from 'lucide-react';
import NotificationsDropdown from '../../components/NotificationsDropdown';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { useLanguage } from '../../i18n/LanguageContext';

function checkParentAuth() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const isImpersonating = !!localStorage.getItem('impersonating_user_id');
    // Allow access if:
    // (1) logged in as parent with a token, OR
    // (2) any admin/super_admin/sous_admin impersonating a user (they use their own token)
    const isAdminRole = role === 'admin' || role === 'super_admin' || role === 'sous_admin';
    if (isImpersonating && token && isAdminRole) return true;
    return !!token && role === 'parent';
}

const ParentLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const { t, isRTL, dir } = useLanguage();
    const [academyName, setAcademyName] = useState(isRTL ? 'أكاديمية كرة القدم' : 'Football Academy');

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        authFetch(`${API_URL}/settings/`)
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data && data.academy_name) {
                    setAcademyName(data.academy_name);
                }
            })
            .catch(() => {});
    }, []);

    // Re-evaluate on every render so that impersonation state changes are picked up
    const isValid = checkParentAuth();

    if (!isValid) {
        const isImpersonating = !!localStorage.getItem('impersonating_user_id');
        const role = localStorage.getItem('role');
        const token = localStorage.getItem('token');
        const isAdminRole = role === 'admin' || role === 'super_admin' || role === 'sous_admin';

        // If an admin token exists (even without impersonation active), send them back to admin panel
        // DO NOT clear the admin's own token/role
        if (isAdminRole && token) {
            localStorage.removeItem('impersonating_user_id');
            localStorage.removeItem('impersonating_user_name');
            localStorage.removeItem('impersonating_user_role');
            return <Navigate to="/admin/players" replace />;
        }
        // Normal parent session expired — clear everything
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('token_expires');
        return <Navigate to="/login" replace />;
    }

    const accountStatus = localStorage.getItem('account_status') || 'Active';
    
    // If pending, force them to the checkout page
    if (accountStatus === 'Pending' && !location.pathname.includes('/parent/checkout')) {
        return <Navigate to="/parent/checkout" replace />;
    }
    
    // If active, forbid access to checkout page
    if (accountStatus === 'Active' && location.pathname.includes('/parent/checkout')) {
        return <Navigate to="/parent/dashboard" replace />;
    }

    const navItems = [
        { path: '/parent/dashboard', name: t('sidebar.dashboard'), icon: LayoutDashboard },
        { path: '/parent/child', name: t('parent.playerProfile'), icon: User },
        { path: '/parent/attendance', name: t('sidebar.attendance'), icon: CalendarCheck },
        { path: '/parent/evaluations', name: t('sidebar.evaluations'), icon: Star },
        { path: '/parent/payments', name: t('sidebar.finances'), icon: CreditCard },
        { path: '/parent/chat', name: t('sidebar.chat') || 'Chat', icon: MessageCircle }
    ];

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user_id');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 relative flex overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
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
                    <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-md" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                            <div className="hidden w-10 h-10 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-xl items-center justify-center shadow-lg transform rotate-3">
                                <GraduationCap className="text-white -rotate-3" size={22} />
                            </div>
                            <div>
                                <span className="text-xl font-extrabold text-slate-800 tracking-tight block leading-tight">{isRTL ? 'ولي الأمر' : 'Parent'}</span>
                                <span className="text-[11px] font-bold text-sky-600 tracking-wider uppercase">{isRTL ? 'بوابة' : 'Portal'}</span>
                            </div>
                        </div>
                        <button
                            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <X size={20} />
                        </button>
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
                        className={`p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-sm bg-white z-[60] relative ${isSidebarOpen ? 'hidden lg:block' : ''}`}
                    >
                        <Menu size={20} />
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        <LanguageSwitcher />
                        <NotificationsDropdown />
                        <div className="h-8 w-px bg-slate-200 mx-2 block"></div>
                        <div className="flex flex-col items-end">
                            <span className="text-sm md:text-base font-black text-indigo-700 uppercase tracking-wide truncate max-w-[150px] md:max-w-[250px]">{academyName}</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isRTL ? 'حساب ولي الأمر' : 'Parent Account'}</span>
                        </div>
                        <div className="w-11 h-11 bg-slate-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden">
                            <img src="https://ui-avatars.com/api/?name=Parent&background=0ea5e9&color=fff" alt="Parent" className="w-full h-full object-cover" />
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
        </div>
    );
};

export default ParentLayout;
