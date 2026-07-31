import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { Shirt, CheckCircle, Clock, ShieldCheck, Search, Info } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import UpgradeModal from '../../components/UpgradeModal';

import { API_URL } from '../../config.js';

const KitsManagement = () => {
    const { isRTL, dir, t, formatDate } = useLanguage();
    const [playersStatus, setPlayersStatus] = useState([]);
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterPlan, setFilterPlan] = useState('');
    const [upgradePlayer, setUpgradePlayer] = useState(null);
    const toast = useToast();

    // Confirm delivery dialog
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, data: null });

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setIsLoading(true);
        try {
            const res = await authFetch(`${API_URL}/equipment/all-players-status`);
            const plansRes = await authFetch(`${API_URL}/plans/`);
            if (res.ok) {
                const data = await res.json();
                setPlayersStatus(data);
            }
            if (plansRes.ok) {
                setPlans(await plansRes.json());
            }
        } catch (error) {
            console.error('Error fetching kits data:', error);
            toast.error(t('ui.loadError'));
        } finally { 
            setIsLoading(false); 
        }
    };

    const handleDeliverClick = (player, item) => {
        setConfirmDialog({ 
            isOpen: true, 
            data: { player, item } 
        });
    };

    const confirmDelivery = async () => {
        const { player, item } = confirmDialog.data;
        setConfirmDialog({ isOpen: false, data: null });
        
        try {
            const res = await authFetch(`${API_URL}/equipment/deliver`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player_id: player.player_id,
                    player_name: player.player_name,
                    item_name: item.item_name,
                    item_type: 'Kit',
                    size: 'M',
                    quantity: 1
                })
            });
            if (!res.ok) throw new Error();
            toast.success('تم تأكيد تسليم الأمتعة بنجاح!');
            fetchAll(); // Refresh data
        } catch { 
            toast.error(t('ui.saveError')); 
        }
    };

    const filtered = playersStatus.filter(p =>
        (p.player_name?.toLowerCase().includes(search.toLowerCase())) &&
        (!filterPlan || p.plan_name === filterPlan)
    );

    const plansList = [...new Set(playersStatus.map(p => p.plan_name))];

    return (
        <div className={`animate-fade-in pb-10 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h2 className={`text-3xl font-black text-slate-800 tracking-tight flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/30"><Shirt size={28}/></div>
                        تتبع وتوزيع الأمتعة (Kits Tracker)
                    </h2>
                    <p className="text-slate-400 font-bold mt-2 tracking-widest text-sm">متابعة تسليم الأمتعة الرياضية للاعبين حسب الباقة</p>
                </div>
            </div>

            {/* Filters */}
            <div className={`flex gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="relative flex-1">
                    <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={18}/>
                    <input 
                        value={search} 
                        onChange={e=>setSearch(e.target.value)} 
                        placeholder={t('kits.searchPlaceholder')} 
                        className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm`}
                    />
                </div>
                <select 
                    value={filterPlan} 
                    onChange={e=>setFilterPlan(e.target.value)} 
                    className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm cursor-pointer"
                >
                    <option value="">جميع الباقات (All Plans)</option>
                    {plansList.map(plan => <option key={plan} value={plan}>{plan}</option>)}
                </select>
            </div>

            {/* Content List */}
            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-10 text-center border border-slate-200">
                    <Shirt className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-sm">لا توجد بيانات متاحة</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filtered.map(player => {
                        const totalItems = player.status_list.length;
                        const deliveredItems = player.status_list.filter(i => i.status === 'Assigned' || i.status === 'Returned').length;
                        const progress = totalItems > 0 ? (deliveredItems / totalItems) * 100 : 0;
                        const isComplete = totalItems > 0 && deliveredItems === totalItems;

                        return (
                            <div key={player.player_id} className="bg-white rounded-[2rem] border border-slate-200 p-6 premium-shadow hover:border-indigo-200 transition-colors">
                                <div className={`flex flex-col md:flex-row justify-between items-center gap-6 mb-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                                    {/* Player Info */}
                                    <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                                            {player.player_name?.[0]||'?'}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800">{player.player_name}</h3>
                                            <div className={`flex items-center gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <span className="flex items-center gap-1 text-[11px] font-black uppercase bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
                                                    <ShieldCheck size={12} /> {player.plan_name}
                                                </span>
                                                
                                                {/* Upgrade Button (Visible only if > 1 plan exists) */}
                                                {(plans.length > 1) && (
                                                    <button 
                                                        onClick={() => setUpgradePlayer(player)}
                                                        className="flex items-center gap-1 text-[10px] font-black uppercase bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-1 rounded-lg hover:scale-105 shadow-md shadow-amber-500/20 transition-all"
                                                    >
                                                        ⭐ ترقية (Upgrade)
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Progress Bar */}
                                    {totalItems > 0 && (
                                        <div className="w-full md:w-64">
                                            <div className="flex justify-between text-xs font-bold mb-2">
                                                <span className="text-slate-500">معدل التسليم</span>
                                                <span className={isComplete ? 'text-emerald-500' : 'text-amber-500'}>{deliveredItems} / {totalItems}</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`} 
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Items List */}
                                <div className="bg-slate-50 rounded-2xl p-4">
                                    {totalItems === 0 ? (
                                        <div className="flex items-center justify-center gap-2 text-slate-400 py-4 text-sm font-bold">
                                            <Info size={16} /> هذه الباقة لا تتضمن أمتعة مجانية
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {player.status_list.map((item, idx) => {
                                                const delivered = item.status === 'Assigned' || item.status === 'Returned';
                                                
                                                return (
                                                    <div 
                                                        key={idx} 
                                                        className={`flex items-center justify-between p-3 rounded-xl border ${
                                                            delivered 
                                                            ? 'bg-white border-emerald-100' 
                                                            : 'bg-white border-amber-100'
                                                        } ${isRTL ? 'flex-row-reverse' : ''}`}
                                                    >
                                                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                            {delivered ? <CheckCircle size={18} className="text-emerald-500" /> : <Clock size={18} className="text-amber-500" />}
                                                            <div>
                                                                <div className={`text-xs font-bold ${delivered ? 'text-slate-700' : 'text-slate-500'}`}>
                                                                    {item.item_name}
                                                                </div>
                                                                {delivered && (
                                                                    <div className="text-[9px] text-slate-400 mt-0.5">
                                                                        تم في {item.assigned_date}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {!delivered && (
                                                            <button 
                                                                onClick={() => handleDeliverClick(player, item)}
                                                                className="px-3 py-1.5 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all active:scale-95"
                                                            >
                                                                Valider ✓
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onConfirm={confirmDelivery}
                onCancel={() => setConfirmDialog({ isOpen: false, data: null })}
                isRTL={isRTL}
                title="تأكيد التسليم"
                message={`هل أنت متأكد من تسليم ${confirmDialog.data?.item?.item_name} للاعب ${confirmDialog.data?.player?.player_name}؟`}
                confirmText="نعم، تم التسليم"
            />

            <UpgradeModal
                isOpen={!!upgradePlayer}
                onClose={() => setUpgradePlayer(null)}
                currentPlanName={upgradePlayer?.plan_name}
                playerId={upgradePlayer?.player_id}
            />
        </div>
    );
};

export default KitsManagement;
