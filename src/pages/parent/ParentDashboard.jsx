import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CalendarCheck,
    Star,
    CreditCard,
    TrendingUp,
    User,
    Clock,
    CheckCircle2,
    AlertCircle,
    BellRing,
    IdCard,
    Trophy,
    MapPin
} from 'lucide-react';
import PlayerBadgeModal from '../../components/PlayerBadgeModal';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../components/Toast';
import { SkeletonDashboard } from '../../components/Skeleton';

const ParentDashboard = () => {
    const toast = useToast();
    const { t, isRTL, dir } = useLanguage();
    const navigate = useNavigate();
    const [childData, setChildData] = useState(null);
    const [subscriptionData, setSubscriptionData] = useState(null);
    const [payments, setPayments] = useState([]);
    const [attendanceRate, setAttendanceRate] = useState('N/A');
    const [performanceScore, setPerformanceScore] = useState('N/A');
    const [upcomingEvent, setUpcomingEvent] = useState(null);
    const [upcomingMatch, setUpcomingMatch] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
    const userId = localStorage.getItem('user_id');

    const fetchData = async () => {
        try {
            // 1. Check Cache
            const cachedChild = sessionStorage.getItem(`child_data_${userId}`);
            const cachedDashData = sessionStorage.getItem(`parent_dash_data_${userId}`);
            const lastFetch = sessionStorage.getItem(`parent_dash_last_fetch_${userId}`);
            const now = Date.now();

            if (cachedChild) {
                setChildData(JSON.parse(cachedChild));
            }

            if (cachedDashData && lastFetch && (now - parseInt(lastFetch) < 60000)) {
                const data = JSON.parse(cachedDashData);
                setAttendanceRate(data.attendanceRate);
                setPerformanceScore(data.performanceScore);
                setPayments(data.payments);
                setUpcomingEvent(data.upcomingEvent);
                setSubscriptionData(data.subscriptionData);
                setUpcomingMatch(data.upcomingMatch);
                setIsLoading(false);
                if (cachedChild) return; // Full cache hit
            }

            // 2. Fetch targeted player
            const playersRes = await authFetch(`${API_URL}/players/parent/${userId}`).catch(() => null);
            let child = null;
            if (playersRes?.ok) {
                const parentsPlayers = await playersRes.json().catch(() => []);
                if (Array.isArray(parentsPlayers) && parentsPlayers.length > 0) {
                    child = parentsPlayers[0];
                }
                
                // DEV FALLBACK
                if (!child) {
                    const selfRes = await authFetch(`${API_URL}/players/parent/${userId}`).catch(() => null);
                    if (selfRes?.ok) {
                        const all = await selfRes.json().catch(() => []);
                        if (Array.isArray(all)) {
                            child = all.find(p => p.user_id === userId);
                        }
                    }
                }
                
                setChildData(child);
                if (child) sessionStorage.setItem(`child_data_${userId}`, JSON.stringify(child));
            }

            if (child) {
                const [attendRes, evalRes, payRes, eventsRes, subRes, matchRes] = await Promise.all([
                    authFetch(`${API_URL}/attendance/player/${child.user_id}`).catch(() => null),
                    authFetch(`${API_URL}/evaluations/?player_id=${child.user_id}`).catch(() => null),
                    authFetch(`${API_URL}/finances/payments/user/${userId}`).catch(() => null),
                    authFetch(`${API_URL}/events/`).catch(() => null),
                    authFetch(`${API_URL}/finances/subscriptions/player/${child.user_id}`).catch(() => null),
                    authFetch(`${API_URL}/matches/player/${child.user_id}`).catch(() => null)
                ]);

                let dashData = {
                    attendanceRate: '0%',
                    performanceScore: '0/10',
                    payments: [],
                    upcomingEvent: null,
                    subscriptionData: null,
                    upcomingMatch: null
                };

                if (attendRes?.ok) {
                    const attendance = await attendRes.json().catch(() => []);
                    if (Array.isArray(attendance) && attendance.length > 0) {
                        const present = attendance.filter(a => a && a.status === 'present').length;
                        dashData.attendanceRate = `${Math.round((present / attendance.length) * 100)}%`;
                    }
                }

                if (evalRes?.ok) {
                    const evaluations = await evalRes.json().catch(() => []);
                    if (Array.isArray(evaluations) && evaluations.length > 0) {
                        const avgRating = evaluations.reduce((sum, e) => sum + (e.overall_rating || 0), 0) / evaluations.length;
                        dashData.performanceScore = `${avgRating.toFixed(1)}/10`;
                    }
                }

                if (payRes?.ok) {
                    const allPayments = await payRes.json().catch(() => []);
                    if (Array.isArray(allPayments)) {
                        dashData.payments = allPayments.slice(0, 5);
                    }
                }

                if (eventsRes?.ok) {
                    const allEvents = await eventsRes.json().catch(() => []);
                    if (Array.isArray(allEvents)) {
                        const today = new Date();
                        const upcoming = allEvents.filter(e => e && new Date(e.event_date) >= today).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
                        if (upcoming.length > 0) dashData.upcomingEvent = upcoming[0];
                    }
                }

                if (subRes?.ok) {
                    dashData.subscriptionData = await subRes.json().catch(() => null);
                }

                if (matchRes?.ok) {
                    const allMatches = await matchRes.json().catch(() => []);
                    if (Array.isArray(allMatches)) {
                        const today = new Date();
                        const upcomingM = allMatches.filter(e => e && new Date(e.match_date) >= today).sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
                        if (upcomingM.length > 0) dashData.upcomingMatch = upcomingM[0];
                    }
                }

                setAttendanceRate(dashData.attendanceRate);
                setPerformanceScore(dashData.performanceScore);
                setPayments(dashData.payments);
                setUpcomingEvent(dashData.upcomingEvent);
                setSubscriptionData(dashData.subscriptionData);
                setUpcomingMatch(dashData.upcomingMatch);

                // Cache it
                sessionStorage.setItem(`parent_dash_data_${userId}`, JSON.stringify(dashData));
                sessionStorage.setItem(`parent_dash_last_fetch_${userId}`, now.toString());
            }
        } catch (error) {
            console.error('Performance Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const handleSendTestNotif = async () => {
        setIsSendingTest(true);
        try {
            const res = await authFetch(`${API_URL}/finances/test-notification/${userId}`, { method: 'POST' });
            if (res.ok) {
                toast.success(isRTL ? 'تم إرسال تنبيه تجريبي! تحقق من أيقونة الجرس في الأعلى.' : 'Test notification sent! Check the bell icon.');
            }
        } catch {
            toast.error(isRTL ? 'فشل إرسال التنبيه' : 'Failed to send notification');
        } finally {
            setIsSendingTest(false);
        }
    };

    if (isLoading) {
        return <SkeletonDashboard />;
    }

    const getPaymentStatus = () => {
        if (!subscriptionData) return { label: isRTL ? 'عادي' : 'Up to date', color: 'indigo' };
        const status = subscriptionData.alert_status;
        if (status === 'approaching') return { label: isRTL ? 'اقتراب الأداء' : 'Upcoming Payment', color: 'blue' };
        if (status === 'late') return { label: isRTL ? 'متأخر' : 'Overdue', color: 'amber' };
        if (status === 'suspended') return { label: isRTL ? 'موقوف' : 'Suspended', color: 'red' };
        return { label: isRTL ? 'عادي' : 'Up to date', color: 'emerald' };
    };

    const payStat = getPaymentStatus();

    const quickStats = [
        {
            label: isRTL ? 'حالة اللاعب' : 'Player Status',
            value: childData ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير متاح' : 'N/A'),
            icon: User,
            color: 'sky',
            bg: 'bg-sky-50',
            text: 'text-sky-600',
            border: 'border-sky-100'
        },
        {
            label: isRTL ? 'معدل الحضور' : 'Attendance Rate',
            value: attendanceRate,
            icon: CalendarCheck,
            color: 'emerald',
            bg: 'bg-emerald-50',
            text: 'text-emerald-600',
            border: 'border-emerald-100'
        },
        {
            label: isRTL ? 'التقييم التقني' : 'Performance Score',
            value: performanceScore,
            icon: Star,
            color: 'amber',
            bg: 'bg-amber-50',
            text: 'text-amber-600',
            border: 'border-amber-100'
        },
        {
            label: isRTL ? 'الوضع المالي' : 'Financial Status',
            value: payStat.label,
            icon: CreditCard,
            color: payStat.color,
            bg: payStat.color === 'emerald' ? 'bg-emerald-50' : payStat.color === 'blue' ? 'bg-blue-50' : payStat.color === 'amber' ? 'bg-amber-50' : payStat.color === 'red' ? 'bg-red-50' : 'bg-indigo-50',
            text: payStat.color === 'emerald' ? 'text-emerald-600' : payStat.color === 'blue' ? 'text-blue-600' : payStat.color === 'amber' ? 'text-amber-600' : payStat.color === 'red' ? 'text-red-600' : 'text-indigo-600',
            border: payStat.color === 'emerald' ? 'border-emerald-100' : payStat.color === 'blue' ? 'border-blue-100' : payStat.color === 'amber' ? 'border-amber-100' : payStat.color === 'red' ? 'border-red-100' : 'border-indigo-100'
        }
    ];

    return (
        <div className={`animate-fade-in space-y-8 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Subscription Alert Banner */}
            {subscriptionData?.alert_status && subscriptionData.alert_status !== 'none' && (
                <div className={`p-4 rounded-2xl border flex items-center justify-between animate-pulse ${isRTL ? 'flex-row-reverse' : ''} ${
                    subscriptionData.alert_status === 'approaching' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                    subscriptionData.alert_status === 'late' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                    'bg-red-50 border-red-200 text-red-700'
                }`}>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <AlertCircle size={24} />
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                            <p className="font-black text-sm uppercase tracking-tight">{t('finances.paymentAlert') || (isRTL ? 'إشعار الأداء المالي' : 'Payment Alert')}</p>
                            <p className="text-xs font-bold opacity-80">{t('parent.attentionRequiredMsg') || (isRTL ? 'نود تذكيركم بضرورة تسوية مبلغ الاشتراك في أقرب وقت لضمان استمرار الخدمة.' : 'Please settle the subscription amount as soon as possible to ensure uninterrupted service.')}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/parent/payments')}
                        className="px-5 py-2 bg-white rounded-xl shadow-sm border border-current font-black text-[10px] uppercase hover:bg-slate-50 transition-all shrink-0"
                    >
                        {t('parent.viewDetails') || (isRTL ? 'عرض التفاصيل' : 'View Details')}
                    </button>
                </div>
            )}

            {/* Header */}
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                        {isRTL ? 'مرحباً بك، ' : 'Welcome, '} <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">{isRTL ? 'ولي الأمر' : 'Parent'}</span>
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">
                        {childData ? (isRTL ? `متابعة مسار وتطور ${childData.full_name}` : `Following the progress of ${childData.full_name}`) : (isRTL ? 'نظرة عامة على نشاط طفلك في الأكاديمية' : 'Overview of your child\'s academy activity')}
                    </p>
                </div>
                <button
                    onClick={handleSendTestNotif}
                    disabled={isSendingTest}
                    className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                    <BellRing size={16} className={isSendingTest ? 'animate-bounce' : ''} />
                    {isSendingTest ? (isRTL ? 'جاري الإرسال...' : 'Sending...') : (isRTL ? 'اختبار تنبيه الأداء' : 'Test Notification')}
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {quickStats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 premium-shadow group hover:border-sky-300 transition-all relative overflow-hidden">
                            <div className={`absolute top-0 ${isRTL ? 'left-0' : 'right-0'} p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                                <Icon size={80} />
                            </div>
                            <div className={`flex items-center justify-between mb-4 relative z-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className={`p-3 rounded-xl border ${stat.bg} ${stat.text} ${stat.border}`}>
                                    <Icon size={22} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h4 className="text-2xl font-black text-slate-800 tracking-tight mb-1">{stat.value}</h4>
                                <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Child Info Card */}
                {childData && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden p-2">
                        <div className={`px-6 py-5 rounded-3xl bg-sky-50 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <User size={20} className="text-sky-600" />
                                <h3 className="font-extrabold text-slate-800 text-lg">{isRTL ? 'ملف اللاعب' : 'Player Profile'}</h3>
                            </div>
                            <button 
                                onClick={() => setIsBadgeModalOpen(true)}
                                className={`flex items-center gap-2 px-4 py-2 bg-white border border-sky-200 rounded-xl text-sky-600 font-bold text-xs hover:bg-sky-50 transition-all shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}
                            >
                                <IdCard size={16} />
                                {isRTL ? 'بطاقة اللاعب' : 'Player Card'}
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0">
                                    {childData.full_name?.[0] || '?'}
                                </div>
                                <div>
                                    <h4 className="text-xl font-extrabold text-slate-900">{childData.full_name}</h4>
                                    <p className="text-sm font-medium text-slate-500">{childData.u_category || childData.category || (isRTL ? 'غير محدد' : 'Unspecified')}</p>
                                </div>
                            </div>
                            <div className={`grid grid-cols-2 gap-4 mt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                                <div className="bg-slate-50 rounded-2xl p-4">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{isRTL ? 'المركز' : 'Position'}</p>
                                    <p className="text-sm font-bold text-slate-800">{childData.position || (isRTL ? 'غير محدد' : 'Unspecified')}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{isRTL ? 'الفئة' : 'Category'}</p>
                                    <p className="text-sm font-bold text-slate-800">{childData.u_category || childData.category || 'N/A'}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{isRTL ? 'الحالة' : 'Status'}</p>
                                    <p className={`text-sm font-bold ${
                                        childData.account_status === 'Active' ? 'text-emerald-600' :
                                        childData.account_status === 'Suspended' ? 'text-red-600' :
                                        childData.account_status === 'Pending' ? 'text-amber-600' : 'text-slate-600'
                                    }`}>{childData.account_status || (isRTL ? 'نشط' : 'Active')}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{isRTL ? 'تاريخ الانضمام' : 'Joined On'}</p>
                                    <p className={`text-sm font-bold text-slate-800 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                                        {childData.created_at ? new Date(childData.created_at).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Payments */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden p-2">
                    <div className={`px-6 py-5 rounded-3xl bg-slate-50 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <CreditCard size={20} className="text-indigo-600" />
                        <h3 className="font-extrabold text-slate-800 text-lg">{isRTL ? 'المدفوعات الأخيرة' : 'Recent Payments'}</h3>
                    </div>
                    <div className="divide-y divide-slate-100 px-2">
                        {payments.length === 0 ? (
                            <div className="p-10 text-center text-slate-400 font-bold italic">{isRTL ? 'لا توجد سجلات مالية متوفرة.' : 'No financial records available.'}</div>
                        ) : payments.map((payment, i) => (
                            <div key={i} className={`p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${payment.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {payment.status === 'paid' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{payment.payment_type === 'subscription' ? (isRTL ? 'اشتراك شهري' : 'Monthly Subscription') : (isRTL ? 'رسوم متفرقة' : 'Other Fees')}</p>
                                        <p className={`text-xs text-slate-500 ${isRTL ? 'text-right' : 'text-left'}`} dir="ltr">
                                            {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <span className={`font-black text-slate-900 bg-slate-100 flex items-center gap-1.5 px-3 py-1 rounded-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <span>{payment.amount}</span> <span>{t('finances.currency') || (isRTL ? 'درهم' : 'MAD')}</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Next Training */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[2.5rem] border border-indigo-100 premium-shadow p-6 sm:p-8">
                <div className={`flex items-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                        <CalendarCheck size={24} strokeWidth={2.5} />
                    </div>
                    <h3 className="font-black text-slate-800 text-xl tracking-tight">{isRTL ? 'الجدول القادم' : 'Upcoming Schedule'}</h3>
                </div>
                {upcomingEvent ? (
                    <div className={`bg-white/80 rounded-3xl p-6 border border-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                            <div className="w-14 h-14 bg-indigo-600 rounded-2xl text-white flex flex-col items-center justify-center flex-shrink-0">
                                <span className="text-xs font-black uppercase tracking-widest">{new Date(upcomingEvent.event_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US', { month: 'short' })}</span>
                                <span className="text-xl font-extrabold leading-tight">{new Date(upcomingEvent.event_date).getDate()}</span>
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-slate-900">{upcomingEvent.title}</h4>
                                <div className={`flex items-center gap-2 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <p className={`text-sm font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <Clock size={14}/> {upcomingEvent.event_time.substring(0, 5)}
                                    </p>
                                    {upcomingEvent.location && <p className="text-sm font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{upcomingEvent.location}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="text-center sm:text-start self-start sm:self-center">
                            <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${upcomingEvent.type === 'Match' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {upcomingEvent.type === 'Match' ? (isRTL ? 'مباراة' : 'Match') : (isRTL ? 'تدريب' : 'Training')}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/60 rounded-3xl p-8 border border-white text-center shadow-sm">
                        <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                           <CalendarCheck size={32} />
                        </div>
                        <p className="text-base font-black text-slate-700">{isRTL ? 'لا يوجد أي نشاط مبرمج حالياً.' : 'No upcoming activities scheduled.'}</p>
                        <p className="text-sm font-bold text-slate-500 mt-1">{isRTL ? 'سنقوم بإشعارك عند برمجة نشاط جديد.' : 'We will notify you when a new activity is scheduled.'}</p>
                    </div>
                )}
            </div>

            {/* Next Match */}
            {upcomingMatch && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2.5rem] border border-emerald-100 premium-shadow p-6 sm:p-8 animate-fade-in">
                    <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                                <Trophy size={24} strokeWidth={2.5} />
                            </div>
                            <h3 className="font-black text-slate-800 text-xl tracking-tight">{isRTL ? 'المباراة القادمة (دعوة)' : 'Next Match Convocation'}</h3>
                        </div>
                        <span className="animate-pulse flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                    </div>
                    <div className={`bg-white/80 rounded-3xl p-6 border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                            <div className="w-14 h-14 bg-emerald-600 rounded-2xl text-white flex flex-col items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-600/20">
                                <span className="text-xs font-black uppercase tracking-widest">{new Date(upcomingMatch.match_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US', { month: 'short' })}</span>
                                <span className="text-xl font-extrabold leading-tight">{new Date(upcomingMatch.match_date).getDate()}</span>
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-slate-900 border-b-2 border-emerald-100 pb-1 inline-block">{isRTL ? 'ضد' : 'vs'} {upcomingMatch.opponent_name}</h4>
                                <div className={`flex flex-wrap items-center gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <p className={`text-sm font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <Clock size={14}/> {new Date(upcomingMatch.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}
                                    </p>
                                    <p className={`text-sm font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <MapPin size={14}/> {upcomingMatch.location || 'TBD'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="text-center sm:text-start self-start sm:self-center">
                            <span className="px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-amber-500 text-white shadow-lg shadow-amber-500/20 block">
                                ⚽ {upcomingMatch.match_type} {upcomingMatch.category}
                            </span>
                        </div>
                    </div>
                </div>
            )}
            {/* Player Badge Modal */}
            {childData && (
                <PlayerBadgeModal 
                    isOpen={isBadgeModalOpen}
                    onClose={() => setIsBadgeModalOpen(false)}
                    player={childData}
                />
            )}
        </div>
    );
};

export default ParentDashboard;
