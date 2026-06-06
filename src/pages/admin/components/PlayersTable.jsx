import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender
} from '@tanstack/react-table';
import {
    Search, Trophy, Filter, Users, Eye, QrCode, Edit2, LogIn, Key,
    Trash2, Smartphone, AlertCircle, Loader2, ChevronUp, ChevronDown,
    Pencil, Check, X as XIcon
} from 'lucide-react';
import Swal from 'sweetalert2';
import { impersonateUser } from '../../../utils/impersonate';
import { authFetch } from '../../../api';
import { API_URL } from '../../../config';

/* ─────────────────────────────────────────────
   InlineEditCell — click-to-edit any text cell
   ───────────────────────────────────────────── */
const InlineEditCell = ({ value: initialValue, playerId, field, onSave, isRTL, multiline = false }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    // Reset when player data changes externally
    useEffect(() => {
        if (!isEditing) setValue(initialValue ?? '');
    }, [initialValue, isEditing]);

    const startEdit = () => {
        setValue(initialValue ?? '');
        setError(null);
        setIsEditing(true);
    };

    useEffect(() => {
        if (isEditing && inputRef.current) inputRef.current.focus();
    }, [isEditing]);

    const cancel = () => {
        setValue(initialValue ?? '');
        setError(null);
        setIsEditing(false);
    };

    const save = useCallback(async () => {
        const trimmed = value.trim();
        if (trimmed === (initialValue ?? '').trim()) {
            setIsEditing(false);
            return;
        }
        if (!trimmed) {
            setError('Value cannot be empty');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onSave(playerId, field, trimmed);
            setIsEditing(false);
        } catch (err) {
            setError(err.message || 'Save failed');
            setValue(initialValue ?? '');
        } finally {
            setSaving(false);
        }
    }, [value, initialValue, playerId, field, onSave]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); save(); }
        if (e.key === 'Escape') cancel();
    };

    if (!isEditing) {
        return (
            <div
                className="group/cell flex items-center gap-2 cursor-pointer min-w-0"
                onClick={startEdit}
                title="Click to edit"
            >
                <span className="truncate">{initialValue || <span className="text-slate-300 italic text-xs">—</span>}</span>
                <button
                    className="opacity-0 group-hover/cell:opacity-100 transition-opacity p-1 rounded-lg bg-indigo-50 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600 flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); startEdit(); }}
                    tabIndex={-1}
                    aria-label="Edit"
                >
                    <Pencil size={11} />
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 min-w-0">
            <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {multiline ? (
                    <textarea
                        ref={inputRef}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={2}
                        disabled={saving}
                        className="flex-1 text-sm font-bold px-2 py-1 border-2 border-indigo-400 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white resize-none min-w-0 w-full"
                        dir={isRTL ? 'rtl' : 'ltr'}
                    />
                ) : (
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={saving}
                        className="flex-1 text-sm font-bold px-2 py-1 border-2 border-indigo-400 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white min-w-0 w-full"
                        dir={isRTL ? 'rtl' : 'ltr'}
                    />
                )}
                {saving ? (
                    <Loader2 size={16} className="animate-spin text-indigo-500 flex-shrink-0" />
                ) : (
                    <>
                        <button
                            onClick={save}
                            className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex-shrink-0"
                            title="Save (Enter)"
                        >
                            <Check size={13} />
                        </button>
                        <button
                            onClick={cancel}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 transition-all flex-shrink-0"
                            title="Cancel (Esc)"
                        >
                            <XIcon size={13} />
                        </button>
                    </>
                )}
            </div>
            {error && (
                <span className="text-[10px] font-bold text-red-500 px-1">{error}</span>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   TechnicalLevelCell — click to toggle A ↔ B
   ───────────────────────────────────────────── */
const TechnicalLevelCell = ({ player, onSave }) => {
    const [level, setLevel] = useState(player.technical_level);
    const [saving, setSaving] = useState(false);

    useEffect(() => { setLevel(player.technical_level); }, [player.technical_level]);

    const toggle = async () => {
        const next = level === 'A' ? 'B' : 'A';
        const prev = level;
        setLevel(next);
        setSaving(true);
        try {
            await onSave(player.user_id, 'technical_level', next);
        } catch {
            setLevel(prev);
        } finally {
            setSaving(false);
        }
    };

    return (
        <button
            onClick={toggle}
            disabled={saving}
            title="Click to toggle level"
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all hover:scale-105 active:scale-95 ${
                level === 'A'
                    ? 'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100'
                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
        >
            {saving
                ? <Loader2 size={10} className="animate-spin" />
                : level === 'A'
                    ? <Trophy size={10} fill="currentColor" />
                    : null
            }
            {level}
        </button>
    );
};

/* ─────────────────────────────────────────────
   StatusCell — dropdown in-place
   ───────────────────────────────────────────── */
const StatusCell = ({ player, t, isRTL, fetchPlayers }) => {
    const [status, setStatus] = useState(player.account_status);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        const prevStatus = status;
        setStatus(newStatus);
        setIsUpdating(true);
        try {
            const res = await authFetch(`${API_URL}/players/${player.user_id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ account_status: newStatus })
            });
            if (res.ok) {
                if (fetchPlayers) await fetchPlayers();
            } else {
                setStatus(prevStatus);
                Swal.fire({
                    icon: 'error',
                    title: isRTL ? 'خطأ' : 'Error',
                    text: isRTL ? 'فشل تحديث حالة اللاعب' : 'Failed to update player status',
                    confirmButtonColor: '#4f46e5'
                });
            }
        } catch (err) {
            setStatus(prevStatus);
            Swal.fire({ icon: 'error', title: isRTL ? 'خطأ' : 'Error', text: err.message, confirmButtonColor: '#4f46e5' });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="relative inline-flex items-center">
            {isUpdating && (
                <Loader2 size={12} className={`absolute -translate-y-1/2 animate-spin text-indigo-600 ${isRTL ? '-right-5' : '-left-5'} top-1/2`} />
            )}
            <select
                value={status}
                onChange={handleStatusChange}
                disabled={isUpdating}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 cursor-pointer outline-none transition-all ${
                    status === 'Active'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 focus:ring-emerald-500/20'
                        : status === 'Pending'
                            ? 'bg-amber-50 text-amber-600 border-amber-200 focus:ring-amber-500/20'
                            : 'bg-slate-100 text-slate-500 border-slate-200 focus:ring-slate-500/20'
                }`}
            >
                <option value="Active">{t('players.active')}</option>
                <option value="Pending">{t('players.pending')}</option>
                <option value="Suspended">{t('players.suspended')}</option>
            </select>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Main PlayersTable component
   ───────────────────────────────────────────── */
const PlayersTable = ({
    isRTL,
    dir,
    t,
    searchTerm,
    setSearchTerm,
    proOnly,
    setProOnly,
    proCount,
    fetchError,
    loading,
    players = [],
    openAddModal,
    fetchPlayers,
    openProfileModal,
    openMatchesModal,
    setCurrentPlayer,
    setIsBadgeModalOpen,
    openEditModal,
    handleDelete,
    navigate,
    selectedPlayerIds = [],
    setSelectedPlayerIds
}) => {
    const [sorting, setSorting] = useState([]);

    /* Shared PATCH handler used by all inline-edit cells */
    const handleInlineSave = useCallback(async (playerId, field, newValue) => {
        const res = await authFetch(`${API_URL}/players/${playerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [field]: newValue })
        });
        if (!res.ok) {
            let detail = 'Failed to save';
            try {
                const j = await res.json();
                detail = j.detail || detail;
            } catch { /* ignore */ }
            throw new Error(detail);
        }
        // Silently refresh in the background so optimistic update is confirmed
        if (fetchPlayers) fetchPlayers();
    }, [fetchPlayers]);

    // Synchronize selectedPlayerIds array from parent with TanStack rowSelection object
    const rowSelection = useMemo(() => {
        const sel = {};
        selectedPlayerIds.forEach(id => { sel[id] = true; });
        return sel;
    }, [selectedPlayerIds]);

    const onRowSelectionChange = (updater) => {
        const nextVal = typeof updater === 'function' ? updater(rowSelection) : updater;
        const nextIds = Object.keys(nextVal).filter(key => nextVal[key]);
        setSelectedPlayerIds(nextIds);
    };

    const columns = useMemo(() => [
        {
            id: 'select',
            header: ({ table }) => (
                <div className="flex justify-center">
                    <input
                        type="checkbox"
                        className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                        checked={table.getIsAllPageRowsSelected()}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                    />
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <input
                        type="checkbox"
                        className="h-4.5 w-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                    />
                </div>
            ),
            enableSorting: false,
        },
        {
            accessorKey: 'full_name',
            header: ({ column }) => (
                <button
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className={`flex items-center gap-1.5 hover:text-slate-700 font-black uppercase tracking-widest text-[10px] ${isRTL ? 'text-right justify-end w-full' : 'text-left'}`}
                >
                    {t('players.playerProfile')}
                    {column.getIsSorted() === 'asc' ? (
                        <ChevronUp size={14} className="text-indigo-600" />
                    ) : column.getIsSorted() === 'desc' ? (
                        <ChevronDown size={14} className="text-indigo-600" />
                    ) : (
                        <span className="opacity-30">↕️</span>
                    )}
                </button>
            ),
            cell: ({ row }) => {
                const player = row.original;
                return (
                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                        <div className="h-14 w-14 rounded-2xl shrink-0 group-hover:rotate-3 transition-transform relative overflow-hidden">
                            {player.photo_url
                                ? <img src={player.photo_url} alt={player.full_name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                                : null
                            }
                            <div className={`w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center text-white ${player.photo_url ? 'hidden' : 'flex'}`}>
                                <span className="text-[10px] font-black opacity-60">CAT</span>
                                <span className="text-sm font-black tracking-tighter">{player.u_category}</span>
                            </div>
                            {player.technical_level === 'A' && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-400 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                                    <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-pulse"></span>
                                </span>
                            )}
                        </div>
                        <div className={`min-w-0 flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {/* Inline editable name */}
                            <div className="text-[15px] font-black text-slate-900 tracking-tight">
                                <InlineEditCell
                                    value={player.full_name}
                                    playerId={player.user_id}
                                    field="full_name"
                                    onSave={handleInlineSave}
                                    isRTL={isRTL}
                                />
                            </div>
                            <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                                {t('players.bornOn')} {player.birth_date}
                            </div>
                            <div className={`mt-1 flex items-center gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                                <TechnicalLevelCell player={player} onSave={handleInlineSave} />
                            </div>
                        </div>
                    </div>
                );
            }
        },
        {
            accessorKey: 'parent_name',
            header: ({ column }) => (
                <button
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className={`flex items-center gap-1.5 hover:text-slate-700 font-black uppercase tracking-widest text-[10px] ${isRTL ? 'text-right justify-end w-full' : 'text-left'}`}
                >
                    {t('players.parentName')}
                    {column.getIsSorted() === 'asc' ? (
                        <ChevronUp size={14} className="text-indigo-600" />
                    ) : column.getIsSorted() === 'desc' ? (
                        <ChevronDown size={14} className="text-indigo-600" />
                    ) : (
                        <span className="opacity-30">↕️</span>
                    )}
                </button>
            ),
            cell: ({ row }) => {
                const player = row.original;
                return (
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <div className="font-black text-slate-800 text-[14px]">
                            <InlineEditCell
                                value={player.parent_name}
                                playerId={player.user_id}
                                field="parent_name"
                                onSave={handleInlineSave}
                                isRTL={isRTL}
                            />
                        </div>
                        <div className={`flex items-center gap-2 mt-1 ${isRTL ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
                            {/* Inline editable WhatsApp */}
                            <span className="font-bold text-slate-400 text-xs" dir="ltr">
                                <InlineEditCell
                                    value={player.parent_whatsapp || ''}
                                    playerId={player.user_id}
                                    field="parent_whatsapp"
                                    onSave={handleInlineSave}
                                    isRTL={false}
                                />
                            </span>
                            {player.parent_whatsapp && (
                                <a href={`https://wa.me/${player.parent_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-500 transition-colors flex-shrink-0">
                                    <Smartphone size={14} />
                                </a>
                            )}
                        </div>
                        {(player.medical_cert_valid_until || player.transport_zone) && (
                            <div className={`flex gap-2 mt-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                                {player.medical_cert_valid_until && (
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${new Date(player.medical_cert_valid_until) < new Date() ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                        {new Date(player.medical_cert_valid_until) < new Date() ? 'طبي منتهي' : 'طبي صالح'}
                                    </span>
                                )}
                                {player.transport_zone && (
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded border bg-indigo-50 text-indigo-600 border-indigo-200">
                                        نقل: {player.transport_zone}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            accessorKey: 'subscription_type',
            header: ({ column }) => (
                <button
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className="flex items-center gap-1.5 hover:text-slate-700 font-black uppercase tracking-widest text-[10px] mx-auto"
                >
                    {t('players.subscription')}
                    {column.getIsSorted() === 'asc' ? (
                        <ChevronUp size={14} className="text-indigo-600" />
                    ) : column.getIsSorted() === 'desc' ? (
                        <ChevronDown size={14} className="text-indigo-600" />
                    ) : (
                        <span className="opacity-30">↕️</span>
                    )}
                </button>
            ),
            cell: ({ row }) => {
                const player = row.original;
                return (
                    <div className="text-center">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${player.subscription_type === 'Free' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                            {player.subscription_type === 'Free' ? t('players.scholarship') : player.subscription_type}
                        </span>
                    </div>
                );
            }
        },
        {
            accessorKey: 'account_status',
            header: ({ column }) => (
                <button
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    className={`flex items-center gap-1.5 hover:text-slate-700 font-black uppercase tracking-widest text-[10px] ${isRTL ? 'text-right justify-end w-full' : 'text-left'}`}
                >
                    {t('common.status')}
                    {column.getIsSorted() === 'asc' ? (
                        <ChevronUp size={14} className="text-indigo-600" />
                    ) : column.getIsSorted() === 'desc' ? (
                        <ChevronDown size={14} className="text-indigo-600" />
                    ) : (
                        <span className="opacity-30">↕️</span>
                    )}
                </button>
            ),
            cell: ({ row }) => {
                const player = row.original;
                return <StatusCell player={player} t={t} isRTL={isRTL} fetchPlayers={fetchPlayers} />;
            }
        },
        {
            id: 'actions',
            header: () => (
                <div className={`font-black uppercase tracking-widest text-[10px] ${isRTL ? 'text-left' : 'text-right'}`}>
                    {t('players.actions')}
                </div>
            ),
            cell: ({ row }) => {
                const player = row.original;
                return (
                    <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                        <button onClick={() => openProfileModal(player)} className="p-3 bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-500 hover:text-white rounded-xl hover:shadow-lg transition-all hover:-translate-y-1" title={isRTL ? 'الملف الشخصي' : 'Profile'}><Eye size={16} /></button>
                        <button onClick={() => openMatchesModal(player)} className="p-3 bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-500 hover:text-white rounded-xl hover:shadow-lg transition-all hover:-translate-y-1" title={isRTL ? 'المباريات' : 'Matches'}><Trophy size={16} /></button>
                        <button onClick={() => { setCurrentPlayer(player); setIsBadgeModalOpen(true); }} className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-500 hover:text-white rounded-xl hover:shadow-lg transition-all hover:-translate-y-1" title={t('players.viewCard')}><QrCode size={16} /></button>
                        <button onClick={() => openEditModal(player)} className="p-3 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white rounded-xl hover:shadow-lg transition-all hover:-translate-y-1" title={isRTL ? 'تعديل البيانات' : 'Edit'}><Edit2 size={16} /></button>
                        {(player.parent_id || player.user_id) && (
                            <>
                                <button
                                    onClick={async () => {
                                        try {
                                            await impersonateUser(player.parent_id || player.user_id);
                                            const storedId = localStorage.getItem('impersonating_user_id');
                                            if (!storedId) throw new Error(isRTL ? 'فشل حفظ بيانات الجلسة' : 'Failed to save impersonation session');
                                            navigate('/parent');
                                        } catch (e) {
                                            Swal.fire({ icon: 'error', title: 'Login As failed', text: e.message });
                                        }
                                    }}
                                    className="p-3 bg-teal-50 text-teal-600 border border-teal-200 hover:bg-teal-600 hover:text-white rounded-xl hover:shadow-lg transition-all hover:-translate-y-1"
                                    title={isRTL ? 'دخول كولي الأمر' : 'Login as parent'}
                                >
                                    <LogIn size={16} />
                                </button>
                                {player.parent_id && (
                                    <button
                                        onClick={async () => {
                                            const result = await Swal.fire({
                                                title: isRTL ? 'إعادة تعيين كلمة المرور؟' : 'Reset Parent Password?',
                                                text: isRTL ? 'هل أنت متأكد من تغيير كلمة مرور ولي الأمر؟' : "Are you sure you want to reset this parent's password?",
                                                icon: 'warning',
                                                showCancelButton: true,
                                                confirmButtonText: isRTL ? 'نعم، تغيير' : 'Yes, reset',
                                                cancelButtonText: t('common.cancel')
                                            });
                                            if (result.isConfirmed) {
                                                try {
                                                    const res = await authFetch(`${API_URL}/players/${player.user_id}/reset-parent-pwd`, { method: 'POST' });
                                                    if (!res.ok) {
                                                        const text = await res.text();
                                                        let errorMessage = text;
                                                        try { const parsed = JSON.parse(text); if (parsed.detail) errorMessage = parsed.detail; } catch { }
                                                        throw new Error(errorMessage);
                                                    }
                                                    const data = await res.json();
                                                    Swal.fire({
                                                        title: isRTL ? 'تم تغيير كلمة المرور!' : 'Password Reset Successful!',
                                                        html: `<div class="text-left mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200" dir="ltr"><p class="mb-2"><strong>Login:</strong> <span class="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-mono">${data.email || 'Unknown'}</span></p><p><strong>Password:</strong> <code class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded select-all font-mono">${data.new_password}</code></p></div>`,
                                                        icon: 'success'
                                                    });
                                                } catch (e) {
                                                    Swal.fire(isRTL ? 'خطأ' : 'Error', e.message, 'error');
                                                }
                                            }
                                        }}
                                        className="p-3 bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-600 hover:text-white rounded-xl hover:shadow-lg transition-all hover:-translate-y-1"
                                        title={isRTL ? "إعادة تعيين كلمة المرور لولي الأمر" : "Reset Parent Password"}
                                    >
                                        <Key size={16} />
                                    </button>
                                )}
                            </>
                        )}
                        <button onClick={() => handleDelete(player.user_id)} className="p-3 bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white rounded-xl hover:shadow-lg transition-all hover:-translate-y-1" title={isRTL ? 'حذف من النظام' : 'Delete'}><Trash2 size={16} /></button>
                    </div>
                );
            },
            enableSorting: false,
        }
    ], [isRTL, t, navigate, openProfileModal, openMatchesModal, setCurrentPlayer, setIsBadgeModalOpen, openEditModal, handleDelete, handleInlineSave, fetchPlayers]);

    const table = useReactTable({
        data: players,
        columns,
        state: { sorting, rowSelection },
        onSortingChange: setSorting,
        onRowSelectionChange,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: row => row.user_id,
        enableRowSelection: true,
    });

    const pageIndex = table.getState().pagination.pageIndex;
    const pageCount = table.getPageCount();

    return (
        <div className={`bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden border-b-8 border-b-slate-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {/* Search + Filter bar */}
            <div className={`p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-slate-50/50 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                <div className="relative flex-1">
                    <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-5' : 'left-0 pl-5'} flex items-center pointer-events-none text-slate-300`}><Search size={20} /></div>
                    <input type="text" placeholder={t('players.searchPlaceholder')}
                        className={`block w-full ${isRTL ? 'pr-14 pl-6 text-right' : 'pl-14 pr-6 text-left'} py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm`}
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button
                    onClick={() => setProOnly(!proOnly)}
                    className={`flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${proOnly ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900 border-amber-300 shadow-lg shadow-amber-500/30' : 'bg-white text-slate-400 border-slate-200 hover:text-amber-600 hover:border-amber-200'}`}
                    title={isRTL ? 'لاعبو النخبة فقط' : 'PRO players only'}
                >
                    <Trophy size={16} fill={proOnly ? 'currentColor' : 'none'} />
                    <span>PRO</span>
                    {proCount > 0 && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${proOnly ? 'bg-yellow-900 text-yellow-100' : 'bg-amber-100 text-amber-700'}`}>{proCount}</span>
                    )}
                </button>
                <button className={`flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-400 px-6 py-4 rounded-2xl font-black text-xs uppercase transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Filter size={18} />
                    <span>{t('common.filter')}</span>
                </button>
            </div>

            {/* Inline edit hint banner */}
            <div className={`px-8 py-2.5 bg-indigo-50/60 border-b border-indigo-100 flex items-center gap-2 text-indigo-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Pencil size={12} className="flex-shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                    {isRTL ? 'انقر على أي اسم أو رقم هاتف أو مستوى لتعديله مباشرة' : 'Click any name, phone, or level to edit inline'}
                </span>
            </div>

            {/* Table body */}
            <div className="overflow-x-auto min-h-[400px]">
                {fetchError ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-4">
                        <AlertCircle className="text-red-400" size={48} />
                        <p className="text-sm font-black text-red-500 text-center max-w-sm">{fetchError}</p>
                        <button onClick={fetchPlayers} className="px-6 py-3 text-xs font-black uppercase tracking-widest bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all">
                            {isRTL ? 'إعادة المحاولة' : 'Retry'}
                        </button>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-40">
                        <Loader2 className="text-indigo-600 animate-spin" size={40} />
                        <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.loading')}</p>
                    </div>
                ) : players.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-4">
                        <Users className="text-slate-200" size={56} />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'لا يوجد لاعبون مسجلون' : 'No players found'}</p>
                        <button onClick={openAddModal} className="px-6 py-3 text-xs font-black uppercase tracking-widest bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all">{t('players.addPlayer')}</button>
                    </div>
                ) : (
                    <table className="w-full" dir={dir}>
                        <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id} className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                    {headerGroup.headers.map(header => (
                                        <th
                                            key={header.id}
                                            className={`px-8 py-6 text-center ${header.column.id === 'select' ? 'w-12 px-6' : ''}`}
                                        >
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="hover:bg-slate-50/50 group transition-colors">
                                    {row.getVisibleCells().map(cell => (
                                        <td
                                            key={cell.id}
                                            className={`px-8 py-5 ${cell.column.id === 'select' ? 'px-6' : ''}`}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
                <div className={`flex items-center justify-between mt-4 p-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {isRTL ? `الصفحة ${pageIndex + 1} من ${pageCount}` : `Page ${pageIndex + 1} of ${pageCount}`}
                    </span>
                    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                            className="px-4 py-2 text-xs font-black uppercase rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all">◀</button>
                        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                            className="px-4 py-2 text-xs font-black uppercase rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all">▶</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayersTable;
