import React from 'react';
import { CalendarCheck, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import AttendanceHeatmap from '../../../components/AttendanceHeatmap';

export default function ParentAttendanceSection({
    attendance = [],
    attendPct = 0,
    isRTL,
    t
}) {
    return (
        <div className={`animate-slide-up bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className={`px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-4 bg-emerald-100 text-emerald-600 rounded-[1.5rem] shadow-sm">
                        <CalendarCheck size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                            {isRTL ? 'سجل الحضور' : 'Attendance History'}
                        </h3>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                            {isRTL ? `${attendance.length} حصة تدريبية` : `${attendance.length} training sessions`}
                        </p>
                    </div>
                </div>
                {attendance.length > 0 && (
                    <div className="flex flex-col items-center">
                        <span className="text-4xl font-black text-emerald-600 bg-white shadow-xl shadow-emerald-600/10 w-24 h-24 rounded-full flex items-center justify-center border-4 border-emerald-50 ring-8 ring-white">
                            {attendPct}%
                        </span>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                            {isRTL ? 'نسبة الحضور' : 'Attendance'}
                        </p>
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
                        <p className="text-lg font-black text-slate-400 uppercase tracking-widest">
                            {isRTL ? 'لا يوجد سجل حضور.' : 'No attendance records yet.'}
                        </p>
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
    );
}
