import React from 'react';
import { CalendarDays, Download, Search, FileText, FileImage, FileSpreadsheet, Trophy } from 'lucide-react';

const MatchFilters = ({
    isRTL,
    t,
    weekendOnly,
    setWeekendOnly,
    exportOpen,
    setExportOpen,
    exportPDF,
    exportImage,
    exportExcel,
    searchTerm,
    setSearchTerm,
}) => {
    return (
        <div className={`px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <h3 className={`font-extrabold text-slate-800 text-lg flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Trophy size={20} className="text-fuchsia-500" /> {t('matches.archiveSchedule')}
            </h3>

            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                <button
                    type="button"
                    onClick={() => setWeekendOnly(v => !v)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border ${weekendOnly
                        ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-fuchsia-600/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-fuchsia-300'
                        }`}
                    title="Show only Friday/Saturday/Sunday matches"
                >
                    <CalendarDays size={14} /> Weekend
                </button>

                {/* Export menu */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setExportOpen(v => !v)}
                        className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                    >
                        <Download size={14} /> Export
                    </button>
                    {exportOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setExportOpen(false)} />
                            <div className="absolute top-full mt-2 right-0 z-40 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden w-56" dir="ltr">
                                <button onClick={exportPDF} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 text-left transition-colors border-b border-slate-100">
                                    <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"><FileText size={16} /></div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">Download PDF</p>
                                        <p className="text-[10px] text-slate-400 font-bold">Landscape A4</p>
                                    </div>
                                </button>
                                <button onClick={exportImage} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 text-left transition-colors border-b border-slate-100">
                                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><FileImage size={16} /></div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">Download PNG</p>
                                        <p className="text-[10px] text-slate-400 font-bold">High-res image</p>
                                    </div>
                                </button>
                                <button onClick={exportExcel} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-emerald-50 text-left transition-colors">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><FileSpreadsheet size={16} /></div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800">Download Excel</p>
                                        <p className="text-[10px] text-slate-400 font-bold">.xlsx spreadsheet</p>
                                    </div>
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="relative flex-1 sm:w-72">
                    <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={18} />
                    <input
                        type="text"
                        placeholder={t('matches.searchOpponent')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-fuchsia-500/10 outline-none transition-all shadow-sm`}
                    />
                </div>
            </div>
        </div>
    );
};

export default MatchFilters;
