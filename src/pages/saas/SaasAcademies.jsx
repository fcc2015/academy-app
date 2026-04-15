import { useState, useEffect, useMemo } from 'react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import {
    Loader2, Plus, Ban, CheckCircle2, X, Pencil, Save,
    MapPin, SlidersHorizontal, Building2, ChevronRight, Users
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
    const [academies, setAcademies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '', subdomain: '', city: '', notes: '',
        admin_name: '', admin_email: '', admin_password: ''
    });
    const [createError, setCreateError] = useState('');

    // Edit modal
    const [editAcademy, setEditAcademy] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Filter
    const [cityFilter, setCityFilter] = useState('All');

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
        if (cityFilter === 'All') return academies;
        return academies.filter(a => cityOf(a) === cityFilter);
    }, [academies, cityFilter]);

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
                setShowCreate(false);
                setCreateForm({ name: '', subdomain: '', city: '', notes: '', admin_name: '', admin_email: '', admin_password: '' });
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

    // ── Edit ──
    const openEdit = (acc) => {
        setEditAcademy(acc);
        setEditForm({
            name: acc.name || '',
            city: acc.city || '',
            notes: acc.notes || '',
            primary_color: acc.primary_color || '',
            status: acc.status || 'active',
        });
        setSaveError('');
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

    const cityColors = (city) => CITY_COLORS[city] || CITY_COLORS.Other;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="page-title">Academies Management</h2>
                    <p className="page-subtitle">Gradual rollout by city — Casablanca → Rabat → Tanger → ...</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn btn-brand">
                    <Plus size={16} /> Add Academy
                </button>
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

            {/* ── Table ── */}
            {loading ? (
                <div className="py-20 text-center text-emerald-500"><Loader2 className="w-8 h-8 mx-auto animate-spin" /></div>
            ) : (
                <div className="table-container">
                    <table className="table-premium w-full text-left">
                        <thead>
                            <tr>
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
                                        <tr key={acc.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-sm"
                                                        style={{ background: acc.primary_color || '#6366f1' }}>
                                                        {(acc.name || 'A').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-surface-900 text-sm">{acc.name || 'Unnamed'}</p>
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
                                                <span className={`text-xs font-bold uppercase px-2 py-1 rounded-lg ${
                                                    acc.plan_id === 'pro' ? 'bg-blue-50 text-blue-700' :
                                                    acc.plan_id === 'enterprise' ? 'bg-violet-50 text-violet-700' :
                                                    'bg-surface-100 text-surface-500'
                                                }`}>
                                                    {acc.plan_id || 'free'}
                                                </span>
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
                                                <div className="flex items-center gap-2 justify-end">
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
                    <div className="modal-content">
                        <div className="flex justify-between items-center p-6 border-b border-surface-200">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-surface-600" />
                                <h3 className="text-lg font-semibold text-surface-900">Provision New Academy</h3>
                            </div>
                            <button onClick={() => setShowCreate(false)} className="text-surface-400 hover:text-surface-900">
                                <X size={22} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
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
        </div>
    );
}
