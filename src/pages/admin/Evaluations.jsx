import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import {
    Star,
    TrendingUp,
    Activity,
    Zap,
    Brain,
    Calendar,
    User,
    Plus,
    X,
    ChevronRight,
    Search,
    Trash2,
    Trophy,
    Download
} from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import FUTCard from '../../components/FUTCard';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';

const Evaluations = () => {
    const { t, isRTL, dir } = useLanguage();
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [evaluations, setEvaluations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showCardModal, setShowCardModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

    const [formData, setFormData] = useState({
        player_id: '',
        technical_score: 5,
        tactical_score: 5,
        physical_score: 5,
        mental_score: 5,
        notes: ''
    });

    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        setIsLoading(true);
        try {
            const res = await authFetch(`${API_URL}/players/`);
            if (res.ok) {
                const data = await res.json();
                setPlayers(data);
            }
        } catch (error) {
            console.error('Error fetching players:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchEvaluations = async (playerId) => {
        try {
            const res = await authFetch(`${API_URL}/evaluations/?player_id=${playerId}`);
            if (res.ok) {
                const data = await res.json();
                setEvaluations(data);
            }
        } catch (error) {
            console.error('Error fetching evaluations:', error);
        }
    };

    const handlePlayerSelect = (player) => {
        setSelectedPlayer(player);
        setFormData({ ...formData, player_id: player.user_id });
        fetchEvaluations(player.user_id);
    };

    const handleScoreChange = (dimension, value) => {
        setFormData({ ...formData, [dimension]: parseInt(value) });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await authFetch(`${API_URL}/evaluations/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setShowModal(false);
                fetchEvaluations(selectedPlayer.user_id);
                // Reset scores but keep player_id
                setFormData({
                    ...formData,
                    technical_score: 5,
                    tactical_score: 5,
                    physical_score: 5,
                    mental_score: 5,
                    notes: ''
                });
            }
        } catch (error) {
            console.error('Error saving evaluation:', error);
        }
    };

    const handleDelete = (evalId) => {
        setConfirmDialog({ isOpen: true, id: evalId });
    };

    const confirmDelete = async () => {
        const evalId = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        try {
            const res = await authFetch(`${API_URL}/evaluations/${evalId}`, { method: 'DELETE' });
            if (res.ok) { fetchEvaluations(selectedPlayer.user_id); }
        } catch (error) {
            console.error('Error deleting evaluation:', error);
        }
    };

    const filteredPlayers = players.filter(p =>
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getScoreColor = (score) => {
        if (score >= 8) return 'text-emerald-600 bg-emerald-50';
        if (score >= 5) return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
    };

    const MetricSlider = ({ label, icon: IconProp, value, onChange, dimension }) => {
        const Icon = IconProp;
        return (
        <div className="space-y-3">
            <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest text-slate-500">
                <div className="flex items-center gap-2">
                    <Icon size={16} className="text-indigo-600" />
                    <span>{label}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-md ${getScoreColor(value)}`}>{value}/10</span>
            </div>
            <input
                type="range" min="1" max="10"
                value={value}
                onChange={(e) => onChange(dimension, e.target.value)}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
        </div>
        );
    };

    return (
        <div className={`animate-fade-in pb-20 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            <div className={`flex justify-between items-center mb-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                        {isRTL ? '' : 'Player '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            {t('coach.evaluatePlayers') || (isRTL ? 'التقييمات' : 'Evaluations')}
                        </span>
                        {isRTL ? ' اللاعبين' : ''}
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">
                        {isRTL ? 'تتبع وتحليل أداء وتقييمات اللاعبين' : 'Track and analyze performance metrics'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Player List */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white rounded-3xl border border-slate-200 premium-shadow p-6">
                        <div className="relative mb-6">
                            <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? 'right-4' : 'left-4'}`} size={18} />
                            <input
                                placeholder={t('common.search') || (isRTL ? 'بحث...' : 'Search...')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500/20 ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
                            />
                        </div>

                        <div className={`space-y-2 max-h-[600px] overflow-y-auto ${isRTL ? 'pl-2' : 'pr-2'} custom-scrollbar`}>
                            {isLoading ? (
                                <div className="p-10 text-center text-slate-400 font-bold italic">{t('common.loading') || (isRTL ? 'جاري التحميل...' : 'Loading...')}</div>
                            ) : filteredPlayers.map(player => (
                                <div
                                    key={player.user_id}
                                    onClick={() => handlePlayerSelect(player)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between ${selectedPlayer?.user_id === player.user_id
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                            : 'bg-white border-slate-100 hover:border-indigo-300'
                                        } ${isRTL ? 'flex-row-reverse text-right' : ''}`}
                                >
                                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${selectedPlayer?.user_id === player.user_id ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {player.full_name?.[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-[15px]">{player.full_name}</p>
                                            <p className={`text-[12px] ${selectedPlayer?.user_id === player.user_id ? 'text-white/70' : 'text-slate-400'}`}>
                                                {player.u_category}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className={`${selectedPlayer?.user_id === player.user_id ? 'text-white' : 'text-slate-300'} ${isRTL ? 'rotate-180' : ''}`} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Evaluation Details */}
                <div className="lg:col-span-8">
                    {selectedPlayer ? (
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl border border-slate-200 premium-shadow p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 mb-1">{selectedPlayer.full_name}</h2>
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">
                                        {selectedPlayer.u_category} • {selectedPlayer.subscription_type}
                                    </span>
                                </div>
                                <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <button
                                        onClick={() => setShowCardModal(true)}
                                        className="flex items-center gap-2 bg-gradient-to-tr from-[#d4af37] to-[#e8c057] text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[13px] hover:scale-105 transition-all shadow-xl shadow-amber-500/30"
                                    >
                                        <Trophy size={18} /> {isRTL ? 'بطاقة اللاعب' : 'Player Card'}
                                    </button>
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[13px] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                                    >
                                        <Plus size={18} /> {isRTL ? 'تقييم جديد' : 'New Evaluation'}
                                    </button>
                                </div>
                            </div>

                            {/* Radar Chart — latest evaluation with progression overlay */}
                            {evaluations.length > 0 && (() => {
                                const latest = evaluations[0];
                                const radarData = [
                                    { subject: isRTL ? 'تقني' : 'Technical', value: latest.technical_score, fullMark: 10 },
                                    { subject: isRTL ? 'تكتيكي' : 'Tactical', value: latest.tactical_score, fullMark: 10 },
                                    { subject: isRTL ? 'بدني' : 'Physical', value: latest.physical_score, fullMark: 10 },
                                    { subject: isRTL ? 'ذهني' : 'Mental', value: latest.mental_score, fullMark: 10 },
                                ];
                                // Add previous evaluation for comparison
                                const prev = evaluations.length > 1 ? evaluations[1] : null;
                                if (prev) {
                                    radarData[0].prev = prev.technical_score;
                                    radarData[1].prev = prev.tactical_score;
                                    radarData[2].prev = prev.physical_score;
                                    radarData[3].prev = prev.mental_score;
                                }
                                const avg = ((latest.technical_score + latest.tactical_score + latest.physical_score + latest.mental_score) / 4).toFixed(1);
                                const prevAvg = prev ? ((prev.technical_score + prev.tactical_score + prev.physical_score + prev.mental_score) / 4).toFixed(1) : null;
                                const improved = prevAvg ? (avg - prevAvg).toFixed(1) : null;
                                return (
                                    <div className="bg-white rounded-3xl border border-slate-200 premium-shadow p-6">
                                        <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <h3 className={`font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <TrendingUp size={16} className="text-indigo-600" /> {isRTL ? 'مخطط الأداء' : 'Performance Radar'}
                                            </h3>
                                            <div className="flex items-center gap-3">
                                                {improved && (
                                                    <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${parseFloat(improved) >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                        {parseFloat(improved) >= 0 ? '↑' : '↓'} {Math.abs(improved)}
                                                    </span>
                                                )}
                                                <span className={`text-2xl font-black ${avg >= 8 ? 'text-emerald-600' : avg >= 5 ? 'text-amber-600' : 'text-red-600'}`}>{avg}<span className="text-sm text-slate-400 font-bold">/10</span></span>
                                            </div>
                                        </div>
                                        {prev && (
                                            <div className={`flex gap-4 text-[10px] font-bold uppercase tracking-widest mb-1 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                                                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-600 inline-block rounded"></span> {isRTL ? 'الحالي' : 'Current'}</span>
                                                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-300 inline-block rounded"></span> {isRTL ? 'السابق' : 'Previous'}</span>
                                            </div>
                                        )}
                                        <div style={{ height: 260 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                                                    <PolarGrid stroke="#e2e8f0" />
                                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fontWeight: 700, fill: '#64748b' }} />
                                                    {prev && (
                                                        <Radar name="Previous" dataKey="prev" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
                                                    )}
                                                    <Radar name="Current" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2.5} dot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                );
                            })()}

                            <div className="space-y-4">
                                <h3 className={`font-black text-slate-800 uppercase tracking-widest text-xs flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <Activity size={16} className="text-indigo-600" /> {isRTL ? 'سجل التطور' : 'Progress Timeline'}
                                </h3>

                                {evaluations.length === 0 ? (
                                    <div className="bg-white rounded-3xl border border-slate-200 border-dashed p-20 text-center">
                                        <TrendingUp className="mx-auto text-slate-200 mb-4" size={48} />
                                        <p className="text-slate-400 font-bold italic">{isRTL ? 'لا توجد تقييمات لهذا اللاعب بعد.' : 'No evaluations recorded for this player yet.'}</p>
                                    </div>
                                ) : evaluations.map(evalItem => (
                                    <div key={evalItem.id} className="bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden group">
                                        <div className="p-8">
                                            <div className={`flex justify-between items-start mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400">
                                                        <Calendar size={20} />
                                                    </div>
                                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                                        <p className="font-black text-slate-800 text-[15px]">
                                                            {new Date(evalItem.evaluation_date).toLocaleDateString()}
                                                        </p>
                                                        <p className={`text-[12px] font-bold text-slate-400 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                            <User size={12} /> {isRTL ? 'المدرب:' : 'Coach:'} {evalItem.coaches?.full_name || (isRTL ? 'إدارة النظام' : 'System Administrator')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(evalItem.id)}
                                                    className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                                {[
                                                    { label: isRTL ? 'تقني' : 'Technical', icon: Zap, val: evalItem.technical_score },
                                                    { label: isRTL ? 'تكتيكي' : 'Tactical', icon: Brain, val: evalItem.tactical_score },
                                                    { label: isRTL ? 'بدني' : 'Physical', icon: Activity, val: evalItem.physical_score },
                                                    { label: isRTL ? 'ذهني' : 'Mental', icon: Star, val: evalItem.mental_score },
                                                ].map((m, idx) => (
                                                    <div key={idx} className="space-y-2">
                                                        <div className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-500 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                                            <m.icon size={12} className="text-indigo-600" /> {m.label}
                                                        </div>
                                                        <div className={`h-2 w-full bg-slate-100 rounded-full overflow-hidden flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
                                                            <div
                                                                className={`h-full rounded-full ${evalItem.average >= 8 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                                                style={{ width: `${m.val * 10}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-[14px] font-black text-slate-800">{m.val}/10</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {evalItem.notes && (
                                                <div className={`bg-slate-50 p-6 rounded-2xl border border-slate-100 ${isRTL ? 'text-right' : 'text-left'}`}>
                                                    <p className="text-sm font-medium text-slate-600 italic leading-relaxed">
                                                        "{evalItem.notes}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-white rounded-3xl border border-slate-200 border-dashed p-20 flex flex-col items-center justify-center text-center">
                            <Star className="text-slate-200 mb-6 animate-pulse" size={64} />
                            <h2 className="text-2xl font-black text-slate-900 mb-2">{isRTL ? 'مركز الأداء' : 'Performance Center'}</h2>
                            <p className="text-slate-400 font-bold max-w-sm">{isRTL ? 'اختر لاعباً من القائمة لعرض تاريخ تقييماته وتطوره الفني.' : 'Select a player from the list to view their evaluation history and performance development.'}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Evaluation Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200" dir={dir}>
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden premium-shadow">
                        <div className={`px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <h3 className="text-2xl font-black text-slate-900">{isRTL ? 'إدخال تقييم جديد' : 'New Performance Entry'}</h3>
                                <p className="text-sm font-medium text-slate-500">{isRTL ? 'تقييم اللاعب:' : 'Evaluating'} {selectedPlayer?.full_name}</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className={`p-10 space-y-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                                <MetricSlider label={isRTL ? 'المهارات التقنية' : 'Technical Skills'} icon={Zap} value={formData.technical_score} onChange={handleScoreChange} dimension="technical_score" />
                                <MetricSlider label={isRTL ? 'الوعي التكتيكي' : 'Tactical Awareness'} icon={Brain} value={formData.tactical_score} onChange={handleScoreChange} dimension="tactical_score" />
                                <MetricSlider label={isRTL ? 'الحالة البدنية' : 'Physical Condition'} icon={Activity} value={formData.physical_score} onChange={handleScoreChange} dimension="physical_score" />
                                <MetricSlider label={isRTL ? 'الصلابة الذهنية' : 'Mental Resilience'} icon={Star} value={formData.mental_score} onChange={handleScoreChange} dimension="mental_score" />
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500">{isRTL ? 'ملاحظات المدرب' : 'Coach Observations'}</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder={isRTL ? 'قدم تعليقات مفصلة عن أداء اللاعب...' : 'Provide detailed feedback on the player\'s performance...'}
                                    className={`w-full p-6 bg-slate-50 border border-slate-200 rounded-3xl font-medium focus:ring-2 focus:ring-indigo-500/20 h-32 resize-none ${isRTL ? 'text-right' : 'text-left'}`}
                                />
                            </div>

                            <div className={`flex gap-4 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                                >
                                    {isRTL ? 'تأكيد التقييم' : 'Submit Evaluation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* FUT Card Modal */}
            {showCardModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-500">
                    <div className="relative w-full max-w-md flex flex-col items-center">
                        <button 
                            onClick={() => setShowCardModal(false)} 
                            className="absolute -top-16 right-0 md:-right-16 h-12 w-12 flex items-center justify-center rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/30 hover:rotate-90 transition-all duration-300"
                        >
                            <X size={24} />
                        </button>
                        
                        <div className="mb-10 text-center animate-pulse">
                            <h3 className="text-3xl font-black text-white tracking-widest drop-shadow-[0_0_15px_rgba(232,192,87,0.8)] mb-2 flex items-center justify-center gap-3">
                                <Trophy className="text-[#e8c057]" />
                                ULTIMATE PLAYER
                                <Trophy className="text-[#e8c057]" />
                            </h3>
                            <p className="text-white/60 text-xs tracking-[0.2em] font-bold">BASED ON LATEST ACADEMY PERFORMANCE</p>
                        </div>
                        
                        <FUTCard 
                            player={selectedPlayer} 
                            evaluation={evaluations.length > 0 ? [...evaluations].sort((a,b) => new Date(b.evaluation_date) - new Date(a.evaluation_date))[0] : null} 
                        />

                        <button 
                            className="mt-12 flex items-center gap-3 bg-gradient-to-r from-white to-slate-200 text-slate-900 px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)]"
                            onClick={() => {
                                // TODO: implement canvas capture for card download
                            }}
                        >
                            <Download size={20} /> Download Card
                        </button>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onConfirm={confirmDelete}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
                isRTL={isRTL}
                title={isRTL ? 'حذف التقييم' : 'Delete Evaluation'}
                message={isRTL ? 'هل أنت متأكد من حذف هذا التقييم؟' : 'Are you sure you want to delete this evaluation?'}
            />
        </div>
    );
};

export default Evaluations;
