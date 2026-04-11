import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { Star, Save, Users, PlusCircle, Trash2, X, Zap, TrendingUp } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../components/Toast';

const getSkillColor = (val) => {
    if (val >= 8) return { bar: 'bg-emerald-500', text: 'text-emerald-600', glow: 'shadow-emerald-500/30' };
    if (val >= 6) return { bar: 'bg-blue-500', text: 'text-blue-600', glow: 'shadow-blue-500/30' };
    if (val >= 4) return { bar: 'bg-amber-500', text: 'text-amber-600', glow: 'shadow-amber-500/30' };
    return { bar: 'bg-red-500', text: 'text-red-600', glow: 'shadow-red-500/30' };
};

const CoachEvaluations = () => {
    const { t, isRTL, dir } = useLanguage();
    const toast = useToast();

    const skills = [
        { key: 'technique', labelKey: 'coach.technique', emoji: '⚽', color: 'blue' },
        { key: 'speed', labelKey: 'coach.speed', emoji: '⚡', color: 'emerald' },
        { key: 'teamwork', labelKey: 'coach.teamwork', emoji: '🤝', color: 'purple' },
        { key: 'discipline', labelKey: 'coach.discipline', emoji: '🎯', color: 'amber' },
        { key: 'game_sense', labelKey: 'coach.gameSense', emoji: '🧠', color: 'indigo' }
    ];
    const [squads, setSquads] = useState([]);
    const [players, setPlayers] = useState([]);
    const [evaluations, setEvaluations] = useState([]);
    const [selectedSquad, setSelectedSquad] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [showForm, setShowForm] = useState(false);

    const [isSaving, setIsSaving] = useState(false);

    const [form, setForm] = useState({
        technique: 5,
        speed: 5,
        teamwork: 5,
        discipline: 5,
        game_sense: 5,
        notes: '',
        evaluation_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedPlayer) fetchEvaluations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPlayer]);

    const fetchData = async () => {
        try {
            const userId = localStorage.getItem('user_id');
            const cachedPlayers = sessionStorage.getItem('all_players');
            
            const [squadsRes, playersRes] = await Promise.all([
                authFetch(`${API_URL}/squads/coach/${userId}`),
                cachedPlayers ? Promise.resolve(null) : authFetch(`${API_URL}/players/`)
            ]);
            
            if (squadsRes.ok) setSquads(await squadsRes.json());
            
            if (cachedPlayers) {
                setPlayers(JSON.parse(cachedPlayers));
            } else if (playersRes && playersRes.ok) {
                const pData = await playersRes.json();
                setPlayers(pData);
                sessionStorage.setItem('all_players', JSON.stringify(pData));
            }
        } catch (error) {
            console.error('Error fetching coach evaluatio data:', error);
        }
    };

    const fetchEvaluations = async () => {
        try {
            const res = await authFetch(`${API_URL}/evaluations/?player_id=${selectedPlayer}`);
            if (res.ok) setEvaluations(await res.json());
        } catch (error) {
            console.error('Error fetching evaluations:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPlayer) return;
        setIsSaving(true);
        try {
            const overall = skills.reduce((sum, s) => sum + form[s.key], 0) / skills.length;
            const payload = {
                player_id: selectedPlayer,
                ...form,
                overall_rating: Math.round(overall * 10) / 10
            };
            const res = await authFetch(`${API_URL}/evaluations/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setShowForm(false);
                setForm({ technique: 5, speed: 5, teamwork: 5, discipline: 5, game_sense: 5, notes: '', evaluation_date: new Date().toISOString().split('T')[0] });
                toast.success(isRTL ? 'تم حفظ التقييم بنجاح!' : 'Evaluation saved successfully!');
                fetchEvaluations();
            }
        } catch (error) {
            console.error('Error saving evaluation:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (evalId) => {
        try {
            await authFetch(`${API_URL}/evaluations/${evalId}`, { method: 'DELETE' });
            toast.success(isRTL ? 'تم حذف التقييم' : 'Evaluation deleted');
            fetchEvaluations();
        } catch (error) {
            console.error('Error deleting evaluation:', error);
        }
    };

    const filteredPlayers = selectedSquad ? players.filter(p => p.squad_id === selectedSquad) : players;

    const overallAvg = form ? (skills.reduce((sum, s) => sum + form[s.key], 0) / skills.length) : 0;

    return (
        <div className={`animate-fade-in space-y-8 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                        {t('coach.evalTitle').split(' ')[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">{t('coach.evalTitle').split(' ').slice(1).join(' ')}</span>
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">{t('coach.evalSubtitle')}</p>
                </div>
                {selectedPlayer && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                        <PlusCircle size={18} /> {t('coach.newEvaluation')}
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-[2rem] border border-slate-200 premium-shadow p-6">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex-row-reverse">
                        <Users size={16} className="text-emerald-600" /> تصفية حسب الفريق
                    </label>
                    <select
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-right cursor-pointer shadow-sm appearance-none"
                        value={selectedSquad}
                        onChange={(e) => { setSelectedSquad(e.target.value); setSelectedPlayer(''); }}
                    >
                        <option value="">جميع الفرق</option>
                        {squads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="bg-white rounded-[2rem] border border-slate-200 premium-shadow p-6">
                    <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex-row-reverse">
                        <Star size={16} className="text-emerald-600" /> اختيار اللاعب
                    </label>
                    <select
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-right cursor-pointer shadow-sm appearance-none"
                        value={selectedPlayer}
                        onChange={(e) => setSelectedPlayer(e.target.value)}
                    >
                        <option value="">— اختر اللاعب —</option>
                        {filteredPlayers.map(p => (
                            <option key={p.user_id} value={p.user_id}>
                                {p.technical_level === 'A' ? '⭐ ' : ''}{p.full_name} ({p.u_category || p.category || ''})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Evaluation Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden premium-shadow border border-slate-200">
                        {/* Modal Header */}
                        <div className={`px-8 py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <h3 className="font-black text-slate-800 text-xl tracking-tight">⭐ {t('coach.newEvaluation')}</h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            {/* Skills Sliders */}
                            {skills.map(skill => {
                                const colors = getSkillColor(form[skill.key]);
                                return (
                                    <div key={skill.key} className="group">
                                        <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <label className={`text-sm font-bold text-slate-700 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <span>{skill.emoji}</span> {skill.labelKey ? t(skill.labelKey) : skill.label}
                                            </label>
                                            <span className={`text-xl font-black ${colors.text} tabular-nums`}>
                                                {form[skill.key]}<span className="text-slate-300 text-sm">/10</span>
                                            </span>
                                        </div>
                                        {/* Custom Progress Bar */}
                                        <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-1">
                                            <div
                                                className={`absolute inset-y-0 right-0 ${colors.bar} rounded-full transition-all duration-300 shadow-md ${colors.glow}`}
                                                style={{ width: `${form[skill.key] * 10}%` }}
                                            ></div>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={form[skill.key]}
                                            onChange={(e) => setForm({ ...form, [skill.key]: parseInt(e.target.value) })}
                                            className="w-full accent-emerald-600 h-1 opacity-0 cursor-pointer absolute"
                                            style={{ marginTop: '-16px', position: 'relative' }}
                                        />
                                    </div>
                                );
                            })}

                            {/* Overall Score Display */}
                            <div className="bg-slate-900 rounded-2xl p-5 flex items-center justify-between flex-row-reverse">
                                <div className="flex items-center gap-3 flex-row-reverse">
                                    <TrendingUp size={20} className="text-emerald-400" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">المعدل العام</span>
                                </div>
                                <span className="text-3xl font-black text-white tabular-nums">
                                    {overallAvg.toFixed(1)}
                                </span>
                            </div>

                            {/* Date & Notes */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">التاريخ</label>
                                    <input
                                        type="date"
                                        value={form.evaluation_date}
                                        onChange={(e) => setForm({ ...form, evaluation_date: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-bold bg-slate-50 text-right"
                                        dir="ltr"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">ملاحظات</label>
                                    <input
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl font-medium bg-slate-50 text-right"
                                        placeholder="ملاحظة قصيرة..."
                                    />
                                </div>
                            </div>

                            <button
                                disabled={isSaving}
                                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-[11px] uppercase tracking-widest active:scale-95"
                            >
                                <Save size={18} /> {isSaving ? 'جاري الحفظ...' : 'تسجيل التقييم'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Evaluations List */}
            {selectedPlayer ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 flex-row-reverse">
                        <TrendingUp size={20} className="text-purple-600" />
                        <h3 className="font-extrabold text-slate-800 text-lg">سجل التقييمات</h3>
                    </div>
                    {evaluations.length === 0 ? (
                        <div className="p-16 text-center">
                            <Star className="mx-auto text-slate-200 mb-4" size={48} />
                            <p className="text-lg font-bold text-slate-700 mb-1">لا توجد تقييمات بعد</p>
                            <p className="text-sm text-slate-400">ابدأ بتقييم هذا اللاعب لتتبع تطوره</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {evaluations.map(ev => {
                                const avg = skills.reduce((sum, s) => sum + (ev[s.key] || 0), 0) / skills.length;
                                const avgColors = getSkillColor(avg);
                                return (
                                    <div key={ev.id} className="p-6 hover:bg-slate-50/50 transition-colors group">
                                        <div className="flex items-center justify-between mb-5 flex-row-reverse">
                                            <div className="flex items-center gap-4 flex-row-reverse">
                                                <div className={`w-14 h-14 rounded-2xl ${avgColors.text} bg-slate-50 font-black text-xl flex items-center justify-center border border-slate-200 shadow-sm`}>
                                                    {avg.toFixed(1)}
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-slate-900">
                                                        {ev.evaluation_date ? new Date(ev.evaluation_date).toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                                                    </p>
                                                    {ev.notes && <p className="text-sm text-slate-500 mt-1">{ev.notes}</p>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(ev.id)}
                                                className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        {/* Skills Bars */}
                                        <div className="grid grid-cols-5 gap-3">
                                            {skills.map(skill => {
                                                const val = ev[skill.key] || 0;
                                                const sColors = getSkillColor(val);
                                                return (
                                                    <div key={skill.key} className="text-center">
                                                        <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">{skill.emoji} {skill.label}</div>
                                                        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mb-1 mx-auto max-w-[80px]">
                                                            <div
                                                                className={`absolute inset-y-0 right-0 ${sColors.bar} rounded-full`}
                                                                style={{ width: `${val * 10}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className={`text-lg font-black ${sColors.text}`}>{val}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow p-16 text-center">
                    <Star className="mx-auto text-slate-200 mb-4" size={56} />
                    <h3 className="text-xl font-black text-slate-800 mb-2">اختر لاعباً</h3>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">حدد لاعباً من القائمة أعلاه لعرض سجل تقييماته وإضافة تقييمات جديدة</p>
                </div>
            )}
        </div>
    );
};

export default CoachEvaluations;
