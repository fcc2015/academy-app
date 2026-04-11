import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Smartphone, Wifi, Shield, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import QRCode from 'qrcode';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * QRLoginPage — صفحة تسجيل الدخول عبر QR Code (بحال WhatsApp Web)
 * 
 * 1. اللابتوب يولّد session_id → يعرض QR Code
 * 2. الهاتف يسكاني → يرسل تأكيد مع token
 * 3. اللابتوب يتلقى token → يسجل دخول أوتوماتيكياً
 */
const QRLoginPage = () => {
    const navigate = useNavigate();
    const [sessionId, setSessionId] = useState('');
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [status, setStatus] = useState('loading'); // loading, ready, authorized, expired, error
    const [error, setError] = useState('');
    const canvasRef = useRef(null);
    const pollingRef = useRef(null);
    const timeoutRef = useRef(null);

    // إنشاء جلسة جديدة
    const createSession = useCallback(async () => {
        try {
            setStatus('loading');
            setError('');
            
            const res = await fetch(`${API_URL}/api/qr-auth/create-session`, { method: 'POST' });
            
            if (!res.ok) throw new Error('Failed to create session');
            
            const data = await res.json();
            setSessionId(data.session_id);
            
            // توليد QR Code
            const qrUrl = `${window.location.origin}/qr-authorize/${data.session_id}`;
            const dataUrl = await QRCode.toDataURL(qrUrl, {
                width: 280,
                margin: 2,
                color: { dark: '#1e293b', light: '#ffffff' },
                errorCorrectionLevel: 'M'
            });
            setQrDataUrl(dataUrl);
            setStatus('ready');
            
            // بدء الـ polling
            startPolling(data.session_id);
            
            // timeout بعد 3 دقائق
            timeoutRef.current = setTimeout(() => {
                setStatus('expired');
                stopPolling();
            }, data.expires_in * 1000);
            
        } catch (err) {
            setStatus('error');
            setError(err.message);
        }
    }, []);

    // Polling — فحص حالة الجلسة كل 2 ثانية
    const startPolling = (sid) => {
        stopPolling();
        pollingRef.current = setInterval(async () => {
            try {
                const res = await fetch(`${API_URL}/api/qr-auth/check-session/${sid}`);
                const data = await res.json();
                
                if (data.status === 'authorized') {
                    // 🎉 تم السكان! حفظ البيانات
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('role', data.role);
                    localStorage.setItem('user_id', data.user_id);
                    localStorage.setItem('user_name', data.user_name);
                    if (data.academy_id) localStorage.setItem('academy_id', data.academy_id);
                    localStorage.setItem('token_expires', String(Date.now() + 24 * 60 * 60 * 1000));
                    
                    setStatus('authorized');
                    stopPolling();
                    
                    // توجيه حسب الدور
                    setTimeout(() => {
                        if (data.role === 'admin') navigate('/admin/dashboard');
                        else if (data.role === 'coach') navigate('/coach/dashboard');
                        else navigate('/parent/dashboard');
                    }, 1500);
                } else if (data.status === 'expired') {
                    setStatus('expired');
                    stopPolling();
                }
            } catch (err) {
                // تجاهل أخطاء الشبكة المؤقتة
            }
        }, 2000);
    };

    const stopPolling = () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    useEffect(() => {
        createSession();
        return () => stopPolling();
    }, [createSession]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
            {/* خلفية متحركة */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative z-10 w-full max-w-lg">
                {/* الكارت الرئيسي */}
                <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden">
                    
                    {/* الهيدر */}
                    <div className="text-center pt-10 pb-6 px-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 rounded-full border border-indigo-400/30 mb-6">
                            <Smartphone size={14} className="text-indigo-300" />
                            <span className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.3em]">
                                QR Code Login
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                            سجل الدخول بسكان 📱
                        </h1>
                        <p className="text-white/40 text-sm font-medium">
                            افتح التطبيق على هاتفك → اسكاني الـ QR Code
                        </p>
                    </div>

                    {/* QR Code Area */}
                    <div className="flex justify-center px-8 pb-8">
                        <div className="relative">
                            {/* حالة التحميل */}
                            {status === 'loading' && (
                                <div className="w-72 h-72 bg-white/5 rounded-3xl border-2 border-dashed border-white/10 flex items-center justify-center">
                                    <div className="text-center">
                                        <Loader2 size={40} className="text-indigo-400 animate-spin mx-auto mb-3" />
                                        <span className="text-white/40 text-xs font-bold">Generating QR...</span>
                                    </div>
                                </div>
                            )}

                            {/* QR Code جاهز */}
                            {status === 'ready' && qrDataUrl && (
                                <div className="relative group">
                                    <div className="w-72 h-72 bg-white rounded-3xl p-4 shadow-2xl shadow-indigo-500/20 transition-transform group-hover:scale-[1.02]">
                                        <img src={qrDataUrl} alt="QR Code" className="w-full h-full rounded-2xl" />
                                    </div>
                                    {/* تأثير الحد المتحرك */}
                                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[1.5rem] opacity-30 blur-sm -z-10 animate-pulse" />
                                </div>
                            )}

                            {/* تم التأكيد */}
                            {status === 'authorized' && (
                                <div className="w-72 h-72 bg-emerald-500/10 rounded-3xl border-2 border-emerald-400/30 flex items-center justify-center">
                                    <div className="text-center">
                                        <CheckCircle size={64} className="text-emerald-400 mx-auto mb-4 animate-bounce" />
                                        <p className="text-emerald-300 font-black text-lg">تم الربط! ✅</p>
                                        <p className="text-emerald-400/60 text-xs font-bold mt-1">جاري التوجيه...</p>
                                    </div>
                                </div>
                            )}

                            {/* منتهي الصلاحية */}
                            {status === 'expired' && (
                                <div className="w-72 h-72 bg-amber-500/10 rounded-3xl border-2 border-amber-400/30 flex items-center justify-center">
                                    <div className="text-center">
                                        <XCircle size={48} className="text-amber-400 mx-auto mb-4" />
                                        <p className="text-amber-300 font-bold text-sm mb-4">QR Code منتهي الصلاحية</p>
                                        <button
                                            onClick={createSession}
                                            className="px-6 py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all flex items-center gap-2 mx-auto"
                                        >
                                            <RefreshCw size={14} />
                                            توليد QR جديد
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* خطأ */}
                            {status === 'error' && (
                                <div className="w-72 h-72 bg-red-500/10 rounded-3xl border-2 border-red-400/30 flex items-center justify-center">
                                    <div className="text-center">
                                        <XCircle size={48} className="text-red-400 mx-auto mb-4" />
                                        <p className="text-red-300 font-bold text-sm mb-2">خطأ في الاتصال</p>
                                        <p className="text-red-400/60 text-[10px] mb-4">{error}</p>
                                        <button
                                            onClick={createSession}
                                            className="px-6 py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all flex items-center gap-2 mx-auto"
                                        >
                                            <RefreshCw size={14} />
                                            إعادة المحاولة
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* الخطوات */}
                    <div className="px-8 pb-10">
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                            <div className="space-y-4">
                                {[
                                    { step: '1', text: 'افتح التطبيق على هاتفك 📱', icon: Smartphone },
                                    { step: '2', text: 'اضغط على "سكان QR" في القائمة', icon: QrCode },
                                    { step: '3', text: 'وجّه الكاميرا نحو الـ QR Code', icon: Wifi },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center shrink-0">
                                            <span className="text-indigo-300 font-black text-xs">{item.step}</span>
                                        </div>
                                        <p className="text-white/60 text-sm font-bold">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* رابط تسجيل الدخول العادي */}
                <div className="text-center mt-6">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-white/30 text-xs font-bold hover:text-white/60 transition-colors uppercase tracking-widest"
                    >
                        🔑 تسجيل دخول بكلمة المرور
                    </button>
                </div>

                {/* أيقونة الأمان */}
                <div className="flex items-center justify-center gap-2 mt-4">
                    <Shield size={12} className="text-emerald-500/50" />
                    <span className="text-white/20 text-[9px] font-black uppercase tracking-[0.3em]">
                        End-to-end encrypted
                    </span>
                </div>
            </div>
        </div>
    );
};

export default QRLoginPage;
