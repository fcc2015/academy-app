import { API_URL } from '../config';
import { authFetch } from '../api';
import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, Info, AlertCircle, Trash2, BellRing, CheckCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const NotificationsDropdown = () => {
    const navigate = useNavigate();
    const { t, isRTL, dir } = useLanguage();
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = React.useCallback(async () => {
        try {
            const role = localStorage.getItem('role') || '';
            const userId = localStorage.getItem('user_id') || '';
            const res = await authFetch(`${API_URL}/notifications/?role=${role}&user_id=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data || []);
                setUnreadCount((data || []).filter(n => !n.is_read).length);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchNotifications();
        const idx = setInterval(fetchNotifications, 15000);
        return () => clearInterval(idx);
    }, [fetchNotifications]);

    const markAsRead = async (id, e) => {
        if (e) e.stopPropagation();
        try {
            const res = await authFetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch { /* ignore */ }
    };

    const markAllAsRead = async (e) => {
        if (e) e.stopPropagation();
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        if (!unreadIds.length) return;
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
        try {
            await Promise.all(unreadIds.map(id => authFetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' })));
        } catch { fetchNotifications(); }
    };

    const deleteNotification = async (id, e) => {
        if (e) e.stopPropagation();
        const notif = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (notif && !notif.is_read) setUnreadCount(prev => Math.max(0, prev - 1));
        try {
            await authFetch(`${API_URL}/notifications/${id}`, { method: 'DELETE' });
        } catch { fetchNotifications(); }
    };

    const deleteAll = async (e) => {
        if (e) e.stopPropagation();
        const ids = notifications.map(n => n.id);
        setNotifications([]);
        setUnreadCount(0);
        try {
            await Promise.all(ids.map(id => authFetch(`${API_URL}/notifications/${id}`, { method: 'DELETE' })));
        } catch { fetchNotifications(); }
    };

    const handleNotificationClick = async (notif, e) => {
        if (e?.target.closest('button')) return;
        if (!notif.is_read) await markAsRead(notif.id, { stopPropagation: () => {} });
        const role = localStorage.getItem('role');
        const combined = `${notif.title} ${notif.message}`.toLowerCase();
        const isPayment = ['payment', 'mad', 'دفع', 'أداء', 'paiement'].some(k => combined.includes(k));
        if (isPayment) {
            role === 'parent' ? navigate('/parent/payments') : navigate('/admin/finances');
        } else {
            if (role === 'parent') navigate('/parent/child');
            else if (role === 'coach') navigate('/coach/dashboard');
            else navigate('/admin/players');
        }
        setIsOpen(false);
    };

    const getIconConfig = (type) => {
        switch (type) {
            case 'success': return { icon: CheckCircle, color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
            case 'alert':   return { icon: AlertCircle, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
            default:        return { icon: Sparkles,    color: '#6366f1', bg: 'rgba(99,102,241,0.1)' };
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 60) return `${diffMin}m`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24) return `${diffH}h`;
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                id="notif-bell-btn"
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                style={{
                    background: isOpen ? 'rgba(99,102,241,0.1)' : 'transparent',
                    color: unreadCount > 0 ? '#6366f1' : '#94a3b8',
                }}
                title={t('notifications.title')}
            >
                {unreadCount > 0 ? <BellRing size={18} /> : <Bell size={18} />}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-black text-white rounded-full px-1"
                        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
        <div
            className={`fixed mt-2 w-[340px] rounded-2xl overflow-hidden z-[200] animate-fade-in-scale ${isRTL ? 'origin-top-left' : 'origin-top-right'}`}
            style={{
                top: '60px',
                ...(isRTL ? { left: '12px' } : { right: '12px' }),
                background: 'white',
                border: '1px solid rgba(148,163,184,0.12)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06)',
            }}
            dir={dir}
        >

                    {/* Header */}
                    <div className={`px-4 py-3.5 border-b flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}
                        style={{ borderColor: 'rgba(148,163,184,0.1)', background: '#fafbfc' }}>
                        <div className={`flex items-center gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ background: 'rgba(99,102,241,0.1)' }}>
                                <Bell size={14} style={{ color: '#6366f1' }} />
                            </div>
                            <span className="font-black text-sm text-slate-800">{t('notifications.title')}</span>
                            {unreadCount > 0 && (
                                <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                    style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                                    {unreadCount} {t('notifications.new')}
                                </span>
                            )}
                        </div>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            {unreadCount > 0 && (
                                <button onClick={markAllAsRead}
                                    className="text-[10px] font-black uppercase tracking-wider transition-colors hover:text-indigo-600"
                                    style={{ color: '#94a3b8' }}
                                    title={t('notifications.markAllRead')}>
                                    <CheckCheck size={14} />
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button onClick={deleteAll}
                                    className="text-[10px] font-black uppercase tracking-wider transition-colors hover:text-red-500"
                                    style={{ color: '#94a3b8' }}
                                    title={t('notifications.deleteAll')}>
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[340px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'rgba(148,163,184,0.08)' }}>
                                    <Bell size={20} style={{ color: '#cbd5e1' }} />
                                </div>
                                <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#cbd5e1' }}>
                                    {t('notifications.noNotifications')}
                                </p>
                            </div>
                        ) : (
                            <div>
                                {notifications.map((notif) => {
                                    const cfg = getIconConfig(notif.type);
                                    const Icon = cfg.icon;
                                    return (
                                        <div
                                            key={notif.id}
                                            className={`px-4 py-3.5 flex gap-3 cursor-pointer group transition-all duration-150 relative ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                                            style={{
                                                background: !notif.is_read ? 'rgba(99,102,241,0.03)' : 'transparent',
                                                borderBottom: '1px solid rgba(148,163,184,0.06)',
                                            }}
                                            onClick={e => handleNotificationClick(notif, e)}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.04)'}
                                            onMouseLeave={e => e.currentTarget.style.background = !notif.is_read ? 'rgba(99,102,241,0.03)' : 'transparent'}
                                        >
                                            {/* Unread dot */}
                                            {!notif.is_read && (
                                                <span className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500 ${isRTL ? 'right-1.5' : 'left-1.5'}`} />
                                            )}

                                            {/* Icon */}
                                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: cfg.bg }}>
                                                <Icon size={15} style={{ color: cfg.color }} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[12.5px] leading-tight mb-0.5 ${!notif.is_read ? 'font-black text-slate-900' : 'font-semibold text-slate-600'}`}>
                                                    {notif.title}
                                                </p>
                                                {notif.message && (
                                                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-medium">
                                                        {notif.message}
                                                    </p>
                                                )}
                                                <span className="text-[10px] font-semibold mt-1 block" style={{ color: '#cbd5e1' }} dir="ltr">
                                                    {formatTime(notif.created_at)}
                                                </span>
                                            </div>

                                            {/* Actions (hover) */}
                                            <div className={`flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                                                {!notif.is_read && (
                                                    <button
                                                        onClick={e => markAsRead(notif.id, e)}
                                                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                                                        style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}
                                                        title={t('notifications.markRead')}
                                                    >
                                                        <CheckCircle size={13} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={e => deleteNotification(notif.id, e)}
                                                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                                                    style={{ background: 'rgba(239,68,68,0.06)', color: '#ef4444' }}
                                                    title={t('notifications.deleteNotif')}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-3 border-t text-center"
                            style={{ borderColor: 'rgba(148,163,184,0.08)', background: '#fafbfc' }}>
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#cbd5e1' }}>
                                {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationsDropdown;
