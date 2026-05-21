import React, { useState, useEffect } from 'react';
import { User, Activity, Heart, CreditCard, Shirt, Clock, CheckCircle2, X, Loader2 } from 'lucide-react';
import { API_URL } from '../../../config';
import { authFetch } from '../../../api';
import AttendanceHeatmap from '../../../components/AttendanceHeatmap';
import MedicalCard from '../../../components/MedicalCard';
import PaymentTimeline from '../../../components/PaymentTimeline';

const PlayerProfileModal = ({ isOpen, onClose, player, isRTL, dir }) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [attendance, setAttendance] = useState([]);
    const [payments, setPayments] = useState([]);
    const [equipment, setEquipment] = useState(null);
    const [loadingData, setLoadingData] = useState(false);

    useEffect(() => {
        if (!isOpen || !player) return;
        setActiveTab('profile');
        setAttendance([]);
        setPayments([]);
        setEquipment(null);
        setLoadingData(true);
        Promise.all([
            authFetch(`${API_URL}/attendance/player/${player.user_id}`).then(r => r.ok ? r.json() : []).catch(() => []),
            authFetch(`${API_URL}/finances/payments/player/${player.user_id}`).then(r => r.ok ? r.json() : []).catch(() => []),
            authFetch(`${API_URL}/equipment/player-status/${player.user_id}`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]).then(([att, pay, equip]) => {
            setAttendance(Array.isArray(att) ? att : []);
            setPayments(Array.isArray(pay) ? pay : []);
            setEquipment(equip);
            setLoadingData(false);
        });
    }, [isOpen, player]);

    if (!isOpen || !player) return null;

    const tabs = [
        { id: 'profile',    label: isRTL ? 'الملف'   : 'Profile',    icon: User },
        { id: 'attendance', label: isRTL ? 'الحضور'  : 'Attendance', icon: Activity },
        { id: 'medical',    label: isRTL ? 'الطبي'   : 'Medical',    icon: Heart },
        { id: 'payments',   label: isRTL ? 'المدفوعات': 'Payments',   icon: CreditCard },
        { id: 'equipment',  label: isRTL ? 'تتبع الألبسة'  : 'Equipment',  icon: Shirt },
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

                    {/* Equipment tab */}
                    {activeTab === 'equipment' && !loadingData && equipment && (
                        <div className="space-y-4 animate-fade-in">
                            <div className={`p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div>
                                    <h4 className="font-black text-indigo-900">{isRTL ? 'باقة الأمتعة' : 'Equipment Plan'}</h4>
                                    <p className="text-xs font-bold text-indigo-600">{equipment.plan_name}</p>
                                </div>
                                <div className="text-center px-4 py-1.5 bg-white rounded-xl shadow-sm">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">{isRTL ? 'القطع المخصصة' : 'Allocated'}</span>
                                    <span className="text-lg font-black text-indigo-600 leading-none">{equipment.entitlements?.length || 0}</span>
                                </div>
                            </div>
                            
                            {!equipment.status_list || equipment.status_list.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <Shirt className="mx-auto mb-3 opacity-20" size={32} />
                                    <p className="font-black uppercase tracking-widest text-xs">{isRTL ? 'لا توجد أمتعة' : 'No items allocated'}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {equipment.status_list.map((item, idx) => {
                                        const delivered = item.status === 'Assigned' || item.status === 'Returned';
                                        return (
                                            <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between ${delivered ? 'border-emerald-100 bg-emerald-50/30' : 'border-amber-100 bg-amber-50/30'} ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${delivered ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                        <Shirt size={18} />
                                                    </div>
                                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                                        <h4 className="text-sm font-black text-slate-800">{item.item_name}</h4>
                                                        <p className={`text-[10px] font-bold mt-0.5 flex items-center gap-1 ${delivered ? 'text-emerald-600' : 'text-amber-600'} ${isRTL ? 'flex-row-reverse justify-end' : ''}`} dir="ltr">
                                                            {delivered ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                                                            {delivered ? item.assigned_date : (isRTL ? 'في الانتظار' : 'Pending')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${delivered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {delivered ? (isRTL ? 'تم التسليم' : 'Delivered') : (isRTL ? 'قيد الانتظار' : 'Pending')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayerProfileModal;
