import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import {
    Building2, Plus, Edit2, Trash2, X, Loader2, MapPin, Phone,
    Search, Users, UserPlus, UserMinus
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import { usePlan } from '../../hooks/usePlan';

const emptyForm = { name: '', city: '', address: '', phone: '', is_active: true };

const BranchesManagement = () => {
    const { isRTL } = useLanguage();
    const toast = useToast();
    const { plan, loading: planLoading, hasFeature } = usePlan();

    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [assignBranch, setAssignBranch] = useState(null);
    const [assignedSousAdmins, setAssignedSousAdmins] = useState([]);
    const [allSousAdmins, setAllSousAdmins] = useState([]);
    const [selectedSousAdminId, setSelectedSousAdminId] = useState('');
    const [assignLoading, setAssignLoading] = useState(false);

    const loadBranches = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/branches/`);
            if (!res.ok) throw new Error('فشل في جلب الفروع');
            const data = await res.json();
            setBranches(data || []);
        } catch (err) {
            toast.error(err.message || 'خطأ في تحميل الفروع');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (planLoading) return;
        if (hasFeature('branches')) loadBranches();
        else setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planLoading, plan]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setShowForm(true);
    };

    const openEdit = (b) => {
        setEditing(b);
        setForm({
            name: b.name || '',
            city: b.city || '',
            address: b.address || '',
            phone: b.phone || '',
            is_active: b.is_active !== false,
        });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditing(null);
        setForm(emptyForm);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || form.name.trim().length < 2) {
            toast.error('اسم الفرع مطلوب (حرفان على الأقل)');
            return;
        }
        setSubmitting(true);
        try {
            const url = editing
                ? `${API_URL}/branches/${editing.id}`
                : `${API_URL}/branches/`;
            const method = editing ? 'PUT' : 'POST';
            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'فشل في حفظ الفرع');
            }
            toast.success(editing ? 'تم تحديث الفرع' : 'تم إنشاء الفرع');
            closeForm();
            await loadBranches();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            const res = await authFetch(
                `${API_URL}/branches/${confirmDelete.id}`,
                { method: 'DELETE' }
            );
            if (!res.ok) throw new Error('فشل في حذف الفرع');
            toast.success('تم حذف الفرع');
            await loadBranches();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setConfirmDelete(null);
        }
    };

    const openAssign = async (branch) => {
        setAssignBranch(branch);
        setSelectedSousAdminId('');
        setAssignLoading(true);
        try {
            const [assignedRes, adminsRes] = await Promise.all([
                authFetch(`${API_URL}/branches/${branch.id}/sous-admins`),
                authFetch(`${API_URL}/admins/`),
            ]);
            const assigned = assignedRes.ok ? await assignedRes.json() : [];
            const allAdmins = adminsRes.ok ? await adminsRes.json() : [];
            setAssignedSousAdmins(assigned || []);
            setAllSousAdmins((allAdmins || []).filter(a => a.admin_type === 'sous_admin'));
        } catch {
            toast.error('فشل في تحميل البيانات');
        } finally {
            setAssignLoading(false);
        }
    };

    const closeAssign = () => {
        setAssignBranch(null);
        setAssignedSousAdmins([]);
        setAllSousAdmins([]);
        setSelectedSousAdminId('');
    };

    const handleAssign = async () => {
        if (!selectedSousAdminId || !assignBranch) return;
        setAssignLoading(true);
        try {
            const res = await authFetch(`${API_URL}/branches/assign-sous-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: selectedSousAdminId,
                    branch_id: assignBranch.id,
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'فشل في التعيين');
            }
            toast.success('تم التعيين بنجاح');
            setSelectedSousAdminId('');
            const reloadRes = await authFetch(`${API_URL}/branches/${assignBranch.id}/sous-admins`);
            if (reloadRes.ok) setAssignedSousAdmins(await reloadRes.json() || []);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setAssignLoading(false);
        }
    };

    const handleUnassign = async (assignmentId) => {
        try {
            const res = await authFetch(
                `${API_URL}/branches/assign-sous-admin/${assignmentId}`,
                { method: 'DELETE' }
            );
            if (!res.ok) throw new Error('فشل في إلغاء التعيين');
            toast.success('تم إلغاء التعيين');
            setAssignedSousAdmins(prev => prev.filter(a => a.id !== assignmentId));
        } catch (err) {
            toast.error(err.message);
        }
    };

    const availableSousAdmins = allSousAdmins.filter(a =>
        !assignedSousAdmins.some(x => x.user_id === a.user_id)
    );

    const filtered = branches.filter(b =>
        !search ||
        b.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.city?.toLowerCase().includes(search.toLowerCase())
    );

    if (!planLoading && !hasFeature('branches')) {
        return (
            <div className="p-6 max-w-3xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 rounded-3xl p-10 text-center shadow-sm">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mb-5 shadow-lg">
                        <Building2 className="text-white" size={40} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-2">ميزة الفروع متاحة في خطة Enterprise</h1>
                    <p className="text-slate-600 mb-6 max-w-md mx-auto">
                        خطتك الحالية: <span className="font-bold text-indigo-700 uppercase">{plan?.plan_id || 'free'}</span>.
                        قم بالترقية إلى <span className="font-black">Enterprise</span> لإدارة فروع متعددة وتعيين مسؤولين مساعدين لكل فرع.
                    </p>
                    <a
                        href="/admin/settings"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                        ترقية الخطة
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <Building2 className="text-indigo-600" size={28} />
                        إدارة الفروع
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        أنشئ فروعاً وعيّن مسؤولين مساعدين لكل فرع
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all"
                >
                    <Plus size={18} />
                    فرع جديد
                </button>
            </div>

            {/* Search */}
            <div className="mb-6 relative">
                <Search className={`absolute top-3.5 ${isRTL ? 'right-4' : 'left-4'} text-slate-400`} size={18} />
                <input
                    type="text"
                    placeholder="البحث عن فرع..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`w-full py-3 ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                />
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                    <Building2 className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-slate-500 font-bold">
                        {search ? 'لا نتائج للبحث' : 'لا توجد فروع بعد'}
                    </p>
                    {!search && (
                        <button
                            onClick={openCreate}
                            className="mt-4 text-sm text-indigo-600 font-bold hover:underline"
                        >
                            + أنشئ أول فرع
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map(b => (
                        <div
                            key={b.id}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                        >
                            <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />
                            <div className="p-5">
                                <div className={`flex items-start justify-between gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                        <h3 className="font-black text-slate-900 text-lg">{b.name}</h3>
                                        {b.city && (
                                            <div className={`flex items-center gap-1.5 text-xs text-slate-500 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <MapPin size={12} />
                                                <span>{b.city}</span>
                                            </div>
                                        )}
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                                        b.is_active
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {b.is_active ? 'نشط' : 'متوقف'}
                                    </span>
                                </div>
                                {b.address && (
                                    <p className={`text-xs text-slate-500 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        {b.address}
                                    </p>
                                )}
                                {b.phone && (
                                    <div className={`flex items-center gap-1.5 text-xs text-slate-500 mb-3 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                                        <Phone size={12} />
                                        <span dir="ltr">{b.phone}</span>
                                    </div>
                                )}
                                <div className={`flex gap-2 pt-3 border-t border-slate-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <button
                                        onClick={() => openAssign(b)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all"
                                        title="إدارة المسؤولين المساعدين"
                                    >
                                        <Users size={14} />
                                        المسؤولون
                                    </button>
                                    <button
                                        onClick={() => openEdit(b)}
                                        className="flex items-center justify-center p-2 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl transition-all"
                                        title="تعديل"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => setConfirmDelete(b)}
                                        className="flex items-center justify-center p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all"
                                        title="حذف"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
                        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-black text-slate-900 text-lg">
                                {editing ? 'تعديل الفرع' : 'فرع جديد'}
                            </h2>
                            <button onClick={closeForm} className="p-1.5 hover:bg-white rounded-lg text-slate-500">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase">
                                    اسم الفرع *
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                    minLength={2}
                                    maxLength={100}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase">المدينة</label>
                                    <input
                                        type="text"
                                        value={form.city}
                                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                                        maxLength={100}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase">الهاتف</label>
                                    <input
                                        type="text"
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        maxLength={20}
                                        dir="ltr"
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase">العنوان</label>
                                <textarea
                                    value={form.address}
                                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    maxLength={300}
                                    rows={2}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-bold text-slate-700">الفرع نشط</span>
                            </label>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                                >
                                    {submitting && <Loader2 className="animate-spin" size={16} />}
                                    {editing ? 'تحديث' : 'إنشاء'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assign sous-admins modal */}
            {assignBranch && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
                        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100 flex items-center justify-between">
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <h2 className="font-black text-slate-900 text-lg">المسؤولون المساعدون</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{assignBranch.name}</p>
                            </div>
                            <button onClick={closeAssign} className="p-1.5 hover:bg-white rounded-lg text-slate-500">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                            {/* Currently assigned */}
                            <div>
                                <label className="block text-xs font-black text-slate-700 mb-2 uppercase">المعينون حالياً</label>
                                {assignLoading && assignedSousAdmins.length === 0 ? (
                                    <div className="flex justify-center py-4">
                                        <Loader2 className="animate-spin text-indigo-600" size={20} />
                                    </div>
                                ) : assignedSousAdmins.length === 0 ? (
                                    <div className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">
                                        لا يوجد مسؤولون مساعدون معينون لهذا الفرع
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {assignedSousAdmins.map(a => (
                                            <div key={a.id} className={`flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                                    <div className="font-bold text-slate-900 text-sm">
                                                        {a.users?.full_name || '—'}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{a.users?.email || ''}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleUnassign(a.id)}
                                                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all"
                                                    title="إلغاء التعيين"
                                                >
                                                    <UserMinus size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Add new */}
                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-xs font-black text-slate-700 mb-2 uppercase">تعيين مسؤول جديد</label>
                                {availableSousAdmins.length === 0 ? (
                                    <div className="text-sm text-slate-500 bg-amber-50 border border-amber-200 rounded-xl p-3">
                                        لا يوجد مسؤولون مساعدون متاحون. أنشئهم أولاً من صفحة <a href="/admin/admins" className="text-indigo-600 font-bold underline">الإداريون</a> بنوع "sous_admin".
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedSousAdminId}
                                            onChange={(e) => setSelectedSousAdminId(e.target.value)}
                                            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        >
                                            <option value="">— اختر مسؤول —</option>
                                            {availableSousAdmins.map(a => (
                                                <option key={a.id} value={a.user_id}>
                                                    {a.full_name} ({a.email})
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAssign}
                                            disabled={!selectedSousAdminId || assignLoading}
                                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-60 flex items-center gap-1.5"
                                        >
                                            <UserPlus size={14} />
                                            تعيين
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!confirmDelete}
                title="حذف الفرع"
                message={confirmDelete ? `هل أنت متأكد من حذف الفرع "${confirmDelete.name}"؟ سيتم فك ربط جميع اللاعبين والمدربين عن هذا الفرع.` : ''}
                onConfirm={handleDelete}
                onCancel={() => setConfirmDelete(null)}
                confirmText="حذف"
                cancelText="إلغاء"
                isRTL={isRTL}
            />
        </div>
    );
};

export default BranchesManagement;
