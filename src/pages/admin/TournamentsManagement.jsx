import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { Trophy, Users, CalendarDays, Plus, PlusCircle } from 'lucide-react';

const TournamentsManagement = () => {
    const [tournaments, setTournaments] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState(null);
    const [teams, setTeams] = useState([]);
    const [matches, setMatches] = useState([]);
    const [activeTab, setActiveTab] = useState('teams'); // 'teams' | 'matches'
    
    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        const res = await authFetch(`${API_URL}/tournaments/`);
        if (res.ok) setTournaments(await res.json());
    };

    const loadTournamentDetails = async (tourney) => {
        setSelectedLeague(tourney);
        const [teamsRes, matchesRes] = await Promise.all([
            authFetch(`${API_URL}/tournaments/${tourney.id}/teams`),
            authFetch(`${API_URL}/tournaments/${tourney.id}/matches`)
        ]);
        if (teamsRes.ok) setTeams(await teamsRes.json());
        if (matchesRes.ok) setMatches(await matchesRes.json());
    };

    const addTournament = async (e) => {
        e.preventDefault();
        const data = {
            name: e.target.name.value,
            start_date: e.target.start_date.value,
            format: e.target.format.value
        };
        const res = await authFetch(`${API_URL}/tournaments/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            e.target.reset();
            fetchTournaments();
        }
    };

    const addTeam = async (e) => {
        e.preventDefault();
        const data = {
            name: e.target.name.value,
            group_name: e.target.group.value || null
        };
        const res = await authFetch(`${API_URL}/tournaments/${selectedLeague.id}/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            e.target.reset();
            loadTournamentDetails(selectedLeague);
        }
    };

    const addMatch = async (e) => {
        e.preventDefault();
        const data = {
            team_a_id: e.target.team_a.value,
            team_b_id: e.target.team_b.value,
            match_date: new Date().toISOString() // Or get from input
        };
        const res = await authFetch(`${API_URL}/tournaments/${selectedLeague.id}/matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            loadTournamentDetails(selectedLeague);
        }
    };

    const updateMatchScore = async (id, score_a, score_b) => {
        const res = await authFetch(`${API_URL}/tournaments/matches/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score_a, score_b, status: 'Completed' })
        });
        if (res.ok) loadTournamentDetails(selectedLeague);
    };

    return (
        <div className="animate-fade-in pb-10">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-6 flex items-center gap-3">
                <Trophy className="text-indigo-600" /> Tournaments (دوري)
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* Left Sidebar: Tournaments List */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 premium-shadow">
                    <h3 className="font-bold text-lg mb-4">New League</h3>
                    <form onSubmit={addTournament} className="space-y-3 mb-6">
                        <input name="name" placeholder="Tournament Name" required className="w-full px-3 py-2 border rounded-xl" />
                        <input name="start_date" type="date" required className="w-full px-3 py-2 border rounded-xl" />
                        <select name="format" className="w-full px-3 py-2 border rounded-xl">
                            <option value="League">League / Group</option>
                            <option value="Knockout">Knockout / Cup</option>
                        </select>
                        <button className="w-full bg-indigo-600 text-white font-bold py-2 rounded-xl">Create</button>
                    </form>

                    <h3 className="font-bold text-lg mb-4">Competitions</h3>
                    <div className="space-y-2">
                        {tournaments.map(t => (
                            <div 
                                key={t.id} 
                                onClick={() => loadTournamentDetails(t)}
                                className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedLeague?.id === t.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'hover:bg-slate-50 text-slate-800'}`}
                            >
                                <div className="font-black truncate">{t.name}</div>
                                <div className={`text-xs ${selectedLeague?.id === t.id ? 'text-indigo-200' : 'text-slate-500'}`}>{t.format}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content: Teams & Matches */}
                <div className="md:col-span-3 bg-white p-6 md:p-8 rounded-2xl border border-slate-200 premium-shadow min-h-[600px]">
                    {selectedLeague ? (
                        <>
                            <div className="flex justify-between items-center mb-8 pb-4 border-b">
                                <div>
                                    <h2 className="text-2xl font-black">{selectedLeague.name}</h2>
                                    <p className="text-slate-500 text-sm">Status: {selectedLeague.status}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setActiveTab('teams')}
                                        className={`px-4 py-2 font-bold rounded-xl transition-all ${activeTab === 'teams' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        Standings / Teams
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('matches')}
                                        className={`px-4 py-2 font-bold rounded-xl transition-all ${activeTab === 'matches' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        Matches & Scores
                                    </button>
                                </div>
                            </div>

                            {activeTab === 'teams' && (
                                <div className="space-y-6 animate-fade-in">
                                    <form onSubmit={addTeam} className="flex gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <input name="name" placeholder="Team Name (e.g. U14 Hawks)" required className="flex-1 px-4 py-2 border rounded-lg" />
                                        <input name="group" placeholder="Group (e.g. A)" className="w-24 px-4 py-2 border rounded-lg" />
                                        <button className="bg-emerald-600 text-white font-bold px-6 rounded-lg"><Plus size={20}/></button>
                                    </form>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="text-xs uppercase tracking-widest text-slate-400 border-b">
                                                    <th className="pb-3 pl-2">Pos</th>
                                                    <th className="pb-3">Team</th>
                                                    <th className="pb-3">Gr</th>
                                                    <th className="pb-3">W</th>
                                                    <th className="pb-3">D</th>
                                                    <th className="pb-3">L</th>
                                                    <th className="pb-3">GF</th>
                                                    <th className="pb-3">Pts</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {teams.length === 0 ? <tr><td colSpan="8" className="text-center py-6 text-slate-400">No teams added yet</td></tr> : null}
                                                {teams.map((t, i) => (
                                                    <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                                                        <td className="py-4 pl-2 font-bold text-slate-400">{i + 1}</td>
                                                        <td className="font-extrabold text-slate-800">{t.name}</td>
                                                        <td className="text-slate-500 font-bold">{t.group_name || '-'}</td>
                                                        <td>{t.wins}</td>
                                                        <td>{t.draws}</td>
                                                        <td>{t.losses}</td>
                                                        <td>{t.goals_for}</td>
                                                        <td className="font-black text-indigo-600 text-lg">{t.points}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'matches' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row gap-3">
                                        <select id="team_a_select" className="flex-1 px-4 py-2 border rounded-lg font-bold text-slate-700">
                                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <div className="flex items-center justify-center font-black text-slate-300">VS</div>
                                        <select id="team_b_select" className="flex-1 px-4 py-2 border rounded-lg font-bold text-slate-700">
                                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <button 
                                            onClick={() => addMatch({ preventDefault: () => {}, target: { team_a: {value: document.getElementById('team_a_select').value}, team_b: {value: document.getElementById('team_b_select').value} }})}
                                            className="bg-indigo-600 text-white font-bold px-6 rounded-lg whitespace-nowrap"
                                        >
                                            Schedule
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {matches.map(m => (
                                            <div key={m.id} className="border rounded-xl p-4 flex flex-col gap-3 hover:border-indigo-200 transition-colors">
                                                <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                    <span>{m.status}</span>
                                                </div>
                                                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                    <div className="font-extrabold text-slate-800 text-right flex-1 truncate px-2">{m.team_a?.name || 'TBD'}</div>
                                                    
                                                    {m.status === 'Completed' ? (
                                                        <div className="px-3 py-1 bg-slate-800 text-white font-black rounded mx-2 text-lg">
                                                            {m.score_a} - {m.score_b}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 mx-2">
                                                            <input type="number" id={`score_a_${m.id}`} className="w-10 text-center border rounded font-bold p-1" placeholder="0"/>
                                                            <span>-</span>
                                                            <input type="number" id={`score_b_${m.id}`} className="w-10 text-center border rounded font-bold p-1" placeholder="0"/>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="font-extrabold text-slate-800 text-left flex-1 truncate px-2">{m.team_b?.name || 'TBD'}</div>
                                                </div>
                                                {m.status !== 'Completed' && (
                                                    <button 
                                                        onClick={() => {
                                                            const sa = document.getElementById(`score_a_${m.id}`).value;
                                                            const sb = document.getElementById(`score_b_${m.id}`).value;
                                                            if(sa !== '' && sb !== '') updateMatchScore(m.id, parseInt(sa), parseInt(sb));
                                                        }}
                                                        className="w-full text-center text-sm font-bold text-indigo-600 hover:bg-indigo-50 py-2 rounded-lg"
                                                    >
                                                        Save Final Score
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {matches.length === 0 && <div className="col-span-2 text-center text-slate-400 py-10">No matches scheduled</div>}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                            <Trophy size={48} className="mb-4 text-slate-200" />
                            <h3 className="text-xl font-bold text-slate-700">Competitions Center</h3>
                            <p className="max-w-xs mt-2">Select a tournament from the left panel to manage teams, matches, and standings.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default TournamentsManagement;
