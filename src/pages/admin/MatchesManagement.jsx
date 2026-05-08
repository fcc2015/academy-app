import { authFetch } from '../../api';
import { API_URL } from '../../config';
import React, { useState, useEffect, useRef } from 'react';
import {
    Trophy,
    Calendar,
    MapPin,
    AlertTriangle,
    CheckCircle,
    PlusCircle,
    Search,
    Edit2,
    Trash2,
    X,
    XCircle,
    Activity,
    LandPlot,
    CalendarDays,
    FileText,
    FileImage,
    FileSpreadsheet,
    Download,
    Clock,
} from 'lucide-react';
import html2canvas from 'html2canvas';

import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

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

            {/* Matches Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden border-b-8 border-b-fuchsia-600 animate-fade-in">
                <div className={`px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h3 className={`font-extrabold text-slate-800 text-lg flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Trophy size={20} className="text-fuchsia-500" /> {t('matches.archiveSchedule')}
                    </h3>

                    <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                        <button
                            type="button"
                            onClick={() => setWeekendOnly(v => !v)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border ${weekendOnly
                                ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-fuchsia-600/20'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-fuchsia-300'
                                }`}
                            title="Show only Friday/Saturday/Sunday matches"
                        >
                            <CalendarDays size={14} /> Weekend
                        </button>

                        {/* Export menu */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setExportOpen(v => !v)}
                                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                            >
                                <Download size={14} /> Export
                            </button>
                            {exportOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
                                    <div className="absolute top-full mt-2 right-0 z-40 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden w-56" dir="ltr">
                                        <button onClick={exportPDF} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 text-left transition-colors border-b border-slate-100">
                                            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"><FileText size={16} /></div>
                                            <div>
                                                <p className="text-xs font-black text-slate-800">Download PDF</p>
                                                <p className="text-[10px] text-slate-400 font-bold">Landscape A4</p>
                                            </div>
                                        </button>
                                        <button onClick={exportImage} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 text-left transition-colors border-b border-slate-100">
                                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><FileImage size={16} /></div>
                                            <div>
                                                <p className="text-xs font-black text-slate-800">Download PNG</p>
                                                <p className="text-[10px] text-slate-400 font-bold">High-res image</p>
                                            </div>
                                        </button>
                                        <button onClick={exportExcel} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 text-left transition-colors">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><FileSpreadsheet size={16} /></div>
                                            <div>
                                                <p className="text-xs font-black text-slate-800">Download Excel</p>
                                                <p className="text-[10px] text-slate-400 font-bold">.xlsx spreadsheet</p>
                                            </div>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="relative flex-1 sm:w-72">
                            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={18} />
                            <input
                                type="text"
                                placeholder={t('matches.searchOpponent')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-fuchsia-500/10 outline-none transition-all shadow-sm`}
                            />
                        </div>
                    </div>
                </div>

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

                                            {/* Coach (free text) */}
                                            <td className="px-1 py-1">
                                                <input
                                                    type="text"
                                                    value={meta.coachName}
                                                    onChange={(e) => updateMatchField(match.id, { notes: buildRowNotes({ ...meta, coachName: e.target.value }) })}
                                                    placeholder="Othmane, Amine..."
                                                    className="w-full px-2 py-1.5 bg-cyan-50 border border-cyan-200 rounded-md text-xs font-black focus:ring-2 focus:ring-cyan-400/30 outline-none"
                                                />
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
            </div>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in text-right" dir="rtl">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl premium-shadow overflow-hidden border border-slate-200">
                        <div className="px-10 py-8 border-b border-slate-100 bg-fuchsia-50 flex justify-between items-center flex-row-reverse">
                            <h3 className="font-black text-fuchsia-900 text-2xl tracking-tight flex items-center gap-3">
                                <Trophy size={24} /> {isEditMode ? t('matches.updateMatch') : t('matches.scheduleNew')}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-fuchsia-400 hover:text-fuchsia-600 p-2 hover:bg-white rounded-full transition-all"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-6 text-right">
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

                            <div className="pt-6 flex gap-4 justify-end items-center border-t border-slate-100 mt-4 flex-row-reverse">
                                <button type="submit" className="flex-1 py-5 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-fuchsia-600/20 hover:shadow-fuchsia-600/40 transition-all transform active:scale-95">
                                    {isEditMode ? t('ui.saveChanges') : t('matches.scheduleMatch')}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">{t('common.cancel')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onConfirm={confirmDelete}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
                isRTL={isRTL}
                title={t('matches.deleteTitle')}
                message={t('matches.deleteMessage')}
            />

            {/* ─── Hidden export-only table (Lanoria-style, html2canvas-friendly) ── */}
            {(() => {
                const academyName = (academySettings?.academy_name || 'CLUB').toUpperCase();
                const academyLogo = academySettings?.logo_url;
                const academyNameUpper = academyName;
                // Compute weekend range
                const dates = filteredMatches.map(m => new Date(m.match_date)).filter(d => !isNaN(d));
                const dateMin = dates.length ? new Date(Math.min(...dates)) : new Date();
                const dateMax = dates.length ? new Date(Math.max(...dates)) : new Date();
                const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
                const monthName = months[dateMin.getMonth()];
                const sameMonth = dateMin.getMonth() === dateMax.getMonth() && dateMin.getFullYear() === dateMax.getFullYear();
                const weekendLabel = sameMonth
                    ? `Week-End ${String(dateMin.getDate()).padStart(2, '0')} et ${String(dateMax.getDate()).padStart(2, '0')} ${monthName} ${dateMax.getFullYear()}`
                    : `${String(dateMin.getDate()).padStart(2, '0')}/${String(dateMin.getMonth()+1).padStart(2, '0')} — ${String(dateMax.getDate()).padStart(2, '0')}/${String(dateMax.getMonth()+1).padStart(2, '0')} ${dateMax.getFullYear()}`;

                // Helpers
                const dayFr = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
                const fmtDate = (iso) => {
                    const d = new Date(iso);
                    return `${dayFr[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
                };
                const fmtTime = (iso) => {
                    const d = new Date(iso);
                    return `${String(d.getHours()).padStart(2, '0')}H${String(d.getMinutes()).padStart(2, '0')}`;
                };
                const coachFor = (match) => {
                    // Prefer the manually-typed coach in the inline editor
                    const typed = parseRowMeta(match.notes).coachName;
                    if (typed) return typed;
                    const sq = squads.find(s => s.id === match.squad_id);
                    if (!sq) return '';
                    return sq.coaches?.full_name || sq.coach_name || (coaches.find(c => c.id === sq.coach_id)?.full_name) || '';
                };

                const HEADER_BLUE = '#1e40af';
                const ROW_ALT = '#dbeafe';
                const RED = '#dc2626';
                const GREEN = '#16a34a';

                return (
                    <div
                        ref={exportRef}
                        style={{
                            position: 'fixed',
                            left: '-10000px',
                            top: 0,
                            width: '1280px',
                            backgroundColor: '#ffffff',
                            fontFamily: 'Arial, Helvetica, sans-serif',
                            padding: '32px',
                        }}
                        aria-hidden="true"
                    >
                        {/* Academy logo */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                            {academyLogo ? (
                                <img src={academyLogo} alt="logo" crossOrigin="anonymous" style={{ height: '110px', objectFit: 'contain' }} />
                            ) : (
                                <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 900 }}>
                                    {academyNameUpper.charAt(0)}
                                </div>
                            )}
                        </div>

                        {/* Title */}
                        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 900, letterSpacing: '0.02em', color: '#1e293b' }}>
                                PROGRAMME DES MATCHES <span style={{ color: '#0284c7' }}>{academyNameUpper}</span> <span style={{ color: GREEN }}>CLUB</span>
                            </h1>
                        </div>

                        {/* Subtitle */}
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <p style={{ margin: 0, fontSize: '20px', fontStyle: 'italic', color: '#1e293b' }}>{weekendLabel}</p>
                        </div>

                        {/* Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', border: '2px solid #1e3a8a' }}>
                            <thead>
                                <tr style={{ background: HEADER_BLUE, color: '#ffffff' }}>
                                    {['Cat', 'Date', 'Domicile', 'Visiteur', 'Heure', 'Terrain', 'Coach', 'Kit'].map(h => (
                                        <th key={h} style={{ padding: '10px 8px', textAlign: 'center', fontSize: '15px', fontWeight: 900, border: '1px solid #1e3a8a' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMatches.map((match, idx) => {
                                    const meta = parseRowMeta(match.notes);
                                    const isAway = meta.isAway;
                                    const homeTeam = isAway ? (match.opponent_name || '—') : academyNameUpper;
                                    const visitorTeam = isAway ? academyNameUpper : (match.opponent_name || '—');
                                    const isPending = match.status === 'Postponed' || match.status === 'Scheduled' && false;
                                    const isCancelled = match.status === 'Cancelled';
                                    const showRed = match.status === 'Postponed' ? 'EN ATTENTE' : (isCancelled ? 'REPORTÉ' : null);
                                    const rowBg = idx % 2 === 0 ? '#ffffff' : ROW_ALT;
                                    const cell = { padding: '8px 10px', border: '1px solid #93c5fd', textAlign: 'center', fontWeight: 700, fontSize: '14px', color: '#0f172a' };
                                    const isOurHome = !isAway;
                                    const isOurVisit = isAway;

                                    return (
                                        <tr key={match.id} style={{ background: rowBg }}>
                                            <td style={{ ...cell, color: HEADER_BLUE, fontWeight: 900 }}>
                                                {match.category || '—'}
                                            </td>
                                            <td style={cell}>
                                                {showRed ? <span style={{ color: RED, fontWeight: 900 }}>{showRed}</span> : fmtDate(match.match_date)}
                                            </td>
                                            <td style={{ ...cell, color: isOurHome ? GREEN : '#0f172a', fontWeight: 900 }}>{homeTeam}</td>
                                            <td style={{ ...cell, color: isOurVisit ? GREEN : '#0f172a', fontWeight: 900 }}>{visitorTeam}</td>
                                            <td style={cell}>
                                                {showRed ? '' : fmtTime(match.match_date)}
                                            </td>
                                            <td style={cell}>
                                                {showRed ? <span style={{ color: RED, fontWeight: 900 }}>{showRed}</span> : (match.location || '—')}
                                            </td>
                                            <td style={cell}>
                                                {showRed ? <span style={{ color: RED, fontWeight: 900 }}>{showRed}</span> : (coachFor(match) || '—')}
                                            </td>
                                            <td style={cell}>
                                                {meta.kitColor ? (
                                                    <span style={{ display: 'inline-block', width: 28, height: 28, borderRadius: 6, background: meta.kitColor, border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.15)' }} title={meta.kitColor} />
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                );
            })()}
        </div>
    );
};

export default MatchesManagement;
