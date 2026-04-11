import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
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
    Activity
} from 'lucide-react';

import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

const API_URL = import.meta.env.VITE_API_URL;

const MatchesManagement = () => {
    const { isRTL, dir } = useLanguage();
    
    const [matches, setMatches] = useState([]);
    const [squads, setSquads] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
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
        notes: ''
    });

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [matchesRes, squadsRes] = await Promise.all([
                authFetch(`${API_URL}/matches/`),
                authFetch(`${API_URL}/squads/`).catch(() => ({ ok: false })) // Silent catch if squads route not present
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
                // Mock squad if none exists
                setSquads([{ id: 'default', name: 'الفريق الأول' }]);
                setFormData(prev => ({ ...prev, squad_id: 'default' }));
            }
        } catch (error) {
            console.error('Error fetching matches:', error);
            showBanner('خطأ في تحميل البيانات', 'error');
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

    const handleAddClick = () => {
        setFormData({
            squad_id: squads.length > 0 ? squads[0].id : '',
            opponent_name: '',
            match_date: new Date().toISOString().slice(0, 16),
            location: 'Home',
            our_score: 0,
            their_score: 0,
            match_type: 'Friendly',
            status: 'Scheduled',
            notes: ''
        });
        setIsEditMode(false);
        setEditingId(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (match) => {
        setFormData({
            squad_id: match.squad_id,
            opponent_name: match.opponent_name,
            match_date: new Date(match.match_date).toISOString().slice(0, 16),
            location: match.location || 'Home',
            our_score: match.our_score || 0,
            their_score: match.their_score || 0,
            match_type: match.match_type || 'Friendly',
            status: match.status || 'Scheduled',
            notes: match.notes || ''
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
            
            const payload = {
                ...formData,
                our_score: parseInt(formData.our_score),
                their_score: parseInt(formData.their_score),
                match_date: new Date(formData.match_date).toISOString()
            };

            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save match');
            
            setIsModalOpen(false);
            fetchData();
            showBanner(isEditMode ? 'تم تحديث المباراة بنجاح' : 'تمت إضافة المباراة بنجاح', 'success');
        } catch { showBanner('خطأ في حفظ البيانات', 'error');
        }
    };

    const handleDelete = (id) => {
        setConfirmDialog({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        try {
            const res = await authFetch(`${API_URL}/matches/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setMatches(prev => prev.filter(m => m.id !== id));
                showBanner('تم الحذف بنجاح', 'success');
            } else {
                throw new Error('Failed to delete');
            }
        } catch { showBanner('خطأ في الحذف', 'error'); }
    };

    const filteredMatches = matches.filter(m => 
        m.opponent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalMatches = matches.length;
    const completedMatches = matches.filter(m => m.status === 'Completed');
    const wins = completedMatches.filter(m => m.our_score > m.their_score).length;
    const losses = completedMatches.filter(m => m.our_score < m.their_score).length;
    const draws = completedMatches.filter(m => m.our_score === m.their_score).length;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Completed': return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black tracking-widest uppercase">ملعوبة</span>;
            case 'Scheduled': return <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-black tracking-widest uppercase">مبرمجة</span>;
            case 'Cancelled': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black tracking-widest uppercase">ملغاة</span>;
            default: return null;
        }
    };
    
    const getTypeBadge = (type) => {
        switch (type) {
            case 'Friendly': return 'ودية';
            case 'League': return 'بطولة';
            case 'Cup': return 'كأس';
            case 'Tournament': return 'بطولة مجمعة';
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
                        إدارة المباريات
                    </h2>
                    <p className="text-slate-400 font-bold mt-2 tracking-widest text-sm uppercase">تتبع المواجهات والنتائج والإحصائيات</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button
                        onClick={handleAddClick}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-fuchsia-600/20 active:scale-95 transition-all"
                    >
                        <PlusCircle size={20} />
                        <span>مباراة جديدة</span>
                    </button>
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
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">إجمالي المباريات المبرمجة</p>
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
                        <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-[0.2em]">الانتصارات</p>
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
                        <p className="text-[10px] font-black text-amber-600/70 uppercase tracking-[0.2em]">التعادلات</p>
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
                        <p className="text-[10px] font-black text-red-600/70 uppercase tracking-[0.2em]">الهزائم</p>
                    </div>
                </div>
            </div>

            {/* Matches Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden border-b-8 border-b-fuchsia-600 animate-fade-in">
                <div className={`px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h3 className={`font-extrabold text-slate-800 text-lg flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Trophy size={20} className="text-fuchsia-500" /> أرشيف وبرنامج المباريات
                    </h3>

                    <div className={`relative w-full sm:w-80`}>
                        <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={18} />
                        <input
                            type="text"
                            placeholder="ابحث عن خصم..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-fuchsia-500/10 outline-none transition-all shadow-sm`}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} border-collapse`} dir={dir}>
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                                <th className="px-8 py-6 text-center">المواجهة (الفريق - الخصم)</th>
                                <th className="px-8 py-6 text-center">النتيجة</th>
                                <th className="px-8 py-6">التاريخ والمكان</th>
                                <th className="px-8 py-6">النوع والحالة</th>
                                <th className="px-8 py-6">تعديل</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fuchsia-600"></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">تحميل المباريات...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredMatches.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs opacity-50">
                                        لا توجد مباريات مسجلة
                                    </td>
                                </tr>
                            ) : (
                                filteredMatches.map((match) => (
                                    <tr key={match.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center items-center gap-6">
                                                <div className="font-extrabold text-slate-900 text-[16px] tracking-tight truncate w-24 text-center">
                                                    {squads.find(s => s.id === match.squad_id)?.name || 'أكاديميتنا'}
                                                </div>
                                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest border border-slate-200 px-2 py-1 rounded-lg">ضد</div>
                                                <div className="font-extrabold text-indigo-700 text-[16px] tracking-tight truncate w-24 text-center">
                                                    {match.opponent_name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center items-center text-3xl font-black">
                                                <span className={`${match.our_score > match.their_score ? 'text-emerald-500' : match.our_score < match.their_score ? 'text-red-500' : 'text-amber-500'}`}>
                                                    {match.our_score}
                                                </span>
                                                <span className="text-slate-200 mx-2">-</span>
                                                <span className="text-slate-800">
                                                    {match.their_score}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1 text-[11px] font-extrabold text-slate-500">
                                                <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(match.match_date).toLocaleString('ar-MA')}</span>
                                                <span className="flex items-center gap-1"><MapPin size={12}/> {match.location || 'غير محدد'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[10px] font-black text-slate-500">{getTypeBadge(match.match_type)}</span>
                                                {getStatusBadge(match.status)}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-left">
                                            <div className={`flex justify-start gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <button onClick={() => handleEditClick(match)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-slate-100/50 rounded-xl transition-all"><Edit2 size={18} /></button>
                                                <button onClick={() => handleDelete(match.id)} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in text-right" dir="rtl">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl premium-shadow overflow-hidden border border-slate-200">
                        <div className="px-10 py-8 border-b border-slate-100 bg-fuchsia-50 flex justify-between items-center flex-row-reverse">
                            <h3 className="font-black text-fuchsia-900 text-2xl tracking-tight flex items-center gap-3">
                                <Trophy size={24} /> {isEditMode ? 'تحديث المباراة' : 'برمجة مباراة جديدة'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-fuchsia-400 hover:text-fuchsia-600 p-2 hover:bg-white rounded-full transition-all"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-6 text-right">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الفريق الخاص بنا</label>
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
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الفريق الخصم</label>
                                    <input
                                        type="text"
                                        name="opponent_name"
                                        value={formData.opponent_name}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-fuchsia-500/10 text-right shadow-sm"
                                        placeholder="اسم الخصم..."
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">تاريخ وتوقيت المواجهة</label>
                                    <input
                                        type="datetime-local"
                                        name="match_date"
                                        value={formData.match_date}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-fuchsia-500/10 text-right shadow-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2 text-center">أهدافنا</label>
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
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-red-600 mb-2 text-center">أهداف الخصم</label>
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

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الحالة</label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none shadow-sm cursor-pointer appearance-none text-right"
                                    >
                                        <option value="Scheduled">مبرمجة</option>
                                        <option value="Completed">ملعوبة</option>
                                        <option value="Cancelled">ملغاة</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">المنافسة</label>
                                    <select
                                        name="match_type"
                                        value={formData.match_type}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none shadow-sm cursor-pointer appearance-none text-right"
                                    >
                                        <option value="Friendly">ودية</option>
                                        <option value="League">بطولة</option>
                                        <option value="Cup">كأس</option>
                                        <option value="Tournament">بطولة مجمعة</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الملعب</label>
                                    <input
                                        type="text"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none shadow-sm text-right"
                                        placeholder="المدينة/الملعب"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 flex gap-4 justify-end items-center border-t border-slate-100 mt-4 flex-row-reverse">
                                <button type="submit" className="flex-1 py-5 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-fuchsia-600/20 hover:shadow-fuchsia-600/40 transition-all transform active:scale-95">
                                    {isEditMode ? 'حفظ التغييرات' : 'برمجة المباراة'}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">إلغاء</button>
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
                title="حذف المباراة"
                message="هل أنت متأكد من حذف هذه المباراة؟ لا يمكن التراجع."
            />
        </div>
    );
};

export default MatchesManagement;
