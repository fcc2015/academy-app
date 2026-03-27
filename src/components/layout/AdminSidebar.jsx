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
    TrendingDown
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

// eslint-disable-next-line no-unused-vars
const SidebarContent = ({ collapsed, setCollapsed, isRTL, dir, t, location, setMobileOpen, navGroups, handleLogout, CollapseIcon }) => (
    <div className="flex flex-col h-full overflow-hidden" dir={dir}>
        {/* Brand Header */}
        <div className={`flex items-center px-5 py-6 border-b ${collapsed ? 'justify-center' : 'justify-between'}`}
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {!collapsed && (
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain drop-shadow-md" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                        <div className="hidden w-9 h-9 rounded-xl items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 16px rgba(79,70,229,0.4)' }}>
                            <Trophy size={18} className="text-white" />
                        </div>
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-[#1e1e3f]" />
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <h2 className="text-sm font-black text-white tracking-tight leading-none">{t('common.appName')}</h2>
                        <p className="text-[9px] font-black uppercase tracking-widest mt-0.5" style={{ color: '#818cf8' }}>
                            {isRTL ? 'لوحة الإدارة' : 'Admin Panel'}
                        </p>
                    </div>
                </div>
            )}
            {collapsed && (
                <>
                <img src="/logo.png" alt="Logo" className="w-9 h-9 object-contain drop-shadow-md" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                <div className="hidden w-9 h-9 rounded-xl items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                    <Trophy size={18} className="text-white" />
                </div>
                </>
            )}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all hidden lg:flex items-center justify-center"
            >
                <CollapseIcon size={14} />
            </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
            {navGroups.map((group, gi) => (
                <div key={gi}>
                    {!collapsed && (
                        <p className={`text-[9px] font-black uppercase tracking-widest px-3 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}
                            style={{ color: 'rgba(129,140,248,0.4)' }}>
                            {group.label}
                        </p>
                    )}
                    <div className="space-y-0.5">
                        {group.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.to;
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-black text-[12px] transition-all duration-200 relative group
                                        ${collapsed ? 'justify-center' : ''}
                                        ${isActive
                                            ? 'text-white'
                                            : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                                        }
                                    `}
                                    style={isActive ? {
                                        background: 'linear-gradient(135deg, rgba(79,70,229,0.25), rgba(124,58,237,0.15))',
                                        boxShadow: '0 0 0 1px rgba(99,102,241,0.2) inset'
                                    } : undefined}
                                    title={collapsed ? t(item.labelKey) : undefined}
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <span
                                            className={`absolute inset-y-2 w-0.5 rounded-full bg-indigo-400 ${isRTL ? 'right-0' : 'left-0'}`}
                                        />
                                    )}
                                    <Icon
                                        size={16}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={`shrink-0 transition-colors ${isActive ? 'text-indigo-300' : 'text-white/30 group-hover:text-white/60'}`}
                                    />
                                    {!collapsed && (
                                        <span className="uppercase tracking-wider leading-none">{t(item.labelKey)}</span>
                                    )}
                                </NavLink>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 font-black text-[12px] uppercase tracking-wider"
            >
                <LogOut size={16} className="shrink-0" />
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
            label: isRTL ? 'الرئيسية' : 'Main',
            items: [
                { to: '/admin/dashboard', icon: LayoutDashboard, labelKey: 'sidebar.dashboard' },
                { to: '/admin/players',   icon: Users,           labelKey: 'sidebar.players' },
                { to: '/admin/coaches',   icon: ShieldAlert,     labelKey: 'sidebar.coaches' },
                { to: '/admin/squads',    icon: Users2,          labelKey: 'sidebar.squads' },
            ]
        },
        {
            label: isRTL ? 'العمليات' : 'Operations',
            items: [
                { to: '/admin/attendance',   icon: ClipboardCheck, labelKey: 'sidebar.attendance' },
                { to: '/admin/events',       icon: Calendar,       labelKey: 'sidebar.events' },
                { to: '/admin/evaluations',  icon: Star,           labelKey: 'sidebar.evaluations' },
                { to: '/admin/matches',      icon: Trophy,         labelKey: 'sidebar.matches' },
                { to: '/admin/training',     icon: Calendar,       labelKey: 'sidebar.training' },
                { to: '/admin/inventory',    icon: Package,        labelKey: 'sidebar.inventory' },
                { to: '/admin/kits',         icon: Shirt,          labelKey: 'sidebar.kits' },
            ]
        },
        {
            label: isRTL ? 'الصحة والمالية' : 'Health & Finance',
            items: [
                { to: '/admin/medical',       icon: Heart,         labelKey: 'sidebar.medical' },
                { to: '/admin/finances',      icon: DollarSign,    labelKey: 'sidebar.finances' },
                { to: '/admin/subscriptions', icon: CreditCard,    labelKey: 'sidebar.subscriptions' },
                { to: '/admin/expenses',      icon: TrendingDown,  labelKey: 'sidebar.expenses' },
            ]
        },
        {
            label: isRTL ? 'الإدارة' : 'Admin',
            items: [
                { to: '/admin/chat',     icon: MessageCircle, labelKey: 'sidebar.chat' },
                { to: '/admin/admins',   icon: Shield,  labelKey: 'sidebar.admins' },
                { to: '/admin/settings', icon: Settings, labelKey: 'sidebar.settings' },
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
                className="lg:hidden fixed top-4 z-50 p-3 rounded-xl text-white shadow-xl"
                style={{
                    [isRTL ? 'right' : 'left']: '1rem',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                }}
            >
                <Menu size={20} />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                >
                    <div
                        className={`absolute top-0 h-full w-72 flex flex-col ${isRTL ? 'right-0' : 'left-0'}`}
                        style={{ background: '#0f0c29' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setMobileOpen(false)}
                            className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} p-2 rounded-lg text-white/40 hover:text-white/70`}
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
                className={`hidden lg:flex flex-col h-screen fixed top-0 z-40 transition-all duration-300 ${isRTL ? 'right-0' : 'left-0'} ${collapsed ? 'w-[72px]' : 'w-[240px]'}`}
                style={{
                    background: 'linear-gradient(180deg, #0d0b24 0%, #14103c 50%, #0d0b24 100%)',
                    borderRight: isRTL ? 'none' : '1px solid rgba(255,255,255,0.05)',
                    borderLeft: isRTL ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
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
