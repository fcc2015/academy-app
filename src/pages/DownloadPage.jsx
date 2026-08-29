import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Smartphone, Monitor, Wifi, Shield, ChevronRight, CheckCircle, Copy, Check, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { API_URL } from '../config';

const DownloadPage = () => {
    const { isRTL, dir } = useLanguage();
    const navigate = useNavigate();
    const { subdomain } = useParams();
    const appUrl = subdomain ? `${window.location.origin}/academy/${subdomain}` : window.location.origin;
    const [academyName, setAcademyName] = useState(subdomain ? `أكاديمية ${subdomain}` : '');
    const [copied, setCopied] = useState(false);
    const [platform, setPlatform] = useState('unknown'); // android, ios, desktop
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        if (subdomain) {
            fetch(`${API_URL}/public/academy/${subdomain}`)
                .then(res => res.json())
                .then(data => { if (data?.name) setAcademyName(data.name); })
                .catch(() => {});
        }
    }, [subdomain]);

    // كشف الجهاز
    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        if (/android/.test(ua)) setPlatform('android');
        else if (/iphone|ipad|ipod/.test(ua)) setPlatform('ios');
        else setPlatform('desktop');

        // PWA Install prompt
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => setInstalled(true));

        if (window.matchMedia('(display-mode: standalone)').matches) {
            setInstalled(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            if (result.outcome === 'accepted') setInstalled(true);
            setDeferredPrompt(null);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(appUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const features = [
        { icon: '⚡', title: isRTL ? 'سريع كالبرق' : 'Lightning Fast', desc: isRTL ? 'يفتح في أقل من ثانية' : 'Opens in under 1 second' },
        { icon: '📴', title: isRTL ? 'بدون إنترنت' : 'Works Offline', desc: isRTL ? 'يشتغل بدون اتصال' : 'Access data without wifi' },
        { icon: '🔔', title: isRTL ? 'إشعارات فورية' : 'Push Notifications', desc: isRTL ? 'تنبيهات مباشرة' : 'Real-time alerts' },
        { icon: '🔒', title: isRTL ? 'آمن ومشفر' : 'Secure & Encrypted', desc: isRTL ? 'حماية متقدمة' : 'End-to-end protection' },
    ];

    const androidSteps = [
        { step: '1', text: isRTL ? 'افتح Chrome على هاتفك' : 'Open Chrome on your phone', icon: '🌐' },
        { step: '2', text: isRTL ? 'امسح الـ QR Code أو اكتب الرابط' : 'Scan the QR Code or type the URL', icon: '📷' },
        { step: '3', text: isRTL ? 'اضغط على ⋮ (القائمة) ← "تثبيت التطبيق"' : 'Tap ⋮ (menu) → "Install App"', icon: '📲' },
        { step: '4', text: isRTL ? '🎉 التطبيق جاهز على شاشتك!' : '🎉 App is on your home screen!', icon: '✅' },
    ];

    const iosSteps = [
        { step: '1', text: isRTL ? 'افتح Safari على الآيفون' : 'Open Safari on your iPhone', icon: '🧭' },
        { step: '2', text: isRTL ? 'امسح الـ QR Code أو اكتب الرابط' : 'Scan the QR Code or type the URL', icon: '📷' },
        { step: '3', text: isRTL ? 'اضغط على ↑ (مشاركة) ← "إضافة للشاشة"' : 'Tap ↑ (share) → "Add to Home Screen"', icon: '📲' },
        { step: '4', text: isRTL ? '🎉 التطبيق جاهز على شاشتك!' : '🎉 App is on your home screen!', icon: '✅' },
    ];

    const steps = platform === 'ios' ? iosSteps : androidSteps;

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0f0c29] via-[#1a1145] via-[#302b63] to-[#24243e]" dir={dir}>
            
            {/* Ambient Effects */}
            <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-indigo-600 opacity-[0.07] blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-purple-600 opacity-[0.07] blur-[130px] rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500 opacity-[0.04] blur-[140px] rounded-full pointer-events-none" />

            {/* Back Button */}
            <button onClick={() => navigate('/')}
                className="fixed top-6 left-6 z-50 p-3 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm">
                <ArrowLeft size={18} />
            </button>

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-16">
                
                {/* Hero Section */}
                <div className="text-center mb-16">
                    {/* App Icon */}
                    <div className="inline-block mb-8 relative">
                        <div className="w-28 h-28 rounded-[2rem] flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-indigo-600 to-purple-600 shadow-[0_20px_60px_rgba(79,70,229,0.4)]">
                            <img src="/logo.png" alt="Logo" className="w-20 h-20 object-contain"
                                onError={(e) => { e.target.style.display = 'none'; }} />
                            <span className="text-5xl absolute hidden">⚽</span>
                        </div>
                        {/* Glow ring */}
                        <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2.5rem] opacity-20 blur-lg -z-10 animate-pulse" />
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-400/20 mb-4">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-emerald-300 text-[10px] font-black uppercase tracking-[0.3em]">
                            {isRTL ? 'متاح الآن' : 'Available Now'}
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                        {subdomain 
                            ? (isRTL ? `تطبيق ${academyName}` : `${academyName} Mobile App`)
                            : (isRTL ? 'تطبيق منصة الأكاديميات' : 'Academy Platform App')}
                    </h1>
                    <p className="text-white/40 text-lg font-medium max-w-md mx-auto">
                        {subdomain
                            ? (isRTL ? 'تطبيق الوالدين والمدربين واللاعبين — تثبيت مباشر على هاتفك' : 'Parent, Coach & Player App — Install directly on your phone')
                            : (isRTL ? 'منصة إدارة الأكاديميات للمدراء — على هاتفك كتطبيق حقيقي' : 'Academy Management Platform — on your phone as a real app')}
                    </p>
                </div>

                {/* Main Grid */}
                <div className="grid lg:grid-cols-2 gap-8 mb-16">
                    
                    {/* Left: QR Code */}
                    <div className="rounded-[2.5rem] p-8 text-center bg-white/5 border border-white/10 backdrop-blur-[24px]">
                        
                        <h2 className="text-white font-black text-lg mb-2">
                            {isRTL ? '📷 امسح بالكاميرا' : '📷 Scan with Camera'}
                        </h2>
                        <p className="text-white/30 text-xs font-bold mb-6">
                            {isRTL ? 'وجّه كاميرا هاتفك نحو الـ QR' : 'Point your phone camera at the QR'}
                        </p>

                        {/* QR Code */}
                        <div className="inline-block relative group">
                            <div className="bg-white rounded-3xl p-5 shadow-2xl shadow-indigo-500/10 transition-transform group-hover:scale-[1.02]">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(appUrl)}&color=1e293b`}
                                    alt="QR Code"
                                    className="w-56 h-56 rounded-xl"
                                />
                            </div>
                            <div className="absolute -inset-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[1.8rem] opacity-20 blur-md -z-10 animate-pulse" />
                        </div>

                        {/* URL Copy */}
                        <div className="mt-6 flex items-center gap-2 max-w-xs mx-auto">
                            <div className="flex-1 px-4 py-3 rounded-xl text-white/40 text-xs font-mono truncate bg-white/5 border border-white/10" dir="ltr">
                                {appUrl}
                            </div>
                            <button onClick={handleCopy}
                                className={`p-3 rounded-xl border border-white/10 transition-all ${copied ? 'bg-emerald-500/20' : 'bg-indigo-600/30'}`}>
                                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-indigo-300" />}
                            </button>
                        </div>
                    </div>

                    {/* Right: Install Steps */}
                    <div className="rounded-[2.5rem] p-8 bg-white/5 border border-white/10 backdrop-blur-[24px]">
                        
                        {/* Platform Tabs */}
                        <div className="flex gap-2 mb-6">
                            {['android', 'ios'].map(p => (
                                <button key={p} onClick={() => setPlatform(p)}
                                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                                        platform === p 
                                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-400/30' 
                                            : 'bg-white/5 text-white/30 border border-white/5 hover:bg-white/10'
                                    }`}>
                                    {p === 'android' ? '🤖 Android' : '🍎 iPhone'}
                                </button>
                            ))}
                        </div>

                        <h2 className="text-white font-black text-lg mb-6">
                            {isRTL ? '📱 خطوات التثبيت' : '📱 Install Steps'}
                        </h2>

                        <div className="space-y-4">
                            {steps.map((s, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl transition-all hover:bg-white/5 bg-white/5 border border-white/10">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-indigo-600/20 border border-indigo-400/30">
                                        <span className="text-lg">{s.icon}</span>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white/80 text-sm font-bold">{s.text}</p>
                                    </div>
                                    {i < steps.length - 1 && <ChevronRight size={14} className="text-white/20" />}
                                </div>
                            ))}
                        </div>

                        {/* Install Button (PWA) */}
                        {deferredPrompt && !installed && (
                            <button onClick={handleInstall}
                                className="w-full mt-6 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] text-white flex items-center justify-center gap-3 transition-all hover:-translate-y-0.5 active:scale-95 bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_12px_40px_rgba(79,70,229,0.4)]">
                                <Download size={18} />
                                {isRTL ? 'تثبيت الآن' : 'Install Now'}
                            </button>
                        )}

                        {installed && (
                            <div className="mt-6 flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/20">
                                <CheckCircle size={20} className="text-emerald-400" />
                                <span className="text-emerald-300 font-black text-sm">
                                    {isRTL ? '✅ التطبيق مثبت!' : '✅ App Installed!'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                    {features.map((f, i) => (
                        <div key={i} className="rounded-2xl p-6 text-center transition-all hover:-translate-y-1 hover:bg-white/[0.06] bg-white/5 border border-white/10">
                            <span className="text-3xl block mb-3">{f.icon}</span>
                            <h3 className="text-white font-black text-xs uppercase tracking-widest mb-1">{f.title}</h3>
                            <p className="text-white/30 text-[10px] font-bold">{f.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Bottom CTA */}
                <div className="text-center">
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10">
                        <Shield size={14} className="text-emerald-400/60" />
                        <span className="text-white/30 text-[9px] font-black uppercase tracking-[0.3em]">
                            {isRTL ? 'تطبيق آمن ومشفر — لا يحتاج مساحة تخزين' : 'Secure app — No storage space needed'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DownloadPage;
