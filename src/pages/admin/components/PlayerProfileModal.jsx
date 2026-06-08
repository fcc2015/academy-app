import React, { useState, useEffect } from 'react';
import { User, Activity, Heart, CreditCard, Shirt, Clock, CheckCircle2, X, Loader2, Flame, Trophy, Target } from 'lucide-react';
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
    const [streak, setStreak] = useState(null);

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
            authFetch(`${API_URL}/players/${player.user_id}/streak`).then(r => r.ok ? r.json() : null).catch(() => null),
        ]).then(([att, pay, equip, str]) => {
            setAttendance(Array.isArray(att) ? att : []);
            setPayments(Array.isArray(pay) ? pay : []);
            setEquipment(equip);
            setStreak(str);
            setLoadingData(false);
        });
    }, [isOpen, player]);

    if (!isOpen || !player) return null;

    const tabs = [
        { id: 'profile',    label: isRTL ? 'الملف'      : 'Profile',    icon: User },
        { id: 'attendance', label: isRTL ? 'الحضور'     : 'Attendance', icon: Activity },
        { id: 'streak',     label: isRTL ? 'السلسلة'    : 'Streak',     icon: Flame },
        { id: 'medical',    label: isRTL ? 'الطبي'      : 'Medical',    icon: Heart },
        { id: 'payments',   label: isRTL ? 'المدفوعات'  : 'Payments',   icon: CreditCard },
        { id: 'equipment',  label: isRTL ? 'الألبسة'    : 'Equipment',  icon: Shirt },
    ];

    const TIER_COLORS = {
        Platinum: { bg: 'from-cyan-400 to-blue-600',   badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
        Gold:     { bg: 'from-amber-400 to-yellow-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
        Silver:   { bg: 'from-slate-300 to-slate-500',  badge: 'bg-slate-100 text-slate-600 border-slate-200' },
        Bronze:   { bg: 'from-orange-400 to-amber-700', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
    };

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

                    {/* Streak tab */}
                    {activeTab === 'streak' && !loadingData && (
                        <div className="animate-fade-in space-y-4">
                            {!streak ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-300">
                                    <Flame size={40} />
                                    <p className="text-sm font-black uppercase tracking-widest">{isRTL ? 'لا توجد بيانات حضور' : 'No attendance data yet'}</p>
                                </div>
                            ) : (
                                <>
                                    {/* Current streak hero */}
                                    <div className={`rounded-[2rem] p-6 text-white text-center bg-gradient-to-br ${
                                        streak.reward_tier ? TIER_COLORS[streak.reward_tier]?.bg : 'from-indigo-500 to-purple-600'
                                    }`}>
                                        <div className="text-6xl font-black leading-none">{streak.current_streak}</div>
                                        <div className="text-sm font-black uppercase tracking-widest opacity-80 mt-1">
                                            {isRTL ? 'جلسة متتالية' : 'consecutive sessions'}
                                        </div>
                                        {streak.reward_label && (
                                            <div className="mt-3 inline-block bg-white/20 px-4 py-1.5 rounded-full text-sm font-black">
                                                {streak.reward_label}
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress to next milestone */}
                                    {streak.next_milestone && (
                                        <div className="bg-white rounded-2xl p-4 border border-slate-100">
                                            <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    {isRTL ? 'التقدم نحو المرحلة التالية' : 'Progress to next milestone'}
                                                </span>
                                                <span className="text-[10px] font-black text-indigo-600">
                                                    {streak.current_streak}/{streak.next_milestone}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2">
                                                <div
                                                    className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                                                    style={{ width: `${Math.min((streak.current_streak / streak.next_milestone) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold mt-1.5">
                                                {isRTL
                                                    ? `${streak.sessions_to_next} جلسة متبقية للوصول إلى المستوى التالي`
                                                    : `${streak.sessions_to_next} more sessions to reach next tier`}
                                            </p>
                                        </div>
                                    )}

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { icon: Trophy, label: isRTL ? 'أفضل سلسلة' : 'Best Streak', value: streak.longest_streak, color: 'amber' },
                                            { icon: Activity, label: isRTL ? 'معدل الحضور' : 'Attendance Rate', value: `${streak.attendance_rate}%`, color: 'emerald' },
                                            { icon: Flame, label: isRTL ? 'مرات الحضور' : 'Total Present', value: streak.total_present, color: 'orange' },
                                            { icon: Target, label: isRTL ? 'إجمالي الجلسات' : 'Total Sessions', value: streak.total_sessions, color: 'slate' },
                                        ].map(({ icon: Icon, label, value, color }, i) => (
                                            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                    color === 'amber' ? 'bg-amber-50 text-amber-600' :
                                                    color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                                    color === 'orange' ? 'bg-orange-50 text-orange-500' :
                                                    'bg-slate-100 text-slate-500'
                                                }`}><Icon size={16} /></div>
                                                <div>
                                                    <div className="text-lg font-black text-slate-900">{value}</div>
                                                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Milestone badges */}
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{isRTL ? 'شارات الإنجاز' : 'Achievement Badges'}</p>
                                        <div className={`flex gap-2 flex-wrap ${isRTL ? 'justify-end' : ''}`}>
                                            {[{t:5,l:'🥉 Bronze'},{t:10,l:'🥈 Silver'},{t:20,l:'🥇 Gold'},{t:30,l:'🏆 Platinum'}].map(({t, l}) => (
                                                <span key={t} className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${
                                                    streak.longest_streak >= t
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                        : 'bg-slate-100 text-slate-400 border-slate-200 opacity-50'
                                                }`}>{l}</span>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
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
