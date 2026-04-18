import React, { useMemo } from 'react';

/**
 * AttendanceHeatmap — GitHub-style contribution heatmap for attendance.
 * 
 * Shows the last 12 weeks (84 days) as colored cells:
 *   - Present = green
 *   - Absent = red
 *   - Late = amber
 *   - Excused = blue
 *   - No session = gray dot
 * 
 * Props:
 *   - records: [{date: 'YYYY-MM-DD', status: 'present'|'absent'|'late'|'excused'}]
 *   - isRTL: boolean
 */
export default function AttendanceHeatmap({ records = [], isRTL = false }) {
    const { weeks, stats } = useMemo(() => {
        const today = new Date();
        const dayMap = {};
        
        // Index records by date
        records.forEach(r => {
            if (r.date) {
                const key = r.date.slice(0, 10);
                dayMap[key] = r.status;
            }
        });

        // Build 12 weeks of data (84 days)
        const weeksArr = [];
        let present = 0, absent = 0, late = 0, total = 0;
        
        for (let w = 11; w >= 0; w--) {
            const week = [];
            for (let d = 6; d >= 0; d--) {
                const date = new Date(today);
                date.setDate(date.getDate() - (w * 7 + d));
                const key = date.toISOString().slice(0, 10);
                const status = dayMap[key] || null;
                
                if (status) {
                    total++;
                    if (status === 'present') present++;
                    else if (status === 'absent') absent++;
                    else if (status === 'late') late++;
                }
                
                week.push({ date: key, status, dayOfWeek: date.getDay() });
            }
            weeksArr.push(week);
        }

        return {
            weeks: weeksArr,
            stats: { present, absent, late, total, rate: total ? Math.round((present / total) * 100) : 0 }
        };
    }, [records]);

    const getColor = (status) => {
        if (!status) return 'bg-slate-100';
        switch (status) {
            case 'present': return 'bg-emerald-500';
            case 'absent': return 'bg-red-400';
            case 'late': return 'bg-amber-400';
            case 'excused': return 'bg-blue-400';
            default: return 'bg-slate-200';
        }
    };

    const dayLabels = isRTL 
        ? ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب']
        : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">
                    {isRTL ? 'خريطة الحضور' : 'Attendance Heatmap'}
                </h3>
                <span className={`text-lg font-black ${stats.rate >= 80 ? 'text-emerald-600' : stats.rate >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                    {stats.rate}%
                </span>
            </div>

            {/* Heatmap grid */}
            <div className={`flex gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {/* Day labels */}
                <div className="flex flex-col gap-1 pt-0">
                    {dayLabels.map((d, i) => (
                        <div key={i} className="w-4 h-4 flex items-center justify-center text-[8px] font-bold text-slate-400">
                            {i % 2 === 1 ? d : ''}
                        </div>
                    ))}
                </div>
                {/* Weeks */}
                {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-1">
                        {week.map((day, di) => (
                            <div
                                key={di}
                                className={`w-4 h-4 rounded-[3px] ${getColor(day.status)} transition-colors hover:ring-2 hover:ring-slate-300 cursor-default`}
                                title={`${day.date}: ${day.status || 'no session'}`}
                            />
                        ))}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className={`flex items-center gap-3 mt-4 text-[9px] font-bold uppercase tracking-widest text-slate-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500"></span> {isRTL ? 'حاضر' : 'Present'}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400"></span> {isRTL ? 'متأخر' : 'Late'}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400"></span> {isRTL ? 'غائب' : 'Absent'}</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-100"></span> {isRTL ? 'بدون' : 'None'}</span>
            </div>

            {/* Mini stats */}
            <div className={`grid grid-cols-3 gap-2 mt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                    <p className="text-lg font-black text-emerald-600">{stats.present}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-500">{isRTL ? 'حاضر' : 'Present'}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-2.5 text-center">
                    <p className="text-lg font-black text-red-500">{stats.absent}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-red-400">{isRTL ? 'غائب' : 'Absent'}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-2.5 text-center">
                    <p className="text-lg font-black text-amber-600">{stats.late}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-amber-500">{isRTL ? 'متأخر' : 'Late'}</p>
                </div>
            </div>
        </div>
    );
}
