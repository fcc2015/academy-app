import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import {
    Users2,
    Shield,
    Plus,
    Edit2,
    Trash2,
    Calendar,
    Search,
    X,
    CheckCircle,
    AlertCircle,
    ArrowRight,
    ArrowLeft,
    Loader2
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

const SquadsManagement = () => {
    const [squads, setSquads] = useState([]);
    const [coaches, setCoaches] = useState([]);
    const [players, setPlayers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
    const [currentRosterSquad, setCurrentRosterSquad] = useState(null);
    const [rosterData, setRosterData] = useState([]);
    const [isSavingRoster, setIsSavingRoster] = useState(false);
    const [editingSquad, setEditingSquad] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category: 'U11',
        coach_id: '',
        schedule: '',
        max_players: 20
    });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
    const toast = useToast();

    const showBanner = (message, type = 'success') => {
        if (type === 'error') toast.error(message);
        else toast.success(message);
    };

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.classList.toggle('modal-open', showModal || isRosterModalOpen);
        return () => document.body.classList.remove('modal-open');
    }, [showModal, isRosterModalOpen]);

    const categoryOptions = ['U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'Senior'];

    useEffect(() => {
        fetchSquads();
        fetchCoaches();
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        try {
            const res = await authFetch(`${API_URL}/players/`);
            if (res.ok) setPlayers(await res.json());
        } catch (error) { console.error('Error fetching players:', error); }
    };

    const fetchSquads = async () => {
        setIsLoading(true);
        try {
            const res = await authFetch(`${API_URL}/squads/`);
            if (res.ok) {
                const data = await res.json();
                setSquads(data);
            }
        } catch (error) {
            console.error('Error fetching squads:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCoaches = async () => {
        try {
            const res = await authFetch(`${API_URL}/coaches/`);
            if (res.ok) {
                const data = await res.json();
                setCoaches(data);
            }
        } catch (error) {
            console.error('Error fetching coaches:', error);
        }
    };

    const openModal = (squad = null) => {
        if (squad) {
            setEditingSquad(squad);
            setFormData({
                name: squad.name,
                category: squad.category,
                coach_id: squad.coach_id || '',
                schedule: squad.schedule || '',
                max_players: squad.max_players
            });
        } else {
            setEditingSquad(null);
            setFormData({
                name: '',
                category: 'U11',
                coach_id: coaches.length > 0 ? coaches[0].id : '',
                schedule: '',
                max_players: 20
            });
        }
        setShowModal(true);
    };

    const openRosterModal = (squad) => {
        setCurrentRosterSquad(squad);
        const squadPlayers = players.filter(p => p.squad_id === squad.id);
        setRosterData(squadPlayers.map(p => p.user_id));
        setIsRosterModalOpen(true);
    };

    const handleMoveToSquad = (playerId) => {
        if (rosterData.length >= currentRosterSquad.max_players) {
            showBanner('Squad capacity limit reached!', 'error');
            return;
        }
        setRosterData([...rosterData, playerId]);
    };

    const handleRemoveFromSquad = (playerId) => {
        setRosterData(rosterData.filter(id => id !== playerId));
    };

    const saveRoster = async () => {
        setIsSavingRoster(true);
        try {
            const res = await authFetch(`${API_URL}/squads/${currentRosterSquad.id}/roster`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_ids: rosterData })
            });
            if (res.ok) {
                showBanner('Roster updated successfully!', 'success');
                setIsRosterModalOpen(false);
                fetchPlayers();
            } else {
                showBanner('Error updating roster.', 'error');
            }
        } catch { showBanner('Connection failed.', 'error');
        } finally {
            setIsSavingRoster(false);
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = editingSquad
            ? `${API_URL}/squads/${editingSquad.id}`
            : `${API_URL}/squads/`;
        const method = editingSquad ? 'PATCH' : 'POST';

        const payload = { ...formData };
        if (!payload.coach_id) payload.coach_id = null;

        try {
            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showBanner(editingSquad ? 'Squad updated!' : 'Squad created!', 'success');
                setShowModal(false);
                fetchSquads();
            } else {
                const err = await res.json();
                showBanner(`Error: ${err.detail || 'Failed to save squad'}`, 'error');
            }
        } catch (error) {
            console.error('Error saving squad:', error);
            showBanner('Failed to connect to server.', 'error');
        }
    };

    const handleDelete = (id) => {
        setConfirmDialog({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        try {
            const res = await authFetch(`${API_URL}/squads/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                showBanner('Squad deleted successfully', 'success');
                fetchSquads();
            } else {
                showBanner('Failed to delete squad', 'error');
            }
        } catch (error) {
            console.error('Error deleting squad:', error);
            showBanner('Failed to connect to server', 'error');
        }
    };

    const filteredSquads = squads.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-fade-in pb-20 text-left">
            {/* Toast handled by global provider */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                        Squads <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">& Teams</span>
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">Organize players into structured teams</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[13px] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20"
                >
                    <Plus size={18} /> New Squad
                </button>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 premium-shadow overflow-hidden">
                <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search squads by name or category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                        />
                    </div>
                </div>

                <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-full py-20 text-center font-bold text-slate-400 italic">Loading squads...</div>
                    ) : filteredSquads.length === 0 ? (
                        <div className="col-span-full py-20 text-center font-bold text-slate-400 italic">No squads found. Create one.</div>
                    ) : (
                        filteredSquads.map((squad) => (
                            <div key={squad.id} className="bg-white rounded-3xl border border-slate-200 premium-shadow group hover:border-indigo-300 transition-all p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                            <Users2 size={24} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900">{squad.name}</h3>
                                            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                {squad.category}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openRosterModal(squad)} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all font-bold text-[10px] uppercase tracking-widest mr-2 flex items-center gap-1">
                                            <Users2 size={14} /> Roster
                                        </button>
                                        <button onClick={() => openModal(squad)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(squad.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                        <Shield size={16} className="text-slate-400" />
                                        <span>Coach: {squad.coaches?.full_name || 'Unassigned'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                        <Calendar size={16} className="text-slate-400" />
                                        <span className="truncate">{squad.schedule || 'No schedule set'}</span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <div className="flex justify-between items-center text-[12px] font-bold text-slate-500 mb-2">
                                        <span>Current Roster</span>
                                        <span>{players.filter(p => p.squad_id === squad.id).length} / {squad.max_players}</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div className={`h-2 rounded-full ${players.filter(p => p.squad_id === squad.id).length >= squad.max_players ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (players.filter(p => p.squad_id === squad.id).length / squad.max_players) * 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200 sm:items-center">
                    <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl premium-shadow border border-slate-100 transform transition-all custom-scrollbar my-auto">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-xl font-black text-slate-900">{editingSquad ? 'Edit Squad' : 'Create New Squad'}</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Squad Name</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. U11 Elite Tigers"
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Category</label>
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                                    >
                                        {categoryOptions.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Lead Coach</label>
                                    <select
                                        value={formData.coach_id}
                                        onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                                    >
                                        <option value="">-- Unassigned --</option>
                                        {coaches.map(coach => (
                                            <option key={coach.id} value={coach.id}>{coach.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Training Schedule</label>
                                    <input
                                        value={formData.schedule}
                                        onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                                        placeholder="Mon/Wed 17:00"
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Max Players</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.max_players}
                                        onChange={(e) => setFormData({ ...formData, max_players: parseInt(e.target.value) })}
                                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all mt-4"
                            >
                                {editingSquad ? 'Save Changes' : 'Create Squad'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Roster Builder Modal */}
            {isRosterModalOpen && currentRosterSquad && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl h-[85vh] flex flex-col rounded-[2rem] shadow-2xl premium-shadow border border-slate-100 transform transition-all overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Squad Roster Builder</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-black uppercase tracking-widest text-indigo-600">{currentRosterSquad.name}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{currentRosterSquad.category}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className={`text-[10px] font-black uppercase ${rosterData.length >= currentRosterSquad.max_players ? 'text-red-500' : 'text-emerald-500'}`}>Capacity: {rosterData.length} / {currentRosterSquad.max_players}</span>
                                </div>
                            </div>
                            <button onClick={() => setIsRosterModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-full border border-transparent hover:border-slate-200 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 flex overflow-hidden p-6 gap-6 bg-slate-50/30">
                            {/* Available Players Column */}
                            <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-600">Available Players</span>
                                    <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-md">{players.filter(p => !rosterData.includes(p.user_id) && p.account_status === 'Active' && p.u_category === currentRosterSquad.category).length}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                    {players.filter(p => !rosterData.includes(p.user_id) && p.account_status === 'Active' && p.u_category === currentRosterSquad.category).length === 0 ? (
                                        <div className="text-center py-10 text-xs font-bold text-slate-400">No active {currentRosterSquad.category} players available.</div>
                                    ) : (
                                        players.filter(p => !rosterData.includes(p.user_id) && p.account_status === 'Active' && p.u_category === currentRosterSquad.category).map(player => (
                                            <div key={player.user_id} className="group flex justify-between items-center p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all bg-white">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                        {player.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-800">{player.full_name}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{player.technical_level === 'A' ? 'PRO Level' : 'Standard'}</div>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleMoveToSquad(player.user_id)} className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                    <ArrowRight size={16} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Current Roster Column */}
                            <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-sm ring-1 ring-emerald-500/10">
                                <div className="p-4 border-b border-slate-100 bg-emerald-50/50 flex justify-between items-center shrink-0">
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-800">Current Roster</span>
                                    <span className={`${rosterData.length >= currentRosterSquad.max_players ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'} text-[10px] font-black px-2 py-0.5 rounded-md`}>
                                        {rosterData.length} / {currentRosterSquad.max_players}
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                    {rosterData.length === 0 ? (
                                        <div className="text-center py-10 text-xs font-bold text-slate-400">Roster is empty. Add players!</div>
                                    ) : (
                                        rosterData.map(playerId => {
                                            const player = players.find(p => p.user_id === playerId);
                                            if (!player) return null;
                                            return (
                                                <div key={player.user_id} className="group flex justify-between items-center p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 hover:border-emerald-300 transition-all">
                                                    <button onClick={() => handleRemoveFromSquad(player.user_id)} className="p-2 bg-white text-red-500 hover:bg-red-500 hover:text-white border border-red-100 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                                                        <ArrowLeft size={16} strokeWidth={2.5} />
                                                    </button>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <div className="text-sm font-bold text-slate-800">{player.full_name}</div>
                                                            <div className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">{player.u_category}</div>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xs">
                                                            {player.full_name?.charAt(0)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsRosterModalOpen(false)} className="px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                            <button onClick={saveRoster} disabled={isSavingRoster} className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 min-w-[160px] justify-center">
                                {isSavingRoster ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                Save Roster
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onConfirm={confirmDelete}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
                isRTL={false}
                title="Delete Squad"
                message="Are you sure you want to delete this squad? This cannot be undone."
            />
        </div>
    );
};

export default SquadsManagement;
