import React from 'react';
import {
    Building,
    Image as ImageIcon,
    MapPin,
    Plus,
    X,
    LandPlot,
    Trophy,
    Check,
    Calendar,
    Mail,
    Phone
} from 'lucide-react';

const GeneralBrandingSection = ({
    settings,
    handleInputChange,
    newCategoryInput,
    setNewCategoryInput,
    addAgeCategory,
    removeAgeCategory,
    newTerrain,
    setNewTerrain,
    TERRAIN_SIZES,
    addTerrain,
    removeTerrain,
    newTournamentInput,
    setNewTournamentInput,
    DEFAULT_TOURNAMENTS,
    addTournament,
    addTournamentPreset,
    removeTournament
}) => {
    return (
        <div className="lg:col-span-2 space-y-8">
            {/* الهوية والعلامة التجارية */}
            <div className="bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 justify-start">
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
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">العنوان الفعلي (Physical Address)</label>
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

                    {/* الفئات العمرية */}
                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">الفئات العمرية الديناميكية (Age Categories)</label>
                        <p className="text-xs text-slate-500 mb-3 font-medium">حدد الفئات المتوفرة (مثل U7، U9، الكبار) المتاحة عند تسجيل لاعبين جدد.</p>
                        
                        <div className="flex gap-2 mb-3">
                            <input 
                                type="text"
                                value={newCategoryInput}
                                onChange={(e) => setNewCategoryInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAgeCategory(e); } }}
                                placeholder="مثال U5، الفريق الأول..."
                                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 text-sm text-right"
                            />
                            <button 
                                type="button" 
                                onClick={addAgeCategory}
                                className="px-5 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl flex items-center gap-2 transition-colors border border-indigo-100"
                            >
                                <Plus size={18} /> إضافة
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
                                            title={`حذف ${cat}`}
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))
                            ) : (
                                <div className="w-full text-center text-sm font-medium text-slate-400 py-2">
                                    لا توجد فئات عمرية محددة. يرجى إضافة بعضها أعلاه.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* الملاعب */}
            <div className="bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-3 justify-start">
                    <LandPlot className="text-emerald-600" size={20} />
                    <h3 className="font-extrabold text-slate-800">الملاعب / Terrains & Pitches</h3>
                </div>
                <div className="p-8 space-y-4" dir="ltr">
                    <p className="text-xs text-slate-500 font-medium leading-relaxed text-left">
                        أضف الملاعب المتوفرة في أكاديميتك لتظهر كخيارات عند جدولة المباريات.
                    </p>

                    <div className="grid grid-cols-12 gap-2">
                        <input
                            type="text"
                            value={newTerrain.name}
                            onChange={(e) => setNewTerrain(t => ({ ...t, name: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTerrain(e); } }}
                            placeholder="مثال: الملعب 1، Stade Principal"
                            className="col-span-7 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-emerald-500/20 text-left"
                        />
                        <select
                            value={newTerrain.size}
                            onChange={(e) => setNewTerrain(t => ({ ...t, size: e.target.value }))}
                            className="col-span-3 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-emerald-500/20"
                        >
                            {TERRAIN_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button
                            type="button"
                            onClick={addTerrain}
                            className="col-span-2 px-3 py-3 bg-emerald-600 text-white hover:bg-emerald-700 font-black rounded-xl flex items-center justify-center gap-1 transition-colors text-sm"
                        >
                            <Plus size={16} /> أضف
                        </button>
                    </div>

                    <div className="space-y-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl min-h-[80px]">
                        {settings.terrains && settings.terrains.length > 0 ? (
                            settings.terrains.map((tr, idx) => (
                                <div
                                    key={idx}
                                    className="group flex items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm hover:border-emerald-300 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <LandPlot className="text-emerald-500" size={16} />
                                        <span className="font-bold text-slate-800 text-sm">{tr.name}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                            {tr.size}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeTerrain(idx)}
                                        className="text-slate-300 opacity-50 group-hover:opacity-100 hover:text-red-500 transition-all p-1 rounded-md hover:bg-red-50"
                                        title={`إزالة ${tr.name}`}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="w-full text-center text-sm font-medium text-slate-400 py-2">
                                لا توجد ملاعب مضافة بعد.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* البطولات والمنافسات */}
            <div className="bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-amber-50/50 flex items-center gap-3 justify-start">
                    <Trophy className="text-amber-600" size={20} />
                    <h3 className="font-extrabold text-slate-800">البطولات والمنافسات / Tournaments</h3>
                </div>
                <div className="p-8 space-y-4" dir="ltr">
                    <p className="text-xs text-slate-500 font-medium leading-relaxed text-left">
                        حدد البطولات التي تشارك فيها أكاديميتك لتظهر عند جدولة المباريات.
                    </p>

                    {/*Presets*/}
                    <div className="flex flex-wrap gap-2 justify-start">
                        {DEFAULT_TOURNAMENTS.map(preset => {
                            const exists = (settings.tournaments_list || []).includes(preset);
                            return (
                                <button
                                    key={preset}
                                    type="button"
                                    disabled={exists}
                                    onClick={() => addTournamentPreset(preset)}
                                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all ${exists
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 active:scale-95'
                                        }`}
                                >
                                    {exists ? <Check size={11} className="inline mr-1" /> : <Plus size={11} className="inline mr-1" />}
                                    {preset}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTournamentInput}
                            onChange={(e) => setNewTournamentInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTournament(e); } }}
                            placeholder="اسم البطولة المخصصة..."
                            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-amber-500/20 uppercase text-left"
                        />
                        <button
                            type="button"
                            onClick={addTournament}
                            className="px-5 py-3 bg-amber-600 text-white hover:bg-amber-700 font-black rounded-xl flex items-center gap-2 transition-colors text-sm"
                        >
                            <Plus size={16} /> أضف
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl min-h-[80px] justify-start">
                        {settings.tournaments_list && settings.tournaments_list.length > 0 ? (
                            settings.tournaments_list.map((tr, idx) => (
                                <span
                                    key={idx}
                                    className="group flex items-center gap-1.5 bg-white border border-amber-200 text-amber-800 text-xs font-black px-3 py-1.5 rounded-xl shadow-sm hover:border-amber-400 transition-all uppercase tracking-wider"
                                >
                                    <Trophy size={12} />
                                    {tr}
                                    <button
                                        type="button"
                                        onClick={() => removeTournament(tr)}
                                        className="ml-1 text-amber-300 opacity-50 group-hover:opacity-100 hover:text-red-500 transition-all bg-amber-50 group-hover:bg-red-50 rounded-md p-0.5"
                                        title={`إزالة ${tr}`}
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))
                        ) : (
                            <div className="w-full text-center text-sm font-medium text-slate-400 py-2">
                                لا توجد بطولات مضافة بعد.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* الموسم الرياضي */}
            <div className="bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 justify-start">
                    <Calendar className="text-indigo-600" size={20} />
                    <h3 className="font-extrabold text-slate-800">برمجة الموسم الرياضي (Saison)</h3>
                </div>
                <div className="p-8 space-y-6" dir="rtl">
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-2 text-right">
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
                                    className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 text-right"
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
                                    className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 text-right"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* معلومات التواصل */}
            <div className="bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 justify-start">
                    <Mail className="text-indigo-600" size={20} />
                    <h3 className="font-extrabold text-slate-800">معلومات التواصل</h3>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2 text-right">البريد الإلكتروني</label>
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
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2 text-right">رقم الهاتف</label>
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
    );
};

export default GeneralBrandingSection;
