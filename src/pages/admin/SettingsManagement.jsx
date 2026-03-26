import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import {
    Settings,
    Save,
    Globe,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    Image as ImageIcon,
    Building,
    CheckCircle,
    Tag,
    Star,
    Plus,
    Trash2,
    Edit2,
    X,
    Check,
    Calendar,
    AlertCircle
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';

const SettingsManagement = () => {
    const [settings, setSettings] = useState(null);
    const [coupons, setCoupons] = useState([]);
    const [newCoupon, setNewCoupon] = useState({ code: '', discount_type: 'percentage', discount_value: '' });
    const [newCategoryInput, setNewCategoryInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [statusBanner, setStatusBanner] = useState({ show: false, message: '', type: 'success', id: 0 });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });

    const showBanner = (message, type = 'success') => {
        const id = Date.now();
        setStatusBanner({ show: true, message, type, id });
        setTimeout(() => setStatusBanner(prev => prev.id === id ? { ...prev, show: false } : prev), 5000);
    };

    // Plans state
    const [plans, setPlans] = useState([]);
    const [editingPlan, setEditingPlan] = useState(null); // plan being edited
    const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
    const [newPlanData, setNewPlanData] = useState({ name: '', description: '', monthly_price: '', annual_price: '', billing_cycles: ['monthly'], features: [], color: 'gold', sort_order: 0 });
    const [newFeatureInput, setNewFeatureInput] = useState('');
    const [editFeatureInput, setEditFeatureInput] = useState('');
    const [confirmDeletePlanId, setConfirmDeletePlanId] = useState(null);

    useEffect(() => {
        fetchSettings();
        fetchCoupons();
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await fetch(`${API_URL}/plans/`);
            if (res.ok) setPlans(await res.json());
        } catch (err) { console.error('Error fetching plans:', err); }
    };

    const handleCreatePlan = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newPlanData,
                monthly_price: newPlanData.monthly_price ? parseFloat(newPlanData.monthly_price) : null,
                annual_price: newPlanData.annual_price ? parseFloat(newPlanData.annual_price) : null,
            };
            const res = await fetch(`${API_URL}/plans/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setNewPlanData({ name: '', description: '', monthly_price: '', annual_price: '', billing_cycles: ['monthly'], features: [], color: 'gold', sort_order: 0 });
                setIsCreatePlanOpen(false);
                fetchPlans();
            }
        } catch (err) { console.error('Error creating plan:', err); }
    };

    const handleSaveEditPlan = async () => {
        try {
            const payload = {
                ...editingPlan,
                monthly_price: editingPlan.monthly_price !== '' ? parseFloat(editingPlan.monthly_price) || null : null,
                annual_price: editingPlan.annual_price !== '' ? parseFloat(editingPlan.annual_price) || null : null,
            };
            const res = await fetch(`${API_URL}/plans/${editingPlan.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) { setEditingPlan(null); fetchPlans(); }
        } catch (err) { console.error('Error saving plan:', err); }
    };

    const handleDeletePlan = async (id) => {
        try {
            const res = await fetch(`${API_URL}/plans/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setConfirmDeletePlanId(null);
                fetchPlans();
            } else {
                console.error('Delete failed:', await res.text());
            }
        } catch (err) { console.error('Error deleting plan:', err); }
    };

    const handleTogglePlan = async (plan) => {
        await fetch(`${API_URL}/plans/${plan.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !plan.is_active })
        });
        fetchPlans();
    };



    const addFeatureTo = (input, setter, stateSetter) => {
        if (!input.trim()) return;
        setter(prev => ({ ...prev, features: [...(prev.features || []), input.trim()] }));
        stateSetter('');
    };

    const removeFeatureFrom = (index, setter) => {
        setter(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));
    };

    const planColorMap = {
        gold: { bg: 'from-yellow-50 to-amber-100', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-800', dot: 'bg-yellow-500' },
        silver: { bg: 'from-slate-50 to-slate-100', border: 'border-slate-300', badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
        bronze: { bg: 'from-orange-50 to-orange-100', border: 'border-orange-300', badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-600' },
        blue: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-300', badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
    };

    const fetchCoupons = async () => {
        try {
            const res = await fetch(`${API_URL}/coupons/`);
            if (res.ok) setCoupons(await res.json());
        } catch (error) {
            console.error('Error fetching coupons:', error);
        }
    };

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/settings/`);
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const addAgeCategory = (e) => {
        e.preventDefault();
        if (!newCategoryInput.trim() || !settings) return;
        const cat = newCategoryInput.trim();
        if (settings.age_categories?.includes(cat)) {
            setNewCategoryInput('');
            return;
        }
        setSettings(prev => ({
            ...prev,
            age_categories: [...(prev.age_categories || []), cat]
        }));
        setNewCategoryInput('');
    };

    const removeAgeCategory = (catToRemove) => {
        setSettings(prev => ({
            ...prev,
            age_categories: prev.age_categories.filter(c => c !== catToRemove)
        }));
    };

    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/coupons/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newCoupon,
                    discount_value: parseFloat(newCoupon.discount_value)
                })
            });
            if (res.ok) {
                setNewCoupon({ code: '', discount_type: 'percentage', discount_value: '' });
                fetchCoupons();
                showBanner('Coupon created successfully!', 'success');
            } else {
                showBanner('Error creating coupon', 'error');
            }
        } catch (error) {
            console.error('Error creating coupon:', error);
            showBanner('Error creating coupon: ' + error.message, 'error');
        }
    };

    const handleDeleteCoupon = (id) => {
        setConfirmDialog({ isOpen: true, id });
    };

    const confirmDeleteCoupon = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        try {
            await fetch(`${API_URL}/coupons/${id}`, { method: 'DELETE' });
            fetchCoupons();
        } catch (error) {
            console.error('Error deleting coupon:', error);
        }
    };

    const handleToggleCoupon = async (id, currentStatus) => {
        try {
            await fetch(`${API_URL}/coupons/${id}/toggle?is_active=${!currentStatus}`, { method: 'PATCH' });
            fetchCoupons();
        } catch (error) {
            console.error('Error toggling coupon:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            // Filter out empty season fields to avoid schema errors if they aren't supported
            const cleanedSettings = { ...settings };
            if (!cleanedSettings.season_start) delete cleanedSettings.season_start;
            if (!cleanedSettings.season_end) delete cleanedSettings.season_end;

            const res = await fetch(`${API_URL}/settings/${settings.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanedSettings)
            });

            if (res.ok) {
                setSaveSuccess(true);
                const updated = await res.json();
                setSettings(updated);
                showBanner('Settings saved successfully!', 'success');
                setTimeout(() => setSaveSuccess(false), 3000);
            } else {
                const err = await res.json().catch(() => ({}));
                showBanner(`Error: ${err.detail || 'Failed to save settings'}`, 'error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            showBanner('Connection failed. Is the backend server running?', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-20 text-center font-bold text-slate-400">Loading configurations...</div>;

    return (
        <div className="animate-fade-in pb-20 text-right" dir="rtl">
            {/* Status Banner */}
            {statusBanner.show && (
                <div key={statusBanner.id} className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-fade-in">
                    <div className={`flex items-center gap-4 px-8 py-4 rounded-[2rem] shadow-2xl border-2 backdrop-blur-md ${statusBanner.type === 'success' ? 'bg-emerald-600/90 border-emerald-400 text-white' : 'bg-red-600/90 border-red-400 text-white'}`}>
                        {statusBanner.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                        <span className="font-black text-base" dir="ltr">{statusBanner.message}</span>
                        <button onClick={() => setStatusBanner({ ...statusBanner, show: false })} className="ml-4 hover:bg-white/20 p-1 rounded-full"><X size={16} /></button>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center mb-10 flex-row-reverse">
                <div className="text-right">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                        إعدادات <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">الأكاديمية</span>
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">الإعدادات العامة والهوية البصرية</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* General Information */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <Building className="text-indigo-600" size={20} />
                            <h3 className="font-extrabold text-slate-800">الهوية والعلامة التجارية</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">اسم الأكاديمية</label>
                                    <div className="relative">
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            name="academy_name"
                                            value={settings.academy_name}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">رابط الشعار (Logo URL)</label>
                                    <div className="relative">
                                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            name="logo_url"
                                            value={settings.logo_url || ''}
                                            onChange={handleInputChange}
                                            placeholder="https://example.com/logo.png"
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Physical Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        name="address"
                                        value={settings.address || ''}
                                        onChange={handleInputChange}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                            </div>

                            {/* Age Categories Management */}
                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Dynamic Age Categories</label>
                                <p className="text-xs text-slate-500 mb-3 font-medium">Define the categories (e.g., U7, U9, Senior) available when registering new players.</p>
                                
                                <div className="flex gap-2 mb-3">
                                    <input 
                                        type="text"
                                        value={newCategoryInput}
                                        onChange={(e) => setNewCategoryInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAgeCategory(e); } }}
                                        placeholder="e.g. U5, Pro Team..."
                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 text-sm"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={addAgeCategory}
                                        className="px-5 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl flex items-center gap-2 transition-colors border border-indigo-100"
                                    >
                                        <Plus size={18} /> Add
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl min-h-[80px]">
                                    {settings.age_categories && settings.age_categories.length > 0 ? (
                                        settings.age_categories.map((cat, idx) => (
                                            <span 
                                                key={idx} 
                                                className="group flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold px-3 py-1.5 rounded-xl shadow-sm hover:border-indigo-300 transition-all"
                                            >
                                                {cat}
                                                <button 
                                                    type="button" 
                                                    onClick={() => removeAgeCategory(cat)} 
                                                    className="ml-1 text-slate-400 opacity-50 group-hover:opacity-100 hover:text-red-500 transition-all bg-slate-100 group-hover:bg-red-50 rounded-md p-0.5"
                                                    title={`Remove ${cat}`}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </span>
                                        ))
                                    ) : (
                                        <div className="w-full text-center text-sm font-medium text-slate-400 py-2">
                                            No age categories defined. Please add some above.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <Calendar className="text-indigo-600" size={20} />
                            <h3 className="font-extrabold text-slate-800">برمجة الموسم الرياضي (Saison)</h3>
                        </div>
                        <div className="p-8 space-y-6" dir="rtl">
                            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-2">
                                حدد تواريخ بداية ونهاية الموسم لضبط الإحصائيات وجدولة الدفعات بشكل تلقائي.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2 text-right">بداية الموسم</label>
                                    <div className="relative">
                                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="date"
                                            name="season_start"
                                            value={settings.season_start || ''}
                                            onChange={handleInputChange}
                                            className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2 text-right">نهاية الموسم</label>
                                    <div className="relative">
                                        <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="date"
                                            name="season_end"
                                            value={settings.season_end || ''}
                                            onChange={handleInputChange}
                                            className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                            <Mail className="text-indigo-600" size={20} />
                            <h3 className="font-extrabold text-slate-800">معلومات التواصل</h3>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">البريد الإلكتروني</label>
                                <div className="relative">
                                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="email"
                                        name="contact_email"
                                        value={settings.contact_email || ''}
                                        onChange={handleInputChange}
                                        className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                                        dir="ltr"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">رقم الهاتف</label>
                                <div className="relative">
                                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        name="contact_phone"
                                        value={settings.contact_phone || ''}
                                        onChange={handleInputChange}
                                        className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                                        dir="ltr"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pricing & Subscription */}
                <div className="space-y-8">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-8 text-white premium-shadow">
                        <div className="flex items-center justify-between mb-6 flex-row-reverse">
                            <div className="flex items-center gap-3 flex-row-reverse">
                                <CreditCard size={24} />
                                <h3 className="font-black text-xl text-right">السياسة المالية</h3>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Pro-Rata Toggle */}
                            <div className="flex items-center justify-between bg-white/10 p-4 rounded-xl border border-white/20">
                                <div>
                                    <h4 className="font-bold text-sm">Pro-Rata Billing</h4>
                                    <p className="text-[10px] text-white/70">Calculates partial initial fees for late joiners</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="enable_prorata"
                                        checked={settings.enable_prorata}
                                        onChange={handleInputChange}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-slate-900/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>

                            {/* Registration Fee */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Registration Fee</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        name="registration_fee"
                                        value={settings.registration_fee}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl font-black text-xl focus:ring-2 focus:ring-white/30 outline-none"
                                    />
                                    <span className="font-black text-xl">{settings.currency}</span>
                                </div>
                            </div>

                            {/* Subscription Model Dropdown */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Supported Billing Models</label>
                                <select
                                    name="subscription_model"
                                    value={settings.subscription_model}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-sm focus:ring-2 focus:ring-white/30 outline-none appearance-none"
                                >
                                    <option value="monthly" className="text-slate-900">Monthly Only</option>
                                    <option value="annual" className="text-slate-900">Annual Only</option>
                                    <option value="both" className="text-slate-900">Both Monthly & Annual</option>
                                </select>
                            </div>

                            {/* Monthly Fee */}
                            {(settings.subscription_model === 'monthly' || settings.subscription_model === 'both') && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Monthly Fee</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            name="monthly_subscription"
                                            value={settings.monthly_subscription}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl font-black text-xl focus:ring-2 focus:ring-white/30 outline-none"
                                        />
                                        <span className="font-black text-xl">{settings.currency}</span>
                                    </div>
                                </div>
                            )}

                            {/* Annual Fee */}
                            {(settings.subscription_model === 'annual' || settings.subscription_model === 'both') && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Annual Fee</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            name="annual_subscription"
                                            value={settings.annual_subscription}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl font-black text-xl focus:ring-2 focus:ring-white/30 outline-none"
                                        />
                                        <span className="font-black text-xl">{settings.currency}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-slate-200 premium-shadow">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${saveSuccess ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl'
                                }`}
                        >
                            {isSaving ? 'Saving...' : saveSuccess ? <><CheckCircle size={20} /> Changes Saved</> : <><Save size={20} /> Update Profile</>}
                        </button>
                    </div>

                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 border-dashed text-center">
                        <Globe className="mx-auto text-slate-300 mb-3" size={32} />
                        <h4 className="font-bold text-slate-800 text-sm mb-1">الصفحة الرئيسية العامة</h4>
                        <p className="text-[12px] text-slate-500 font-medium leading-relaxed">أي تغييرات تقوم بها هنا ستنعكس فوراً على واجهة الأكاديمية.</p>
                    </div>
                </div>
            </form>

            {/* Subscription Plans Section */}
            <div className="mt-8 bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Star className="text-amber-500" size={20} fill="currentColor" />
                        <h3 className="font-extrabold text-slate-800">Membership Tiers (Plans)</h3>
                        <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">Live on Landing Page</span>
                    </div>
                    <button onClick={() => setIsCreatePlanOpen(!isCreatePlanOpen)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
                        <Plus size={16} /> New Plan
                    </button>
                </div>

                <div className="p-8 space-y-4">
                    {/* Create Plan Form */}
                    {isCreatePlanOpen && (
                        <form onSubmit={handleCreatePlan} className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-6 space-y-4">
                            <h4 className="font-black text-slate-800">Create New Plan</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Plan Name</label>
                                    <input required className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white" placeholder="e.g. Diamond" value={newPlanData.name} onChange={e => setNewPlanData({ ...newPlanData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Color Theme</label>
                                    <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white" value={newPlanData.color} onChange={e => setNewPlanData({ ...newPlanData, color: e.target.value })}>
                                        <option value="gold">Gold</option>
                                        <option value="silver">Silver</option>
                                        <option value="bronze">Bronze</option>
                                        <option value="blue">Blue</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Supported Billing Cycles</label>
                                <div className="flex gap-3 flex-wrap">
                                    {['monthly', 'annual', 'free'].map(c => (
                                        <button key={c} type="button" onClick={() => {
                                            if (c === 'free') {
                                                setNewPlanData(prev => ({ ...prev, billing_cycles: prev.billing_cycles?.includes('free') ? prev.billing_cycles.filter(x => x !== 'free') : ['free'] }));
                                            } else {
                                                // if free is selected, deselect it first
                                                setNewPlanData(prev => ({
                                                    ...prev,
                                                    billing_cycles: prev.billing_cycles?.includes('free')
                                                        ? [c]
                                                        : prev.billing_cycles?.includes(c)
                                                            ? prev.billing_cycles.filter(x => x !== c)
                                                            : [...(prev.billing_cycles || []), c]
                                                }));
                                            }
                                        }} className={`px-4 py-2 text-xs font-bold rounded-lg capitalize transition-all ${newPlanData.billing_cycles?.includes(c)
                                            ? c === 'free' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                                            : 'bg-white text-slate-600 border border-slate-200'
                                            }`}>{c === 'free' ? '🎁 Free (Majani)' : c.charAt(0).toUpperCase() + c.slice(1)}</button>
                                    ))}
                                </div>
                            </div>
                            {!newPlanData.billing_cycles?.includes('free') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {newPlanData.billing_cycles?.includes('monthly') && (
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Monthly Price (MAD)</label>
                                            <input type="number" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white" placeholder="0" value={newPlanData.monthly_price} onChange={e => setNewPlanData({ ...newPlanData, monthly_price: e.target.value })} />
                                        </div>
                                    )}
                                    {newPlanData.billing_cycles?.includes('annual') && (
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Annual Price (MAD)</label>
                                            <input type="number" className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white" placeholder="0" value={newPlanData.annual_price} onChange={e => setNewPlanData({ ...newPlanData, annual_price: e.target.value })} />
                                        </div>
                                    )}
                                </div>
                            )}
                            {newPlanData.billing_cycles?.includes('free') && (
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                    <span className="text-emerald-700 text-sm font-bold">🎁 Free plan — no payment required</span>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Description</label>
                                <input className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white" placeholder="Short plan description..." value={newPlanData.description} onChange={e => setNewPlanData({ ...newPlanData, description: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Features / Advantages</label>
                                <div className="flex gap-2 mb-2">
                                    <input className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white" placeholder="Add a feature..." value={newFeatureInput} onChange={e => setNewFeatureInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeatureTo(newFeatureInput, setNewPlanData, setNewFeatureInput))} />
                                    <button type="button" onClick={() => addFeatureTo(newFeatureInput, setNewPlanData, setNewFeatureInput)} className="px-4 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-xl text-sm"><Plus size={16} /></button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {newPlanData.features?.map((f, i) => (
                                        <span key={i} className="flex items-center gap-1 bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">{f}<button type="button" onClick={() => removeFeatureFrom(i, setNewPlanData)} className="ml-1 text-red-400 hover:text-red-600"><X size={12} /></button></span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setIsCreatePlanOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl">Cancel</button>
                                <button type="submit" className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">Create Plan</button>
                            </div>
                        </form>
                    )}


                    {/* Plans List */}
                    {plans.map(plan => {
                        const colors = planColorMap[plan.color] || planColorMap.gold;
                        const isEditing = editingPlan?.id === plan.id;

                        return (
                            <div key={plan.id} className={`bg-gradient-to-br ${colors.bg} border-2 ${colors.border} rounded-2xl overflow-hidden transition-all ${!plan.is_active ? 'opacity-60' : ''}`}>
                                {/* Plan Header */}
                                <div className="flex items-center justify-between p-5">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${colors.dot}`}></div>
                                        <div>
                                            {isEditing ? (
                                                <input className="font-black text-slate-800 text-base border-b-2 border-slate-400 bg-transparent outline-none" value={editingPlan.name} onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })} />
                                            ) : (
                                                <h4 className="font-black text-slate-800">{plan.name}</h4>
                                            )}
                                            <div className="flex gap-2 mt-1 flex-wrap">
                                                {plan.billing_cycles?.includes('monthly') && plan.monthly_price && (
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>{plan.monthly_price} MAD/mo</span>
                                                )}
                                                {plan.billing_cycles?.includes('annual') && plan.annual_price && (
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>{plan.annual_price} MAD/yr</span>
                                                )}
                                                {!plan.is_active && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Hidden</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isEditing ? (
                                            <>
                                                <button onClick={handleSaveEditPlan} className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors"><Check size={16} /></button>
                                                <button onClick={() => setEditingPlan(null)} className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"><X size={16} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => setEditingPlan({ ...plan })} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors" title="Edit Plan"><Edit2 size={16} /></button>
                                                <button onClick={() => handleTogglePlan(plan)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${plan.is_active ? 'bg-white text-slate-600 hover:bg-slate-100' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>{plan.is_active ? 'Hide' : 'Show'}</button>
                                                {confirmDeletePlanId === plan.id ? (
                                                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
                                                        <span className="text-xs font-bold text-red-700">Delete?</span>
                                                        <button type="button" onClick={() => handleDeletePlan(plan.id)} className="px-2.5 py-1 bg-red-600 text-white text-xs font-black rounded-lg hover:bg-red-700 transition-colors">Yes</button>
                                                        <button type="button" onClick={() => setConfirmDeletePlanId(null)} className="px-2.5 py-1 bg-white text-slate-600 border border-slate-200 text-xs font-black rounded-lg hover:bg-slate-100 transition-colors">No</button>
                                                    </div>
                                                ) : (
                                                    <button type="button" onClick={() => setConfirmDeletePlanId(plan.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Plan Edit Fields */}
                                {isEditing && (
                                    <div className="px-5 pb-5 space-y-4 border-t border-black/10 pt-4">
                                        {!editingPlan.billing_cycles?.includes('free') && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {editingPlan.billing_cycles?.includes('monthly') && (
                                                    <div>
                                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Monthly Price (MAD)</label>
                                                        <input type="number" className="w-full px-4 py-2 border bg-white border-slate-200 rounded-xl text-sm font-bold" value={editingPlan.monthly_price || ''} onChange={e => setEditingPlan({ ...editingPlan, monthly_price: e.target.value })} />
                                                    </div>
                                                )}
                                                {editingPlan.billing_cycles?.includes('annual') && (
                                                    <div>
                                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Annual Price (MAD)</label>
                                                        <input type="number" className="w-full px-4 py-2 border bg-white border-slate-200 rounded-xl text-sm font-bold" value={editingPlan.annual_price || ''} onChange={e => setEditingPlan({ ...editingPlan, annual_price: e.target.value })} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {editingPlan.billing_cycles?.includes('free') && (
                                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                                                <span className="text-emerald-700 text-sm font-bold">🎁 Free plan — no payment required</span>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Billing Cycles</label>
                                            <div className="flex gap-3 flex-wrap">
                                                {['monthly', 'annual', 'free'].map(c => (
                                                    <button key={c} type="button" onClick={() => {
                                                        if (c === 'free') {
                                                            setEditingPlan(prev => ({ ...prev, billing_cycles: prev.billing_cycles?.includes('free') ? prev.billing_cycles.filter(x => x !== 'free') : ['free'] }));
                                                        } else {
                                                            setEditingPlan(prev => ({
                                                                ...prev,
                                                                billing_cycles: prev.billing_cycles?.includes('free')
                                                                    ? [c]
                                                                    : prev.billing_cycles?.includes(c)
                                                                        ? prev.billing_cycles.filter(x => x !== c)
                                                                        : [...(prev.billing_cycles || []), c]
                                                            }));
                                                        }
                                                    }} className={`px-4 py-2 text-xs font-bold rounded-lg capitalize ${editingPlan.billing_cycles?.includes(c)
                                                        ? c === 'free' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                                                        : 'bg-white text-slate-600 border border-slate-200'
                                                        }`}>{c === 'free' ? '🎁 Free' : c.charAt(0).toUpperCase() + c.slice(1)}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Description</label>
                                            <input className="w-full px-4 py-2 border bg-white border-slate-200 rounded-xl text-sm" value={editingPlan.description || ''} onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Features</label>
                                            <div className="flex gap-2 mb-2">
                                                <input className="flex-1 px-4 py-2 border bg-white border-slate-200 rounded-xl text-sm" placeholder="Add feature..." value={editFeatureInput} onChange={e => setEditFeatureInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeatureTo(editFeatureInput, setEditingPlan, setEditFeatureInput))} />
                                                <button type="button" onClick={() => addFeatureTo(editFeatureInput, setEditingPlan, setEditFeatureInput)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm"><Plus size={16} /></button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {editingPlan.features?.map((f, i) => (
                                                    <span key={i} className="flex items-center gap-1 bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">
                                                        {f}
                                                        <button type="button" onClick={() => removeFeatureFrom(i, setEditingPlan)} className="ml-1 text-red-400 hover:text-red-600"><X size={12} /></button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Color Theme</label>
                                            <select className="w-full px-4 py-2 border bg-white border-slate-200 rounded-xl text-sm font-bold" value={editingPlan.color || 'gold'} onChange={e => setEditingPlan({ ...editingPlan, color: e.target.value })}>
                                                <option value="gold">Gold</option>
                                                <option value="silver">Silver</option>
                                                <option value="bronze">Bronze</option>
                                                <option value="blue">Blue</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Features display (non-edit) */}
                                {!isEditing && plan.features?.length > 0 && (
                                    <div className="px-5 pb-4 flex flex-wrap gap-2">
                                        {plan.features.map((f, i) => (
                                            <span key={i} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-white/80 px-3 py-1 rounded-full border border-black/10">
                                                <Check size={11} className="text-emerald-500" strokeWidth={3} /> {f}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {plans.length === 0 && (
                        <div className="text-center py-12 text-slate-400 font-medium">No plans created yet. Click "New Plan" to get started.</div>
                    )}
                </div>
            </div >


            {/* Coupons Section - Outside main form */}
            < div className="mt-8 bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden" >
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Tag className="text-indigo-600" size={20} />
                        <h3 className="font-extrabold text-slate-800">Promo & Coupons</h3>
                    </div>
                </div>
                <div className="p-8">
                    {/* Create New Coupon */}
                    <form onSubmit={handleCreateCoupon} className="flex flex-wrap gap-4 items-end mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Code</label>
                            <input
                                required
                                value={newCoupon.code}
                                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                                placeholder="e.g. SUMMER20"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold uppercase"
                            />
                        </div>
                        <div className="w-[150px]">
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Type</label>
                            <select
                                value={newCoupon.discount_type}
                                onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold"
                            >
                                <option value="percentage">Percentage %</option>
                                <option value="fixed">Fixed {settings?.currency}</option>
                            </select>
                        </div>
                        <div className="w-[150px]">
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Value</label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={newCoupon.discount_value}
                                onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: e.target.value })}
                                placeholder={newCoupon.discount_type === 'percentage' ? '20' : '500'}
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold"
                            />
                        </div>
                        <button
                            type="submit"
                            className="h-[50px] px-6 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2"
                        >
                            <Plus size={18} /> Add Coupon
                        </button>
                    </form>

                    {/* Coupons List */}
                    <div className="space-y-3">
                        {coupons.length === 0 ? (
                            <div className="text-center p-8 text-slate-400 font-medium">No coupons created yet</div>
                        ) : (
                            coupons.map(coupon => (
                                <div key={coupon.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${coupon.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 opacity-60 border-slate-200'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-black px-4 py-2 rounded-lg tracking-widest uppercase">
                                            {coupon.code}
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-slate-800">
                                                {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `${coupon.discount_value} ${settings?.currency} OFF`}
                                            </p>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                                {coupon.is_active ? 'Active' : 'Disabled'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${coupon.is_active ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                                        >
                                            {coupon.is_active ? 'Disable' : 'Enable'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCoupon(coupon.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onConfirm={confirmDeleteCoupon}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
                isRTL={false}
                title="Delete Coupon"
                message="Are you sure you want to delete this coupon? This cannot be undone."
            />
        </div >
    );
};

export default SettingsManagement;
