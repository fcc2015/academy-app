import React, { useState } from 'react';
import {
    Star,
    Plus,
    X,
    Check,
    Edit2,
    Trash2,
    Calendar,
    DollarSign
} from 'lucide-react';
import { API_URL } from '../../../config';
import { authFetch } from '../../../api';

const planColorMap = {
    gold: { bg: 'from-yellow-50 to-amber-100', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-800', dot: 'bg-yellow-500' },
    silver: { bg: 'from-slate-50 to-slate-100', border: 'border-slate-300', badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
    bronze: { bg: 'from-orange-50 to-orange-100', border: 'border-orange-300', badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-600' },
    blue: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-300', badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
};

const MembershipPlansSection = ({
    plans,
    fetchPlans,
    settings
}) => {
    const [editingPlan, setEditingPlan] = useState(null); // plan being edited
    const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
    const [newPlanData, setNewPlanData] = useState({
        name: '',
        description: '',
        monthly_price: '',
        annual_price: '',
        billing_cycles: ['monthly'],
        features: [],
        color: 'gold',
        sort_order: 0,
        is_seasonal: false,
        season_start: '',
        season_end: '',
        registration_fee: '',
        one_time_fee: ''
    });
    const [newFeatureInput, setNewFeatureInput] = useState('');
    const [editFeatureInput, setEditFeatureInput] = useState('');
    const [confirmDeletePlanId, setConfirmDeletePlanId] = useState(null);

    const handleCreatePlan = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newPlanData,
                monthly_price: newPlanData.monthly_price ? parseFloat(newPlanData.monthly_price) : null,
                annual_price: newPlanData.annual_price ? parseFloat(newPlanData.annual_price) : null,
                registration_fee: newPlanData.registration_fee ? parseFloat(newPlanData.registration_fee) : null,
                one_time_fee: newPlanData.one_time_fee ? parseFloat(newPlanData.one_time_fee) : null,
                season_start: newPlanData.is_seasonal ? (newPlanData.season_start || null) : null,
                season_end: newPlanData.is_seasonal ? (newPlanData.season_end || null) : null,
            };
            const res = await authFetch(`${API_URL}/plans/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setNewPlanData({
                    name: '',
                    description: '',
                    monthly_price: '',
                    annual_price: '',
                    billing_cycles: ['monthly'],
                    features: [],
                    color: 'gold',
                    sort_order: 0,
                    is_seasonal: false,
                    season_start: '',
                    season_end: '',
                    registration_fee: '',
                    one_time_fee: ''
                });
                setIsCreatePlanOpen(false);
                fetchPlans();
            }
        } catch (err) {
            console.error('Error creating plan:', err);
        }
    };

    const handleSaveEditPlan = async () => {
        try {
            const payload = {
                ...editingPlan,
                monthly_price: editingPlan.monthly_price !== '' ? parseFloat(editingPlan.monthly_price) || null : null,
                annual_price: editingPlan.annual_price !== '' ? parseFloat(editingPlan.annual_price) || null : null,
                registration_fee: editingPlan.registration_fee !== '' ? parseFloat(editingPlan.registration_fee) || null : null,
                one_time_fee: editingPlan.one_time_fee !== '' ? parseFloat(editingPlan.one_time_fee) || null : null,
                season_start: editingPlan.is_seasonal ? (editingPlan.season_start || null) : null,
                season_end: editingPlan.is_seasonal ? (editingPlan.season_end || null) : null,
            };
            const res = await authFetch(`${API_URL}/plans/${editingPlan.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setEditingPlan(null);
                fetchPlans();
            }
        } catch (err) {
            console.error('Error saving plan:', err);
        }
    };

    const handleDeletePlan = async (id) => {
        try {
            const res = await authFetch(`${API_URL}/plans/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setConfirmDeletePlanId(null);
                fetchPlans();
            } else {
                console.error('Delete failed:', await res.text());
            }
        } catch (err) {
            console.error('Error deleting plan:', err);
        }
    };

    const handleTogglePlan = async (plan) => {
        await authFetch(`${API_URL}/plans/${plan.id}`, {
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

    return (
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-row-reverse">
                <div className="flex items-center gap-3 flex-row-reverse">
                    <Star className="text-amber-500" size={20} fill="currentColor" />
                    <h3 className="font-extrabold text-slate-800 text-right">باقات وعضويات الاشتراك (Plans)</h3>
                    <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">تظهر مباشرة في الصفحة الرئيسية</span>
                </div>
                <button
                    onClick={() => setIsCreatePlanOpen(!isCreatePlanOpen)}
                    className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={16} /> باقة جديدة
                </button>
            </div>

            <div className="p-8 space-y-4">
                {/* Create Plan Form */}
                {isCreatePlanOpen && (
                    <form onSubmit={handleCreatePlan} className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-6 space-y-4 text-right" dir="rtl">
                        <h4 className="font-black text-slate-800 text-lg">إنشاء باقة اشتراك جديدة</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">اسم الباقة</label>
                                <input
                                    required
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white text-right"
                                    placeholder="مثال: الباقة الماسية"
                                    value={newPlanData.name}
                                    onChange={e => setNewPlanData({ ...newPlanData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">اللون المميز</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white"
                                    value={newPlanData.color}
                                    onChange={e => setNewPlanData({ ...newPlanData, color: e.target.value })}
                                >
                                    <option value="gold">ذهبي (Gold)</option>
                                    <option value="silver">فضي (Silver)</option>
                                    <option value="bronze">برونزي (Bronze)</option>
                                    <option value="blue">أزرق (Blue)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">دورات الفوترة المدعومة</label>
                            <div className="flex gap-3 flex-wrap justify-start">
                                {['monthly', 'annual', 'free'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => {
                                            if (c === 'free') {
                                                setNewPlanData(prev => ({
                                                    ...prev,
                                                    billing_cycles: prev.billing_cycles?.includes('free') ? prev.billing_cycles.filter(x => x !== 'free') : ['free']
                                                }));
                                            } else {
                                                setNewPlanData(prev => ({
                                                    ...prev,
                                                    billing_cycles: prev.billing_cycles?.includes('free')
                                                        ? [c]
                                                        : prev.billing_cycles?.includes(c)
                                                            ? prev.billing_cycles.filter(x => x !== c)
                                                            : [...(prev.billing_cycles || []), c]
                                                }));
                                            }
                                        }}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg capitalize transition-all ${newPlanData.billing_cycles?.includes(c)
                                            ? c === 'free' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                                            : 'bg-white text-slate-600 border border-slate-200'
                                            }`}
                                    >
                                        {c === 'free' ? '🎁 مجاني (Free)' : c === 'monthly' ? 'شهري' : 'سنوي'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {!newPlanData.billing_cycles?.includes('free') && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {newPlanData.billing_cycles?.includes('monthly') && (
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">السعر الشهري (MAD)</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white text-left"
                                            placeholder="0"
                                            value={newPlanData.monthly_price}
                                            onChange={e => setNewPlanData({ ...newPlanData, monthly_price: e.target.value })}
                                            dir="ltr"
                                        />
                                    </div>
                                )}
                                {newPlanData.billing_cycles?.includes('annual') && (
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">السعر السنوي (MAD)</label>
                                        <input
                                            type="number"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white text-left"
                                            placeholder="0"
                                            value={newPlanData.annual_price}
                                            onChange={e => setNewPlanData({ ...newPlanData, annual_price: e.target.value })}
                                            dir="ltr"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        {newPlanData.billing_cycles?.includes('free') && (
                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 justify-start">
                                <span className="text-emerald-700 text-sm font-bold">🎁 خطة مجانية — لا تتطلب أي دفع</span>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">الوصف</label>
                            <input
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-right"
                                placeholder="وصف قصير للباقة..."
                                value={newPlanData.description}
                                onChange={e => setNewPlanData({ ...newPlanData, description: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">المميزات / الخدمات المتاحة</label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white text-right"
                                    placeholder="أضف ميزة..."
                                    value={newFeatureInput}
                                    onChange={e => setNewFeatureInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeatureTo(newFeatureInput, setNewPlanData, setNewFeatureInput))}
                                />
                                <button
                                    type="button"
                                    onClick={() => addFeatureTo(newFeatureInput, setNewPlanData, setNewFeatureInput)}
                                    className="px-4 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-xl text-sm"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-start">
                                {newPlanData.features?.map((f, i) => (
                                    <span key={i} className="flex items-center gap-1 bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">
                                        {f}
                                        <button
                                            type="button"
                                            onClick={() => removeFeatureFrom(i, setNewPlanData)}
                                            className="ml-1 text-red-400 hover:text-red-600"
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                        {/* Seasonal Pricing */}
                        <div className="border border-amber-200 rounded-2xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setNewPlanData(prev => ({ ...prev, is_seasonal: !prev.is_seasonal }))}
                                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-colors ${
                                    newPlanData.is_seasonal ? 'bg-amber-100 text-amber-800' : 'bg-amber-50 text-slate-600'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Calendar size={15} />
                                    التسعير الموسمي (Seasonal Pricing)
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                                    newPlanData.is_seasonal ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
                                }`}>
                                    {newPlanData.is_seasonal ? 'مفعّل' : 'معطّل'}
                                </span>
                            </button>
                            {newPlanData.is_seasonal && (
                                <div className="px-4 py-4 bg-amber-50/50 space-y-3">
                                    <p className="text-xs text-amber-700 font-semibold">حدد الموسم بصيغة MM-DD (مثال: 09-01 لبداية سبتمبر)</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">بداية الموسم (MM-DD)</label>
                                            <input
                                                type="text"
                                                pattern="\d{2}-\d{2}"
                                                placeholder="09-01"
                                                maxLength={5}
                                                className="w-full px-4 py-2.5 border border-amber-200 rounded-xl text-sm font-bold bg-white text-left"
                                                value={newPlanData.season_start}
                                                onChange={e => setNewPlanData({ ...newPlanData, season_start: e.target.value })}
                                                dir="ltr"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">نهاية الموسم (MM-DD)</label>
                                            <input
                                                type="text"
                                                pattern="\d{2}-\d{2}"
                                                placeholder="06-30"
                                                maxLength={5}
                                                className="w-full px-4 py-2.5 border border-amber-200 rounded-xl text-sm font-bold bg-white text-left"
                                                value={newPlanData.season_end}
                                                onChange={e => setNewPlanData({ ...newPlanData, season_end: e.target.value })}
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">
                                                <span className="flex items-center gap-1"><DollarSign size={11} /> رسوم التسجيل (MAD)</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                className="w-full px-4 py-2.5 border border-amber-200 rounded-xl text-sm font-bold bg-white text-left"
                                                value={newPlanData.registration_fee}
                                                onChange={e => setNewPlanData({ ...newPlanData, registration_fee: e.target.value })}
                                                dir="ltr"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">
                                                <span className="flex items-center gap-1"><DollarSign size={11} /> رسوم إضافية (MAD)</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                className="w-full px-4 py-2.5 border border-amber-200 rounded-xl text-sm font-bold bg-white text-left"
                                                value={newPlanData.one_time_fee}
                                                onChange={e => setNewPlanData({ ...newPlanData, one_time_fee: e.target.value })}
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsCreatePlanOpen(false)}
                                className="px-5 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
                            >
                                إنشاء الباقة
                            </button>
                        </div>
                    </form>
                )}

                {/* Plans List */}
                <div className="space-y-4">
                    {plans.map(plan => {
                        const colors = planColorMap[plan.color] || planColorMap.gold;
                        const isEditing = editingPlan?.id === plan.id;

                        return (
                            <div
                                key={plan.id}
                                className={`bg-gradient-to-br ${colors.bg} border-2 ${colors.border} rounded-2xl overflow-hidden transition-all ${!plan.is_active ? 'opacity-60' : ''}`}
                            >
                                {/* Plan Header */}
                                <div className="flex items-center justify-between p-5 flex-row-reverse">
                                    <div className="flex items-center gap-3 flex-row-reverse">
                                        <div className={`w-3 h-3 rounded-full ${colors.dot}`}></div>
                                        <div className="text-right">
                                            {isEditing ? (
                                                <input
                                                    className="font-black text-slate-800 text-base border-b-2 border-slate-400 bg-transparent outline-none text-right"
                                                    value={editingPlan.name}
                                                    onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                                />
                                            ) : (
                                                <h4 className="font-black text-slate-800">{plan.name}</h4>
                                            )}
                                            <div className="flex gap-2 mt-1 flex-wrap justify-end">
                                                {plan.billing_cycles?.includes('monthly') && plan.monthly_price && (
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                                                        {plan.monthly_price} MAD/شهريا
                                                    </span>
                                                )}
                                                {plan.billing_cycles?.includes('annual') && plan.annual_price && (
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                                                        {plan.annual_price} MAD/سنويا
                                                    </span>
                                                )}
                                                {plan.is_seasonal && (
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                                                        <Calendar size={10} />
                                                        موسمي {plan.season_start && plan.season_end ? `(${plan.season_start} → ${plan.season_end})` : ''}
                                                    </span>
                                                )}
                                                {plan.registration_fee > 0 && (
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                                        + {plan.registration_fee} تسجيل
                                                    </span>
                                                )}
                                                {!plan.is_active && (
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                                        مخفية
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isEditing ? (
                                            <>
                                                <button
                                                    onClick={handleSaveEditPlan}
                                                    className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingPlan(null)}
                                                    className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setEditingPlan({ ...plan })}
                                                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                                                    title="تعديل الباقة"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleTogglePlan(plan)}
                                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${plan.is_active ? 'bg-white text-slate-600 hover:bg-slate-100' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                                                >
                                                    {plan.is_active ? 'إخفاء' : 'عرض'}
                                                </button>
                                                {confirmDeletePlanId === plan.id ? (
                                                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
                                                        <span className="text-xs font-bold text-red-700">حذف؟</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeletePlan(plan.id)}
                                                            className="px-2.5 py-1 bg-red-600 text-white text-xs font-black rounded-lg hover:bg-red-700 transition-colors"
                                                        >
                                                            نعم
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmDeletePlanId(null)}
                                                            className="px-2.5 py-1 bg-white text-slate-600 border border-slate-200 text-xs font-black rounded-lg hover:bg-slate-100 transition-colors"
                                                        >
                                                            لا
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDeletePlanId(plan.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Plan Edit Fields */}
                                {isEditing && (
                                    <div className="px-5 pb-5 space-y-4 border-t border-black/10 pt-4 text-right" dir="rtl">
                                        {!editingPlan.billing_cycles?.includes('free') && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {editingPlan.billing_cycles?.includes('monthly') && (
                                                    <div>
                                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">السعر الشهري (MAD)</label>
                                                        <input
                                                            type="number"
                                                            className="w-full px-4 py-2 border bg-white border-slate-200 rounded-xl text-sm font-bold text-left"
                                                            value={editingPlan.monthly_price || ''}
                                                            onChange={e => setEditingPlan({ ...editingPlan, monthly_price: e.target.value })}
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                )}
                                                {editingPlan.billing_cycles?.includes('annual') && (
                                                    <div>
                                                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">السعر السنوي (MAD)</label>
                                                        <input
                                                            type="number"
                                                            className="w-full px-4 py-2 border bg-white border-slate-200 rounded-xl text-sm font-bold text-left"
                                                            value={editingPlan.annual_price || ''}
                                                            onChange={e => setEditingPlan({ ...editingPlan, annual_price: e.target.value })}
                                                            dir="ltr"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {editingPlan.billing_cycles?.includes('free') && (
                                            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3 justify-start">
                                                <span className="text-emerald-700 text-sm font-bold">🎁 خطة مجانية — لا تتطلب أي دفع</span>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">دورات الفوترة</label>
                                            <div className="flex gap-3 flex-wrap justify-start">
                                                {['monthly', 'annual', 'free'].map(c => (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => {
                                                            if (c === 'free') {
                                                                setEditingPlan(prev => ({
                                                                    ...prev,
                                                                    billing_cycles: prev.billing_cycles?.includes('free') ? prev.billing_cycles.filter(x => x !== 'free') : ['free']
                                                                }));
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
                                                        }}
                                                        className={`px-4 py-2 text-xs font-bold rounded-lg capitalize ${editingPlan.billing_cycles?.includes(c)
                                                            ? c === 'free' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                                                            : 'bg-white text-slate-600 border border-slate-200'
                                                            }`}
                                                    >
                                                        {c === 'free' ? '🎁 مجاني' : c === 'monthly' ? 'شهري' : 'سنوي'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">الوصف</label>
                                            <input
                                                className="w-full px-4 py-2 border bg-white border-slate-200 rounded-xl text-sm text-right"
                                                value={editingPlan.description || ''}
                                                onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">المميزات</label>
                                            <div className="flex gap-2 mb-2">
                                                <input
                                                    className="flex-1 px-4 py-2 border bg-white border-slate-200 rounded-xl text-sm text-right"
                                                    placeholder="أضف ميزة..."
                                                    value={editFeatureInput}
                                                    onChange={e => setEditFeatureInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeatureTo(editFeatureInput, setEditingPlan, setEditFeatureInput))}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => addFeatureTo(editFeatureInput, setEditingPlan, setEditFeatureInput)}
                                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2 justify-start">
                                                {editingPlan.features?.map((f, i) => (
                                                    <span key={i} className="flex items-center gap-1 bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full">
                                                        {f}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFeatureFrom(i, setEditingPlan)}
                                                            className="ml-1 text-red-400 hover:text-red-600"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">اللون المميز</label>
                                            <select
                                                className="w-full px-4 py-2 border bg-white border-slate-200 rounded-xl text-sm font-bold"
                                                value={editingPlan.color || 'gold'}
                                                onChange={e => setEditingPlan({ ...editingPlan, color: e.target.value })}
                                            >
                                                <option value="gold">ذهبى (Gold)</option>
                                                <option value="silver">فضى (Silver)</option>
                                                <option value="bronze">برونزى (Bronze)</option>
                                                <option value="blue">أزرق (Blue)</option>
                                            </select>
                                        </div>
                                        {/* Seasonal Pricing Edit */}
                                        <div className="md:col-span-2 border border-amber-200 rounded-2xl overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => setEditingPlan(prev => ({ ...prev, is_seasonal: !prev.is_seasonal }))}
                                                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-colors ${
                                                    editingPlan.is_seasonal ? 'bg-amber-100 text-amber-800' : 'bg-amber-50 text-slate-600'
                                                }`}
                                            >
                                                <span className="flex items-center gap-2"><Calendar size={15} /> التسعير الموسمي</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
                                                    editingPlan.is_seasonal ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
                                                }`}>
                                                    {editingPlan.is_seasonal ? 'مفعّل' : 'معطّل'}
                                                </span>
                                            </button>
                                            {editingPlan.is_seasonal && (
                                                <div className="px-4 py-4 bg-amber-50/50 space-y-3">
                                                    <p className="text-xs text-amber-700 font-semibold">صيغة MM-DD (مثال: 09-01)</p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">بداية الموسم</label>
                                                            <input
                                                                type="text"
                                                                placeholder="09-01"
                                                                maxLength={5}
                                                                className="w-full px-4 py-2 border border-amber-200 rounded-xl text-sm font-bold bg-white text-left"
                                                                value={editingPlan.season_start || ''}
                                                                onChange={e => setEditingPlan({ ...editingPlan, season_start: e.target.value })}
                                                                dir="ltr"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">نهاية الموسم</label>
                                                            <input
                                                                type="text"
                                                                placeholder="06-30"
                                                                maxLength={5}
                                                                className="w-full px-4 py-2 border border-amber-200 rounded-xl text-sm font-bold bg-white text-left"
                                                                value={editingPlan.season_end || ''}
                                                                onChange={e => setEditingPlan({ ...editingPlan, season_end: e.target.value })}
                                                                dir="ltr"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">رسوم التسجيل (MAD)</label>
                                                            <input
                                                                type="number" min="0" placeholder="0"
                                                                className="w-full px-4 py-2 border border-amber-200 rounded-xl text-sm font-bold bg-white text-left"
                                                                value={editingPlan.registration_fee || ''}
                                                                onChange={e => setEditingPlan({ ...editingPlan, registration_fee: e.target.value })}
                                                                dir="ltr"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-1">رسوم إضافية (MAD)</label>
                                                            <input
                                                                type="number" min="0" placeholder="0"
                                                                className="w-full px-4 py-2 border border-amber-200 rounded-xl text-sm font-bold bg-white text-left"
                                                                value={editingPlan.one_time_fee || ''}
                                                                onChange={e => setEditingPlan({ ...editingPlan, one_time_fee: e.target.value })}
                                                                dir="ltr"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Features display (non-edit) */}
                                {!isEditing && plan.features?.length > 0 && (
                                    <div className="px-5 pb-4 flex flex-wrap gap-2 justify-end">
                                        {plan.features.map((f, i) => (
                                            <span
                                                key={i}
                                                className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 bg-white/80 px-3 py-1 rounded-full border border-black/10 flex-row-reverse"
                                            >
                                                <Check size={11} className="text-emerald-500" strokeWidth={3} /> {f}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {plans.length === 0 && (
                        <div className="text-center py-12 text-slate-400 font-medium">لا توجد باقات منشأة بعد. اضغط على "باقة جديدة" للبدء.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MembershipPlansSection;
