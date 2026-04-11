import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Wifi, Bell, Zap } from 'lucide-react';

/**
 * PWAInstallPrompt — يقترح على المستخدم تثبيت التطبيق
 * يظهر فقط إذا التطبيق قابل للتثبيت (beforeinstallprompt)
 */
const PWAInstallPrompt = ({ isRTL = false }) => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // فحص إذا التطبيق مثبت أصلاً
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // فحص إذا المستخدم رفض التثبيت سابقاً
        const dismissed = localStorage.getItem('pwa_install_dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            // نعرض مرة ثانية بعد 7 أيام
            if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return;
        }

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // نأخر عرض البانر 3 ثواني
            setTimeout(() => setShowBanner(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // فحص إذا تم التثبيت
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowBanner(false);
            setDeferredPrompt(null);
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === 'accepted') {
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwa_install_dismissed', Date.now().toString());
    };

    if (isInstalled || !showBanner) return null;

    return (
        <div className="fixed bottom-24 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-[420px] z-[100] animate-fade-in">
            <div className="bg-white rounded-[2rem] shadow-2xl border border-indigo-100 overflow-hidden">
                {/* الهيدر */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Download size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-sm">
                                {isRTL ? '📱 ثبّت التطبيق!' : '📱 Install the App!'}
                            </h3>
                            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">
                                {isRTL ? 'تجربة أسرع وأفضل' : 'Faster & Better Experience'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white/60 hover:text-white"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* المميزات */}
                <div className="p-5">
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        {[
                            { icon: Zap, label: isRTL ? 'سريع' : 'Fast', color: 'amber' },
                            { icon: Wifi, label: isRTL ? 'بدون نت' : 'Offline', color: 'emerald' },
                            { icon: Bell, label: isRTL ? 'إشعارات' : 'Alerts', color: 'indigo' },
                        ].map((feat, i) => (
                            <div key={i} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl bg-${feat.color}-50 border border-${feat.color}-100`}>
                                <feat.icon size={18} className={`text-${feat.color}-600`} />
                                <span className={`text-[9px] font-black uppercase tracking-widest text-${feat.color}-700`}>{feat.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* زر التثبيت */}
                    <button
                        onClick={handleInstall}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-3"
                    >
                        <Smartphone size={18} />
                        {isRTL ? 'تثبيت على الهاتف' : 'Install on Phone'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
