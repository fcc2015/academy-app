import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import {
    Users,
    CalendarCheck,
    Save,
    CheckCircle2,
    XCircle,
    Clock,
    ShieldAlert,
    QrCode
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const CoachAttendance = () => {
    const [squads, setSquads] = useState([]);
    const [players, setPlayers] = useState([]);
    const [selectedSquad, setSelectedSquad] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanFeedback, setScanFeedback] = useState({ show: false, message: '', type: '' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userId = localStorage.getItem('user_id');
                
                // 1. Check Cache
                const cachedPlayers = sessionStorage.getItem('all_players');
                if (cachedPlayers) {
                    setPlayers(JSON.parse(cachedPlayers));
                }

                // 2. Parallel Fetches
                const [squadsRes, playersRes] = await Promise.all([
                    fetch(`${API_URL}/squads/coach/${userId}`).catch(() => null),
                    cachedPlayers ? Promise.resolve(null) : fetch(`${API_URL}/players/`).catch(() => null)
                ]);

                if (squadsRes?.ok) {
                    const sData = await squadsRes.json().catch(() => []);
                    setSquads(Array.isArray(sData) ? sData : []);
                }

                if (playersRes?.ok) {
                    const pData = await playersRes.json().catch(() => []);
                    if (Array.isArray(pData)) {
                        setPlayers(pData);
                        sessionStorage.setItem('all_players', JSON.stringify(pData));
                    }
                }
            } catch (error) {
                console.error('Coach Attendance Performance Error:', error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedSquad && selectedDate) loadAttendance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSquad, selectedDate]);

    const loadAttendance = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/attendance/?squad_id=${selectedSquad}&date=${selectedDate}`);
            if (res.ok) {
                const existingRecords = await res.json().catch(() => []);
                const safeRecords = Array.isArray(existingRecords) ? existingRecords : [];
                const safePlayers = Array.isArray(players) ? players : [];
                const squadPlayers = safePlayers.filter(p => p && p.squad_id === selectedSquad);
                let initialData = {};
                // Suspended/Pending players default to 'absent', others default to 'present'
                squadPlayers.forEach(p => {
                    if (p) {
                        const isBlocked = p.account_status === 'Suspended' || p.account_status === 'Pending';
                        initialData[p.user_id] = isBlocked ? 'absent' : 'present';
                    }
                });
                safeRecords.forEach(record => { if (record) initialData[record.player_id] = record.status; });
                setAttendanceData(initialData);
            }
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = (playerId, status) => {
        setAttendanceData(prev => ({ ...prev, [playerId]: status }));
    };

    const handleSave = async () => {
        if (!selectedSquad || !selectedDate) return;
        setIsSaving(true);
        try {
            const records = Object.entries(attendanceData).map(([player_id, status]) => ({
                player_id, status, notes: ''
            }));
            const res = await fetch(`${API_URL}/attendance/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ squad_id: selectedSquad, date: selectedDate, records })
            });
            if (res.ok) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Error saving attendance:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const safePlayers = Array.isArray(players) ? players : [];
    const currentSquadPlayers = safePlayers.filter(p => p && p.squad_id === selectedSquad);

    const onScanResult = (decodedText) => {
        try {
            const data = JSON.parse(decodedText);
            if (data && data.id) {
                const player = currentSquadPlayers.find(p => p.user_id === data.id);
                if (player) {
                    if (player.account_status === 'Suspended') {
                        setScanFeedback({ show: true, message: `Access Denied: ${player.full_name} is Suspended ⛔`, type: 'error' });
                        // Beep sound on error (optional/fail-safe)
                        try { const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'); audio.volume=0.2; audio.play(); } catch { /* ignore audio errors */ }
                    } else if (player.account_status === 'Pending') {
                        setScanFeedback({ show: true, message: `Action Required: ${player.full_name} is Pending ⚠️`, type: 'error' });
                        try { const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'); audio.volume=0.2; audio.play(); } catch { /* ignore audio errors */ }
                    } else if (attendanceData[data.id] !== 'present') {
                        handleStatusChange(data.id, 'present');
                        setScanFeedback({ show: true, message: `Scanned & Present: ${player.full_name} ✅`, type: 'success' });
                    }
                } else {
                    setScanFeedback({ show: true, message: `Player not in this squad! ⚠️`, type: 'error' });
                }
                setTimeout(() => setScanFeedback({ show: false, message: '', type: '' }), 3000);
            }
        } catch {
            // ignore JSON format errors
        }
    };

    const ScannerModal = () => {
        useEffect(() => {
            let scanner = null;
            if (isScannerOpen) {
                scanner = new Html5Qrcode("coach-qr-reader");
                scanner.start(
                    { facingMode: "environment" }, 
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    onScanResult,
                    () => {} 
                ).catch(err => console.error("Scanner error", err));
            }
            return () => {
                if (scanner && isScannerOpen) {
                    scanner.stop().then(() => scanner.clear()).catch(e => console.error(e));
                }
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isScannerOpen]);

        if (!isScannerOpen) return null;

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
                <div className="bg-white rounded-[2rem] overflow-hidden p-8 w-full max-w-sm relative flex flex-col items-center">
                    <button onClick={() => setIsScannerOpen(false)} className="absolute top-4 right-4 bg-slate-100 text-slate-400 hover:text-slate-900 rounded-full p-2 transition-colors">
                        <XCircle size={24}/>
                    </button>
                    <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 mb-6 mt-2">
                        <QrCode size={32} />
                    </div>
                    <h3 className="font-black text-slate-800 text-lg mb-6 tracking-widest uppercase text-center">Scan Player Card</h3>
                    
                    <div className="w-full rounded-2xl overflow-hidden shadow-inner border-4 border-slate-100 bg-black">
                        <div id="coach-qr-reader" className="w-full min-h-[300px]"></div>
                    </div>

                    <p className="mt-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Point phone camera at player badge QR code for automatic attendance</p>
                </div>
            </div>
        );
    };

    const statuses = [
        { id: 'present', label: 'Present', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
        { id: 'absent', label: 'Absent', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
        { id: 'late', label: 'Late', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
        { id: 'excused', label: 'Excused', icon: ShieldAlert, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' }
    ];

    return (
        <div className="animate-fade-in pb-20 text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                        Take <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Attendance</span>
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">Record daily training attendance for your squads</p>
                </div>
                {selectedSquad && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[13px] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-50"
                    >
                        <Save size={18} /> {isSaving ? 'Saving...' : 'Save Register'}
                    </button>
                )}
            </div>

            {saveSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-bold text-center text-sm">
                    ✅ Attendance saved successfully!
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Controls */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-[2rem] border border-slate-200 premium-shadow p-6 space-y-6">
                        <div>
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                                <Users size={16} className="text-emerald-600" /> Select Squad
                            </label>
                            <select
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500/20"
                                value={selectedSquad}
                                onChange={(e) => setSelectedSquad(e.target.value)}
                            >
                                <option value="">-- Choose a Squad --</option>
                                {squads.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
                                <CalendarCheck size={16} className="text-emerald-600" /> Training Date
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500/20"
                            />
                        </div>

                        {selectedSquad && (
                            <div className="pt-6 border-t border-slate-100">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Summary</h4>
                                <div className="space-y-3">
                                    {statuses.map(s => {
                                        const count = Object.values(attendanceData).filter(val => val === s.id).length;
                                        return (
                                            <div key={s.id} className="flex justify-between items-center text-sm font-bold">
                                                <span className={`${s.color} flex items-center gap-2`}><s.icon size={14} /> {s.label}</span>
                                                <span className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">{count}</span>
                                            </div>
                                        );
                                    })}
                                    <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center text-sm font-black text-slate-900">
                                        <span>Total</span>
                                        <span>{currentSquadPlayers.length}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Roster */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-[2rem] border border-slate-200 premium-shadow overflow-hidden min-h-[500px]">
                        
                        {/* Header options inside roster */}
                        {selectedSquad && (
                            <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center sm:flex-row flex-col gap-4">
                                <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2"><Users size={20} className="text-emerald-500" /> Player Roster</h2>
                                
                                <button 
                                    onClick={() => setIsScannerOpen(true)}
                                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform shadow-lg shadow-emerald-500/30"
                                >
                                    <QrCode size={16} /> Scan QR Badge
                                </button>
                            </div>
                        )}

                        {scanFeedback.show && (
                            <div className={`p-3 text-center text-xs font-black uppercase tracking-widest border-b ${scanFeedback.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                {scanFeedback.message}
                            </div>
                        )}

                        {!selectedSquad ? (
                            <div className="h-[500px] flex flex-col justify-center items-center text-center p-8">
                                <Users className="text-slate-200 mb-6" size={48} />
                                <h3 className="text-xl font-black text-slate-900 mb-2">No Squad Selected</h3>
                                <p className="text-slate-500 font-medium max-w-sm">Select a squad from the panel to load their attendance roster.</p>
                            </div>
                        ) : isLoading ? (
                            <div className="h-[500px] flex flex-col justify-center items-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
                                <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Loading roster...</p>
                            </div>
                        ) : currentSquadPlayers.length === 0 ? (
                            <div className="h-[500px] flex flex-col justify-center items-center text-center p-8">
                                <Users className="text-slate-200 mb-4" size={48} />
                                <p className="text-slate-500 font-medium">This squad has no players assigned.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {currentSquadPlayers.map((player, idx) => (
                                    <div key={player.user_id} className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 font-black flex items-center justify-center shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-extrabold text-slate-900 text-[15px]">{player.full_name}</h4>
                                                    {player.account_status === 'Suspended' && (
                                                        <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">⛔ Suspended</span>
                                                    )}
                                                    {player.account_status === 'Pending' && (
                                                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">⚠️ Pending</span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-medium text-slate-500">{player.u_category}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full md:w-auto shrink-0 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/50">
                                            {statuses.map(status => {
                                                const isActive = attendanceData[player.user_id] === status.id;
                                                const Icon = status.icon;
                                                const isBlocked = (player.account_status === 'Suspended' || player.account_status === 'Pending') && status.id === 'present';
                                                return (
                                                    <button
                                                        key={status.id}
                                                        onClick={() => !isBlocked && handleStatusChange(player.user_id, status.id)}
                                                        disabled={isBlocked}
                                                        title={isBlocked ? `Cannot mark Present: player is ${player.account_status}` : ''}
                                                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-200
                                                            ${isBlocked
                                                                ? 'text-slate-300 bg-slate-50 cursor-not-allowed ring-1 ring-inset border-slate-200 opacity-50'
                                                                : isActive
                                                                    ? `${status.bg} ${status.color} ring-1 ring-inset ${status.border} shadow-sm`
                                                                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        <Icon size={14} />
                                                        <span className="hidden xl:inline">{status.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ScannerModal />
        </div>
    );
};

export default CoachAttendance;
