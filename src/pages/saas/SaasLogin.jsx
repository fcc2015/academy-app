import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2, Lock, Mail, AlertCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { isAuthenticated } from '../../api';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;


// Rate-limiting store (in-memory, reset on refresh)
const loginAttempts = { count: 0, lockedUntil: null };

const SaasLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
    const navigate = useNavigate();
    const { t, isRTL, dir } = useLanguage();

    // Check auth and lock status on mount
    useEffect(() => {
        // Redirect if already authenticated
        if (isAuthenticated()) {
            const role = localStorage.getItem('role');
            if (role === 'admin') { navigate('/admin/dashboard', { replace: true }); return; }
            else if (role === 'coach') { navigate('/coach/dashboard', { replace: true }); return; }
            else if (role === 'parent') { navigate('/parent/dashboard', { replace: true }); return; }
        }

        const checkLock = () => {
            if (loginAttempts.lockedUntil && Date.now() < loginAttempts.lockedUntil) {
                setIsLocked(true);
                setLockSecondsLeft(Math.ceil((loginAttempts.lockedUntil - Date.now()) / 1000));
            } else {
                setIsLocked(false);
                setLockSecondsLeft(0);
            }
        };
        checkLock();
        const interval = setInterval(checkLock, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();

        // Rate limiting check
        if (loginAttempts.lockedUntil && Date.now() < loginAttempts.lockedUntil) {
            setIsLocked(true);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                // Increment failed attempts
                loginAttempts.count += 1;
                if (loginAttempts.count >= 5) {
                    loginAttempts.lockedUntil = Date.now() + 5 * 60 * 1000; // 5 min lockout
                    loginAttempts.count = 0;
                    setIsLocked(true);
                    setLockSecondsLeft(300);
                }
                throw new Error(data.detail || 'Identifiants incorrects');
            }

            // Success — reset attempt counter
            loginAttempts.count = 0;
            loginAttempts.lockedUntil = null;

            // Store credentials securely
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('user_id', data.user_id);
            // Store token expiry (JWT lifetime typically 24h)
            localStorage.setItem('token_expires', Date.now() + 24 * 60 * 60 * 1000);

            if (data.role === 'super_admin') {
                navigate('/saas/dashboard');
            } else {
                throw new Error('Access Denied. Platform Owner privileges required.');
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        try {
            const redirectTo = `${window.location.origin}/auth/callback`;
            const oauthUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
            window.location.href = oauthUrl;
        } catch {
            setGoogleLoading(false);
            setError(isRTL ? 'فشل الاتصال بـ Google' : 'Connexion Google échouée');
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden"
            dir={dir}
            style={{
                background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'
            }}
        >
            {/* Ambient glows for SaaS Root (Emerald/Gold) */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600 opacity-20 blur-[130px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-600 opacity-20 blur-[110px] rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500 opacity-10 blur-[150px] rounded-full pointer-events-none" />

            {/* Card */}
            <div className="relative w-full max-w-md mx-4 animate-fade-in-scale">
                {/* Top Branding (Logo) */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <img 
                        src="/logo.png" 
                        alt="FC Casablanca Logo" 
                        className="h-28 object-contain mb-4 animate-glow-pulse drop-shadow-2xl"
                        onError={(e) => {
                            // Fallback if logo.png isn't placed yet
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                    <div className="hidden items-center justify-center w-16 h-16 rounded-[18px] mb-4 relative"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 8px 32px rgba(79,70,229,0.5)' }}>
                        <Shield size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">
                        {t('auth.SaasLogin')}
                    </h1>
                    <p className="text-sm text-indigo-300/70 mt-1 font-medium">
                        {isRTL ? 'بوابة الإدارة المحمية' : 'Portail d\'administration sécurisé'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="rounded-[28px] p-8 relative"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(24px)',
                    }}>

                    {/* Locked state */}
                    {isLocked ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <Lock size={28} className="text-red-400" />
                            </div>
                            <h3 className="text-white font-black text-lg mb-2">
                                {isRTL ? 'تم إيقاف الوصول مؤقتاً' : 'Accès temporairement bloqué'}
                            </h3>
                            <p className="text-red-300/80 text-sm font-medium">
                                {isRTL ? `محاولات كثيرة. انتظر ${lockSecondsLeft}ث` : `Trop de tentatives. Attendez ${lockSecondsLeft}s`}
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
                            {/* Error Message */}
                            {error && (
                                <div className="flex items-center gap-3 p-4 rounded-xl text-sm font-semibold animate-fade-in"
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Email Field */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-indigo-300/70 mb-2">
                                    {t('auth.email')}
                                </label>
                                <div className="relative">
                                    <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                                        <Mail size={16} className="text-indigo-400/60" />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        autoComplete="username"
                                        placeholder="admin@academy.ma"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`w-full py-3.5 text-sm font-medium text-white placeholder-white/25 rounded-xl transition-all duration-200 outline-none ${isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'}`}
                                        style={{
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1.5px solid rgba(255,255,255,0.1)',
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-indigo-300/70 mb-2">
                                    {t('auth.password')}
                                </label>
                                <div className="relative">
                                    <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                                        <Lock size={16} className="text-indigo-400/60" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        autoComplete="current-password"
                                        placeholder="••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={`w-full py-3.5 text-sm font-medium text-white placeholder-white/25 rounded-xl transition-all duration-200 outline-none ${isRTL ? 'pr-11 pl-11' : 'pl-11 pr-11'}`}
                                        style={{
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1.5px solid rgba(255,255,255,0.1)',
                                        }}
                                        onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center text-indigo-400/60 hover:text-indigo-300 transition-colors`}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Attempts warning */}
                            {loginAttempts.count > 0 && loginAttempts.count < 5 && (
                                <p className="text-xs text-amber-400/80 font-semibold" dir={dir}>
                                    {isRTL
                                        ? `⚠️ ${5 - loginAttempts.count} محاولات متبقية قبل الإيقاف المؤقت`
                                        : `⚠️ ${5 - loginAttempts.count} tentative(s) restante(s) avant blocage`
                                    }
                                </p>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all duration-300 flex items-center justify-center gap-3 mt-2"
                                style={{
                                    background: loading ? 'rgba(16, 185, 129, 0.5)' : 'linear-gradient(135deg, #059669, #10b981)',
                                    boxShadow: loading ? 'none' : '0 8px 32px rgba(16, 185, 129, 0.4)',
                                }}
                                onMouseEnter={e => !loading && (e.target.style.transform = 'translateY(-1px)')}
                                onMouseLeave={e => !loading && (e.target.style.transform = 'translateY(0px)')}
                            >
                                {loading ? (
                                    <><Loader2 size={18} className="animate-spin" /> Authenticating...</>
                                ) : (
                                    <><Sparkles size={18} /> Enter SaaS Portal</>
                                )}
                            </button>

                            {/* ── Divider ── */}
                            <div className="flex items-center gap-3 mt-1">
                                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                    {isRTL ? 'أو' : 'ou'}
                                </span>
                                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                            </div>

                            {/* ── Google Sign-In ── */}
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={googleLoading}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 ${isRTL ? 'flex-row-reverse' : ''}`}
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1.5px solid rgba(255,255,255,0.12)',
                                    color: 'rgba(255,255,255,0.85)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                            >
                                {googleLoading ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 48 48">
                                        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.6 2.4 30.1 0 24 0 14.7 0 6.7 5.4 2.9 13.3l7.9 6.1C12.5 13.2 17.8 9.5 24 9.5z"/>
                                        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.1z"/>
                                        <path fill="#FBBC05" d="M10.8 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C1 16.5 0 20.1 0 24s1 7.5 2.9 10.7l7.9-6.1z"/>
                                        <path fill="#34A853" d="M24 48c6.1 0 11.2-2 14.9-5.4l-7.6-5.9c-2 1.4-4.6 2.2-7.3 2.2-6.2 0-11.5-3.7-13.2-9l-7.9 6.1C6.7 42.6 14.7 48 24 48z"/>
                                    </svg>
                                )}
                                {isRTL ? 'تسجيل الدخول بـ Google' : 'Continuer avec Google'}
                            </button>
                        </form>
                    )}
                </div>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 mt-6">
                    <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
                        🔒 {isRTL ? 'بوابة آمنة ومشفرة' : 'Accès sécurisé et chiffré'}
                    </span>
                    <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
            </div>
        </div>
    );
};

export default SaasLogin;
