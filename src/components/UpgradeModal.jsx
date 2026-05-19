import React, { useState, useEffect } from 'react';
import { Shield, ArrowRight, X, Loader2, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { API_URL } from '../config';
import { authFetch } from '../api';
import { useToast } from './Toast';

const UpgradeModal = ({ isOpen, onClose, currentPlanName, playerId }) => {
    const { t, isRTL, dir } = useLanguage();
    const [plans, setPlans] = useState([]);
    const [currentPlan, setCurrentPlan] = useState(null);
    const [availableUpgrades, setAvailableUpgrades] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const toast = useToast();

    useEffect(() => {
        if (isOpen) {
            fetchPlans();
        }
    }, [isOpen]);

    const fetchPlans = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/plans/public`);
            if (res.ok) {
                const data = await res.json();
                
                // Sort plans by price (annual) to determine hierarchy
                const sortedPlans = data.sort((a, b) => (a.annual_price || 0) - (b.annual_price || 0));
                setPlans(sortedPlans);

                const current = sortedPlans.find(p => p.name === currentPlanName);
                setCurrentPlan(current);

                if (current) {
                    // Upgrades are plans that are more expensive than current
                    const upgrades = sortedPlans.filter(p => (p.annual_price || 0) > (current.annual_price || 0));
                    setAvailableUpgrades(upgrades);
                } else {
                    setAvailableUpgrades(sortedPlans);
                }
            }
        } catch (error) {
            console.error('Failed to fetch plans', error);
            toast.error(isRTL ? 'خطأ في تحميل الباقات' : 'Error loading plans');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpgrade = async () => {
        if (!selectedPlan) return;
        setIsUpgrading(true);
        try {
            // Note: For parents this should ideally go to a checkout page,
            // but we implement a direct API call or redirect here.
            // Admin updates player plan directly.
            const res = await authFetch(`${API_URL}/players/${playerId}/upgrade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_plan_id: selectedPlan.id })
            });
            
            if (res.ok) {
                toast.success(isRTL ? 'تمت الترقية بنجاح!' : 'Upgrade successful!');
                window.location.reload(); // Reload to reflect changes
            } else {
                const errorData = await res.json().catch(() => ({}));
                toast.error(errorData.detail || (isRTL ? 'فشل في الترقية' : 'Upgrade failed'));
            }
        } catch (error) {
            toast.error(isRTL ? 'خطأ في الاتصال' : 'Network error');
        } finally {
            setIsUpgrading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in" dir={dir}>
            <div className="bg-white rounded-3xl w-full max-w-3xl premium-shadow overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <h2 className="text-xl font-black tracking-tight text-slate-800 flex items-center gap-2">
                        <span className="p-2 bg-amber-100 text-amber-600 rounded-xl"><Shield size={20} /></span>
                        {isRTL ? 'ترقية الباقة' : 'Upgrade Plan'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 size={32} className="animate-spin text-indigo-500 mb-4" />
                            <p className="text-sm font-bold text-slate-500">{isRTL ? 'جاري تحميل الباقات...' : 'Loading plans...'}</p>
                        </div>
                    ) : availableUpgrades.length === 0 ? (
                        <div className="text-center py-20">
                            <Shield className="mx-auto text-slate-300 mb-4" size={48} />
                            <h3 className="text-lg font-black text-slate-800 mb-2">{isRTL ? 'أنت على أعلى باقة!' : 'You are on the highest plan!'}</h3>
                            <p className="text-slate-500 text-sm">{isRTL ? 'لا توجد باقات أعلى للترقية إليها حالياً.' : 'There are no higher plans to upgrade to right now.'}</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Current Plan Summary */}
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">{isRTL ? 'باقتك الحالية' : 'Current Plan'}</p>
                                    <h4 className="text-lg font-black text-slate-800">{currentPlan?.name || currentPlanName}</h4>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-600">{currentPlan?.annual_price} <span className="text-xs text-slate-400">{isRTL ? 'سنوياً' : '/ year'}</span></p>
                                    <p className="text-sm font-bold text-slate-600">{currentPlan?.monthly_price} <span className="text-xs text-slate-400">{isRTL ? 'شهرياً' : '/ month'}</span></p>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                {availableUpgrades.map(plan => {
                                    const annualDiff = (plan.annual_price || 0) - (currentPlan?.annual_price || 0);
                                    const monthlyDiff = (plan.monthly_price || 0) - (currentPlan?.monthly_price || 0);
                                    const isSelected = selectedPlan?.id === plan.id;

                                    return (
                                        <div 
                                            key={plan.id}
                                            onClick={() => setSelectedPlan(plan)}
                                            className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${isSelected ? 'border-amber-500 bg-amber-50 shadow-md shadow-amber-500/20' : 'border-slate-100 hover:border-amber-200 hover:bg-slate-50'}`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <h4 className="text-lg font-black text-slate-800">{plan.name}</h4>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'}`}>
                                                    {isSelected && <Check size={14} strokeWidth={3} />}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2 mb-4 bg-white/50 p-3 rounded-xl">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-medium text-slate-500">{isRTL ? 'الفرق السنوي:' : 'Annual Difference:'}</span>
                                                    <span className="font-black text-emerald-600">+{annualDiff}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-medium text-slate-500">{isRTL ? 'الفرق الشهري:' : 'Monthly Difference:'}</span>
                                                    <span className="font-black text-emerald-600">+{monthlyDiff}</span>
                                                </div>
                                            </div>

                                            <ul className="space-y-2">
                                                {plan.features?.slice(0, 3).map((f, i) => (
                                                    <li key={i} className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                                        <Check size={14} className="text-amber-500" /> {f}
                                                    </li>
                                                ))}
                                                {plan.features?.length > 3 && (
                                                    <li className="text-xs font-bold text-slate-400">+{plan.features.length - 3} {isRTL ? 'ميزات أخرى' : 'more features'}</li>
                                                )}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!isLoading && availableUpgrades.length > 0 && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                            {isRTL ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button 
                            onClick={handleUpgrade}
                            disabled={!selectedPlan || isUpgrading}
                            className="px-6 py-2.5 rounded-xl font-black text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md disabled:opacity-50 flex items-center gap-2"
                        >
                            {isUpgrading ? <Loader2 size={18} className="animate-spin" /> : null}
                            {isRTL ? 'تأكيد الترقية' : 'Confirm Upgrade'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UpgradeModal;
