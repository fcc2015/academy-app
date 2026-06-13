import React from 'react';
import { MessageSquare, Phone, Globe, ShieldCheck } from 'lucide-react';

const WhatsAppNotificationsSection = ({
    settings,
    handleInputChange
}) => {
    return (
        <div className="bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-indigo-50/30 flex items-center gap-3 justify-start">
                <MessageSquare className="text-indigo-600" size={20} />
                <h3 className="font-extrabold text-slate-800">إعدادات إشعارات واتساب (WhatsApp Alerts)</h3>
            </div>
            
            <div className="p-8 space-y-6">
                {/* Contact phone / Whatsapp number */}
                <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2 text-right">رقم واتساب الأكاديمية الرسمي</label>
                    <div className="relative">
                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            name="whatsapp_number"
                            value={settings.whatsapp_number || ''}
                            onChange={handleInputChange}
                            placeholder="مثال: 212600000000"
                            className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 text-left"
                            dir="ltr"
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 text-right font-medium">هذا الرقم سيظهر لأولياء الأمور لتسهيل التواصل المباشر مع الإدارة عبر الواتساب.</p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 text-right">خيارات الإرسال التلقائي</label>
                    
                    {/* Toggle: Absence Alert */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="whatsapp_absence_alert"
                                checked={settings.whatsapp_absence_alert ?? true}
                                onChange={handleInputChange}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                        <div className="text-right">
                            <span className="block font-bold text-sm text-slate-800">تنبيهات الغياب التلقائية</span>
                            <span className="text-xs text-slate-500 font-medium">إرسال رسالة واتساب تلقائية لأولياء الأمور فور تسجيل غياب اللاعب.</span>
                        </div>
                    </div>

                    {/* Toggle: Payment Reminder */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="whatsapp_payment_reminder"
                                checked={settings.whatsapp_payment_reminder ?? true}
                                onChange={handleInputChange}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                        <div className="text-right">
                            <span className="block font-bold text-sm text-slate-800">تذكيرات الدفع التلقائية</span>
                            <span className="text-xs text-slate-500 font-medium">إرسال رسائل تذكير قبل/في يوم استحقاق الاشتراك وتنبيهات المتأخرات.</span>
                        </div>
                    </div>
                </div>

                {/* Dropdown: Language preference */}
                <div className="pt-4 border-t border-slate-100">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2 text-right">لغة رسائل الواتساب</label>
                    <div className="relative">
                        <Globe className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            name="whatsapp_language"
                            value={settings.whatsapp_language || 'ar'}
                            onChange={handleInputChange}
                            className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 text-right appearance-none cursor-pointer"
                        >
                            <option value="ar">العربية (Arabic)</option>
                            <option value="fr">الفرنسية (French)</option>
                        </select>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 text-right font-medium">سيتم صياغة وإرسال التنبيهات تلقائياً باللغة المحددة أعلاه.</p>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppNotificationsSection;
