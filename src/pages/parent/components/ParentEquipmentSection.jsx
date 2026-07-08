import React from 'react';
import { Shirt, Shield, Star, CheckCircle2, Clock } from 'lucide-react';
import UpgradeModal from '../../../components/UpgradeModal';

const ParentEquipmentSection = ({ equipment, plans = [], child = {}, isRTL, isUpgradeModalOpen, setIsUpgradeModalOpen }) => {
    return (
        <div className="animate-slide-up">
            <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-indigo-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-4 bg-indigo-100 text-indigo-600 rounded-[1.5rem] shadow-sm"><Shirt size={28} /></div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">{isRTL ? 'تتبع الألبسة (Clothing Tracking)' : 'Clothing Tracking'}</h3>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{isRTL ? 'متابعة حالة تسليم أمتعة الباقة' : 'Track kit delivery status for your plan'}</p>
                    </div>
                </div>

                <div className="p-8 sm:p-10">
                    {equipment ? (
                        <>
                            {/* Plan Info Banner */}
                            <div className={`flex flex-col md:flex-row items-center justify-between mb-8 p-6 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-[2rem] text-white shadow-xl shadow-indigo-500/20 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm"><Shield size={24} /></div>
                                    <div className={isRTL ? 'text-right' : 'text-left'}>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-100 mb-1">{isRTL ? 'باقتك الحالية' : 'Current Plan'}</p>
                                        <h4 className="text-2xl font-black">{equipment.plan_name}</h4>
                                    </div>
                                </div>
                                <div className="mt-4 md:mt-0 text-center md:text-right px-6 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                                    <span className="text-xs font-bold block text-indigo-100 mb-1">{isRTL ? 'الأمتعة المخصصة' : 'Allocated Items'}</span>
                                    <span className="text-xl font-black">{equipment.entitlements.length}</span>
                                </div>
                            </div>

                            {/* Upgrade Prompt (seasonal) */}
                            {(new Date().getMonth() + 1 >= 9 || new Date().getMonth() + 1 <= 1) && (
                                <div className={`mb-8 p-6 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse text-right' : 'text-left'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><Star size={24} /></div>
                                        <div>
                                            <h4 className="text-lg font-black text-amber-900">{isRTL ? 'ترقية الباقة' : 'Upgrade Plan'}</h4>
                                            <p className="text-sm font-bold text-amber-700">{isRTL ? 'احصل على معدات إضافية وميزات أكثر بترقية باقتك' : 'Get more equipment and features by upgrading your plan'}</p>
                                        </div>
                                    </div>
                                    {plans.length > 1 && (
                                        <button
                                            onClick={() => setIsUpgradeModalOpen(true)}
                                            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black rounded-xl hover:scale-105 transition-transform shadow-lg shadow-amber-500/30 whitespace-nowrap"
                                        >
                                            {isRTL ? 'ترقية الآن' : 'Upgrade Now'}
                                        </button>
                                    )}
                                </div>
                            )}

                            <UpgradeModal
                                isOpen={isUpgradeModalOpen}
                                onClose={() => setIsUpgradeModalOpen(false)}
                                currentPlanName={equipment.plan_name}
                                playerId={child.user_id}
                            />

                            {/* Items Grid */}
                            {equipment.status_list.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Shirt className="mx-auto mb-4 opacity-20" size={48} />
                                    <p className="font-black uppercase tracking-widest text-sm">{isRTL ? 'لا توجد أمتعة مخصصة في هذه الباقة' : 'No items allocated for this plan'}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {equipment.status_list.map((item, idx) => {
                                        const delivered = item.status === 'Assigned' || item.status === 'Returned';
                                        return (
                                            <div key={idx} className={`p-6 rounded-3xl border-2 transition-all ${delivered ? 'border-emerald-100 bg-emerald-50/30 hover:border-emerald-200' : 'border-amber-100 bg-amber-50/30 hover:border-amber-200'}`}>
                                                <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${delivered ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                        <Shirt size={20} />
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${delivered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {delivered ? (isRTL ? 'تم التسليم ✓' : 'Delivered ✓') : (isRTL ? 'قيد الانتظار ⏳' : 'Pending ⏳')}
                                                    </span>
                                                </div>
                                                <div className={isRTL ? 'text-right' : 'text-left'}>
                                                    <h4 className="text-lg font-black text-slate-800">{item.item_name}</h4>
                                                    {delivered ? (
                                                        <p className="text-xs font-bold text-slate-500 mt-2 flex items-center gap-1.5" dir="ltr">
                                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                                            {item.assigned_date}
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs font-bold text-slate-500 mt-2 flex items-center gap-1.5" dir="ltr">
                                                            <Clock size={14} className="text-amber-500" />
                                                            {isRTL ? 'في انتظار التسليم' : 'Awaiting Delivery'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center py-16 text-slate-400">
                            <Shirt className="mx-auto mb-4 opacity-20" size={64} />
                            <p className="font-black uppercase tracking-widest text-sm text-center">
                                {isRTL ? 'لا توجد أمتعة مرتبطة بهذا اللاعب' : 'No equipment linked to this player'}
                            </p>
                            <p className="text-xs mt-2 text-slate-400 text-center max-w-xs">
                                {isRTL ? 'يرجى التأكد من أن اللاعب مشترك في باقة تحتوي على أمتعة، أو راجع الإدارة.' : 'Please ensure the player is subscribed to a plan with equipment, or contact the admin.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParentEquipmentSection;
