import React from 'react';
import { Link } from 'react-router-dom';
import {
    Loader2, Ban, CheckCircle2, Pencil, MapPin, Users, Trash2, Check, LogIn, KeyRound
} from 'lucide-react';

export default function AcademiesTable({
    loading,
    filtered,
    selected,
    toggleSelect,
    toggleAll,
    cityOf,
    cityColors,
    openPlanChange,
    impersonatingId,
    handleImpersonate,
    setResetTarget,
    openEdit,
    toggleStatus,
    actionLoading,
    setDeleteTarget,
    setNewPassword,
    setResetError,
    setResetSuccess
}) {
    if (loading) {
        return (
            <div className="py-20 text-center text-emerald-500">
                <Loader2 className="w-8 h-8 mx-auto animate-spin" />
            </div>
        );
    }

    return (
        <div className="table-container">
            <table className="table-premium w-full text-left">
                <thead>
                    <tr>
                        <th className="w-10">
                            <button
                                type="button"
                                onClick={toggleAll}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                    selected.size === filtered.length && filtered.length > 0
                                        ? 'bg-indigo-500 border-indigo-500 text-white'
                                        : 'border-surface-300 hover:border-surface-400'
                                }`}
                            >
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
                        <tr>
                            <td colSpan="8" className="text-center py-8 text-surface-400">
                                No academies found.
                            </td>
                        </tr>
                    ) : (
                        filtered.map(acc => {
                            const city = cityOf(acc);
                            const c = cityColors(city);
                            return (
                                <tr key={acc.id} className={selected.has(acc.id) ? 'bg-indigo-50/50' : ''}>
                                    <td>
                                        <button
                                            type="button"
                                            onClick={() => toggleSelect(acc.id)}
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                                selected.has(acc.id)
                                                    ? 'bg-indigo-500 border-indigo-500 text-white'
                                                    : 'border-surface-300 hover:border-surface-400'
                                            }`}
                                        >
                                            {selected.has(acc.id) && <Check className="w-3 h-3" />}
                                        </button>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            {acc.logo_url ? (
                                                <img
                                                    src={acc.logo_url}
                                                    alt={acc.name}
                                                    className="w-9 h-9 rounded-xl object-cover shadow-sm border border-surface-100"
                                                />
                                            ) : (
                                                <div
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-sm"
                                                    style={{ background: acc.primary_color || '#6366f1' }}
                                                >
                                                    {(acc.name || 'A').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <Link
                                                    to={`/saas/academies/${acc.id}`}
                                                    className="font-semibold text-surface-900 text-sm hover:text-indigo-600 transition-colors"
                                                >
                                                    {acc.name || 'Unnamed'}
                                                </Link>
                                                {acc.notes && (
                                                    <p className="text-[10px] text-surface-400 truncate max-w-[160px]">
                                                        {acc.notes}
                                                    </p>
                                                )}
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
                                                type="button"
                                                onClick={() => handleImpersonate(acc)}
                                                disabled={impersonatingId === acc.id}
                                                className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50"
                                                title="Login as this academy's admin"
                                            >
                                                {impersonatingId === acc.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <LogIn className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setResetTarget(acc);
                                                    setNewPassword('');
                                                    setResetError('');
                                                    setResetSuccess('');
                                                }}
                                                className="p-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-200 transition-colors"
                                                title="إعادة تعيين كلمة المرور"
                                            >
                                                <KeyRound className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openEdit(acc)}
                                                className="p-1.5 rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 border border-surface-200 transition-colors"
                                                title="Edit academy"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleStatus(acc.id, acc.status || 'active')}
                                                disabled={actionLoading === acc.id}
                                                className={`btn text-xs px-3 py-1.5 ${
                                                    acc.status === 'suspended'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                                                }`}
                                            >
                                                {actionLoading === acc.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : acc.status === 'suspended' ? (
                                                    'Activate'
                                                ) : (
                                                    'Suspend'
                                                )}
                                            </button>
                                            <button
                                                type="button"
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
    );
}
