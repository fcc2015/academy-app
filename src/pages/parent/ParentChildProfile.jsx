import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { User, Shield, MapPin, Calendar, Award, Trophy, Star, CalendarCheck, AlertTriangle, Heart, TrendingUp, Lightbulb, CreditCard, Zap, Target, BadgeCheck, Activity, MessageCircle, Shirt, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { SkeletonDashboard } from '../../components/Skeleton';
import FUTCard from '../../components/FUTCard';

// Sub-components
import ParentAttendanceSection  from './components/ParentAttendanceSection';
import ParentMatchesSection     from './components/ParentMatchesSection';
import ParentPerformanceSection from './components/ParentPerformanceSection';
import ParentFinanceSection     from './components/ParentFinanceSection';
import ParentMedicalSection     from './components/ParentMedicalSection';
import ParentEquipmentSection   from './components/ParentEquipmentSection';
import ParentSanctionsSection   from './components/ParentSanctionsSection';

const ParentChildProfile = () => {
    const { isRTL, dir } = useLanguage();
    const navigate = useNavigate();
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [child, setChild] = useState(null);
    const [squad, setSquad] = useState(null);
    const [matches, setMatches] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [payments, setPayments] = useState([]);
    const [injuries, setInjuries] = useState([]);
    const [equipment, setEquipment] = useState(null);
    const [plans, setPlans] = useState([]);
    const [sanctions, setSanctions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('sessions');
    const userId = localStorage.getItem('impersonating_user_id') || localStorage.getItem('user_id');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const cachedChild = sessionStorage.getItem(`child_data_${userId}`);
                const cachedSquads = sessionStorage.getItem('all_squads');

                if (cachedChild) setChild(JSON.parse(cachedChild));
                if (cachedSquads) setSquad(JSON.parse(cachedSquads));

                const [playerRes, squadsRes] = await Promise.all([
                    authFetch(`${API_URL}/players/parent/${userId}`).catch(() => null),
                    cachedSquads ? Promise.resolve(null) : authFetch(`${API_URL}/squads/`).catch(() => null)
                ]);

                let currentPlayer = null;
                if (playerRes?.ok) {
                    const parentsPlayers = await playerRes.json().catch(() => []);
                    if (Array.isArray(parentsPlayers) && parentsPlayers.length > 0) {
                        currentPlayer = parentsPlayers.find(p => p.user_id === userId || p.parent_id === userId) || parentsPlayers[0];
                    }
                }

                if (!currentPlayer || currentPlayer.detail) {
                    const selfRes = await authFetch(`${API_URL}/players/${userId}`).catch(() => null);
                    if (selfRes?.ok) {
                        const p = await selfRes.json().catch(() => null);
                        if (p && !p.detail) currentPlayer = p;
                    }
                }

                if (currentPlayer && !currentPlayer.detail) {
                    setChild(currentPlayer);
                    sessionStorage.setItem(`child_data_${userId}`, JSON.stringify(currentPlayer));

                    const [mRes, evalRes, attendRes, payRes, injRes, equipRes, plansRes, sanctionsRes] = await Promise.all([
                        authFetch(`${API_URL}/matches/player/${currentPlayer.user_id}`).catch(() => null),
                        authFetch(`${API_URL}/evaluations/?player_id=${currentPlayer.user_id}`).catch(() => null),
                        authFetch(`${API_URL}/attendance/player/${currentPlayer.user_id}`).catch(() => null),
                        authFetch(`${API_URL}/finances/payments/user/${currentPlayer.user_id}`).catch(() => null),
                        authFetch(`${API_URL}/injuries/`).catch(() => null),
                        authFetch(`${API_URL}/equipment/player-status/${currentPlayer.user_id}`).catch(() => null),
                        authFetch(`${API_URL}/plans/`).catch(() => null),
                        authFetch(`${API_URL}/sanctions/player/${currentPlayer.user_id}`).catch(() => null)
                    ]);

                    if (mRes?.ok)        { const d = await mRes.json().catch(() => []);        setMatches(Array.isArray(d) ? d : []); }
                    if (evalRes?.ok)     { const d = await evalRes.json().catch(() => []);      setEvaluations(Array.isArray(d) ? d : []); }
                    if (attendRes?.ok)   { const d = await attendRes.json().catch(() => []);    setAttendance(Array.isArray(d) ? d : []); }
                    if (payRes?.ok)      { const d = await payRes.json().catch(() => []);       setPayments(Array.isArray(d) ? d : []); }
                    if (injRes?.ok) {
                        const d = await injRes.json().catch(() => []);
                        setInjuries(Array.isArray(d) ? d.filter(i => i.player_id === currentPlayer.user_id || i.user_id === currentPlayer.user_id) : []);
                    }
                    if (equipRes?.ok)   { const d = await equipRes.json().catch(() => null);   setEquipment(d); }
                    if (plansRes?.ok)   { const d = await plansRes.json().catch(() => []);      setPlans(d); }
                    if (sanctionsRes?.ok){ const d = await sanctionsRes.json().catch(() => []); setSanctions(Array.isArray(d) ? d : []); }
                }

                if (squadsRes?.ok) {
                    const sData = await squadsRes.json().catch(() => []);
                    if (Array.isArray(sData)) { setSquad(sData); sessionStorage.setItem('all_squads', JSON.stringify(sData)); }
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

    const childSquad   = squad?.find(s => s.id === child.squad_id);
    const latestEval   = evaluations[0] || null;
    const today        = new Date();
    const upcomingMatches = matches.filter(m => new Date(m.match_date) >= today);
    const pastMatches     = matches.filter(m => new Date(m.match_date) < today);
    const presentCount    = attendance.filter(a => a.status === 'present').length;
    const attendPct       = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

    const infoFields = [
        { label: 'Full Name',     value: child.full_name,                                                               icon: User     },
        { label: 'Age Category',  value: child.u_category || child.category || 'N/A',                                  icon: Shield   },
        { label: 'Position',      value: child.position || 'Not assigned',                                              icon: Award    },
        { label: 'Squad',         value: childSquad?.name || 'Not assigned',                                            icon: MapPin   },
        { label: 'Date of Birth', value: child.date_of_birth ? new Date(child.date_of_birth).toLocaleDateString() : 'N/A', icon: Calendar },
        { label: 'Joined',        value: child.created_at   ? new Date(child.created_at).toLocaleDateString()   : 'N/A', icon: Calendar }
    ];

    const tips = [
        ...(latestEval && latestEval.technical_score < 6 ? [{ ar: 'ركز على تحسين المهارات التقنية: التمرير، التحكم في الكرة والتسديد.', en: 'Focus on technical skills: passing, ball control and shooting.', icon: Target, color: 'blue' }] : []),
        ...(latestEval && latestEval.tactical_score  < 6 ? [{ ar: 'تحسين الوعي التكتيكي: اقرأ اللعبة وتمركز أفضل في الملعب.', en: 'Improve tactical awareness: read the game and position better.', icon: Zap, color: 'purple' }] : []),
        ...(latestEval && latestEval.physical_score  < 6 ? [{ ar: 'اعمل على لياقتك البدنية: تمارين القلب والتحمل والسرعة.', en: 'Work on fitness: cardio, endurance and speed exercises.', icon: TrendingUp, color: 'green' }] : []),
        ...(latestEval && latestEval.mental_score    < 6 ? [{ ar: 'قوّ الجانب النفسي: الثقة بالنفس والتركيز وروح الفريق.', en: 'Strengthen mental side: self-confidence, focus and team spirit.', icon: Star, color: 'amber' }] : []),
        { ar: 'المداومة على التدريب هي مفتاح النجاح. لا تتغيب وكن حاضراً دائماً بجسمك وذهنك.', en: 'Consistency is the key. Never miss training and always be present mentally.', icon: CalendarCheck, color: 'emerald' },
        { ar: 'النوم الكافي (8-9 ساعات) يضمن تعافياً أفضل وأداءً أعلى في الملعب.', en: 'Adequate sleep (8-9 hours) ensures better recovery and peak performance.', icon: Heart, color: 'rose' },
        { ar: 'احترم توجيهات المدرب وطبق ما تتعلمه خلال التداريب في المباريات.', en: 'Respect coach guidance and apply training lessons in matches.', icon: Award, color: 'indigo' }
    ];

    const levelBars = latestEval ? [
        { label: isRTL ? 'التقني'  : 'Technical', value: latestEval.technical_score || 0, gradient: 'from-sky-400 to-blue-500' },
        { label: isRTL ? 'التكتيكي': 'Tactical',  value: latestEval.tactical_score  || 0, gradient: 'from-violet-400 to-purple-500' },
        { label: isRTL ? 'البدني'  : 'Physical',  value: latestEval.physical_score  || 0, gradient: 'from-emerald-400 to-green-500' },
        { label: isRTL ? 'النفسي'  : 'Mental',    value: latestEval.mental_score    || 0, gradient: 'from-amber-400 to-orange-500' },
        { label: isRTL ? 'الشامل'  : 'Overall',   value: latestEval.overall_rating  || 0, gradient: 'from-rose-400 to-pink-500' }
    ] : [];

    const colorMap = {
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        fuchsia: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100',
        violet:  'text-violet-600 bg-violet-50 border-violet-100',
        amber:   'text-amber-600 bg-amber-50 border-amber-100',
        lime:    'text-lime-600 bg-lime-50 border-lime-100',
        teal:    'text-teal-600 bg-teal-50 border-teal-100',
        orange:  'text-orange-600 bg-orange-50 border-orange-100',
        rose:    'text-rose-600 bg-rose-50 border-rose-100',
        sky:     'text-sky-600 bg-sky-50 border-sky-100',
        red:     'text-red-600 bg-red-50 border-red-100',
        blue:    'text-blue-600 bg-blue-50 border-blue-100',
        indigo:  'text-indigo-600 bg-indigo-50 border-indigo-100'
    };

    const tabs = [
        { id: 'sessions',  label: isRTL ? 'حصص التداريب'     : 'Sessions',          icon: CalendarCheck, color: 'emerald' },
        { id: 'upcoming',  label: isRTL ? 'المباريات القادمة' : 'Matchs à venir',    icon: Calendar,      color: 'emerald' },
        { id: 'past',      label: isRTL ? 'المباريات السابقة' : 'Matchs passés',     icon: Trophy,        color: 'fuchsia' },
        { id: 'badge',     label: isRTL ? 'بطاقة اللاعب'     : 'Badge',             icon: BadgeCheck,    color: 'violet'  },
        { id: 'level',     label: isRTL ? 'مستوى اللاعب'     : 'Level',             icon: TrendingUp,    color: 'amber'   },
        { id: 'injuries',  label: isRTL ? 'الإصابات'         : 'Injuries',          icon: Activity,      color: 'red'     },
        { id: 'tips',      label: isRTL ? 'نصائح'            : 'Tips',              icon: Lightbulb,     color: 'lime'    },
        { id: 'finance',   label: isRTL ? 'المالية'          : 'Finance',           icon: CreditCard,    color: 'teal'    },
        { id: 'nutrition', label: isRTL ? 'التغذية'          : 'Nutrition',         icon: AlertTriangle, color: 'orange'  },
        { id: 'medical',   label: isRTL ? 'الطبي'            : 'Medical',           icon: Heart,         color: 'rose'    },
        { id: 'store',     label: isRTL ? 'تتبع الألبسة'     : 'Equipment',         icon: Shirt,         color: 'indigo'  },
        { id: 'chat',      label: isRTL ? 'المحادثة'         : 'Chat',              icon: MessageCircle, color: 'blue'    },
        { id: 'sanctions', label: isRTL ? 'العقوبات'         : 'Sanctions',         icon: AlertTriangle, color: 'rose'    },
        { id: 'info',      label: isRTL ? 'المعلومات'        : 'Info',              icon: Shield,        color: 'sky'     }
    ];

    const activeSanctions = sanctions.filter(s => s.status === 'Approved');

    return (
        <div className={`animate-fade-in space-y-8 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>

            {/* ── Page Header ── */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h1 className={`text-3xl font-extrabold tracking-tight text-slate-900 mb-1 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {isRTL ? 'ملف اللاعب' : 'Player Profile'}
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">{isRTL ? `متابعة مسار البطل ${child.full_name}` : `Following the journey of ${child.full_name}`}</p>
                </div>
            </div>

            {/* ── Hero Card ── */}
            <div className={`rounded-3xl p-8 text-white premium-shadow relative overflow-hidden ${child.technical_level === 'A' ? 'bg-gradient-to-br from-amber-500 to-yellow-600' : 'bg-gradient-to-br from-sky-500 to-blue-600'}`}>
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[80px]" />
                <div className="absolute left-10 bottom-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 blur-[60px]" />
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
                            <span className={`font-black text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm ${child.technical_level === 'A' ? 'text-yellow-100' : 'text-sky-100'}`}>{child.u_category || child.category || ''}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                            <span className={`font-black text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-lg bg-white/10 backdrop-blur-sm ${child.technical_level === 'A' ? 'text-yellow-100' : 'text-sky-100'}`}>{child.position || 'Position N/A'}</span>
                        </div>
                        <div className={`flex flex-wrap items-center justify-center md:justify-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-white/20 shadow-sm flex items-center gap-2 ${child.account_status === 'Active' ? 'bg-emerald-400/30 text-emerald-50' : child.account_status === 'Suspended' ? 'bg-rose-500/40 text-rose-50 border-rose-300/30' : 'bg-white/20'}`}>
                                <span className={`w-2 h-2 rounded-full ${child.account_status === 'Active' ? 'bg-emerald-300 animate-pulse' : child.account_status === 'Suspended' ? 'bg-rose-400 animate-ping' : 'bg-white'}`} />
                                {isRTL && child.account_status === 'Suspended' ? 'موقوف' : child.account_status || 'Active'}
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

            {/* ── Active Sanctions Alert ── */}
            {activeSanctions.length > 0 && (
                <div className="bg-gradient-to-br from-rose-50 to-red-100/50 border-2 border-red-200 rounded-[2rem] p-6 shadow-md relative overflow-hidden animate-pulse">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-red-500/5 rounded-full translate-x-1/3 -translate-y-1/3 blur-xl" />
                    <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                        <div className="p-3 bg-red-100 text-red-600 rounded-2xl shadow-inner mt-1">
                            <AlertTriangle size={24} className="animate-bounce" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black text-red-800 tracking-tight">{isRTL ? 'تنبيه انضباطي نشط ⚠️' : 'Active Disciplinary Alert ⚠️'}</h3>
                            <div className="mt-3 space-y-3">
                                {activeSanctions.map((s, idx) => (
                                    <div key={idx} className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-red-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">
                                                {isRTL ? `العقوبة: ${s.sanction_type === 'Warning' ? 'إنذار' : s.sanction_type === 'Suspension' ? 'توقيف' : s.sanction_type === 'Fine' ? 'غرامة مالية' : 'حرمان من المباريات'}` : `Type: ${s.sanction_type}`}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">{isRTL ? `السبب: ${s.reason}` : `Reason: ${s.reason}`}</p>
                                        </div>
                                        {s.amount > 0 && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-black">{s.amount} MAD</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab Navigation ── */}
            <div className="bg-white p-2 rounded-[2rem] border border-slate-200 premium-shadow flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                                isActive ? `${colorMap[tab.color]} border shadow-sm scale-105` : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            } ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                            <Icon size={16} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Tab Content ── */}
            <div className="transition-all duration-500">

                {activeTab === 'sessions'  && <ParentAttendanceSection  attendance={attendance} attendPct={attendPct} isRTL={isRTL} />}

                {activeTab === 'upcoming'  && <ParentMatchesSection activeTab="upcoming" upcomingMatches={upcomingMatches} pastMatches={pastMatches} child={child} isRTL={isRTL} />}
                {activeTab === 'past'      && <ParentMatchesSection activeTab="past"     upcomingMatches={upcomingMatches} pastMatches={pastMatches} child={child} isRTL={isRTL} />}

                {activeTab === 'badge'     && (
                    <ParentPerformanceSection
                        activeTab="badge"
                        child={child} evaluations={evaluations}
                        levelBars={levelBars} tips={tips} isRTL={isRTL}
                    />
                )}
                {activeTab === 'level'     && (
                    <ParentPerformanceSection
                        activeTab="level"
                        child={child} evaluations={evaluations}
                        levelBars={levelBars} tips={tips} isRTL={isRTL}
                    />
                )}
                {activeTab === 'tips'      && (
                    <ParentPerformanceSection
                        activeTab="tips"
                        child={child} evaluations={evaluations}
                        levelBars={levelBars} tips={tips} isRTL={isRTL}
                    />
                )}
                {activeTab === 'nutrition' && (
                    <ParentPerformanceSection
                        activeTab="nutrition"
                        child={child} evaluations={evaluations}
                        levelBars={levelBars} tips={tips} isRTL={isRTL}
                    />
                )}
                {activeTab === 'injuries'  && (
                    <ParentPerformanceSection
                        activeTab="injuries"
                        child={child} evaluations={evaluations}
                        levelBars={levelBars} tips={tips} injuries={injuries} isRTL={isRTL}
                    />
                )}

                {activeTab === 'finance'   && <ParentFinanceSection   payments={payments} child={child} isRTL={isRTL} />}
                {activeTab === 'medical'   && <ParentMedicalSection   child={child} isRTL={isRTL} />}
                {activeTab === 'store'     && (
                    <ParentEquipmentSection
                        equipment={equipment} plans={plans} child={child} isRTL={isRTL}
                        isUpgradeModalOpen={isUpgradeModalOpen}
                        setIsUpgradeModalOpen={setIsUpgradeModalOpen}
                    />
                )}
                {activeTab === 'sanctions' && <ParentSanctionsSection sanctions={sanctions} isRTL={isRTL} />}

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
