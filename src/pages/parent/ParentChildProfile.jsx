import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { User, Shield, MapPin, Calendar, Award, Trophy, Star, CalendarCheck, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SkeletonDashboard } from '../../components/Skeleton';

const ParentChildProfile = () => {
    const { isRTL, dir } = useLanguage();
    const [child, setChild] = useState(null);
    const [squad, setSquad] = useState(null);
    const [matches, setMatches] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('sessions');
    const userId = localStorage.getItem('user_id');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Check Cache first
                const cachedChild = sessionStorage.getItem(`child_data_${userId}`);
                const cachedSquads = sessionStorage.getItem('all_squads');

                if (cachedChild) {
                    setChild(JSON.parse(cachedChild));
                }
                if (cachedSquads) {
                    setSquad(JSON.parse(cachedSquads));
                }

                // 2. Parallel Fetches for core profile and squads
                const [playerRes, squadsRes] = await Promise.all([
                    authFetch(`${API_URL}/players/${userId}`).catch(() => null),
                    cachedSquads ? Promise.resolve(null) : authFetch(`${API_URL}/squads/`).catch(() => null)
                ]);

                let currentPlayer = null;
                if (playerRes?.ok) {
                    currentPlayer = await playerRes.json().catch(() => null);
                }

                // 3. Optimized Fallback (only if needed)
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
                    
                    // 4. Detailed Data (Matches, Eval, Attendance)
                    const [mRes, evalRes, attendRes] = await Promise.all([
                        authFetch(`${API_URL}/matches/player/${currentPlayer.user_id}`).catch(() => null),
                        authFetch(`${API_URL}/evaluations/?player_id=${currentPlayer.user_id}`).catch(() => null),
                        authFetch(`${API_URL}/attendance/player/${currentPlayer.user_id}`).catch(() => null)
                    ]);

                    if (mRes?.ok) {
                        const mData = await mRes.json().catch(() => []);
                        setMatches(Array.isArray(mData) ? mData : []);
                    }
                    if (evalRes?.ok) {
                        const eData = await evalRes.json().catch(() => []);
                        setEvaluations(Array.isArray(eData) ? eData : []);
                    }
                    if (attendRes?.ok) {
                        const aData = await attendRes.json().catch(() => []);
                        setAttendance(Array.isArray(aData) ? aData : []);
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

    if (isLoading) {
        return <SkeletonDashboard />;
    }

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
        { id: 'matches', label: isRTL ? 'المباريات' : 'Matches', icon: Trophy, color: 'fuchsia' },
        { id: 'nutrition', label: isRTL ? 'التغذية' : 'Nutrition', icon: AlertTriangle, color: 'orange' },
        { id: 'performance', label: isRTL ? 'الأداء' : 'Performance', icon: Star, color: 'amber' },
        { id: 'info', label: isRTL ? 'المعلومات' : 'Info', icon: Shield, color: 'sky' }
    ];

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
                            ) : (
                                child.full_name?.[0] || '?'
                            )}
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white p-2 rounded-[2rem] border border-slate-200 premium-shadow flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const colorMap = {
                        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
                        fuchsia: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100',
                        orange: 'text-orange-600 bg-orange-50 border-orange-100',
                        amber: 'text-amber-600 bg-amber-50 border-amber-100',
                        sky: 'text-sky-600 bg-sky-50 border-sky-100'
                    };
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                                isActive 
                                ? `${colorMap[tab.color]} border shadow-sm scale-105` 
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                            <Icon size={18} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="transition-all duration-500">
                {activeTab === 'info' && (
                    <div className="animate-slide-up grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {infoFields.map((field, i) => {
                            const Icon = field.icon;
                            return (
                                <div key={i} className="bg-white rounded-[2rem] border border-slate-200 premium-shadow p-6 flex items-start gap-4 hover:border-sky-300 transition-colors">
                                    <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 shadow-sm">
                                        <Icon size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{field.label}</p>
                                        <p className="text-[16px] font-bold text-slate-900 tracking-tight">{field.value}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

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
                                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400" dir="ltr">
                                                        {ev.evaluation_date ? new Date(ev.evaluation_date).toLocaleDateString() : 'N/A'}
                                                    </p>
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
                                        {Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)}%
                                    </span>
                                </div>
                            )}
                        </div>
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
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-400 shadow-sm">
                                                        {i + 1}
                                                    </div>
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

                {activeTab === 'matches' && (
                    <div className={`animate-slide-up bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-fuchsia-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="p-4 bg-fuchsia-100 text-fuchsia-600 rounded-[1.5rem] shadow-sm"><Trophy size={28} /></div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{isRTL ? 'المباريات والاستدعاءات' : 'Matches & Convocations'}</h3>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{isRTL ? 'سجل المواجهات الرسمية والودية' : 'Official and friendly match records'}</p>
                            </div>
                        </div>
                        <div className="p-8 sm:p-10">
                            {matches.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                                    <Trophy className="mx-auto text-slate-200 mb-6" size={48} />
                                    <p className="text-lg font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'لا توجد مباريات مسجلة حالياً.' : 'No matches recorded yet.'}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {matches.map(m => (
                                        <div key={m.id} className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 hover:border-fuchsia-200 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                                            <div className={`flex items-center justify-between mb-8 border-b border-slate-50 pb-6 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                                <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex flex-col items-center justify-center font-black text-slate-700 shadow-sm border border-slate-100">
                                                        <span className="text-[11px] uppercase tracking-widest">{new Date(m.match_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US', { month: 'short' })}</span>
                                                        <span className="text-2xl leading-none mt-1">{new Date(m.match_date).getDate()}</span>
                                                    </div>
                                                    <div>
                                                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${m.status === 'Completed' ? 'text-slate-400' : 'text-emerald-500'}`}>
                                                            {m.status === 'Completed' ? (isRTL ? 'ملعوبة' : 'Played') : (isRTL ? 'قادمة' : 'Upcoming')}
                                                        </span>
                                                        <h4 className="text-xl font-black text-slate-900 mt-1">{isRTL ? 'ضد' : 'vs'} {m.opponent_name}</h4>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`grid grid-cols-2 gap-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
                                                    <MapPin size={18} className="text-slate-400" />
                                                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest truncate">{m.location || 'TBD'}</span>
                                                </div>
                                                <div className="bg-fuchsia-50 rounded-2xl p-4 flex items-center gap-3">
                                                    <Trophy size={18} className="text-fuchsia-500" />
                                                    <span className="text-xs font-black text-fuchsia-700 uppercase tracking-widest">{m.match_type}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
                                        <h4 className="text-lg font-black text-slate-900 border-b-2 border-orange-200 pb-2 inline-block">
                                            {isRTL ? 'نصائح ما قبل التدريب' : 'Pre-Training Advice'}
                                        </h4>
                                        <ul className="space-y-4">
                                            {[
                                                { ar: 'تناول وجبة غنية بالكربوهيدرات المعقدة قبل ساعتين.', en: 'Eat complex carbs 2 hours before training.' },
                                                { ar: 'اشرب الكثير من الماء لضمان الترطيب الجيد.', en: 'Maintain good hydration by drinking plenty of water.' },
                                                { ar: 'تجنب الوجبات الثقيلة أو الدسمة قبل النشاط البدني.', en: 'Avoid heavy or fatty meals before activity.' }
                                            ].map((item, i) => (
                                                <li key={i} className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 mt-0.5">✓</div>
                                                    <p className="text-[15px] font-bold text-slate-600">{isRTL ? item.ar : item.en}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="space-y-6">
                                        <h4 className="text-lg font-black text-slate-900 border-b-2 border-orange-200 pb-2 inline-block">
                                            {isRTL ? 'استعادة الطاقة بعد الحصة' : 'Post-Session Recovery'}
                                        </h4>
                                        <ul className="space-y-4">
                                            {[
                                                { ar: 'استهلاك البروتين في غضون 30 دقيقة للإصلاح العضلي.', en: 'Consume protein within 30 mins for muscle repair.' },
                                                { ar: 'تعويض الأملاح المفقودة بالفواكه أو المشروبات الرياضية.', en: 'Replenish electrolytes with fruit or sports drinks.' },
                                                { ar: 'الحصول على قسط كافٍ من النوم (8-9 ساعات).', en: 'Get adequate sleep (8-9 hours).' }
                                            ].map((item, i) => (
                                                <li key={i} className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">✓</div>
                                                    <p className="text-[15px] font-bold text-slate-600">{isRTL ? item.ar : item.en}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="p-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-[2.5rem] text-white shadow-xl shadow-orange-500/20">
                                    <h5 className="text-xl font-black mb-4">{isRTL ? 'ملاحظة المدرب' : 'Coach\'s Note'}</h5>
                                    <p className="text-lg font-medium opacity-90 leading-relaxed italic">
                                        {isRTL 
                                        ? '"التغذية السليمة هي وقود البطل. احرص على تناول وجبات متوازنة تشمل الخضروات والبروتين والنشويات لضمان أفضل أداء في الملعب."' 
                                        : '"Proper nutrition is a champion\'s fuel. Make sure to eat balanced meals including vegetables, protein, and carbs to ensure peak performance on the pitch."'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParentChildProfile;
