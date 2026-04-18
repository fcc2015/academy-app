import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { User, Shield, MapPin, Calendar, Award, Trophy, Star, CalendarCheck, CheckCircle2, XCircle, Clock, AlertTriangle, Heart, TrendingUp, Lightbulb, CreditCard, Wallet, Zap, Target, BadgeCheck, Activity, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { SkeletonDashboard } from '../../components/Skeleton';
import AttendanceHeatmap from '../../components/AttendanceHeatmap';
import MedicalCard from '../../components/MedicalCard';
import FUTCard from '../../components/FUTCard';

const ParentChildProfile = () => {
    const { isRTL, dir } = useLanguage();
    const navigate = useNavigate();
    const [child, setChild] = useState(null);
    const [squad, setSquad] = useState(null);
    const [matches, setMatches] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [payments, setPayments] = useState([]);
    const [injuries, setInjuries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('sessions');
    const userId = localStorage.getItem('user_id');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const cachedChild = sessionStorage.getItem(`child_data_${userId}`);
                const cachedSquads = sessionStorage.getItem('all_squads');

                if (cachedChild) setChild(JSON.parse(cachedChild));
                if (cachedSquads) setSquad(JSON.parse(cachedSquads));

                const [playerRes, squadsRes] = await Promise.all([
                    authFetch(`${API_URL}/players/${userId}`).catch(() => null),
                    cachedSquads ? Promise.resolve(null) : authFetch(`${API_URL}/squads/`).catch(() => null)
                ]);

                let currentPlayer = null;
                if (playerRes?.ok) {
                    currentPlayer = await playerRes.json().catch(() => null);
                }

                if (!currentPlayer || currentPlayer.detail) {
                    const selfRes = await authFetch(`${API_URL}/players/parent/${userId}`).catch(() => null);
                    if (selfRes?.ok) {
                        const parentsPlayers = await selfRes.json().catch(() => []);
                        if (Array.isArray(parentsPlayers) && parentsPlayers.length > 0) {
                            currentPlayer = parentsPlayers[0];
                        }
                    }
                }

                if (currentPlayer && !currentPlayer.detail) {
                    setChild(currentPlayer);
                    sessionStorage.setItem(`child_data_${userId}`, JSON.stringify(currentPlayer));

                    const [mRes, evalRes, attendRes, payRes, injRes] = await Promise.all([
                        authFetch(`${API_URL}/matches/player/${currentPlayer.user_id}`).catch(() => null),
                        authFetch(`${API_URL}/evaluations/?player_id=${currentPlayer.user_id}`).catch(() => null),
                        authFetch(`${API_URL}/attendance/player/${currentPlayer.user_id}`).catch(() => null),
                        authFetch(`${API_URL}/finances/payments/user/${currentPlayer.user_id}`).catch(() => null),
                        authFetch(`${API_URL}/injuries/`).catch(() => null)
                    ]);

                    if (mRes?.ok) { const d = await mRes.json().catch(() => []); setMatches(Array.isArray(d) ? d : []); }
                    if (evalRes?.ok) { const d = await evalRes.json().catch(() => []); setEvaluations(Array.isArray(d) ? d : []); }
                    if (attendRes?.ok) { const d = await attendRes.json().catch(() => []); setAttendance(Array.isArray(d) ? d : []); }
                    if (payRes?.ok) { const d = await payRes.json().catch(() => []); setPayments(Array.isArray(d) ? d : []); }
                    if (injRes?.ok) {
                        const d = await injRes.json().catch(() => []);
                        const filtered = Array.isArray(d)
                            ? d.filter(i => i.player_id === currentPlayer.user_id || i.user_id === currentPlayer.user_id)
                            : [];
                        setInjuries(filtered);
                    }
                }

                if (squadsRes?.ok) {
                    const sData = await squadsRes.json().catch(() => []);
                    if (Array.isArray(sData)) {
                        setSquad(sData);
                        sessionStorage.setItem('all_squads', JSON.stringify(sData));
                    }
                }
            } catch (error) {
                console.error('Performance Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        if (userId) fetchData();
        else setIsLoading(false);
    }, [userId]);

    if (isLoading) return <SkeletonDashboard />;

    if (!child) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 premium-shadow p-12 text-center">
                <User className="mx-auto text-slate-300 mb-4" size={48} />
                <h3 className="text-lg font-bold text-slate-800 mb-2">No Child Found</h3>
                <p className="text-slate-500 text-sm">No player profile is linked to your account yet.</p>
            </div>
        );
    }

    const childSquad = squad?.find(s => s.id === child.squad_id);
    const latestEval = evaluations[0] || null;
    const today = new Date();
    const upcomingMatches = matches.filter(m => new Date(m.match_date) >= today);
    const pastMatches = matches.filter(m => new Date(m.match_date) < today);

    // Finance
    const totalPaid = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount || 0), 0);
    const pendingAmount = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
    const monthlyFee = child.monthly_fee || 0;
    const balanceDue = monthlyFee > 0 ? Math.max(0, monthlyFee - (totalPaid % monthlyFee)) : 0;

    // Attendance
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const attendPct = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

    const infoFields = [
        { label: 'Full Name', value: child.full_name, icon: User },
        { label: 'Age Category', value: child.u_category || child.category || 'N/A', icon: Shield },
        { label: 'Position', value: child.position || 'Not assigned', icon: Award },
        { label: 'Squad', value: childSquad?.name || 'Not assigned', icon: MapPin },
        { label: 'Date of Birth', value: child.date_of_birth ? new Date(child.date_of_birth).toLocaleDateString() : 'N/A', icon: Calendar },
        { label: 'Joined', value: child.created_at ? new Date(child.created_at).toLocaleDateString() : 'N/A', icon: Calendar }
    ];

    const tabs = [
        { id: 'sessions', label: isRTL ? 'حصص التداريب' : 'Sessions', icon: CalendarCheck, color: 'emerald' },
        { id: 'upcoming', label: isRTL ? 'المباريات القادمة' : 'Matchs à venir', icon: Calendar, color: 'emerald' },
        { id: 'past', label: isRTL ? 'المباريات السابقة' : 'Matchs passés', icon: Trophy, color: 'fuchsia' },
        { id: 'badge', label: isRTL ? 'بطاقة اللاعب' : 'Badge', icon: BadgeCheck, color: 'violet' },
        { id: 'level', label: isRTL ? 'مستوى اللاعب' : 'Level', icon: TrendingUp, color: 'amber' },
        { id: 'injuries', label: isRTL ? 'الإصابات' : 'Injuries', icon: Activity, color: 'red' },
        { id: 'tips', label: isRTL ? 'نصائح' : 'Tips', icon: Lightbulb, color: 'lime' },
        { id: 'finance', label: isRTL ? 'المالية' : 'Finance', icon: CreditCard, color: 'teal' },
        { id: 'nutrition', label: isRTL ? 'التغذية' : 'Nutrition', icon: AlertTriangle, color: 'orange' },
        { id: 'medical', label: isRTL ? 'الطبي' : 'Medical', icon: Heart, color: 'rose' },
        { id: 'chat', label: isRTL ? 'المحادثة' : 'Chat', icon: MessageCircle, color: 'blue' },
        { id: 'info', label: isRTL ? 'المعلومات' : 'Info', icon: Shield, color: 'sky' }
    ];

    const colorMap = {
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        fuchsia: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100',
        violet: 'text-violet-600 bg-violet-50 border-violet-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        lime: 'text-lime-600 bg-lime-50 border-lime-100',
        teal: 'text-teal-600 bg-teal-50 border-teal-100',
        orange: 'text-orange-600 bg-orange-50 border-orange-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100',
        sky: 'text-sky-600 bg-sky-50 border-sky-100',
        red: 'text-red-600 bg-red-50 border-red-100',
        blue: 'text-blue-600 bg-blue-50 border-blue-100'
    };

    // Monthly / yearly finance breakdown
    const paymentsByYearMonth = payments.reduce((acc, p) => {
        const d = new Date(p.payment_date || p.created_at || Date.now());
        const y = d.getFullYear(), m = d.getMonth();
        const yk = String(y), mk = `${y}-${String(m + 1).padStart(2, '0')}`;
        acc.years[yk] = (acc.years[yk] || 0) + (p.status === 'confirmed' ? (p.amount || 0) : 0);
        acc.months[mk] = (acc.months[mk] || 0) + (p.status === 'confirmed' ? (p.amount || 0) : 0);
        return acc;
    }, { years: {}, months: {} });
    const yearEntries = Object.entries(paymentsByYearMonth.years).sort((a, b) => b[0].localeCompare(a[0]));
    const monthEntries = Object.entries(paymentsByYearMonth.months).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);

    // Tips based on evaluation
    const tips = [
        ...(latestEval && latestEval.technical_score < 6 ? [{ ar: 'ركز على تحسين المهارات التقنية: التمرير، التحكم في الكرة والتسديد.', en: 'Focus on technical skills: passing, ball control and shooting.', icon: Target, color: 'blue' }] : []),
        ...(latestEval && latestEval.tactical_score < 6 ? [{ ar: 'تحسين الوعي التكتيكي: اقرأ اللعبة وتمركز أفضل في الملعب.', en: 'Improve tactical awareness: read the game and position better.', icon: Zap, color: 'purple' }] : []),
        ...(latestEval && latestEval.physical_score < 6 ? [{ ar: 'اعمل على لياقتك البدنية: تمارين القلب والتحمل والسرعة.', en: 'Work on fitness: cardio, endurance and speed exercises.', icon: TrendingUp, color: 'green' }] : []),
        ...(latestEval && latestEval.mental_score < 6 ? [{ ar: 'قوّ الجانب النفسي: الثقة بالنفس والتركيز وروح الفريق.', en: 'Strengthen mental side: self-confidence, focus and team spirit.', icon: Star, color: 'amber' }] : []),
        { ar: 'المداومة على التدريب هي مفتاح النجاح. لا تتغيب وكن حاضراً دائماً بجسمك وذهنك.', en: 'Consistency is the key. Never miss training and always be present mentally.', icon: CalendarCheck, color: 'emerald' },
        { ar: 'النوم الكافي (8-9 ساعات) يضمن تعافياً أفضل وأداءً أعلى في الملعب.', en: 'Adequate sleep (8-9 hours) ensures better recovery and peak performance.', icon: Heart, color: 'rose' },
        { ar: 'احترم توجيهات المدرب وطبق ما تتعلمه خلال التداريب في المباريات.', en: 'Respect coach guidance and apply training lessons in matches.', icon: Award, color: 'indigo' }
    ];

    // Level bars
    const levelBars = latestEval ? [
        { label: isRTL ? 'التقني' : 'Technical', value: latestEval.technical_score || 0, gradient: 'from-sky-400 to-blue-500' },
        { label: isRTL ? 'التكتيكي' : 'Tactical', value: latestEval.tactical_score || 0, gradient: 'from-violet-400 to-purple-500' },
        { label: isRTL ? 'البدني' : 'Physical', value: latestEval.physical_score || 0, gradient: 'from-emerald-400 to-green-500' },
        { label: isRTL ? 'النفسي' : 'Mental', value: latestEval.mental_score || 0, gradient: 'from-amber-400 to-orange-500' },
        { label: isRTL ? 'الشامل' : 'Overall', value: latestEval.overall_rating || 0, gradient: 'from-rose-400 to-pink-500' }
    ] : [];

    return (
        <div className={`animate-fade-in space-y-8 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h1 className={`text-3xl font-extrabold tracking-tight text-slate-900 mb-1 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {isRTL ? 'ملف اللاعب' : 'Player Profile'}
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">{isRTL ? `متابعة مسار البطل ${child.full_name}` : `Following the journey of ${child.full_name}`}</p>
                </div>
            </div>

            {/* Hero Card */}
            <div className={`rounded-3xl p-8 text-white premium-shadow relative overflow-hidden ${child.technical_level === 'A' ? 'bg-gradient-to-br from-amber-500 to-yellow-600' : 'bg-gradient-to-br from-sky-500 to-blue-600'}`}>
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[80px]"></div>
                <div className="absolute left-10 bottom-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 blur-[60px]"></div>
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10 text-center md:text-left">
                    <div className="relative group">
                        <div className={`w-32 h-32 rounded-[2.5rem] bg-white/20 backdrop-blur-md flex items-center justify-center text-6xl font-black border-4 shadow-2xl overflow-hidden transition-transform duration-500 group-hover:scale-105 ${child.technical_level === 'A' ? 'border-yellow-200 shadow-yellow-500/50' : 'border-white/30 shadow-sky-500/30'}`}>
                            {child.photo_url ? (
                                <img src={child.photo_url} alt={child.full_name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                            ) : (child.full_name?.[0] || '?')}
                        </div>
                        {child.technical_level === 'A' && (
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-yellow-600 text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-xl border-2 border-yellow-100 flex items-center gap-1.5 z-20 whitespace-nowrap">
                                <Star size={12} fill="currentColor" /> ELITE PLAYER
                            </div>
                        )}
                    </div>
                    <div className="flex-1 mt-2">
                        <h2 className="text-4xl font-black mb-2 tracking-tight">{child.full_name}</h2>
                        <div className={`flex items-center justify-center md:justify-start gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className={`font-black text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm ${child.technical_level === 'A' ? 'text-yellow-100' : 'text-sky-100'}`}>
                                {child.u_category || child.category || ''}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                            <span className={`font-black text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm ${child.technical_level === 'A' ? 'text-yellow-100' : 'text-sky-100'}`}>
                                {child.position || 'Position N/A'}
                            </span>
                        </div>
                        <div className={`flex flex-wrap items-center justify-center md:justify-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-white/20 shadow-sm flex items-center gap-2 ${child.account_status === 'Active' ? 'bg-emerald-400/30 text-emerald-50' : 'bg-white/20'}`}>
                                <span className={`w-2 h-2 rounded-full ${child.account_status === 'Active' ? 'bg-emerald-300 animate-pulse' : 'bg-white'}`}></span>
                                {child.account_status || 'Active'}
                            </span>
                            <span className="bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-white/20 flex items-center gap-2">
                                <MapPin size={14} /> {childSquad?.name || 'TBD'}
                            </span>
                            {latestEval && (
                                <span className="bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-white/20 flex items-center gap-2">
                                    <Star size={14} fill="currentColor" /> {latestEval.overall_rating?.toFixed(1)}/10
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white p-2 rounded-[2rem] border border-slate-200 premium-shadow flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                                isActive
                                ? `${colorMap[tab.color]} border shadow-sm scale-105`
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                            <Icon size={16} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ─── Tab Content ─── */}
            <div className="transition-all duration-500">

                {/* ── SESSIONS ── */}
                {activeTab === 'sessions' && (
                    <div className={`animate-slide-up bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="p-4 bg-emerald-100 text-emerald-600 rounded-[1.5rem] shadow-sm"><CalendarCheck size={28} /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{isRTL ? 'سجل الحضور' : 'Attendance History'}</h3>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{isRTL ? `${attendance.length} حصة تدريبية` : `${attendance.length} training sessions`}</p>
                                </div>
                            </div>
                            {attendance.length > 0 && (
                                <div className="flex flex-col items-center">
                                    <span className="text-4xl font-black text-emerald-600 bg-white shadow-xl shadow-emerald-600/10 w-24 h-24 rounded-full flex items-center justify-center border-4 border-emerald-50 ring-8 ring-white">
                                        {attendPct}%
                                    </span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{isRTL ? 'نسبة الحضور' : 'Attendance'}</p>
                                </div>
                            )}
                        </div>
                        {attendance.length > 0 && (
                            <div className="p-6 border-b border-slate-100">
                                <AttendanceHeatmap records={attendance} isRTL={isRTL} />
                            </div>
                        )}
                        <div className="overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                            {attendance.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50 m-8 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                                    <CalendarCheck className="mx-auto text-slate-200 mb-6" size={48} />
                                    <p className="text-lg font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'لا يوجد سجل حضور.' : 'No attendance records yet.'}</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50 p-2">
                                    {attendance.slice(0, 30).map((a, i) => {
                                        const statusMap = {
                                            present: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', label: isRTL ? 'حاضر' : 'Present' },
                                            absent:  { icon: XCircle,      color: 'text-red-500',     bg: 'bg-red-50',     border: 'border-red-100',     label: isRTL ? 'غائب' : 'Absent' },
                                            late:    { icon: Clock,        color: 'text-amber-500',   bg: 'bg-amber-50',   border: 'border-amber-100',   label: isRTL ? 'متأخر' : 'Late' },
                                            excused: { icon: AlertTriangle,color: 'text-indigo-500',  bg: 'bg-indigo-50',  border: 'border-indigo-100',  label: isRTL ? 'بعذر' : 'Excused' }
                                        };
                                        const s = statusMap[a.status] || statusMap.absent;
                                        const Icon = s.icon;
                                        return (
                                            <div key={i} className={`p-6 flex items-center justify-between hover:bg-slate-50 transition-all cursor-default rounded-3xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-400 shadow-sm">{i + 1}</div>
                                                    <p className="text-[17px] font-black text-slate-700 tracking-tight" dir="ltr">
                                                        {a.date ? new Date(a.date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                                    </p>
                                                </div>
                                                <span className={`flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] border ${s.bg} ${s.color} ${s.border} shadow-sm`}>
                                                    <Icon size={16} /> {s.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── UPCOMING MATCHES ── */}
                {activeTab === 'upcoming' && (
                    <div className="animate-slide-up">
                        <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className={`px-10 py-7 border-b border-slate-100 flex items-center gap-5 bg-emerald-50/60 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="p-3.5 bg-emerald-100 text-emerald-600 rounded-[1.5rem] shadow-sm"><Calendar size={24} /></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">{isRTL ? 'المباريات القادمة' : 'Upcoming Matches'}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{upcomingMatches.length} {isRTL ? 'مباراة قادمة' : 'scheduled'}</p>
                                </div>
                            </div>
                            <div className="p-6">
                                {upcomingMatches.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <Calendar size={36} className="mx-auto mb-3 opacity-20" />
                                        <p className="font-black text-sm uppercase tracking-widest">{isRTL ? 'لا توجد مباريات قادمة' : 'No upcoming matches'}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {upcomingMatches.map(m => (
                                            <div key={m.id} className="border-2 border-emerald-100 bg-emerald-50/30 rounded-[2rem] p-6 hover:border-emerald-300 hover:shadow-lg transition-all duration-300">
                                                <div className={`flex items-center gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className="w-14 h-14 bg-white rounded-2xl flex flex-col items-center justify-center font-black text-slate-700 shadow-sm border border-slate-100">
                                                        <span className="text-[10px] uppercase tracking-wide text-slate-400">{new Date(m.match_date).toLocaleDateString(isRTL ? 'ar' : 'en', { month: 'short' })}</span>
                                                        <span className="text-xl leading-tight">{new Date(m.match_date).getDate()}</span>
                                                    </div>
                                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{isRTL ? 'قادمة' : 'Upcoming'}</span>
                                                        <h4 className="text-lg font-black text-slate-900">{isRTL ? 'ضد' : 'vs'} {m.opponent_name}</h4>
                                                    </div>
                                                </div>
                                                <div className={`flex items-center gap-3 text-xs font-black text-slate-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <MapPin size={13} /> {m.location || 'TBD'}
                                                    <span className="mx-1">·</span>
                                                    <Trophy size={13} className="text-fuchsia-400" /> {m.match_type}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                {/* ── PAST MATCHES ── */}
                {activeTab === 'past' && (
                    <div className="animate-slide-up">
                        <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className={`px-10 py-7 border-b border-slate-100 flex items-center gap-5 bg-fuchsia-50/60 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="p-3.5 bg-fuchsia-100 text-fuchsia-600 rounded-[1.5rem] shadow-sm"><Trophy size={24} /></div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800">{isRTL ? 'المباريات السابقة' : 'Past Matches'}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{pastMatches.length} {isRTL ? 'مباراة سابقة' : 'played'}</p>
                                </div>
                            </div>
                            <div className="p-6">
                                {pastMatches.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <Trophy size={36} className="mx-auto mb-3 opacity-20" />
                                        <p className="font-black text-sm uppercase tracking-widest">{isRTL ? 'لا توجد مباريات سابقة' : 'No past matches yet'}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {pastMatches.map(m => (
                                            <div key={m.id} className="border border-slate-100 rounded-[2rem] p-6 hover:border-fuchsia-200 hover:shadow-xl transition-all duration-300">
                                                <div className={`flex items-center gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex flex-col items-center justify-center font-black text-slate-700 shadow-sm border border-slate-100">
                                                        <span className="text-[10px] uppercase tracking-wide text-slate-400">{new Date(m.match_date).toLocaleDateString(isRTL ? 'ar' : 'en', { month: 'short' })}</span>
                                                        <span className="text-xl leading-tight">{new Date(m.match_date).getDate()}</span>
                                                    </div>
                                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isRTL ? 'ملعوبة' : 'Played'}</span>
                                                        <h4 className="text-lg font-black text-slate-900">{isRTL ? 'ضد' : 'vs'} {m.opponent_name}</h4>
                                                    </div>
                                                </div>
                                                <div className={`grid grid-cols-2 gap-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                    <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-2">
                                                        <MapPin size={14} className="text-slate-400 shrink-0" />
                                                        <span className="text-xs font-black text-slate-600 truncate">{m.location || 'TBD'}</span>
                                                    </div>
                                                    <div className="bg-fuchsia-50 rounded-2xl p-3 flex items-center gap-2">
                                                        <Trophy size={14} className="text-fuchsia-500 shrink-0" />
                                                        <span className="text-xs font-black text-fuchsia-700 truncate">{m.match_type}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── BADGE ── */}
                {activeTab === 'badge' && (
                    <div className="animate-slide-up flex flex-col items-center gap-8">
                        <div className={`text-center ${isRTL ? 'text-right' : 'text-left'} w-full`}>
                            <h3 className="text-2xl font-black text-slate-800">{isRTL ? 'بطاقة اللاعب الرسمية' : 'Official Player Card'}</h3>
                            <p className="text-slate-500 text-sm">{isRTL ? 'بطاقتك FUT الشخصية' : 'Your personal FUT-style card'}</p>
                        </div>
                        <FUTCard player={child} evaluation={latestEval} />
                        <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                            <div className="bg-white rounded-2xl border border-violet-100 p-5 text-center shadow-sm">
                                <p className="text-2xl font-black text-violet-600">{matches.length}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{isRTL ? 'مباريات' : 'Matches'}</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-emerald-100 p-5 text-center shadow-sm">
                                <p className="text-2xl font-black text-emerald-600">{attendPct}%</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{isRTL ? 'حضور' : 'Attend'}</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-amber-100 p-5 text-center shadow-sm">
                                <p className="text-2xl font-black text-amber-600">{latestEval?.overall_rating?.toFixed(1) || '—'}</p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{isRTL ? 'تقييم' : 'Rating'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── LEVEL ── */}
                {activeTab === 'level' && (
                    <div className="animate-slide-up space-y-6">
                        <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-amber-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="p-4 bg-amber-100 text-amber-600 rounded-[1.5rem] shadow-sm"><TrendingUp size={28} /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800">{isRTL ? 'مستوى اللاعب' : 'Player Level'}</h3>
                                    <p className="text-sm font-bold text-slate-500">{isRTL ? 'تحليل شامل للمهارات' : 'Full skills breakdown'}</p>
                                </div>
                            </div>
                            <div className="p-10">
                                {levelBars.length === 0 ? (
                                    <div className="text-center py-16 text-slate-400">
                                        <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black uppercase tracking-widest">{isRTL ? 'لا يوجد تقييم بعد' : 'No evaluation yet'}</p>
                                        <p className="text-sm mt-2">{isRTL ? 'سيظهر المستوى بعد أول تقييم من المدرب' : 'Level will appear after the first coach evaluation'}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-7">
                                        {levelBars.map((bar, i) => {
                                            const pct = Math.min((bar.value / 10) * 100, 100);
                                            return (
                                                <div key={i}>
                                                    <div className={`flex items-center justify-between mb-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                        <span className="text-sm font-black text-slate-700 uppercase tracking-widest">{bar.label}</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xl font-black text-slate-800">{Number(bar.value).toFixed(1)}</span>
                                                            <span className="text-xs text-slate-400 font-bold">/10</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden">
                                                        <div
                                                            className={`bg-gradient-to-r ${bar.gradient} h-full rounded-full transition-all duration-[1.5s] ease-out flex items-center justify-end pr-2`}
                                                            style={{ width: `${pct}%` }}
                                                        >
                                                            {pct > 15 && <span className="text-[10px] font-black text-white">{Math.round(pct)}%</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div className="mt-8 p-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-[2.5rem] text-white text-center shadow-xl shadow-amber-500/20">
                                            <p className="text-xs font-black uppercase tracking-[0.3em] opacity-80 mb-2">{isRTL ? 'التقييم الشامل' : 'Overall Rating'}</p>
                                            <p className="text-7xl font-black leading-none">{latestEval.overall_rating?.toFixed(1)}<span className="text-2xl opacity-60">/10</span></p>
                                            {latestEval.notes && <p className="text-sm font-bold mt-4 opacity-90 italic max-w-md mx-auto">&ldquo;{latestEval.notes}&rdquo;</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Eval history mini */}
                        {evaluations.length > 1 && (
                            <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                                <div className="px-8 py-6 border-b border-slate-100">
                                    <h4 className="font-black text-slate-700 text-sm uppercase tracking-widest">{isRTL ? 'تاريخ التقييمات' : 'Evaluation History'}</h4>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {evaluations.slice(0, 5).map((ev, i) => (
                                        <div key={i} className={`px-8 py-5 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <span className="text-sm font-bold text-slate-500" dir="ltr">{ev.evaluation_date ? new Date(ev.evaluation_date).toLocaleDateString() : 'N/A'}</span>
                                            <span className="flex items-center gap-1.5 font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl">
                                                <Star size={13} fill="currentColor" /> {ev.overall_rating?.toFixed(1)}/10
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TIPS ── */}
                {activeTab === 'tips' && (
                    <div className="animate-slide-up space-y-4">
                        <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-lime-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="p-4 bg-lime-100 text-lime-600 rounded-[1.5rem] shadow-sm"><Lightbulb size={28} /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800">{isRTL ? 'نصائح التطوير' : 'Development Tips'}</h3>
                                    <p className="text-sm font-bold text-slate-500">{isRTL ? 'توصيات شخصية لتحسين المستوى' : 'Personalized recommendations to improve'}</p>
                                </div>
                            </div>
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
                                {tips.map((tip, i) => {
                                    const Icon = tip.icon;
                                    const palettes = {
                                        blue:   { wrap: 'bg-blue-50 border-blue-100',   icon: 'bg-blue-100 text-blue-600',     num: 'text-blue-500' },
                                        purple: { wrap: 'bg-violet-50 border-violet-100', icon: 'bg-violet-100 text-violet-600', num: 'text-violet-500' },
                                        green:  { wrap: 'bg-emerald-50 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', num: 'text-emerald-500' },
                                        amber:  { wrap: 'bg-amber-50 border-amber-100', icon: 'bg-amber-100 text-amber-600',    num: 'text-amber-500' },
                                        emerald:{ wrap: 'bg-emerald-50 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', num: 'text-emerald-500' },
                                        rose:   { wrap: 'bg-rose-50 border-rose-100',   icon: 'bg-rose-100 text-rose-600',     num: 'text-rose-500' },
                                        indigo: { wrap: 'bg-indigo-50 border-indigo-100', icon: 'bg-indigo-100 text-indigo-600', num: 'text-indigo-500' }
                                    };
                                    const p = palettes[tip.color] || palettes.blue;
                                    return (
                                        <div key={i} className={`${p.wrap} border rounded-[2rem] p-6 flex items-start gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                            <div className={`${p.icon} w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm`}>
                                                <Icon size={20} />
                                            </div>
                                            <div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${p.num} mb-1.5 block`}>TIP {i + 1}</span>
                                                <p className="text-[15px] font-bold text-slate-700 leading-relaxed">{isRTL ? tip.ar : tip.en}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Motivational banner */}
                        <div className="p-8 bg-gradient-to-br from-lime-500 to-emerald-600 rounded-[2.5rem] text-white shadow-xl shadow-lime-500/20 text-center">
                            <p className="text-3xl mb-3">⚽</p>
                            <p className="text-xl font-black mb-2">{isRTL ? 'النجاح يبدأ من هنا!' : 'Success starts here!'}</p>
                            <p className="text-sm font-medium opacity-90 max-w-md mx-auto leading-relaxed">
                                {isRTL
                                    ? '"كل بطل كان يوماً ما مبتدئاً. الفرق هو أنه لم يستسلم أبداً."'
                                    : '"Every champion was once a beginner. The difference is they never gave up."'}
                            </p>
                        </div>
                    </div>
                )}

                {/* ── FINANCE ── */}
                {activeTab === 'finance' && (
                    <div className="animate-slide-up space-y-6">
                        {/* Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="bg-white rounded-[2rem] border border-emerald-100 premium-shadow p-6 text-center">
                                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm"><CheckCircle2 size={26} /></div>
                                <p className="text-3xl font-black text-emerald-600">{totalPaid.toLocaleString()}<span className="text-sm font-bold text-slate-400 ml-1">MAD</span></p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{isRTL ? 'إجمالي المدفوع' : 'Total Paid'}</p>
                            </div>
                            <div className="bg-white rounded-[2rem] border border-amber-100 premium-shadow p-6 text-center">
                                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm"><Clock size={26} /></div>
                                <p className="text-3xl font-black text-amber-600">{pendingAmount.toLocaleString()}<span className="text-sm font-bold text-slate-400 ml-1">MAD</span></p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{isRTL ? 'قيد المراجعة' : 'Pending Review'}</p>
                            </div>
                            <div className={`bg-white rounded-[2rem] border ${balanceDue > 0 ? 'border-red-100' : 'border-emerald-100'} premium-shadow p-6 text-center`}>
                                <div className={`w-14 h-14 ${balanceDue > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm`}>
                                    <CreditCard size={26} />
                                </div>
                                <p className={`text-3xl font-black ${balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{balanceDue.toLocaleString()}<span className="text-sm font-bold text-slate-400 ml-1">MAD</span></p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{isRTL ? 'الباقي للدفع' : 'Balance Due'}</p>
                            </div>
                        </div>

                        {/* Alert if balance due */}
                        {balanceDue > 0 && (
                            <div className={`flex items-center gap-4 p-5 bg-red-50 border border-red-100 rounded-[1.5rem] ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                <AlertTriangle size={22} className="text-red-500 shrink-0" />
                                <p className="text-sm font-bold text-red-700">
                                    {isRTL ? `يرجى تسوية الرصيد المتبقي (${balanceDue.toLocaleString()} MAD) في أقرب وقت ممكن.` : `Please settle the remaining balance (${balanceDue.toLocaleString()} MAD) as soon as possible.`}
                                </p>
                            </div>
                        )}

                        {/* ── Monthly Tracking ── */}
                        <div className={`bg-white rounded-[2rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className={`px-8 py-5 border-b border-slate-100 flex items-center gap-4 bg-indigo-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl shadow-sm"><Calendar size={22} /></div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">{isRTL ? 'المتابعة الشهرية' : 'Suivi Mensuel'}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'آخر 12 شهر' : 'Last 12 months'}</p>
                                </div>
                            </div>
                            <div className="p-6">
                                {monthEntries.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-6">{isRTL ? 'لا توجد مدفوعات' : 'Aucun paiement'}</p>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {monthEntries.map(([key, val]) => {
                                            const [yy, mm] = key.split('-');
                                            const monthName = new Date(+yy, +mm - 1, 1).toLocaleDateString(isRTL ? 'ar' : 'fr', { month: 'short', year: '2-digit' });
                                            return (
                                                <div key={key} className={`rounded-2xl p-4 border ${val > 0 ? 'border-emerald-100 bg-emerald-50/40' : 'border-slate-100 bg-slate-50/40'}`}>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1" dir="ltr">{monthName}</p>
                                                    <p className={`text-lg font-black ${val > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{val.toLocaleString()}<span className="text-[10px] font-bold text-slate-400 ml-1">MAD</span></p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Yearly Tracking ── */}
                        <div className={`bg-white rounded-[2rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className={`px-8 py-5 border-b border-slate-100 flex items-center gap-4 bg-violet-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl shadow-sm"><TrendingUp size={22} /></div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">{isRTL ? 'المتابعة السنوية' : 'Suivi Annuel'}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'مجموع كل سنة' : 'Total par année'}</p>
                                </div>
                            </div>
                            <div className="p-6">
                                {yearEntries.length === 0 ? (
                                    <p className="text-center text-slate-400 text-sm py-6">{isRTL ? 'لا توجد مدفوعات' : 'Aucun paiement'}</p>
                                ) : (
                                    <div className="space-y-2">
                                        {yearEntries.map(([year, total]) => {
                                            const max = Math.max(...yearEntries.map(e => e[1])) || 1;
                                            const pct = (total / max) * 100;
                                            return (
                                                <div key={year} className="flex items-center gap-4">
                                                    <span className="text-sm font-black text-slate-700 w-14" dir="ltr">{year}</span>
                                                    <div className="flex-1 h-8 rounded-full bg-slate-100 overflow-hidden relative">
                                                        <div className="h-full bg-gradient-to-r from-violet-400 to-purple-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-sm font-black text-slate-800 w-28 text-right" dir="ltr">{total.toLocaleString()} MAD</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* Payment history */}
                        <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-teal-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="p-4 bg-teal-100 text-teal-600 rounded-[1.5rem] shadow-sm"><Wallet size={28} /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800">{isRTL ? 'سجل المدفوعات' : 'Payment History'}</h3>
                                    <p className="text-sm font-bold text-slate-500">{payments.length} {isRTL ? 'عملية مالية' : 'transactions'}</p>
                                </div>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-50 p-2">
                                {payments.length === 0 ? (
                                    <div className="text-center py-16 text-slate-400">
                                        <CreditCard size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black uppercase tracking-widest text-sm">{isRTL ? 'لا توجد مدفوعات بعد' : 'No payments yet'}</p>
                                    </div>
                                ) : payments.map((p, i) => {
                                    const isPaid = p.status === 'confirmed';
                                    return (
                                        <div key={i} className={`p-5 flex items-center justify-between hover:bg-slate-50 transition-all rounded-3xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    {isPaid ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                                                </div>
                                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                                    <p className="font-black text-slate-800 text-sm">{p.payment_method || (isRTL ? 'دفعة' : 'Payment')}</p>
                                                    <p className="text-xs text-slate-400" dir="ltr">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div className={isRTL ? 'text-left' : 'text-right'}>
                                                <p className={`font-black text-lg ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>{(p.amount || 0).toLocaleString()} <span className="text-xs text-slate-400">MAD</span></p>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    {isPaid ? (isRTL ? 'مؤكد' : 'Confirmed') : (isRTL ? 'معلق' : 'Pending')}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── INJURIES ── */}
                {activeTab === 'injuries' && (
                    <div className="animate-slide-up">
                        <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-red-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="p-4 bg-red-100 text-red-600 rounded-[1.5rem] shadow-sm"><Activity size={28} /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800">{isRTL ? 'سجل الإصابات' : 'Historique des blessures'}</h3>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{injuries.length} {isRTL ? 'إصابة مسجلة' : 'entries'}</p>
                                </div>
                            </div>
                            <div className="p-6">
                                {injuries.length === 0 ? (
                                    <div className="text-center py-16 text-slate-400">
                                        <Activity size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="font-black uppercase tracking-widest text-sm">{isRTL ? 'لا توجد إصابات — استمر في الصحة!' : 'Aucune blessure — restez en bonne santé!'}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {injuries.map((inj, i) => {
                                            const active = !inj.recovered_date && !inj.is_recovered;
                                            return (
                                                <div key={i} className={`p-5 rounded-2xl border-2 ${active ? 'border-red-100 bg-red-50/40' : 'border-emerald-100 bg-emerald-50/40'}`}>
                                                    <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                        <div className={isRTL ? 'text-right' : 'text-left'}>
                                                            <h4 className="text-base font-black text-slate-800">{inj.injury_type || inj.type || (isRTL ? 'إصابة' : 'Blessure')}</h4>
                                                            <p className="text-xs text-slate-500 mt-1" dir="ltr">
                                                                {inj.injury_date ? new Date(inj.injury_date).toLocaleDateString() : ''}
                                                                {inj.body_part ? ` · ${inj.body_part}` : ''}
                                                            </p>
                                                            {inj.description && <p className="text-sm text-slate-600 mt-2">{inj.description}</p>}
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl ${active ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {active ? (isRTL ? 'قيد العلاج' : 'En cours') : (isRTL ? 'متعافى' : 'Guéri')}
                                                        </span>
                                                    </div>
                                                    {inj.expected_recovery_date && active && (
                                                        <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                                                            {isRTL ? 'العودة المتوقعة:' : 'Retour prévu:'} <span className="font-black text-slate-700" dir="ltr">{new Date(inj.expected_recovery_date).toLocaleDateString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── CHAT (redirect) ── */}
                {activeTab === 'chat' && (
                    <div className="animate-slide-up">
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow p-12 text-center">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                <MessageCircle size={36} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">{isRTL ? 'المحادثة مع المدرب' : 'Discussion avec le coach'}</h3>
                            <p className="text-sm text-slate-500 mb-6">{isRTL ? 'تواصل مباشرة مع مدرب فريق طفلك' : 'Contactez directement le coach de votre enfant'}</p>
                            <button
                                onClick={() => navigate('/parent/chat')}
                                className="px-8 py-3.5 rounded-2xl font-black text-white text-sm inline-flex items-center gap-2 hover:scale-105 transition-transform"
                                style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                            >
                                <MessageCircle size={16} /> {isRTL ? 'افتح المحادثة' : 'Ouvrir le chat'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── NUTRITION ── */}
                {activeTab === 'nutrition' && (
                    <div className="animate-slide-up space-y-8">
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden">
                            <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-orange-50/50 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                <div className="p-4 bg-orange-100 text-orange-600 rounded-[1.5rem] shadow-sm"><AlertTriangle size={28} /></div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{isRTL ? 'التغذية الرياضية' : 'Sports Nutrition'}</h3>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{isRTL ? 'برامج ونصائح غذائية للأبطال' : 'Nutrition plans and advice for champions'}</p>
                                </div>
                            </div>
                            <div className="p-10 space-y-12">
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <div className="space-y-6">
                                        <h4 className="text-lg font-black text-slate-900 border-b-2 border-orange-200 pb-2 inline-block">{isRTL ? 'نصائح ما قبل التدريب' : 'Pre-Training Advice'}</h4>
                                        <ul className="space-y-4">
                                            {[
                                                { ar: 'تناول وجبة غنية بالكربوهيدرات المعقدة قبل ساعتين.', en: 'Eat complex carbs 2 hours before training.' },
                                                { ar: 'اشرب الكثير من الماء لضمان الترطيب الجيد.', en: 'Maintain good hydration by drinking plenty of water.' },
                                                { ar: 'تجنب الوجبات الثقيلة أو الدسمة قبل النشاط البدني.', en: 'Avoid heavy or fatty meals before activity.' }
                                            ].map((item, i) => (
                                                <li key={i} className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 text-sm font-black">✓</div>
                                                    <p className="text-[15px] font-bold text-slate-600">{isRTL ? item.ar : item.en}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="space-y-6">
                                        <h4 className="text-lg font-black text-slate-900 border-b-2 border-orange-200 pb-2 inline-block">{isRTL ? 'استعادة الطاقة بعد الحصة' : 'Post-Session Recovery'}</h4>
                                        <ul className="space-y-4">
                                            {[
                                                { ar: 'استهلاك البروتين في غضون 30 دقيقة للإصلاح العضلي.', en: 'Consume protein within 30 mins for muscle repair.' },
                                                { ar: 'تعويض الأملاح المفقودة بالفواكه أو المشروبات الرياضية.', en: 'Replenish electrolytes with fruit or sports drinks.' },
                                                { ar: 'الحصول على قسط كافٍ من النوم (8-9 ساعات).', en: 'Get adequate sleep (8-9 hours).' }
                                            ].map((item, i) => (
                                                <li key={i} className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 text-sm font-black">✓</div>
                                                    <p className="text-[15px] font-bold text-slate-600">{isRTL ? item.ar : item.en}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="p-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-[2.5rem] text-white shadow-xl shadow-orange-500/20">
                                    <h5 className="text-xl font-black mb-4">{isRTL ? 'ملاحظة المدرب' : "Coach's Note"}</h5>
                                    <p className="text-lg font-medium opacity-90 leading-relaxed italic">
                                        {isRTL
                                            ? '"التغذية السليمة هي وقود البطل. احرص على تناول وجبات متوازنة تشمل الخضروات والبروتين والنشويات لضمان أفضل أداء في الملعب."'
                                            : '"Proper nutrition is a champion\'s fuel. Make sure to eat balanced meals including vegetables, protein, and carbs for peak performance on the pitch."'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── PERFORMANCE ── */}
                {activeTab === 'performance' && (
                    <div className={`animate-slide-up bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-amber-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="p-4 bg-amber-100 text-amber-600 rounded-[1.5rem] shadow-sm"><Star size={28} /></div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{isRTL ? 'التقييمات التقنية' : 'Technical Evaluations'}</h3>
                                <p className="text-sm font-bold text-slate-500">{isRTL ? 'آخر تقييمات المدرب وتوصياته' : 'Latest coach evaluations and feedback'}</p>
                            </div>
                        </div>
                        <div className="p-8 sm:p-10">
                            {evaluations.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                                    <Star className="mx-auto text-slate-200 mb-6" size={48} />
                                    <p className="text-lg font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'لم يتم تسجيل أي تقييم بعد.' : 'No evaluations recorded yet.'}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {evaluations.slice(0, 8).map((ev, i) => (
                                        <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:border-amber-200 hover:shadow-xl transition-all duration-300">
                                            <div className={`flex items-center justify-between mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400" dir="ltr">{ev.evaluation_date ? new Date(ev.evaluation_date).toLocaleDateString() : 'N/A'}</p>
                                                </div>
                                                <span className="flex items-center gap-1.5 text-amber-500 font-black text-lg bg-amber-50 px-3 py-1 rounded-xl">
                                                    <Star size={16} fill="currentColor" /> {ev.overall_rating?.toFixed(1)}<span className="text-slate-400 font-bold text-xs">/10</span>
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-3 mb-5 overflow-hidden">
                                                <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-[1s]" style={{width: `${(ev.overall_rating / 10) * 100}%`}}></div>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-2xl">
                                                <p className="text-sm font-bold text-slate-600 italic leading-relaxed">
                                                    {ev.notes ? `"${ev.notes}"` : (isRTL ? '"لا توجد ملاحظات إضافية"' : '"No additional comments"')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── MEDICAL ── */}
                {activeTab === 'medical' && (
                    <div className="animate-slide-up">
                        <MedicalCard player={child} isRTL={isRTL} />
                    </div>
                )}

                {/* ── INFO ── */}
                {activeTab === 'info' && (
                    <div className="animate-slide-up grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {infoFields.map((field, i) => {
                            const Icon = field.icon;
                            return (
                                <div key={i} className="bg-white rounded-[2rem] border border-slate-200 premium-shadow p-6 flex items-start gap-4 hover:border-sky-300 transition-colors">
                                    <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 shadow-sm"><Icon size={24} /></div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{field.label}</p>
                                        <p className="text-[16px] font-bold text-slate-900 tracking-tight">{field.value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParentChildProfile;
