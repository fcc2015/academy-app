import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { CalendarCheck, CheckCircle2, XCircle, Clock, ShieldAlert, Filter } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SkeletonDashboard } from '../../components/Skeleton';
import AttendanceHeatmap from '../../components/AttendanceHeatmap';

const ParentAttendance = () => {
    const { t, isRTL, dir } = useLanguage();
    const [attendance, setAttendance] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const userId = localStorage.getItem('user_id');
                const res = await authFetch(`${API_URL}/players/`);
                if (res.ok) {
                    const players = await res.json();
                    const child = players.find(p => p.user_id === userId || p.parent_id === userId) || players[0];
                    if (child?.user_id) {
                        const attRes = await authFetch(`${API_URL}/attendance/player/${child.user_id}`);
                        if (attRes.ok) {
                            const records = await attRes.json();
                            setAttendance(records.sort((a, b) => new Date(b.date) - new Date(a.date)));
                        }
                    }
                }
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAttendance();
    }, []);

    const statusConfig = {
        present: { label: isRTL ? 'حاضر' : 'Present', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
        absent: { label: isRTL ? 'غائب' : 'Absent', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
        late: { label: isRTL ? 'متأخر' : 'Late', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
        excused: { label: isRTL ? 'معذور' : 'Excused', icon: ShieldAlert, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' }
    };

    // Stats
    const total = attendance.length;
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    const lateCount = attendance.filter(a => a.status === 'late').length;
    const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

    if (isLoading) {
        return <SkeletonDashboard />;
    }

    return (
        <div className={`animate-fade-in space-y-8 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                    {isRTL ? 'سجل' : 'Attendance'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">{isRTL ? 'الحضور' : 'Record'}</span>
                </h1>
                <p className="text-[15px] font-medium text-slate-500">{isRTL ? 'تتبع حضور طفلك في التمارين' : "Track your child's training attendance"}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
                <div className="bg-white rounded-2xl border border-slate-200 premium-shadow p-5 text-center hover-lift">
                    <p className="text-3xl font-black text-sky-600 tabular-nums">{rate}%</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">{isRTL ? 'نسبة الحضور' : 'Attendance Rate'}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 premium-shadow p-5 text-center hover-lift">
                    <p className="text-3xl font-black text-emerald-600 tabular-nums">{presentCount}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">{isRTL ? 'حاضر' : 'Present'}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 premium-shadow p-5 text-center hover-lift">
                    <p className="text-3xl font-black text-red-600 tabular-nums">{absentCount}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">{isRTL ? 'غائب' : 'Absent'}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 premium-shadow p-5 text-center hover-lift">
                    <p className="text-3xl font-black text-amber-600 tabular-nums">{lateCount}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">{isRTL ? 'متأخر' : 'Late'}</p>
                </div>
            </div>

            {/* Attendance Progress Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 premium-shadow p-6">
                <h3 className="font-extrabold text-slate-800 mb-4">{isRTL ? 'نظرة عامة على الحضور' : 'Attendance Overview'}</h3>
                <div className="w-full bg-slate-100 rounded-full h-6 overflow-hidden">
                    <div className="flex h-full">
                        {presentCount > 0 && (
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(presentCount / Math.max(total, 1)) * 100}%` }}></div>
                        )}
                        {lateCount > 0 && (
                            <div className="bg-amber-400 h-full transition-all" style={{ width: `${(lateCount / Math.max(total, 1)) * 100}%` }}></div>
                        )}
                        {absentCount > 0 && (
                            <div className="bg-red-400 h-full transition-all" style={{ width: `${(absentCount / Math.max(total, 1)) * 100}%` }}></div>
                        )}
                    </div>
                </div>
                <div className={`flex gap-6 mt-3 text-xs font-bold ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> {isRTL ? 'حاضر' : 'Present'}</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400"></span> {isRTL ? 'متأخر' : 'Late'}</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400"></span> {isRTL ? 'غائب' : 'Absent'}</span>
                </div>
            </div>

            {/* Heatmap */}
            <AttendanceHeatmap records={attendance} isRTL={isRTL} />

            {/* Records */}
            <div className="bg-white rounded-2xl border border-slate-200 premium-shadow overflow-hidden">
                <div className={`px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h3 className="font-extrabold text-slate-800 text-lg">{isRTL ? 'سجل الحضور' : 'Attendance History'}</h3>
                    <span className="text-xs font-black text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">{total} {isRTL ? 'سجل' : 'Records'}</span>
                </div>
                {attendance.length === 0 ? (
                    <div className="p-12 text-center">
                        <CalendarCheck className="mx-auto text-slate-200 mb-4" size={48} />
                        <h4 className="font-bold text-slate-800 mb-2">{isRTL ? 'لا توجد سجلات بعد' : 'No Records Yet'}</h4>
                        <p className="text-sm text-slate-500">{isRTL ? 'ستظهر سجلات الحضور هنا بمجرد أن يبدأ المدرب بالتتبع.' : 'Attendance records will appear here once the coach starts tracking.'}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {attendance.map((record, i) => {
                            const config = statusConfig[record.status] || statusConfig.present;
                            const Icon = config.icon;
                            return (
                                <div key={i} className={`p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className="text-sm font-bold text-slate-800 w-28" dir="ltr">
                                            {record.date ? new Date(record.date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'N/A'}
                                        </div>
                                    </div>
                                    <span className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${config.bg} ${config.color} border ${config.border}`}>
                                        <Icon size={14} /> {config.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParentAttendance;
