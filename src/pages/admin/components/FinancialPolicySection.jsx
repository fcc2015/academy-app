import React from 'react';
import { CreditCard } from 'lucide-react';

const FinancialPolicySection = ({
    settings,
    handleInputChange,
    setSettings
}) => {
    return (
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-8 text-white premium-shadow">
            <div className="flex items-center justify-between mb-6 flex-row-reverse">
                <div className="flex items-center gap-3 flex-row-reverse">
                    <CreditCard size={24} />
                    <h3 className="font-black text-xl text-right">السياسة المالية</h3>
                </div>
            </div>

            <div className="space-y-6">
                {/* Pro-Rata Toggle and Config */}
                <div className="bg-white/10 p-5 rounded-2xl border border-white/20" dir="rtl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-right">
                            <h4 className="font-bold text-lg">نظام التخفيض (Pro-Rata)</h4>
                            <p className="text-sm text-indigo-200">تطبيق خصم تلقائي في منتصف الموسم.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="enable_prorata"
                                checked={settings.enable_prorata || false}
                                onChange={handleInputChange}
                                className="sr-only peer"
                            />
                            <div className="w-14 h-7 bg-slate-900/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-400"></div>
                        </label>
                    </div>
                    
                    {settings.enable_prorata && (
                        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="text-right">
                                <label className="block text-xs font-bold text-indigo-200 mb-2">الشهر الذي يبدأ فيه التخفيض</label>
                                <select
                                    name="prorata_start_month"
                                    value={settings.prorata_start_month || 1}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-right"
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                        <option key={m} value={m} className="text-slate-800">شهر {m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="text-right">
                                <label className="block text-xs font-bold text-indigo-200 mb-2">نسبة التخفيض (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    name="prorata_discount_percentage"
                                    value={settings.prorata_discount_percentage || 30}
                                    onChange={(e) => setSettings(s => ({...s, prorata_discount_percentage: parseInt(e.target.value) || 0}))}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-right"
                                    dir="ltr"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Family Discount */}
                <div className="bg-white/10 p-5 rounded-2xl border border-white/20" dir="rtl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-right">
                            <h4 className="font-bold text-lg">تخفيض الإخوة (Family Discount)</h4>
                            <p className="text-sm text-indigo-200">نسبة التخفيض المطبقة تلقائياً على الطفل الثاني فما فوق.</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <label className="block text-xs font-bold text-indigo-200 mb-2">نسبة التخفيض (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            name="family_discount_percentage"
                            value={settings.family_discount_percentage !== undefined ? settings.family_discount_percentage : 10}
                            onChange={(e) => setSettings(s => ({...s, family_discount_percentage: parseInt(e.target.value) || 0}))}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-right"
                            dir="ltr"
                        />
                    </div>
                </div>

                {/* Local Payment Methods Info */}
                <div className="bg-white/10 p-5 rounded-2xl border border-white/20" dir="rtl">
                    <div className="mb-4">
                        <h4 className="font-bold text-lg text-right">معلومات الدفع المحلي (Local Payment Methods)</h4>
                        <p className="text-sm text-indigo-200 text-right">ستظهر هذه المعلومات للآباء عند اختيار طريقة الدفع.</p>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="text-right">
                            <label className="block text-xs font-bold text-indigo-200 mb-2">الحساب البنكي (RIB - Virement)</label>
                            <input
                                type="text"
                                name="bank_rib"
                                value={settings.bank_rib || ''}
                                onChange={handleInputChange}
                                placeholder="مثال: 011 780 0000000000000000 12 (بنك افريقيا)"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-right"
                                dir="ltr"
                            />
                        </div>
                        <div className="text-right">
                            <label className="block text-xs font-bold text-indigo-200 mb-2">حساب كاش بلوس (CashPlus)</label>
                            <input
                                type="text"
                                name="cashplus_details"
                                value={settings.cashplus_details || ''}
                                onChange={handleInputChange}
                                placeholder="رقم الحساب أو الهاتف المرتبط بـ CashPlus"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-right"
                                dir="ltr"
                            />
                        </div>
                        <div className="text-right">
                            <label className="block text-xs font-bold text-indigo-200 mb-2">حساب وفا كاش (Wafacash)</label>
                            <input
                                type="text"
                                name="wafacash_details"
                                value={settings.wafacash_details || ''}
                                onChange={handleInputChange}
                                placeholder="رقم الحساب المرتبط بـ Wafacash"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-white/50 text-right"
                                dir="ltr"
                            />
                        </div>
                    </div>
                </div>

                {/* Registration Fee */}
                <div className="text-right">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">رسوم التسجيل (Registration Fee)</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            name="registration_fee"
                            value={settings.registration_fee}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl font-black text-xl focus:ring-2 focus:ring-white/30 outline-none text-right"
                        />
                        <span className="font-black text-xl">{settings.currency}</span>
                    </div>
                </div>

                {/* Subscription Model Dropdown */}
                <div className="text-right">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">نماذج الفوترة المدعومة (Billing Models)</label>
                    <select
                        name="subscription_model"
                        value={settings.subscription_model}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-sm focus:ring-2 focus:ring-white/30 outline-none appearance-none text-right"
                    >
                        <option value="monthly" className="text-slate-900">شهري فقط (Monthly Only)</option>
                        <option value="annual" className="text-slate-900">سنوي فقط (Annual Only)</option>
                        <option value="both" className="text-slate-900">شهري وسنوي معاً (Both)</option>
                    </select>
                </div>

                {/* Monthly Fee */}
                {(settings.subscription_model === 'monthly' || settings.subscription_model === 'both') && (
                    <div className="text-right">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">الاشتراك الشهري (Monthly Fee)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                name="monthly_subscription"
                                value={settings.monthly_subscription}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl font-black text-xl focus:ring-2 focus:ring-white/30 outline-none text-right"
                            />
                            <span className="font-black text-xl">{settings.currency}</span>
                        </div>
                    </div>
                )}

                {/* Annual Fee */}
                {(settings.subscription_model === 'annual' || settings.subscription_model === 'both') && (
                    <div className="text-right">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">الاشتراك السنوي (Annual Fee)</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                name="annual_subscription"
                                value={settings.annual_subscription}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl font-black text-xl focus:ring-2 focus:ring-white/30 outline-none text-right"
                            />
                            <span className="font-black text-xl">{settings.currency}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinancialPolicySection;
