import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import {
    Loader2, Plus, Ban, CheckCircle2, X, Pencil, Save,
    MapPin, SlidersHorizontal, Building2, ChevronRight, Users, Search,
    Trash2, Download, Check, LogIn, KeyRound, Copy, ExternalLink, CheckCircle, Mail, Lock, Globe
} from 'lucide-react';

// Moroccan cities for rollout pipeline
const ROLLOUT_CITIES = ['Casablanca', 'Rabat', 'Tanger', 'Fes', 'Marrakech', 'Agadir', 'Other'];

const CITY_COLORS = {
    Casablanca: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    Rabat:      { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
    Tanger:     { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    Fes:        { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
    Marrakech:  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
    Agadir:     { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
    Other:      { bg: 'bg-surface-50', text: 'text-surface-600', border: 'border-surface-200', dot: 'bg-surface-400' },
};

function cityOf(acc) {
    const c = acc.city || '';
    if (!c) return 'Other';
    const match = ROLLOUT_CITIES.find(r => r.toLowerCase() === c.toLowerCase());
    return match || 'Other';
}

export default function SaasAcademies() {
    const navigate = useNavigate();
    const [academies, setAcademies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [impersonatingId, setImpersonatingId] = useState(null);

    const handleImpersonate = async (acc) => {
        setImpersonatingId(acc.id);
        try {
            const res = await authFetch(`${API_URL}/saas/impersonate/${acc.id}`, { method: 'POST' });
            if (res.ok) {
                localStorage.setItem('impersonating_academy_id', acc.id);
                localStorage.setItem('impersonating_academy_name', acc.name || '');
                navigate('/admin/dashboard');
                return;
            }
            alert('Failed to start impersonation.');
        } catch {
            alert('Network error.');
        } finally {
            setImpersonatingId(null);
        }
    };

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '', subdomain: '', city: '', notes: '', plan_id: 'free',
        admin_name: '', admin_email: '', admin_password: ''
    });
    const [createError, setCreateError] = useState('');

    // Edit modal
    const [editAcademy, setEditAcademy] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Provisioned credentials (shown after successful create)
    const [provisioned, setProvisioned] = useState(null); // { name, subdomain, login_url, admin_email, admin_password }
    const [copiedField, setCopiedField] = useState('');

    // Plan change modal
    const [planTarget, setPlanTarget] = useState(null);
    const [planValue, setPlanValue] = useState('free');
    const [planSaving, setPlanSaving] = useState(false);
    const [planError, setPlanError] = useState('');

    // Filter
    const [cityFilter, setCityFilter] = useState('All');
    const [search, setSearch] = useState('');

    // Bulk selection
    const [selected, setSelected] = useState(new Set());

    // Logo upload
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Delete
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Reset password
    const [resetTarget, setResetTarget] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetting, setResetting] = useState(false);
    const [resetError, setResetError] = useState('');
    const [resetSuccess, setResetSuccess] = useState('');

    const fetchAcademies = async () => {
        try {
            const res = await authFetch(`${API_URL}/saas/academies`);
            if (res.ok) setAcademies(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAcademies(); }, []);

    // Rollout stats per city
    const rolloutStats = useMemo(() => {
        return ROLLOUT_CITIES.map(city => {
            const list = academies.filter(a => cityOf(a) === city);
            const active = list.filter(a => a.status !== 'suspended').length;
            return { city, total: list.length, active };
        });
    }, [academies]);

    // Filtered academies
    const filtered = useMemo(() => {
        let list = cityFilter === 'All' ? academies : academies.filter(a => cityOf(a) === cityFilter);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(a =>
                (a.name || '').toLowerCase().includes(q) ||
                (a.subdomain || '').toLowerCase().includes(q) ||
                (a.custom_domain || '').toLowerCase().includes(q) ||
                (a.notes || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [academies, cityFilter, search]);

    // ── Create ──
    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateError('');
        setCreating(true);
        try {
            const res = await authFetch(`${API_URL}/saas/academies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm),
            });
            const data = await res.json();
            if (res.ok) {
                // Build login URL — if a subdomain is set, hint it via query string
                const origin = window.location.origin;
                const sub = createForm.subdomain || '';
                const login_url = sub
                    ? `${origin}/login?academy=${encodeURIComponent(sub)}`
                    : `${origin}/login`;
                setProvisioned({
                    name: createForm.name,
                    subdomain: sub,
                    login_url,
                    admin_email: createForm.admin_email,
                    admin_password: createForm.admin_password,
                    plan_id: createForm.plan_id,
                });
                fetchAcademies();
            } else {
                setCreateError(data.detail || 'Failed to create academy.');
            }
        } catch {
            setCreateError('Network error.');
        } finally {
            setCreating(false);
        }
    };

    // ── Copy helper for provisioned credentials ──
    const copyToClipboard = async (text, field) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(''), 1500);
        } catch { /* no-op */ }
    };

    const closeProvisioned = () => {
        setProvisioned(null);
        setShowCreate(false);
        setCreateForm({ name: '', subdomain: '', city: '', notes: '', plan_id: 'free', admin_name: '', admin_email: '', admin_password: '' });
    };

    // ── Plan change ──
    const openPlanChange = (acc) => {
        setPlanTarget(acc);
        setPlanValue(acc.plan_id || 'free');
        setPlanError('');
    };

    const handlePlanChange = async (e) => {
        e.preventDefault();
        if (!planTarget) return;
        setPlanError('');
        setPlanSaving(true);
        try {
            const res = await authFetch(
                `${API_URL}/saas/academies/${planTarget.id}/plan`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plan_id: planValue }),
                }
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.detail || 'Failed to change plan');
            }
            setPlanTarget(null);
            fetchAcademies();
        } catch (err) {
            setPlanError(err.message || 'Network error.');
        } finally {
            setPlanSaving(false);
        }
    };

    // ── Edit ──
    const openEdit = (acc) => {
        setEditAcademy(acc);
        setEditForm({
            name: acc.name || '',
            city: acc.city || '',
            notes: acc.notes || '',
            primary_color: acc.primary_color || '',
            logo_url: acc.logo_url || '',
            status: acc.status || 'active',
        });
        setSaveError('');
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !editAcademy) return;
        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await authFetch(`${API_URL}/saas/academies/${editAcademy.id}/logo`, {
                method: 'POST',
                body: formData,
            });
            if (res.ok) {
                const data = await res.json();
                setEditForm(f => ({ ...f, logo_url: data.logo_url }));
                setAcademies(prev => prev.map(a => a.id === editAcademy.id ? { ...a, logo_url: data.logo_url } : a));
            }
        } catch (err) {
            console.error('Logo upload failed:', err);
        } finally {
            setUploadingLogo(false);
            e.target.value = '';
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveError('');
        try {
            const res = await authFetch(`${API_URL}/saas/academies/${editAcademy.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            const data = await res.json();
            if (res.ok) {
                setAcademies(prev => prev.map(a => a.id === editAcademy.id ? { ...a, ...editForm } : a));
                setEditAcademy(null);
            } else {
                setSaveError(data.detail || 'Failed to save.');
            }
        } catch {
            setSaveError('Network error.');
        } finally {
            setSaving(false);
        }
    };

    // ── Suspend / Activate ──
    const toggleStatus = async (id, currentStatus) => {
        setActionLoading(id);
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            const res = await authFetch(`${API_URL}/saas/academies/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) setAcademies(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
        } finally {
            setActionLoading(null);
        }
    };

    // ── Delete ──
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await authFetch(`${API_URL}/saas/academies/${deleteTarget.id}`, { method: 'DELETE' });
            if (res.ok) {
                setAcademies(prev => prev.filter(a => a.id !== deleteTarget.id));
                setSelected(prev => { const s = new Set(prev); s.delete(deleteTarget.id); return s; });
            }
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    // ── Bulk action ──
    const handleBulk = async (newStatus) => {
        if (selected.size === 0) return;
        setActionLoading('bulk');
        try {
            const res = await authFetch(`${API_URL}/saas/academies-bulk/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ academy_ids: [...selected], status: newStatus }),
            });
            if (res.ok) {
                setAcademies(prev => prev.map(a => selected.has(a.id) ? { ...a, status: newStatus } : a));
                setSelected(new Set());
            }
        } finally {
            setActionLoading(null);
        }
    };

    // ── Export CSV ──
    const exportCSV = () => {
        const rows = [['Name', 'City', 'Plan', 'Status', 'Players', 'Coaches', 'Admins', 'Created']];
        filtered.forEach(a => {
            rows.push([
                a.name || '', a.city || '', a.plan_id || 'free', a.status || 'active',
                a.players_count || 0, a.coaches_count || 0, a.admins_count || 0,
                a.created_at ? new Date(a.created_at).toLocaleDateString() : ''
            ]);
        });
        const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `academies_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // ── Reset Password ──
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!resetTarget) return;
        setResetError(''); setResetSuccess(''); setResetting(true);
        try {
            const res = await authFetch(`${API_URL}/saas/academies/${resetTarget.id}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_password: newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setResetSuccess(data.message || 'تم تحديث كلمة المرور بنجاح');
                setNewPassword('');
            } else {
                setResetError(data.detail || 'فشل تحديث كلمة المرور');
            }
        } catch {
            setResetError('خطأ في الاتصال بالخادم');
        } finally {
            setResetting(false);
        }
    };

    // ── Toggle selection ──
    const toggleSelect = (id) => {
        setSelected(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };
    const toggleAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map(a => a.id)));
        }
    };

    const cityColors = (city) => CITY_COLORS[city] || CITY_COLORS.Other;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-end gap-4">
                <div>
                    <h2 className="page-title">Academies Management</h2>
                    <p className="page-subtitle">Gradual rollout by city — Casablanca → Rabat → Tanger → ...</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search academies..."
                            className="input pl-9 w-56 text-sm"
                        />
                    </div>
                    <button onClick={exportCSV} className="btn btn-secondary" title="Export CSV">
                        <Download size={16} /> Export
                    </button>
                    <button onClick={() => setShowCreate(true)} className="btn btn-brand">
                        <Plus size={16} /> Add Academy
                    </button>
                </div>
            </div>

            {/* ── Rollout Pipeline ── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <SlidersHorizontal className="w-4 h-4 text-surface-500" />
                    <h3 className="text-sm font-bold text-surface-700 uppercase tracking-wider">Rollout Pipeline</h3>
                </div>
                <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
                    {rolloutStats.filter(s => s.total > 0 || ROLLOUT_CITIES.indexOf(s.city) < 3).map((s, i) => {
                        const c = cityColors(s.city);
                        const isActive = s.total > 0;
                        return (
                            <div key={s.city} className="flex items-center">
                                <button
                                    onClick={() => setCityFilter(cityFilter === s.city ? 'All' : s.city)}
                                    className={`flex flex-col items-center px-5 py-3 rounded-xl border transition-all min-w-[110px] ${
                                        cityFilter === s.city
                                            ? `${c.bg} ${c.border} border-2 shadow-md`
                                            : isActive
                                                ? `bg-white border-surface-200 hover:${c.bg} hover:${c.border}`
                                                : 'bg-surface-50 border-surface-100 opacity-50'
                                    }`}
                                >
                                    <div className={`w-2.5 h-2.5 rounded-full mb-1.5 ${isActive ? c.dot : 'bg-surface-300'}`} />
                                    <span className={`text-xs font-bold ${isActive ? c.text : 'text-surface-400'}`}>{s.city}</span>
                                    <span className="text-[10px] text-surface-400 mt-0.5">{s.active} active</span>
                                </button>
                                {i < rolloutStats.filter(s2 => s2.total > 0 || ROLLOUT_CITIES.indexOf(s2.city) < 3).length - 1 && (
                                    <ChevronRight className="w-4 h-4 text-surface-300 mx-1 shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── City Filter Tabs ── */}
            <div className="flex gap-2 flex-wrap">
                {['All', ...ROLLOUT_CITIES.filter(c => academies.some(a => cityOf(a) === c))].map(city => {
                    const count = city === 'All' ? academies.length : academies.filter(a => cityOf(a) === city).length;
                    const c = city === 'All' ? null : cityColors(city);
                    return (
                        <button
                            key={city}
                            onClick={() => setCityFilter(city)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                cityFilter === city
                                    ? city === 'All'
                                        ? 'bg-surface-900 text-white border-surface-900'
                                        : `${c.bg} ${c.text} ${c.border} border-2`
                                    : 'bg-white text-surface-500 border-surface-200 hover:bg-surface-50'
                            }`}
                        >
                            {city} <span className="ml-1 opacity-70">{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Bulk Action Bar ── */}
            {selected.size > 0 && (
                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 animate-fade-in">
                    <span className="text-sm font-bold text-indigo-700">{selected.size} selected</span>
                    <div className="flex-1" />
                    <button
                        onClick={() => handleBulk('active')}
                        disabled={actionLoading === 'bulk'}
                        className="btn text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Activate All
                    </button>
                    <button
                        onClick={() => handleBulk('suspended')}
                        disabled={actionLoading === 'bulk'}
                        className="btn text-xs px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                    >
                        <Ban className="w-3.5 h-3.5" /> Suspend All
                    </button>
                    <button
                        onClick={() => setSelected(new Set())}
                        className="btn text-xs px-3 py-1.5 bg-surface-100 text-surface-600 border border-surface-200 hover:bg-surface-200"
                    >
                        <X className="w-3.5 h-3.5" /> Clear
                    </button>
                </div>
            )}

            {/* ── Table ── */}
            {loading ? (
                <div className="py-20 text-center text-emerald-500"><Loader2 className="w-8 h-8 mx-auto animate-spin" /></div>
            ) : (
                <div className="table-container">
                    <table className="table-premium w-full text-left">
                        <thead>
                            <tr>
                                <th className="w-10">
                                    <button onClick={toggleAll} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                        selected.size === filtered.length && filtered.length > 0
                                            ? 'bg-indigo-500 border-indigo-500 text-white'
                                            : 'border-surface-300 hover:border-surface-400'
                                    }`}>
                                        {selected.size === filtered.length && filtered.length > 0 && <Check className="w-3 h-3" />}
                                    </button>
                                </th>
                                <th>Academy</th>
                                <th>City</th>
                                <th>Plan</th>
                                <th>Usage</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-8 text-surface-400">No academies found.</td></tr>
                            ) : (
                                filtered.map(acc => {
                                    const city = cityOf(acc);
                                    const c = cityColors(city);
                                    return (
                                        <tr key={acc.id} className={selected.has(acc.id) ? 'bg-indigo-50/50' : ''}>
                                            <td>
                                                <button onClick={() => toggleSelect(acc.id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                                    selected.has(acc.id)
                                                        ? 'bg-indigo-500 border-indigo-500 text-white'
                                                        : 'border-surface-300 hover:border-surface-400'
                                                }`}>
                                                    {selected.has(acc.id) && <Check className="w-3 h-3" />}
                                                </button>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    {acc.logo_url ? (
                                                        <img src={acc.logo_url} alt={acc.name} className="w-9 h-9 rounded-xl object-cover shadow-sm border border-surface-100" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-sm"
                                                            style={{ background: acc.primary_color || '#6366f1' }}>
                                                            {(acc.name || 'A').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <Link to={`/saas/academies/${acc.id}`} className="font-semibold text-surface-900 text-sm hover:text-indigo-600 transition-colors">{acc.name || 'Unnamed'}</Link>
                                                        {acc.notes && <p className="text-[10px] text-surface-400 truncate max-w-[160px]">{acc.notes}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {city !== 'Other' ? (
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${c.bg} ${c.text} ${c.border}`}>
                                                        <MapPin className="w-3 h-3" /> {city}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-surface-400">—</span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    onClick={() => openPlanChange(acc)}
                                                    title="Click to change plan"
                                                    className={`text-xs font-bold uppercase px-2 py-1 rounded-lg cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all ${
                                                        acc.plan_id === 'pro' ? 'bg-blue-50 text-blue-700 hover:ring-blue-300' :
                                                        acc.plan_id === 'enterprise' ? 'bg-violet-50 text-violet-700 hover:ring-violet-300' :
                                                        'bg-surface-100 text-surface-500 hover:ring-surface-300'
                                                    }`}
                                                >
                                                    {acc.plan_id || 'free'}
                                                </button>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 text-[11px] text-surface-500 font-medium">
                                                    <Users className="w-3 h-3" /> {acc.players_count || 0}
                                                    {acc.plan_limits?.players > 0 && (
                                                        <span className="text-surface-300">/ {acc.plan_limits.players}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                {acc.status === 'suspended' ? (
                                                    <span className="badge badge-suspended flex items-center gap-1 w-max">
                                                        <Ban className="w-3 h-3" /> Suspended
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-active flex items-center gap-1 w-max">
                                                        <CheckCircle2 className="w-3 h-3" /> Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-xs text-surface-400">
                                                {new Date(acc.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="text-right">
                                                <div className="flex items-center gap-1.5 justify-end">
                                                    <button
                                                        onClick={() => handleImpersonate(acc)}
                                                        disabled={impersonatingId === acc.id}
                                                        className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50"
                                                        title="Login as this academy's admin"
                                                    >
                                                        {impersonatingId === acc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <button
                                                        onClick={() => { setResetTarget(acc); setNewPassword(''); setResetError(''); setResetSuccess(''); }}
                                                        className="p-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200 transition-colors"
                                                        title="إعادة تعيين كلمة المرور"
                                                    >
                                                        <KeyRound className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(acc)}
                                                        className="p-1.5 rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 border border-surface-200 transition-colors"
                                                        title="Edit academy"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleStatus(acc.id, acc.status || 'active')}
                                                        disabled={actionLoading === acc.id}
                                                        className={`btn text-xs px-3 py-1.5 ${
                                                            acc.status === 'suspended'
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                                : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                                                        }`}
                                                    >
                                                        {actionLoading === acc.id
                                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            : acc.status === 'suspended' ? 'Activate' : 'Suspend'}
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteTarget(acc)}
                                                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-colors"
                                                        title="Delete academy"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Edit Modal ── */}
            {editAcademy && (
                <div className="modal-backdrop">
                    <div className="modal-content max-w-lg">
                        <div className="flex justify-between items-center p-6 border-b border-surface-200">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white"
                                    style={{ background: editAcademy.primary_color || '#6366f1' }}>
                                    {(editAcademy.name || 'A').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-surface-900">Edit Academy</h3>
                                    <p className="text-xs text-surface-400">#{editAcademy.id?.slice(0, 8)}</p>
                                </div>
                            </div>
                            <button onClick={() => setEditAcademy(null)} className="text-surface-400 hover:text-surface-900">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {saveError && (
                                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">{saveError}</div>
                            )}
                            {/* Logo Upload */}
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Logo</label>
                                <div className="flex items-center gap-4">
                                    {editForm.logo_url ? (
                                        <img src={editForm.logo_url} alt="logo" className="w-16 h-16 rounded-2xl object-cover border border-surface-200 shadow-sm" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-sm"
                                            style={{ background: editForm.primary_color || '#6366f1' }}>
                                            {(editForm.name || 'A').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <label className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors text-sm font-semibold
                                            ${uploadingLogo ? 'border-surface-200 text-surface-300' : 'border-surface-300 text-surface-600 hover:border-indigo-400 hover:text-indigo-600'}`}>
                                            {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                                            {uploadingLogo ? 'Uploading...' : editForm.logo_url ? 'Change Logo' : 'Upload Logo'}
                                            <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden"
                                                disabled={uploadingLogo} onChange={handleLogoUpload} />
                                        </label>
                                        <p className="text-[10px] text-surface-400 mt-1">JPEG, PNG, WebP or SVG · Max 2MB</p>
                                    </div>
                                    {editForm.logo_url && (
                                        <button type="button"
                                            onClick={() => setEditForm(f => ({ ...f, logo_url: '' }))}
                                            className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            title="Remove logo">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Academy Name</label>
                                <input
                                    className="input"
                                    value={editForm.name}
                                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Academy name"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> City / Region
                                </label>
                                <select
                                    className="input"
                                    value={editForm.city}
                                    onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                                >
                                    <option value="">— Select city —</option>
                                    {ROLLOUT_CITIES.filter(c => c !== 'Other').map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Brand Color</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        className="w-10 h-10 rounded-lg border border-surface-200 cursor-pointer"
                                        value={editForm.primary_color || '#6366f1'}
                                        onChange={e => setEditForm(f => ({ ...f, primary_color: e.target.value }))}
                                    />
                                    <input
                                        className="input flex-1"
                                        value={editForm.primary_color}
                                        onChange={e => setEditForm(f => ({ ...f, primary_color: e.target.value }))}
                                        placeholder="#6366f1"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Status</label>
                                <select
                                    className="input"
                                    value={editForm.status}
                                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                                >
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Notes</label>
                                <textarea
                                    className="input h-20 resize-none"
                                    value={editForm.notes}
                                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Internal notes about this academy..."
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-surface-100 flex gap-3 justify-end">
                            <button onClick={() => setEditAcademy(null)} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="btn btn-brand w-[120px] justify-center">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Create Modal ── */}
            {showCreate && (
                <div className="modal-backdrop">
                    <div className="modal-content max-w-xl flex flex-col" style={{ maxHeight: '90vh' }}>
                        <div className="flex justify-between items-center p-6 border-b border-surface-200 shrink-0">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-surface-600" />
                                <h3 className="text-lg font-semibold text-surface-900">Provision New Academy</h3>
                            </div>
                            <button onClick={() => setShowCreate(false)} className="text-surface-400 hover:text-surface-900">
                                <X size={22} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">
                            {createError && (
                                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">{createError}</div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Academy Name *</label>
                                    <input required className="input" name="name" value={createForm.name}
                                        onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="e.g., Elite Soccer Academy" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> City
                                    </label>
                                    <select className="input" value={createForm.city}
                                        onChange={e => setCreateForm(f => ({ ...f, city: e.target.value }))}>
                                        <option value="">— Select —</option>
                                        {ROLLOUT_CITIES.filter(c => c !== 'Other').map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Subdomain</label>
                                    <input className="input" value={createForm.subdomain}
                                        onChange={e => setCreateForm(f => ({ ...f, subdomain: e.target.value }))}
                                        placeholder="elite-soccer" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-surface-600 mb-2 uppercase tracking-wider">Plan *</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'free',       name: 'Free',       desc: '15 players · 1 admin',   gradient: 'from-slate-400 to-slate-600',     icon: '🆓' },
                                            { id: 'pro',        name: 'Pro',        desc: '100 players · 4 admins', gradient: 'from-blue-500 to-cyan-600',        icon: '⚡' },
                                            { id: 'enterprise', name: 'Enterprise', desc: 'Unlimited + 🏢 Branches', gradient: 'from-violet-500 to-purple-600',   icon: '👑' },
                                        ].map(p => {
                                            const selected = createForm.plan_id === p.id;
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => setCreateForm(f => ({ ...f, plan_id: p.id }))}
                                                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                                                        selected
                                                            ? `bg-gradient-to-br ${p.gradient} text-white border-transparent shadow-lg`
                                                            : 'bg-white border-surface-200 text-surface-700 hover:border-surface-300'
                                                    }`}
                                                >
                                                    <div className="text-xl mb-1">{p.icon}</div>
                                                    <div className="text-sm font-black uppercase tracking-wider">{p.name}</div>
                                                    <div className={`text-[10px] mt-1 ${selected ? 'text-white/90' : 'text-surface-500'}`}>{p.desc}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Notes</label>
                                    <input className="input" value={createForm.notes}
                                        onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                                        placeholder="Internal notes..." />
                                </div>
                            </div>

                            <div className="border-t border-surface-200 pt-4">
                                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-4">Initial Admin Account</p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Admin Full Name *</label>
                                        <input required className="input" value={createForm.admin_name}
                                            onChange={e => setCreateForm(f => ({ ...f, admin_name: e.target.value }))}
                                            placeholder="Jane Doe" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Admin Email *</label>
                                        <input required type="email" className="input" value={createForm.admin_email}
                                            onChange={e => setCreateForm(f => ({ ...f, admin_email: e.target.value }))}
                                            placeholder="jane@elite.com" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Admin Password *</label>
                                        <input required type="password" className="input" minLength="6" value={createForm.admin_password}
                                            onChange={e => setCreateForm(f => ({ ...f, admin_password: e.target.value }))}
                                            placeholder="Min. 6 characters" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" disabled={creating} className="btn btn-brand w-[140px] justify-center">
                                    {creating ? <Loader2 size={16} className="animate-spin" /> : 'Provision'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Provisioned Credentials Success Modal ── */}
            {provisioned && (
                <div className="modal-backdrop">
                    <div className="modal-content max-w-lg">
                        <div className="p-6 space-y-5">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-surface-900">Academy provisioned successfully</h3>
                                    <p className="text-xs text-surface-500 mt-0.5">{provisioned.name} — Plan: <span className="font-bold uppercase">{provisioned.plan_id}</span></p>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                                ⚠️ Save these credentials now — the password will not be shown again.
                            </div>

                            <div className="space-y-2.5">
                                {/* Login URL */}
                                <div className="bg-surface-50 border border-surface-200 rounded-xl p-3">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">
                                        <Globe className="w-3 h-3" /> Login URL
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-xs font-mono text-surface-900 break-all">{provisioned.login_url}</code>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(provisioned.login_url, 'url')}
                                            className="p-1.5 rounded-lg bg-white border border-surface-200 text-surface-600 hover:bg-surface-100"
                                            title="Copy"
                                        >
                                            {copiedField === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                        <a
                                            href={provisioned.login_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-1.5 rounded-lg bg-white border border-surface-200 text-surface-600 hover:bg-surface-100"
                                            title="Open"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                </div>

                                {/* Email */}
                                <div className="bg-surface-50 border border-surface-200 rounded-xl p-3">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">
                                        <Mail className="w-3 h-3" /> Admin Email
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-xs font-mono text-surface-900 break-all">{provisioned.admin_email}</code>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(provisioned.admin_email, 'email')}
                                            className="p-1.5 rounded-lg bg-white border border-surface-200 text-surface-600 hover:bg-surface-100"
                                            title="Copy"
                                        >
                                            {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="bg-surface-50 border border-surface-200 rounded-xl p-3">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">
                                        <Lock className="w-3 h-3" /> Admin Password
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-xs font-mono text-surface-900 break-all">{provisioned.admin_password}</code>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(provisioned.admin_password, 'password')}
                                            className="p-1.5 rounded-lg bg-white border border-surface-200 text-surface-600 hover:bg-surface-100"
                                            title="Copy"
                                        >
                                            {copiedField === 'password' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(
                                        `Login URL: ${provisioned.login_url}\nEmail: ${provisioned.admin_email}\nPassword: ${provisioned.admin_password}`,
                                        'all'
                                    )}
                                    className="btn btn-secondary"
                                >
                                    {copiedField === 'all' ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy all</>}
                                </button>
                                <button type="button" onClick={closeProvisioned} className="btn btn-brand">
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Plan Change Modal ── */}
            {planTarget && (
                <div className="modal-backdrop">
                    <div className="modal-content max-w-md">
                        <form onSubmit={handlePlanChange} className="p-6 space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-surface-900">Change Plan</h3>
                                    <p className="text-xs text-surface-500 mt-1">{planTarget.name}</p>
                                </div>
                                <button type="button" onClick={() => setPlanTarget(null)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-500">
                                    <X size={18} />
                                </button>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Plan</label>
                                <select className="input" value={planValue} onChange={e => setPlanValue(e.target.value)}>
                                    <option value="free">Free — 15 players, 1 admin, 1 coach</option>
                                    <option value="pro">Pro — 100 players, 4 admins, 10 coaches</option>
                                    <option value="enterprise">Enterprise — Unlimited + Branches</option>
                                </select>
                                <p className="text-[11px] text-surface-400 mt-2">
                                    Current: <span className="font-bold uppercase">{planTarget.plan_id || 'free'}</span>
                                </p>
                            </div>
                            {planError && (
                                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{planError}</div>
                            )}
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setPlanTarget(null)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" disabled={planSaving || planValue === (planTarget.plan_id || 'free')}
                                    className="btn btn-brand w-[120px] justify-center">
                                    {planSaving ? <Loader2 size={16} className="animate-spin" /> : 'Apply'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {deleteTarget && (
                <div className="modal-backdrop">
                    <div className="modal-content max-w-md">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-14 h-14 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto">
                                <Trash2 className="w-7 h-7" />
                            </div>
                            <h3 className="text-lg font-bold text-surface-900">Delete Academy?</h3>
                            <p className="text-sm text-surface-500">
                                This will <span className="font-bold text-red-600">permanently delete</span>{' '}
                                <span className="font-bold text-surface-900">{deleteTarget.name}</span>{' '}
                                and all its data (players, coaches, payments, squads).
                            </p>
                            <p className="text-xs text-surface-400">This action cannot be undone.</p>
                        </div>
                        <div className="p-4 border-t border-surface-100 flex gap-3 justify-center">
                            <button onClick={() => setDeleteTarget(null)} className="btn btn-secondary px-6">Cancel</button>
                            <button onClick={handleDelete} disabled={deleting}
                                className="btn px-6 bg-red-600 text-white hover:bg-red-700 border-0">
                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Reset Password Modal ── */}
            {resetTarget && (
                <div className="modal-backdrop">
                    <div className="modal-content max-w-md">
                        <form onSubmit={handleResetPassword} className="p-6 space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-surface-900">إعادة تعيين كلمة المرور</h3>
                                    <p className="text-xs text-surface-500 mt-1">{resetTarget.name}</p>
                                </div>
                                <button type="button" onClick={() => setResetTarget(null)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-500">
                                    <X size={18} />
                                </button>
                            </div>
                            {resetError && (
                                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{resetError}</div>
                            )}
                            {resetSuccess && (
                                <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {resetSuccess}
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">كلمة المرور الجديدة</label>
                                <input
                                    required
                                    type="password"
                                    className="input"
                                    minLength="6"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="6 أحرف على الأقل"
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setResetTarget(null)} className="btn btn-secondary">إلغاء</button>
                                <button type="submit" disabled={resetting || newPassword.length < 6}
                                    className="btn btn-brand w-[160px] justify-center">
                                    {resetting ? <Loader2 size={16} className="animate-spin" /> : <><KeyRound className="w-4 h-4" /> تحديث كلمة المرور</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
