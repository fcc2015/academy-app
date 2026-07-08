import React from 'react';
import { Star, TrendingUp, Lightbulb, Award, Shield, CalendarCheck, Heart, AlertTriangle } from 'lucide-react';
import FUTCard from '../../../components/FUTCard';

export default function ParentPerformanceSection({
    child = {},
    activeTab,
    evaluations = [],
    levelBars = [],
    tips = [],
    injuries = [],
    isRTL,
    t
}) {
    if (child?.account_status === 'Suspended') {
        return (
            <div className="bg-red-50 border-2 border-red-200 rounded-[2.5rem] p-12 text-center animate-slide-up">
                <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
                <p className="text-lg font-black text-red-700">
                    {isRTL ? '⛔ الحساب موقوف — التقييمات غير متاحة' : '⛔ Account suspended - evaluations hidden'}
                </p>
                <p className="text-sm text-red-500 mt-2">
                    {isRTL ? 'يرجى تسوية المستحقات المالية.' : 'Please settle outstanding payments.'}
                </p>
            </div>
        );
    }

    const latestEval = evaluations[0] || null;

    return (
        <div className="animate-slide-up space-y-6">
            {/* ═══ BADGE TAB ═══ */}
            {activeTab === 'badge' && (
                <div className="flex flex-col items-center gap-8">
                    <div className={`text-center ${isRTL ? 'text-right' : 'text-left'} w-full`}>
                        <h3 className="text-2xl font-black text-slate-800">
                            {isRTL ? 'بطاقة اللاعب الرسمية' : 'Official Player Card'}
                        </h3>
                        <p className="text-slate-500 text-sm">
                            {isRTL ? 'بطاقتك FUT الشخصية' : 'Your personal FUT-style card'}
                        </p>
                    </div>
                    <FUTCard player={child} evaluation={latestEval} />
                </div>
            )}

            {/* ═══ LEVEL TAB ═══ */}
            {activeTab === 'level' && (
                <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-amber-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-4 bg-amber-100 text-amber-600 rounded-[1.5rem] shadow-sm">
                            <TrendingUp size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">
                                {isRTL ? 'مستوى اللاعب' : 'Player Level'}
                            </h3>
                            <p className="text-sm font-bold text-slate-500">
                                {isRTL ? 'تحليل شامل للمهارات' : 'Full skills breakdown'}
                            </p>
                        </div>
                    </div>
                    <div className="p-10">
                        {levelBars.length === 0 ? (
                            <div className="text-center py-16 text-slate-400">
                                <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-black uppercase tracking-widest">{isRTL ? 'لا يوجد تقييم بعد' : 'No evaluation yet'}</p>
                                <p className="text-sm mt-2">
                                    {isRTL ? 'سيظهر المستوى بعد أول تقييم من المدرب' : 'Level will appear after the first coach evaluation'}
                                </p>
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
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ COACH TIPS TAB ═══ */}
            {activeTab === 'tips' && (
                <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-lime-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-4 bg-lime-100 text-lime-600 rounded-[1.5rem] shadow-sm">
                            <Lightbulb size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">
                                {isRTL ? 'نصائح وتوجيهات' : 'Tips & Recommendations'}
                            </h3>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                {isRTL ? 'نصائح مخصصة لتطوير مستواك' : 'Personalised tips for improvement'}
                            </p>
                        </div>
                    </div>
                    <div className="p-10 space-y-6">
                        {tips.map((tip, i) => {
                            const TipIcon = tip.icon || Lightbulb;
                            return (
                                <div key={i} className={`p-6 rounded-[2rem] border border-slate-100 flex gap-4 hover:shadow-md transition-shadow ${
                                    isRTL ? 'flex-row-reverse' : ''
                                }`}>
                                    <div className={`p-4.5 rounded-2xl shrink-0 mt-0.5 ${
                                        tip.color === 'blue' ? 'bg-blue-50 text-blue-500' :
                                        tip.color === 'purple' ? 'bg-purple-50 text-purple-500' :
                                        tip.color === 'green' ? 'bg-green-50 text-green-500' :
                                        tip.color === 'amber' ? 'bg-amber-50 text-amber-500' :
                                        tip.color === 'rose' ? 'bg-rose-50 text-rose-500' :
                                        tip.color === 'emerald' ? 'bg-emerald-50 text-emerald-500' :
                                        'bg-lime-50 text-lime-500'
                                    }`}>
                                        <TipIcon size={22} />
                                    </div>
                                    <div>
                                        <p className="text-[16px] font-bold text-slate-700 leading-relaxed">
                                            {isRTL ? tip.ar : tip.en}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══ TECHNICAL EVALUATIONS LIST TAB ═══ */}
            {activeTab === 'performance' && (
                <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-amber-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-4 bg-amber-100 text-amber-600 rounded-[1.5rem] shadow-sm">
                            <Star size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                {isRTL ? 'التقييمات التقنية' : 'Technical Evaluations'}
                            </h3>
                            <p className="text-sm font-bold text-slate-500">
                                {isRTL ? 'آخر تقييمات المدرب وتوصياته' : 'Latest coach evaluations and feedback'}
                            </p>
                        </div>
                    </div>
                    <div className="p-8 sm:p-10">
                        {evaluations.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                                <Star className="mx-auto text-slate-200 mb-6" size={48} />
                                <p className="text-lg font-black text-slate-400 uppercase tracking-widest">
                                    {isRTL ? 'لم يتم تسجيل أي تقييم بعد.' : 'No evaluations recorded yet.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {evaluations.slice(0, 8).map((ev, i) => (
                                    <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:border-amber-200 hover:shadow-xl transition-all duration-300">
                                        <div className={`flex items-center justify-between mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                <Star size={14} className="text-amber-400" />
                                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400" dir="ltr">
                                                    {ev.evaluation_date ? new Date(ev.evaluation_date).toLocaleDateString() : 'N/A'}
                                                </p>
                                            </div>
                                            <span className="flex items-center gap-1.5 text-amber-500 font-black text-lg bg-amber-50 px-3 py-1 rounded-xl">
                                                <Star size={16} fill="currentColor" /> {ev.overall_rating?.toFixed(1)}
                                                <span className="text-slate-400 font-bold text-xs">/10</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3 mb-5 overflow-hidden">
                                            <div 
                                                className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-[1s]" 
                                                style={{width: `${(ev.overall_rating / 10) * 100}%`}}
                                            ></div>
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
        </div>
    );
}
