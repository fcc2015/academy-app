import React from 'react';
import { Globe } from 'lucide-react';

const LandingPageEditorSection = ({
    settings,
    handleInputChange
}) => {
    return (
        <div className="bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                    <Globe size={20} />
                </div>
                <div className="text-right">
                    <h3 className="font-black text-slate-900">الصفحة العامة (Landing Page)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">عدّل النصوص والروابط التي يراها الزوار في الصفحة الرئيسية لأكاديميتك.</p>
                </div>
            </div>
            <div className="p-8 space-y-5">
                <div className="text-right">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">عنوان الترحيب (Hero Title)</label>
                    <input
                        name="hero_title"
                        value={settings.hero_title || ''}
                        onChange={handleInputChange}
                        placeholder="مرحبا بكم في أكاديمية..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 text-right"
                    />
                </div>
                <div className="text-right">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">العنوان الفرعي (Hero Subtitle)</label>
                    <input
                        name="hero_subtitle"
                        value={settings.hero_subtitle || ''}
                        onChange={handleInputChange}
                        placeholder="نصنع الأبطال — تدريب احترافي لكل الأعمار"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 text-right"
                    />
                </div>
                <div className="text-right">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">من نحن (About Text)</label>
                    <textarea
                        name="about_text"
                        value={settings.about_text || ''}
                        onChange={handleInputChange}
                        rows={5}
                        placeholder="اكتب قصة الأكاديمية، رسالتك، قيمك..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20 resize-none text-right"
                    />
                </div>

                <div className="pt-2 border-t border-slate-100 text-right">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">الشبكات الاجتماعية</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 text-left">Facebook URL</label>
                            <input
                                name="facebook_url"
                                value={settings.facebook_url || ''}
                                onChange={handleInputChange}
                                placeholder="https://facebook.com/..."
                                dir="ltr"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 text-left">Instagram URL</label>
                            <input
                                name="instagram_url"
                                value={settings.instagram_url || ''}
                                onChange={handleInputChange}
                                placeholder="https://instagram.com/..."
                                dir="ltr"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 text-left">YouTube URL</label>
                            <input
                                name="youtube_url"
                                value={settings.youtube_url || ''}
                                onChange={handleInputChange}
                                placeholder="https://youtube.com/@..."
                                dir="ltr"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 text-left">WhatsApp Number</label>
                            <input
                                name="whatsapp_number"
                                value={settings.whatsapp_number || ''}
                                onChange={handleInputChange}
                                placeholder="+212600000000"
                                dir="ltr"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPageEditorSection;
