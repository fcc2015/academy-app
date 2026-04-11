import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { Shirt, Plus, Edit2, Trash2, X, CheckCircle, AlertTriangle, Search, RotateCcw } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

const API_URL = import.meta.env.VITE_API_URL;
const ITEM_TYPES = ['Kit', 'Jersey', 'Shorts', 'Socks', 'Boots', 'Bag', 'Ball', 'Gloves', 'Other'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40'];

const KitsManagement = () => {
    const { isRTL, dir } = useLanguage();
    const [items, setItems] = useState([]);
    const [players, setPlayers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
    const toast = useToast();

    const blank = { player_id: '', player_name: '', item_name: '', item_type: 'Kit', size: 'M', quantity: 1, assigned_date: new Date().toISOString().slice(0,10), returned_date: '', status: 'Assigned', notes: '' };
    const [form, setForm] = useState(blank);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const [kRes, pRes] = await Promise.all([authFetch(`${API_URL}/kits/`), authFetch(`${API_URL}/players/`)]);
            if (kRes.ok) setItems(await kRes.json());
            if (pRes.ok) setPlayers(await pRes.json());
        } catch{ /* ignore */ }
        finally { setIsLoading(false); }
    };

    const showBanner = (msg, ok = true) => { if (ok) toast.success(msg); else toast.error(msg); };
    const openAdd = () => { setForm(blank); setIsEdit(false); setEditingId(null); setIsModalOpen(true); };
    const openEdit = (item) => { setForm({ ...item, assigned_date: item.assigned_date || '', returned_date: item.returned_date || '' }); setIsEdit(true); setEditingId(item.id); setIsModalOpen(true); };

    const handlePlayerSelect = (e) => {
        const p = players.find(pl => pl.user_id === e.target.value);
        setForm(f => ({ ...f, player_id: e.target.value, player_name: p?.full_name || '' }));
    };

    const handleMarkReturned = async (item) => {
        try {
            const res = await authFetch(`${API_URL}/kits/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Returned', returned_date: new Date().toISOString().slice(0,10) }) });
            if (!res.ok) throw new Error();
            fetchAll(); showBanner('تم تسجيل الإرجاع');
        } catch { showBanner('خطأ', false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = isEdit ? `${API_URL}/kits/${editingId}` : `${API_URL}/kits/`;
            const payload = { ...form };
            if (!payload.returned_date) delete payload.returned_date;
            const res = await authFetch(url, { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error();
            setIsModalOpen(false); fetchAll(); showBanner(isEdit ? 'تم التحديث' : 'تمت الإضافة');
        } catch { showBanner('خطأ في الحفظ', false); }
    };

    const handleDelete = (id) => {
        setConfirmDialog({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        await authFetch(`${API_URL}/kits/${id}`, { method: 'DELETE' });
        setItems(p => p.filter(i => i.id !== id)); showBanner('تم الحذف');
    };

    const filtered = items.filter(it =>
        (it.item_name?.toLowerCase().includes(search.toLowerCase()) || it.player_name?.toLowerCase().includes(search.toLowerCase())) &&
        (!filterStatus || it.status === filterStatus)
    );

    const statusBadge = (s) => {
        const map = { Assigned: 'bg-amber-100 text-amber-700', Returned: 'bg-emerald-100 text-emerald-700', Lost: 'bg-red-100 text-red-700' };
        return <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${map[s]||'bg-slate-100 text-slate-500'}`}>{s==='Assigned'?'موزع':s==='Returned'?'مرجع':'مفقود'}</span>;
    };

    return (
        <div className={`animate-fade-in pb-10 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Toast handled by global provider */}

            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h2 className={`text-4xl font-black text-slate-800 tracking-tight flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/30"><Shirt size={32}/></div>
                        إدارة الألبسة والمعدات
                    </h2>
                    <p className="text-slate-400 font-bold mt-2 tracking-widest text-sm uppercase">تتبع توزيع الكيطات والمعدات على اللاعبين</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-amber-500/20 active:scale-95 transition-all">
                    <Plus size={20}/> توزيع جديد
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'إجمالي', val: items.length, color: 'slate' },
                    { label: 'موزعة', val: items.filter(i=>i.status==='Assigned').length, color: 'amber' },
                    { label: 'مرجعة', val: items.filter(i=>i.status==='Returned').length, color: 'emerald' },
                    { label: 'مفقودة', val: items.filter(i=>i.status==='Lost').length, color: 'red' },
                ].map((c, i) => (
                    <div key={i} className={`bg-${c.color}-50 border border-${c.color}-100 rounded-[2rem] p-5`}>
                        <div className={`text-3xl font-black text-${c.color}-700 mb-1`}>{c.val}</div>
                        <div className={`text-[10px] font-black uppercase tracking-widest text-${c.color}-600/70`}>{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className={`flex gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="relative flex-1">
                    <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={18}/>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن لاعب أو قطعة..." className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm`}/>
                </div>
                <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm cursor-pointer">
                    <option value="">كل الحالات</option>
                    <option value="Assigned">موزعة</option>
                    <option value="Returned">مرجعة</option>
                    <option value="Lost">مفقودة</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden border-b-8 border-b-amber-500">
                <div className="overflow-x-auto min-h-[350px]">
                    <table className={`w-full ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                                <th className="px-6 py-5">اللاعب</th>
                                <th className="px-6 py-5">القطعة</th>
                                <th className="px-6 py-5">النوع / المقياس</th>
                                <th className="px-6 py-5">تاريخ التوزيع</th>
                                <th className="px-6 py-5">الحالة</th>
                                <th className="px-6 py-5">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr><td colSpan="6" className="py-20 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto"/></td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="6" className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">لا توجد سجلات</td></tr>
                            ) : filtered.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-black text-sm shadow-sm">{item.player_name?.[0]||'?'}</div>
                                            <span className="font-extrabold text-slate-800">{item.player_name || '—'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 font-bold text-slate-700">{item.item_name}</td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1"><span className="text-xs font-black text-slate-500">{item.item_type}</span><span className="text-[10px] text-slate-400 font-bold">{item.size} | ×{item.quantity}</span></div>
                                    </td>
                                    <td className="px-6 py-5 text-sm font-bold text-slate-500">{item.assigned_date ? new Date(item.assigned_date).toLocaleDateString('ar-MA') : '—'}</td>
                                    <td className="px-6 py-5">{statusBadge(item.status)}</td>
                                    <td className="px-6 py-5">
                                        <div className="flex gap-1">
                                            {item.status === 'Assigned' && <button onClick={() => handleMarkReturned(item)} title="تسجيل الإرجاع" className="p-2 text-emerald-400 hover:bg-emerald-50 rounded-xl hover:text-emerald-700 transition-all"><RotateCcw size={15}/></button>}
                                            <button onClick={() => openEdit(item)} className="p-2 text-indigo-300 hover:bg-indigo-50 rounded-xl hover:text-indigo-600 transition-all"><Edit2 size={15}/></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 text-red-300 hover:bg-red-50 rounded-xl hover:text-red-600 transition-all"><Trash2 size={15}/></button>
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
                        <div className="px-8 py-6 border-b border-slate-100 bg-amber-50 flex justify-between items-center flex-row-reverse shrink-0">
                            <h3 className="font-black text-amber-900 text-xl flex items-center gap-3"><Shirt size={22}/> {isEdit ? 'تعديل التوزيع' : 'توزيع قطعة جديدة'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-amber-300 hover:bg-white rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-4 text-right overflow-y-auto">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">اللاعب</label>
                                <select value={form.player_id} onChange={handlePlayerSelect} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer appearance-none text-right">
                                    <option value="">-- اختر لاعباً --</option>
                                    {players.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">اسم القطعة *</label>
                                    <input required value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-right" placeholder="كيط التدريب..."/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">النوع</label>
                                    <select value={form.item_type} onChange={e => setForm({...form, item_type: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer appearance-none text-right">
                                        {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">المقياس</label>
                                    <select value={form.size} onChange={e => setForm({...form, size: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer appearance-none text-right">
                                        {SIZES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الكمية</label>
                                    <input type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: +e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-center"/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">تاريخ التوزيع</label>
                                    <input type="date" value={form.assigned_date} onChange={e => setForm({...form, assigned_date: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الحالة</label>
                                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer appearance-none text-right">
                                        <option value="Assigned">موزع</option>
                                        <option value="Returned">مرجع</option>
                                        <option value="Lost">مفقود</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">ملاحظات</label>
                                <textarea rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none resize-none text-right"/>
                            </div>
                            <div className="flex gap-4 pt-2 flex-row-reverse">
                                <button type="submit" className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all">{isEdit ? 'حفظ التغييرات' : 'توزيع'}</button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-[11px] font-black uppercase text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">إلغاء</button>
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
                title="حذف سجل اللباس"
                message="هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع."
            />
        </div>
    );
};

export default KitsManagement;
