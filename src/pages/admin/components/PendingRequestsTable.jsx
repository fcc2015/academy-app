import React from 'react';
import { Clock, Play, Check, Trash2, Smartphone } from 'lucide-react';

const PendingRequestsTable = ({
    pendingRequests,
    isRTL,
    dir,
    t,
    reviewRequest,
    updateRequestStatus,
    deleteRequest
}) => {
    if (!pendingRequests || pendingRequests.length === 0) return null;

    return (
        <div className="mb-10 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden border-r-8 border-r-amber-500">
            <div className={`p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="bg-amber-100 p-3 rounded-2xl text-amber-600"><Clock size={24} /></div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <h2 className="font-extrabold text-slate-800 text-lg">{t('players.pendingRequests')}</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{isRTL ? 'معالجة المسجلين عبر الموقع' : 'Process new web registrants'}</p>
                    </div>
                </div>
                <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest">{pendingRequests.length} {isRTL ? 'طلب جديد' : 'New Request'}</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full" dir={dir}>
                    <thead>
                        <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                            <th className={`px-8 py-5 ${isRTL ? 'text-right' : 'text-left'}`}>{t('players.identity')}</th>
                            <th className={`px-8 py-5 ${isRTL ? 'text-right' : 'text-left'}`}>{t('players.contact')}</th>
                            <th className={`px-8 py-5 ${isRTL ? 'text-right' : 'text-left'}`}>{t('players.plan')}</th>
                            <th className="px-8 py-5 text-center">{t('common.status')}</th>
                            <th className={`px-8 py-5 ${isRTL ? 'text-left' : 'text-right'}`}>{t('players.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {pendingRequests.map(req => (
                            <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className={`px-8 py-5 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <div className="font-extrabold text-slate-900 text-[15px]">{req.player_name || req.name}</div>
                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{t('players.parentName')}: {req.name}</div>
                                </td>
                                <td className={`px-8 py-5 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <div className={`flex flex-col gap-1 ${isRTL ? 'items-end' : 'items-start'}`}>
                                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <span className="text-sm font-bold text-slate-700" dir="ltr">{req.phone || '—'}</span>
                                            {req.phone && (
                                                <a href={`https://wa.me/${req.phone.replace(/\D/g, '')}?text=${encodeURIComponent(isRTL ? `مرحبا، بخصوص طلب تسجيل ${req.player_name}` : `Hello, regarding ${req.player_name}'s registration.`)}`}
                                                    target="_blank" rel="noreferrer" className="p-1 px-1.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100">
                                                    <Smartphone size={12} />
                                                </a>
                                            )}
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-400">{req.email || '—'}</div>
                                    </div>
                                </td>
                                <td className={`px-8 py-5 ${isRTL ? 'text-right' : 'text-left'}`}><span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-tighter">{req.plan_name || t('players.inquiry')}</span></td>
                                <td className="px-8 py-5 text-center">
                                    {req.status === 'processing' ? (
                                        <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 text-[10.5px] font-black px-4 py-2 rounded-xl border border-blue-300 uppercase">
                                            <Play size={12} fill="currentColor" className="animate-pulse" /> {t('players.processing')}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-[10.5px] font-black px-4 py-2 rounded-xl border border-amber-300 uppercase">
                                            <Clock size={12} /> {t('players.newRequest')}
                                        </span>
                                    )}
                                </td>
                                <td className={`px-8 py-5 ${isRTL ? 'text-left' : 'text-right'}`}>
                                    <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                                        <button onClick={() => reviewRequest(req)} className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all active:scale-95" title={isRTL ? 'قبول وتحويل للاعب' : 'Accept & Convert'}><Check size={16} strokeWidth={2.5} /></button>
                                        <button onClick={() => updateRequestStatus(req.id, req.status === 'processing' ? 'new' : 'processing')} className={`p-2.5 rounded-xl border-2 transition-all ${req.status === 'processing' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-blue-600 bg-blue-50 border-blue-200'}`}>{req.status === 'processing' ? <Clock size={16} /> : <Play size={16} />}</button>
                                        <button onClick={() => deleteRequest(req.id)} className="p-2.5 text-red-500 bg-red-50 border-2 border-red-100 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} strokeWidth={2.5} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PendingRequestsTable;
