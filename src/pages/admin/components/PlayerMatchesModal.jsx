import React, { useState, useEffect } from 'react';
import { Trophy, MapPin, X, Loader2 } from 'lucide-react';
import { API_URL } from '../../../config';
import { authFetch } from '../../../api';

const PlayerMatchesModal = ({ isOpen, onClose, player, isRTL, dir }) => {
    const [matches, setMatches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen && player) {
            authFetch(`${API_URL}/matches/player/${player.user_id}`)
                .then(res => res.json())
                .then(data => { setMatches(data || []); setIsLoading(false); })
                .catch(() => setIsLoading(false));
        }
    }, [isOpen, player]);

    if (!isOpen || !player) return null;

    return (
        <div className={`fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col border border-slate-200 overflow-hidden" style={{ maxHeight: '85vh' }}>
                <div className={`flex justify-between items-center p-6 border-b border-slate-100 bg-emerald-50 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="bg-white p-2 text-emerald-600 rounded-xl shadow-sm"><Trophy size={20} /></div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">{isRTL ? 'مباريات اللاعب' : "Player's Matches"}</h2>
                            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">{player.full_name}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-white p-2 rounded-full transition-all border border-transparent">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50">
                    {isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
                    ) : matches.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-bold italic">{isRTL ? 'لا توجد مباريات مسجلة.' : 'No matches found.'}</div>
                    ) : (
                        <div className="space-y-4">
                            {matches.map(m => (
                                <div key={m.id} className={`bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex flex-col items-center justify-center font-black">
                                            <span className="text-[10px]">{new Date(m.match_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US', { month: 'short' })}</span>
                                            <span className="text-lg leading-tight">{new Date(m.match_date).getDate()}</span>
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-slate-900 border-b border-slate-100 pb-1 inline-block mb-1">{isRTL ? 'ضد' : 'vs'} {m.opponent_name}</div>
                                            <div className={`flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">{m.match_type} {m.category}</span>
                                                <span className="flex items-center gap-1"><MapPin size={10} /> {m.location || 'TBD'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg ${m.status === 'Completed' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-500 text-white'}`}>{m.status === 'Completed' ? (isRTL ? 'ملعوبة' : 'Played') : (isRTL ? 'قادمة' : 'Upcoming')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayerMatchesModal;
