import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import {
    UserPlus, Mail, Phone, Shield, Trash2, Search,
    X, AlertCircle, Loader2, CheckCircle, Dumbbell,
    Target, Star, Users, RefreshCw, Edit2, Plus
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

// ─── Specialization Config ────────────────────────────────────────────
const SPEC_CONFIG = {
    Technical:   { label: { ar: 'تقني',    fr: 'Technique',  en: 'Technical'   }, color: 'from-indigo-500 to-blue-600',    bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: Target },
    Fitness:     { label: { ar: 'بدني',    fr: 'Physique',   en: 'Fitness'     }, color: 'from-emerald-500 to-teal-600',   bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: Dumbbell },
    Goalkeeper:  { label: { ar: 'حراسة',   fr: 'Gardien',    en: 'Goalkeeper'  }, color: 'from-amber-500 to-orange-500',   bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Shield },
};

const AVATAR_GRADIENTS = [
    'from-indigo-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-500',
    'from-violet-500 to-purple-600',
];

const getGradient = (name = '') =>
    AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];

// ─── Coach Card ───────────────────────────────────────────────────────
const CoachCard = ({ coach, onEdit, onDelete, isRTL }) => {
    const spec = SPEC_CONFIG[coach.specialization] || SPEC_CONFIG.Technical;
    const SpecIcon = spec.icon;
    const gradient = getGradient(coach.full_name);
    const initials = coach.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'CO';

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
            {/* Color top stripe */}
            <div className={`h-2 w-full bg-gradient-to-r ${spec.color}`} />

            <div className="p-6 flex flex-col gap-5">
                {/* Top: Avatar + Name + Badge */}
                <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {coach.photo_url ? (
                        <img src={coach.photo_url} alt={coach.full_name}
                            className="h-16 w-16 rounded-2xl object-cover border-2 border-slate-100 shadow-sm shrink-0" />
                    ) : (
                        <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl font-black shadow-lg shrink-0`}>
                            {initials}
                        </div>
                    )}
                    <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="font-black text-slate-900 text-[16px] truncate">{coach.full_name}</div>
                        <div className={`flex items-center gap-1.5 mt-0.5 text-[12px] text-slate-400 ${isRTL ? 'justify-end' : ''}`}>
                            <Mail size={11} />
                            <span className="truncate">{coach.email || '—'}</span>
                        </div>
                        <div className={`flex items-center gap-1.5 mt-0.5 text-[12px] text-slate-400 ${isRTL ? 'justify-end' : ''}`}>
                            <Phone size={11} />
                            <span dir="ltr">{coach.phone || '—'}</span>
                        </div>
                    </div>
                </div>

                {/* Badges row */}
                <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'justify-end' : 'justify-start'}`}>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border ${spec.bg} ${spec.text} ${spec.border}`}>
                        <SpecIcon size={12} />
                        {spec.label[isRTL ? 'ar' : 'en']}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border ${
                        coach.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${coach.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {coach.status === 'Active' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
                    </span>
                </div>

                {/* Footer actions */}
                <div className={`flex items-center justify-between mt-auto pt-4 border-t border-slate-50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-1.5 text-[10px] font-black text-slate-300 uppercase tracking-widest ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Star size={10} fill="currentColor" />
                        {isRTL ? 'طاقم الأكاديمية' : 'Academy Staff'}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => onEdit(coach)}
                            className="p-2.5 text-slate-400 bg-slate-50 border border-slate-100 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                            title={isRTL ? 'تعديل المدرب' : 'Edit coach'}
                        >
                            <Edit2 size={14} strokeWidth={2.5} />
                        </button>
                        <button
                            type="button"
                            onClick={() => onDelete(coach.id)}
                            className="p-2.5 text-red-400 bg-red-50 border border-red-100 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                            title={isRTL ? 'حذف المدرب' : 'Delete coach'}
                        >
                            <Trash2 size={14} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────
const CoachesManagement = () => {
    const { isRTL, dir } = useLanguage();
    const [coaches, setCoaches] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [search, setSearch] = useState('');
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        full_name: '', email: '', phone: '',
        specialization: 'Technical', status: 'Active',
        photo_url: '', diploma_url: ''
    });
    const toast = useToast();

    const showBanner = (message, type = 'success') => {
        if (type === 'error') toast.error(message);
        else toast.success(message);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchCoaches(); }, []);

    const fetchCoaches = async () => {
        setIsLoading(true);
        try {
            const res = await authFetch(`${API_URL}/coaches/`);
            if (res.ok) setCoaches(await res.json() || []);
            else showBanner(isRTL ? 'فشل تحميل المدربين' : 'Failed to fetch coaches', 'error');
        } catch { showBanner(isRTL ? 'تعذر الاتصال بالسيرفر' : 'Cannot connect to server', 'error'); }
        finally { setIsLoading(false); }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddClick = () => {
        setFormData({ full_name: '', email: '', phone: '', specialization: 'Technical', status: 'Active', photo_url: '', diploma_url: '' });
        setIsEditMode(false);
        setEditingId(null);
        setIsAddModalOpen(true);
    };

    const handleEditClick = (coach) => {
        setFormData({
            full_name: coach.full_name,
            email: coach.email,
            phone: coach.phone,
            specialization: coach.specialization,
            status: coach.status,
            photo_url: coach.photo_url || '',
            diploma_url: coach.diploma_url || ''
        });
        setIsEditMode(true);
        setEditingId(coach.id);
        setIsAddModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const url = isEditMode ? `${API_URL}/coaches/${editingId}` : `${API_URL}/coaches/`;
            const method = isEditMode ? 'PUT' : 'POST';

            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const savedCoach = await res.json();
                setIsAddModalOpen(false);
                setFormData({ full_name: '', email: '', phone: '', specialization: 'Technical', status: 'Active', photo_url: '', diploma_url: '' });
                
                // Miza (Synchronization) - immediately update local state
                if (isEditMode) {
                    setCoaches(prev => prev.map(c => c.id === savedCoach.id ? savedCoach : c));
                    showBanner(isRTL ? 'تم تحديث المدرب بنجاح' : 'Coach updated successfully', 'success');
                } else {
                    setCoaches(prev => [savedCoach, ...prev]);
                    
                    // Show the temporary password for new coaches using SweetAlert2
                    import('sweetalert2').then(({ default: Swal }) => {
                        Swal.fire({
                            icon: 'success',
                            title: isRTL ? 'تم إضافة المدرب بنجاح' : 'Coach Added Successfully',
                            html: `
                                <div class="text-left mt-4" dir="ltr">
                                    <p class="text-slate-600 mb-2">${isRTL ? 'يرجى مشاركة بيانات الدخول هذه مع المدرب:' : 'Please share these credentials with the coach:'}</p>
                                    <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div class="mb-2"><strong>Email:</strong> ${savedCoach.email}</div>
                                        <div><strong>Password:</strong> <code class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded">${savedCoach.temp_password}</code></div>
                                    </div>
                                    <p class="text-sm text-amber-600 mt-4">${isRTL ? 'هذه كلمة المرور ستظهر لمرة واحدة فقط!' : 'This password will only be shown once!'}</p>
                                </div>
                            `,
                            confirmButtonText: isRTL ? 'حسناً مجدداً' : 'Got it',
                            confirmButtonColor: '#4f46e5',
                            customClass: {
                                popup: 'rounded-3xl',
                                confirmButton: 'rounded-xl px-8 font-black uppercase tracking-wider',
                            }
                        });
                    });
                }
            } else {
                const err = await res.json();
                
                // Parse specific Supabase errors to be more user-friendly
                let errorMsg = err.detail || 'Failed to save coach';
                if (errorMsg.includes('409 Conflict') || errorMsg.includes('duplicate key')) {
                    errorMsg = 'HADA HISSAB DEJA MOSSAJAL';
                }
                
                showBanner(errorMsg, 'error');
            }
        } catch (error) {
            showBanner(`${isRTL ? 'فشل الاتصال' : 'Server error'}: ${error.message}`, 'error');
        } finally { setIsSubmitting(false); }
    };

    const handleDelete = (id) => {
        setConfirmDialog({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        try {
            const res = await authFetch(`${API_URL}/coaches/${id}`, { method: 'DELETE' });
            if (res.ok) { await fetchCoaches(); showBanner(isRTL ? 'تم حذف المدرب' : 'Coach deleted', 'success'); }
        } catch { showBanner(isRTL ? 'فشل الحذف' : 'Delete failed', 'error'); }
    };

    const filtered = coaches.filter(c =>
        c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.specialization?.toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = coaches.filter(c => c.status === 'Active').length;

    return (
        <div className={`animate-fade-in pb-16 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>

            {/* Toast handled by global provider */}

            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 flex-wrap">
                        {isRTL ? 'إدارة' : 'Coaches'}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            {isRTL ? 'المدربين' : 'Management'}
                        </span>
                        <span className="bg-indigo-600 text-white text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest">
                            {coaches.length} {isRTL ? 'مدرب' : 'STAFF'}
                        </span>
                    </h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">
                        {isRTL ? 'إدارة الكادر التقني للأكاديمية' : 'Manage your academy coaching staff'}
                    </p>
                </div>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button type="button" onClick={fetchCoaches} className="p-3.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                        <RefreshCw size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={handleAddClick}
                        className={`flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-7 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:-translate-y-1 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                        <UserPlus size={18} />
                        <span>{isRTL ? 'إضافة مدرب' : 'Add Coach'}</span>
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8`}>
                {[
                    { label: isRTL ? 'إجمالي المدربين' : 'Total Staff', value: coaches.length, icon: Users, color: 'indigo' },
                    { label: isRTL ? 'نشطون' : 'Active', value: activeCount, icon: CheckCircle, color: 'emerald' },
                    { label: isRTL ? 'المتخصصات' : 'Specializations', value: [...new Set(coaches.map(c => c.specialization))].length, icon: Target, color: 'purple' },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="bg-white rounded-[1.75rem] border border-slate-100 shadow-sm p-5 flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative max-w-sm">
                    <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-300 ${isRTL ? 'right-5' : 'left-5'}`} size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={isRTL ? 'البحث عن مدرب...' : 'Search coaches...'}
                        className={`w-full ${isRTL ? 'pr-12 pl-5 text-right' : 'pl-12 pr-5'} py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm`}
                    />
                </div>
            </div>

            {/* Coach Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="text-indigo-600 animate-spin" size={40} />
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{isRTL ? 'جاري التحميل...' : 'Loading staff...'}</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center">
                        <Users className="text-slate-300" size={36} />
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                        {search ? (isRTL ? 'لا توجد نتائج' : 'No results found') : (isRTL ? 'لا يوجد مدربون مسجلون' : 'No coaches added yet')}
                    </p>
                    {!search && (
                        <button type="button" onClick={() => setIsAddModalOpen(true)} className="px-6 py-3 text-xs font-black uppercase tracking-widest bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all">
                            {isRTL ? 'إضافة أول مدرب' : 'Add first coach'}
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map(coach => (
                        <CoachCard key={coach.id} coach={coach} onEdit={handleEditClick} onDelete={handleDelete} isRTL={isRTL} />
                    ))}
                </div>
            )}

            {/* Add Coach Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col border border-slate-200" style={{ maxHeight: '85vh', overflow: 'hidden' }}>
                        {/* Modal Header */}
                        <div className={`flex justify-between items-center p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">{isEditMode ? (isRTL ? 'تحديث بيانات المدرب' : 'Edit Coach') : (isRTL ? 'إضافة مدرب جديد' : 'Add New Coach')}</h2>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">{isEditMode ? (isRTL ? 'تعديل بيانات المدرب' : 'Update coach details') : (isRTL ? 'أدخل بيانات المدرب' : 'Enter coach details')}</p>
                            </div>
                            <button type="button" onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full border border-transparent transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="p-6 sm:p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1">

                                {/* Full Name */}
                                <div>
                                    <label className={`block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'الاسم الكامل' : 'Full Name'} *</label>
                                    <input name="full_name" value={formData.full_name} onChange={handleInputChange} required
                                        placeholder={isRTL ? 'رشيد الإدريسي' : 'e.g. Rachid El Idrissi'}
                                        className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all ${isRTL ? 'text-right' : ''}`} />
                                </div>

                                {/* Email + Phone */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'البريد الإلكتروني' : 'Email'} *</label>
                                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} required
                                            pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
                                            title={isRTL ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email address'}
                                            placeholder="rachid@academy.com"
                                            className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all ${isRTL ? 'text-right' : ''}`} />
                                    </div>
                                    <div>
                                        <label className={`block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'الهاتف' : 'Phone'}</label>
                                        <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange}
                                            pattern="^\+?[0-9]{8,15}$"
                                            title={isRTL ? 'يجب إدخال رقم هاتف صحيح، مثال: 212600000000+' : 'Must be a valid phone number, e.g., +212600000000'}
                                            placeholder="+212 6..."
                                            className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all ${isRTL ? 'text-right' : ''}`} />
                                    </div>
                                </div>

                                {/* Specialization */}
                                <div>
                                    <label className={`block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'التخصص' : 'Specialization'}</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {Object.entries(SPEC_CONFIG).map(([key, cfg]) => {
                                            const Icon = cfg.icon;
                                            const selected = formData.specialization === key;
                                            return (
                                                <button key={key} type="button" onClick={() => setFormData(p => ({ ...p, specialization: key }))}
                                                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all font-black text-[11px] uppercase tracking-wider ${selected ? `bg-gradient-to-br ${cfg.color} text-white border-transparent shadow-lg` : `bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300`}`}>
                                                    <Icon size={20} />
                                                    {cfg.label[isRTL ? 'ar' : 'en']}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className={`block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ${isRTL ? 'text-right' : ''}`}>{isRTL ? 'الحالة' : 'Status'}</label>
                                    <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        {[['Active', isRTL ? 'نشط' : 'Active', 'emerald'], ['Inactive', isRTL ? 'غير نشط' : 'Inactive', 'slate']].map(([val, lbl, col]) => (
                                            <button key={val} type="button" onClick={() => setFormData(p => ({ ...p, status: val }))}
                                                className={`flex-1 py-3 rounded-2xl border-2 text-[11px] font-black uppercase tracking-wider transition-all ${formData.status === val
                                                    ? col === 'emerald' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg' : 'bg-slate-600 text-white border-slate-600 shadow-lg'
                                                    : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                                {lbl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className={`p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <button type="button" onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-3.5 text-sm font-black text-slate-500 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest">
                                    {isRTL ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" disabled={isSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-black rounded-2xl shadow-lg disabled:opacity-60 uppercase tracking-widest hover:-translate-y-0.5 transition-all">
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (isEditMode ? <Edit2 size={16} /> : <UserPlus size={16} />)}
                                    {isEditMode ? (isRTL ? 'حفظ التعديلات' : 'Save Changes') : (isRTL ? 'إضافة المدرب' : 'Add Coach')}
                                </button>
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
                title={isRTL ? 'حذف المدرب' : 'Delete Coach'}
                message={isRTL ? 'هل أنت متأكد من حذف هذا المدرب؟ لا يمكن التراجع.' : 'Are you sure you want to remove this coach? This cannot be undone.'}
            />
        </div>
    );
};

export default CoachesManagement;
