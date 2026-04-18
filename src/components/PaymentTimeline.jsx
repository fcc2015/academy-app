import React from 'react';
import { CreditCard, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

/**
 * PaymentTimeline — Visual timeline of payment history.
 * 
 * Props:
 *   - payments: [{amount, status, type, payment_date, created_at}]
 *   - isRTL: boolean
 *   - currency: string (default 'MAD')
 */
export default function PaymentTimeline({ payments = [], isRTL = false, currency = 'MAD' }) {
    if (payments.length === 0) {
        return (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 text-center">
                <CreditCard className="mx-auto text-slate-200 mb-3" size={36} />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {isRTL ? 'لا توجد مدفوعات' : 'No payment history'}
                </p>
            </div>
        );
    }

    const statusConfig = {
        paid:      { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', line: 'bg-emerald-400' },
        Paid:      { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', line: 'bg-emerald-400' },
        Completed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', line: 'bg-emerald-400' },
        completed: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', line: 'bg-emerald-400' },
        Pending:   { icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   line: 'bg-amber-400' },
        pending:   { icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   line: 'bg-amber-400' },
        Overdue:   { icon: AlertCircle,  color: 'text-red-600',     bg: 'bg-red-50',      border: 'border-red-200',     line: 'bg-red-400' },
        overdue:   { icon: AlertCircle,  color: 'text-red-600',     bg: 'bg-red-50',      border: 'border-red-200',     line: 'bg-red-400' },
        late:      { icon: AlertCircle,  color: 'text-red-600',     bg: 'bg-red-50',      border: 'border-red-200',     line: 'bg-red-400' },
    };

    const defaultStatus = { icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200', line: 'bg-slate-300' };

    const sorted = [...payments]
        .sort((a, b) => new Date(b.payment_date || b.created_at || 0) - new Date(a.payment_date || a.created_at || 0))
        .slice(0, 10);

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <div className={`flex items-center gap-2 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="p-2 bg-violet-50 text-violet-600 rounded-xl">
                    <CreditCard size={18} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">
                    {isRTL ? 'سجل المدفوعات' : 'Payment History'}
                </h3>
            </div>

            <div className={`relative ${isRTL ? 'pr-6' : 'pl-6'}`}>
                {/* Timeline line */}
                <div className={`absolute top-0 bottom-0 w-0.5 bg-slate-100 ${isRTL ? 'right-2.5' : 'left-2.5'}`}></div>

                <div className="space-y-4">
                    {sorted.map((p, i) => {
                        const cfg = statusConfig[p.status] || defaultStatus;
                        const Icon = cfg.icon;
                        const date = p.payment_date || p.created_at;
                        return (
                            <div key={i} className={`relative flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                {/* Dot on timeline */}
                                <div className={`absolute w-5 h-5 rounded-full ${cfg.bg} border-2 ${cfg.border} flex items-center justify-center z-10 ${isRTL ? '-right-[1.85rem]' : '-left-[1.85rem]'}`}>
                                    <div className={`w-2 h-2 rounded-full ${cfg.line}`}></div>
                                </div>

                                <div className={`flex-1 ${cfg.bg} rounded-xl p-3.5 border ${cfg.border} hover:shadow-sm transition-shadow`}>
                                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <Icon size={14} className={cfg.color} />
                                            <span className="text-sm font-black text-slate-800">
                                                {p.amount?.toLocaleString()} {currency}
                                            </span>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest" dir="ltr">
                                            {date ? new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                                        </span>
                                    </div>
                                    {p.type && (
                                        <p className={`text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {p.type}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
