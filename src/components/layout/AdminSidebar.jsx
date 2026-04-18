import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    ShieldAlert,
    DollarSign,
    Calendar,
    Settings,
    LogOut,
    Trophy,
    Star,
    Users2,
    ClipboardCheck,
    CreditCard,
    Shield,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    MessageCircle,
    Menu,
    X,
    Package,
    Shirt,
    Heart,
    TrendingDown,
    UserCheck
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const SidebarContent = ({ collapsed, setCollapsed, isRTL, dir, t, location, setMobileOpen, navGroups, handleLogout, CollapseIcon }) => (
    <div className="flex flex-col h-full bg-white border-r border-surface-200 overflow-hidden" dir={dir}>
        {/* Brand Header */}
        <div className={`flex items-center px-5 py-5 border-b border-surface-200 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded shrink-0 bg-surface-900 flex items-center justify-center text-white">
                        <Trophy size={16} />
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <h2 className="text-sm font-semibold text-surface-900 leading-none">{t('common.appName')}</h2>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-surface-500 mt-1">
                            {t('ui.adminPanel')}
                        </p>
                    </div>
                </div>
            )}
            {collapsed && (
                <div className="w-8 h-8 rounded bg-surface-900 flex items-center justify-center text-white">
                    <Trophy size={16} />
                </div>
            )}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1 rounded-md text-surface-400 hover:text-surface-600 hover:bg-surface-50 transition-colors hidden lg:flex items-center justify-center"
            >
                <CollapseIcon size={16} />
            </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
            {navGroups.map((group, gi) => (
                <div key={gi}>
                    {!collapsed && (
                        <p className={`text-[10px] font-semibold uppercase tracking-wider px-3 mb-2 text-surface-400 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {group.label}
                        </p>
                    )}
                    <div className="space-y-1">
                        {group.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.to;
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setMobileOpen(false)}
                                    className={`nav-item relative ${collapsed ? 'justify-center px-0' : ''} ${isActive ? 'active' : ''}`}
                                    title={collapsed ? t(item.labelKey) : undefined}
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <span
                                            className={`absolute inset-y-1 w-[3px] rounded-full bg-surface-900 ${isRTL ? 'right-0' : 'left-0'}`}
                                        />
                                    )}
                                    <Icon
                                        size={18}
                                        className={`shrink-0 transition-colors ${isActive ? 'text-surface-900' : 'text-surface-500 group-hover:text-surface-700'}`}
                                    />
                                    {!collapsed && (
                                        <span className={`tracking-wide ${isActive ? 'font-semibold' : 'font-medium'}`}>{t(item.labelKey)}</span>
                                    )}
                                </NavLink>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-surface-200">
            <button
                onClick={handleLogout}
                className={`flex items-center w-full px-3 py-2.5 rounded-md text-red-600 hover:bg-red-50 transition-colors text-sm font-medium ${collapsed ? 'justify-center px-0' : 'gap-3'}`}
            >
                <LogOut size={18} className="shrink-0" />
                {!collapsed && <span>{t('common.logout')}</span>}
            </button>
        </div>
    </div>
);

const AdminSidebar = ({ collapsed, setCollapsed }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t, isRTL, dir } = useLanguage();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('token_expires');
        navigate('/login');
    };

    const navGroups = [
        {
            label: t('ui.main'),
            items: [
                { to: '/admin/dashboard', icon: LayoutDashboard, labelKey: 'sidebar.dashboard' },
                { to: '/admin/players',   icon: Users,           labelKey: 'sidebar.players' },
                { to: '/admin/coaches',   icon: ShieldAlert,     labelKey: 'sidebar.coaches' },
                { to: '/admin/squads',    icon: Users2,          labelKey: 'sidebar.squads' },
            ]
        },
        {
            label: t('ui.operations'),
            items: [
                { to: '/admin/attendance',   icon: ClipboardCheck, labelKey: 'sidebar.attendance' },
                { to: '/admin/events',       icon: Calendar,       labelKey: 'sidebar.events' },
                { to: '/admin/tournaments',  icon: Trophy,         labelKey: 'sidebar.tournaments' },
                { to: '/admin/tryouts',      icon: Sparkles,       labelKey: 'sidebar.tryouts' },
                { to: '/admin/evaluations',  icon: Star,           labelKey: 'sidebar.evaluations' },
                { to: '/admin/matches',      icon: Trophy,         labelKey: 'sidebar.matches' },
                { to: '/admin/tactics',      icon: Users,          labelKey: 'sidebar.tactics' },
                { to: '/admin/training',     icon: Calendar,       labelKey: 'sidebar.training' },
                { to: '/admin/inventory',    icon: Package,        labelKey: 'sidebar.inventory' },
                { to: '/admin/kits',         icon: Shirt,          labelKey: 'sidebar.kits' },
            ]
        },
        {
            label: t('ui.healthFinance'),
            items: [
                { to: '/admin/medical',       icon: Heart,         labelKey: 'sidebar.medical' },
                { to: '/admin/finances',      icon: DollarSign,    labelKey: 'sidebar.finances' },
                { to: '/admin/subscriptions', icon: CreditCard,    labelKey: 'sidebar.subscriptions' },
                { to: '/admin/expenses',      icon: TrendingDown,  labelKey: 'sidebar.expenses' },
            ]
        },
        {
            label: t('ui.admin'),
            items: [
                { to: '/admin/chat',            icon: MessageCircle, labelKey: 'sidebar.chat' },
                { to: '/admin/pending-parents', icon: UserCheck,     labelKey: 'sidebar.pendingParents' },
                { to: '/admin/admins',          icon: Shield,        labelKey: 'sidebar.admins' },
                { to: '/admin/settings',        icon: Settings,      labelKey: 'sidebar.settings' },
            ]
        }
    ];

    const CollapseIcon = isRTL
        ? (collapsed ? ChevronLeft : ChevronRight)
        : (collapsed ? ChevronRight : ChevronLeft);

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-3 z-50 p-2 rounded-md bg-white border border-surface-200 text-surface-700 shadow-sm"
                style={{
                    [isRTL ? 'right' : 'left']: '1rem'
                }}
            >
                <Menu size={20} />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-surface-900/40 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                >
                    <div
                        className={`absolute top-0 h-full w-72 flex flex-col bg-white ${isRTL ? 'right-0' : 'left-0'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setMobileOpen(false)}
                            className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-2 rounded-md text-surface-400 hover:bg-surface-50`}
                        >
                            <X size={20} />
                        </button>
                        <SidebarContent
                            collapsed={false}
                            setCollapsed={setCollapsed}
                            isRTL={isRTL}
                            dir={dir}
                            t={t}
                            location={location}
                            setMobileOpen={setMobileOpen}
                            navGroups={navGroups}
                            handleLogout={handleLogout}
                            CollapseIcon={CollapseIcon}
                        />
                    </div>
                </div>
            )}

            {/* Desktop Sidebar */}
            <aside
                className={`hidden lg:flex flex-col h-screen fixed top-0 z-40 transition-all duration-300 bg-white ${isRTL ? 'right-0' : 'left-0'} ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}
            >
                <SidebarContent
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    isRTL={isRTL}
                    dir={dir}
                    t={t}
                    location={location}
                    setMobileOpen={setMobileOpen}
                    navGroups={navGroups}
                    handleLogout={handleLogout}
                    CollapseIcon={CollapseIcon}
                />
            </aside>
        </>
    );
};

export default AdminSidebar;
