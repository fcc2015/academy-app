import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Calendar,
    DollarSign,
    Settings
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const BottomNav = () => {
    const { t, dir } = useLanguage();
    const location = useLocation();

    const navItems = [
        { to: '/admin/dashboard', icon: LayoutDashboard, labelKey: 'sidebar.dashboard' },
        { to: '/admin/players',   icon: Users,           labelKey: 'sidebar.players'   },
        { to: '/admin/events',    icon: Calendar,        labelKey: 'sidebar.events'     },
        { to: '/admin/finances',  icon: DollarSign,      labelKey: 'sidebar.finances'   },
        { to: '/admin/settings',  icon: Settings,        labelKey: 'sidebar.settings'   },
    ];

    return (
        <div
            className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
            style={{
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(8px)',
                borderTop: '1px solid rgba(148,163,184,0.12)',
                boxShadow: '0 -4px 24px rgba(0,0,0,0.05)',
            }}
            dir={dir}
        >
            <div className="flex justify-around items-center px-2 pt-2 pb-safe pb-4">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className="flex flex-col items-center gap-1 min-w-0 flex-1 transition-all duration-200 py-1"
                            style={{ color: isActive ? '#4f46e5' : '#94a3b8' }}
                        >
                            <div
                                className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200"
                                style={{
                                    background: isActive ? 'rgba(79,70,229,0.1)' : 'transparent',
                                    transform: isActive ? 'scale(1.1)' : 'scale(1)',
                                }}
                            >
                                <Icon size={19} strokeWidth={isActive ? 2.5 : 1.8} />
                            </div>
                            <span
                                className="text-[8px] font-black uppercase tracking-wider leading-none truncate max-w-full px-1"
                                style={{ color: isActive ? '#4f46e5' : '#94a3b8' }}
                            >
                                {t(item.labelKey)}
                            </span>
                        </NavLink>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
