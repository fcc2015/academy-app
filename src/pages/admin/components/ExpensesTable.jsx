import React from 'react';
import { Search, MinusCircle, Edit2, Trash2 } from 'lucide-react';

const ExpensesTable = ({
    isLoading,
    filteredExpenses,
    t,
    isRTL,
    dir,
    handleEditExpenseClick,
    handleDeleteExpense,
    searchTerm,
    setSearchTerm
}) => {
    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden border-b-8 border-b-red-600 animate-fade-in">
            <div className={`px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-red-50/30 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <h3 className={`font-extrabold text-red-800 text-lg flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <MinusCircle size={20} className="text-red-500" /> المصاريف المسجلة
                </h3>

                <div className={`relative w-full sm:w-80`}>
                    <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={18} />
                    <input
                        type="text"
                        placeholder={t('finances.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-red-500/10 outline-none transition-all shadow-sm`}
                    />
                </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
                <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} border-collapse`} dir={dir}>
                    <thead>
                        <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                            <th className="px-8 py-6">الفئة (Category)</th>
                            <th className="px-8 py-6">المبلغ</th>
                            <th className="px-8 py-6">التاريخ</th>
                            <th className="px-8 py-6">الوصف</th>
                            <th className="px-8 py-6">الوقت والتسجيل</th>
                            <th className="px-8 py-6">التحكم</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            <tr>
                                <td colSpan="6" className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">جاري الدخول للأرشيف المالي...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredExpenses.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs opacity-50">
                                    لا توجد مصاريف مسجلة
                                </td>
                            </tr>
                        ) : (
                            filteredExpenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-red-50/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <span className="font-extrabold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                                            {expense.category === 'Salaires' ? 'رواتب' :
                                             expense.category === 'Équipement' ? 'معدات/ألبسة' :
                                             expense.category === 'Loyer' ? 'كراء ملعب' :
                                             expense.category === 'Transport' ? 'نقل' :
                                             expense.category === 'Autre' ? 'أخرى' :
                                             expense.category}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="font-black text-red-600 text-lg tracking-tighter">{expense.amount} درهم</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-[11px] font-extrabold text-slate-500">
                                            {expense.expense_date ? new Date(expense.expense_date).toLocaleDateString('ar-MA') : '—'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="text-[12px] font-bold text-slate-600 max-w-[200px] truncate">
                                            {expense.description || 'بدون تفاصيل'}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-[10px] font-bold text-slate-400">
                                        {new Date(expense.created_at).toLocaleString('ar-MA')}
                                    </td>
                                    <td className="px-8 py-6 text-left">
                                        <div className={`flex justify-start gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <button onClick={() => handleEditExpenseClick(expense)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-slate-100/50 rounded-xl transition-all"><Edit2 size={18} /></button>
                                            <button onClick={() => handleDeleteExpense(expense.id)} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
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

export default ExpensesTable;
