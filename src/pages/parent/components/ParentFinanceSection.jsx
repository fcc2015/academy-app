import React from 'react';
import { CheckCircle2, Clock, CreditCard, Wallet, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';

const ParentFinanceSection = ({ payments, child, isRTL }) => {
    const totalPaid = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + (p.amount || 0), 0);
    const pendingAmount = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);
    const monthlyFee = child.monthly_fee || 0;
    const balanceDue = monthlyFee > 0 ? Math.max(0, monthlyFee - (totalPaid % monthlyFee)) : 0;

    const paymentsByYearMonth = payments.reduce((acc, p) => {
        const d = new Date(p.payment_date || p.created_at || Date.now());
        const y = d.getFullYear(), m = d.getMonth();
        const yk = String(y), mk = `${y}-${String(m + 1).padStart(2, '0')}`;
        acc.years[yk] = (acc.years[yk] || 0) + (p.status === 'confirmed' ? (p.amount || 0) : 0);
        acc.months[mk] = (acc.months[mk] || 0) + (p.status === 'confirmed' ? (p.amount || 0) : 0);
        return acc;
    }, { years: {}, months: {} });

    const yearEntries = Object.entries(paymentsByYearMonth.years).sort((a, b) => b[0].localeCompare(a[0]));
    const monthEntries = Object.entries(paymentsByYearMonth.months).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);

    return (
        <div className="animate-slide-up space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white rounded-[2rem] border border-emerald-100 premium-shadow p-6 text-center">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm"><CheckCircle2 size={26} /></div>
                    <p className="text-3xl font-black text-emerald-600">{totalPaid.toLocaleString()}<span className="text-sm font-bold text-slate-400 ml-1">MAD</span></p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{isRTL ? 'إجمالي المدفوع' : 'Total Paid'}</p>
                </div>
                <div className="bg-white rounded-[2rem] border border-amber-100 premium-shadow p-6 text-center">
                    <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm"><Clock size={26} /></div>
                    <p className="text-3xl font-black text-amber-600">{pendingAmount.toLocaleString()}<span className="text-sm font-bold text-slate-400 ml-1">MAD</span></p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{isRTL ? 'قيد المراجعة' : 'Pending Review'}</p>
                </div>
                <div className={`bg-white rounded-[2rem] border ${balanceDue > 0 ? 'border-red-100' : 'border-emerald-100'} premium-shadow p-6 text-center`}>
                    <div className={`w-14 h-14 ${balanceDue > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'} rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm`}>
                        <CreditCard size={26} />
                    </div>
                    <p className={`text-3xl font-black ${balanceDue > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{balanceDue.toLocaleString()}<span className="text-sm font-bold text-slate-400 ml-1">MAD</span></p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{isRTL ? 'الباقي للدفع' : 'Balance Due'}</p>
                </div>
            </div>

            {balanceDue > 0 && (
                <div className={`flex items-center gap-4 p-5 bg-red-50 border border-red-100 rounded-[1.5rem] ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                    <AlertTriangle size={22} className="text-red-500 shrink-0" />
                    <p className="text-sm font-bold text-red-700">
                        {isRTL ? `يرجى تسوية الرصيد المتبقي (${balanceDue.toLocaleString()} MAD) في أقرب وقت ممكن.` : `Please settle the remaining balance (${balanceDue.toLocaleString()} MAD) as soon as possible.`}
                    </p>
                </div>
            )}

            {/* Monthly Tracking */}
            <div className={`bg-white rounded-[2rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className={`px-8 py-5 border-b border-slate-100 flex items-center gap-4 bg-indigo-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl shadow-sm"><Calendar size={22} /></div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800">{isRTL ? 'المتابعة الشهرية' : 'Suivi Mensuel'}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'آخر 12 شهر' : 'Last 12 months'}</p>
                    </div>
                </div>
                <div className="p-6">
                    {monthEntries.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-6">{isRTL ? 'لا توجد مدفوعات' : 'Aucun paiement'}</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {monthEntries.map(([key, val]) => {
                                const [yy, mm] = key.split('-');
                                const monthName = new Date(+yy, +mm - 1, 1).toLocaleDateString(isRTL ? 'ar' : 'fr', { month: 'short', year: '2-digit' });
                                return (
                                    <div key={key} className={`rounded-2xl p-4 border ${val > 0 ? 'border-emerald-100 bg-emerald-50/40' : 'border-slate-100 bg-slate-50/40'}`}>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1" dir="ltr">{monthName}</p>
                                        <p className={`text-lg font-black ${val > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{val.toLocaleString()}<span className="text-[10px] font-bold text-slate-400 ml-1">MAD</span></p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Yearly Tracking */}
            <div className={`bg-white rounded-[2rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className={`px-8 py-5 border-b border-slate-100 flex items-center gap-4 bg-violet-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 bg-violet-100 text-violet-600 rounded-2xl shadow-sm"><TrendingUp size={22} /></div>
                    <div>
                        <h3 className="text-lg font-black text-slate-800">{isRTL ? 'المتابعة السنوية' : 'Suivi Annuel'}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'مجموع كل سنة' : 'Total par année'}</p>
                    </div>
                </div>
                <div className="p-6">
                    {yearEntries.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-6">{isRTL ? 'لا توجد مدفوعات' : 'Aucun paiement'}</p>
                    ) : (
                        <div className="space-y-2">
                            {yearEntries.map(([year, total]) => {
                                const max = Math.max(...yearEntries.map(e => e[1])) || 1;
                                const pct = (total / max) * 100;
                                return (
                                    <div key={year} className="flex items-center gap-4">
                                        <span className="text-sm font-black text-slate-700 w-14" dir="ltr">{year}</span>
                                        <div className="flex-1 h-8 rounded-full bg-slate-100 overflow-hidden relative">
                                            <div className="h-full bg-gradient-to-r from-violet-400 to-purple-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-sm font-black text-slate-800 w-28 text-right" dir="ltr">{total.toLocaleString()} MAD</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Payment History */}
            <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-teal-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-4 bg-teal-100 text-teal-600 rounded-[1.5rem] shadow-sm"><Wallet size={28} /></div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">{isRTL ? 'سجل المدفوعات' : 'Payment History'}</h3>
                        <p className="text-sm font-bold text-slate-500">{payments.length} {isRTL ? 'عملية مالية' : 'transactions'}</p>
                    </div>
                </div>
                <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-50 p-2">
                    {payments.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <CreditCard size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-black uppercase tracking-widest text-sm">{isRTL ? 'لا توجد مدفوعات بعد' : 'No payments yet'}</p>
                        </div>
                    ) : payments.map((p, i) => {
                        const isPaid = p.status === 'confirmed';
                        return (
                            <div key={i} className={`p-5 flex items-center justify-between hover:bg-slate-50 transition-all rounded-3xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {isPaid ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                                    </div>
                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                        <p className="font-black text-slate-800 text-sm">{p.payment_method || (isRTL ? 'دفعة' : 'Payment')}</p>
                                        <p className="text-xs text-slate-400" dir="ltr">{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>
                                <div className={isRTL ? 'text-left' : 'text-right'}>
                                    <p className={`font-black text-lg ${isPaid ? 'text-emerald-600' : 'text-amber-600'}`}>{(p.amount || 0).toLocaleString()} <span className="text-xs text-slate-400">MAD</span></p>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {isPaid ? (isRTL ? 'مؤكد' : 'Confirmed') : (isRTL ? 'معلق' : 'Pending')}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ParentFinanceSection;
