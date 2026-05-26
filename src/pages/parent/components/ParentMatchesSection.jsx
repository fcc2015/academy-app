import React from 'react';
import { Calendar, MapPin, Trophy, AlertTriangle } from 'lucide-react';

export default function ParentMatchesSection({
    child,
    activeTab,
    upcomingMatches,
    pastMatches,
    isRTL,
    t
}) {
    const today = new Date();

    if (child.account_status === 'Suspended' && activeTab === 'upcoming') {
        return (
            <div className="bg-red-50 border-2 border-red-200 rounded-[2.5rem] p-12 text-center animate-slide-up">
                <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
                <p className="text-lg font-black text-red-700">
                    {isRTL ? '⛔ الحساب موقوف — لا يمكن مشاهدة المباريات القادمة' : '⛔ Account suspended — match convocations hidden'}
                </p>
                <p className="text-sm text-red-500 mt-2">
                    {isRTL ? 'يرجى تسوية المستحقات المالية لإعادة تفعيل الحساب.' : 'Please settle outstanding payments to reactivate.'}
                </p>
            </div>
        );
    }

    const matchesList = activeTab === 'upcoming' ? upcomingMatches : pastMatches;
    const isUpcoming = activeTab === 'upcoming';

    return (
        <div className="animate-slide-up">
            <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className={`px-10 py-7 border-b border-slate-100 flex items-center gap-5 ${
                    isUpcoming ? 'bg-emerald-50/60' : 'bg-fuchsia-50/60'
                } ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`p-3.5 rounded-[1.5rem] shadow-sm ${
                        isUpcoming ? 'bg-emerald-100 text-emerald-600' : 'bg-fuchsia-100 text-fuchsia-600'
                    }`}>
                        {isUpcoming ? <Calendar size={24} /> : <Trophy size={24} />}
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800">
                            {isUpcoming 
                                ? (isRTL ? 'المباريات القادمة' : 'Upcoming Matches')
                                : (isRTL ? 'المباريات السابقة' : 'Past Matches')
                            }
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {matchesList.length} {isUpcoming 
                                ? (isRTL ? 'مباراة قادمة' : 'scheduled')
                                : (isRTL ? 'مباراة سابقة' : 'played')
                            }
                        </p>
                    </div>
                </div>
                <div className="p-6">
                    {matchesList.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            {isUpcoming ? <Calendar size={36} className="mx-auto mb-3 opacity-20" /> : <Trophy size={36} className="mx-auto mb-3 opacity-20" />}
                            <p className="font-black text-sm uppercase tracking-widest">
                                {isUpcoming 
                                    ? (isRTL ? 'لا توجد مباريات قادمة' : 'No upcoming matches')
                                    : (isRTL ? 'لا توجد مباريات سابقة' : 'No past matches yet')
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {matchesList.map(m => (
                                <div 
                                    key={m.id} 
                                    className={`rounded-[2rem] p-6 hover:shadow-xl transition-all duration-300 ${
                                        isUpcoming 
                                            ? 'border-2 border-emerald-100 bg-emerald-50/30 hover:border-emerald-300' 
                                            : 'border border-slate-100 bg-white hover:border-fuchsia-200'
                                    }`}
                                >
                                    <div className={`flex items-center gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex flex-col items-center justify-center font-black text-slate-700 shadow-sm border border-slate-100">
                                            <span className="text-[10px] uppercase tracking-wide text-slate-400">
                                                {new Date(m.match_date).toLocaleDateString(isRTL ? 'ar' : 'en', { month: 'short' })}
                                            </span>
                                            <span className="text-xl leading-tight">{new Date(m.match_date).getDate()}</span>
                                        </div>
                                        <div className={isRTL ? 'text-right' : 'text-left'}>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                isUpcoming ? 'text-emerald-500' : 'text-slate-400'
                                            }`}>
                                                {isUpcoming 
                                                    ? (isRTL ? 'قادمة' : 'Upcoming')
                                                    : (isRTL ? 'ملعوبة' : 'Played')
                                                }
                                            </span>
                                            <h4 className="text-lg font-black text-slate-900">
                                                {isRTL ? 'ضد' : 'vs'} {m.opponent_name}
                                            </h4>
                                        </div>
                                    </div>
                                    <div className={`grid grid-cols-2 gap-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-2">
                                            <MapPin size={14} className="text-slate-400 shrink-0" />
                                            <span className="text-xs font-black text-slate-600 truncate">{m.location || 'TBD'}</span>
                                        </div>
                                        <div className={`rounded-2xl p-3 flex items-center gap-2 ${
                                            isUpcoming ? 'bg-emerald-50' : 'bg-fuchsia-50'
                                        }`}>
                                            <Trophy size={14} className={`shrink-0 ${
                                                isUpcoming ? 'text-emerald-500' : 'text-fuchsia-500'
                                            }`} />
                                            <span className={`text-xs font-black truncate ${
                                                isUpcoming ? 'text-emerald-700' : 'text-fuchsia-700'
                                            }`}>{m.match_type}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
