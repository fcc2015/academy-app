import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, Award, Download, XCircle, IdCard } from 'lucide-react';
import FUTCard from '../../components/FUTCard';
import html2canvas from 'html2canvas';

const skills = [
    { key: 'technical_score', label: 'التقييم التقني', color: 'bg-blue-500' },
    { key: 'tactical_score', label: 'التقييم التكتيكي', color: 'bg-emerald-500' },
    { key: 'physical_score', label: 'اللياقة البدنية', color: 'bg-purple-500' },
    { key: 'mental_score', label: 'القوة الذهنية', color: 'bg-amber-500' }
];

const ParentEvaluations = () => {
    const [evaluations, setEvaluations] = useState([]);
    const [childInfo, setChildInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCardModal, setShowCardModal] = useState(false);
    const userId = localStorage.getItem('user_id');

    useEffect(() => {
        const fetchEvaluations = async () => {
            try {
                const parentsPlayersRes = await authFetch(`${API_URL}/players/parent/${userId}`);
                if (parentsPlayersRes.ok) {
                    const parentsPlayers = await parentsPlayersRes.json();
                    let child = parentsPlayers[0];
                    
                    // DEV FALLBACK: If no child found directly, try finding self as player
                    if (!child) {
                        const allRes = await authFetch(`${API_URL}/players/`);
                        const all = await allRes.json();
                        child = all.find(p => p.user_id === userId);
                    }

                    if (child) {
                        setChildInfo(child);
                        const evalRes = await authFetch(`${API_URL}/evaluations/?player_id=${child.user_id}`);
                        if (evalRes.ok) {
                            let data = await evalRes.json();
                            
                            // If specifically John Doe and we got nothing, but he has evals, 
                            // maybe there's a filtering mismatch. Let's try fetching all if empty.
                            if (data.length === 0) {
                                const allEvalsRes = await authFetch(`${API_URL}/evaluations/`);
                                if (allEvalsRes.ok) {
                                    const allEvals = await allEvalsRes.json();
                                    data = allEvals.filter(e => e.player_id === child.user_id);
                                }
                            }
                            // Sort by date descending
                            data.sort((a,b) => new Date(b.evaluation_date) - new Date(a.evaluation_date));
                            setEvaluations(data);
                        }
                    }
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvaluations();
    }, [userId]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
            </div>
        );
    }

    const avgScores = {};
    skills.forEach(s => {
        const values = evaluations.map(e => e[s.key] || 0).filter(v => v > 0);
        avgScores[s.key] = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 0;
    });
    const overallAvg = Object.values(avgScores).filter(v => v > 0).length > 0
        ? (Object.values(avgScores).reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / Object.values(avgScores).filter(v => v > 0).length).toFixed(1)
        : 0;

    const latestEvaluation = evaluations.length > 0 ? evaluations[0] : null;

    const handleDownloadCard = async () => {
        const element = document.getElementById('fut-card-container');
        if (!element) return;
        
        try {
            const canvas = await html2canvas(element, { backgroundColor: null, scale: 2 });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `fut-card-${childInfo?.full_name || 'player'}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to download image', err);
        }
    };

    return (
        <div className="animate-fade-in space-y-8 text-right" dir="rtl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                        تقرير <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">الأداء</span>
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">متابعة التقييمات الدورية لمهارات طفلك من طرف المدربين</p>
                </div>
                <div className="flex items-center gap-3">
                    {latestEvaluation && (
                        <button
                            onClick={() => setShowCardModal(true)}
                            className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-transform shadow-lg shadow-yellow-500/30"
                        >
                            <Award size={16} /> FUT Card
                        </button>
                    )}
                </div>
            </div>

            {/* Overall Score */}
            <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-[2.5rem] p-8 text-white premium-shadow relative overflow-hidden">
                <div className="absolute left-10 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 blur-2xl"></div>
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shrink-0">
                        <span className="text-4xl font-black">{overallAvg}</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">التقييم العام</h2>
                        <p className="text-sky-100 font-bold mt-1">بناءً على {evaluations.length} تقييم{evaluations.length > 2 && evaluations.length < 11 ? 'ات' : ''} معتمد</p>
                    </div>
                </div>
            </div>

            {/* Skill Bars */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow p-8 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-sky-50 rounded-xl">
                       <TrendingUp size={24} className="text-sky-600" />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-lg">تحليل المهارات</h3>
                </div>
                {skills.map(skill => {
                    const score = parseFloat(avgScores[skill.key]) || 0;
                    const percentage = (score / 10) * 100;
                    return (
                        <div key={skill.key}>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-bold text-slate-700">{skill.label}</span>
                                <span className="text-sm font-black text-slate-900">{score}/10</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div className={`h-full rounded-full ${skill.color} transition-all duration-700`} style={{ width: `${percentage}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Evaluation History */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden p-2">
                <div className="px-6 py-5 rounded-3xl bg-slate-50 flex items-center justify-between pointer-events-none">
                    <h3 className="font-extrabold text-slate-800 text-lg">سجل التقييمات</h3>
                    <span className="text-xs font-black text-slate-400 bg-white px-3 py-1.5 rounded-xl border border-slate-200">{evaluations.length} إجمالي</span>
                </div>
                {evaluations.length === 0 ? (
                    <div className="p-12 text-center">
                        <Star className="mx-auto text-slate-200 mb-4" size={48} />
                        <h4 className="font-bold text-slate-800 mb-2">لا توجد تقييمات بعد</h4>
                        <p className="text-sm text-slate-500">لم يتم تقييم طفلك بعد من طرف الطاقم التقني. يرجى المراجعة لاحقاً.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {evaluations.map((ev, i) => {
                            const avg = skills.reduce((sum, s) => sum + (ev[s.key] || 0), 0) / skills.length;
                            return (
                                <div key={i} className="p-6 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 font-black text-lg flex items-center justify-center shrink-0 border border-sky-100">
                                                {avg.toFixed(1)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900" dir="ltr">
                                                    {ev.evaluation_date ? new Date(ev.evaluation_date).toLocaleDateString('en-GB') : 'N/A'}
                                                </p>
                                                {ev.notes && <p className="text-sm text-slate-500 mt-1 max-w-sm leading-relaxed">{ev.notes}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                            {[...Array(5)].map((_, idx) => (
                                                <Star key={idx} size={14} className={idx < Math.round(avg / 2) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {skills.map(skill => (
                                            <div key={skill.key} className="text-center bg-slate-50 border border-slate-100 rounded-xl py-2">
                                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">{skill.label}</div>
                                                <div className="text-lg font-black text-slate-800">{ev[skill.key] || '-'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* FUT Card Modal */}
            {showCardModal && latestEvaluation && childInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-[2.5rem] p-8 w-full max-w-sm relative flex flex-col items-center border border-slate-700 shadow-2xl">
                        <button 
                            onClick={() => setShowCardModal(false)}
                            className="absolute top-4 right-4 bg-white/10 text-white/50 hover:bg-white/20 hover:text-white rounded-full p-2 transition-all"
                        >
                            <XCircle size={24}/>
                        </button>
                        <h3 className="font-black text-yellow-500 text-lg mb-8 tracking-widest uppercase mt-2">بطاقة اللاعب الرسمية</h3>
                        
                        <div id="fut-card-container" className="mb-8">
                            <FUTCard player={childInfo} evaluation={latestEvaluation} />
                        </div>

                        <button 
                            onClick={handleDownloadCard} 
                            className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 px-6 py-3 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-yellow-500/20 hover:scale-105 transition-all text-sm"
                        >
                            <Download size={18} /> تحميل البطاقة
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentEvaluations;
