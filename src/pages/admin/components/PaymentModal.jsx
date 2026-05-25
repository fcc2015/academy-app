import React from 'react';
import { X, DollarSign } from 'lucide-react';

const PaymentModal = ({
    isOpen,
    onClose,
    onSubmit,
    isEditMode,
    formData,
    handleInputChange,
    players,
    isSubmitting,
    couponCodeInput,
    setCouponCodeInput,
    appliedCoupon,
    handleRemoveCoupon,
    handleApplyCoupon,
    couponError,
    amountBreakdown,
    isRTL
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in text-right" dir="rtl">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg premium-shadow overflow-hidden border border-slate-200">
                <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center flex-row-reverse">
                    <h3 className="font-black text-slate-800 text-2xl tracking-tight flex items-center gap-3">
                        <DollarSign size={24} className="text-emerald-500" /> {isEditMode ? 'تعديل بيانات دفعة مقبوضة' : 'تسجيل عملية قبض جديدة'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-all"><X size={20} /></button>
                </div>

                <div className="max-h-[75vh] overflow-y-auto">
                    <form onSubmit={onSubmit} className="p-10 space-y-6 text-right">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">اسم المنخرط / اللاعب</label>
                            <select
                                name="user_id"
                                value={formData.user_id}
                                onChange={handleInputChange}
                                required
                                disabled={isEditMode}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm cursor-pointer appearance-none text-right"
                            >
                                <option value="" disabled>— اختر من القائمة —</option>
                                {players.map(p => (
                                    <option key={p.user_id} value={p.user_id}>{p.full_name} ({p.u_category})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">المبلغ (درهم)</label>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    required min="0" step="0.01"
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-emerald-500/10 text-right shadow-sm"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الوسيلة</label>
                                <select
                                    name="payment_method"
                                    value={formData.payment_method}
                                    onChange={handleInputChange}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-right shadow-sm cursor-pointer appearance-none"
                                >
                                    <option value="Cash">نقداً / كاش</option>
                                    <option value="Card">بطاقة بنكية</option>
                                    <option value="Bank Transfer">تحويل بنكي (Virement)</option>
                                    <option value="CashPlus">كاش بلوس (CashPlus)</option>
                                    <option value="Wafacash">وفاكاش (Wafacash)</option>
                                    <option value="PayPal">باي بال (PayPal)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">وضعية التحصيل الآن</label>
                            <div className="grid grid-cols-2 bg-slate-50 p-2 rounded-2xl gap-2 border border-slate-100 flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={() => handleInputChange({ target: { name: 'status', value: 'Completed' } })}
                                    className={`py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm ${formData.status === 'Completed' ? 'bg-white text-emerald-600 border border-emerald-100 ring-4 ring-emerald-500/5' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    مؤدى (تم القبض)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleInputChange({ target: { name: 'status', value: 'Pending' } })}
                                    className={`py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm ${formData.status === 'Pending' ? 'bg-white text-amber-600 border border-amber-100 ring-4 ring-amber-500/5' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    معلق (في الانتظار)
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">ملاحظات (اختياري)</label>
                            <input
                                type="text"
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 text-right shadow-sm"
                                placeholder="مثلا: اشتراك شهر اكتوبر"
                            />
                        </div>

                        {!isEditMode && formData.user_id && (
                            <div className="mt-4 p-8 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden text-right">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-[80px] opacity-10"></div>
                                <div className="mb-6 relative z-10">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">كوبون تخفيض</label>
                                    <div className="flex gap-3 flex-row-reverse">
                                        <input
                                            type="text"
                                            value={couponCodeInput}
                                            onChange={(e) => setCouponCodeInput(e.target.value)}
                                            className="flex-1 px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm font-black text-white uppercase placeholder:normal-case focus:border-emerald-500 transition-all outline-none"
                                            placeholder="أدخل الرمز هنا..."
                                            disabled={appliedCoupon !== null}
                                        />
                                        {appliedCoupon ? (
                                            <button type="button" onClick={handleRemoveCoupon} className="px-6 py-3.5 bg-red-500/10 text-red-500 font-black text-[10px] uppercase rounded-xl hover:bg-red-500/20 transition-all">إلغاء</button>
                                        ) : (
                                            <button type="button" onClick={handleApplyCoupon} className="px-6 py-3.5 bg-emerald-600 text-white font-black text-[10px] uppercase rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all">تطبيق</button>
                                        )}
                                    </div>
                                    {couponError && <p className="text-red-400 text-[9px] mt-2 font-black uppercase">{couponError}</p>}
                                </div>

                                {amountBreakdown && (
                                    <div className="space-y-4 border-t border-white/10 pt-6 relative z-10">
                                        {amountBreakdown.lines.map((line, idx) => (
                                            <div key={idx} className="flex justify-between items-center flex-row-reverse text-[11px] font-bold">
                                                <span className="text-slate-400 uppercase tracking-widest">{line.label}</span>
                                                <span className={`${line.isDeduction ? 'text-red-400' : 'text-slate-100'}`}>
                                                    {line.isDeduction ? '-' : ''}{Math.abs(line.value).toFixed(2)} درهم
                                                </span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between items-center flex-row-reverse pt-4 mt-2 border-t border-white/10">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">الإجمالي المستحق</span>
                                            <span className="text-2xl font-black text-white tracking-tighter">{amountBreakdown.finalAmount.toFixed(2)} درهم</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="pt-8 flex gap-4 justify-end items-center border-t border-slate-100 mt-4 flex-row-reverse">
                            <button type="submit" disabled={isSubmitting} className="flex-1 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all transform active:scale-95 disabled:opacity-50">
                                {isEditMode ? 'تحديث البيانات المذكورة' : 'تأكيد عملية القبض'}
                            </button>
                            <button type="button" onClick={onClose} className="px-10 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">إلغاء</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
