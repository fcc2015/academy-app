import React from 'react';
import { ShieldAlert, Clock, MousePointer } from 'lucide-react';

/**
 * SessionWarning — تحذير قبل انتهاء الجلسة
 * يظهر overlay مع عد تنازلي + زر "أنا هنا"
 */
const SessionWarning = ({ remainingSeconds, onExtend, isRTL = false }) => {
    const percentage = (remainingSeconds / 60) * 100;

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full text-center premium-shadow border border-red-100 relative overflow-hidden">
                {/* خط علوي متحرك */}
                <div className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${percentage}%` }} />

                {/* أيقونة */}
                <div className="mx-auto w-20 h-20 rounded-full bg-red-50 border-4 border-red-100 flex items-center justify-center mb-6 animate-pulse">
                    <ShieldAlert size={36} className="text-red-500" />
                </div>

                {/* العنوان */}
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                    {isRTL ? '⚠️ الجلسة على وشك الانتهاء' : '⚠️ Session Expiring'}
                </h2>
                <p className="text-slate-500 font-bold text-sm mb-6">
                    {isRTL
                        ? 'لم يتم اكتشاف أي نشاط لفترة طويلة. سيتم تسجيل خروجك تلقائياً.'
                        : 'No activity detected for a while. You will be logged out automatically.'}
                </p>

                {/* العد التنازلي */}
                <div className="relative mx-auto w-24 h-24 mb-8">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="#fee2e2" strokeWidth="8" />
                        <circle cx="50" cy="50" r="42" fill="none" stroke="url(#timer-gradient)"
                            strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 42}`}
                            strokeDashoffset={`${2 * Math.PI * 42 * (1 - percentage / 100)}`}
                            className="transition-all duration-1000 ease-linear" />
                        <defs>
                            <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="100%" stopColor="#f97316" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-red-600 tabular-nums">{remainingSeconds}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest text-red-400">
                            {isRTL ? 'ثانية' : 'SEC'}
                        </span>
                    </div>
                </div>

                {/* أزرار */}
                <button
                    onClick={onExtend}
                    className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black uppercase tracking-[0.2em] text-[12px] rounded-2xl shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
                >
                    <MousePointer size={18} />
                    {isRTL ? '✅ أنا هنا — مدّد الجلسة' : '✅ I\'m here — Extend Session'}
                </button>

                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <Clock size={12} />
                    {isRTL ? 'الجلسة تنتهي بعد 10 دقائق بدون نشاط' : 'Session expires after 10 min of inactivity'}
                </div>
            </div>
        </div>
    );
};

export default SessionWarning;
