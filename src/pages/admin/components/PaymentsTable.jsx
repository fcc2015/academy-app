import React from 'react';
import { Search, Monitor, Smartphone, FileText, CheckCircle, Clock, Check, X, Receipt, Edit2, Trash2 } from 'lucide-react';

const PaymentsTable = ({
    isLoading,
    filteredPayments,
    t,
    isRTL,
    dir,
    setReceiptUrl,
    setIsReceiptModalOpen,
    handleQuickPay,
    handleDeletePayment,
    setInvoicePayment,
    handleEditClick,
    navigate,
    searchTerm,
    setSearchTerm
}) => {
    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden border-b-8 border-b-slate-900 animate-fade-in">
            <div className={`px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h3 className={`font-extrabold text-slate-800 text-lg flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Monitor size={20} className="text-emerald-500" /> {t('finances.recentTransactions')}
                </h3>

                <div className={`relative w-full sm:w-80`}>
                    <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={18} />
                    <input
                        type="text"
                        placeholder={t('finances.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-sm`}
                    />
                </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
                <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} border-collapse`} dir={dir}>
                    <thead>
                        <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                            <th className="px-8 py-6">{t('finances.playerInfo')}</th>
                            <th className="px-8 py-6">{t('common.amount')}</th>
                            <th className="px-8 py-6">{t('finances.method')}</th>
                            <th className="px-8 py-6">{t('common.date')}</th>
                            <th className="px-8 py-6 text-center">{t('finances.paymentStatus')}</th>
                            <th className="px-8 py-6">{t('finances.control')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            <tr>
                                <td colSpan="6" className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">جاري الدخول للأرشيف المالي...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredPayments.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs opacity-50">
                                    لا توجد تسجيلات تطابق البحث
                                </td>
                            </tr>
                        ) : (
                            filteredPayments.map((payment) => (
                                <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4 flex-row-reverse text-right">
                                            <div className="text-right">
                                                <div className="font-extrabold text-slate-900 text-[15px] tracking-tight mb-1">
                                                    {payment.users?.full_name || 'منخرط غير معروف'}
                                                </div>
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1 flex-wrap">
                                                    {payment.notes?.includes('Receipt: ') ? (
                                                        <>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    const url = payment.notes.match(/Receipt: (https?:\/\/[^\s]+)/)?.[1];
                                                                    if (url) {
                                                                        setReceiptUrl(url);
                                                                        setIsReceiptModalOpen(true);
                                                                    }
                                                                }}
                                                                className="text-sky-500 hover:text-sky-700 flex items-center gap-1 bg-sky-50 px-2 py-0.5 rounded cursor-pointer border border-sky-200 shadow-sm"
                                                            >
                                                                <FileText size={12} /> {isRTL ? 'عرض الإيصال' : 'View Receipt'}
                                                            </button>
                                                            <span className="truncate max-w-[150px]">
                                                                {payment.notes.replace(/Receipt: https?:\/\/[^\s]+\n?/, '') || 'مرفق إيصال'}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        payment.notes || 'بدون ملاحظات'
                                                    )}
                                                </div>
                                            </div>
                                            {payment.users?.parent_whatsapp && (
                                                <a 
                                                    href={`https://wa.me/${payment.users.parent_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`أكاديمية أثليتيك: بخصوص أداء مبلغ ${payment.amount} درهم.`)}`} 
                                                    target="_blank" rel="noreferrer"
                                                    className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all shadow-sm group-hover:scale-110 active:scale-95"
                                                    title="تواصل عبر واتساب"
                                                >
                                                    <Smartphone size={16} />
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="font-black text-slate-900 text-lg tracking-tighter">{payment.amount} درهم</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-tighter">
                                            {payment.payment_method === 'Cash' ? 'نقداً' :
                                             payment.payment_method === 'Card' ? 'بطاقة' :
                                             payment.payment_method === 'Bank Transfer' || payment.payment_method === 'Virement' ? 'تحويل بنكي' :
                                             payment.payment_method === 'CashPlus' ? 'كاش بلوس' :
                                             payment.payment_method === 'Wafacash' ? 'وفاكاش' :
                                             payment.payment_method === 'PayPal' ? 'باي بال' :
                                             payment.payment_method}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-[11px] font-extrabold text-slate-500">
                                            {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('ar-MA') : '—'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        {payment.status === 'Completed' || payment.status === 'paid' ? (
                                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-black border border-emerald-100 uppercase tracking-tighter text-[10px] flex-row-reverse shadow-sm">
                                                <CheckCircle size={12} /> تم التحصيل
                                            </span>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 font-black border border-amber-100 uppercase tracking-tighter text-[10px] flex-row-reverse">
                                                    <Clock size={12} /> قيد المراجعة
                                                </span>
                                                <div className="flex gap-2 w-full justify-center">
                                                    <button 
                                                        onClick={() => handleQuickPay(payment)}
                                                        className="flex-1 px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 text-[10px] font-bold"
                                                        title="تأكيد الاستلام"
                                                    >
                                                        <Check size={14} /> تأكيد
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeletePayment(payment.id)}
                                                        className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-all shadow-sm active:scale-95 flex items-center justify-center text-[10px] font-bold"
                                                        title="رفض"
                                                    >
                                                        <X size={14} /> رفض
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-left">
                                        <div className="flex justify-start gap-1">
                                            <button
                                                onClick={() => navigate(`/invoice/${payment.id}`)}
                                                className="p-3 text-slate-300 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                                                title="فاتورة مطبوعة"
                                            >
                                                <FileText size={18} />
                                            </button>
                                            <button onClick={() => setInvoicePayment(payment)} className="p-3 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="وصل / Facture"><Receipt size={18} /></button>
                                            <button onClick={() => handleEditClick(payment)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-slate-100/50 rounded-xl transition-all"><Edit2 size={18} /></button>
                                            <button onClick={() => handleDeletePayment(payment.id)} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PaymentsTable;
