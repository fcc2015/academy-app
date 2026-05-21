import React from 'react';
import { Search, Trophy, Filter, Users, Eye, QrCode, Edit2, LogIn, Key, Trash2, Smartphone, AlertCircle, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { impersonateUser } from '../../../utils/impersonate';
import { authFetch } from '../../../api';
import { API_URL } from '../../../config';

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
    pagedPlayers,
    openAddModal,
    fetchPlayers,
    openProfileModal,
    openMatchesModal,
    setCurrentPlayer,
    setIsBadgeModalOpen,
    openEditModal,
    handleDelete,
    navigate,
    page,
    totalPages,
    setPage
}) => {
    return (
        <div className={`bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden border-b-8 border-b-slate-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div className={`p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-slate-50/50 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                <div className="relative flex-1">
                    <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-5' : 'left-0 pl-5'} flex items-center pointer-events-none text-slate-300`}><Search size={20} /></div>
                    <input type="text" placeholder={t('players.searchPlaceholder')}
                        className={`block w-full ${isRTL ? 'pr-14 pl-6 text-right' : 'pl-14 pr-6 text-left'} py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm`}
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button
                    onClick={() => { setProOnly(!proOnly); setPage(1); }}
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
                ) : pagedPlayers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-4">
                        <Users className="text-slate-200" size={56} />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'لا يوجد لاعبون مسجلون' : 'No players found'}</p>
                        <button onClick={openAddModal} className="px-6 py-3 text-xs font-black uppercase tracking-widest bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all">{t('players.addPlayer')}</button>
                    </div>
                ) : (
                    <table className="w-full" dir={dir}>
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('players.playerProfile')}</th>
                                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('players.parentName')}</th>
                                <th className="px-8 py-6 text-center">{t('players.subscription')}</th>
                                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.status')}</th>
                                <th className={`px-8 py-6 ${isRTL ? 'text-left' : 'text-right'}`}>{t('players.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {pagedPlayers.map((player) => (
                                <tr key={player.user_id} className="hover:bg-slate-50/50 group">
                                    <td className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-[15px] font-black text-slate-900 tracking-tight">{player.full_name}</div>
                                                    {player.technical_level === 'A' && (
                                                        <span className="bg-yellow-100 text-yellow-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border border-yellow-200">PRO</span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] font-bold text-slate-400">{t('players.bornOn')} {player.birth_date}</div>
                                                <div className={`mt-1 flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
                                                    <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">LVL: {player.technical_level}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        <div className="font-black text-slate-800 text-[14px]">{player.parent_name}</div>
                                        <div className={`flex items-center gap-2 mt-1 ${isRTL ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
                                            <span className="font-bold text-slate-400 text-xs" dir="ltr">{player.parent_whatsapp || '—'}</span>
                                            {player.parent_whatsapp && (
                                                <a href={`https://wa.me/${player.parent_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-500 transition-colors">
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
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${player.subscription_type === 'Free' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                                            {player.subscription_type === 'Free' ? t('players.scholarship') : player.subscription_type}
                                        </span>
                                    </td>
                                    <td className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 ${isRTL ? 'flex-row-reverse' : ''} ${player.account_status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : player.account_status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                            <span className={`h-2 w-2 rounded-full ${player.account_status === 'Active' ? 'bg-emerald-500 animate-pulse' : player.account_status === 'Pending' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                                            {player.account_status === 'Active' ? t('players.active') : player.account_status === 'Pending' ? t('players.pending') : player.account_status === 'Suspended' ? t('players.suspended') : player.account_status}
                                        </span>
                                    </td>
                                    <td className={`px-8 py-6 ${isRTL ? 'text-left' : 'text-right'}`}>
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
                                                                const targetId = player.parent_id || player.user_id;
                                                                const data = await impersonateUser(targetId);
                                                                const storedId = localStorage.getItem('impersonating_user_id');
                                                                if (!storedId) {
                                                                    throw new Error(isRTL ? 'فشل حفظ بيانات الجلسة' : 'Failed to save impersonation session');
                                                                }
                                                                navigate('/parent');
                                                            }
                                                            catch (e) {
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
                                                                    text: isRTL ? 'هل أنت متأكد من تغيير كلمة مرور ولي الأمر؟' : 'Are you sure you want to reset this parent\'s password?',
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
                                                                            try {
                                                                                const parsed = JSON.parse(text);
                                                                                if (parsed.detail) errorMessage = parsed.detail;
                                                                            } catch (err) {}
                                                                            throw new Error(errorMessage);
                                                                        }
                                                                        const data = await res.json();
                                                                        Swal.fire({
                                                                            title: isRTL ? 'تم تغيير كلمة المرور!' : 'Password Reset Successful!',
                                                                            html: `
                                                                                <div class="text-left mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200" dir="ltr">
                                                                                    <p class="mb-2"><strong>Login:</strong> <span class="bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-mono">${data.email || 'Unknown'}</span></p>
                                                                                    <p><strong>Password:</strong> <code class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded select-all font-mono">${data.new_password}</code></p>
                                                                                </div>
                                                                            `,
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
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
                <div className={`flex items-center justify-between mt-4 p-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {isRTL ? `الصفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
                    </span>
                    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="px-4 py-2 text-xs font-black uppercase rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all">◀</button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="px-4 py-2 text-xs font-black uppercase rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all">▶</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlayersTable;
