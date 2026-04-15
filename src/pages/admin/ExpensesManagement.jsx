import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Edit2, Trash2, X, CheckCircle, AlertTriangle, Search, TrendingDown, Receipt } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

const API_URL = import.meta.env.VITE_API_URL;
const CATEGORIES = ['General', 'Field Rental', 'Equipment', 'Staff Salary', 'Transport', 'Medical', 'Marketing', 'Utilities', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Check', 'Card'];

const ExpensesManagement = () => {
    const { isRTL, dir, t, formatCurrency, formatDate } = useLanguage();
    const [expenses, setExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState('');
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
    const toast = useToast();

    const blank = { title: '', category: 'General', amount: '', expense_date: new Date().toISOString().slice(0,10), paid_to: '', payment_method: 'Cash', description: '' };
    const [form, setForm] = useState(blank);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const res = await authFetch(`${API_URL}/expenses/`);
            if (res.ok) setExpenses(await res.json());
        } finally { setIsLoading(false); }
    };

    const showBanner = (msg, ok = true) => { if (ok) toast.success(msg); else toast.error(msg); };
    const openAdd = () => { setForm(blank); setIsEdit(false); setEditingId(null); setIsModalOpen(true); };
    const openEdit = (ex) => { setForm({ ...ex }); setIsEdit(true); setEditingId(ex.id); setIsModalOpen(true); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = isEdit ? `${API_URL}/expenses/${editingId}` : `${API_URL}/expenses/`;
            const res = await authFetch(url, { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }) });
            if (!res.ok) throw new Error();
            setIsModalOpen(false); fetchAll(); showBanner(isEdit ? t('ui.updated') : t('ui.added'));
        } catch { showBanner(t('ui.saveError'), false); }
    };

    const handleDelete = (id) => {
        setConfirmDialog({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        await authFetch(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
        setExpenses(p => p.filter(ex => ex.id !== id)); showBanner(t('ui.deleted'));
    };

    const filtered = expenses.filter(ex =>
        (ex.title?.toLowerCase().includes(search.toLowerCase()) || ex.paid_to?.toLowerCase().includes(search.toLowerCase())) &&
        (!filterCat || ex.category === filterCat)
    );

    const totalExpenses = filtered.reduce((acc, ex) => acc + (parseFloat(ex.amount) || 0), 0);
    const thisMonth = expenses.filter(ex => new Date(ex.expense_date).getMonth() === new Date().getMonth()).reduce((acc, ex) => acc + (parseFloat(ex.amount) || 0), 0);

    const catColor = (c) => {
        const colors = { 'Field Rental': 'bg-emerald-100 text-emerald-700', 'Equipment': 'bg-amber-100 text-amber-700', 'Staff Salary': 'bg-blue-100 text-blue-700', 'Transport': 'bg-cyan-100 text-cyan-700', 'Medical': 'bg-rose-100 text-rose-700', 'Marketing': 'bg-violet-100 text-violet-700' };
        return colors[c] || 'bg-slate-100 text-slate-600';
    };

    return (
        <div className={`animate-fade-in pb-10 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Toast handled by global provider */}

            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h2 className={`text-4xl font-black text-slate-800 tracking-tight flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 bg-violet-600 text-white rounded-2xl shadow-lg shadow-violet-600/30"><TrendingDown size={32}/></div>
                        {t('expenses.title')}
                    </h2>
                    <p className="text-slate-400 font-bold mt-2 tracking-widest text-sm uppercase">{t('expenses.subtitle')}</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-violet-600/20 active:scale-95 transition-all">
                    <Plus size={20}/> {t('expenses.newExpense')}
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-[2rem] p-6 col-span-1 md:col-span-1 shadow-xl shadow-violet-600/20">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">{t('expenses.totalExpenses')}</div>
                    <div className="text-4xl font-black tracking-tight">{formatCurrency(totalExpenses)}</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-600/70 mb-2">{t('expenses.thisMonth')}</div>
                    <div className="text-4xl font-black text-amber-700 tracking-tight">{formatCurrency(thisMonth)}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('expenses.recordCount')}</div>
                    <div className="text-4xl font-black text-slate-800 tracking-tight">{filtered.length}</div>
                </div>
            </div>

            {/* Filters */}
            <div className={`flex gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="relative flex-1">
                    <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={18}/>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('expenses.searchPlaceholder')} className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm`}/>
                </div>
                <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm cursor-pointer">
                    <option value="">{t('expenses.allCategories')}</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden border-b-8 border-b-violet-600">
                <div className="overflow-x-auto min-h-[350px]">
                    <table className={`w-full ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                                <th className="px-6 py-5">{t('expenses.description')}</th>
                                <th className="px-6 py-5">{t('expenses.category')}</th>
                                <th className="px-6 py-5">{t('expenses.amount')}</th>
                                <th className="px-6 py-5">{t('expenses.paidTo')}</th>
                                <th className="px-6 py-5">{t('expenses.expenseDate')}</th>
                                <th className="px-6 py-5">{t('expenses.paymentMethod')}</th>
                                <th className="px-6 py-5">{t('expenses.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr><td colSpan="7" className="py-20 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600 mx-auto"/></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="7" className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">{t('expenses.noExpenses')}</td></tr>
                            ) : filtered.map(ex => (
                                <tr key={ex.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div>
                                            <div className="font-extrabold text-slate-900">{ex.title}</div>
                                            {ex.description && <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">{ex.description}</div>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5"><span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${catColor(ex.category)}`}>{ex.category}</span></td>
                                    <td className="px-6 py-5"><span className="text-xl font-black text-violet-700 tracking-tight">{formatCurrency(parseFloat(ex.amount))}</span></td>
                                    <td className="px-6 py-5 font-bold text-slate-600">{ex.paid_to || '—'}</td>
                                    <td className="px-6 py-5 text-sm font-bold text-slate-500">{formatDate(ex.expense_date)}</td>
                                    <td className="px-6 py-5"><span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{ex.payment_method}</span></td>
                                    <td className="px-6 py-5">
                                        <div className="flex gap-1">
                                            <button onClick={() => openEdit(ex)} className="p-2 text-indigo-300 hover:bg-indigo-50 rounded-xl hover:text-indigo-600 transition-all"><Edit2 size={15}/></button>
                                            <button onClick={() => handleDelete(ex.id)} className="p-2 text-red-300 hover:bg-red-50 rounded-xl hover:text-red-600 transition-all"><Trash2 size={15}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in" dir="rtl">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg premium-shadow border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-violet-100 bg-violet-50 flex justify-between items-center flex-row-reverse shrink-0">
                            <h3 className="font-black text-violet-900 text-xl flex items-center gap-3"><Receipt size={22}/> {isEdit ? t('expenses.editExpense') : t('expenses.addExpense')}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-violet-300 hover:bg-white rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-4 text-right overflow-y-auto">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('expenses.titleLabel')} *</label>
                                <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" placeholder={t('expenses.titlePlaceholder')}/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('expenses.category')}</label>
                                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer appearance-none text-right">
                                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-violet-500 mb-2">{t('expenses.amountLabel')} *</label>
                                    <input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full px-5 py-3.5 bg-violet-50 border border-violet-100 rounded-2xl text-sm font-black text-violet-700 outline-none text-center"/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('expenses.dateLabel')} *</label>
                                    <input required type="date" value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('expenses.paymentMethod')}</label>
                                    <select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer appearance-none text-right">
                                        {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('expenses.recipientLabel')}</label>
                                <input value={form.paid_to} onChange={e => setForm({...form, paid_to: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" placeholder={t('expenses.recipientPlaceholder')}/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('expenses.additionalDesc')}</label>
                                <textarea rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none resize-none"/>
                            </div>
                            <div className="flex gap-4 pt-2 flex-row-reverse">
                                <button type="submit" className="flex-1 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-violet-600/20 active:scale-95 transition-all">{isEdit ? t('ui.saveChanges') : t('expenses.record')}</button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-[11px] font-black uppercase text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">{t('common.cancel')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onConfirm={confirmDelete}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
                isRTL={isRTL}
                title={t('expenses.deleteTitle')}
                message={t('expenses.deleteMessage')}
            />
        </div>
    );
};

export default ExpensesManagement;
