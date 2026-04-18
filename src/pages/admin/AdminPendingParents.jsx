import React, { useEffect, useState, useMemo } from 'react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import {
    UserCheck, UserX, Mail, Phone, Clock, Search,
    RefreshCw, Loader2, CheckCircle, XCircle, Users, AlertCircle, Building2
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';

const AVATAR_GRADIENTS = [
    'from-indigo-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-500',
    'from-violet-500 to-purple-600',
];

const gradientFor = (name = '?') =>
    AVATAR_GRADIENTS[(name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];

const ParentCard = ({ parent, academyName, onApprove, onReject, busy, isRTL }) => {
    const initials = parent.full_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'P';
    const gradient = gradientFor(parent.full_name);
    const createdAt = parent.created_at ? new Date(parent.created_at).toLocaleDateString() : '—';

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-orange-500" />
            <div className="p-5 flex flex-col gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg font-black shadow-sm shrink-0`}>
                        {initials}
                    </div>
                    <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="font-black text-slate-900 text-[15px] truncate">
                            {parent.full_name || '—'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-700 font-semibold">
                            <Clock size={10} />
                            <span>{isRTL ? 'قيد المراجعة' : 'En attente'}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 text-[12px] text-slate-600">
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Mail size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{parent.email || '—'}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Phone size={12} className="text-slate-400 shrink-0" />
                        <span>{parent.phone || '—'}</span>
                    </div>
                    {academyName && (
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Building2 size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{academyName}</span>
                        </div>
                    )}
                    <div className={`flex items-center gap-2 text-[11px] text-slate-400 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Clock size={10} />
                        <span>{createdAt}</span>
                    </div>
                </div>

                <div className={`flex gap-2 pt-2 border-t border-slate-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button
                        onClick={() => onApprove(parent)}
                        disabled={busy}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[12px] font-black transition-colors"
                    >
                        {busy ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                        {isRTL ? 'قبول' : 'Approuver'}
                    </button>
                    <button
                        onClick={() => onReject(parent)}
                        disabled={busy}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-[12px] font-black transition-colors"
                    >
                        <UserX size={14} />
                        {isRTL ? 'رفض' : 'Rejeter'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminPendingParents = () => {
    const { isRTL, dir } = useLanguage();
    const toast = useToast();

    const [parents, setParents] = useState([]);
    const [academies, setAcademies] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [busyId, setBusyId] = useState(null);
    const [confirm, setConfirm] = useState(null);

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const [pRes, aRes] = await Promise.all([
                authFetch(`${API_URL}/auth/pending-parents`),
                fetch(`${API_URL}/public/academies`).catch(() => null),
            ]);
            if (!pRes.ok) throw new Error(`HTTP ${pRes.status}`);
            const pData = await pRes.json();
            setParents(Array.isArray(pData) ? pData : []);

            if (aRes && aRes.ok) {
                const aData = await aRes.json();
                const map = {};
                (Array.isArray(aData) ? aData : []).forEach(a => { map[a.id] = a.name; });
                setAcademies(map);
            }
        } catch (e) {
            setError(e.message || 'Failed to load');
            setParents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const decide = async (parent, action) => {
        setBusyId(parent.id);
        try {
            const res = await authFetch(`${API_URL}/auth/approve-parent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent_user_id: parent.id, action }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || `HTTP ${res.status}`);
            }
            toast.success(
                action === 'approve'
                    ? (isRTL ? 'تم تفعيل الحساب' : 'Compte activé')
                    : (isRTL ? 'تم رفض الحساب' : 'Compte rejeté')
            );
            setParents(prev => prev.filter(p => p.id !== parent.id));
        } catch (e) {
            toast.error(e.message || (isRTL ? 'فشلت العملية' : 'Échec'));
        } finally {
            setBusyId(null);
            setConfirm(null);
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return parents;
        return parents.filter(p =>
            (p.full_name || '').toLowerCase().includes(q) ||
            (p.email || '').toLowerCase().includes(q) ||
            (p.phone || '').toLowerCase().includes(q)
        );
    }, [parents, search]);

    return (
        <div dir={dir} className="space-y-6">
            {/* Header */}
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-sm">
                    <Users size={22} />
                </div>
                <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <h1 className="text-2xl font-black text-slate-900">
                        {isRTL ? 'حسابات أولياء الأمور المعلقة' : 'Parents en attente'}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        {isRTL
                            ? 'قم بمراجعة وتفعيل الحسابات بعد تأكيد الدفع'
                            : 'Vérifier et activer les comptes après confirmation du paiement'}
                    </p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    title={isRTL ? 'تحديث' : 'Actualiser'}
                >
                    <RefreshCw size={16} className={`text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Clock size={18} className="text-amber-600" />
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {isRTL ? 'قيد المراجعة' : 'En attente'}
                        </div>
                        <div className="text-xl font-black text-slate-900">{parents.length}</div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <CheckCircle size={18} className="text-emerald-600" />
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {isRTL ? 'الإجراء' : 'Action'}
                        </div>
                        <div className="text-[12px] font-bold text-slate-700 mt-0.5">
                            {isRTL ? 'قبول / رفض' : 'Approuver / Rejeter'}
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <AlertCircle size={18} className="text-indigo-600" />
                    </div>
                    <div className={`${isRTL ? 'text-right' : 'text-left'} min-w-0`}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {isRTL ? 'ملاحظة' : 'Note'}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                            {isRTL ? 'أكّد الدفع قبل التفعيل' : 'Vérifier paiement avant activation'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={isRTL ? 'بحث بالاسم أو الإيميل...' : 'Rechercher par nom ou email...'}
                    className={`w-full py-3 rounded-xl bg-white border border-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-400 ${isRTL ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3'}`}
                />
            </div>

            {/* Error */}
            {error && !loading && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                    <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{error}</p>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 size={24} className="text-indigo-500 animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 py-16 px-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center">
                        <CheckCircle size={28} className="text-emerald-500" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 mb-1">
                        {search
                            ? (isRTL ? 'لا نتائج' : 'Aucun résultat')
                            : (isRTL ? 'لا حسابات معلقة' : 'Aucun compte en attente')}
                    </h3>
                    <p className="text-xs text-slate-500">
                        {isRTL
                            ? 'جميع الطلبات تمت معالجتها'
                            : 'Toutes les demandes ont été traitées'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(parent => (
                        <ParentCard
                            key={parent.id}
                            parent={parent}
                            academyName={academies[parent.academy_id]}
                            busy={busyId === parent.id}
                            isRTL={isRTL}
                            onApprove={(p) => setConfirm({ parent: p, action: 'approve' })}
                            onReject={(p) => setConfirm({ parent: p, action: 'reject' })}
                        />
                    ))}
                </div>
            )}

            {/* Confirm dialog */}
            {confirm && (
                <ConfirmDialog
                    isOpen={!!confirm}
                    title={
                        confirm.action === 'approve'
                            ? (isRTL ? 'تأكيد التفعيل' : 'Confirmer l\'activation')
                            : (isRTL ? 'تأكيد الرفض' : 'Confirmer le rejet')
                    }
                    message={
                        confirm.action === 'approve'
                            ? (isRTL
                                ? `هل أكّدت دفع ${confirm.parent.full_name}؟ سيتم تفعيل حسابه.`
                                : `Avez-vous confirmé le paiement de ${confirm.parent.full_name} ? Son compte sera activé.`)
                            : (isRTL
                                ? `هل تريد رفض حساب ${confirm.parent.full_name}؟`
                                : `Rejeter le compte de ${confirm.parent.full_name} ?`)
                    }
                    confirmText={confirm.action === 'approve'
                        ? (isRTL ? 'تفعيل' : 'Activer')
                        : (isRTL ? 'رفض' : 'Rejeter')}
                    cancelText={isRTL ? 'إلغاء' : 'Annuler'}
                    isRTL={isRTL}
                    onConfirm={() => decide(confirm.parent, confirm.action)}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </div>
    );
};

export default AdminPendingParents;
