import React from 'react';

const FUTCard = ({ player, evaluation }) => {
    if (!player) return null;

    // Calculate ratings out of 99 (from 10 point scale)
    // If no evaluation, default to 0
    const tec = evaluation ? Math.round((evaluation.technical_score / 10) * 99) : 0;
    const tac = evaluation ? Math.round((evaluation.tactical_score / 10) * 99) : 0;
    const phy = evaluation ? Math.round((evaluation.physical_score / 10) * 99) : 0;
    const men = evaluation ? Math.round((evaluation.mental_score / 10) * 99) : 0;
    
    // Derived stats for a cooler look
    const pac = evaluation ? Math.round(((evaluation.physical_score * 0.7 + evaluation.technical_score * 0.3) / 10) * 99) : 0;
    const sho = evaluation ? Math.round(((evaluation.technical_score * 0.8 + evaluation.mental_score * 0.2) / 10) * 99) : 0;

    const ovr = evaluation ? Math.round((tec + tac + phy + men + pac + sho) / 6) : 0;

    return (
        <div className="relative w-[300px] h-[450px] mx-auto group perspective-[1000px]" dir="ltr">
            {/* Hover 3D effect container */}
            <div className="w-full h-full relative transition-all duration-500 transform-style-3d group-hover:rotate-y-[10deg] group-hover:rotate-x-[10deg]">
                {/* Background Card */}
                <div 
                    className="absolute inset-0 rounded-[2rem] shadow-2xl overflow-hidden border-[3px] border-[#e8c057]"
                    style={{
                        background: 'linear-gradient(135deg, #2b2e33 0%, #1a1b1f 100%)',
                        boxShadow: '0 25px 50px -12px rgba(212, 175, 55, 0.4)'
                    }}
                >
                    {/* Glowing effect inside */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#d4af37]/20 via-transparent to-[#f3e5ab]/30 opacity-60 mix-blend-overlay"></div>
                    
                    {/* Moving shine effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full ease-in-out duration-1000 skew-x-12"></div>
                </div>

                {/* Card Content */}
                <div className="absolute inset-x-0 inset-y-1 z-10 p-6 flex flex-col items-center">
                    
                    {/* Top OVR & Position */}
                    <div className="absolute top-6 left-6 flex flex-col items-center text-[#e8c057]">
                        <span className="text-[2.5rem] font-black leading-none drop-shadow-lg">{ovr}</span>
                        <span className="text-sm font-bold tracking-widest uppercase opacity-80 mt-1">{player.u_category || 'KID'}</span>
                        {/* Fake Country/Academy Badge */}
                        <div className="mt-2 w-8 h-8 rounded-full border-2 border-[#e8c057] bg-slate-900 flex items-center justify-center text-[10px] font-black text-white">
                            ATH
                        </div>
                    </div>

                    {/* Image Area placeholder */}
                    <div className="mt-8 w-36 h-36 rounded-full border-4 border-[#e8c057] shadow-xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                        {/* We use initials if no picture */}
                        <span className="text-5xl font-black text-[#e8c057] opacity-80">
                            {player.full_name?.[0]?.toUpperCase()}
                        </span>
                    </div>

                    {/* Player Name */}
                    <div className="mt-4 w-full text-center pb-2 border-b-2 border-[#e8c057]/30">
                        <h2 className="text-2xl font-black text-[#e8c057] uppercase tracking-widest drop-shadow-md">
                            {player.full_name?.split(' ').pop()} {/* Just Last Name */}
                        </h2>
                    </div>

                    {/* Stats Grid */}
                    <div className="mt-5 w-full grid grid-cols-2 gap-x-8 gap-y-3 px-2 text-[#e8c057]">
                        {/* Col 1 */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between font-black text-[15px]">
                                <span className="opacity-90">{pac}</span>
                                <span className="text-[12px] opacity-70 tracking-widest">PAC</span>
                            </div>
                            <div className="flex items-center justify-between font-black text-[15px]">
                                <span className="opacity-90">{sho}</span>
                                <span className="text-[12px] opacity-70 tracking-widest">SHO</span>
                            </div>
                            <div className="flex items-center justify-between font-black text-[15px]">
                                <span className="opacity-90">{tec}</span>
                                <span className="text-[12px] opacity-70 tracking-widest">TEC</span>
                            </div>
                        </div>
                        {/* Col 2 */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between font-black text-[15px]">
                                <span className="opacity-90">{tac}</span>
                                <span className="text-[12px] opacity-70 tracking-widest">TAC</span>
                            </div>
                            <div className="flex items-center justify-between font-black text-[15px]">
                                <span className="opacity-90">{men}</span>
                                <span className="text-[12px] opacity-70 tracking-widest">MEN</span>
                            </div>
                            <div className="flex items-center justify-between font-black text-[15px]">
                                <span className="opacity-90">{phy}</span>
                                <span className="text-[12px] opacity-70 tracking-widest">PHY</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Footer */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <div className="w-[40%] h-[2px] bg-[#e8c057]/50 rounded-full"></div>
                    </div>
                </div>
            </div>
            {/* Custom CSS for 3D */}
            <style>{`
                .perspective-\\[1000px\\] { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .rotate-y-\\[10deg\\] { transform: rotateY(10deg); }
                .rotate-x-\\[10deg\\] { transform: rotateX(10deg); }
            `}</style>
        </div>
    );
};

export default FUTCard;
