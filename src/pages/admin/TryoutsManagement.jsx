import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, CheckCircle, XCircle, Search, Trash2, Calendar, Clock, Plus, X, Trophy, Loader2, ArrowRight, UserCheck } from 'lucide-react';
import Swal from 'sweetalert2';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'CF'];

const TryoutsManagement = () => {
    const { isRTL, dir } = useLanguage();
    const toast = useToast();
    const [tryouts, setTryouts] = useState([]);
    const [selectedTryout, setSelectedTryout] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
    const [newTryout, setNewTryout] = useState({ name: '', date: '', time: '', location: '' });
    const [newCandidate, setNewCandidate] = useState({ full_name: '', age: '', position: '', phone: '' });
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null, type: '' });

    useEffect(() => { fetchTryouts(); }, []);

    const fetchTryouts = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/tryouts/`);
            if (res.ok) setTryouts(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const loadCandidates = async (tryout) => {
        setSelectedTryout(tryout);
        setLoadingCandidates(true);
        try {
            const res = await authFetch(`${API_URL}/tryouts/${tryout.id}/candidates`);
            if (res.ok) setCandidates(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoadingCandidates(false); }
    };

    const addTryout = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await authFetch(`${API_URL}/tryouts/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTryout)
            });
            if (res.ok) {
                setNewTryout({ name: '', date: '', time: '', location: '' });
                setIsCreateOpen(false);
                fetchTryouts();
                toast.success(isRTL ? 'تم إنشاء الاختبار بنجاح!' : 'Tryout created successfully!');
            }
        } catch (e) { toast.error('Error'); }
        finally { setSaving(false); }
    };

    const addCandidate = async (e) => {
        e.preventDefault();
        if (!selectedTryout) return;
        setSaving(true);
        try {
            const res = await authFetch(`${API_URL}/tryouts/${selectedTryout.id}/candidates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newCandidate, age: parseInt(newCandidate.age) || 0 })
            });
            if (res.ok) {
                setNewCandidate({ full_name: '', age: '', position: '', phone: '' });
                setIsAddCandidateOpen(false);
                loadCandidates(selectedTryout);
                toast.success(isRTL ? 'تم إضافة المرشح!' : 'Candidate added!');
            }
        } catch (e) { toast.error('Error'); }
        finally { setSaving(false); }
    };

    const updateCandidateStatus = async (id, status) => {
        try {
            const res = await authFetch(`${API_URL}/tryouts/candidates/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                setCandidates(prev => prev.map(c => c.id === id ? { ...c, status } : c));
                toast.success(status === 'Accepted'
                    ? (isRTL ? '✅ تم القبول!' : '✅ Accepted!')
                    : (isRTL ? '❌ تم الرفض' : '❌ Rejected'));
            }
        } catch (e) { console.error(e); }
    };

    const convertCandidate = async (candidate) => {
        try {
            const res = await authFetch(`${API_URL}/tryouts/candidates/${candidate.id}/convert`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: 'Converted' } : c));
                
                Swal.fire({
                    icon: 'success',
                    title: isRTL ? '🚀 تم تحويل المرشح إلى لاعب مسجل!' : '🚀 Player Created Successfully!',
                    html: `
                        <div style="text-align: ${isRTL ? 'right' : 'left'}; font-size: 14px; line-height: 1.8;" dir="${isRTL ? 'rtl' : 'ltr'}">
                            <p><b>${isRTL ? 'اسم اللاعب:' : 'Player Name:'}</b> ${data.player?.full_name}</p>
                            <p><b>${isRTL ? 'بريد الولي:' : 'Parent Email:'}</b> <code style="background:#e0e7ff; color:#3730a3; padding:2px 8px; border-radius:6px;">${data.player?.parent_email}</code></p>
                            ${data.player?.temp_password ? `<p><b>${isRTL ? 'كلمة السر المؤقتة:' : 'Temp Password:'}</b> <code style="background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:6px; font-family:monospace;">${data.player?.temp_password}</code></p>` : ''}
                        </div>
                    `,
                    confirmButtonText: isRTL ? 'حسناً' : 'OK',
                    confirmButtonColor: '#4f46e5'
                });
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || (isRTL ? 'فشل التحويل' : 'Conversion failed'));
            }
        } catch (e) {
            toast.error(isRTL ? 'خطأ في الاتصال' : 'Connection error');
        }
    };

    const deleteTryout = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null, type: '' });
        try {
            const res = await authFetch(`${API_URL}/tryouts/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setTryouts(prev => prev.filter(t => t.id !== id));
                if (selectedTryout?.id === id) { setSelectedTryout(null); setCandidates([]); }
                toast.success(isRTL ? 'تم الحذف' : 'Deleted');
            }
        } catch (e) { console.error(e); }
    };

    const filteredCandidates = candidates.filter(c =>
        c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.position?.toLowerCase().includes(search.toLowerCase())
    );

    const accepted = candidates.filter(c => c.status === 'Accepted').length;
    const rejected = candidates.filter(c => c.status === 'Rejected').length;
    const pending  = candidates.filter(c => !c.status || c.status === 'Pending').length;

    return (
        <div className={`animate-fade-in ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                            {isRTL ? 'اختبارات الانضمام' : 'Tryouts'}
                        </span>
                        <span className="bg-violet-600 text-white text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest">
                            {tryouts.length}
                        </span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">
                        {isRTL ? 'إدارة اختبارات انضمام اللاعبين الجدد' : 'Manage player recruitment tryouts'}
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className={`flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:-translate-y-1 transition-all active:scale-95 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                    <Plus size={18} />
                    {isRTL ? 'إنشاء اختبار' : 'New Tryout'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Tryouts List */}
                <div className="lg:col-span-4">
                    <div className="bg-white rounded-[2rem] border border-slate-200 premium-shadow overflow-hidden">
                        <div className={`px-6 py-5 border-b border-slate-100 flex items-center gap-3 bg-violet-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="p-2 bg-violet-100 text-violet-600 rounded-xl">
                                <Trophy size={18} />
                            </div>
                            <h3 className="font-extrabold text-slate-800">
                                {isRTL ? 'قائمة الاختبارات' : 'Tryouts List'}
                            </h3>
                        </div>
                        <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                            {loading ? (
                                <div className="py-12 text-center">
                                    <Loader2 size={32} className="mx-auto text-violet-400 animate-spin" />
                                </div>
                            ) : tryouts.length === 0 ? (
                                <div className="py-16 text-center">
                                    <Trophy size={40} className="mx-auto text-slate-200 mb-3" />
                                    <p className="text-slate-400 font-bold text-sm">
                                        {isRTL ? 'لا توجد اختبارات بعد' : 'No tryouts yet'}
                                    </p>
                                    <p className="text-slate-300 text-xs mt-1">
                                        {isRTL ? 'أنشئ أول اختبار' : 'Create your first tryout'}
                                    </p>
                                </div>
                            ) : tryouts.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => loadCandidates(t)}
                                    className={`p-4 rounded-2xl cursor-pointer transition-all group border-2 ${
                                        selectedTryout?.id === t.id
                                            ? 'bg-violet-50 border-violet-300 shadow-md shadow-violet-100'
                                            : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-black text-slate-800 truncate text-sm ${selectedTryout?.id === t.id ? 'text-violet-700' : ''}`}>
                                                {t.name}
                                            </p>
                                            <div className={`flex items-center gap-2 mt-1.5 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <Calendar size={11} className="text-slate-400" />
                                                <span className="text-xs text-slate-400 font-medium" dir="ltr">{t.date}</span>
                                                {t.time && <>
                                                    <span className="text-slate-200">·</span>
                                                    <Clock size={11} className="text-slate-400" />
                                                    <span className="text-xs text-slate-400 font-medium" dir="ltr">{t.time}</span>
                                                </>}
                                            </div>
                                            {t.location && (
                                                <p className="text-[11px] text-slate-400 mt-1 truncate">📍 {t.location}</p>
                                            )}
                                        </div>
                                        <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            {selectedTryout?.id === t.id && (
                                                <ArrowRight size={14} className="text-violet-500" />
                                            )}
                                            <button
                                                onClick={e => { e.stopPropagation(); setConfirmDialog({ isOpen: true, id: t.id, type: 'tryout' }); }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Candidates Panel */}
                <div className="lg:col-span-8">
                    {selectedTryout ? (
                        <div className="space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: isRTL ? 'في الانتظار' : 'Pending', count: pending, color: 'amber', icon: Clock },
                                    { label: isRTL ? 'مقبول' : 'Accepted', count: accepted, color: 'emerald', icon: CheckCircle },
                                    { label: isRTL ? 'مرفوض' : 'Rejected', count: rejected, color: 'red', icon: XCircle },
                                ].map(({ label, count, color, icon: Icon }) => (
                                    <div key={label} className={`bg-white rounded-2xl border p-5 text-center premium-shadow ${
                                        color === 'emerald' ? 'border-emerald-100' :
                                        color === 'red' ? 'border-red-100' : 'border-amber-100'
                                    }`}>
                                        <Icon size={20} className={`mx-auto mb-2 ${
                                            color === 'emerald' ? 'text-emerald-500' :
                                            color === 'red' ? 'text-red-500' : 'text-amber-500'
                                        }`} />
                                        <p className="text-2xl font-black text-slate-800">{count}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Candidates Table */}
                            <div className="bg-white rounded-[2rem] border border-slate-200 premium-shadow overflow-hidden">
                                <div className={`px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className="p-2 bg-violet-100 text-violet-600 rounded-xl"><Users size={18} /></div>
                                        <div>
                                            <h3 className="font-extrabold text-slate-800 text-sm">{selectedTryout.name}</h3>
                                            <p className="text-xs text-slate-400 font-medium">
                                                {candidates.length} {isRTL ? 'مرشح' : 'candidates'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className="relative">
                                            <Search size={14} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                                            <input
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                                placeholder={isRTL ? 'بحث...' : 'Search...'}
                                                className={`bg-slate-100 border border-slate-200 rounded-xl py-2 text-sm font-medium outline-none focus:border-violet-400 transition-colors w-32 ${isRTL ? 'pr-8 pl-3' : 'pl-8 pr-3'}`}
                                            />
                                        </div>
                                        <button
                                            onClick={() => setIsAddCandidateOpen(true)}
                                            className={`flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-violet-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                                        >
                                            <UserPlus size={14} />
                                            {isRTL ? 'إضافة' : 'Add'}
                                        </button>
                                    </div>
                                </div>

                                {loadingCandidates ? (
                                    <div className="py-16 text-center">
                                        <Loader2 size={32} className="mx-auto text-violet-400 animate-spin" />
                                    </div>
                                ) : filteredCandidates.length === 0 ? (
                                    <div className="py-20 text-center">
                                        <UserPlus size={44} className="mx-auto text-slate-200 mb-4" />
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-sm">
                                            {isRTL ? 'لا يوجد مرشحون' : 'No candidates yet'}
                                        </p>
                                        <p className="text-slate-300 text-xs mt-1">
                                            {isRTL ? 'أضف أول مرشح للاختبار' : 'Add the first candidate'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {filteredCandidates.map(c => (
                                            <div key={c.id} className={`px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors group ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md">
                                                        {c.full_name?.[0] || '?'}
                                                    </div>
                                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                                        <p className="font-black text-slate-800 text-sm">{c.full_name}</p>
                                                        <div className={`flex items-center gap-2 mt-0.5 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                            {c.position && (
                                                                <span className="text-[10px] font-black uppercase bg-violet-50 text-violet-600 px-2 py-0.5 rounded-lg border border-violet-100">
                                                                    {c.position}
                                                                </span>
                                                            )}
                                                            {c.age && <span className="text-[10px] font-bold text-slate-400">{c.age} {isRTL ? 'سنة' : 'yrs'}</span>}
                                                            {c.phone && <span className="text-[10px] text-slate-400" dir="ltr">{c.phone}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                                                        c.status === 'Converted' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                        c.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        c.status === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                                                        'bg-amber-50 text-amber-600 border-amber-200'
                                                    }`}>
                                                        {c.status === 'Converted' ? (isRTL ? '🚀 لاعب مسجل' : '🚀 Converted Player') :
                                                         c.status === 'Accepted' ? (isRTL ? '✓ مقبول' : '✓ Accepted') :
                                                         c.status === 'Rejected' ? (isRTL ? '✗ مرفوض' : '✗ Rejected') :
                                                         (isRTL ? '⏳ انتظار' : '⏳ Pending')}
                                                    </span>
                                                    {c.status === 'Accepted' && (
                                                        <button
                                                            onClick={() => convertCandidate(c)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 ${isRTL ? 'flex-row-reverse' : ''}`}
                                                            title={isRTL ? 'تحويل إلى لاعب مسجل' : 'Promote to Player'}
                                                        >
                                                            <UserCheck size={13} />
                                                            {isRTL ? 'تحويل للاعب' : 'Promote'}
                                                        </button>
                                                    )}
                                                    {c.status !== 'Accepted' && c.status !== 'Converted' && (
                                                        <button
                                                            onClick={() => updateCandidateStatus(c.id, 'Accepted')}
                                                            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all"
                                                            title={isRTL ? 'قبول' : 'Accept'}
                                                        >
                                                            <CheckCircle size={15} />
                                                        </button>
                                                    )}
                                                    {c.status !== 'Rejected' && c.status !== 'Converted' && (
                                                        <button
                                                            onClick={() => updateCandidateStatus(c.id, 'Rejected')}
                                                            className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                                            title={isRTL ? 'رفض' : 'Reject'}
                                                        >
                                                            <XCircle size={15} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2rem] border border-slate-200 premium-shadow p-20 text-center">
                            <div className="w-24 h-24 mx-auto mb-6 bg-violet-50 rounded-3xl flex items-center justify-center">
                                <Trophy size={44} className="text-violet-300" />
                            </div>
                            <h3 className="text-xl font-black text-slate-700 mb-2">
                                {isRTL ? 'اختر اختباراً' : 'Select a Tryout'}
                            </h3>
                            <p className="text-slate-400 font-medium text-sm">
                                {isRTL ? 'اختر اختباراً من القائمة لإدارة المرشحين' : 'Choose a tryout from the list to manage candidates'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Tryout Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" dir={dir}>
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className={`flex justify-between items-center p-8 border-b border-slate-100 bg-slate-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <h2 className={`text-xl font-black text-slate-800 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <Trophy className="text-violet-600" size={24} />
                                {isRTL ? 'إنشاء اختبار جديد' : 'New Tryout'}
                            </h2>
                            <button onClick={() => setIsCreateOpen(false)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={addTryout} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-widest mb-2">
                                    {isRTL ? 'اسم الاختبار *' : 'Tryout Name *'}
                                </label>
                                <input
                                    required value={newTryout.name}
                                    onChange={e => setNewTryout({ ...newTryout, name: e.target.value })}
                                    placeholder={isRTL ? 'مثال: اختبار U14 صيف 2026' : 'e.g. Summer U14 Tryout 2026'}
                                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-violet-500 focus:bg-white rounded-2xl px-5 py-3.5 text-sm font-bold outline-none transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-widest mb-2">{isRTL ? 'التاريخ *' : 'Date *'}</label>
                                    <input required type="date" value={newTryout.date}
                                        onChange={e => setNewTryout({ ...newTryout, date: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 focus:border-violet-500 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-bold outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-widest mb-2">{isRTL ? 'الوقت' : 'Time'}</label>
                                    <input type="time" value={newTryout.time}
                                        onChange={e => setNewTryout({ ...newTryout, time: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 focus:border-violet-500 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-bold outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-widest mb-2">{isRTL ? 'المكان' : 'Location'}</label>
                                <input value={newTryout.location}
                                    onChange={e => setNewTryout({ ...newTryout, location: e.target.value })}
                                    placeholder={isRTL ? 'الملعب أو المكان...' : 'Stadium or venue...'}
                                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-violet-500 focus:bg-white rounded-2xl px-5 py-3.5 text-sm font-bold outline-none transition-all"
                                />
                            </div>
                            <div className={`flex justify-end gap-3 pt-4 border-t border-slate-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-6 py-3.5 text-xs font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" disabled={saving} className={`flex items-center gap-2 px-8 py-3.5 text-xs font-black uppercase text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                                    {isRTL ? 'إنشاء' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Candidate Modal */}
            {isAddCandidateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" dir={dir}>
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className={`flex justify-between items-center p-8 border-b border-slate-100 bg-slate-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <h2 className={`text-xl font-black text-slate-800 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <UserPlus className="text-violet-600" size={24} />
                                {isRTL ? 'إضافة مرشح' : 'Add Candidate'}
                            </h2>
                            <button onClick={() => setIsAddCandidateOpen(false)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={addCandidate} className="p-8 space-y-5">
                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-widest mb-2">{isRTL ? 'الاسم الكامل *' : 'Full Name *'}</label>
                                <input required value={newCandidate.full_name}
                                    onChange={e => setNewCandidate({ ...newCandidate, full_name: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-violet-500 focus:bg-white rounded-2xl px-5 py-3.5 text-sm font-bold outline-none transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-widest mb-2">{isRTL ? 'العمر' : 'Age'}</label>
                                    <input type="number" min="5" max="40" value={newCandidate.age}
                                        onChange={e => setNewCandidate({ ...newCandidate, age: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 focus:border-violet-500 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-bold outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black uppercase text-slate-500 tracking-widest mb-2">{isRTL ? 'المركز' : 'Position'}</label>
                                    <select value={newCandidate.position}
                                        onChange={e => setNewCandidate({ ...newCandidate, position: e.target.value })}
                                        className="w-full bg-slate-50 border-2 border-slate-100 focus:border-violet-500 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-bold outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">{isRTL ? 'اختر المركز' : 'Select position'}</option>
                                        {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black uppercase text-slate-500 tracking-widest mb-2">{isRTL ? 'رقم الهاتف' : 'Phone'}</label>
                                <input type="tel" value={newCandidate.phone}
                                    onChange={e => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-violet-500 focus:bg-white rounded-2xl px-5 py-3.5 text-sm font-bold outline-none transition-all"
                                    dir="ltr"
                                />
                            </div>
                            <div className={`flex justify-end gap-3 pt-4 border-t border-slate-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <button type="button" onClick={() => setIsAddCandidateOpen(false)} className="px-6 py-3.5 text-xs font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all">
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" disabled={saving} className={`flex items-center gap-2 px-8 py-3.5 text-xs font-black uppercase text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl shadow-lg transition-all disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                    {isRTL ? 'إضافة' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen && confirmDialog.type === 'tryout'}
                onConfirm={deleteTryout}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null, type: '' })}
                isRTL={isRTL}
                title={isRTL ? 'حذف الاختبار' : 'Delete Tryout'}
                message={isRTL ? 'هل أنت متأكد من حذف هذا الاختبار وجميع مرشحيه؟' : 'Are you sure you want to delete this tryout and all its candidates?'}
            />
        </div>
    );
};

export default TryoutsManagement;
