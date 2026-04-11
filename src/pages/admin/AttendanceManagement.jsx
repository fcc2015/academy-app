import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import {
    Users,
    CalendarCheck,
    Save,
    CheckCircle2,
    XCircle,
    Clock,
    ShieldAlert,
    UsersRound,
    Smartphone,
    Search,
    RefreshCw,
    Loader2,
    QrCode,
    AlertCircle
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../components/Toast';

const AttendanceManagement = () => {
    const { isRTL, dir } = useLanguage();
    const [squads, setSquads] = useState([]);
    const [players, setPlayers] = useState([]);
    const [selectedSquad, setSelectedSquad] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState({}); // player_id -> status
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanFeedback, setScanFeedback] = useState({ show: false, message: '', type: '' });
    const toast = useToast();

    const showBanner = (message, type = 'success') => {
        if (type === 'error') toast.error(message);
        else toast.success(message);
    };

    useEffect(() => {
        fetchSquads();
        fetchPlayers();
    }, []);

    useEffect(() => {
        if (selectedSquad && selectedDate) {
            loadAttendance();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedSquad, selectedDate]);

    const fetchSquads = async () => {
        try {
            const res = await authFetch(`${API_URL}/squads/`);
            if (res.ok) setSquads(await res.json());
        } catch (error) {
            console.error('Error fetching squads:', error);
        }
    };

    const fetchPlayers = async () => {
        try {
            const res = await authFetch(`${API_URL}/players/`);
            if (res.ok) setPlayers(await res.json());
        } catch (error) {
            console.error('Error fetching players:', error);
        }
    };

    const loadAttendance = async () => {
        setIsLoading(true);
        try {
            const res = await authFetch(`${API_URL}/attendance/?squad_id=${selectedSquad}&date=${selectedDate}`);
            if (res.ok) {
                const existingRecords = await res.json();
                const squadPlayers = players.filter(p => p.squad_id === selectedSquad);
                let initialData = {};
                squadPlayers.forEach(p => { initialData[p.user_id] = 'present'; });
                existingRecords.forEach(record => { initialData[record.player_id] = record.status; });
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
                player_id,
                status,
                notes: ''
            }));
            const payload = { squad_id: selectedSquad, date: selectedDate, records };
            const res = await authFetch(`${API_URL}/attendance/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) { showBanner(isRTL ? 'تم حفظ سجل الحضور بنجاح !' : 'Attendance saved successfully!', 'success'); } 
            else { showBanner(isRTL ? 'حدث خطأ أثناء الحفظ' : 'Error saving attendance', 'error'); }
        } catch (error) {
            console.error('Error saving attendance:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const statuses = [
        { id: 'present', label: 'حاضر', short: 'ح', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
        { id: 'absent', label: 'غائب', short: 'غ', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
        { id: 'late', label: 'متأخر', short: 'ت', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
        { id: 'excused', label: 'مبرر', short: 'م', icon: ShieldAlert, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' }
    ];

    const currentSquadPlayers = players.filter(p => p.squad_id === selectedSquad)
                                       .filter(p => p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));

    const activeSquad = squads.find(s => s.id === selectedSquad);

    const onScanResult = (decodedText) => {
        try {
            const data = JSON.parse(decodedText);
            if (data && data.id) {
                const player = currentSquadPlayers.find(p => p.user_id === data.id);
                if (player) {
                    if (attendanceData[data.id] !== 'present') {
                        handleStatusChange(data.id, 'present');
                        setScanFeedback({ show: true, message: isRTL ? `تم تسجيل حضور: ${player.full_name} ✅` : `Marked present: ${player.full_name} ✅`, type: 'success' });
                    }
                } else {
                    setScanFeedback({ show: true, message: isRTL ? `اللاعب غير موجود في هذه المجموعة ⚠️` : `Player not found in this squad ⚠️`, type: 'error' });
                }
                setTimeout(() => setScanFeedback({ show: false, message: '', type: '' }), 3000);
            }
        } catch {
            // Ignore format errors
        }
    };

    // QR Scanner Component
    const ScannerModal = () => {
        useEffect(() => {
            let scanner = null;
            if (isScannerOpen) {
                scanner = new Html5Qrcode("reader");
                scanner.start(
                    { facingMode: "environment" }, 
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    onScanResult,
                    () => {} // ignore stream errors
                ).catch(err => console.error("Scanner error", err));
            }
            return () => {
                if (scanner && isScannerOpen) {
                    scanner.stop().then(() => scanner.clear()).catch(e => console.error("Clear error", e));
                }
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isScannerOpen]);

        if (!isScannerOpen) return null;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                <div className="bg-white rounded-[2.5rem] overflow-hidden p-8 w-full max-w-md relative flex flex-col items-center">
                    <button onClick={() => setIsScannerOpen(false)} className="absolute top-6 right-6 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full p-2 transition-colors">
                        <XCircle size={24}/>
                    </button>
                    <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 mb-6 mt-4">
                        <QrCode size={32} />
                    </div>
                    <h3 className="font-black text-slate-800 text-lg mb-6 tracking-widest uppercase">مسح بطاقة اللاعب</h3>
                    
                    <div className="w-full rounded-2xl overflow-hidden shadow-inner border-[4px] border-slate-100 bg-black">
                        <div id="reader" className="w-full min-h-[300px]"></div>
                    </div>

                    <p className="mt-6 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">قم بتوجيه كاميرا الهاتف نحو بطاقة اللاعب للحضور التلقائي</p>
                </div>
            </div>
        );
    };

    return (
        <div className={`animate-fade-in pb-20 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Toast handled by global provider */}
            {/* Header Area */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                    <h1 className={`text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {isRTL ? 'سجل' : 'Attendance'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{isRTL ? 'الحضور' : 'Log'}</span>
                    </h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">{isRTL ? 'تسجيل الحضور اليومي والمتابعة الانضباطية' : 'Daily tracking and disciplinary monitoring'}</p>
                </div>
                {selectedSquad && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`w-full md:w-auto flex items-center justify-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {isSaving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'تأكيد الحصة' : 'Confirm Session')}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Configuration Panel */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm">
                        <div className="space-y-8">
                            <div>
                                <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <UsersRound size={16} className="text-indigo-600" /> {isRTL ? 'اختيار الفئة' : 'Select Squad'}
                                </label>
                                <select
                                    className={`w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer ${isRTL ? 'text-right' : 'text-left'}`}
                                    value={selectedSquad}
                                    onChange={(e) => setSelectedSquad(e.target.value)}
                                >
                                    <option value="">{isRTL ? '— اختر مجموعة —' : '— Select Squad —'}</option>
                                    {squads.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <CalendarCheck size={16} className="text-indigo-600" /> {isRTL ? 'تاريخ التدريب' : 'Training Date'}
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className={`w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer ${isRTL ? 'text-right' : 'text-left'}`}
                                />
                            </div>
                        </div>

                        {selectedSquad && (
                            <div className="mt-10 pt-10 border-t border-slate-100">
                                <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <span>{isRTL ? 'ملخص الحصة' : 'Session Summary'}</span> <span>{activeSquad?.category}</span>
                                </h4>
                                <div className="space-y-4">
                                    {statuses.map(s => {
                                        const count = Object.values(attendanceData).filter(val => val === s.id).length;
                                        return (
                                            <div key={s.id} className={`flex justify-between items-center bg-slate-50 px-4 py-3 rounded-xl border border-white shadow-sm ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className={`w-8 h-8 rounded-lg ${s.bg} ${s.color} flex items-center justify-center`}>
                                                        <s.icon size={16} />
                                                    </div>
                                                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{isRTL ? s.label : (s.id.charAt(0).toUpperCase() + s.id.slice(1))}</span>
                                                </div>
                                                <span className="text-sm font-black text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-100">{count}</span>
                                            </div>
                                        );
                                    })}
                                    <div className={`pt-4 mt-2 border-t border-slate-100 flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'إجمالي اللاعبين' : 'Total Players'}</span>
                                        <span className="text-lg font-black text-indigo-600">{currentSquadPlayers.length}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Roster Area */}
                <div className="lg:col-span-8">
                    <div className={`bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[600px] border-b-8 border-b-indigo-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className={`p-8 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <UsersRound size={20} className="text-indigo-600" />
                                <h2 className="font-extrabold text-slate-800 text-lg">{isRTL ? 'المناداة بالأسماء' : 'Roll Call'}</h2>
                            </div>
                            <div className={`flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                {selectedSquad && (
                                    <button 
                                        onClick={() => setIsScannerOpen(true)}
                                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-tr from-emerald-500 to-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}
                                    >
                                        <QrCode size={16} /> {isRTL ? 'فحص البطاقة (QR)' : 'Scan QR Code'}
                                    </button>
                                )}
                                {selectedSquad && (
                                    <div className="relative w-full sm:w-64">
                                        <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-300 ${isRTL ? 'right-4' : 'left-4'}`} size={18} />
                                        <input 
                                            type="text"
                                            placeholder={isRTL ? 'بحث عن لاعب...' : 'Search player...'}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className={`w-full py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all ${isRTL ? 'text-right pr-11 pl-4' : 'text-left pl-11 pr-4'}`}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Scanner Feedback Toast */}
                        {scanFeedback.show && (
                            <div className={`p-4 font-black uppercase tracking-widest text-xs text-center border-b ${scanFeedback.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                {scanFeedback.message}
                            </div>
                        )}

                        {!selectedSquad ? (
                            <div className="h-[500px] flex flex-col justify-center items-center text-center p-8">
                                <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mb-6">
                                    <UsersRound size={48} />
                                </div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">{isRTL ? 'لم يتم اختيار فئة' : 'No Squad Selected'}</h3>
                                <p className="text-slate-400 font-medium max-w-xs mt-2 text-sm">{isRTL ? 'يرجى اختيار مجموعة من القائمة الجانبية لعرض قائمة اللاعبين.' : 'Please select a squad from the menu to view players.'}</p>
                            </div>
                        ) : isLoading ? (
                            <div className="h-[500px] flex flex-col justify-center items-center">
                                <div className="relative">
                                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 opacity-20"></div>
                                    <RefreshCw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-spin" size={24} />
                                </div>
                                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{isRTL ? 'جاري تحميل الجلسة...' : 'Loading session...'}</p>
                            </div>
                        ) : currentSquadPlayers.length === 0 ? (
                            <div className="h-[500px] flex flex-col justify-center items-center text-center p-8">
                                <UsersRound className="text-slate-100 mb-4" size={64} />
                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">{isRTL ? 'لا يوجد لاعبون في هذه المجموعة' : 'No players in this squad'}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {currentSquadPlayers.map((player, idx) => (
                                    <div key={player.user_id} className={`p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 hover:bg-slate-50/80 transition-all group ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                                        <div className={`flex items-center gap-5 w-full sm:w-auto ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 font-black flex items-center justify-center text-xs shrink-0 border border-white shadow-sm">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <h4 className="font-exrabold text-slate-900 text-sm tracking-tight">{player.full_name}</h4>
                                                    {player.parent_whatsapp && (
                                                        <a 
                                                            href={`https://wa.me/${player.parent_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(isRTL ? `السلام عليكم، نعلمكم بغياب ${player.full_name} عن حصة اليوم بأكاديمية أثليتيك.` : `Hello, we inform you that ${player.full_name} is absent from today's session at Athletic Academy.`)}`}
                                                            target="_blank" rel="noreferrer"
                                                            className={`p-1 px-2 border border-emerald-100 text-emerald-500 rounded-lg hover:bg-emerald-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}
                                                            title={isRTL ? 'إرسال رسالة واتساب للآباء' : 'Send WhatsApp Message to Parents'}
                                                        >
                                                            <Smartphone size={12} /> {isRTL ? 'تواصل' : 'Contact'}
                                                        </a>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{isRTL ? 'المستوى:' : 'Level:'} {player.technical_level} · {isRTL ? 'الفئة:' : 'Category:'} {player.u_category}</p>
                                            </div>
                                        </div>

                                        <div className={`flex gap-1 w-full sm:w-auto p-1.5 bg-slate-100/50 rounded-[1.25rem] border border-slate-200/50 shadow-inner ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            {statuses.map(status => {
                                                const isActive = attendanceData[player.user_id] === status.id;
                                                const Icon = status.icon;
                                                return (
                                                    <button
                                                        key={status.id}
                                                        onClick={() => handleStatusChange(player.user_id, status.id)}
                                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-300 ${isRTL ? 'flex-row-reverse' : ''}
                                                            ${isActive
                                                                ? `${status.bg} ${status.color} shadow-lg ring-1 ring-inset ${status.border}`
                                                                : 'text-slate-300 hover:text-slate-500 hover:bg-white'
                                                            }`}
                                                            title={isRTL ? status.label : (status.id.charAt(0).toUpperCase() + status.id.slice(1))}
                                                    >
                                                        <Icon size={16} />
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'inline' : 'hidden md:inline'}`}>
                                                            {isActive ? (isRTL ? status.label : (status.id.charAt(0).toUpperCase() + status.id.slice(1))) : status.short}
                                                        </span>
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

export default AttendanceManagement;
