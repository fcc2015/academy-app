import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Shield, ChevronRight } from 'lucide-react';

const CoachSquads = () => {
    const [squads, setSquads] = useState([]);
    const [players, setPlayers] = useState([]);
    const [selectedSquad, setSelectedSquad] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userId = localStorage.getItem('user_id');
                const [squadsRes, playersRes] = await Promise.all([
                    fetch(`${API_URL}/squads/coach/${userId}`),
                    fetch(`${API_URL}/players/`)
                ]);
                if (squadsRes.ok) setSquads(await squadsRes.json());
                if (playersRes.ok) setPlayers(await playersRes.json());
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const getSquadPlayers = (squadId) => players.filter(p => p.squad_id === squadId);

    return (
        <div className="animate-fade-in space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                    My <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Squads</span>
                </h1>
                <p className="text-[15px] font-medium text-slate-500">View your assigned squads and player rosters</p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                </div>
            ) : squads.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 premium-shadow p-12 text-center">
                    <Shield className="mx-auto text-slate-300 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-slate-800 mb-2">No Squads Assigned</h3>
                    <p className="text-slate-500 text-sm">You don't have any squads assigned yet. Contact the admin.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Squad Cards */}
                    <div className="lg:col-span-1 space-y-4">
                        {squads.map(squad => {
                            const playerCount = getSquadPlayers(squad.id).length;
                            const isActive = selectedSquad?.id === squad.id;
                            return (
                                <button
                                    key={squad.id}
                                    onClick={() => setSelectedSquad(squad)}
                                    className={`w-full text-left p-5 rounded-2xl border transition-all ${isActive
                                        ? 'bg-emerald-50 border-emerald-300 shadow-lg shadow-emerald-100'
                                        : 'bg-white border-slate-200 hover:border-emerald-200 premium-shadow'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-extrabold text-slate-900 text-lg">{squad.name}</h3>
                                            <p className="text-sm font-medium text-slate-500 mt-1">{squad.category}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-slate-100 text-slate-700 text-xs font-black px-3 py-1.5 rounded-lg">
                                                {playerCount} <Users size={12} className="inline" />
                                            </span>
                                            <ChevronRight size={16} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Player Roster */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-slate-200 premium-shadow overflow-hidden min-h-[400px]">
                            {!selectedSquad ? (
                                <div className="h-[400px] flex flex-col justify-center items-center text-center p-8">
                                    <Users className="text-slate-200 mb-4" size={48} />
                                    <h3 className="text-xl font-black text-slate-900 mb-2">Select a Squad</h3>
                                    <p className="text-slate-500 font-medium max-w-sm">Click on a squad from the left to view its player roster.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                        <h3 className="font-extrabold text-slate-800 text-lg">{selectedSquad.name} — Roster</h3>
                                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                            {getSquadPlayers(selectedSquad.id).length} Players
                                        </span>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {getSquadPlayers(selectedSquad.id).length === 0 ? (
                                            <div className="p-10 text-center text-slate-400 font-bold italic">No players in this squad yet.</div>
                                        ) : getSquadPlayers(selectedSquad.id).map((player, idx) => (
                                            <div key={player.user_id} className="p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                                                <div className={`w-10 h-10 rounded-xl font-black flex items-center justify-center shrink-0 ${player.technical_level === 'A' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-extrabold text-slate-900 text-[15px]">{player.full_name}</h4>
                                                        {player.technical_level === 'A' && (
                                                            <span className="bg-yellow-100 text-yellow-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border border-yellow-200">
                                                                PRO
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-medium text-slate-500">{player.u_category} • {player.position || 'No position'}</p>
                                                </div>
                                                <UserCheck size={18} className="text-emerald-400" />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoachSquads;
