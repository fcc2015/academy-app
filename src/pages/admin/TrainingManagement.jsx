import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Plus, Edit2, Trash2, X, CheckCircle, AlertTriangle, Search, ChevronDown, Users } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';

const API_URL = import.meta.env.VITE_API_URL;

const TYPES = ['Technical', 'Physical', 'Tactical', 'Friendly', 'Recovery'];
const STATUSES = ['Scheduled', 'Completed', 'Cancelled'];

const TrainingManagement = () => {
    const { isRTL, dir } = useLanguage();
    const [sessions, setSessions] = useState([]);
    const [squads, setSquads] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [banner, setBanner] = useState({ show: false, msg: '', ok: true });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

    const blank = { title: '', coach_id: '', squad_id: '', session_date: new Date().toISOString().slice(0,16), duration_minutes: 90, location: 'Main Pitch', session_type: 'Technical', objectives: '', status: 'Scheduled', notes: '' };
    const [form, setForm] = useState(blank);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const [sRes, sqRes] = await Promise.all([fetch(`${API_URL}/training/`), fetch(`${API_URL}/squads/`)]);
            if (sRes.ok) setSessions(await sRes.json());
            if (sqRes.ok) setSquads(await sqRes.json());
        } catch { showBanner('خطأ في التحميل', false); }
        finally { setIsLoading(false); }
    };

    const showBanner = (msg, ok = true) => {
        setBanner({ show: true, msg, ok });
        setTimeout(() => setBanner(b => ({ ...b, show: false })), 3000);
    };

    const openAdd = () => { setForm(blank); setIsEdit(false); setEditingId(null); setIsModalOpen(true); };
    const openEdit = (s) => {
        setForm({ ...s, session_date: new Date(s.session_date).toISOString().slice(0,16) });
        setIsEdit(true); setEditingId(s.id); setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = isEdit ? `${API_URL}/training/${editingId}` : `${API_URL}/training/`;
            const method = isEdit ? 'PATCH' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, session_date: new Date(form.session_date).toISOString() }) });
            if (!res.ok) throw new Error();
            setIsModalOpen(false); fetchAll();
            showBanner(isEdit ? 'تم تحديث الحصة بنجاح' : 'تمت إضافة الحصة بنجاح');
        } catch { showBanner('خطأ في الحفظ', false); }
    };

    const handleDelete = (id) => {
        setConfirmDialog({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        try {
            await fetch(`${API_URL}/training/${id}`, { method: 'DELETE' });
            setSessions(p => p.filter(s => s.id !== id));
            showBanner('تم الحذف');
        } catch { showBanner('خطأ في الحذف', false); }
    };

    const filtered = sessions.filter(s =>
        (s.title?.toLowerCase().includes(search.toLowerCase()) || s.location?.toLowerCase().includes(search.toLowerCase())) &&
        (!filterType || s.session_type === filterType)
    );

    const typeColor = (t) => ({ Technical: 'bg-indigo-100 text-indigo-700', Physical: 'bg-emerald-100 text-emerald-700', Tactical: 'bg-purple-100 text-purple-700', Friendly: 'bg-amber-100 text-amber-700', Recovery: 'bg-pink-100 text-pink-700' }[t] || 'bg-slate-100 text-slate-600');
    const statusColor = (s) => ({ Scheduled: 'bg-sky-100 text-sky-700', Completed: 'bg-emerald-100 text-emerald-700', Cancelled: 'bg-red-100 text-red-600' }[s] || 'bg-slate-100 text-slate-600');

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
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30"><Calendar size={32}/></div>
                        جدول التداريب
                    </h2>
                    <p className="text-slate-400 font-bold mt-2 tracking-widest text-sm uppercase">إدارة الحصص التدريبية الأسبوعية للفئات</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                    <Plus size={20}/> حصة جديدة
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: 'إجمالي الحصص', val: sessions.length, color: 'indigo' },
                    { label: 'مجدولة', val: sessions.filter(s=>s.status==='Scheduled').length, color: 'sky' },
                    { label: 'مكتملة', val: sessions.filter(s=>s.status==='Completed').length, color: 'emerald' },
                    { label: 'ملغاة', val: sessions.filter(s=>s.status==='Cancelled').length, color: 'red' },
                ].map((card, i) => (
                    <div key={i} className={`bg-${card.color}-50 border border-${card.color}-100 rounded-[2rem] p-5`}>
                        <div className={`text-3xl font-black text-${card.color}-700 mb-1`}>{card.val}</div>
                        <div className={`text-[10px] font-black uppercase tracking-widest text-${card.color}-600/70`}>{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className={`flex flex-col sm:flex-row gap-3 mb-6 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                <div className="relative flex-1">
                    <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={18}/>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن حصة..." className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm`}/>
                </div>
                <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm cursor-pointer">
                    <option value="">كل الأنواع</option>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {/* Cards Grid */}
            {isLoading ? (
                <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"/></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-24 text-slate-300 font-black uppercase tracking-widest text-xs">لا توجد حصص تدريبية</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(s => (
                        <div key={s.id} className="bg-white rounded-[2rem] border border-slate-200 premium-shadow hover:border-indigo-200 hover:-translate-y-1 transition-all overflow-hidden group">
                            <div className={`h-2 w-full ${s.session_type==='Physical' ? 'bg-emerald-500' : s.session_type==='Tactical' ? 'bg-purple-500' : s.session_type==='Recovery' ? 'bg-pink-500' : s.session_type==='Friendly' ? 'bg-amber-500' : 'bg-indigo-500'}`}/>
                            <div className="p-6">
                                <div className={`flex justify-between items-start mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className="flex-1">
                                        <h3 className="font-black text-slate-900 text-lg leading-tight">{s.title}</h3>
                                        <div className={`flex flex-wrap gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide ${typeColor(s.session_type)}`}>{s.session_type}</span>
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide ${statusColor(s.status)}`}>{s.status}</span>
                                        </div>
                                    </div>
                                    <div className={`flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <button onClick={() => openEdit(s)} className="p-2 text-indigo-400 hover:bg-indigo-50 rounded-xl hover:text-indigo-700 transition-all"><Edit2 size={15}/></button>
                                        <button onClick={() => handleDelete(s.id)} className="p-2 text-red-300 hover:bg-red-50 rounded-xl hover:text-red-600 transition-all"><Trash2 size={15}/></button>
                                    </div>
                                </div>
                                <div className="space-y-2 text-[12px] font-bold text-slate-500">
                                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}><Calendar size={13} className="text-indigo-400"/>{new Date(s.session_date).toLocaleString('ar-MA', { weekday:'long', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
                                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}><Clock size={13} className="text-slate-400"/>{s.duration_minutes} دقيقة</div>
                                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}><MapPin size={13} className="text-slate-400"/>{s.location}</div>
                                    {squads.find(sq=>sq.id===s.squad_id) && <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}><Users size={13} className="text-slate-400"/>{squads.find(sq=>sq.id===s.squad_id)?.name}</div>}
                                </div>
                                {s.objectives && <p className="mt-3 text-[11px] text-slate-400 italic border-t border-slate-50 pt-3 line-clamp-2">{s.objectives}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in" dir="rtl">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg premium-shadow border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-slate-100 bg-indigo-50 flex justify-between items-center flex-row-reverse shrink-0">
                            <h3 className="font-black text-indigo-900 text-xl flex items-center gap-3"><Calendar size={22}/> {isEdit ? 'تعديل الحصة' : 'حصة تدريبية جديدة'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-indigo-300 hover:bg-white rounded-full"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-5 text-right overflow-y-auto">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">عنوان الحصة *</label>
                                <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 text-right" placeholder="مثال: تدريب تقني للفئة U15"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الفريق</label>
                                    <select value={form.squad_id} onChange={e => setForm({...form, squad_id: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer appearance-none text-right">
                                        <option value="">-- اختر --</option>
                                        {squads.map(sq => <option key={sq.id} value={sq.id}>{sq.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">النوع</label>
                                    <select value={form.session_type} onChange={e => setForm({...form, session_type: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer appearance-none text-right">
                                        {TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">تاريخ وتوقيت الحصة *</label>
                                <input required type="datetime-local" value={form.session_date} onChange={e => setForm({...form, session_date: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">المدة (دقيقة)</label>
                                    <input type="number" min="15" step="15" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: +e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-center"/>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الحالة</label>
                                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer appearance-none text-right">
                                        {STATUSES.map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الملعب / المكان</label>
                                <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-right" placeholder="الملعب الرئيسي..."/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الأهداف والمحتوى</label>
                                <textarea rows="3" value={form.objectives} onChange={e => setForm({...form, objectives: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none resize-none text-right" placeholder="أهداف الحصة..."/>
                            </div>
                            <div className="flex gap-4 pt-2 flex-row-reverse">
                                <button type="submit" className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                                    {isEdit ? 'حفظ التغييرات' : 'إضافة الحصة'}
                                </button>
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
                title="حذف الحصة التدريبية"
                message="هل أنت متأكد من حذف هذه الحصة؟ لا يمكن التراجع."
            />
        </div>
    );
};

export default TrainingManagement;
