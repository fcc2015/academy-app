import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

const DownloadPage = () => {
    const { isRTL } = useLanguage();
    const appUrl = 'https://jolly-kangaroo-3c3d92.netlify.app';

    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{
                background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'
            }}
        >
            {/* Ambient glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600 opacity-10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600 opacity-10 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative w-full max-w-lg mx-4 text-center">
                {/* App Icon */}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-[22px] mb-6"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 12px 40px rgba(79,70,229,0.5)' }}>
                    <span className="text-4xl">⚽</span>
                </div>

                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">
                    Football Academy
                </h1>
                <p className="text-indigo-300/70 text-sm font-medium mb-8">
                    {isRTL ? 'منصة إدارة أكاديمية كرة القدم' : 'Football Academy Management Platform'}
                </p>

                {/* QR Code Card */}
                <div className="rounded-[28px] p-8 mb-6"
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(24px)',
                    }}>
                    
                    <p className="text-white/80 text-sm font-bold mb-5">
                        {isRTL ? '📷 امسح QR Code لتحميل التطبيق' : '📷 Scan QR Code to download the app'}
                    </p>

                    {/* QR Code */}
                    <div className="inline-block p-4 rounded-2xl bg-white mb-5">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}`}
                            alt="QR Code - Football Academy App"
                            className="w-48 h-48"
                        />
                    </div>

                    <p className="text-indigo-300/50 text-xs font-medium">
                        {isRTL ? 'أو انسخ الرابط أسفله' : 'Or copy the link below'}
                    </p>
                </div>

                {/* Download Link */}
                <div className="rounded-xl p-4 mb-6 flex items-center gap-3"
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                    <span className="text-white/60 text-sm font-mono flex-1 truncate" dir="ltr">
                        {appUrl}
                    </span>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(appUrl);
                            const btn = document.getElementById('copyBtn');
                            if (btn) { btn.textContent = '✓'; setTimeout(() => btn.textContent = '📋', 1500); }
                        }}
                        id="copyBtn"
                        className="px-3 py-2 rounded-lg text-sm font-bold text-white transition-all"
                        style={{ background: 'rgba(79,70,229,0.5)' }}
                    >
                        📋
                    </button>
                </div>

                {/* Install Button */}
                <button
                    onClick={() => window.open(appUrl, '_blank')}
                    className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all duration-300 flex items-center justify-center gap-3 mb-6"
                    style={{
                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                        boxShadow: '0 8px 32px rgba(79,70,229,0.4)',
                    }}
                >
                    📲 {isRTL ? 'تحميل التطبيق' : "Télécharger l'app"}
                </button>

                {/* Install Instructions */}
                <div className="rounded-[20px] p-6 text-left"
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                    <h3 className="text-white font-black text-sm mb-4">
                        {isRTL ? '📱 طريقة التثبيت:' : "📱 Comment installer:"}
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                                style={{ background: 'rgba(79,70,229,0.3)', color: '#a5b4fc' }}>1</span>
                            <p className="text-white/60 text-sm">
                                {isRTL ? 'افتح الرابط في Chrome على هاتفك' : 'Open the link in Chrome on your phone'}
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                                style={{ background: 'rgba(79,70,229,0.3)', color: '#a5b4fc' }}>2</span>
                            <p className="text-white/60 text-sm">
                                {isRTL ? 'اضغط على "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"' : 'Tap "Install App" or "Add to Home Screen"'}
                            </p>
                        </div>
                        <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                                style={{ background: 'rgba(79,70,229,0.3)', color: '#a5b4fc' }}>3</span>
                            <p className="text-white/60 text-sm">
                                {isRTL ? '🎉 التطبيق الآن على شاشتك الرئيسية!' : "🎉 The app is now on your home screen!"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-white/15 text-[10px] font-bold uppercase tracking-widest mt-8">
                    Football Academy © 2026
                </p>
            </div>
        </div>
    );
};

export default DownloadPage;
