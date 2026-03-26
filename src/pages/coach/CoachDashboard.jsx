import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, Calendar as CalendarIcon, ClipboardList, TrendingUp, Activity,
    Star, Clock, CheckCircle, BarChart3, Zap
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const CoachDashboard = () => {
    const navigate = useNavigate();
    const { t, isRTL, dir } = useLanguage();
    const [stats, setStats] = useState({ squads: 0, totalPlayers: 0, upcoming: 0, evaluations: 0 });
    const [squads, setSquads] = useState([]);
    const [recentEvals, setRecentEvals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const userId = localStorage.getItem('user_id');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // 1. Check Cache (30 seconds)
                const lastFetch = sessionStorage.getItem('coach_dash_last_fetch');
                const cachedData = sessionStorage.getItem('coach_dash_data');
                const now = Date.now();

                if (lastFetch && cachedData && (now - parseInt(lastFetch) < 30000)) {
                    const data = JSON.parse(cachedData);
                    setStats(data.stats);
                    setSquads(data.squads);
                    setRecentEvals(data.recentEvals);
                    setIsLoading(false);
                    return;
                }

                // 2. Optimized Parallel Fetches
                const [squadsRes, eventsRes, playersRes, evalsRes] = await Promise.all([
                    fetch(`${API_URL}/squads/coach/${userId}`).catch(() => null),
                    fetch(`${API_URL}/events/`).catch(() => null),
                    // Use cached players if possible
                    sessionStorage.getItem('all_players') ? Promise.resolve(null) : fetch(`${API_URL}/players/`).catch(() => null),
                    fetch(`${API_URL}/evaluations/?limit=20`).catch(() => null)
                ]);

                const squadsData = squadsRes?.ok ? await squadsRes.json().catch(() => []) : [];
                const events = eventsRes?.ok ? await eventsRes.json().catch(() => []) : [];
                
                let players = [];
                const cachedPlayers = sessionStorage.getItem('all_players');
                if (cachedPlayers) {
                    players = JSON.parse(cachedPlayers);
                } else if (playersRes?.ok) {
                    players = await playersRes.json().catch(() => []);
                    sessionStorage.setItem('all_players', JSON.stringify(players));
                }

                const evals = evalsRes?.ok ? await evalsRes.json().catch(() => []) : [];

                const upcoming = events.filter(e => e && e.status === 'Scheduled').length;
                
                const newStats = {
                    squads: squadsData.length,
                    totalPlayers: players.filter(p => p && squadsData.some(s => s.id === p.squad_id)).length || players.length,
                    upcoming,
                    evaluations: evals.length
                };

                setSquads(squadsData);
                setRecentEvals(evals.slice(0, 5));
                setStats(newStats);

                // Update Cache
                sessionStorage.setItem('coach_dash_data', JSON.stringify({ stats: newStats, squads: squadsData, recentEvals: evals.slice(0, 5) }));
                sessionStorage.setItem('coach_dash_last_fetch', now.toString());

            } catch (error) {
                console.error('Coach Performance Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [userId]);

    const statCards = [
        {
            label: t('coach.mySquads'),
            value: stats.squads,
            icon: Users,
            gradient: 'from-emerald-500 to-teal-600',
            shadow: 'shadow-emerald-500/20',
            bg: 'bg-emerald-50',
            text: 'text-emerald-600'
        },
        {
            label: t('coach.totalPlayers'),
            value: stats.totalPlayers,
            icon: Activity,
            gradient: 'from-blue-500 to-indigo-600',
            shadow: 'shadow-blue-500/20',
            bg: 'bg-blue-50',
            text: 'text-blue-600'
        },
        {
            label: t('coach.upcomingSessions'),
            value: stats.upcoming,
            icon: CalendarIcon,
            gradient: 'from-amber-500 to-orange-600',
            shadow: 'shadow-amber-500/20',
            bg: 'bg-amber-50',
            text: 'text-amber-600'
        },
        {
            label: t('coach.recordedEvals'),
            value: stats.evaluations,
            icon: Star,
            gradient: 'from-purple-500 to-pink-600',
            shadow: 'shadow-purple-500/20',
            bg: 'bg-purple-50',
            text: 'text-purple-600'
        }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className={`animate-fade-in space-y-8 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                        {t('coach.dashboardTitle').split(' ')[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">{t('coach.dashboardTitle').split(' ').slice(1).join(' ')}</span>
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">{t('coach.welcome')}</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {statCards.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 premium-shadow group hover:border-emerald-300 transition-all relative overflow-hidden">
                            <div className="absolute top-0 left-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Icon size={80} />
                            </div>
                            <div className={`flex items-center justify-between mb-4 relative z-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className={`p-3 rounded-xl border ${stat.bg} ${stat.text}`}>
                                    <Icon size={22} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h4 className="text-3xl font-black text-slate-800 tracking-tight mb-1">{stat.value}</h4>
                                <p className="text-sm font-semibold text-slate-500">{stat.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions & Schedule */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] premium-shadow p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-[50px]"></div>
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px]"></div>
                    <div className="relative z-10 space-y-6">
                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                                <Zap size={24} />
                            </div>
                            <h3 className="font-black text-xl tracking-tight">{t('coach.quickActions')}</h3>
                        </div>
                        <div className="space-y-3">
                            <button
                                onClick={() => navigate('/coach/attendance')}
                                className="block w-full text-center bg-white text-emerald-700 font-black py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-sm uppercase tracking-widest"
                            >
                                📋 {t('coach.takeAttendance')}
                            </button>
                            <button
                                onClick={() => navigate('/coach/evaluations')}
                                className="block w-full text-center bg-white/10 backdrop-blur-sm border border-white/20 text-white font-black py-4 rounded-2xl hover:bg-white/20 transition-all text-sm uppercase tracking-widest"
                            >
                                ⭐ {t('coach.evaluatePlayers')}
                            </button>
                            <button
                                onClick={() => navigate('/coach/squads')}
                                className="block w-full text-center bg-white/10 backdrop-blur-sm border border-white/20 text-white font-black py-4 rounded-2xl hover:bg-white/20 transition-all text-sm uppercase tracking-widest"
                            >
                                👥 {t('coach.manageSquads')}
                            </button>
                            <button
                                onClick={() => navigate('/coach/matches')}
                                className="block w-full mt-3 text-center bg-amber-500/90 hover:bg-amber-500 text-white font-black py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all text-sm uppercase tracking-widest"
                            >
                                🏆 {isRTL ? 'استدعاء للمباريات' : 'Match Convocations'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* My Squads */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden p-2">
                    <div className={`px-6 py-5 rounded-3xl bg-slate-50 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Users size={20} className="text-emerald-600" />
                        <h3 className="font-extrabold text-slate-800 text-lg">{t('coach.mySquads')}</h3>
                    </div>
                    <div className="p-4 space-y-3">
                        {squads.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 font-bold">{t('coach.noSquadsAssigned')}</div>
                        ) : squads.map((squad, i) => (
                            <div key={squad.id || i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-all cursor-pointer group"
                                onClick={() => navigate('/coach/squads')}
                            >
                                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                                        {squad.name?.[0] || '?'}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-900">{squad.name}</p>
                                        <p className="text-xs text-slate-500 font-medium">{squad.category || t('parent.unspecified')}</p>
                                    </div>
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {t('common.viewAll')} →
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Evaluations */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden p-2">
                <div className={`px-6 py-5 rounded-3xl bg-slate-50 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <BarChart3 size={20} className="text-purple-600" />
                        <h3 className="font-extrabold text-slate-800 text-lg">{t('coach.recentEvaluations')}</h3>
                    </div>
                    <button
                        onClick={() => navigate('/coach/evaluations')}
                        className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-all"
                    >
                        {t('common.viewAll')} →
                    </button>
                </div>
                <div className="divide-y divide-slate-50 px-2">
                    {recentEvals.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 font-bold">
                            <Star className="mx-auto text-slate-200 mb-3" size={40} />
                            <p>{t('coach.noEvaluationsYet')}</p>
                            <p className="text-xs mt-1 text-slate-300">{t('coach.startEvaluating')}</p>
                        </div>
                    ) : recentEvals.map((ev, i) => {
                        const avg = (['technique', 'speed', 'teamwork', 'discipline', 'game_sense']
                            .reduce((sum, k) => sum + (ev[k] || 0), 0) / 5);
                        return (
                            <div key={ev.id || i} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${avg >= 7 ? 'bg-emerald-50 text-emerald-600' : avg >= 4 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                                        {avg.toFixed(1)}
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-900">{ev.players?.full_name || (isRTL ? 'لاعب' : 'Player')}</p>
                                        <p className="text-xs text-slate-500" dir="ltr">{ev.evaluation_date ? new Date(ev.evaluation_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US') : ''}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {['technique', 'speed', 'teamwork'].map(k => (
                                        <span key={k} className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded-lg">
                                            {ev[k] || 0}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CoachDashboard;
