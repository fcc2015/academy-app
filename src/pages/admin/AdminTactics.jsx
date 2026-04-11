import React, { useState, useRef } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../components/Toast';
import { Save, Plus, Trash2, Users, Trophy, Download } from 'lucide-react';

const INITIAL_PLAYERS = [
  { id: 1, number: 1, name: 'GK', top: '85%', left: '48%' },
  { id: 2, number: 2, name: 'RB', top: '70%', left: '80%' },
  { id: 3, number: 3, name: 'CB', top: '75%', left: '60%' },
  { id: 4, number: 4, name: 'CB', top: '75%', left: '35%' },
  { id: 5, number: 5, name: 'LB', top: '70%', left: '15%' },
  { id: 6, number: 6, name: 'CDM', top: '55%', left: '48%' },
  { id: 8, number: 8, name: 'CM', top: '45%', left: '65%' },
  { id: 10, number: 10, name: 'CAM', top: '45%', left: '30%' },
  { id: 7, number: 7, name: 'RW', top: '30%', left: '80%' },
  { id: 11, number: 11, name: 'LW', top: '30%', left: '15%' },
  { id: 9, number: 9, name: 'ST', top: '20%', left: '48%' },
];

const AdminTactics = () => {
    const { dir, isRTL } = useLanguage();
    const toast = useToast();
    const [players, setPlayers] = useState(INITIAL_PLAYERS);
    const [draggingId, setDraggingId] = useState(null);
    const pitchRef = useRef(null);

    const handleMouseDown = (id, e) => {
        setDraggingId(id);
    };

    const handleMouseMove = (e) => {
        if (draggingId === null || !pitchRef.current) return;
        
        const pitchRect = pitchRef.current.getBoundingClientRect();
        let newLeft = ((e.clientX - pitchRect.left) / pitchRect.width) * 100;
        let newTop = ((e.clientY - pitchRect.top) / pitchRect.height) * 100;

        // Constrain within pitch
        newLeft = Math.max(0, Math.min(100, newLeft));
        newTop = Math.max(0, Math.min(100, newTop));

        setPlayers(players.map(p => 
            p.id === draggingId ? { ...p, left: `${newLeft}%`, top: `${newTop}%` } : p
        ));
    };

    const handleMouseUp = () => {
        setDraggingId(null);
    };

    const resetFormation = (formation) => {
        if (formation === '4-3-3') setPlayers(INITIAL_PLAYERS);
        if (formation === '4-4-2') {
            setPlayers([
                { id: 1, number: 1, name: 'GK', top: '85%', left: '48%' },
                { id: 2, number: 2, name: 'RB', top: '70%', left: '80%' },
                { id: 3, number: 3, name: 'CB', top: '75%', left: '60%' },
                { id: 4, number: 4, name: 'CB', top: '75%', left: '35%' },
                { id: 5, number: 5, name: 'LB', top: '70%', left: '15%' },
                { id: 6, number: 7, name: 'RM', top: '45%', left: '80%' },
                { id: 8, number: 8, name: 'CM', top: '50%', left: '60%' },
                { id: 10, number: 6, name: 'CM', top: '50%', left: '35%' },
                { id: 7, number: 11, name: 'LM', top: '45%', left: '15%' },
                { id: 11, number: 9, name: 'ST', top: '30%', left: '35%' },
                { id: 9, number: 10, name: 'ST', top: '30%', left: '60%' },
            ]);
        }
    };

    const saveTactics = () => {
        toast.success(isRTL ? "تم حفظ التشكيلة بنجاح!" : "Tactics saved successfully!");
    };

    return (
        <div className={`animate-fade-in pb-10 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir} onMouseUp={handleMouseUp}>
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-center mb-8 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h2 className={`text-4xl font-black text-slate-800 tracking-tight flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/30">
                            <Users size={32} />
                        </div>
                        {isRTL ? 'السبورة التكتيكية' : 'Tactics Board'}
                    </h2>
                    <p className="text-slate-400 font-bold mt-2 tracking-widest text-sm uppercase">
                        {isRTL ? 'اسحب وأفلت اللاعبين لرسم الخطة' : 'Drag and drop players to build your formation'}
                    </p>
                </div>
                <div className="flex gap-4">
                    <button onClick={saveTactics} className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-600/20 hover:scale-105 transition-all">
                        <Save size={18} /> {isRTL ? 'حفظ' : 'Save'}
                    </button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-sm hover:scale-105 transition-all">
                        <Download size={18} /> {isRTL ? 'تصدير' : 'Export'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sideline Controls */}
                <div className="w-full lg:w-80 space-y-6">
                    <div className="bg-white rounded-[2rem] border border-slate-200 premium-shadow p-6">
                        <h3 className="font-extrabold text-slate-800 text-lg mb-6 flex items-center gap-2">
                            <Trophy size={20} className="text-emerald-500" />
                            {isRTL ? 'التشكيلات (Formations)' : 'Formations'}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {['4-3-3', '4-4-2', '3-5-2', '5-3-2'].map(form => (
                                <button key={form} 
                                    onClick={() => resetFormation(form)}
                                    className="p-3 bg-slate-50 border border-slate-100 hover:border-emerald-500 hover:text-emerald-600 rounded-xl font-black text-sm text-slate-600 transition-colors">
                                    {form}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-200 premium-shadow p-6">
                        <h3 className="font-extrabold text-slate-800 text-lg mb-6">
                            {isRTL ? 'التعليمات' : 'Instructions'}
                        </h3>
                        <ul className="space-y-3 text-sm font-bold text-slate-500">
                            <li className="flex gap-2"><span>1.</span> {isRTL ? 'اختر التشكيلة من الأعلى' : 'Select a formation above'}</li>
                            <li className="flex gap-2"><span>2.</span> {isRTL ? 'اسحب الدوائر داخل الملعب' : 'Drag circles to move players'}</li>
                            <li className="flex gap-2"><span>3.</span> {isRTL ? 'احفظ التشكيلة لتطبيقها' : 'Save the tactics to apply it'}</li>
                        </ul>
                    </div>
                </div>

                {/* Pitch Area */}
                <div className="flex-1 bg-white p-6 rounded-[2rem] border border-slate-200 premium-shadow flex items-center justify-center overflow-hidden">
                    <div 
                        ref={pitchRef}
                        onMouseMove={handleMouseMove}
                        className="relative w-full max-w-[500px] aspect-[1/1.5] rounded-lg shadow-inner overflow-hidden"
                        style={{
                            background: '#2e7d32', // Green grass
                            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,255,255,0.05) 50px, rgba(255,255,255,0.05) 100px)',
                            border: '4px solid white',
                            boxSizing: 'border-box'
                        }}
                    >
                        {/* Center Circle & Line */}
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-white/60 -translate-y-1/2"></div>
                        <div className="absolute top-1/2 left-1/2 w-32 h-32 border-4 border-white/60 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white/60 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                        
                        {/* Penalty Areas */}
                        {/* Top */}
                        <div className="absolute top-0 left-1/2 w-64 h-32 border-4 border-t-0 border-white/60 -translate-x-1/2"></div>
                        <div className="absolute top-0 left-1/2 w-32 h-12 border-4 border-t-0 border-white/60 -translate-x-1/2"></div>
                        <div className="absolute top-24 left-1/2 w-16 h-8 border-4 border-white/60 rounded-b-full border-t-0 -translate-x-1/2"></div>
                        <div className="absolute top-20 left-1/2 w-2 h-2 bg-white/60 rounded-full -translate-x-1/2"></div>
                        
                        {/* Bottom */}
                        <div className="absolute bottom-0 left-1/2 w-64 h-32 border-4 border-b-0 border-white/60 -translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-1/2 w-32 h-12 border-4 border-b-0 border-white/60 -translate-x-1/2"></div>
                        <div className="absolute bottom-24 left-1/2 w-16 h-8 border-4 border-white/60 rounded-t-full border-b-0 -translate-x-1/2"></div>
                        <div className="absolute bottom-20 left-1/2 w-2 h-2 bg-white/60 rounded-full -translate-x-1/2"></div>

                        {/* Players */}
                        {players.map(p => (
                            <div 
                                key={p.id}
                                onMouseDown={(e) => handleMouseDown(p.id, e)}
                                className={`absolute w-10 h-10 rounded-full flex flex-col items-center justify-center text-white font-extrabold shadow-lg cursor-grab active:cursor-grabbing transform -translate-x-1/2 -translate-y-1/2 transition-transform ${draggingId === p.id ? 'scale-125 z-50 bg-indigo-600 border-2 border-white' : 'hover:scale-110 bg-[#ea4335] border-2 border-white/50'}`}
                                style={{
                                    left: p.left,
                                    top: p.top,
                                    userSelect: 'none'
                                }}
                            >
                                <span className="text-sm">{p.number}</span>
                                <span className="absolute -bottom-6 text-[10px] uppercase font-black tracking-widest text-[#fff] bg-black/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    {p.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminTactics;
