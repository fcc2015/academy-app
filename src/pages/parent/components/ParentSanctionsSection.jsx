import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ParentSanctionsSection = ({ sanctions = [], isRTL }) => {
    const typeLabels = {
        Warning:    { ar: 'إنذار',              color: 'text-amber-600 bg-amber-50 border-amber-100' },
        Suspension: { ar: 'توقيف عن اللعب',    color: 'text-red-600 bg-red-50 border-red-100' },
        Fine:       { ar: 'غرامة مالية',        color: 'text-rose-600 bg-rose-50 border-rose-100' },
        Match_Ban:  { ar: 'حرمان من المباريات', color: 'text-red-700 bg-red-100 border-red-200' }
    };
    const statusLabels = {
        'Pending Approval': { ar: 'قيد الانتظار',   color: 'bg-yellow-100 text-yellow-800' },
        'Approved':         { ar: 'مقبولة/نشطة',    color: 'bg-emerald-100 text-emerald-800' },
        'Rejected':         { ar: 'مرفوضة',          color: 'bg-slate-100 text-slate-500' },
        'Cancelled':        { ar: 'ملغاة/مرفوعة',   color: 'bg-sky-100 text-sky-800' }
    };

    return (
        <div className={`animate-slide-up bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-rose-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="p-4 bg-rose-100 text-rose-600 rounded-[1.5rem] shadow-sm"><AlertTriangle size={28} /></div>
                <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{isRTL ? 'العقوبات والانضباط' : 'Disciplinary & Sanctions'}</h3>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{isRTL ? 'سجل العقوبات والإنذارات' : 'Sanctions & Warnings History'}</p>
                </div>
            </div>
            <div className="p-8">
                {sanctions.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 m-8 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                        <AlertTriangle className="mx-auto text-slate-200 mb-6 opacity-40" size={48} />
                        <p className="text-lg font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'السجل نظيف! لا توجد عقوبات.' : 'Clean record! No sanctions found.'}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sanctions.map((s, idx) => {
                            const typeInfo = typeLabels[s.sanction_type] || { ar: s.sanction_type, color: 'text-slate-600 bg-slate-50' };
                            const statusInfo = statusLabels[s.status] || { ar: s.status, color: 'bg-slate-100 text-slate-800' };
                            return (
                                <div key={idx} className="border border-slate-100 rounded-[2rem] p-6 hover:shadow-lg transition-all duration-300 bg-white">
                                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <span className={`px-4 py-1.5 rounded-xl text-xs font-black border ${typeInfo.color}`}>
                                                {isRTL ? typeInfo.ar : s.sanction_type}
                                            </span>
                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${statusInfo.color}`}>
                                                {isRTL ? statusInfo.ar : s.status}
                                            </span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-400" dir="ltr">
                                            {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                    <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        <p className="text-base font-bold text-slate-800">
                                            {isRTL ? `السبب: ${s.reason}` : `Reason: ${s.reason}`}
                                        </p>
                                        {s.report_text && (
                                            <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-2xl italic">{s.report_text}</p>
                                        )}
                                        {s.amount > 0 && (
                                            <div className={`flex items-center gap-2 text-sm font-black text-rose-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <span>{isRTL ? 'مبلغ الغرامة:' : 'Fine Amount:'}</span>
                                                <span className="bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">{s.amount} MAD</span>
                                            </div>
                                        )}
                                        {s.end_date && (
                                            <p className="text-xs text-slate-400">
                                                {isRTL ? `تاريخ الانتهاء: ${new Date(s.end_date).toLocaleDateString()}` : `End Date: ${new Date(s.end_date).toLocaleDateString()}`}
                                            </p>
                                        )}
                                        {s.coach_name && (
                                            <p className="text-xs text-slate-400">
                                                {isRTL ? `بطلب من المدرب: ${s.coach_name}` : `Requested by Coach: ${s.coach_name}`}
                                            </p>
                                        )}
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

export default ParentSanctionsSection;
