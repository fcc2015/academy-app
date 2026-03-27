import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { Heart, Plus, Edit2, Trash2, X, CheckCircle, AlertTriangle, Search, Phone, Shield } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';

const API_URL = import.meta.env.VITE_API_URL;
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const MedicalManagement = () => {
    const { isRTL, dir } = useLanguage();
    const [records, setRecords] = useState([]);
    const [players, setPlayers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState('');
    const [banner, setBanner] = useState({ show: false, msg: '', ok: true });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

    const blank = { player_id: '', player_name: '', blood_type: '', allergies: '', chronic_conditions: '', emergency_contact_name: '', emergency_contact_phone: '', insurance_provider: '', insurance_number: '', last_medical_checkup: '', notes: '' };
    const [form, setForm] = useState(blank);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const [rRes, pRes] = await Promise.all([authFetch(`${API_URL}/medical/`), authFetch(`${API_URL}/players/`)]);
            if (rRes.ok) setRecords(await rRes.json());
            if (pRes.ok) setPlayers(await pRes.json());
        } finally { setIsLoading(false); }
    };

    const showBanner = (msg, ok = true) => { setBanner({ show: true, msg, ok }); setTimeout(() => setBanner(b => ({...b, show: false})), 3000); };
    const openAdd = () => { setForm(blank); setIsEdit(false); setEditingId(null); setIsModalOpen(true); };
    const openEdit = (r) => { setForm({ ...r, last_medical_checkup: r.last_medical_checkup || '' }); setIsEdit(true); setEditingId(r.id); setIsModalOpen(true); };

    const handlePlayerSelect = (e) => {
        const p = players.find(pl => pl.user_id === e.target.value);
        setForm(f => ({ ...f, player_id: e.target.value, player_name: p?.full_name || '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = isEdit ? `${API_URL}/medical/${editingId}` : `${API_URL}/medical/`;
            const payload = { ...form };
            if (!payload.last_medical_checkup) delete payload.last_medical_checkup;
            const res = await fetch(url, { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
        await authFetch(`${API_URL}/medical/${id}`, { method: 'DELETE' });
        setRecords(p => p.filter(r => r.id !== id)); showBanner('تم الحذف');
    };

    const filtered = records.filter(r => r.player_name?.toLowerCase().includes(search.toLowerCase()));
    const bloodColor = (b) => {
        if (!b) return 'bg-slate-100 text-slate-500';
        if (b.includes('O')) return 'bg-red-100 text-red-700';
        if (b.includes('A')) return 'bg-blue-100 text-blue-700';
        if (b.includes('B')) return 'bg-green-100 text-green-700';
        return 'bg-purple-100 text-purple-700';
    };

    return (
        <div className={`animate-fade-in pb-10 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Banner */}
            <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[150] transition-all duration-500 ${banner.show ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0'}`}>
                <div className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-extrabold text-white ${banner.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {banner.ok ? <CheckCircle size={22}/> : <AlertTriangle size={22}/>} {banner.msg}
                </div>
            </div>

            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h2 className={`text-4xl font-black text-slate-800 tracking-tight flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/30"><Heart size={32}/></div>
                        الملفات الطبية
                    </h2>
                    <p className="text-slate-400 font-bold mt-2 tracking-widest text-sm uppercase">صحة وسلامة اللاعبين - الأمراض المزمنة والطوارئ</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-rose-500/20 active:scale-95 transition-all">
                    <Plus size={20}/> إضافة ملف
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'إجمالي الملفات', val: records.length, color: 'rose' },
                    { label: 'لديهم حساسية', val: records.filter(r=>r.allergies).length, color: 'amber' },
                    { label: 'أمراض مزمنة', val: records.filter(r=>r.chronic_conditions).length, color: 'purple' },
                    { label: 'لديهم تأمين', val: records.filter(r=>r.insurance_provider).length, color: 'emerald' },
                ].map((c,i) => (
                    <div key={i} className={`bg-${c.color}-50 border border-${c.color}-100 rounded-[2rem] p-5`}>
                        <div className={`text-3xl font-black text-${c.color}-700 mb-1`}>{c.val}</div>
                        <div className={`text-[10px] font-black uppercase tracking-widest text-${c.color}-600/70`}>{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative mb-6 max-w-md">
                <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={18}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث باسم اللاعب..." className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm`}/>
            </div>

            {/* Cards */}
            {isLoading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"/></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-24 text-slate-300 font-black uppercase tracking-widest">لا توجد ملفات طبية</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(r => (
                        <div key={r.id} className="bg-white rounded-[2rem] border border-slate-200 premium-shadow hover:border-rose-200 hover:-translate-y-1 transition-all overflow-hidden group">
                            <div className="h-1.5 w-full bg-gradient-to-r from-rose-400 to-pink-500"/>
                            <div className="p-6">
                                <div className={`flex justify-between items-start mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-xl border border-rose-100">{r.player_name?.[0]||'?'}</div>
                                        <div>
                                            <h3 className="font-black text-slate-900">{r.player_name || '—'}</h3>
                                            {r.blood_type && <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${bloodColor(r.blood_type)}`}>{r.blood_type}</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(r)} className="p-2 text-indigo-300 hover:bg-indigo-50 rounded-xl hover:text-indigo-600"><Edit2 size={14}/></button>
                                        <button onClick={() => handleDelete(r.id)} className="p-2 text-red-300 hover:bg-red-50 rounded-xl hover:text-red-600"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                                <div className="space-y-2 text-[12px]">
                                    {r.allergies && <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2"><span className="font-black text-amber-700">⚠ حساسية: </span><span className="text-amber-600">{r.allergies}</span></div>}
                                    {r.chronic_conditions && <div className="bg-purple-50 border border-purple-100 rounded-xl px-3 py-2"><span className="font-black text-purple-700">🩺 مزمن: </span><span className="text-purple-600">{r.chronic_conditions}</span></div>}
                                    {r.emergency_contact_name && (
                                        <div className={`flex items-center gap-2 text-slate-500 font-bold ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <Phone size={12} className="text-slate-400"/>
                                            {r.emergency_contact_name} — {r.emergency_contact_phone}
                                        </div>
                                    )}
                                    {r.insurance_provider && <div className={`flex items-center gap-2 text-slate-400 font-bold text-[11px] ${isRTL ? 'flex-row-reverse' : ''}`}><Shield size={11}/>{r.insurance_provider} ({r.insurance_number})</div>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in" dir="rtl">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg premium-shadow border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-rose-100 bg-rose-50 flex justify-between items-center flex-row-reverse shrink-0">
                            <h3 className="font-black text-rose-900 text-xl flex items-center gap-3"><Heart size={22}/> {isEdit ? 'تعديل الملف الطبي' : 'ملف طبي جديد'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-rose-300 hover:bg-white rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-4 text-right overflow-y-auto">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">اللاعب *</label>
                                <select required value={form.player_id} onChange={handlePlayerSelect} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer appearance-none text-right">
                                    <option value="">-- اختر لاعباً --</option>
                                    {players.map(p => <option key={p.user_id} value={p.user_id}>{p.full_name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">فصيلة الدم</label>
                                    <select value={form.blood_type} onChange={e => setForm({...form, blood_type: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer appearance-none text-right">
                                        <option value="">-- غير محدد --</option>
                                        {BLOOD_TYPES.map(b => <option key={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">آخر فحص طبي</label>
                                    <input type="date" value={form.last_medical_checkup} onChange={e => setForm({...form, last_medical_checkup: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">⚠ الحساسية</label>
                                <input value={form.allergies} onChange={e => setForm({...form, allergies: e.target.value})} className="w-full px-5 py-3.5 bg-amber-50 border border-amber-100 rounded-2xl text-sm font-bold outline-none text-right" placeholder="مثال: حساسية للبنسلين..."/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-purple-500 mb-2">🩺 الأمراض المزمنة</label>
                                <input value={form.chronic_conditions} onChange={e => setForm({...form, chronic_conditions: e.target.value})} className="w-full px-5 py-3.5 bg-purple-50 border border-purple-100 rounded-2xl text-sm font-bold outline-none text-right" placeholder="مثال: ربو، ضغط..."/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">جهة الاتصال طوارئ</label>
                                    <input value={form.emergency_contact_name} onChange={e => setForm({...form, emergency_contact_name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-right" placeholder="الاسم..."/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">رقم الهاتف</label>
                                    <input value={form.emergency_contact_phone} onChange={e => setForm({...form, emergency_contact_phone: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-right" placeholder="06..."/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">شركة التأمين</label>
                                    <input value={form.insurance_provider} onChange={e => setForm({...form, insurance_provider: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-right" placeholder="اسم شركة التأمين..."/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">رقم التأمين</label>
                                    <input value={form.insurance_number} onChange={e => setForm({...form, insurance_number: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-right" placeholder="رقم الوثيقة..."/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">ملاحظات إضافية</label>
                                <textarea rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none resize-none text-right"/>
                            </div>
                            <div className="flex gap-4 pt-2 flex-row-reverse">
                                <button type="submit" className="flex-1 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-rose-500/20 active:scale-95 transition-all">{isEdit ? 'حفظ التغييرات' : 'حفظ الملف'}</button>
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
                title="حذف السجل الطبي"
                message="هل أنت متأكد من حذف هذا السجل الطبي؟ لا يمكن التراجع."
            />
        </div>
    );
};

export default MedicalManagement;
