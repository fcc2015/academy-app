import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Search, X, CheckCircle2, ShieldAlert, Copy, Check, UserCog, Calculator, Briefcase, ChevronDown } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';

const ADMIN_TYPES = [
    { value: 'admin',      label: 'مدير كامل الصلاحيات', labelFr: 'Administrateur', icon: Shield,    color: '#6366f1', bg: '#eef2ff' },
    { value: 'employee',   label: 'موظف',                  labelFr: 'Employé',        icon: Briefcase, color: '#0ea5e9', bg: '#e0f2fe' },
    { value: 'accountant', label: 'محاسب',                 labelFr: 'Comptable',      icon: Calculator, color: '#10b981', bg: '#d1fae5' },
];

const getAdminTypeInfo = (type) => ADMIN_TYPES.find(t => t.value === type) || ADMIN_TYPES[0];

const AdminsManagement = () => {
    const [admins, setAdmins] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        admin_type: 'admin',
        status: 'Active',
        permissions: {
            can_manage_users: false,
            can_manage_financials: false,
            can_manage_coaches: false
        }
    });
    const [successData, setSuccessData] = useState(null); // { email, password, name, type }
    const [copied, setCopied] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

    useEffect(() => { fetchAdmins(); }, []);

    const fetchAdmins = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/admins/`);
            if (res.ok) setAdmins(await res.json());
        } catch (error) { console.error('Error fetching admins:', error); }
        finally { setIsLoading(false); }
    };

    const showFeedback = (message, type = 'success') => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback(null), 3500);
    };

    const handleOpenModal = (admin = null) => {
        if (admin) {
            setEditingAdmin(admin);
            setFormData({
                full_name: admin.full_name,
                email: admin.email,
                admin_type: admin.admin_type || 'admin',
                status: admin.status,
                permissions: admin.permissions || { can_manage_users: false, can_manage_financials: false, can_manage_coaches: false }
            });
        } else {
            setEditingAdmin(null);
            setFormData({ full_name: '', email: '', admin_type: 'admin', status: 'Active', permissions: { can_manage_users: false, can_manage_financials: false, can_manage_coaches: false } });
        }
        setSuccessData(null);
        setCopied(false);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => { setIsModalOpen(false); setEditingAdmin(null); setSuccessData(null); };

    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, permissions: { ...prev.permissions, [name]: checked } }));
    };

    // Auto-fill permissions based on role
    const handleAdminTypeChange = (type) => {
        const permMap = {
            admin:      { can_manage_users: true, can_manage_financials: true, can_manage_coaches: true },
            employee:   { can_manage_users: true, can_manage_financials: false, can_manage_coaches: false },
            accountant: { can_manage_users: false, can_manage_financials: true, can_manage_coaches: false },
        };
        setFormData(prev => ({ ...prev, admin_type: type, permissions: permMap[type] || prev.permissions }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingAdmin ? `${API_URL}/admins/${editingAdmin.id}` : `${API_URL}/admins/`;
            const method = editingAdmin ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });

            if (res.ok) {
                const data = await res.json();
                if (!editingAdmin && data.temp_password) {
                    setSuccessData({
                        email: formData.email,
                        password: data.temp_password,
                        name: formData.full_name,
                        type: formData.admin_type
                    });
                    setAdmins(prev => [data, ...prev]);
                } else {
                    showFeedback('تم تحديث الإداري بنجاح ✅');
                    handleCloseModal();
                    fetchAdmins();
                }
            } else {
                const err = await res.json().catch(() => ({}));
                showFeedback(err.detail || 'حدث خطأ أثناء الحفظ', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showFeedback('خطأ في الاتصال بالخادم', 'error');
        }
    };

    const handleDelete = (id) => {
        setConfirmDialog({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        try {
            const res = await fetch(`${API_URL}/admins/${id}`, { method: 'DELETE' });
            if (res.ok) { showFeedback('تم الحذف بنجاح'); fetchAdmins(); }
            else showFeedback('فشل الحذف', 'error');
        } catch { showFeedback('خطأ في الاتصال', 'error'); }
    };

    const handleCopyPassword = () => {
        if (successData?.password) {
            navigator.clipboard.writeText(successData.password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const filteredAdmins = admins.filter(a =>
        a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in" dir="rtl">
            {/* Feedback Toast */}
            {feedback && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[150] px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl animate-bounce-in ${
                    feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                }`}>
                    {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <X size={20} />}
                    <span className="font-bold">{feedback.message}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                        <Shield className="text-indigo-600" size={32} />
                        إدارة الصلاحيات والإداريين
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">أضف إداريين جدد وحدد أدوارهم وصلاحياتهم بدقة</p>
                </div>
                <button onClick={() => handleOpenModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/30">
                    <Plus size={20} /> إضافة إداري
                </button>
            </div>

            {/* Admin Type Legend */}
            <div className="flex flex-wrap gap-3">
                {ADMIN_TYPES.map(t => {
                    const Icon = t.icon;
                    return (
                        <div key={t.value} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: t.bg, color: t.color }}>
                            <Icon size={13} /> {t.label}
                        </div>
                    );
                })}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input type="text" placeholder="بحث عن إداري..."
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">الإداري</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">الدور</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">الصلاحيات</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">تاريخ الانضمام</th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                </td></tr>
                            ) : filteredAdmins.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">لا يوجد إداريين.</td></tr>
                            ) : filteredAdmins.map((admin) => {
                                const typeInfo = getAdminTypeInfo(admin.admin_type);
                                const TypeIcon = typeInfo.icon;
                                return (
                                    <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white" style={{ background: typeInfo.color }}>
                                                    {admin.full_name?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{admin.full_name}</div>
                                                    <div className="text-xs text-slate-400 font-medium" dir="ltr">{admin.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black" style={{ background: typeInfo.bg, color: typeInfo.color }}>
                                                <TypeIcon size={12} /> {typeInfo.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {admin.permissions?.can_manage_users && <span className="px-2 py-1 text-[10px] font-black uppercase bg-blue-100 text-blue-700 rounded-lg">اللاعبين</span>}
                                                {admin.permissions?.can_manage_financials && <span className="px-2 py-1 text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 rounded-lg">المالية</span>}
                                                {admin.permissions?.can_manage_coaches && <span className="px-2 py-1 text-[10px] font-black uppercase bg-amber-100 text-amber-700 rounded-lg">المدربين</span>}
                                                {(!admin.permissions || (!admin.permissions.can_manage_users && !admin.permissions.can_manage_financials && !admin.permissions.can_manage_coaches)) && (
                                                    <span className="text-slate-400 text-xs">قراءة فقط</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                            {admin.created_at ? new Date(admin.created_at).toLocaleDateString('en-GB') : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleOpenModal(admin)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"><Edit2 size={18} /></button>
                                                <button onClick={() => handleDelete(admin.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
                        <button onClick={handleCloseModal} className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors"><X size={20} /></button>

                        <h2 className="text-2xl font-black text-slate-800 mb-6">{editingAdmin ? 'تعديل الإداري' : 'إضافة إداري جديد'}</h2>

                        {/* ─── SUCCESS STATE ─── */}
                        {successData ? (
                            <div className="text-center animate-fade-in">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 8px 32px rgba(16,185,129,0.35)' }}>
                                    <CheckCircle2 size={40} className="text-white" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-1">تم إنشاء الحساب بنجاح! 🎉</h3>
                                <p className="text-slate-500 font-medium mb-6 text-sm">
                                    قم بنسخ بيانات الدخول وإرسالها لـ <span className="font-black text-slate-800">{successData.name}</span>. لن تظهر كلمة المرور مرة أخرى.
                                </p>

                                {/* Role Badge */}
                                {(() => {
                                    const typeInfo = getAdminTypeInfo(successData.type);
                                    const TypeIcon = typeInfo.icon;
                                    return (
                                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black mb-6" style={{ background: typeInfo.bg, color: typeInfo.color }}>
                                            <TypeIcon size={16} /> {typeInfo.label}
                                        </div>
                                    );
                                })()}

                                {/* Credentials Box */}
                                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden mb-4">
                                    <div className="p-4 border-b border-slate-200">
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">البريد الإلكتروني</p>
                                        <p className="text-base font-black text-slate-800" dir="ltr">{successData.email}</p>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">كلمة المرور المؤقتة</p>
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-2xl font-black text-indigo-600 tracking-[0.2em] select-all" dir="ltr">{successData.password}</p>
                                            <button onClick={handleCopyPassword}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all"
                                                style={{ background: copied ? '#10b981' : '#eef2ff', color: copied ? 'white' : '#6366f1' }}>
                                                {copied ? <><Check size={14} /> تم النسخ</> : <><Copy size={14} /> نسخ</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-right mb-6">
                                    <p className="text-amber-700 text-xs font-bold">⚠️ تأكد من إرسال هذه المعلومات للإداري عبر قناة آمنة. سيُطلب منه تغيير كلمة المرور عند أول تسجيل دخول.</p>
                                </div>

                                <button onClick={handleCloseModal} className="w-full py-3.5 rounded-xl font-black text-white transition-all" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 20px rgba(79,70,229,0.3)' }}>
                                    ✅ حسناً، تم الإرسال
                                </button>
                            </div>
                        ) : (
                            /* ─── FORM STATE ─── */
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Name + Email */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">الاسم الكامل</label>
                                        <input type="text" value={formData.full_name}
                                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                                        <input type="email" value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors text-left"
                                            dir="ltr" required disabled={!!editingAdmin} />
                                    </div>
                                </div>

                                {/* Admin Type Selector */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">نوع الإداري / الدور</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {ADMIN_TYPES.map(t => {
                                            const Icon = t.icon;
                                            const isSelected = formData.admin_type === t.value;
                                            return (
                                                <button key={t.value} type="button" onClick={() => handleAdminTypeChange(t.value)}
                                                    className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all"
                                                    style={{
                                                        borderColor: isSelected ? t.color : 'rgba(148,163,184,0.2)',
                                                        background: isSelected ? t.bg : 'white',
                                                        boxShadow: isSelected ? `0 0 0 3px ${t.color}20` : 'none'
                                                    }}>
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: isSelected ? t.color : '#f1f5f9', color: isSelected ? 'white' : '#94a3b8' }}>
                                                        <Icon size={18} />
                                                    </div>
                                                    <span className="text-xs font-black" style={{ color: isSelected ? t.color : '#64748b' }}>{t.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Permissions */}
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <ShieldAlert className="text-indigo-600" size={18} />
                                        لوحة الصلاحيات
                                        <span className="text-xs font-medium text-slate-400 mr-auto">(تُضبط تلقائياً حسب الدور)</span>
                                    </h4>
                                    <div className="space-y-3">
                                        {[
                                            { name: 'can_manage_users',      label: 'إدارة اللاعبين (إضافة، تعديل، حذف)', accent: '#6366f1' },
                                            { name: 'can_manage_financials', label: 'إدارة المالية والاشتراكات',              accent: '#10b981' },
                                            { name: 'can_manage_coaches',    label: 'إدارة المدربين والأطقم',                accent: '#f59e0b' },
                                        ].map(perm => (
                                            <label key={perm.name} className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors">
                                                <input type="checkbox" name={perm.name}
                                                    checked={formData.permissions[perm.name]}
                                                    onChange={handleCheckboxChange}
                                                    className="w-5 h-5 rounded border-gray-300 focus:ring-indigo-500"
                                                    style={{ accentColor: perm.accent }} />
                                                <span className="font-bold text-slate-700">{perm.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={handleCloseModal}
                                        className="px-6 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                                        إلغاء
                                    </button>
                                    <button type="submit"
                                        className="px-6 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg shadow-indigo-500/30"
                                        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                                        {editingAdmin ? 'حفظ التعديلات' : 'إنشاء الحساب وإرسال'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onConfirm={confirmDelete}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
                isRTL={true}
                title="حذف الإداري"
                message="هل أنت متأكد من حذف هذا الإداري؟ لا يمكن التراجع عن هذا الإجراء."
            />
        </div>
    );
};

export default AdminsManagement;
