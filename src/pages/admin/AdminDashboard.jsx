import { API_URL } from '../../config';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    DollarSign,
    TrendingUp,
    Calendar as CalIcon,
    Bell,
    Search,
    MoreVertical,
    PlusCircle,
    Megaphone,
    ArrowRight,
    ShieldCheck,
    UserPlus,
    CreditCard,
    CalendarPlus,
    Smartphone,
    AlertCircle,
    Clock,
    RefreshCw,
    Loader2,
    CheckCircle2,
    X
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { t, isRTL, dir, language } = useLanguage();
    const [stats, setStats] = useState({
        totalPlayers: 0,
        totalRevenue: 0,
        activeCoaches: 0,
        upcomingEvents: 0
    });
    const [activities, setActivities] = useState([]);
    const [pendingPayments, setPendingPayments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
    const [notifData, setNotifData] = useState({ title: '', message: '', target_role: '' });

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Check Cache (30 seconds)
            const lastFetch = sessionStorage.getItem('admin_dash_last_fetch');
            const cachedData = sessionStorage.getItem('admin_dash_data');
            const now = Date.now();

            if (lastFetch && cachedData && (now - parseInt(lastFetch) < 30000)) {
                const data = JSON.parse(cachedData);
                setStats(data.stats);
                setPendingPayments(data.pending);
                setActivities(data.activities);
                setIsLoading(false);
                return;
            }

            const [playersRes, paymentsRes, coachesRes, eventsRes] = await Promise.all([
                fetch(`${API_URL}/players/`).catch(() => null),
                fetch(`${API_URL}/finances/payments/`).catch(() => null),
                fetch(`${API_URL}/coaches/`).catch(() => null),
                fetch(`${API_URL}/events/`).catch(() => null)
            ]);

            const safePlayers = playersRes?.ok ? await playersRes.json().catch(() => []) : [];
            const safePayments = paymentsRes?.ok ? await paymentsRes.json().catch(() => []) : [];
            const safeCoaches = coachesRes?.ok ? await coachesRes.json().catch(() => []) : [];
            const safeEvents = eventsRes?.ok ? await eventsRes.json().catch(() => []) : [];

            // Ensure they are actually arrays
            const pArr = Array.isArray(safePlayers) ? safePlayers : [];
            const payArr = Array.isArray(safePayments) ? safePayments : [];
            const cArr = Array.isArray(safeCoaches) ? safeCoaches : [];
            const eArr = Array.isArray(safeEvents) ? safeEvents : [];

            const totalRevenue = payArr.filter(p => p && ['paid','Paid','Completed','completed'].includes(p.status)).reduce((sum, p) => sum + (p.amount || 0), 0);
            const activeCoaches = cArr.filter(c => c && (c.status === 'Active' || c.status === 'active')).length || cArr.length;

            const newStats = {
                totalPlayers: pArr.length,
                totalRevenue,
                activeCoaches,
                upcomingEvents: eArr.length
            };
            setStats(newStats);

            const unpaid = payArr.filter(p => p && ['Pending','pending','Overdue','overdue','late'].includes(p.status)).slice(0, 5);
            setPendingPayments(unpaid);

            const recentPlayers = pArr.slice(-3).reverse().map(p => ({
                type: 'registration', name: p.full_name, detail: p.u_category || (isRTL ? 'لاعب' : 'Player'), created_at: p.created_at
            }));
            const recentPayments = payArr.filter(p => p && p.status === 'Completed').slice(-3).reverse().map(p => ({
                type: 'payment', name: t('dashboard.paymentCollection'), detail: `${p.amount} ${t('common.currency')}`, created_at: p.payment_date || p.created_at
            }));
            const recentEvents = eArr.slice(-3).reverse().map(e => ({
                type: 'event', name: e.title, detail: e.event_type || t('dashboard.event'), created_at: e.event_date || e.created_at
            }));

            const combined = [...recentPlayers, ...recentPayments, ...recentEvents]
                .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                .slice(0, 8);
            setActivities(combined);

            // Update Cache
            sessionStorage.setItem('admin_dash_data', JSON.stringify({ stats: newStats, pending: unpaid, activities: combined }));
            sessionStorage.setItem('admin_dash_last_fetch', now.toString());

        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [isRTL, t]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleSendNotification = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/notifications/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: notifData.title,
                    message: notifData.message,
                    target_role: notifData.target_role || null,
                    type: 'system'
                })
            });
            if (res.ok) {
                setIsNotificationModalOpen(false);
                setNotifData({ title: '', message: '', target_role: '' });
                alert(t('dashboard.sendSuccess'));
            }
        } catch (err) {
            console.error('Failed to send notification:', err);
        }
    };

    const metricCards = [
        { title: t('dashboard.totalPlayers'), value: stats.totalPlayers, icon: Users, color: 'blue', desc: t('dashboard.registeredPlayers') },
        { title: t('dashboard.revenue'), value: `${stats.totalRevenue.toLocaleString()} ${t('common.currency')}`, icon: DollarSign, color: 'emerald', desc: t('dashboard.completedPayments') },
        { title: t('dashboard.technicalStaff'), value: stats.activeCoaches, icon: ShieldCheck, color: 'indigo', desc: t('dashboard.activeCoaches') },
        { title: t('dashboard.upcomingEvents'), value: stats.upcomingEvents, icon: CalIcon, color: 'purple', desc: t('dashboard.includingLeagues') }
    ];

    const activityIcons = {
        registration: { icon: UserPlus, bg: 'bg-blue-100 text-blue-700' },
        payment: { icon: CheckCircle2, bg: 'bg-emerald-100 text-emerald-700' },
        event: { icon: CalendarPlus, bg: 'bg-purple-100 text-purple-700' }
    };

    return (
        <div className="animate-fade-in pb-16 min-h-screen text-slate-800" dir={dir}>
            {/* Top Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        {t('common.dashboard')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">{t('common.appName')}</span>
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-2">{t('dashboard.subtitle')}</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={fetchDashboardData} className="p-3.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm active:rotate-180 duration-500 flex items-center justify-center">
                        <RefreshCw size={20} />
                    </button>
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-200 ring-4 ring-white">
                        {t('dashboard.coach')}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content Column */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {isLoading ? (
                            [1, 2, 3, 4].map((_, i) => (
                                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm animate-pulse flex flex-col items-center text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 mb-4"></div>
                                    <div className="h-8 w-24 bg-slate-100 rounded-lg mb-2"></div>
                                    <div className="h-4 w-32 bg-slate-50 rounded"></div>
                                </div>
                            ))
                        ) : metricCards.map((stat, i) => {
                            const Icon = stat.icon;
                            // Update colors to be more premium
                            const theme = {
                                blue: { bg: 'bg-blue-500', text: 'text-blue-500', lightbg: 'bg-blue-50' },
                                emerald: { bg: 'bg-emerald-500', text: 'text-emerald-500', lightbg: 'bg-emerald-50' },
                                indigo: { bg: 'bg-indigo-500', text: 'text-indigo-500', lightbg: 'bg-indigo-50' },
                                purple: { bg: 'bg-violet-500', text: 'text-violet-500', lightbg: 'bg-violet-50' }
                            }[stat.color];

                            return (
                                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group relative overflow-hidden flex flex-col items-center text-center">
                                    <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl pointer-events-none ${theme.bg}`}></div>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${theme.lightbg} ${theme.text} group-hover:scale-110 transition-transform duration-300`}>
                                        <Icon size={24} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h4 className="text-3xl font-black text-slate-800 tracking-tight mb-2">{stat.value}</h4>
                                        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{stat.title}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Operational Alerts */}
                    {!isLoading && pendingPayments.length > 0 && (
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
                            <div className="absolute top-0 bottom-0 w-2 bg-amber-500" style={{ [isRTL ? 'right' : 'left']: 0 }}></div>
                            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                                        <AlertCircle size={20} className="animate-pulse" />
                                    </div>
                                    <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-widest">{t('dashboard.pendingPayments')}</h3>
                                </div>
                                <button onClick={() => navigate('/admin/finances')} className="text-[11px] font-black uppercase text-amber-600 hover:text-amber-700 bg-amber-50 px-4 py-2 rounded-xl transition-colors">{t('dashboard.manageAll')}</button>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {pendingPayments.map((p, idx) => (
                                    <div key={idx} className="px-6 py-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-sm font-black text-amber-600 shadow-sm">
                                                {p.amount}
                                            </div>
                                            <div>
                                                <div className="text-[15px] font-black text-slate-800">{p.players?.full_name || '—'}</div>
                                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1"><span className="text-amber-500">{p.status}</span> • {p.type}</div>
                                            </div>
                                        </div>
                                        <div>
                                            {p.players?.parent_whatsapp && (
                                                <a 
                                                    href={`https://wa.me/${p.players.parent_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(isRTL ? `أكاديمية أثليتيك: تذكير بخصوص أداء مبلغ ${p.amount} درهم.` : `Athletic Academy: Reminder regarding payment of ${p.amount} MAD.`)}`}
                                                    target="_blank" rel="noreferrer"
                                                    className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                                    title={isRTL ? 'مراسلة عبر واتساب' : 'Message on WhatsApp'}
                                                >
                                                    <Smartphone size={18} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Activity Feed */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                                    <Clock size={20} />
                                </div>
                                <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">{t('dashboard.recentActivities')}</h3>
                            </div>
                            <button className="text-indigo-600 text-[11px] font-black uppercase tracking-widest hover:text-indigo-800 transition-colors flex items-center gap-2 group bg-indigo-50 px-4 py-2 rounded-xl">
                                {t('dashboard.history')} 
                                <ArrowRight size={14} className={`group-hover:${isRTL ? '-translate-x-1' : 'translate-x-1'} transition-transform ${isRTL ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        <div className="divide-y divide-slate-50 min-h-[300px]">
                            {isLoading ? (
                                [1, 2, 3].map(i => (
                                    <div key={i} className="p-8 flex items-start gap-5 animate-pulse">
                                        <div className="h-12 w-12 rounded-2xl bg-slate-100"></div>
                                        <div className="flex-1 space-y-3 pt-2">
                                            <div className="h-4 w-48 bg-slate-100 rounded-lg"></div>
                                            <div className="h-3 w-32 bg-slate-50 rounded-lg"></div>
                                        </div>
                                    </div>
                                ))
                            ) : activities.length === 0 ? (
                                <div className="py-24 text-center">
                                    <Clock size={48} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('dashboard.noActivity')}</p>
                                </div>
                            ) : activities.map((item, i) => {
                                const config = activityIcons[item.type] || activityIcons.event;
                                const Icon = config.icon;
                                return (
                                    <div key={i} className="p-6 flex items-start gap-5 hover:bg-slate-50/80 transition-all cursor-pointer group">
                                        <div className={`h-14 w-14 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-sm ${config.bg} group-hover:scale-110 transition-transform duration-300`}>
                                            <Icon size={24} />
                                        </div>
                                        <div className="flex-1 min-w-0 pt-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-[16px] font-black text-slate-800 group-hover:text-indigo-600 transition-colors tracking-tight">
                                                        {item.type === 'registration' ? `${t('dashboard.newRegistration')}: ${item.name}` :
                                                            item.type === 'payment' ? `${t('dashboard.paymentCollection')}` :
                                                                `${t('dashboard.event')}: ${item.name}`}
                                                    </p>
                                                    <p className="text-xs font-bold text-slate-500 mt-1">{item.detail}</p>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200" dir="ltr">
                                                    {item.created_at ? new Date(item.created_at).toLocaleDateString(language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-FR' : 'en-GB') : '—'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right/Side Column */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Quick Access Grid */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 relative overflow-hidden">
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
                        <h3 className="font-extrabold text-slate-800 text-xl mb-8 relative z-10 flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                                <PlusCircle size={20} />
                            </div>
                            {t('dashboard.quickActions')}
                        </h3>
                        
                        <div className="flex flex-col gap-4 relative z-10">
                            <button
                                onClick={() => navigate('/admin/players')}
                                className="w-full flex items-center gap-4 p-5 bg-white border-2 border-slate-100 rounded-2xl group hover:border-blue-500 hover:shadow-lg hover:shadow-blue-100 transition-all text-left rtl:text-right"
                            >
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                    <UserPlus size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-black text-slate-800">{t('dashboard.addPlayer')}</h4>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{isRTL ? 'إضافة عضو جديد للأكاديمية' : 'Register new member'}</p>
                                </div>
                            </button>

                            <button
                                onClick={() => setIsNotificationModalOpen(true)}
                                className="w-full flex items-center gap-4 p-5 bg-white border-2 border-slate-100 rounded-2xl group hover:border-purple-500 hover:shadow-lg hover:shadow-purple-100 transition-all text-left rtl:text-right"
                            >
                                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-all">
                                    <Megaphone size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-black text-slate-800">{t('dashboard.sendNotification')}</h4>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{isRTL ? 'إرسال إشعار عام للجميع' : 'Send push notification'}</p>
                                </div>
                            </button>

                            <button
                                onClick={() => navigate('/admin/squads')}
                                className="w-full flex items-center gap-4 p-5 bg-white border-2 border-slate-100 rounded-2xl group hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-100 transition-all text-left rtl:text-right"
                            >
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                    <CalendarPlus size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-black text-slate-800">{t('dashboard.createProgram')}</h4>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{isRTL ? 'جدولة حصة تدريبية' : 'Schedule training session'}</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Modal */}
            {isNotificationModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" dir={dir}>
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center p-8 border-b border-slate-50 bg-slate-50/50">
                            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                <Megaphone className="text-purple-600" size={24} /> {t('dashboard.sendNotification')}
                            </h2>
                            <button onClick={() => setIsNotificationModalOpen(false)} className="text-slate-400 hover:text-slate-800 bg-white shadow-sm p-2 rounded-xl transition-all border border-slate-100">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSendNotification} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-widest mb-3">{isRTL ? 'عنوان الإعلان' : 'Announcement Title'}</label>
                                <input 
                                    required 
                                    type="text" 
                                    value={notifData.title} 
                                    onChange={(e) => setNotifData({ ...notifData, title: e.target.value })} 
                                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-purple-500 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all"
                                    placeholder={isRTL ? 'مثال: عطلة العيد...' : 'e.g. Holiday...'}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-widest mb-3">{isRTL ? 'نص الرسالة' : 'Message Text'}</label>
                                <textarea 
                                    required 
                                    rows="4"
                                    value={notifData.message} 
                                    onChange={(e) => setNotifData({ ...notifData, message: e.target.value })} 
                                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-purple-500 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all resize-none"
                                    placeholder={isRTL ? 'اكتب تفاصيل الإعلان هنا...' : 'Write details here...'}
                                ></textarea>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-widest mb-3">{isRTL ? 'الفئة المستهدفة' : 'Target Audience'}</label>
                                <select 
                                    value={notifData.target_role} 
                                    onChange={(e) => setNotifData({ ...notifData, target_role: e.target.value })} 
                                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-purple-500 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">{isRTL ? 'الجميع (All)' : 'Everyone'}</option>
                                    <option value="parent">{isRTL ? 'أولياء الأمور واللاعبين' : 'Parents & Players'}</option>
                                    <option value="coach">{isRTL ? 'المدربون والطاقم التقني' : 'Coaches & Staff'}</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                <button type="button" onClick={() => setIsNotificationModalOpen(false)} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                                    {t('common.cancel')}
                                </button>
                                <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-8 py-4 text-xs font-black uppercase tracking-widest text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all">
                                    <Megaphone size={18} />
                                    <span>{t('dashboard.sendNotification')}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
