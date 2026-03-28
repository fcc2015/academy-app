import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import {
    Calendar, MapPin, Users2, Trophy, Clock, Search, X, CheckCircle, AlertCircle, Plus, Edit2, Trash2
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const CoachMatches = () => {
    const { isRTL, dir } = useLanguage();
    const [matches, setMatches] = useState([]);
    const [players, setPlayers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingMatch, setEditingMatch] = useState(null);
    const [statusBanner, setStatusBanner] = useState({ show: false, message: '', type: 'success', id: 0 });
    
    const userId = localStorage.getItem('user_id');

    const [formData, setFormData] = useState({
        opponent_name: '',
        match_date: '',
        match_time: '',
        location: '',
        match_type: 'Tournament',
        category: 'U11',
        convoked_players: []
    });

    const categoryOptions = ['U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'Senior'];
    const typeOptions = ['Friendly', 'League', 'Cup', 'Tournament'];

    const showBanner = (message, type = 'success') => {
        const id = Date.now();
        setStatusBanner({ show: true, message, type, id });
        setTimeout(() => setStatusBanner(prev => prev.id === id ? { ...prev, show: false } : prev), 5000);
    };

    useEffect(() => {
        document.body.classList.toggle('modal-open', showModal);
        return () => document.body.classList.remove('modal-open');
    }, [showModal]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [matchesRes, playersRes] = await Promise.all([
                authFetch(`${API_URL}/matches/coach/${userId}`),
                authFetch(`${API_URL}/players/`)
            ]);

            if (matchesRes.ok) setMatches(await matchesRes.json());
            if (playersRes.ok) setPlayers(await playersRes.json());
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const openModal = (match = null) => {
        if (match) {
            setEditingMatch(match);
            const dateObj = new Date(match.match_date);
            setFormData({
                opponent_name: match.opponent_name || '',
                match_date: dateObj.toISOString().split('T')[0],
                match_time: dateObj.toTimeString().slice(0, 5),
                location: match.location || '',
                match_type: match.match_type || 'Tournament',
                category: match.category || 'U11',
                convoked_players: match.convoked_players || []
            });
        } else {
            setEditingMatch(null);
            setFormData({
                opponent_name: '',
                match_date: '',
                match_time: '',
                location: '',
                match_type: 'Tournament',
                category: 'U11',
                convoked_players: []
            });
        }
        setShowModal(true);
    };

    const handlePlayerToggle = (playerId) => {
        setFormData(prev => {
            const currentlySelected = prev.convoked_players.includes(playerId);
            if (currentlySelected) {
                return { ...prev, convoked_players: prev.convoked_players.filter(id => id !== playerId) };
            } else {
                return { ...prev, convoked_players: [...prev.convoked_players, playerId] };
            }
        });
    };

    const handleSelectAll = (catPlayers) => {
        const ids = catPlayers.map(p => p.user_id);
        const allSelected = ids.every(id => formData.convoked_players.includes(id));
        if (allSelected) {
            setFormData(prev => ({
                ...prev,
                convoked_players: prev.convoked_players.filter(id => !ids.includes(id))
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                convoked_players: [...new Set([...prev.convoked_players, ...ids])]
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.match_date || !formData.match_time) {
            showBanner(isRTL ? 'المرجوا إدخال التاريخ والوقت' : 'Please provide date and time', 'error');
            return;
        }

        const dateTimeStr = `${formData.match_date}T${formData.match_time}:00`;
        const payload = {
            coach_id: userId,
            opponent_name: formData.opponent_name,
            match_date: new Date(dateTimeStr).toISOString(),
            location: formData.location,
            match_type: formData.match_type,
            category: formData.category,
            convoked_players: formData.convoked_players,
            status: 'Scheduled'
        };

        const url = editingMatch ? `${API_URL}/matches/${editingMatch.id}` : `${API_URL}/matches/`;
        const method = editingMatch ? 'PATCH' : 'POST';

        try {
            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // Send notifications to convoked players
                if (formData.convoked_players && formData.convoked_players.length > 0) {
                    const matchDate = new Date(dateTimeStr).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US', { day: 'numeric', month: 'short' });
                    const matchTitle = isRTL ? 'استدعاء لمباراة جديدة' : 'New Match Convocation';
                    const matchMessage = isRTL 
                        ? `لقد تم استدعاؤك لمباراة ضد ${formData.opponent_name} يوم ${matchDate}. المررجو الحضور في الموعد.`
                        : `You have been convoked for a match against ${formData.opponent_name} on ${matchDate}. Please be on time.`;

                    // We wrap this in a try-catch so it doesn't block the main success flow if it fails
                    try {
                        await Promise.all(formData.convoked_players.map(playerId => 
                            authFetch(`${API_URL}/notifications/`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    user_id: playerId,
                                    title: matchTitle,
                                    message: matchMessage,
                                    type: 'system'
                                })
                            })
                        ));
                    } catch (notifErr) {
                        console.error('Failed to send some notifications', notifErr);
                    }
                }

                showBanner(isRTL ? 'تم حفظ التشكيلة بنجاح!' : 'Match convocation saved successfully!', 'success');
                setShowModal(false);
                fetchData();
            } else {
                const err = await res.json();
                showBanner(err.detail || 'Failed to save match', 'error');
            }
        } catch (error) {
            console.error('Error saving match:', error);
            showBanner('Connection failed.', 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذه المباراة؟' : 'Are you sure you want to delete this match?')) return;
        try {
            const res = await authFetch(`${API_URL}/matches/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showBanner(isRTL ? 'تم الحذف' : 'Match deleted', 'success');
                fetchData();
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Filter active players for the selected category
    const availablePlayers = players.filter(p => p.account_status === 'Active' && p.u_category === formData.category);

    const filteredMatches = matches.filter(m => 
        m.opponent_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={`animate-fade-in pb-20 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Status Banner */}
            {statusBanner.show && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-fade-in">
                    <div className={`flex items-center gap-4 px-8 py-4 rounded-[2rem] shadow-2xl border-2 backdrop-blur-md ${statusBanner.type === 'success' ? 'bg-emerald-600/90 border-emerald-400 text-white' : 'bg-red-600/90 border-red-400 text-white'}`}>
                        {statusBanner.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                        <span className="font-black text-base">{statusBanner.message}</span>
                        <button onClick={() => setStatusBanner({ ...statusBanner, show: false })} className="ml-4 hover:bg-white/20 p-1 rounded-full"><X size={16} /></button>
                    </div>
                </div>
            )}

            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                        {isRTL ? 'استدعاءات المباريات' : 'Match Convocations'} 
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">{isRTL ? 'اختر اللاعبين المشاركين في المباريات القادمة' : 'Select players to participate in upcoming matches'}</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className={`flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[13px] hover:shadow-lg hover:scale-105 transition-all shadow-emerald-600/20 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                    <Plus size={18} /> {isRTL ? 'استدعاء جديد' : 'New Convocation'}
                </button>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 premium-shadow overflow-hidden">
                <div className={`p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                    <div className="relative w-full md:w-96">
                        <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} size={18} />
                        <input
                            type="text"
                            placeholder={isRTL ? "البحث عن مباراة..." : "Search matches..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500/20 shadow-sm`}
                        />
                    </div>
                </div>

                <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-full py-20 text-center font-bold text-slate-400 italic">Loading matches...</div>
                    ) : filteredMatches.length === 0 ? (
                        <div className="col-span-full py-20 text-center font-bold text-slate-400 italic">{isRTL ? 'لا توجد مباريات مسجلة.' : 'No match convocations found.'}</div>
                    ) : (
                        filteredMatches.map((match) => (
                            <div key={match.id} className="bg-white rounded-3xl border border-slate-200 premium-shadow group hover:border-emerald-300 transition-all p-6 flex flex-col justify-between">
                                <div>
                                    <div className={`flex justify-between items-start mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                <Trophy size={24} strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 line-clamp-1">{match.opponent_name}</h3>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                                    {match.match_type} • {match.category}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openModal(match)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(match.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
    
                                    <div className="space-y-3">
                                        <div className={`flex items-center gap-3 text-sm font-medium text-slate-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <Calendar size={16} className="text-slate-400 shrink-0" />
                                            <span>{new Date(match.match_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(match.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</span>
                                        </div>
                                        <div className={`flex items-center gap-3 text-sm font-medium text-slate-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <MapPin size={16} className="text-slate-400 shrink-0" />
                                            <span className="truncate">{match.location || 'TBD'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center text-xs">
                                    <span className="font-bold text-slate-500">{isRTL ? 'لائحة المستدعين:' : 'Convoked Players:'}</span>
                                    <span className="flex items-center gap-1 font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                                        <Users2 size={14} /> {match.convoked_players?.length || 0}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Match Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col rounded-[2rem] shadow-2xl premium-shadow border border-slate-100 transform transition-all overflow-hidden custom-scrollbar">
                        <div className={`px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">{editingMatch ? (isRTL ? 'تعديل الاستدعاء' : 'Edit Convocation') : (isRTL ? 'استدعاء لاعبين جدد' : 'New Match Convocation')}</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-full border border-transparent hover:border-slate-200 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 custom-scrollbar">
                            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6">
                                <h4 className={`text-xs font-black uppercase tracking-widest text-slate-400 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'تفاصيل المباراة' : 'Match Details'}</h4>
                                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{isRTL ? 'اسم الخصم' : 'Opponent Name'}</label>
                                        <input
                                            required
                                            value={formData.opponent_name}
                                            onChange={(e) => setFormData({ ...formData, opponent_name: e.target.value })}
                                            placeholder="e.g. FC Barcelona Youth"
                                            className={`w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500/20 ${isRTL ? 'text-right' : 'text-left'}`}
                                            dir={dir}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{isRTL ? 'التاريخ' : 'Date'}</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.match_date}
                                            onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                                            className={`w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 ${isRTL ? 'text-right' : 'text-left'}`}
                                            dir={dir}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{isRTL ? 'الوقت' : 'Time'}</label>
                                        <input
                                            type="time"
                                            required
                                            value={formData.match_time}
                                            onChange={(e) => setFormData({ ...formData, match_time: e.target.value })}
                                            className={`w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 ${isRTL ? 'text-right' : 'text-left'}`}
                                            dir={dir}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{isRTL ? 'المكان' : 'Location'}</label>
                                        <input
                                            required
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            placeholder="Stadium or Field"
                                            className={`w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500/20 ${isRTL ? 'text-right' : 'text-left'}`}
                                            dir={dir}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{isRTL ? 'نوع المباراة' : 'Match Type'}</label>
                                        <select
                                            value={formData.match_type}
                                            onChange={(e) => setFormData({ ...formData, match_type: e.target.value })}
                                            className={`w-full px-5 py-3.5 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500/20 ${isRTL ? 'text-right' : 'text-left'}`}
                                            dir={dir}
                                        >
                                            {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl flex flex-col overflow-hidden">
                                <div className={`p-6 border-b border-emerald-100 flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div>
                                        <h4 className={`text-md font-black text-emerald-800 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'اللائحة المستدعاة' : 'Convocation List'}</h4>
                                        <p className={`text-xs font-semibold text-emerald-600/70 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'قم باختيار اللاعبين من اللائحة العامة' : 'Select players from the general list'}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value, convoked_players: [] })}
                                            className="px-4 py-2 bg-white border border-emerald-200 rounded-lg font-bold text-sm text-emerald-700 shadow-sm"
                                            dir={dir}
                                        >
                                            {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/50">
                                    <div className={`flex justify-between items-center mb-3 px-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">{availablePlayers.length} {isRTL ? 'لاعب متاح' : 'Available Players'}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => handleSelectAll(availablePlayers)}
                                            className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1 rounded-md transition-all"
                                        >
                                            {formData.convoked_players.length === availablePlayers.length && availablePlayers.length > 0 ? (isRTL ? 'إلغاء تحديد الكل' : 'Deselect All') : (isRTL ? 'تحديد الكل' : 'Select All')}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2 custom-scrollbar">
                                        {availablePlayers.length === 0 ? (
                                            <div className="col-span-full py-10 text-center font-bold text-slate-400 text-sm">
                                                {isRTL ? 'لا يوجد لاعبون نشطون في هذه الفئة' : 'No active players found for this category'}
                                            </div>
                                        ) : availablePlayers.map(player => {
                                            const isSelected = formData.convoked_players.includes(player.user_id);
                                            return (
                                                <div 
                                                    key={player.user_id} 
                                                    onClick={() => handlePlayerToggle(player.user_id)}
                                                    className={`cursor-pointer flex items-center justify-between p-3 rounded-xl border-2 transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-300'} ${isRTL ? 'flex-row-reverse' : ''}`}
                                                >
                                                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                            {player.full_name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-800 line-clamp-1">{player.full_name}</div>
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{player.position || 'POS'}</div>
                                                        </div>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200'}`}>
                                                        {isSelected && <CheckCircle size={14} strokeWidth={3} />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </form>

                        <div className={`p-6 border-t border-slate-100 bg-white flex shrink-0 ${isRTL ? 'justify-start mr-auto gap-3' : 'justify-end gap-3'}`}>
                            <button onClick={() => setShowModal(false)} type="button" className="px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-xl transition-all">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                            <button onClick={handleSubmit} className={`flex items-center gap-2 px-8 py-3.5 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all focus:ring-4 focus:ring-emerald-500/20 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <CheckCircle size={16} />
                                {isRTL ? 'التأكيد والنقل' : 'Save & Transfer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoachMatches;
