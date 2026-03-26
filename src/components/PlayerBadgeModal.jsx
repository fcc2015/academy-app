import React from 'react';
import QRCode from 'react-qr-code';
import { Download, X, User } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useLanguage } from '../i18n/LanguageContext';

const PlayerBadgeModal = ({ player, isOpen, onClose }) => {
    const { isRTL } = useLanguage();

    if (!isOpen || !player) return null;

    const qrData = JSON.stringify({
        id: player.user_id,
        name: player.full_name,
        category: player.u_category,
        dob: player.birth_date,
        emergency: player.parent_whatsapp || 'No contact provided'
    });

    const handleDownload = async () => {
        const element = document.getElementById('badge-card-content');
        if (!element) return;
        
        try {
            const canvas = await html2canvas(element, { 
                backgroundColor: null, 
                scale: 3, // Higher scale for print quality
                useCORS: true 
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `badge-${player.full_name?.replace(/\\s+/g, '-') || 'player'}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to download badge', err);
        }
    };

    // Format fields
    const formattedDate = player.birth_date ? new Date(player.birth_date).toLocaleDateString('en-GB') : 'N/A';
    const currentSeason = '2025/2026'; // Sports season
    const isFree = player.subscription_type === 'Free';

    const isPro = player.technical_level === 'A';

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in" dir="ltr">
            <div className="relative flex flex-col items-center">
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    className="absolute -top-16 right-0 md:-right-16 h-12 w-12 flex items-center justify-center rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/30 hover:rotate-90 transition-all duration-300"
                >
                    <X size={24} />
                </button>

                {/* Badge Card Wrapper */}
                <div 
                    id="badge-card-content" 
                    className="relative w-[340px] h-[540px] rounded-[2rem] bg-white shadow-2xl overflow-hidden flex flex-col pb-4 group transition-transform duration-500 hover:-translate-y-2 border border-slate-200"
                >
                    
                    {/* Top Lanyard Hole */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-200/50 backdrop-blur-sm rounded-full border border-slate-300 shadow-inner z-20"></div>

                    {/* Header Details (Top Right / Top Left) */}
                    <div className="absolute top-10 left-0 right-0 px-6 flex justify-between items-center z-20">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
                                {isRTL ? 'الموسم الرياضي' : 'Season'}
                            </span>
                            <span className="text-xs font-black tracking-widest text-white drop-shadow-md">
                                {currentSeason}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {isPro && (
                                <div className="px-3 py-1 rounded-lg text-xs font-black tracking-widest bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-500/50 border border-yellow-300 animate-pulse">
                                    PRO
                                </div>
                            )}
                            <div className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest backdrop-blur-md border ${
                                isFree 
                                    ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30' 
                                    : 'bg-white/20 text-white border-white/30'
                            }`}>
                                {player.u_category || 'U..'}
                            </div>
                        </div>
                    </div>

                    {/* Header Banner Background */}
                    <div className={`relative h-48 w-full flex flex-col justify-end pb-14 items-center shrink-0 overflow-hidden ${
                        isPro ? 'bg-gradient-to-br from-yellow-500 via-amber-600 to-yellow-700' :
                        player.u_category === 'Senior' ? 'bg-slate-900' : 
                        isFree ? 'bg-emerald-600' : 'bg-indigo-600'
                    }`}>
                        {/* Abstract Background pattern inside header */}
                        <div className="absolute inset-0 opacity-20">
                            {isPro ? (
                                <>
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-300/40 rounded-full blur-2xl"></div>
                                    <div className="absolute bottom-10 -left-10 w-32 h-32 bg-amber-400/40 rounded-full blur-2xl"></div>
                                </>
                            ) : (
                                <>
                                    <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full border-[10px] border-white/30"></div>
                                    <div className="absolute top-12 -left-12 w-32 h-32 rounded-full border-[8px] border-white/20"></div>
                                </>
                            )}
                        </div>

                        {/* Logo Area */}
                        <div className="mb-2 mt-auto z-10 flex items-center justify-center gap-2">
                             <div className={`w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg ${isPro ? 'ring-2 ring-yellow-400 shadow-yellow-500/50' : ''}`}>
                                {/* Placeholder for Logo */}
                                <span className={`font-black text-sm ${isPro ? 'text-amber-600' : 'text-indigo-600'}`}>A</span>
                             </div>
                             <h2 className="text-xl font-black text-white uppercase tracking-[0.2em] drop-shadow-md">ATHLETIC</h2>
                        </div>
                    </div>

                    {/* Avatar Area (Overlapping Header) */}
                    <div className="absolute top-[130px] left-1/2 -translate-x-1/2 z-20">
                        <div className={`w-[110px] h-[110px] rounded-full p-1.5 bg-white shadow-xl ${isPro ? 'ring-4 ring-yellow-400 shadow-yellow-500/30' : ''}`}>
                            <div className={`w-full h-full rounded-full bg-slate-100 overflow-hidden flex items-center justify-center border ${isPro ? 'border-yellow-200' : 'border-slate-200'} relative`}>
                                {player.photo_url ? (
                                    <img src={player.photo_url} alt={player.full_name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-tr from-slate-200 to-slate-100 flex flex-col items-center justify-center text-slate-400">
                                        <User size={40} className="mb-1 opacity-50" />
                                    </div>
                                )}
                            </div>
                            {isPro && (
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border-2 border-white shadow-lg z-30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> PRO
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Player Info Section */}
                    <div className="mt-[70px] px-6 text-center space-y-1">
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
                            {player.full_name}
                        </h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isPro ? 'text-amber-600' : 'text-slate-400'}`}>
                            {isPro ? (isRTL ? 'لاعب محترف' : 'Pro Athlete') : (isRTL ? 'اللاعب' : 'Athlete')}
                        </p>
                    </div>

                    {/* Dividing Line */}
                    <div className={`w-16 h-1 mx-auto mt-4 mb-4 rounded-full ${isPro ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 'bg-slate-100'}`}></div>

                    {/* Date of Birth & Category */}
                    <div className="grid grid-cols-2 gap-2 px-8 mb-4">
                        <div className={`p-3 rounded-xl border text-center ${isPro ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                            <p className={`text-[9px] font-black tracking-widest uppercase mb-0.5 ${isPro ? 'text-amber-600/70' : 'text-slate-400'}`}>
                                {isRTL ? 'تاريخ الازدياد' : 'Date of Birth'}
                            </p>
                            <p className={`text-sm font-black ${isPro ? 'text-amber-900' : 'text-slate-800'}`}>{formattedDate}</p>
                        </div>
                        <div className={`p-3 rounded-xl border text-center ${isPro ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                            <p className={`text-[9px] font-black tracking-widest uppercase mb-0.5 ${isPro ? 'text-amber-600/70' : 'text-slate-400'}`}>
                                {isRTL ? 'الفئة' : 'Category'}
                            </p>
                            <p className={`text-sm font-black ${isPro ? 'text-amber-900' : 'text-slate-800'}`}>{player.u_category || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="flex-1"></div>

                    {/* QR Code Container */}
                    <div className={`px-8 pb-6 flex items-center gap-6 ${isPro ? 'bg-gradient-to-t from-amber-50 to-transparent pt-4 -mb-4' : ''}`}>
                        <div className={`p-2 bg-white border rounded-xl shadow-sm shrink-0 ${isPro ? 'border-amber-200 shadow-amber-500/20' : 'border-slate-200'}`}>
                            <QRCode 
                                value={qrData} 
                                size={70}
                                level="M"
                                bgColor="#ffffff"
                                fgColor={isPro ? "#78350f" : "#0f172a"}
                            />
                        </div>
                        <div className="flex-1 text-left flex flex-col justify-center relative z-10">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <span className={`w-2 h-2 rounded-full ${player.account_status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                <span className={`text-[10px] font-black uppercase tracking-wider ${isPro ? 'text-amber-700' : 'text-slate-500'}`}>
                                    {player.account_status}
                                </span>
                            </div>
                            <p className={`text-[8px] font-bold uppercase tracking-widest leading-relaxed ${isPro ? 'text-amber-600/80' : 'text-slate-400'}`}>
                                {isPro ? 'ELITE ACADEMY PLAYER' : 'OFFICIAL ACADEMY MEMBER'} <br/>
                                VALID FOR ONE SEASON ONLY <br/>
                                SCAN FOR MEDICAL INFO
                            </p>
                        </div>
                    </div>

                    {/* Footer Trim */}
                    <div className={`absolute bottom-0 left-0 right-0 h-4 ${isPro ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 shadow-[0_-4px_15px_rgba(245,158,11,0.3)]' : isFree ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                </div>

                {/* Download Action */}
                <button 
                    onClick={handleDownload}
                    className="mt-8 flex items-center gap-3 bg-white/10 hover:bg-white border border-white/20 hover:border-white text-white hover:text-indigo-900 px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] transition-all duration-300 backdrop-blur-sm shadow-xl"
                >
                    <Download size={20} /> 
                    {isRTL ? 'تحميل البطاقة' : 'Print Badge'}
                </button>
            </div>
        </div>
    );
};

export default PlayerBadgeModal;

