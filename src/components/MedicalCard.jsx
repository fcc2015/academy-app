import React, { useState } from 'react';
import { Heart, ChevronDown, ChevronUp, AlertTriangle, Droplets, Pill, Stethoscope, Shield } from 'lucide-react';

/**
 * MedicalCard — Expandable medical info card for a player.
 * 
 * Props:
 *   - player: { blood_type, allergies, medical_notes, emergency_contact, emergency_phone, chronic_conditions, medications }
 *   - isRTL: boolean
 */
export default function MedicalCard({ player = {}, isRTL = false }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const fields = [
        { 
            label: isRTL ? 'فصيلة الدم' : 'Blood Type', 
            value: player.blood_type, 
            icon: Droplets, 
            color: 'text-red-600 bg-red-50' 
        },
        { 
            label: isRTL ? 'الحساسية' : 'Allergies', 
            value: player.allergies, 
            icon: AlertTriangle, 
            color: 'text-amber-600 bg-amber-50',
            warn: true
        },
        { 
            label: isRTL ? 'أمراض مزمنة' : 'Chronic Conditions', 
            value: player.chronic_conditions, 
            icon: Stethoscope, 
            color: 'text-violet-600 bg-violet-50',
            warn: true
        },
        { 
            label: isRTL ? 'أدوية' : 'Medications', 
            value: player.medications, 
            icon: Pill, 
            color: 'text-blue-600 bg-blue-50' 
        },
        { 
            label: isRTL ? 'ملاحظات طبية' : 'Medical Notes', 
            value: player.medical_notes, 
            icon: Heart, 
            color: 'text-pink-600 bg-pink-50' 
        },
    ];

    const hasData = fields.some(f => f.value);
    const hasWarnings = fields.filter(f => f.warn && f.value).length;

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            {/* Header — always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`w-full p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
            >
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-2 bg-red-50 text-red-500 rounded-xl">
                        <Heart size={18} />
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">
                            {isRTL ? 'الملف الطبي' : 'Medical Record'}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                            {hasData 
                                ? (hasWarnings > 0 
                                    ? `${hasWarnings} ${isRTL ? 'تنبيهات' : 'alert(s)'}` 
                                    : (isRTL ? 'بدون تنبيهات' : 'No alerts'))
                                : (isRTL ? 'لا توجد بيانات' : 'No data recorded')
                            }
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasWarnings > 0 && (
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] font-black animate-pulse">
                            {hasWarnings}
                        </span>
                    )}
                    {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
            </button>

            {/* Expandable content */}
            <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-6 pb-6 space-y-3">
                    {fields.map((field, i) => {
                        const Icon = field.icon;
                        return (
                            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                <div className={`p-1.5 rounded-lg ${field.color} shrink-0 mt-0.5`}>
                                    <Icon size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{field.label}</p>
                                    <p className={`text-sm font-bold ${field.value ? 'text-slate-800' : 'text-slate-300 italic'}`}>
                                        {field.value || (isRTL ? 'غير مسجل' : 'Not recorded')}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    {/* Emergency contact */}
                    {(player.emergency_contact || player.emergency_phone) && (
                        <div className={`mt-4 p-4 bg-red-50 rounded-xl border border-red-100 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <Shield size={14} className="text-red-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-red-600">
                                    {isRTL ? 'جهة الاتصال للطوارئ' : 'Emergency Contact'}
                                </span>
                            </div>
                            {player.emergency_contact && (
                                <p className="text-sm font-bold text-slate-800">{player.emergency_contact}</p>
                            )}
                            {player.emergency_phone && (
                                <a href={`tel:${player.emergency_phone}`} className="text-sm font-bold text-red-600 hover:underline" dir="ltr">
                                    {player.emergency_phone}
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
