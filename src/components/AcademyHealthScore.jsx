import React, { useMemo } from 'react';
import { Heart, TrendingUp, TrendingDown, Minus, Users, CreditCard, CalendarCheck, Star } from 'lucide-react';

/**
 * AcademyHealthScore — Visual health indicator for an academy.
 * 
 * Calculates a 0-100 score from:
 *   - Payment collection rate (40% weight)
 *   - Attendance rate (30% weight)
 *   - Player count trend (15% weight)
 *   - Evaluation coverage (15% weight)
 *
 * Props:
 *   - payments: array of payment objects (with status field)
 *   - players: array of player objects
 *   - attendanceRate: number 0-100 (pre-calculated)
 *   - evaluationsCoverage: number 0-100 (% of players with recent eval)
 *   - isRTL: boolean
 *   - t: translation function
 */
export default function AcademyHealthScore({ 
    payments = [], 
    players = [], 
    attendanceRate = 0, 
    evaluationsCoverage = 0,
    isRTL = false,
    t = (k) => k
}) {
    const metrics = useMemo(() => {
        // Payment collection rate
        const totalPayments = payments.length || 1;
        const paidPayments = payments.filter(p => 
            p && ['paid', 'Paid', 'Completed', 'completed'].includes(p.status)
        ).length;
        const paymentRate = Math.round((paidPayments / totalPayments) * 100);

        // Player count score (more players = better, cap at 100 for 50+ players)
        const playerScore = Math.min(100, Math.round((players.length / 50) * 100));

        // Overall health score (weighted)
        const score = Math.round(
            paymentRate * 0.4 +
            attendanceRate * 0.3 +
            playerScore * 0.15 +
            evaluationsCoverage * 0.15
        );

        return { score, paymentRate, playerScore };
    }, [payments, players, attendanceRate, evaluationsCoverage]);

    const { score } = metrics;

    // Score classification
    const getClass = (s) => {
        if (s >= 80) return { label: isRTL ? 'ممتاز' : 'Excellent', color: '#10b981', bg: 'bg-emerald-50', ring: 'ring-emerald-200', icon: TrendingUp };
        if (s >= 60) return { label: isRTL ? 'جيد' : 'Good', color: '#f59e0b', bg: 'bg-amber-50', ring: 'ring-amber-200', icon: Minus };
        if (s >= 40) return { label: isRTL ? 'متوسط' : 'Average', color: '#f97316', bg: 'bg-orange-50', ring: 'ring-orange-200', icon: TrendingDown };
        return { label: isRTL ? 'يحتاج تحسين' : 'Needs Work', color: '#ef4444', bg: 'bg-red-50', ring: 'ring-red-200', icon: TrendingDown };
    };

    const cls = getClass(score);
    const Icon = cls.icon;

    // SVG ring progress
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const breakdowns = [
        { label: isRTL ? 'التحصيل' : 'Payments', value: metrics.paymentRate, icon: CreditCard, color: 'text-emerald-600' },
        { label: isRTL ? 'الحضور' : 'Attendance', value: attendanceRate, icon: CalendarCheck, color: 'text-blue-600' },
        { label: isRTL ? 'اللاعبون' : 'Players', value: metrics.playerScore, icon: Users, color: 'text-violet-600' },
        { label: isRTL ? 'التقييمات' : 'Evaluations', value: evaluationsCoverage, icon: Star, color: 'text-amber-600' },
    ];

    return (
        <div className={`bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 relative overflow-hidden`}>
            {/* Decorative glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: cls.color }}></div>

            <div className={`flex items-center gap-2 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`p-2 rounded-xl ${cls.bg}`}>
                    <Heart size={18} style={{ color: cls.color }} />
                </div>
                <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-widest">
                    {isRTL ? 'صحة الأكاديمية' : 'Academy Health'}
                </h3>
            </div>

            {/* Ring score */}
            <div className="flex flex-col items-center mb-6">
                <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                        <circle cx="64" cy="64" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
                        <circle
                            cx="64" cy="64" r={radius}
                            fill="none"
                            stroke={cls.color}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-slate-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{score}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">/100</span>
                    </div>
                </div>
                <div className={`mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${cls.bg} ${cls.ring} ring-1`} style={{ color: cls.color }}>
                    <Icon size={12} />
                    {cls.label}
                </div>
            </div>

            {/* Breakdown bars */}
            <div className="space-y-3">
                {breakdowns.map((item, i) => {
                    const ItemIcon = item.icon;
                    return (
                        <div key={i}>
                            <div className={`flex justify-between items-center mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <span className={`text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <ItemIcon size={11} className={item.color} /> {item.label}
                                </span>
                                <span className="text-[11px] font-black text-slate-700">{item.value}%</span>
                            </div>
                            <div className={`h-1.5 w-full bg-slate-100 rounded-full overflow-hidden ${isRTL ? 'rotate-180' : ''}`}>
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${item.value}%`, background: cls.color }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
