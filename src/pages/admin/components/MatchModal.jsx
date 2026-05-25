import React from 'react';
import { Trophy, X, Clock, LandPlot } from 'lucide-react';

const MatchModal = ({
    isOpen,
    onClose,
    onSubmit,
    isEditMode,
    formData,
    handleInputChange,
    squads = [],
    t,
    isRTL,
    dir,
    DURATION_OPTIONS = ['2x20', '2x25', '2x30', '2x35', '2x40', '2x45'],
    tournamentsList = [],
    terrains = [],
    ageCategories = [],
    convokedPlayersList = [],
    onAttendanceChange
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in text-right" dir="rtl">
            <div className="bg-white rounded-[2.5rem] w-full max-w-xl premium-shadow overflow-hidden border border-slate-200">
                <div className="px-10 py-8 border-b border-slate-100 bg-fuchsia-50 flex justify-between items-center flex-row-reverse">
                    <h3 className="font-black text-fuchsia-900 text-2xl tracking-tight flex items-center gap-3">
                        <Trophy size={24} /> {isEditMode ? t('matches.updateMatch') : t('matches.scheduleNew')}
                    </h3>
                    <button onClick={onClose} className="text-fuchsia-400 hover:text-fuchsia-600 p-2 hover:bg-white rounded-full transition-all">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-10 space-y-6 text-right">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('matches.ourSquad')}</label>
                            <select
                                name="squad_id"
                                value={formData.squad_id}
                                onChange={handleInputChange}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm cursor-pointer appearance-none text-right"
                            >
                                {squads.map(sq => (
                                    <option key={sq.id} value={sq.id}>{sq.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('matches.opponent')}</label>
                            <input
                                type="text"
                                name="opponent_name"
                                value={formData.opponent_name}
                                onChange={handleInputChange}
                                required
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-fuchsia-500/10 text-right shadow-sm"
                                placeholder={t('matches.opponentPlaceholder')}
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('matches.dateTime')}</label>
                            <input
                                type="datetime-local"
                                name="match_date"
                                value={formData.match_date}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-fuchsia-500/10 text-right shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                                <Clock size={11} /> Durée
                            </label>
                            <select
                                name="match_duration"
                                value={formData.match_duration}
                                onChange={handleInputChange}
                                className="w-full px-3 py-4 bg-purple-50 border border-purple-200 rounded-2xl text-sm font-black outline-none cursor-pointer appearance-none text-center"
                            >
                                {DURATION_OPTIONS.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2 text-center">{t('matches.ourGoals')}</label>
                            <input
                                type="number"
                                name="our_score"
                                value={formData.our_score}
                                onChange={handleInputChange}
                                required min="0" step="1"
                                className="w-full bg-white text-center text-2xl font-black text-emerald-600 rounded-xl py-2 outline-none border border-emerald-200 focus:ring-4 focus:ring-emerald-500/20"
                            />
                        </div>
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-red-600 mb-2 text-center">{t('matches.theirGoals')}</label>
                            <input
                                type="number"
                                name="their_score"
                                value={formData.their_score}
                                onChange={handleInputChange}
                                required min="0" step="1"
                                className="w-full bg-white text-center text-2xl font-black text-red-600 rounded-xl py-2 outline-none border border-red-200 focus:ring-4 focus:ring-red-500/20"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{t('matches.status')}</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none shadow-sm cursor-pointer appearance-none text-right"
                            >
                                <option value="Scheduled">{t('matches.scheduled')}</option>
                                <option value="Completed">{t('matches.completed')}</option>
                                <option value="Cancelled">{t('matches.cancelled')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                                <Trophy size={11} /> Competition / Tournament
                            </label>
                            {tournamentsList.length > 0 ? (
                                <select
                                    name="match_type"
                                    value={formData.match_type}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-black uppercase outline-none shadow-sm cursor-pointer appearance-none text-right tracking-wider"
                                >
                                    <option value="Friendly">FRIENDLY / AMICAL</option>
                                    {tournamentsList.map(tn => (
                                        <option key={tn} value={tn}>{tn}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 text-center">
                                    ⚠️ No tournaments defined. Add them in Settings first.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                                <LandPlot size={11} /> Terrain / Pitch
                            </label>
                            {terrains.length > 0 ? (
                                <select
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-black outline-none shadow-sm cursor-pointer appearance-none text-right"
                                >
                                    <option value="Home">🏠 Home</option>
                                    <option value="Away">✈️ Away</option>
                                    {terrains.map((tr, i) => (
                                        <option key={i} value={`${tr.name} (${tr.size})`}>
                                            {tr.name} — {tr.size}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none shadow-sm text-right"
                                    placeholder={t('matches.venuePlaceholder')}
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Category (U)</label>
                            {ageCategories.length > 0 ? (
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-black outline-none shadow-sm cursor-pointer appearance-none text-right"
                                >
                                    {ageCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    placeholder="U13, U15..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none shadow-sm text-right"
                                />
                            )}
                        </div>
                    </div>

                    {/* Match Attendance — حاضر/غائب — shown in edit mode when players are convoked */}
                    {isEditMode && convokedPlayersList.length > 0 && (
                        <div className="border-t border-slate-100 pt-6">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                                ✅ {isRTL ? 'الحضور والغياب' : 'Attendance'}
                            </label>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {convokedPlayersList.map(player => {
                                    const attendance = formData.match_attendance || {};
                                    const status = attendance[player.id] || 'absent';
                                    return (
                                        <div key={player.id} className="flex items-center justify-between bg-slate-50 rounded-2xl px-4 py-2.5">
                                            <span className="text-sm font-bold text-slate-700">{player.full_name}</span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => onAttendanceChange && onAttendanceChange(player.id, 'present')}
                                                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                                        status === 'present'
                                                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                                            : 'bg-white border border-slate-200 text-slate-400 hover:border-emerald-300'
                                                    }`}
                                                >
                                                    {isRTL ? 'حاضر' : 'Present'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onAttendanceChange && onAttendanceChange(player.id, 'absent')}
                                                    className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                                        status === 'absent'
                                                            ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
                                                            : 'bg-white border border-slate-200 text-slate-400 hover:border-red-300'
                                                    }`}
                                                >
                                                    {isRTL ? 'غائب' : 'Absent'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="pt-6 flex gap-4 justify-end items-center border-t border-slate-100 mt-4 flex-row-reverse">
                        <button type="submit" className="flex-1 py-5 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-fuchsia-600/20 hover:shadow-fuchsia-600/40 transition-all transform active:scale-95">
                            {isEditMode ? t('ui.saveChanges') : t('matches.scheduleMatch')}
                        </button>
                        <button type="button" onClick={onClose} className="px-10 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">
                            {t('common.cancel')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MatchModal;
