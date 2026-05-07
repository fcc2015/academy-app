import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Mail, Send, CheckCircle2, Trash2, KeyRound, X, Copy, Check, AlertTriangle, Sparkles, CalendarClock, ArrowRight } from 'lucide-react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';

const MatchManagerInvite = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inviting, setInviting] = useState(false);
    const [form, setForm] = useState({ full_name: '', email: '' });
    const [resultModal, setResultModal] = useState(null); // { email, password, name, emailSent }
    const [copied, setCopied] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [resetting, setResetting] = useState(false);

    const fetchManagers = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/admins/`);
            if (res.ok) {
                const data = await res.json();
                setManagers(
                    (data || []).filter(a =>
                        a.admin_type === 'match_manager' || a.permissions?.can_manage_matches
                    )
                );
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchManagers(); }, []);

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!form.email || !form.full_name) return;
        setInviting(true);
        try {
            const res = await authFetch(`${API_URL}/admins/invite-match-manager`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Invite failed');

            setResultModal({
                email: form.email,
                password: data.temp_password,
                name: form.full_name,
                emailSent: data.email_sent,
            });
            setForm({ full_name: '', email: '' });
            fetchManagers();
        } catch (err) {
            toast.error(err.message || 'Failed to invite');
        } finally {
            setInviting(false);
        }
    };

    const handleResetPassword = async (mgr) => {
        setResetting(true);
        try {
            const res = await authFetch(`${API_URL}/admins/${mgr.id}/reset-password`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Reset failed');
            setResultModal({
                email: data.email || mgr.email,
                password: data.temp_password,
                name: data.full_name || mgr.full_name,
                emailSent: false,
            });
        } catch (err) {
            toast.error(err.message);
        } finally {
            setResetting(false);
        }
    };

    const handleRevoke = async (mgr) => {
        try {
            const res = await authFetch(`${API_URL}/admins/${mgr.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('تم سحب الصلاحية');
                setConfirmDelete(null);
                fetchManagers();
            } else {
                toast.error('فشل الحذف');
            }
        } catch {
            toast.error('خطأ في الاتصال');
        }
    };

    const copyPassword = () => {
        if (resultModal?.password) {
            navigator.clipboard.writeText(resultModal.password);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="animate-fade-in pb-10" dir="rtl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/30">
                        <CalendarClock size={24} />
                    </div>
                    البرمجة (Programmateur)
                </h1>
                <p className="text-slate-500 font-medium mt-2">
                    Manage who is responsible for scheduling weekend matches. You can keep this yourself or delegate via email invitation.
                </p>
            </div>

            {/* Quick action: open the actual scheduler */}
            <button
                onClick={() => navigate('/admin/matches')}
                className="w-full mb-8 bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 hover:to-slate-600 text-white px-6 py-4 rounded-2xl flex items-center justify-between gap-3 transition-all shadow-lg group"
            >
                <div className="flex items-center gap-3">
                    <Trophy size={20} />
                    <div className="text-left">
                        <p className="font-black text-sm">Open Match Scheduler</p>
                        <p className="text-[11px] text-slate-300 font-medium">Schedule weekend matches with terrains, tournaments, categories</p>
                    </div>
                </div>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Invite form */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden sticky top-4">
                        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-fuchsia-50 to-pink-50">
                            <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                                <Mail className="text-fuchsia-600" size={18} />
                                Invite a Programmateur
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium">Send credentials by email</p>
                        </div>

                        <form onSubmit={handleInvite} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={form.full_name}
                                    onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
                                    placeholder="Mohamed Alami"
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-fuchsia-500/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="programmateur@example.com"
                                    required
                                    dir="ltr"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-fuchsia-500/20 outline-none text-left"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={inviting}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-fuchsia-500/30 disabled:opacity-50 active:scale-95"
                            >
                                {inviting ? (
                                    <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</span>
                                ) : (
                                    <><Send size={14} /> Send Invitation</>
                                )}
                            </button>

                            <p className="text-[10px] text-slate-400 text-center font-medium">
                                ⚠️ The invitee will receive a temporary password by email and must change it on first login.
                            </p>
                        </form>
                    </div>
                </div>

                {/* Current Programmateurs */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                                <Sparkles className="text-fuchsia-600" size={18} />
                                Current Programmateurs
                            </h3>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-fuchsia-100 text-fuchsia-700 px-3 py-1 rounded-full">
                                {managers.length} {managers.length === 1 ? 'person' : 'people'}
                            </span>
                        </div>

                        <div className="p-6">
                            {loading ? (
                                <div className="py-12 text-center">
                                    <div className="w-8 h-8 border-2 border-fuchsia-200 border-t-fuchsia-600 rounded-full animate-spin mx-auto" />
                                </div>
                            ) : managers.length === 0 ? (
                                <div className="py-16 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                                        <CalendarClock size={28} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-700 mb-1">Admin handles scheduling by default</p>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Invite someone via email to delegate this responsibility.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {managers.map(mgr => (
                                        <div
                                            key={mgr.id}
                                            className="flex items-center justify-between gap-3 bg-gradient-to-r from-fuchsia-50/50 to-white border border-fuchsia-100 rounded-2xl p-4"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white flex items-center justify-center font-black text-lg shrink-0">
                                                    {mgr.full_name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-900 truncate">{mgr.full_name}</p>
                                                    <p className="text-xs text-slate-500 font-medium truncate" dir="ltr">{mgr.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleResetPassword(mgr)}
                                                    disabled={resetting}
                                                    className="p-2.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                                                    title="Regenerate password"
                                                >
                                                    <KeyRound size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(mgr)}
                                                    className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                    title="Revoke access"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Result Modal */}
            {resultModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="ltr">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setResultModal(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2"
                        >
                            <X size={18} />
                        </button>
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-1">
                                {resultModal.emailSent ? 'Invitation sent!' : 'Credentials ready'}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium mb-1">{resultModal.name}</p>

                            {resultModal.emailSent ? (
                                <p className="text-xs text-emerald-600 font-black uppercase tracking-wider mb-4 inline-flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full">
                                    <Mail size={11} /> Email delivered
                                </p>
                            ) : (
                                <p className="text-xs text-amber-600 font-black uppercase tracking-wider mb-4 inline-flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full">
                                    <AlertTriangle size={11} /> Email not sent — share manually
                                </p>
                            )}

                            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden mb-4 text-left">
                                <div className="p-4 border-b border-slate-200">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Email</p>
                                    <p className="text-sm font-black text-slate-800 select-all">{resultModal.email}</p>
                                </div>
                                <div className="p-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Temporary password</p>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xl font-black text-fuchsia-600 tracking-[0.15em] font-mono select-all">
                                            {resultModal.password}
                                        </p>
                                        <button
                                            onClick={copyPassword}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0"
                                            style={{
                                                background: copied ? '#10b981' : '#fdf4ff',
                                                color: copied ? 'white' : '#a21caf',
                                            }}
                                        >
                                            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setResultModal(null)}
                                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={!!confirmDelete}
                onConfirm={() => confirmDelete && handleRevoke(confirmDelete)}
                onCancel={() => setConfirmDelete(null)}
                isRTL={true}
                title="سحب الصلاحية"
                message={confirmDelete ? `سيتم سحب صلاحية البرمجة من ${confirmDelete.full_name}. كيقدر يتم الرجوع عن هذا الإجراء بإعادة الدعوة.` : ''}
            />
        </div>
    );
};

export default MatchManagerInvite;
