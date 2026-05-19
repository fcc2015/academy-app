import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { Shirt, Save, Plus, X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../components/Toast';

const AVAILABLE_ITEMS = [
    'Tenue de match (بدلة المباريات)',
    'Tenue d\'entraînement (بدلة التدريب)',
    'Survêtement (سيرفيت)',
    'Sac (حقيبة)',
    'Protège-tibias (واقي الساق)',
    'Poncho de pluie (معطف المطر)',
    'Ballon (كرة)'
];

const EquipmentSettings = () => {
    const { isRTL, dir } = useLanguage();
    const toast = useToast();
    const [plans, setPlans] = useState([]);
    const [settings, setSettings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch academy plans
            const plansRes = await authFetch(`${API_URL}/plans/`);
            let fetchedPlans = [];
            if (plansRes.ok) {
                fetchedPlans = await plansRes.json();
                setPlans(fetchedPlans);
            }

            // Fetch equipment settings
            const settingsRes = await authFetch(`${API_URL}/equipment/settings`);
            if (settingsRes.ok) {
                const fetchedSettings = await settingsRes.json();
                
                // Initialize state: mapping plan_name -> entitlements array
                const initialSettings = {};
                
                // For each plan, find its setting or default to empty array
                fetchedPlans.forEach(plan => {
                    const existing = fetchedSettings.find(s => s.plan_name === plan.name);
                    initialSettings[plan.name] = existing ? existing.entitlements : [];
                });
                
                // Also add settings for plans that might not be in the plans table (e.g. Free, Default)
                fetchedSettings.forEach(s => {
                    if (!initialSettings[s.plan_name]) {
                        initialSettings[s.plan_name] = s.entitlements;
                        // Add to plans list for UI display if not exists
                        setPlans(prev => [...prev, { name: s.plan_name, description: 'خطة مخصصة' }]);
                    }
                });

                setSettings(initialSettings);
            }
        } catch (error) {
            console.error('Error fetching equipment settings:', error);
            toast.error('حدث خطأ أثناء تحميل الإعدادات');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleItem = (planName, item) => {
        setSettings(prev => {
            const current = prev[planName] || [];
            if (current.includes(item)) {
                return { ...prev, [planName]: current.filter(i => i !== item) };
            } else {
                return { ...prev, [planName]: [...current, item] };
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save settings for each plan
            const promises = Object.keys(settings).map(planName => {
                return authFetch(`${API_URL}/equipment/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        plan_name: planName,
                        entitlements: settings[planName]
                    })
                });
            });

            await Promise.all(promises);
            toast.success('تم حفظ إعدادات الأمتعة بنجاح!');
        } catch (error) {
            console.error('Error saving equipment settings:', error);
            toast.error('حدث خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`animate-fade-in pb-16 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h1 className={`text-3xl font-black text-slate-800 tracking-tight flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30"><Shirt size={32}/></div>
                        إعدادات الأمتعة (Store Settings)
                    </h1>
                    <p className="text-slate-400 font-bold mt-2 tracking-widest text-sm">تحديد الأمتعة المستحقة لكل باقة اشتراك ليتم تتبعها لاحقاً</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={saving || isLoading}
                    className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-4 rounded-2xl font-black tracking-widest text-sm shadow-xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                    {saving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save size={20}/>}
                    حفظ التغييرات
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {plans.map(plan => (
                        <div key={plan.name} className="bg-white rounded-[2.5rem] p-8 border border-slate-200 premium-shadow">
                            <div className={`flex items-center justify-between border-b border-slate-100 pb-6 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800">{plan.name}</h3>
                                        <p className="text-xs text-slate-400 font-bold">{plan.description || 'باقة اشتراك'}</p>
                                    </div>
                                </div>
                                <div className="px-4 py-2 bg-slate-50 rounded-xl text-slate-500 font-black text-xs">
                                    {(settings[plan.name] || []).length} قطع مستحقة
                                </div>
                            </div>

                            <div className="space-y-3">
                                {AVAILABLE_ITEMS.map(item => {
                                    const isSelected = (settings[plan.name] || []).includes(item);
                                    return (
                                        <div 
                                            key={item}
                                            onClick={() => handleToggleItem(plan.name, item)}
                                            className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${isRTL ? 'flex-row-reverse' : ''} ${
                                                isSelected 
                                                ? 'border-indigo-600 bg-indigo-50/50' 
                                                : 'border-slate-100 hover:border-slate-200 bg-white'
                                            }`}
                                        >
                                            <span className={`font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>
                                                {item}
                                            </span>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-transparent'
                                            }`}>
                                                <CheckCircle2 size={14} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EquipmentSettings;
