import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Edit2, Trash2, X, CheckCircle, Ban, DollarSign, Calendar, Search, Phone, Shield, ShieldAlert, Sparkles, UserMinus, UserCheck, Inbox, FileText } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

const API_URL = import.meta.env.VITE_API_URL;
const SANCTION_TYPES = ['Warning', 'Suspension', 'Fine', 'Match_Ban'];

const SanctionsManagement = () => {
    const { isRTL, dir, t, formatDate } = useLanguage();
    const [sanctions, setSanctions] = useState([]);
    const [players, setPlayers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' (pending) or 'registry' (all history)
    const [confirmAction, setConfirmAction] = useState({ isOpen: false, type: null, sanction: null });
    const toast = useToast();

    const blank = {
        player_id: '',
        player_name: '',
        sanction_type: 'Warning',
        amount: 0,
        reason: '',
        report_text: '',
        end_date: ''
    };
    const [form, setForm] = useState(blank);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const [sRes, pRes] = await Promise.all([
                authFetch(`${API_URL}/sanctions/`),
                authFetch(`${API_URL}/players/`)
            ]);
            if (sRes.ok) setSanctions(await sRes.json());
            if (pRes.ok) setPlayers(await pRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const showBanner = (msg, ok = true) => {
        if (ok) toast.success(msg);
        else toast.error(msg);
    };

    const openAdd = () => {
        setForm(blank);
        setIsModalOpen(true);
    };

    const handlePlayerSelect = (e) => {
        const p = players.find(pl => pl.user_id === e.target.value);
        setForm(f => ({ ...f, player_id: e.target.value, player_name: p?.full_name || '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form };
            if (payload.sanction_type !== 'Fine') {
                payload.amount = 0;
            } else {
                payload.amount = parseFloat(payload.amount) || 0;
            }
            if (!payload.end_date) delete payload.end_date;

            const res = await authFetch(`${API_URL}/sanctions/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error();
            
            const created = await res.json();
            
            // Automatically approve direct admin sanctions (since admin created it)
            await authFetch(`${API_URL}/sanctions/${created.id}/approve`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ approved: true })
            });

            setIsModalOpen(false);
            fetchAll();
            showBanner(t('sanctions.successApprove'));
        } catch {
            showBanner(t('ui.saveError'), false);
        }
    };

    const triggerAction = (type, sanction) => {
        setConfirmAction({ isOpen: true, type, sanction });
    };

    const handleConfirmAction = async () => {
        const { type, sanction } = confirmAction;
        setConfirmAction({ isOpen: false, type: null, sanction: null });
        setIsLoading(true);

        try {
            if (type === 'approve') {
                const res = await authFetch(`${API_URL}/sanctions/${sanction.id}/approve`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ approved: true })
                });
                if (res.ok) {
                    showBanner(t('sanctions.successApprove'));
                } else {
                    throw new Error();
                }
            } else if (type === 'reject') {
                const res = await authFetch(`${API_URL}/sanctions/${sanction.id}/approve`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ approved: false })
                });
                if (res.ok) {
                    showBanner(t('sanctions.successReject'));
                } else {
                    throw new Error();
                }
            } else if (type === 'cancel') {
                const res = await authFetch(`${API_URL}/sanctions/${sanction.id}/cancel`, {
                    method: 'PATCH'
                });
                if (res.ok) {
                    showBanner(t('sanctions.successCancel'));
                } else {
                    throw new Error();
                }
            }
            fetchAll();
        } catch {
            showBanner(t('ui.loadError'), false);
            setIsLoading(false);
        }
    };

    // Filters
    const pendingSanctions = sanctions.filter(s => s.status === 'Pending Approval');
    const processedSanctions = sanctions.filter(s => s.status !== 'Pending Approval');

    const filteredList = (activeTab === 'inbox' ? pendingSanctions : sanctions).filter(s =>
        s.player_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.reason?.toLowerCase().includes(search.toLowerCase()) ||
        s.coach_name?.toLowerCase().includes(search.toLowerCase())
    );

    // KPI Metrics calculation
    const activeSanctionsCount = sanctions.filter(s => s.status === 'Approved').length;
    const suspendedPlayersCount = sanctions.filter(s => s.status === 'Approved' && s.sanction_type === 'Suspension').length;
    const totalFines = sanctions.filter(s => s.status === 'Approved' && s.sanction_type === 'Fine').reduce((sum, s) => sum + (s.amount || 0), 0);

    const getSanctionBadge = (type) => {
        const arLabels = {
            'Warning': 'إنذار',
            'Suspension': 'توقيف',
            'Fine': 'غرامة مالية',
            'Match_Ban': 'حرمان مباريات'
        };
        const enLabels = {
            'Warning': 'Warning',
            'Suspension': 'Suspension',
            'Fine': 'Fine',
            'Match_Ban': 'Match Ban'
        };
        const label = isRTL ? arLabels[type] : enLabels[type];

        switch (type) {
            case 'Warning':
                return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">⚠️ {label}</span>;
            case 'Suspension':
                return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-200">🚫 {label}</span>;
            case 'Fine':
                return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">💰 {label}</span>;
            case 'Match_Ban':
                return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">⚽ {label}</span>;
            default:
                return <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase bg-slate-100 text-slate-800">{label}</span>;
        }
    };

    const getStatusBadge = (status) => {
        const arStatus = {
            'Pending Approval': 'قيد المراجعة',
            'Approved': 'نشطة / معتمدة',
            'Rejected': 'مرفوضة',
            'Cancelled': 'ملغاة / مرفوعة'
        };
        const enStatus = {
            'Pending Approval': 'Pending Approval',
            'Approved': 'Approved',
            'Rejected': 'Rejected',
            'Cancelled': 'Cancelled'
        };
        const label = isRTL ? arStatus[status] : enStatus[status];

        switch (status) {
            case 'Pending Approval':
                return <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-amber-50 text-amber-600 border border-amber-100 animate-pulse">{label}</span>;
            case 'Approved':
                return <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">{label}</span>;
            case 'Rejected':
                return <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-rose-50 text-rose-600 border border-rose-100">{label}</span>;
            case 'Cancelled':
                return <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-slate-50 text-slate-500 border border-slate-200">{label}</span>;
            default:
                return <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-600">{label}</span>;
        }
    };

    return (
        <div className={`animate-fade-in pb-10 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h2 className={`text-4xl font-black text-slate-800 tracking-tight flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 bg-gradient-to-tr from-red-600 to-rose-500 text-white rounded-2xl shadow-lg shadow-red-600/30">
                            <AlertTriangle size={32} className="animate-bounce" />
                        </div>
                        {t('sanctions.title')}
                    </h2>
                    <p className="text-slate-400 font-bold mt-2 tracking-widest text-sm uppercase">{t('sanctions.subtitle')}</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-3 bg-gradient-to-r from-red-600 to-rose-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-red-500/20 active:scale-95 transition-all">
                    <Plus size={20} /> {t('sanctions.directIssue')}
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: t('sanctions.pendingApproval'), val: pendingSanctions.length, color: 'amber', icon: Inbox },
                    { label: t('sanctions.activeSanctions'), val: activeSanctionsCount, color: 'rose', icon: AlertTriangle },
                    { label: t('sanctions.suspendedCount'), val: suspendedPlayersCount, color: 'red', icon: Ban },
                    { label: t('sanctions.finesTotal'), val: `${totalFines} MAD`, color: 'emerald', icon: DollarSign },
                ].map((c, i) => {
                    const Icon = c.icon;
                    return (
                        <div key={i} className={`bg-${c.color}-50 border border-${c.color}-100 rounded-[2rem] p-6 premium-shadow relative overflow-hidden flex flex-col justify-between`}>
                            <div className="flex justify-between items-start">
                                <div className={`text-3xl font-black text-${c.color}-700 mb-1`}>{c.val}</div>
                                <Icon size={24} className={`text-${c.color}-300 shrink-0`} />
                            </div>
                            <div className={`text-[10px] font-black uppercase tracking-widest text-${c.color}-600/70 mt-4`}>{c.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Search & Tabs */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                {/* Tabs */}
                <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 shrink-0">
                    <button
                        onClick={() => setActiveTab('inbox')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all tracking-wider ${activeTab === 'inbox' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Inbox size={14} />
                        {t('sanctions.pendingApproval')}
                        {pendingSanctions.length > 0 && (
                            <span className="bg-red-500 text-white font-black text-[9px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse">{pendingSanctions.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('registry')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all tracking-wider ${activeTab === 'registry' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <FileText size={14} />
                        {t('sidebar.sanctions')}
                    </button>
                </div>

                {/* Search */}
                <div className="relative w-full max-w-md">
                    <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={18} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('sanctions.searchPlaceholder')}
                        className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none shadow-sm transition-all focus:border-red-400`}
                    />
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
                </div>
            ) : filteredList.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-[2rem] border border-slate-200 premium-shadow text-slate-300 font-black uppercase tracking-widest">
                    {t('sanctions.noSanctions')}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredList.map(s => (
                        <div key={s.id} className="bg-white rounded-[2rem] border border-slate-200 premium-shadow hover:border-red-200 transition-all overflow-hidden group p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
                            {/* Accent stripe for active suspensions */}
                            {s.status === 'Approved' && s.sanction_type === 'Suspension' && (
                                <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-red-600" />
                            )}
                            {s.status === 'Approved' && s.sanction_type === 'Fine' && (
                                <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-emerald-600" />
                            )}

                            {/* Left part: Roster player details */}
                            <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 ${
                                    s.sanction_type === 'Suspension' ? 'bg-red-50 text-red-600 border border-red-100' :
                                    s.sanction_type === 'Fine' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                    s.sanction_type === 'Warning' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                    'bg-rose-50 text-rose-600 border border-rose-100'
                                }`}>
                                    {s.player_name?.[0] || '?'}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-black text-slate-900 text-lg leading-none">{s.player_name}</h3>
                                        {getSanctionBadge(s.sanction_type)}
                                        {getStatusBadge(s.status)}
                                    </div>
                                    <p className="text-slate-500 font-medium text-xs py-1 leading-relaxed">
                                        <strong className="text-slate-700">{t('sanctions.reason')}:</strong> {s.reason}
                                    </p>
                                    {s.report_text && (
                                        <p className="text-slate-400 font-medium text-[11px] italic bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                            {s.report_text}
                                        </p>
                                    )}
                                    <div className="flex gap-4 text-[10px] text-slate-400 font-bold flex-wrap pt-1">
                                        <span>📅 {t('sanctions.date')}: {formatDate(s.created_at)}</span>
                                        {s.end_date && <span className="text-red-500 font-extrabold">🚨 {t('sanctions.endDate')}: {formatDate(s.end_date)}</span>}
                                        {s.amount > 0 && <span className="text-emerald-600 font-extrabold">💸 {t('sanctions.amount')}: {s.amount} MAD</span>}
                                        {s.coach_name && <span>👤 {t('sanctions.reportedBy')}: {s.coach_name}</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Right part: Actions */}
                            <div className="flex gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0">
                                {s.status === 'Pending Approval' && (
                                    <>
                                        <button
                                            onClick={() => triggerAction('approve', s)}
                                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-500/10 transition-all active:scale-95"
                                        >
                                            <CheckCircle size={14} />
                                            {t('sanctions.approve')}
                                        </button>
                                        <button
                                            onClick={() => triggerAction('reject', s)}
                                            className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
                                        >
                                            <X size={14} />
                                            {t('sanctions.reject')}
                                        </button>
                                    </>
                                )}

                                {s.status === 'Approved' && (
                                    <button
                                        onClick={() => triggerAction('cancel', s)}
                                        className="flex items-center gap-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 border border-slate-200 hover:border-red-200"
                                    >
                                        <UserCheck size={14} />
                                        {t('sanctions.cancel')}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Issue Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in" dir="rtl">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg premium-shadow border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-red-100 bg-red-50 flex justify-between items-center flex-row-reverse shrink-0">
                            <h3 className="font-black text-red-900 text-xl flex items-center gap-3">
                                <AlertTriangle size={22} className="text-red-600 shrink-0" />
                                {t('sanctions.issueSanction')}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-red-300 hover:bg-white rounded-full transition-colors"><X size={20}/></button>
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
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">نوع العقوبة *</label>
                                    <select required value={form.sanction_type} onChange={e => setForm({...form, sanction_type: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none cursor-pointer appearance-none text-right">
                                        {SANCTION_TYPES.map(t => (
                                            <option key={t} value={t}>
                                                {t === 'Warning' ? 'إنذار (Warning)' :
                                                 t === 'Suspension' ? 'توقيف (Suspension)' :
                                                 t === 'Fine' ? 'غرامة مالية (Fine)' :
                                                 'حرمان مباريات (Match Ban)'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">تاريخ الانتهاء / الأجل</label>
                                    <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none"/>
                                </div>
                            </div>

                            {form.sanction_type === 'Fine' && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">مبلغ الغرامة (درهم) *</label>
                                    <input required type="number" min="0" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full px-5 py-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-sm font-bold outline-none text-right" placeholder="مثلا: 100..."/>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">السبب / المخالفة السلوكية *</label>
                                <input required value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-right" placeholder="مثال: الغياب المتكرر، الشجار، سوء السلوك مع المدرب..."/>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">تفاصيل إضافية / تقرير تفصيلي</label>
                                <textarea rows="3" value={form.report_text} onChange={e => setForm({...form, report_text: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none resize-none text-right" placeholder="شرح تفصيلي للمخالفة لدعم القرار..."/>
                            </div>

                            <div className="flex gap-4 pt-4 flex-row-reverse">
                                <button type="submit" className="flex-1 py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 transition-all">
                                    {t('sanctions.approve')}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-[11px] font-black uppercase text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">
                                    {t('common.cancel')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmAction.isOpen}
                onConfirm={handleConfirmAction}
                onCancel={() => setConfirmAction({ isOpen: false, type: null, sanction: null })}
                isRTL={isRTL}
                title={
                    confirmAction.type === 'approve' ? t('sanctions.approve') :
                    confirmAction.type === 'reject' ? t('sanctions.reject') :
                    t('sanctions.cancel')
                }
                message={
                    confirmAction.type === 'approve' ? 'هل أنت متأكد من اعتماد وتطبيق هذه العقوبة الانضباطية؟' :
                    confirmAction.type === 'reject' ? 'هل أنت متأكد من رفض طلب العقوبة هذا؟' :
                    'هل أنت متأكد من إلغاء/رفع هذه العقوبة الانضباطية وإعادة تفعيل حساب اللاعب؟'
                }
            />
        </div>
    );
};

export default SanctionsManagement;
