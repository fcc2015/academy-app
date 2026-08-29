import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Download, X, User, Phone, MapPin, Mail, Calendar, CheckCircle2, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';

/* ── Image helper: fetch remote image → base64 data URL ────────────── */
const toDataUrl = async (url) => {
    if (!url) return null;
    try {
        const res = await fetch(url, { mode: 'cors' });
        if (res.ok) {
            const blob = await res.blob();
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        }
    } catch { /* CORS blocked – try canvas fallback */ }
    try {
        return await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth;
                c.height = img.naturalHeight;
                c.getContext('2d').drawImage(img, 0, 0);
                try { resolve(c.toDataURL('image/png')); }
                catch { resolve(url); }
            };
            img.onerror = () => resolve(url);
            img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
        });
    } catch { return url; }
};

/* ── Deterministic Code128 visual barcode ──────────────────────────── */
const VisualBarcode = ({ code, accentColor = '#312e81' }) => {
    const genBars = (str) => {
        let h = 0;
        for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
        const bars = [];
        for (let i = 0; i < 46; i++) {
            const w = ((h >> (i % 24)) & 3) % 2 === 0 ? 2.2 : 1;
            const black = ((h >> ((i + 3) % 24)) & 1) === 0 || i === 0 || i === 45 || i % 5 === 0;
            bars.push({ w, black });
        }
        return bars;
    };
    const bars = genBars(code || 'PLAYER');
    const display = code
        ? (code.length > 12 ? code.substring(0, 8).toUpperCase() + '...' + code.substring(code.length - 4).toUpperCase() : code.toUpperCase())
        : 'ID-0000';

    return (
        <div className="flex flex-col items-center w-full">
            <div className="flex items-center justify-center h-8 gap-[1px] px-1 bg-white rounded-md w-full max-w-[170px]">
                {bars.map((b, i) => (
                    <div key={i} className="h-full rounded-[0.5px]"
                        style={{ width: `${b.w}px`, backgroundColor: b.black ? accentColor : 'transparent' }} />
                ))}
            </div>
            <span className="text-[7.5px] font-mono font-extrabold tracking-[0.18em] mt-0.5 uppercase"
                  style={{ color: accentColor + 'aa' }}>
                *{display}*
            </span>
        </div>
    );
};

/* ── Main Component ────────────────────────────────────────────────── */
const PlayerBadgeModal = ({ player, isOpen, onClose, academyName, academyLogo, branchName, settings }) => {
    const [photoDataUrl, setPhotoDataUrl] = useState(null);
    const [logoDataUrl, setLogoDataUrl] = useState(null);
    const cardRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        (async () => {
            const [photo, logo] = await Promise.all([
                toDataUrl(player?.photo_url),
                toDataUrl(academyLogo || settings?.logo_url),
            ]);
            if (cancelled) return;
            setPhotoDataUrl(photo);
            setLogoDataUrl(logo);
        })();
        return () => { cancelled = true; };
    }, [isOpen, player?.photo_url, academyLogo, settings?.logo_url]);

    if (!isOpen || !player) return null;

    /* ── Derived Data ───────────────────────────────────────────── */
    const clubName = (academyName || settings?.academy_name || 'ACADEMY').toUpperCase();
    const season = (settings?.season_start && settings?.season_end)
        ? `${settings.season_start} / ${settings.season_end}`
        : '2025 / 2026';
    const dob = player.birth_date ? new Date(player.birth_date).toLocaleDateString('en-GB') : '—';
    const isFree = player.subscription_type === 'Free';
    const isPro = player.technical_level === 'A';
    const isActive = player.account_status === 'Active';
    const category = player.u_category || '—';
    const planLabel = isFree ? 'SCHOLARSHIP' : (player.subscription_type || 'MONTHLY').toUpperCase();
    const statusLabel = isActive ? 'ACTIVE' : (player.account_status || 'PENDING').toUpperCase();
    const shortId = player.user_id ? player.user_id.substring(0, 8).toUpperCase() : '00000000';

    // Has Logo image URL?
    const hasLogo = Boolean(logoDataUrl || academyLogo || settings?.logo_url);
    const logoSrc = logoDataUrl || academyLogo || settings?.logo_url;

    // Manager Contact Info
    const phone = settings?.contact_phone || settings?.whatsapp_number || '';
    const email = settings?.contact_email || '';
    const addr = settings?.address || '';

    // QR Payload
    const qrPayload = JSON.stringify({
        id: player.user_id, name: player.full_name,
        cat: category, dob: player.birth_date,
        status: player.account_status, plan: player.subscription_type,
        v: 1
    });

    // Theme preset
    const theme = isPro
        ? { grad: 'from-amber-600 via-yellow-600 to-amber-700', accent: '#92400e', ring: 'ring-amber-400' }
        : isFree
            ? { grad: 'from-emerald-700 via-teal-700 to-emerald-800', accent: '#064e3b', ring: 'ring-emerald-400' }
            : { grad: 'from-indigo-700 via-purple-700 to-indigo-900', accent: '#312e81', ring: 'ring-indigo-400' };

    /* ── Action: Download ──────────────────────────────────────── */
    const handleDownload = async () => {
        const el = document.getElementById('badge-render-target');
        if (!el) return;
        try {
            const canvas = await html2canvas(el, {
                backgroundColor: '#ffffff',
                scale: 4,
                useCORS: true,
                allowTaint: true,
                imageTimeout: 15000,
            });
            const link = document.createElement('a');
            link.download = `badge-${player.full_name?.replace(/\s+/g, '-') || 'player'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) { console.error('Badge download failed', err); }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xl" dir="ltr"
             style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
            <div className="relative flex flex-col items-center max-h-[95vh] overflow-y-auto custom-scrollbar p-2">

                {/* Top Quick Bar: Close Button */}
                <button onClick={onClose}
                    className="absolute -top-1 right-0 md:-top-5 md:-right-14 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 text-white/80 border border-white/20 hover:bg-white/30 hover:text-white hover:rotate-90 transition-all duration-300 z-40 backdrop-blur-md"
                    title="إلغاء / Close"
                >
                    <X size={18} />
                </button>

                {/* ══════════════ BADGE CARD ══════════════ */}
                <div id="badge-render-target" ref={cardRef}
                    className="relative w-[360px] rounded-[2.2rem] bg-white overflow-hidden flex flex-col border border-slate-200/80 shadow-2xl">

                    {/* Lanyard Hole */}
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-12 h-2 rounded-full z-30"
                         style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.1))', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)' }} />

                    {/* ──── HEADER BANNER ──── */}
                    <div className={`relative w-full pt-8 pb-14 px-5 flex flex-col items-center overflow-hidden bg-gradient-to-br ${theme.grad} text-white`}>
                        {/* Background Patterns */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
                            <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full border-[10px] border-white" />
                            <div className="absolute top-12 -left-16 w-36 h-36 rounded-full border-[6px] border-white" />
                        </div>

                        {/* Top Metadata Row: Season & Category */}
                        <div className="w-full flex justify-between items-center z-10 mb-3 text-[9px] font-black uppercase tracking-[0.15em]">
                            <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                                <Calendar size={10} className="opacity-90" />
                                <span>SEASON: {season}</span>
                            </div>
                            <div className={`px-3 py-1 rounded-full border backdrop-blur-md font-black ${
                                isPro ? 'bg-yellow-300 text-amber-950 border-yellow-200 shadow-md' : 'bg-white/20 text-white border-white/30'
                            }`}>
                                {isPro ? '⭐ PRO · ' : ''}{category}
                            </div>
                        </div>

                        {/* Club Logo & Club Name */}
                        <div className="z-10 flex flex-col items-center text-center gap-1 mt-0.5">
                            {/* ONLY render logo box if an actual logo exists! */}
                            {hasLogo && (
                                <div className={`w-14 h-14 rounded-2xl bg-white p-1 flex items-center justify-center shadow-xl overflow-hidden border-2 mb-0.5 ${
                                    isPro ? 'border-yellow-300 shadow-yellow-500/40' : 'border-white/50'
                                }`}>
                                    <img src={logoSrc} alt="" className="w-full h-full object-contain rounded-xl" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                                </div>
                            )}

                            {/* Club Name */}
                            <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white drop-shadow-md leading-snug max-w-[260px]">
                                {clubName}
                            </h2>

                            {/* Branch Name directly under Club Name in smaller size */}
                            {branchName && (
                                <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-white/80">
                                    {branchName}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ──── AVATAR (NO TEXT OVERLAY ON PHOTO) ──── */}
                    <div className="relative -mt-11 flex justify-center z-20">
                        <div className={`w-[100px] h-[100px] rounded-full p-[3px] bg-white shadow-2xl ${theme.ring} ring-4 ring-offset-0`}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                                {photoDataUrl ? (
                                    <img src={photoDataUrl} alt="" className="w-full h-full object-cover" />
                                ) : player?.photo_url ? (
                                    <img src={player.photo_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-tr from-slate-200 to-slate-100 flex flex-col items-center justify-center text-slate-400">
                                        <User size={40} className="opacity-40" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ──── PLAYER NAME & BADGES ──── */}
                    <div className="mt-2.5 px-6 text-center space-y-1">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                            {player.full_name || 'PLAYER'}
                        </h3>
                        <div className="text-[8px] font-mono font-bold tracking-[0.2em] text-slate-400 uppercase">
                            ID: {shortId}
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1">
                            <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.12em] px-3 py-1 rounded-full border ${
                                isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                                <CheckCircle2 size={10} /> {statusLabel}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-[0.12em] text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                                {planLabel}
                            </span>
                        </div>
                    </div>

                    {/* ──── DOB & CATEGORY GRID ──── */}
                    <div className="grid grid-cols-2 gap-2 px-6 mt-3.5">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                            <span className="text-[7.5px] font-black uppercase tracking-[0.18em] text-slate-400 block mb-0.5">DATE OF BIRTH</span>
                            <span className="text-xs font-black text-slate-800">{dob}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                            <span className="text-[7.5px] font-black uppercase tracking-[0.18em] text-slate-400 block mb-0.5">CATEGORY</span>
                            <span className="text-xs font-black text-indigo-600">{category}</span>
                        </div>
                    </div>

                    {/* ──── QR & BARCODE BOX ──── */}
                    <div className="px-6 mt-3.5 mb-3">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                            <div className="shrink-0 p-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                                <QRCode value={qrPayload} size={60} level="M" bgColor="#ffffff" fgColor={theme.accent} />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col items-center">
                                <span className="text-[7.5px] font-black uppercase tracking-[0.18em] text-slate-400 block mb-1 text-center">
                                    ATTENDANCE & FINANCIAL BARCODE
                                </span>
                                <VisualBarcode code={player.user_id} accentColor={theme.accent} />
                            </div>
                        </div>
                    </div>

                    {/* ──── ACADEMY FOOTER ──── */}
                    <div className="mt-1 pt-3 pb-3.5 px-6 bg-slate-900 text-slate-300 text-[8.5px] font-bold space-y-1 text-center border-t border-slate-800">
                        {addr && (
                            <div className="flex items-center justify-center gap-1.5 text-slate-300">
                                <MapPin size={9} className="text-indigo-400 shrink-0" />
                                <span className="truncate max-w-[280px]">{addr}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-center gap-3 text-slate-400 flex-wrap">
                            {phone && (
                                <span className="flex items-center gap-1">
                                    <Phone size={8} className="text-emerald-400" /> {phone}
                                </span>
                            )}
                            {email && (
                                <span className="flex items-center gap-1">
                                    <Mail size={8} className="text-indigo-400" /> {email}
                                </span>
                            )}
                        </div>
                        <div className="text-[7.5px] text-slate-500 font-mono tracking-[0.2em] uppercase pt-0.5">
                            OFFICIAL ACCREDITATION BADGE · {clubName}
                        </div>
                    </div>

                </div>
                {/* ══════════════ END BADGE CARD ══════════════ */}

                {/* Action Buttons Bar: Back, Download, Cancel */}
                <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-95 border border-slate-700"
                    >
                        <ArrowLeft size={16} />
                        رجوع (Back)
                    </button>
                    
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95 border border-indigo-400/30"
                    >
                        <Download size={16} />
                        تنزيل البادج (PNG)
                    </button>

                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all border border-white/15 backdrop-blur-md"
                    >
                        <X size={16} />
                        إلغاء (Cancel)
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PlayerBadgeModal;
