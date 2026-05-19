import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    ShieldAlert,
    DollarSign,
    Calendar,
    CalendarClock,
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
    UserCheck,
    Building2,
    Sparkles as SubscriptionIcon
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { usePlan } from '../../hooks/usePlan';
import { API_URL } from '../../config';
import { authFetch } from '../../api';

// Map notification content → sidebar route
const mapNotifToRoute = (notif) => {
    const text = `${notif.title || ''} ${notif.message || ''} ${notif.type || ''}`.toLowerCase();
    if (['player', 'joueur', 'لاعب', 'inscription'].some(k => text.includes(k))) return '/admin/players';
    if (['payment', 'paiement', 'دفع', 'أداء', 'mad', 'finance'].some(k => text.includes(k))) return '/admin/finances';
    if (['coach', 'مدرب', 'entraîneur'].some(k => text.includes(k))) return '/admin/coaches';
    if (['attendance', 'حضور', 'présence'].some(k => text.includes(k))) return '/admin/attendance';
    if (['event', 'حدث', 'événement'].some(k => text.includes(k))) return '/admin/events';
    if (['tournament', 'بطولة', 'tournoi'].some(k => text.includes(k))) return '/admin/tournaments';
    if (['evaluation', 'تقييم', 'évaluation'].some(k => text.includes(k))) return '/admin/evaluations';
    if (['match', 'مباراة'].some(k => text.includes(k))) return '/admin/matches';
    if (['chat', 'message', 'رسالة'].some(k => text.includes(k))) return '/admin/chat';
    if (['subscription', 'اشتراك', 'abonnement'].some(k => text.includes(k))) return '/admin/subscriptions';
    if (['medical', 'طبي', 'médical', 'blessure', 'إصابة'].some(k => text.includes(k))) return '/admin/medical';
    if (['kit', 'shirt', 'قميص'].some(k => text.includes(k))) return '/admin/kits';
    if (['inventory', 'مخزون', 'inventaire'].some(k => text.includes(k))) return '/admin/inventory';
    if (['branch', 'فرع'].some(k => text.includes(k))) return '/admin/branches';
    if (['parent', 'ولي'].some(k => text.includes(k))) return '/admin/pending-parents';
    if (['expense', 'مصروف', 'dépense'].some(k => text.includes(k))) return '/admin/expenses';
    return '/admin/dashboard';
};

const SidebarContent = ({ collapsed, setCollapsed, isRTL, dir, t, location, setMobileOpen, navGroups, handleLogout, CollapseIcon, academyName, role, branchesAssigned, routeBadges = {} }) => (
    <div className="flex flex-col h-full bg-white border-r border-surface-200 overflow-hidden" dir={dir}>
        {/* Brand Header */}
        <div className={`flex items-center px-5 py-5 border-b border-surface-200 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded shrink-0 bg-surface-900 flex items-center justify-center text-white">
                        <Trophy size={16} />
                    </div>
                    <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <h2 className="text-sm font-semibold text-surface-900 leading-none truncate">
                            {academyName || t('common.appName')}
                        </h2>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-surface-500 mt-1 truncate">
                            {role === 'sous_admin'
                                ? (branchesAssigned.length === 1
                                    ? `${isRTL ? 'فرع: ' : 'Branch: '}${branchesAssigned[0].name}`
                                    : (branchesAssigned.length > 1
                                        ? (isRTL ? `${branchesAssigned.length} فروع` : `${branchesAssigned.length} branches`)
                                        : (isRTL ? 'مسؤول فرع' : 'Branch admin')))
                                : t('ui.adminPanel')}
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
                                        <span className={`tracking-wide flex-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>{t(item.labelKey)}</span>
                                    )}
                                    {/* Notification badge */}
                                    {(routeBadges[item.to] || 0) > 0 && (
                                        <span className={`${collapsed ? 'absolute -top-0.5 -right-0.5' : ''} min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-black text-white rounded-full px-1 shrink-0`}
                                            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 2px 8px rgba(239,68,68,0.4)', animation: 'pulse 2s infinite' }}>
                                            {routeBadges[item.to] > 9 ? '9+' : routeBadges[item.to]}
                                        </span>
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
    const { hasFeature, academyName, branchesAssigned } = usePlan();
    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [routeBadges, setRouteBadges] = useState({});

    // Fetch unread notifications and map to sidebar routes
    const fetchBadges = useCallback(async () => {
        try {
            const userId = localStorage.getItem('user_id') || '';
            const r = localStorage.getItem('role') || '';
            const res = await authFetch(`${API_URL}/notifications/?role=${r}&user_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                const unread = (data || []).filter(n => !n.is_read);
                const badges = {};
                unread.forEach(n => {
                    const route = mapNotifToRoute(n);
                    badges[route] = (badges[route] || 0) + 1;
                });
                setRouteBadges(badges);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        fetchBadges();
        const iv = setInterval(fetchBadges, 15000);
        return () => clearInterval(iv);
    }, [fetchBadges]);

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
                { to: '/admin/matches',      icon: CalendarClock,  labelKey: 'sidebar.matches' },
                { to: '/admin/tactics',      icon: Users,          labelKey: 'sidebar.tactics' },
                { to: '/admin/training',     icon: Calendar,       labelKey: 'sidebar.training' },
                { to: '/admin/inventory',    icon: Package,        labelKey: 'sidebar.inventory' },
                { to: '/admin/kits',         icon: Shirt,          labelKey: 'sidebar.kits' },
                { to: '/admin/equipment-settings', icon: Settings, labelKey: 'sidebar.equipmentSettings' },
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
                { to: '/admin/programmateur',   icon: CalendarClock, labelKey: 'sidebar.programmateur' },
                ...(hasFeature('branches') ? [{ to: '/admin/branches', icon: Building2, labelKey: 'sidebar.branches' }] : []),
                { to: '/admin/subscription', icon: SubscriptionIcon, labelKey: 'sidebar.subscription' },
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
                            academyName={academyName}
                            role={role}
                            branchesAssigned={branchesAssigned}
                            routeBadges={routeBadges}
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
                    academyName={academyName}
                    role={role}
                    branchesAssigned={branchesAssigned}
                    routeBadges={routeBadges}
                />
            </aside>
        </>
    );
};

export default AdminSidebar;
