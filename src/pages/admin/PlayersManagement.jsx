import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import {
    Users,
    Search,
    Plus,
    Trash2,
    Loader2,
    AlertCircle,
    Filter,
    Smartphone,
    Download,
    X,
    Edit2,
    Play,
    CheckCircle,
    Check,
    Clock,
    QrCode,
    Trophy,
    MapPin,
    Eye,
    User,
    Heart,
    CreditCard,
    Activity
} from 'lucide-react';
import Swal from 'sweetalert2';
import PlayerBadgeModal from '../../components/PlayerBadgeModal';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import AttendanceHeatmap from '../../components/AttendanceHeatmap';
import MedicalCard from '../../components/MedicalCard';
import PaymentTimeline from '../../components/PaymentTimeline';

const PlayerProfileModal = ({ isOpen, onClose, player, isRTL, dir }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [attendance, setAttendance] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    useEffect(() => {
        if (!isOpen || !player) return;
        setActiveTab('profile');
        setAttendance([]);
        setPayments([]);
        setLoadingData(true);
        Promise.all([
            authFetch(`${API_URL}/attendance/player/${player.user_id}`).then(r => r.ok ? r.json() : []).catch(() => []),
            authFetch(`${API_URL}/finances/payments/player/${player.user_id}`).then(r => r.ok ? r.json() : []).catch(() => []),
        ]).then(([att, pay]) => {
            setAttendance(Array.isArray(att) ? att : []);
            setPayments(Array.isArray(pay) ? pay : []);
            setLoadingData(false);
        });
    }, [isOpen, player]);

    if (!isOpen || !player) return null;

    const tabs = [
        { id: 'profile',    label: isRTL ? 'الملف'   : 'Profile',    icon: User },
        { id: 'attendance', label: isRTL ? 'الحضور'  : 'Attendance', icon: Activity },
        { id: 'medical',    label: isRTL ? 'الطبي'   : 'Medical',    icon: Heart },
        { id: 'payments',   label: isRTL ? 'المدفوعات': 'Payments',   icon: CreditCard },
    ];

    const age = player.birth_date
        ? Math.floor((new Date() - new Date(player.birth_date)) / (365.25 * 24 * 3600 * 1000))
        : null;

    return (
        <div
            className={`fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 ${isRTL ? 'text-right' : 'text-left'}`}
            dir={dir}
        >
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col border border-slate-200 overflow-hidden" style={{ maxHeight: '90vh' }}>
                {/* Header */}
                <div className={`flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex flex-col items-center justify-center text-white shrink-0">
                            <span className="text-[9px] font-black opacity-60">CAT</span>
                            <span className="text-base font-black tracking-tighter">{player.u_category}</span>
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">{player.full_name}</h2>
                            <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">
                                {player.subscription_type} · LVL {player.technical_level}
                                {age && ` · ${age}y`}
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-white p-2 rounded-full transition-all border border-transparent">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className={`flex border-b border-slate-100 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
                                    activeTab === tab.id
                                        ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <Icon size={13} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30 space-y-4">
                    {loadingData && activeTab !== 'profile' && (
                        <div className="flex justify-center py-10">
                            <Loader2 className="animate-spin text-indigo-500" size={28} />
                        </div>
                    )}

                    {/* Profile tab */}
                    {activeTab === 'profile' && (
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: isRTL ? 'ولي الأمر' : 'Parent', value: player.parent_name },
                                { label: isRTL ? 'الواتساب' : 'WhatsApp', value: player.parent_whatsapp },
                                { label: isRTL ? 'تاريخ الميلاد' : 'Birth Date', value: player.birth_date },
                                { label: isRTL ? 'الفئة' : 'Category', value: player.u_category },
                                { label: isRTL ? 'المستوى' : 'Level', value: player.technical_level },
                                { label: isRTL ? 'الاشتراك' : 'Plan', value: player.subscription_type },
                                { label: isRTL ? 'الحالة' : 'Status', value: player.account_status },
                                { label: isRTL ? 'منطقة النقل' : 'Transport', value: player.transport_zone || '—' },
                                { label: isRTL ? 'العنوان' : 'Address', value: player.address || '—', full: true },
                            ].map(({ label, value, full }) => (
                                <div key={label} className={`bg-white rounded-2xl p-4 border border-slate-100 ${full ? 'col-span-2' : ''}`}>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                                    <p className="text-sm font-bold text-slate-800">{value || '—'}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Attendance tab */}
                    {activeTab === 'attendance' && !loadingData && (
                        <AttendanceHeatmap records={attendance} isRTL={isRTL} />
                    )}

                    {/* Medical tab */}
                    {activeTab === 'medical' && !loadingData && (
                        <MedicalCard player={player} isRTL={isRTL} />
                    )}

                    {/* Payments tab */}
                    {activeTab === 'payments' && !loadingData && (
                        <PaymentTimeline payments={payments} isRTL={isRTL} currency="MAD" />
                    )}
                </div>
            </div>
        </div>
    );
};

const PlayerMatchesModal = ({ isOpen, onClose, player, isRTL, dir }) => {
    const [matches, setMatches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen && player) {
            authFetch(`${API_URL}/matches/player/${player.user_id}`)
                .then(res => res.json())
                .then(data => { setMatches(data || []); setIsLoading(false); })
                .catch(() => setIsLoading(false));
        }
    }, [isOpen, player]);

    if (!isOpen || !player) return null;

    return (
        <div className={`fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col border border-slate-200 overflow-hidden" style={{ maxHeight: '85vh' }}>
                <div className={`flex justify-between items-center p-6 border-b border-slate-100 bg-emerald-50 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="bg-white p-2 text-emerald-600 rounded-xl shadow-sm"><Trophy size={20} /></div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">{isRTL ? 'مباريات اللاعب' : "Player's Matches"}</h2>
                            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">{player.full_name}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-white p-2 rounded-full transition-all border border-transparent">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50">
                    {isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-600" size={32} /></div>
                    ) : matches.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-bold italic">{isRTL ? 'لا توجد مباريات مسجلة.' : 'No matches found.'}</div>
                    ) : (
                        <div className="space-y-4">
                            {matches.map(m => (
                                <div key={m.id} className={`bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex flex-col items-center justify-center font-black">
                                            <span className="text-[10px]">{new Date(m.match_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US', { month: 'short' })}</span>
                                            <span className="text-lg leading-tight">{new Date(m.match_date).getDate()}</span>
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-slate-900 border-b border-slate-100 pb-1 inline-block mb-1">{isRTL ? 'ضد' : 'vs'} {m.opponent_name}</div>
                                            <div className={`flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md">{m.match_type} {m.category}</span>
                                                <span className="flex items-center gap-1"><MapPin size={10} /> {m.location || 'TBD'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg ${m.status === 'Completed' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-500 text-white'}`}>{m.status === 'Completed' ? (isRTL ? 'ملعوبة' : 'Played') : (isRTL ? 'قادمة' : 'Upcoming')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Photo Upload + Crop ─────────────────────────────────────
const CROP_PX = 180;

function PhotoUploadCrop({ value, onChange }) {
    const [srcImg, setSrcImg]     = useState(null);
    const [imgSize, setImgSize]   = useState({ w: 0, h: 0 });
    const [offset, setOffset]     = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError]       = useState('');
    const dragRef = useRef(null);
    const imgRef  = useRef(null);
    const fileRef = useRef(null);

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError('Only images allowed'); return; }
        setError('');
        const reader = new FileReader();
        reader.onload = (ev) => setSrcImg(ev.target.result);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const onImgLoad = (e) => {
        const { naturalWidth: nw, naturalHeight: nh } = e.target;
        const scale = CROP_PX / Math.min(nw, nh);
        const w = nw * scale, h = nh * scale;
        setImgSize({ w, h });
        setOffset({ x: -(w - CROP_PX) / 2, y: -(h - CROP_PX) / 2 });
    };

    const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

    const onMouseDown = (e) => {
        setDragging(true);
        dragRef.current = { sx: e.clientX - offset.x, sy: e.clientY - offset.y };
    };
    const onMouseMove = (e) => {
        if (!dragging || !dragRef.current) return;
        setOffset({
            x: clamp(e.clientX - dragRef.current.sx, CROP_PX - imgSize.w, 0),
            y: clamp(e.clientY - dragRef.current.sy, CROP_PX - imgSize.h, 0),
        });
    };
    const onMouseUp = () => setDragging(false);

    // Touch support
    const onTouchStart = (e) => {
        const t = e.touches[0];
        setDragging(true);
        dragRef.current = { sx: t.clientX - offset.x, sy: t.clientY - offset.y };
    };
    const onTouchMove = (e) => {
        if (!dragging || !dragRef.current) return;
        const t = e.touches[0];
        setOffset({
            x: clamp(t.clientX - dragRef.current.sx, CROP_PX - imgSize.w, 0),
            y: clamp(t.clientY - dragRef.current.sy, CROP_PX - imgSize.h, 0),
        });
    };

    const handleConfirm = async () => {
        if (!imgRef.current) return;
        setUploading(true);
        setError('');
        try {
            const canvas = document.createElement('canvas');
            canvas.width = CROP_PX;
            canvas.height = CROP_PX;
            const ctx = canvas.getContext('2d');
            const img = imgRef.current;
            const scaleX = img.naturalWidth / imgSize.w;
            const scaleY = img.naturalHeight / imgSize.h;
            ctx.drawImage(img,
                (-offset.x) * scaleX, (-offset.y) * scaleY,
                CROP_PX * scaleX, CROP_PX * scaleY,
                0, 0, CROP_PX, CROP_PX
            );
            const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
            const fd = new FormData();
            fd.append('file', blob, 'photo.jpg');
            const { authFetch } = await import('../../api');
            const { API_URL } = await import('../../config');
            const res = await authFetch(`${API_URL}/players/upload-photo`, { method: 'POST', body: fd });
            if (!res.ok) throw new Error((await res.json()).detail || 'Upload failed');
            const { url } = await res.json();
            onChange(url);
            setSrcImg(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {/* Current photo or placeholder (no crop active) */}
            {!srcImg && (
                <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                        width: CROP_PX, height: CROP_PX, borderRadius: '50%', overflow: 'hidden',
                        background: value ? 'transparent' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', border: '3px dashed #c7d2fe', boxSizing: 'border-box',
                        position: 'relative',
                    }}
                    title="Click to upload photo"
                >
                    {value
                        ? <img src={value} alt="player" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: '#fff', fontSize: 13, fontWeight: 900, textAlign: 'center', padding: 12 }}>📷<br/>Upload Photo</span>
                    }
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(79,70,229,0.7)', color: '#fff',
                        fontSize: 10, fontWeight: 900, textAlign: 'center', padding: '4px 0',
                    }}>
                        {value ? 'CHANGE' : 'UPLOAD'}
                    </div>
                </div>
            )}

            {/* Crop preview */}
            {srcImg && (
                <div>
                    <div
                        style={{
                            width: CROP_PX, height: CROP_PX, borderRadius: '50%', overflow: 'hidden',
                            position: 'relative', cursor: dragging ? 'grabbing' : 'grab',
                            userSelect: 'none', boxShadow: '0 0 0 3px #4f46e5',
                        }}
                        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onMouseUp}
                    >
                        <img
                            ref={imgRef} src={srcImg} alt="crop"
                            onLoad={onImgLoad} draggable={false}
                            style={{
                                position: 'absolute', left: offset.x, top: offset.y,
                                width: imgSize.w, height: imgSize.h, pointerEvents: 'none',
                            }}
                        />
                    </div>
                    <p style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', margin: '6px 0 0' }}>
                        Drag to position
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                        <button type="button" onClick={handleConfirm} disabled={uploading}
                            style={{ padding: '7px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 12, cursor: 'pointer' }}>
                            {uploading ? '...' : 'Use this photo'}
                        </button>
                        <button type="button" onClick={() => setSrcImg(null)}
                            style={{ padding: '7px 12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 12, cursor: 'pointer' }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
            {error && <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>{error}</p>}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────

const PlayerModal = ({
    isOpen, onClose, onSubmit, title, isEdit, modalStep, setModalStep,
    formData, handleInputChange, subscriptionPlans, isSubmitting, settings, t, isRTL, dir
}) => {
    if (!isOpen) return null;
    const selectedPlanObj = subscriptionPlans.find(p => p.name === formData.subscription_type) || null;

    const goNext = (e) => { e.preventDefault(); setModalStep(2); };
    const doSubmit = (e) => { onSubmit(e); };

    return (
        <div className={`fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col border border-slate-200 my-auto" style={{ maxHeight: '90vh', overflow: 'hidden' }}>
                <div className={`flex justify-between items-center p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
                        {!isEdit && (
                            <div className={`flex items-center gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-10 h-1.5 rounded-full ${modalStep >= 1 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                                <div className={`w-10 h-1.5 rounded-full ${modalStep >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                                <span className={`${isRTL ? 'mr-3' : 'ml-3'} text-[10px] text-slate-400 font-bold uppercase`}>{t('players.step')} {modalStep} / 2</span>
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-white p-2 rounded-full transition-all border border-transparent">
                        <X size={20} />
                    </button>
                </div>

                {(isEdit || modalStep === 1) && (
                    <form onSubmit={isEdit ? doSubmit : goNext} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            {/* Photo upload — centered above the grid */}
                            <div className="flex flex-col items-center gap-1 pb-4 border-b border-slate-100">
                                <PhotoUploadCrop
                                    value={formData.photo_url}
                                    onChange={(url) => handleInputChange({ target: { name: 'photo_url', value: url } })}
                                />
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Player Photo (optional)</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.fullName')}</label>
                                    <input required type="text" name="full_name" value={formData.full_name} onChange={handleInputChange} placeholder={isRTL ? 'الاسم والنسب' : 'Full Name'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.parentName')}</label>
                                    <input required type="text" name="parent_name" value={formData.parent_name} onChange={handleInputChange} placeholder={isRTL ? 'اسم المسؤول' : 'Parent Name'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.birthDate')}</label>
                                    <input required type="date" name="birth_date" value={formData.birth_date} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.phone')}</label>
                                    <input required type="tel" name="parent_whatsapp" value={formData.parent_whatsapp} onChange={handleInputChange} 
                                        pattern="^\+?[0-9]{8,15}$" 
                                        title="Must be a valid phone number, e.g., +212600000000"
                                        placeholder="+212 6..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" dir="ltr" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.address')}</label>
                                    <input required type="text" name="address" value={formData.address} onChange={handleInputChange} placeholder={isRTL ? 'الحي الشارع، المدينة' : 'Neighborhood, Street, City'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.ageCategory')}</label>
                                    <select name="u_category" value={formData.u_category} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                                        {settings?.age_categories?.map(c => <option key={c} value={c}>{c}</option>) || <option value="U11">U11</option>}
                                    </select>
                                </div>
                                {isEdit && (
                                    <>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.technicalLevel')}</label>
                                            <select name="technical_level" value={formData.technical_level} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                                                <option value="A">{isRTL ? 'نخبة (A)' : 'Elite (A)'}</option>
                                                <option value="B">{isRTL ? 'هاوي (B)' : 'Amateur (B)'}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('common.status')}</label>
                                            <select name="account_status" value={formData.account_status} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                                                <option value="Active">{t('players.active')}</option>
                                                <option value="Pending">{t('players.pending')}</option>
                                                <option value="Suspended">{t('players.suspended')}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.subscriptionType')}</label>
                                            <select name="subscription_type" value={formData.subscription_type} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                                                <option value="Free">{isRTL ? 'مجاني (للمعوزين)' : 'Free (Social Case)'}</option>
                                                {subscriptionPlans.map(plan => <option key={plan.id} value={plan.name}>{plan.name}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                                <div className="md:col-span-2 pt-4 border-t border-slate-100 mt-2">
                                    <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-widest mb-4">البيانات الطبية والتنقل (اختياري)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">فصيلة الدم</label>
                                            <select name="blood_type" value={formData.blood_type || ''} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" dir="ltr">
                                                <option value="">-- غير محدد --</option>
                                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">صلاحية الشهادة الطبية</label>
                                            <input type="date" name="medical_cert_valid_until" value={formData.medical_cert_valid_until || ''} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">جهة الاتصال للطوارئ</label>
                                            <input type="text" name="emergency_contact" value={formData.emergency_contact || ''} onChange={handleInputChange} placeholder="الاسم ورقم الهاتف..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">منطقة النقل</label>
                                            <input type="text" name="transport_zone" value={formData.transport_zone || ''} onChange={handleInputChange} placeholder="مثال: وسط المدينة" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">حساسية أو أمراض سابقة</label>
                                            <input type="text" name="allergies" value={formData.allergies || ''} onChange={handleInputChange} placeholder="لا يوجد" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`flex justify-end gap-3 p-6 sm:p-8 border-t border-slate-100 shrink-0 bg-white ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button type="submit" disabled={isSubmitting} className={`flex items-center gap-2 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-white bg-indigo-600 rounded-2xl shadow-xl hover:shadow-indigo-600/40 transition-all min-w-[160px] justify-center active:scale-95 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (isEdit ? <Check size={18} /> : null)}
                                <span>{isEdit ? t('players.editPlayer') : (isRTL ? 'التالي (العروض) ←' : 'Next (Plans) →')}</span>
                            </button>
                            <button type="button" onClick={onClose} className="px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">{t('common.cancel')}</button>
                        </div>
                    </form>
                )}

                {!isEdit && modalStep === 2 && (
                    <form onSubmit={doSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            <label className={`block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>🏆 {t('players.choosePlan')}</label>
                            <div className="grid grid-cols-1 gap-4">
                                <label className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${isRTL ? 'flex-row-reverse' : ''} ${formData.subscription_type === 'Free' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-100'}`}>
                                    <input type="radio" name="subscription_type" value="Free" checked={formData.subscription_type === 'Free'} onChange={handleInputChange} className="accent-emerald-500" />
                                    <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        <div className="font-extrabold text-slate-800 text-sm">{isRTL ? 'مجاني (عرض خاص)' : 'Free (Special Offer)'}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{isRTL ? 'للأيتام أو الحالات الاجتماعية' : 'For orphans or social cases'}</div>
                                    </div>
                                    <span className="text-lg font-black text-emerald-600">0 {t('common.currency')}</span>
                                </label>
                                {subscriptionPlans.filter(p => !p.billing_cycles?.includes('free')).map(plan => (
                                    <label key={plan.id} className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${isRTL ? 'flex-row-reverse' : ''} ${formData.subscription_type === plan.name ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-slate-100'}`}>
                                        <input type="radio" name="subscription_type" value={plan.name} checked={formData.subscription_type === plan.name} onChange={handleInputChange} className="accent-indigo-600" />
                                        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className="font-extrabold text-slate-800 text-sm">{plan.name}</div>
                                        </div>
                                        <div className={`${isRTL ? 'text-left' : 'text-right'} font-black text-indigo-700 text-sm`}>
                                            {plan.monthly_price} {t('common.currency')}/{isRTL ? 'شهر' : 'mo'}
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{t('players.profileSummary')}</div>
                                <div className="space-y-3">
                                    <div className={`flex justify-between text-sm font-bold ${isRTL ? 'flex-row-reverse' : ''}`}><span className="text-slate-400">{isRTL ? 'اللاعب:' : 'Player:'}</span><span className="text-slate-900">{formData.full_name}</span></div>
                                    <div className={`flex justify-between text-sm font-bold border-t border-slate-200 pt-3 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}><span className="text-slate-400">{t('players.totalMonthly')}:</span><span className="text-lg font-black text-slate-900">{formData.subscription_type === 'Free' ? `0 ${t('common.currency')}` : `${selectedPlanObj?.monthly_price || 0} ${t('common.currency')}`}</span></div>
                                </div>
                            </div>
                        </div>
                        <div className={`flex justify-between gap-4 p-6 sm:p-8 border-t border-slate-100 shrink-0 bg-white ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button type="submit" disabled={isSubmitting} className={`flex-1 items-center gap-2 px-8 py-4 text-xs font-black uppercase tracking-widest text-white bg-indigo-600 rounded-2xl shadow-xl flex justify-center transition-all active:scale-95 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                <span>{t('players.confirmRegister')}</span>
                            </button>
                            <button type="button" onClick={() => setModalStep(1)} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">{t('common.back')}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

const PlayersManagement = () => {
    const { t, isRTL, dir } = useLanguage();
    const [players, setPlayers] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
    const [isMatchesModalOpen, setIsMatchesModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [resolvingRequestId, setResolvingRequestId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null, type: '' });
    const toast = useToast();

    useEffect(() => {
        return () => document.body.classList.remove('modal-open');
    }, []);

    const [formData, setFormData] = useState({
        full_name: '', parent_name: '', parent_whatsapp: '', birth_date: '', address: '',
        u_category: 'U11', technical_level: 'B', subscription_type: 'Monthly',
        discount_type: 'none', discount_value: '', account_status: 'Pending', photo_url: '',
        blood_type: '', medical_cert_valid_until: '', transport_zone: '', allergies: '', emergency_contact: ''
    });

    const [subscriptionPlans, setSubscriptionPlans] = useState([]);
    const [settings, setSettings] = useState(null);
    const [modalStep, setModalStep] = useState(1);

    const fetchPlayers = async () => {
        setLoading(true);
        setFetchError(null);

        // Players (critical)
        try {
            const res = await authFetch(`${API_URL}/players/`);
            if (res.ok) {
                const data = await res.json();
                setPlayers(Array.isArray(data) ? data : []);
            } else {
                setFetchError(isRTL ? 'فشل تحميل اللاعبين من الخادم' : 'Failed to load players from server');
            }
        } catch {
            setFetchError(isRTL ? 'تعذر الاتصال بالخادم. تأكد من أن السيرفر شغال.' : 'Cannot connect to server. Make sure the backend is running on port 8000.');
        }

        // Plans (non-critical)
        try {
            const res = await authFetch(`${API_URL}/plans/`);
            if (res.ok) setSubscriptionPlans(await res.json());
        } catch { /* ignore */ }

        // Pending requests (non-critical)
        try {
            const res = await authFetch(`${API_URL}/public/admin/requests?request_status=active`);
            if (res.ok) setPendingRequests(await res.json() || []);
        } catch { /* ignore */ }

        // Settings (non-critical)
        try {
            const res = await authFetch(`${API_URL}/settings/`);
            if (res.ok) setSettings(await res.json());
        } catch { /* ignore */ }

        setLoading(false);
    };

    useEffect(() => {
        fetchPlayers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDelete = (userId) => {
        setConfirmDialog({ isOpen: true, id: userId, type: 'player' });
    };

    const confirmDeletePlayer = async () => {
        const userId = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null, type: '' });
        try {
            const res = await authFetch(`${API_URL}/players/${userId}`, { method: 'DELETE' });
            if (res.ok) setPlayers(players.filter(p => p.user_id !== userId));
        } catch (err) { showBanner(err.message, 'error'); }
    };



    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            if (name === 'birth_date' && value) {
                const age = new Date().getFullYear() - new Date(value).getFullYear();
                if (settings?.age_categories) {
                    const matched = settings.age_categories.find(cat =>
                        cat.toUpperCase() === `U${age}` || cat.toUpperCase() === `U${age + 1}`
                    );
                    if (matched) newData.u_category = matched;
                    else if (age >= 18) newData.u_category = 'Senior';
                }
            }
            return newData;
        });
    };

    const showBanner = (message, type = 'success') => {
        if (type === 'error') toast.error(message);
        else toast.success(message);
    };

    const openAddModal = () => {
        setFormData({
            full_name: '', parent_name: '', parent_whatsapp: '', birth_date: '', address: '',
            u_category: settings?.age_categories?.[0] || 'U11', technical_level: 'B',
            subscription_type: 'Monthly', discount_type: 'none', discount_value: '',
            account_status: 'Pending', photo_url: '',
            blood_type: '', medical_cert_valid_until: '', transport_zone: '', allergies: '', emergency_contact: ''
        });
        setResolvingRequestId(null); setModalStep(1); setIsAddModalOpen(true);
    };

    const reviewRequest = (req) => {
        setFormData({
            full_name: req.player_name || '', parent_name: req.name || '', parent_whatsapp: req.phone || '',
            birth_date: req.birth_date || '', address: req.address || '',
            u_category: settings?.age_categories?.[0] || 'U11', technical_level: 'B',
            subscription_type: req.plan_name || 'Monthly', discount_type: 'none', discount_value: '',
            account_status: 'Pending', photo_url: '',
            blood_type: '', medical_cert_valid_until: '', transport_zone: '', allergies: '', emergency_contact: ''
        });
        setResolvingRequestId(req.id); setModalStep(1); setIsAddModalOpen(true);
    };

    const openEditModal = (player) => {
        setCurrentPlayer(player);
        setFormData({ ...player, discount_type: player.discount_type || 'none' });
        setModalStep(1); setIsEditModalOpen(true);
    };

    const openMatchesModal = (player) => {
        setCurrentPlayer(player);
        setIsMatchesModalOpen(true);
    };

    const openProfileModal = (player) => {
        setCurrentPlayer(player);
        setIsProfileModalOpen(true);
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault(); setIsSubmitting(true);
        try {
            const payload = {
                ...formData, user_id: generateUUID(),
                discount_type: formData.discount_type === 'none' ? null : formData.discount_type,
                discount_value: formData.discount_value === '' ? null : parseFloat(formData.discount_value),
                birth_date: formData.birth_date || null,
                medical_cert_valid_until: formData.medical_cert_valid_until || null,
                blood_type: formData.blood_type || null,
                transport_zone: formData.transport_zone || null,
                allergies: formData.allergies || null,
                emergency_contact: formData.emergency_contact || null
            };
            const res = await authFetch(`${API_URL}/players/`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                setPlayers([data, ...players]);
                setIsAddModalOpen(false); setModalStep(1);

                // Show prominent success confirmation using SweetAlert2
                Swal.fire({
                    title: isRTL ? 'نجاح!' : 'Success!',
                    text: isRTL ? `تم تسجيل اللاعب ${data.full_name} بنجاح.` : `Player ${data.full_name} registered successfully.`,
                    icon: 'success',
                    confirmButtonText: isRTL ? 'تأكيد' : 'OK',
                    confirmButtonColor: '#4f46e5',
                    background: '#ffffff',
                    customClass: {
                        popup: 'rounded-3xl shadow-2xl border border-slate-100',
                        title: 'font-black text-slate-800 text-2xl',
                        htmlContainer: 'font-bold text-slate-500 mb-4',
                        confirmButton: 'px-8 py-3.5 rounded-2xl font-black tracking-widest uppercase text-sm'
                    }
                });

                if (resolvingRequestId) {
                    try {
                        await authFetch(`${API_URL}/public/admin/requests/${resolvingRequestId}`,
                            { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) });
                        setPendingRequests(prev => prev.filter(r => r.id !== resolvingRequestId));
                    } catch { setPendingRequests(prev => prev.filter(r => r.id !== resolvingRequestId)); }
                }
            } else {
                const errData = await res.json();
                let errorMsg = isRTL ? 'فشل في إضافة اللاعب' : 'Failed to add player';
                if (Array.isArray(errData.detail)) errorMsg = errData.detail.map(e => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join('\n');
                else if (errData.detail) errorMsg = errData.detail;
                showBanner(`${isRTL ? 'خطأ' : 'Error'}: ${errorMsg}`, 'error');
            }
        } catch (err) {
            showBanner((isRTL ? 'فشل الاتصال بالخادم: ' : 'Server connection failed: ') + err.message, 'error');
        } finally { setIsSubmitting(false); }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault(); setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                discount_type: formData.discount_type === 'none' ? null : formData.discount_type,
                discount_value: formData.discount_value === '' ? null : parseFloat(formData.discount_value),
                birth_date: formData.birth_date || null,
                medical_cert_valid_until: formData.medical_cert_valid_until || null,
                blood_type: formData.blood_type || null,
                transport_zone: formData.transport_zone || null,
                allergies: formData.allergies || null,
                emergency_contact: formData.emergency_contact || null
            };
            const res = await authFetch(`${API_URL}/players/${currentPlayer.user_id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                setPlayers(players.map(p => p.user_id === data.user_id ? data : p));
                setIsEditModalOpen(false); setModalStep(1);
                showBanner(isRTL ? 'تم تحديث البيانات بنجاح!' : 'Data updated successfully!', 'success');
            } else {
                const errData = await res.json();
                let errorMsg = isRTL ? 'فشل في التعديل' : 'Failed to edit';
                if (Array.isArray(errData.detail)) errorMsg = errData.detail.map(e => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join('\n');
                else if (errData.detail) errorMsg = errData.detail;
                showBanner(`${isRTL ? 'خطأ' : 'Error'}: ${errorMsg}`, 'error');
            }
        } catch (err) {
            showBanner((isRTL ? 'فشل الاتصال بالخادم: ' : 'Server connection failed: ') + err.message, 'error');
        } finally { setIsSubmitting(false); }
    };

    const updateRequestStatus = async (id, newStatus) => {
        try {
            const res = await authFetch(`${API_URL}/public/admin/requests/${id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                setPendingRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
                showBanner(isRTL ? 'تم تحديث حالة الطلب' : 'Request status updated', 'success');
            } else {
                showBanner(isRTL ? 'فشل تحديث الطلب' : 'Failed to update request', 'error');
            }
        } catch (err) { showBanner(err.message, 'error'); }
    };

    const deleteRequest = (id) => {
        setConfirmDialog({ isOpen: true, id, type: 'request' });
    };

    const confirmDeleteRequest = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null, type: '' });
        try {
            const res = await authFetch(`${API_URL}/public/admin/requests/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setPendingRequests(prev => prev.filter(r => r.id !== id));
                showBanner(isRTL ? 'تم الحذف بنجاح' : 'Deleted successfully', 'success');
            } else {
                showBanner(isRTL ? 'فشل حذف الطلب' : 'Failed to delete request', 'error');
            }
        } catch (err) { showBanner(err.message, 'error'); }
    };

    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;
    const filteredPlayers = players.filter(p =>
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.parent_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const totalPages = Math.ceil(filteredPlayers.length / PAGE_SIZE);
    const pagedPlayers = filteredPlayers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className={`animate-fade-in ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        {t('players.title').split(' ')[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{t('players.title').split(' ').slice(1).join(' ')}</span>
                        <span className="bg-indigo-600 text-white text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest">{players.length} {t('common.total')}</span>
                    </h1>
                </div>
                <div className={`flex items-center gap-3 w-full md:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button onClick={openAddModal} className={`flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:-translate-y-1 transition-all active:scale-95 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Plus size={18} />
                        <span>{t('players.addPlayer')}</span>
                    </button>
                    <button className={`flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-slate-400 border border-slate-200 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:text-slate-600 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Download size={18} />
                        <span className="hidden sm:inline">{t('common.export')}</span>
                    </button>
                </div>
            </div>

            {/* Toast notifications handled by global Toast provider */}

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
                <div className="mb-10 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden border-r-8 border-r-amber-500">
                    <div className={`p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="bg-amber-100 p-3 rounded-2xl text-amber-600"><Clock size={24} /></div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                                <h2 className="font-extrabold text-slate-800 text-lg">{t('players.pendingRequests')}</h2>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{isRTL ? 'معالجة المسجلين عبر الموقع' : 'Process new web registrants'}</p>
                            </div>
                        </div>
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest">{pendingRequests.length} {isRTL ? 'طلب جديد' : 'New Request'}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full" dir={dir}>
                            <thead>
                                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                    <th className={`px-8 py-5 ${isRTL ? 'text-right' : 'text-left'}`}>{t('players.identity')}</th>
                                    <th className={`px-8 py-5 ${isRTL ? 'text-right' : 'text-left'}`}>{t('players.contact')}</th>
                                    <th className={`px-8 py-5 ${isRTL ? 'text-right' : 'text-left'}`}>{t('players.plan')}</th>
                                    <th className="px-8 py-5 text-center">{t('common.status')}</th>
                                    <th className={`px-8 py-5 ${isRTL ? 'text-left' : 'text-right'}`}>{t('players.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {pendingRequests.map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className={`px-8 py-5 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className="font-extrabold text-slate-900 text-[15px]">{req.player_name || req.name}</div>
                                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{t('players.parentName')}: {req.name}</div>
                                        </td>
                                        <td className={`px-8 py-5 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className={`flex flex-col gap-1 ${isRTL ? 'items-end' : 'items-start'}`}>
                                                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-sm font-bold text-slate-700" dir="ltr">{req.phone || '—'}</span>
                                                    {req.phone && (
                                                        <a href={`https://wa.me/${req.phone.replace(/\D/g, '')}?text=${encodeURIComponent(isRTL ? `مرحبا، بخصوص طلب تسجيل ${req.player_name}` : `Hello, regarding ${req.player_name}'s registration.`)}`}
                                                            target="_blank" rel="noreferrer" className="p-1 px-1.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100">
                                                            <Smartphone size={12} />
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="text-[11px] font-bold text-slate-400">{req.email || '—'}</div>
                                            </div>
                                        </td>
                                        <td className={`px-8 py-5 ${isRTL ? 'text-right' : 'text-left'}`}><span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-tighter">{req.plan_name || t('players.inquiry')}</span></td>
                                        <td className="px-8 py-5 text-center">
                                            {req.status === 'processing' ? (
                                                <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 text-[10.5px] font-black px-4 py-2 rounded-xl border border-blue-300 uppercase">
                                                    <Play size={12} fill="currentColor" className="animate-pulse" /> {t('players.processing')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-[10.5px] font-black px-4 py-2 rounded-xl border border-amber-300 uppercase">
                                                    <Clock size={12} /> {t('players.newRequest')}
                                                </span>
                                            )}
                                        </td>
                                        <td className={`px-8 py-5 ${isRTL ? 'text-left' : 'text-right'}`}>
                                            <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                                                <button onClick={() => reviewRequest(req)} className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all active:scale-95" title={isRTL ? 'قبول وتحويل للاعب' : 'Accept & Convert'}><Check size={16} strokeWidth={2.5} /></button>
                                                <button onClick={() => updateRequestStatus(req.id, req.status === 'processing' ? 'new' : 'processing')} className={`p-2.5 rounded-xl border-2 transition-all ${req.status === 'processing' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-blue-600 bg-blue-50 border-blue-200'}`}>{req.status === 'processing' ? <Clock size={16} /> : <Play size={16} />}</button>
                                                <button onClick={() => deleteRequest(req.id)} className="p-2.5 text-red-500 bg-red-50 border-2 border-red-100 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} strokeWidth={2.5} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Players Table */}
            <div className={`bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden border-b-8 border-b-slate-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className={`p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 bg-slate-50/50 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                    <div className="relative flex-1">
                        <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-5' : 'left-0 pl-5'} flex items-center pointer-events-none text-slate-300`}><Search size={20} /></div>
                        <input type="text" placeholder={t('players.searchPlaceholder')}
                            className={`block w-full ${isRTL ? 'pr-14 pl-6 text-right' : 'pl-14 pr-6 text-left'} py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm`}
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button className={`flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-400 px-6 py-4 rounded-2xl font-black text-xs uppercase transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Filter size={18} />
                        <span>{t('common.filter')}</span>
                    </button>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    {fetchError ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-4">
                            <AlertCircle className="text-red-400" size={48} />
                            <p className="text-sm font-black text-red-500 text-center max-w-sm">{fetchError}</p>
                            <button onClick={fetchPlayers} className="px-6 py-3 text-xs font-black uppercase tracking-widest bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all">
                                {isRTL ? 'إعادة المحاولة' : 'Retry'}
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="flex flex-col items-center justify-center py-40">
                            <Loader2 className="text-indigo-600 animate-spin" size={40} />
                            <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.loading')}</p>
                        </div>
                    ) : pagedPlayers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-4">
                            <Users className="text-slate-200" size={56} />
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{isRTL ? 'لا يوجد لاعبون مسجلون' : 'No players found'}</p>
                            <button onClick={openAddModal} className="px-6 py-3 text-xs font-black uppercase tracking-widest bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all">{t('players.addPlayer')}</button>
                        </div>
                    ) : (
                        <table className="w-full" dir={dir}>
                            <thead>
                                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                    <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('players.playerProfile')}</th>
                                    <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('players.parentName')}</th>
                                    <th className="px-8 py-6 text-center">{t('players.subscription')}</th>
                                    <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.status')}</th>
                                    <th className={`px-8 py-6 ${isRTL ? 'text-left' : 'text-right'}`}>{t('players.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {pagedPlayers.map((player) => (
                                    <tr key={player.user_id} className="hover:bg-slate-50/50 group">
                                        <td className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                                <div className="h-14 w-14 rounded-2xl shrink-0 group-hover:rotate-3 transition-transform relative overflow-hidden">
                                                    {player.photo_url
                                                        ? <img src={player.photo_url} alt={player.full_name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                                                        : null
                                                    }
                                                    <div className={`w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center text-white ${player.photo_url ? 'hidden' : 'flex'}`}>
                                                        <span className="text-[10px] font-black opacity-60">CAT</span>
                                                        <span className="text-sm font-black tracking-tighter">{player.u_category}</span>
                                                    </div>
                                                    {player.technical_level === 'A' && (
                                                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-yellow-400 rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                                                            <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-pulse"></span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-[15px] font-black text-slate-900 tracking-tight">{player.full_name}</div>
                                                        {player.technical_level === 'A' && (
                                                            <span className="bg-yellow-100 text-yellow-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border border-yellow-200">PRO</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] font-bold text-slate-400">{t('players.bornOn')} {player.birth_date}</div>
                                                    <div className={`mt-1 flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
                                                        <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">LVL: {player.technical_level}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className="font-black text-slate-800 text-[14px]">{player.parent_name}</div>
                                            <div className={`flex items-center gap-2 mt-1 ${isRTL ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
                                                <span className="font-bold text-slate-400 text-xs" dir="ltr">{player.parent_whatsapp || '—'}</span>
                                                {player.parent_whatsapp && (
                                                    <a href={`https://wa.me/${player.parent_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-500 transition-colors">
                                                        <Smartphone size={14} />
                                                    </a>
                                                )}
                                            </div>
                                            {(player.medical_cert_valid_until || player.transport_zone) && (
                                                <div className={`flex gap-2 mt-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                                                    {player.medical_cert_valid_until && (
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${new Date(player.medical_cert_valid_until) < new Date() ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                                            {new Date(player.medical_cert_valid_until) < new Date() ? 'طبي منتهي' : 'طبي صالح'}
                                                        </span>
                                                    )}
                                                    {player.transport_zone && (
                                                        <span className="text-[9px] font-black px-2 py-0.5 rounded border bg-indigo-50 text-indigo-600 border-indigo-200">
                                                            نقل: {player.transport_zone}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${player.subscription_type === 'Free' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                                                {player.subscription_type === 'Free' ? t('players.scholarship') : player.subscription_type}
                                            </span>
                                        </td>
                                        <td className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 ${isRTL ? 'flex-row-reverse' : ''} ${player.account_status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : player.account_status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                <span className={`h-2 w-2 rounded-full ${player.account_status === 'Active' ? 'bg-emerald-500 animate-pulse' : player.account_status === 'Pending' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                                                {player.account_status === 'Active' ? t('players.active') : player.account_status === 'Pending' ? t('players.pending') : player.account_status === 'Suspended' ? t('players.suspended') : player.account_status}
                                            </span>
                                        </td>
                                        <td className={`px-8 py-6 ${isRTL ? 'text-left' : 'text-right'}`}>
                                            <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-start' : 'justify-end'}`}>
                                                <button onClick={() => openProfileModal(player)} className="p-3 bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-500 hover:text-white rounded-xl hover:shadow-lg transition-all hover:-translate-y-1" title={isRTL ? 'الملف الشخصي' : 'Profile'}><Eye size={16} /></button>
                                                <button onClick={() => openMatchesModal(player)} className="p-3 bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-500 hover:text-white rounded-xl hover:shadow-lg transition-all hover:-translate-y-1" title={isRTL ? 'المباريات' : 'Matches'}><Trophy size={16} /></button>
                                                <button onClick={() => { setCurrentPlayer(player); setIsBadgeModalOpen(true); }} className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-500 hover:text-white rounded-xl hover:shadow-lg transition-all hover:-translate-y-1" title={t('players.viewCard')}><QrCode size={16} /></button>
                                                <button onClick={() => openEditModal(player)} className="p-3 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white rounded-xl hover:shadow-lg transition-all hover:-translate-y-1" title={isRTL ? 'تعديل البيانات' : 'Edit'}><Edit2 size={16} /></button>
                                                <button onClick={() => handleDelete(player.user_id)} className="p-3 bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white rounded-xl hover:shadow-lg transition-all hover:-translate-y-1" title={isRTL ? 'حذف من النظام' : 'Delete'}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className={`flex items-center justify-between mt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        {isRTL ? `الصفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
                    </span>
                    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                            className="px-4 py-2 text-xs font-black uppercase rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all">◀</button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                            className="px-4 py-2 text-xs font-black uppercase rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all">▶</button>
                    </div>
                </div>
            )}

            <PlayerModal
                isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddSubmit} title={t('players.addPlayer')} isEdit={false}
                modalStep={modalStep} setModalStep={setModalStep} formData={formData}
                handleInputChange={handleInputChange} subscriptionPlans={subscriptionPlans}
                isSubmitting={isSubmitting} settings={settings} t={t} isRTL={isRTL} dir={dir}
            />
            {isEditModalOpen && (
                <PlayerModal
                    isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}
                    onSubmit={handleEditSubmit} title={t('players.editPlayer')} isEdit={true}
                    modalStep={modalStep} setModalStep={setModalStep} formData={formData}
                    handleInputChange={handleInputChange} subscriptionPlans={subscriptionPlans}
                    isSubmitting={isSubmitting} settings={settings} t={t} isRTL={isRTL} dir={dir}
                />
            )}
            <PlayerBadgeModal player={currentPlayer} isOpen={isBadgeModalOpen} onClose={() => setIsBadgeModalOpen(false)} />
            <PlayerMatchesModal player={currentPlayer} isOpen={isMatchesModalOpen} onClose={() => setIsMatchesModalOpen(false)} t={t} isRTL={isRTL} dir={dir} />
            <PlayerProfileModal player={currentPlayer} isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} isRTL={isRTL} dir={dir} />

            <ConfirmDialog
                isOpen={confirmDialog.isOpen && confirmDialog.type === 'player'}
                onConfirm={confirmDeletePlayer}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null, type: '' })}
                isRTL={isRTL}
                title={isRTL ? 'حذف اللاعب' : 'Delete Player'}
                message={isRTL ? 'هل أنت متأكد من حذف هذا اللاعب نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.' : 'Are you sure you want to permanently delete this player? This cannot be undone.'}
            />
            <ConfirmDialog
                isOpen={confirmDialog.isOpen && confirmDialog.type === 'request'}
                onConfirm={confirmDeleteRequest}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null, type: '' })}
                isRTL={isRTL}
                title={isRTL ? 'حذف الطلب' : 'Delete Request'}
                message={isRTL ? 'هل أنت متأكد من حذف هذا الطلب نهائياً؟' : 'Are you sure you want to permanently delete this request?'}
            />
        </div>
    );
};

export default PlayersManagement;
