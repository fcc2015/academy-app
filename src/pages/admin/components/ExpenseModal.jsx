import React from 'react';
import { X, MinusCircle } from 'lucide-react';

const ExpenseModal = ({
    isOpen,
    onClose,
    onSubmit,
    editingExpenseId,
    expenseFormData,
    handleExpenseChange
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in text-right" dir="rtl">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg premium-shadow overflow-hidden border border-slate-200">
                <div className="px-10 py-8 border-b border-slate-100 bg-red-50 flex justify-between items-center flex-row-reverse">
                    <h3 className="font-black text-red-800 text-2xl tracking-tight flex items-center gap-3">
                        <MinusCircle size={24} /> {editingExpenseId ? 'تعديل المصروف' : 'تسجيل مصروف جديد'}
                    </h3>
                    <button onClick={onClose} className="text-red-400 hover:text-red-600 p-2 hover:bg-white rounded-full transition-all"><X size={20} /></button>
                </div>

                <form onSubmit={onSubmit} className="p-10 space-y-6 text-right">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">المبلغ المخصوم (درهم)</label>
                            <input
                                type="number"
                                name="amount"
                                value={expenseFormData.amount}
                                onChange={handleExpenseChange}
                                required min="0" step="0.01"
                                className="w-full px-6 py-4 bg-red-50/30 border border-red-100 rounded-2xl text-sm font-black text-red-600 outline-none focus:ring-4 focus:ring-red-500/10 text-right shadow-sm"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">تاريخ المصروف</label>
                            <input
                                type="date"
                                name="expense_date"
                                value={expenseFormData.expense_date}
                                onChange={handleExpenseChange}
                                required
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-slate-500/10 text-right shadow-sm appearance-none cursor-pointer"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">صنف المصروف</label>
                        <select
                            name="category"
                            value={expenseFormData.category}
                            onChange={handleExpenseChange}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm cursor-pointer appearance-none text-right"
                        >
                            <option value="Salaires">رواتب المدربين (Salaires)</option>
                            <option value="Équipement">معدات/ألبسة (Équipement)</option>
                            <option value="Loyer">كراء ملعب (Loyer)</option>
                            <option value="Transport">نقل (Transport)</option>
                            <option value="Autre">أخرى (Autre)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">تفاصيل إضافية</label>
                        <textarea
                            name="description"
                            value={expenseFormData.description}
                            onChange={handleExpenseChange}
                            rows="3"
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-slate-500/10 text-right shadow-sm resize-none"
                            placeholder="مثلا: كراء الملعب لشهر نونبر، شراء 20 كرة..."
                        ></textarea>
                    </div>

                    <div className="pt-8 flex gap-4 justify-end items-center border-t border-slate-100 mt-4 flex-row-reverse">
                        <button type="submit" className="flex-1 py-5 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red-600/20 hover:shadow-red-600/40 transition-all transform active:scale-95">
                            {editingExpenseId ? 'تحديث المصروف' : 'تسجيل سحب / مصروف'}
                        </button>
                        <button type="button" onClick={onClose} className="px-10 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">إلغاء</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ExpenseModal;
