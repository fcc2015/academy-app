import React from 'react';
import { SlidersHorizontal, ChevronRight, MapPin } from 'lucide-react';

export default function AcademyKpis({
    rolloutStats,
    cityColors,
    cityFilter,
    setCityFilter,
    ROLLOUT_CITIES
}) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-4 h-4 text-surface-500" />
                <h3 className="text-sm font-bold text-surface-700 uppercase tracking-wider">Rollout Pipeline</h3>
            </div>
            <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
                {rolloutStats.filter(s => s.total > 0 || ROLLOUT_CITIES.indexOf(s.city) < 3).map((s, i, arr) => {
                    const c = cityColors(s.city);
                    const isActive = s.total > 0;
                    return (
                        <div key={s.city} className="flex items-center">
                            <button
                                type="button"
                                onClick={() => setCityFilter(cityFilter === s.city ? 'All' : s.city)}
                                className={`flex flex-col items-center px-5 py-3 rounded-xl border transition-all min-w-[110px] ${
                                    cityFilter === s.city
                                        ? `${c.bg} ${c.border} border-2 shadow-md`
                                        : isActive
                                            ? `bg-white border-surface-200 hover:${c.bg} hover:${c.border}`
                                            : 'bg-surface-50 border-surface-100 opacity-50'
                                }`}
                            >
                                <div className={`w-2.5 h-2.5 rounded-full mb-1.5 ${isActive ? c.dot : 'bg-surface-300'}`} />
                                <span className={`text-xs font-bold ${isActive ? c.text : 'text-surface-400'}`}>{s.city}</span>
                                <span className="text-[10px] text-surface-400 mt-0.5">{s.active} active</span>
                            </button>
                            {i < arr.length - 1 && (
                                <ChevronRight className="w-4 h-4 text-surface-300 mx-1 shrink-0" />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
