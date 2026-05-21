import React from 'react';
import { Trophy, PlusCircle, Trash2 } from 'lucide-react';

const MatchList = ({
    tableRef,
    filteredMatches,
    t,
    isLoading,
    savingRow,
    savedRow,
    parseRowMeta,
    rowDayStyle,
    dayName,
    isoDate,
    isoTime,
    composeIso,
    updateMatchField,
    buildRowNotes,
    DURATION_OPTIONS,
    coaches,
    ageCategories,
    terrains,
    tournamentsList,
    handleDelete,
    handleAddRow
}) => {
    return (
        <div ref={tableRef} className="overflow-x-auto min-h-[400px] bg-white">
            {/* Export header (visible in PDF/PNG) */}
            <div className="px-6 py-4 border-b-2 border-slate-200 bg-gradient-to-r from-fuchsia-50 to-pink-50 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">PROGRAMMATION DES MATCHS</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-fuchsia-600 mt-1">
                        {filteredMatches.length} matches · Generated {new Date().toLocaleDateString('en-GB')}
                    </p>
                </div>
                <Trophy className="text-fuchsia-400" size={32} />
            </div>

            {/* Day-color legend */}
            <div className="px-6 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest" data-export-skip>
                <span className="text-slate-400">Légende:</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 border border-amber-400" /> VEN</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-cyan-200 border border-cyan-400" /> SAM</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-pink-200 border border-pink-400" /> DIM</span>
                <span className="ml-auto text-slate-400">💾 Auto-save</span>
            </div>

            <table className="w-full text-left border-collapse" dir="ltr">
                <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase tracking-[0.15em] font-black border-b-2 border-slate-300">
                        <th className="px-2 py-3 text-center w-8">#</th>
                        <th className="px-2 py-3 w-12">Jour</th>
                        <th className="px-2 py-3">📅 Date</th>
                        <th className="px-2 py-3">🕐 Heure</th>
                        <th className="px-2 py-3">⏱️ Durée</th>
                        <th className="px-2 py-3">U.</th>
                        <th className="px-2 py-3 text-center">📍 Lieu</th>
                        <th className="px-2 py-3">🏟️ Terrain / Stade</th>
                        <th className="px-2 py-3">🆚 Adversaire</th>
                        <th className="px-2 py-3">🏆 Compétition</th>
                        <th className="px-2 py-3">👤 Coach</th>
                        <th className="px-2 py-3 text-center">👕 Kit</th>
                        <th className="px-2 py-3">État</th>
                        <th className="px-2 py-3 text-center w-16" data-export-skip>⚙</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {isLoading ? (
                        <tr>
                            <td colSpan="14" className="px-8 py-20 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fuchsia-600"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('matches.loadingMatches')}</span>
                                </div>
                            </td>
                        </tr>
                    ) : filteredMatches.length === 0 ? (
                        <tr>
                            <td colSpan="14" className="px-8 py-12 text-center text-slate-300 font-black uppercase tracking-widest text-xs opacity-50">
                                {t('matches.noMatches')} — Click "+ Add Row" below to start
                            </td>
                        </tr>
                    ) : (
                        filteredMatches.map((match, idx) => {
                            const dStyle = rowDayStyle(match.match_date);
                            const dayLabel = dayName(match.match_date);
                            const isSaving = savingRow === match.id;
                            const isSaved = savedRow === match.id;
                            const meta = parseRowMeta(match.notes);
                            const isAway = meta.isAway;
                            const matchDur = meta.duration;

                            return (
                                <tr
                                    key={match.id}
                                    className={`${dStyle.bg} hover:brightness-95 transition-all text-xs border-l-4 ${dStyle.stripe}`}
                                >
                                    <td className="px-2 py-2 text-center font-black text-slate-400">{idx + 1}</td>
                                    <td className={`px-2 py-2 text-center font-black tracking-widest ${dStyle.text}`}>{dayLabel}</td>

                                    {/* Date */}
                                    <td className="px-1 py-1">
                                        <input
                                            type="date"
                                            value={isoDate(match.match_date)}
                                            onChange={(e) => updateMatchField(match.id, { match_date: composeIso(e.target.value, isoTime(match.match_date)) })}
                                            className="w-full px-2 py-1.5 bg-white/80 border border-slate-200 rounded-md text-xs font-black focus:ring-2 focus:ring-fuchsia-400/30 outline-none"
                                        />
                                    </td>

                                    {/* Time */}
                                    <td className="px-1 py-1">
                                        <input
                                            type="time"
                                            value={isoTime(match.match_date)}
                                            onChange={(e) => updateMatchField(match.id, { match_date: composeIso(isoDate(match.match_date), e.target.value) })}
                                            className="w-full px-2 py-1.5 bg-white/80 border border-slate-200 rounded-md text-xs font-black text-fuchsia-700 focus:ring-2 focus:ring-fuchsia-400/30 outline-none"
                                        />
                                    </td>

                                    {/* Durée */}
                                    <td className="px-1 py-1">
                                        <select
                                            value={matchDur || '2x30'}
                                            onChange={(e) => updateMatchField(match.id, { notes: buildRowNotes({ ...meta, duration: e.target.value }) })}
                                            className="w-full px-2 py-1.5 bg-purple-50 border border-purple-200 rounded-md text-xs font-black uppercase outline-none cursor-pointer"
                                        >
                                            {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </td>

                                    {/* Catégorie U — auto-fills coach if a coach is assigned to that U */}
                                    <td className="px-1 py-1">
                                        <select
                                            value={match.category || ''}
                                            onChange={(e) => {
                                                const newCat = e.target.value;
                                                const patch = { category: newCat };
                                                // Auto-fill coach name if not already typed
                                                if (newCat && !meta.coachName) {
                                                    const c = coaches.find(co => (co.u_category || '').toUpperCase() === newCat.toUpperCase());
                                                    if (c) {
                                                        patch.notes = buildRowNotes({ ...meta, coachName: c.full_name });
                                                    }
                                                }
                                                updateMatchField(match.id, patch);
                                            }}
                                            className="w-full px-2 py-1.5 bg-indigo-50 border border-indigo-200 rounded-md text-xs font-black uppercase outline-none cursor-pointer"
                                        >
                                            <option value="">—</option>
                                            {ageCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </td>

                                    {/* DAKHIL / KHARIJ toggle */}
                                    <td className="px-1 py-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const goingAway = !isAway;
                                                const newLocation = goingAway ? '' : (terrains[0] ? `${terrains[0].name} (${terrains[0].size})` : 'Home');
                                                updateMatchField(match.id, {
                                                    location: newLocation,
                                                    notes: buildRowNotes({ ...meta, isAway: goingAway }),
                                                });
                                            }}
                                            className={`w-full px-2 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider border transition-all ${isAway
                                                ? 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
                                                : 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200'
                                                }`}
                                            title="Click to toggle Home/Away"
                                        >
                                            {isAway ? '✈ خارج' : '🏠 داخل'}
                                        </button>
                                    </td>

                                    {/* Terrain (Home) OR Stade name (Away) */}
                                    <td className="px-1 py-1">
                                        {isAway ? (
                                            <input
                                                type="text"
                                                value={match.location || ''}
                                                onChange={(e) => updateMatchField(match.id, { location: e.target.value })}
                                                placeholder="Nom du stade / Mal3ab khariji"
                                                className="w-full px-2 py-1.5 bg-orange-50 border border-orange-200 rounded-md text-xs font-black focus:ring-2 focus:ring-orange-400/30 outline-none"
                                            />
                                        ) : (
                                            <select
                                                value={match.location || ''}
                                                onChange={(e) => updateMatchField(match.id, { location: e.target.value })}
                                                className="w-full px-2 py-1.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-black outline-none cursor-pointer"
                                            >
                                                <option value="Home">🏠 Home</option>
                                                {terrains.map((tr, i) => (
                                                    <option key={i} value={`${tr.name} (${tr.size})`}>{tr.name} — {tr.size}</option>
                                                ))}
                                            </select>
                                        )}
                                    </td>

                                    {/* Adversaire */}
                                    <td className="px-1 py-1">
                                        <input
                                            type="text"
                                            value={match.opponent_name || ''}
                                            onChange={(e) => updateMatchField(match.id, { opponent_name: e.target.value })}
                                            placeholder="Ism al-fariq al-monnafis"
                                            className="w-full px-2 py-1.5 bg-white/80 border border-slate-200 rounded-md text-xs font-black focus:ring-2 focus:ring-fuchsia-400/30 outline-none"
                                        />
                                    </td>

                                    {/* Compétition */}
                                    <td className="px-1 py-1">
                                        <select
                                            value={match.match_type || ''}
                                            onChange={(e) => updateMatchField(match.id, { match_type: e.target.value })}
                                            className="w-full px-2 py-1.5 bg-amber-50 border border-amber-200 rounded-md text-xs font-black uppercase outline-none cursor-pointer"
                                        >
                                            <option value="Friendly">FRIENDLY / AMICAL</option>
                                            {tournamentsList.map(tn => <option key={tn} value={tn}>{tn}</option>)}
                                        </select>
                                    </td>

                                    {/* Coach — dropdown filtered by selected U; falls back to all coaches */}
                                    <td className="px-1 py-1">
                                        {(() => {
                                            const cat = (match.category || '').toUpperCase();
                                            const filtered = coaches.filter(c => (c.u_category || '').toUpperCase() === cat);
                                            const list = filtered.length ? filtered : coaches;
                                            const namesInList = list.map(c => c.full_name);
                                            const isCustom = meta.coachName && !namesInList.includes(meta.coachName);
                                            return (
                                                <select
                                                    value={isCustom ? '__custom__' : meta.coachName}
                                                    onChange={(e) => {
                                                        let next = e.target.value;
                                                        if (next === '__custom__') {
                                                            const v = window.prompt('Coach name', meta.coachName || '');
                                                            if (v == null) return;
                                                            next = v;
                                                        }
                                                        updateMatchField(match.id, { notes: buildRowNotes({ ...meta, coachName: next }) });
                                                    }}
                                                    className="w-full px-2 py-1.5 bg-cyan-50 border border-cyan-200 rounded-md text-xs font-black outline-none cursor-pointer"
                                                >
                                                    <option value="">— Coach —</option>
                                                    {filtered.length > 0 && (
                                                        <optgroup label={`Coaches ${match.category}`}>
                                                            {filtered.map(c => <option key={c.id} value={c.full_name}>{c.full_name}</option>)}
                                                        </optgroup>
                                                    )}
                                                    {filtered.length === 0 && coaches.length > 0 && (
                                                        <optgroup label="Tous les coaches">
                                                            {coaches.map(c => <option key={c.id} value={c.full_name}>{c.full_name}{c.u_category ? ` (${c.u_category})` : ''}</option>)}
                                                        </optgroup>
                                                    )}
                                                    {isCustom && <option value={meta.coachName}>{meta.coachName}</option>}
                                                    <option value="__custom__">✏ Autre / Saisir...</option>
                                                </select>
                                            );
                                        })()}
                                    </td>

                                    {/* Kit Color picker */}
                                    <td className="px-1 py-1">
                                        <div className="flex items-center justify-center gap-1">
                                            <input
                                                type="color"
                                                value={meta.kitColor || '#1e40af'}
                                                onChange={(e) => updateMatchField(match.id, { notes: buildRowNotes({ ...meta, kitColor: e.target.value }) })}
                                                className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                                                title="Couleur du maillot"
                                            />
                                            {meta.kitColor && (
                                                <button
                                                    type="button"
                                                    onClick={() => updateMatchField(match.id, { notes: buildRowNotes({ ...meta, kitColor: '' }) })}
                                                    className="text-slate-300 hover:text-red-500 text-xs"
                                                    title="Effacer"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </td>

                                    {/* État */}
                                    <td className="px-1 py-1">
                                        <select
                                            value={match.status || 'Scheduled'}
                                            onChange={(e) => updateMatchField(match.id, { status: e.target.value })}
                                            className="w-full px-2 py-1.5 bg-white/80 border border-slate-200 rounded-md text-xs font-black outline-none cursor-pointer"
                                        >
                                            <option value="Scheduled">⏳ Scheduled</option>
                                            <option value="Postponed">⏸ EN ATTENTE</option>
                                            <option value="Completed">✅ Completed</option>
                                            <option value="Cancelled">❌ REPORTÉ</option>
                                        </select>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-2 py-2 text-center" data-export-skip>
                                        <div className="flex items-center justify-center gap-1">
                                            {isSaving && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Saving..." />}
                                            {isSaved && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Saved" />}
                                            <button
                                                onClick={() => handleDelete(match.id)}
                                                className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                                                title="Delete row"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>

            {/* Add Row button */}
            <div className="px-4 py-3 bg-slate-50/50 border-t-2 border-dashed border-slate-200" data-export-skip>
                <button
                    type="button"
                    onClick={handleAddRow}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-fuchsia-50 border-2 border-dashed border-slate-300 hover:border-fuchsia-400 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-fuchsia-600 transition-all"
                >
                    <PlusCircle size={16} />
                    Add Row (Saturday default)
                </button>
            </div>
        </div>
    );
};

export default MatchList;
