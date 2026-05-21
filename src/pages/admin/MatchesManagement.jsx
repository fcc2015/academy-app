import { authFetch } from '../../api';
import { API_URL } from '../../config';
import React, { useState, useEffect, useRef } from 'react';
import {
    Trophy,
    XCircle,
    Activity,
    PlusCircle,
} from 'lucide-react';
import html2canvas from 'html2canvas';

import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import MatchModal from './components/MatchModal';
import MatchExportTable from './components/MatchExportTable';
import MatchFilters from './components/MatchFilters';
import MatchList from './components/MatchList';

const MatchesManagement = () => {
    const { isRTL, dir, t, formatDate } = useLanguage();
    
    const [matches, setMatches] = useState([]);
    const [squads, setSquads] = useState([]);
    const [academySettings, setAcademySettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [weekendOnly, setWeekendOnly] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
    const toast = useToast();

    const [formData, setFormData] = useState({
        squad_id: '',
        opponent_name: '',
        match_date: new Date().toISOString().slice(0, 16),
        location: 'Home',
        our_score: 0,
        their_score: 0,
        match_type: 'Friendly',
        status: 'Scheduled',
        notes: '',
        category: '',
        match_duration: '2x30',
    });

    const terrains = academySettings?.terrains || [];
    const tournamentsList = academySettings?.tournaments_list || [];
    const ageCategories = academySettings?.age_categories || [];
    const DURATION_OPTIONS = ['2x20', '2x25', '2x30', '2x35', '2x40', '2x45'];

    // Stored as plain text in `notes` so we don't need a DB migration.
    // Format: "[DUR:2x30][AWAY][COACH:Othmane][KIT:#ff0000] free notes"
    const parseRowMeta = (notes) => {
        const s = notes || '';
        const dur = s.match(/\[DUR:([^\]]+)\]/);
        const coach = s.match(/\[COACH:([^\]]+)\]/);
        const kit = s.match(/\[KIT:([^\]]+)\]/);
        const isAway = /\[AWAY\]/.test(s);
        const cleanNotes = s
            .replace(/\[DUR:[^\]]+\]/g, '')
            .replace(/\[COACH:[^\]]+\]/g, '')
            .replace(/\[KIT:[^\]]+\]/g, '')
            .replace(/\[AWAY\]/g, '')
            .trim();
        return {
            duration: dur ? dur[1] : '',
            coachName: coach ? coach[1] : '',
            kitColor: kit ? kit[1] : '',
            isAway,
            cleanNotes,
        };
    };
    const buildRowNotes = ({ duration, isAway, coachName, kitColor, cleanNotes }) => {
        let out = '';
        if (duration) out += `[DUR:${duration}]`;
        if (isAway) out += '[AWAY]';
        if (coachName) out += `[COACH:${coachName}]`;
        if (kitColor) out += `[KIT:${kitColor}]`;
        if (cleanNotes) out += (out ? ' ' : '') + cleanNotes;
        return out;
    };
    // Backwards-compat helpers used elsewhere in this file
    const parseDuration = (notes) => {
        const meta = parseRowMeta(notes);
        return { duration: meta.duration, cleanNotes: meta.cleanNotes };
    };
    const buildNotes = (duration, cleanNotes) => buildRowNotes({ duration, isAway: false, cleanNotes });
    const matchDuration = (m) => parseRowMeta(m?.notes).duration || '—';

    const tableRef = useRef(null);
    const exportRef = useRef(null);
    const [exportOpen, setExportOpen] = useState(false);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, []);

    const [matchManagers, setMatchManagers] = useState([]);
    const [coaches, setCoaches] = useState([]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [matchesRes, squadsRes, settingsRes, adminsRes, coachesRes] = await Promise.all([
                authFetch(`${API_URL}/matches/`),
                authFetch(`${API_URL}/squads/`).catch(() => ({ ok: false })),
                authFetch(`${API_URL}/settings/`).catch(() => ({ ok: false })),
                authFetch(`${API_URL}/admins/`).catch(() => ({ ok: false })),
                authFetch(`${API_URL}/coaches/`).catch(() => ({ ok: false })),
            ]);

            if (matchesRes.ok) {
                const data = await matchesRes.json();
                setMatches(data || []);
            }
            if (squadsRes && squadsRes.ok) {
                const sqData = await squadsRes.json();
                setSquads(sqData || []);
                if (sqData && sqData.length > 0) {
                    setFormData(prev => ({ ...prev, squad_id: sqData[0].id }));
                }
            } else {
                setSquads([{ id: 'default', name: t('matches.ourTeam') }]);
                setFormData(prev => ({ ...prev, squad_id: 'default' }));
            }
            if (settingsRes && settingsRes.ok) {
                setAcademySettings(await settingsRes.json());
            }
            if (adminsRes && adminsRes.ok) {
                const adminsData = await adminsRes.json();
                const managers = (adminsData || []).filter(a =>
                    a.admin_type === 'match_manager' || a.permissions?.can_manage_matches
                );
                setMatchManagers(managers);
            }
            if (coachesRes && coachesRes.ok) {
                setCoaches(await coachesRes.json());
            }
        } catch (error) {
            console.error('Error fetching matches:', error);
            showBanner(t('ui.loadError'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const showBanner = (message, type = 'success') => {
        if (type === 'error') toast.error(message);
        else toast.success(message);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const defaultMatchType = () => (tournamentsList[0] || 'Friendly');
    const defaultLocation = () => (terrains[0] ? `${terrains[0].name} (${terrains[0].size})` : 'Home');

    const handleAddClick = () => {
        setFormData({
            squad_id: squads.length > 0 ? squads[0].id : '',
            opponent_name: '',
            match_date: new Date().toISOString().slice(0, 16),
            location: defaultLocation(),
            our_score: 0,
            their_score: 0,
            match_type: defaultMatchType(),
            status: 'Scheduled',
            notes: '',
            category: ageCategories[0] || '',
            match_duration: '2x30',
        });
        setIsEditMode(false);
        setEditingId(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (match) => {
        const { duration, cleanNotes } = parseDuration(match.notes);
        setFormData({
            squad_id: match.squad_id,
            opponent_name: match.opponent_name,
            match_date: new Date(match.match_date).toISOString().slice(0, 16),
            location: match.location || defaultLocation(),
            our_score: match.our_score || 0,
            their_score: match.their_score || 0,
            match_type: match.match_type || defaultMatchType(),
            status: match.status || 'Scheduled',
            notes: cleanNotes,
            category: match.category || (ageCategories[0] || ''),
            match_duration: duration || '2x30',
        });
        setIsEditMode(true);
        setEditingId(match.id);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = isEditMode ? `${API_URL}/matches/${editingId}` : `${API_URL}/matches/`;
            const method = isEditMode ? 'PATCH' : 'POST';
            
            const { match_duration, ...rest } = formData;
            const payload = {
                ...rest,
                notes: buildNotes(match_duration, formData.notes),
                our_score: parseInt(formData.our_score),
                their_score: parseInt(formData.their_score),
                match_date: new Date(formData.match_date).toISOString(),
                category: formData.category || null,
            };

            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save match');
            
            setIsModalOpen(false);
            fetchData();
            showBanner(isEditMode ? t('ui.updated') : t('ui.added'), 'success');
        } catch { showBanner(t('ui.saveError'), 'error');
        }
    };

    const handleDelete = (id) => {
        setConfirmDialog({ isOpen: true, id });
    };

    // ─── Inline edit helpers (Excel-like) ─────────────────
    const [savingRow, setSavingRow] = useState(null); // match id currently saving
    const [savedRow, setSavedRow] = useState(null);   // match id flashed green
    const saveTimers = useRef({});

    const updateMatchField = (matchId, patch) => {
        setMatches(prev => prev.map(m => m.id === matchId ? { ...m, ...patch } : m));
        if (saveTimers.current[matchId]) clearTimeout(saveTimers.current[matchId]);
        saveTimers.current[matchId] = setTimeout(() => persistMatch(matchId, patch), 500);
    };

    const persistMatch = async (matchId, patch) => {
        setSavingRow(matchId);
        try {
            const current = matches.find(m => m.id === matchId);
            const merged = { ...current, ...patch };
            const body = {
                squad_id: merged.squad_id,
                opponent_name: merged.opponent_name,
                match_date: new Date(merged.match_date).toISOString(),
                location: merged.location,
                our_score: parseInt(merged.our_score) || 0,
                their_score: parseInt(merged.their_score) || 0,
                match_type: merged.match_type,
                status: merged.status,
                notes: merged.notes,
                category: merged.category || null,
            };
            const res = await authFetch(`${API_URL}/matches/${matchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Save failed');
            setSavedRow(matchId);
            setTimeout(() => setSavedRow(null), 1200);
        } catch (e) {
            toast.error('Save failed');
        } finally {
            setSavingRow(null);
        }
    };

    const handleAddRow = async () => {
        try {
            const sat = nextSaturday();
            const realSquad = squads.find(s => s.id !== 'default');
            const newRow = {
                opponent_name: 'New Opponent',
                match_date: sat.toISOString(),
                location: defaultLocation(),
                our_score: 0,
                their_score: 0,
                match_type: defaultMatchType(),
                status: 'Scheduled',
                notes: buildNotes('2x30', ''),
                category: ageCategories[0] || null,
            };
            if (realSquad) newRow.squad_id = realSquad.id;
            const res = await authFetch(`${API_URL}/matches/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRow),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || `HTTP ${res.status}`);
            }
            await fetchData();
        } catch (e) {
            console.error('Add row error:', e);
            toast.error(`Failed to add row: ${e.message}`);
        }
    };

    const nextSaturday = () => {
        const d = new Date();
        const diff = (6 - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        d.setHours(15, 0, 0, 0);
        return d;
    };

    // Color mapping by day-of-week
    const dayColors = {
        0: { bg: 'bg-pink-50', stripe: 'border-l-pink-500', label: 'DIM', text: 'text-pink-700' },        // Sunday
        5: { bg: 'bg-amber-50', stripe: 'border-l-amber-500', label: 'VEN', text: 'text-amber-700' },     // Friday
        6: { bg: 'bg-cyan-50', stripe: 'border-l-cyan-500', label: 'SAM', text: 'text-cyan-700' },        // Saturday
    };
    const rowDayStyle = (iso) => {
        const day = new Date(iso).getDay();
        return dayColors[day] || { bg: '', stripe: 'border-l-slate-200', label: '—', text: 'text-slate-500' };
    };
    const dayName = (iso) => {
        const d = new Date(iso).getDay();
        return ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'][d];
    };
    const isoDate = (iso) => {
        const d = new Date(iso);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };
    const isoTime = (iso) => {
        const d = new Date(iso);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };
    const composeIso = (date, time) => {
        if (!date) return new Date().toISOString();
        const [y, m, d] = date.split('-').map(Number);
        const [h = 15, min = 0] = (time || '15:00').split(':').map(Number);
        return new Date(y, m - 1, d, h, min).toISOString();
    };

    const confirmDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        try {
            const res = await authFetch(`${API_URL}/matches/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setMatches(prev => prev.filter(m => m.id !== id));
                showBanner(t('ui.deleted'), 'success');
            } else {
                throw new Error('Failed to delete');
            }
        } catch { showBanner(t('ui.deleteError'), 'error'); }
    };

    const isWeekend = (iso) => {
        if (!iso) return false;
        const d = new Date(iso).getDay();
        return d === 0 || d === 6 || d === 5; // Fri/Sat/Sun
    };

    const filteredMatches = matches.filter(m => {
        const matchesSearch = m.opponent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.match_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesWeekend = !weekendOnly || isWeekend(m.match_date);
        return matchesSearch && matchesWeekend;
    }).sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

    // ─── Exports ──────────────────────────────────────────
    const formatRow = (m) => {
        const d = new Date(m.match_date);
        const date = d.toLocaleDateString('en-GB');
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const meta = parseRowMeta(m.notes);
        return {
            Date: date,
            Day: dayName(m.match_date),
            Time: time,
            Duration: meta.duration || '—',
            Category: m.category || '—',
            Lieu: meta.isAway ? 'Khariji (Away)' : 'Dakhili (Home)',
            'Terrain/Stade': m.location || '—',
            Opponent: m.opponent_name || '',
            Tournament: m.match_type || '—',
            Status: m.status || 'Scheduled',
        };
    };

    const exportExcel = async () => {
        try {
            const XLSX = await import('xlsx');
            const rows = filteredMatches.map(formatRow);
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Programmation');
            XLSX.writeFile(wb, `match-programmation-${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (e) {
            console.error(e);
            toast.error('Excel export failed');
        }
        setExportOpen(false);
    };

    const captureTarget = () => exportRef.current || tableRef.current;

    const exportImage = async () => {
        const target = captureTarget();
        if (!target) return;
        try {
            const canvas = await html2canvas(target, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
            });
            const link = document.createElement('a');
            link.download = `match-programmation-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error(e);
            toast.error('Image export failed');
        }
        setExportOpen(false);
    };

    const exportPDF = async () => {
        const target = captureTarget();
        if (!target) return;
        try {
            const { jsPDF } = await import('jspdf');
            const canvas = await html2canvas(target, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
            });
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const ratio = canvas.height / canvas.width;
            let imgWidth = pageWidth - 20;
            let imgHeight = imgWidth * ratio;
            if (imgHeight > pageHeight - 20) {
                imgHeight = pageHeight - 20;
                imgWidth = imgHeight / ratio;
            }
            pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
            pdf.save(`match-programmation-${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (e) {
            console.error(e);
            toast.error('PDF export failed');
        }
        setExportOpen(false);
    };

    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'Completed');
    const wins = completedMatches.filter(m => m.our_score > m.their_score).length;
    const losses = completedMatches.filter(m => m.our_score < m.their_score).length;
    const draws = completedMatches.filter(m => m.our_score === m.their_score).length;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Completed': return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black tracking-widest uppercase">{t('matches.completed')}</span>;
            case 'Scheduled': return <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black tracking-widest uppercase">{t('matches.scheduled')}</span>;
            case 'Cancelled': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black tracking-widest uppercase">{t('matches.cancelled')}</span>;
            default: return null;
        }
    };
    
    const getTypeBadge = (type) => {
        if (!type) return '';
        switch (type) {
            case 'Friendly': return t('matches.friendly');
            case 'League': return t('matches.league');
            case 'Cup': return t('matches.cup');
            case 'Tournament': return t('matches.tournament');
            default: return type;
        }
    };

    return (
        <div className={`animate-fade-in pb-10 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Toast handled by global provider */}

            <div className={`flex flex-col md:flex-row justify-between items-center mb-8 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h2 className={`text-4xl font-black text-slate-800 tracking-tight flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 bg-fuchsia-600 text-white rounded-2xl shadow-lg shadow-fuchsia-600/30">
                            <Trophy size={32} />
                        </div>
                        {t('matches.title')}
                    </h2>
                    <p className="text-slate-400 font-bold mt-2 tracking-widest text-sm uppercase">{t('matches.subtitle')}</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button
                        onClick={handleAddClick}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-fuchsia-600/20 active:scale-95 transition-all"
                    >
                        <PlusCircle size={20} />
                        <span>{t('matches.newMatch')}</span>
                    </button>
                </div>
            </div>

            {/* Match Managers Banner — optional delegation, admin handles by default */}
            <div className="mb-6 bg-gradient-to-r from-fuchsia-50 via-pink-50 to-fuchsia-50 border border-fuchsia-200 rounded-2xl px-6 py-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-fuchsia-600 text-white flex items-center justify-center">
                        <Trophy size={16} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-fuchsia-500">Match Scheduler</p>
                        <p className="text-xs font-bold text-slate-600">
                            {matchManagers.length > 0
                                ? 'Delegated to:'
                                : 'Managed by Admin (you can optionally delegate to a Match Manager)'}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 ml-auto">
                    {matchManagers.length > 0 ? (
                        matchManagers.map(mgr => (
                            <span key={mgr.id} className="bg-white border border-fuchsia-200 text-fuchsia-800 text-xs font-black px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                {mgr.full_name}
                            </span>
                        ))
                    ) : (
                        <span className="bg-white border border-fuchsia-200 text-fuchsia-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm">
                            Admin
                        </span>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className={`bg-white p-6 rounded-[2rem] border border-slate-200 premium-shadow relative overflow-hidden group hover:border-fuchsia-400 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="absolute top-0 left-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 group-hover:scale-110">
                        <Activity size={80} />
                    </div>
                    <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-2.5 rounded-2xl bg-slate-50 text-slate-600 border border-slate-100 shadow-sm">
                            <Activity size={18} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">
                            {totalMatches}
                        </h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('matches.totalScheduled')}</p>
                    </div>
                </div>

                <div className={`bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 premium-shadow relative overflow-hidden group hover:border-emerald-300 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200">
                            <Trophy size={18} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-3xl font-black text-emerald-700 tracking-tighter mb-1">
                            {wins}
                        </h4>
                        <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-[0.2em]">{t('matches.wins')}</p>
                    </div>
                </div>

                <div className={`bg-amber-50 p-6 rounded-[2rem] border border-amber-100 premium-shadow relative overflow-hidden group hover:border-amber-300 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-600 border border-amber-200">
                            <Activity size={18} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-3xl font-black text-amber-700 tracking-tighter mb-1">
                            {draws}
                        </h4>
                        <p className="text-[10px] font-black text-amber-600/70 uppercase tracking-[0.2em]">{t('matches.draws')}</p>
                    </div>
                </div>

                <div className={`bg-red-50 p-6 rounded-[2rem] border border-red-100 premium-shadow relative overflow-hidden group hover:border-red-300 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-2.5 rounded-2xl bg-red-100 text-red-600 border border-red-200">
                            <XCircle size={18} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-3xl font-black text-red-700 tracking-tighter mb-1">
                            {losses}
                        </h4>
                        <p className="text-[10px] font-black text-red-600/70 uppercase tracking-[0.2em]">{t('matches.losses')}</p>
                    </div>
                </div>
            </div>

            {/* Matches Table & Filters */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden border-b-8 border-b-fuchsia-600 animate-fade-in">
                <MatchFilters
                    isRTL={isRTL}
                    t={t}
                    weekendOnly={weekendOnly}
                    setWeekendOnly={setWeekendOnly}
                    exportOpen={exportOpen}
                    setExportOpen={setExportOpen}
                    exportPDF={exportPDF}
                    exportImage={exportImage}
                    exportExcel={exportExcel}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                />

                <MatchList
                    tableRef={tableRef}
                    filteredMatches={filteredMatches}
                    t={t}
                    isLoading={isLoading}
                    savingRow={savingRow}
                    savedRow={savedRow}
                    parseRowMeta={parseRowMeta}
                    rowDayStyle={rowDayStyle}
                    dayName={dayName}
                    isoDate={isoDate}
                    isoTime={isoTime}
                    composeIso={composeIso}
                    updateMatchField={updateMatchField}
                    buildRowNotes={buildRowNotes}
                    DURATION_OPTIONS={DURATION_OPTIONS}
                    coaches={coaches}
                    ageCategories={ageCategories}
                    terrains={terrains}
                    tournamentsList={tournamentsList}
                    handleDelete={handleDelete}
                    handleAddRow={handleAddRow}
                />
            </div>

            <MatchModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                isEditMode={isEditMode}
                formData={formData}
                handleInputChange={handleInputChange}
                squads={squads}
                t={t}
                isRTL={isRTL}
                dir={dir}
                DURATION_OPTIONS={DURATION_OPTIONS}
                tournamentsList={tournamentsList}
                terrains={terrains}
                ageCategories={ageCategories}
            />

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onConfirm={confirmDelete}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
                isRTL={isRTL}
                title={t('matches.deleteTitle')}
                message={t('matches.deleteMessage')}
            />

            <MatchExportTable
                exportRef={exportRef}
                academySettings={academySettings}
                filteredMatches={filteredMatches}
                squads={squads}
                coaches={coaches}
                parseRowMeta={parseRowMeta}
            />
        </div>
    );
};

export default MatchesManagement;
