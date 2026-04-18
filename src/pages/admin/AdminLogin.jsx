import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2, Lock, Mail, AlertCircle, Sparkles, QrCode, KeyRound, Fingerprint } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { isAuthenticated } from '../../api';
import {
    isBiometricAvailable,
    hasBiometricCredentials,
    loginWithBiometric,
    saveBiometricCredentials,
    clearBiometricCredentials,
} from '../../native/biometric';

// Rate-limiting store (in-memory, reset on refresh)
const loginAttempts = { count: 0, lockedUntil: null };

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
    // Biometric state
    const [biometricReady, setBiometricReady] = useState(false);
    const [biometricLoading, setBiometricLoading] = useState(false);
    // 2FA state
    const [step, setStep] = useState('credentials'); // 'credentials' | 'totp'
    const [tempToken, setTempToken] = useState('');
    const [totpCode, setTotpCode] = useState('');
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

        // Check biometric availability
        (async () => {
            const available = await isBiometricAvailable();
            if (available) {
                const hasCreds = await hasBiometricCredentials();
                setBiometricReady(hasCreds);
            }
        })();

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
                body: JSON.stringify({ email, password }),
                credentials: 'include', // Receive httpOnly cookie from server
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

            // 2FA required — show TOTP step
            if (data.requires_2fa && data.temp_token) {
                setTempToken(data.temp_token);
                setStep('totp');
                return;
            }

            // Token is now in httpOnly cookie — only store non-sensitive data
            localStorage.setItem('user_id', data.user_id);

            // Offer to save credentials for biometric login next time
            const bioAvailable = await isBiometricAvailable();
            if (bioAvailable) {
                await saveBiometricCredentials(email, password);
                setBiometricReady(true);
            }

            // Always verify role from DB (cookie is sent automatically)
            let role = data.role;
            try {
                const roleRes = await fetch(`${API_URL}/auth/role`, {
                    credentials: 'include',
                });
                if (roleRes.ok) {
                    const roleData = await roleRes.json();
                    if (roleData.role) role = roleData.role;
                }
            } catch (e) { /* use login role as fallback */ }

            localStorage.setItem('role', role);

            if (role === 'super_admin') navigate('/saas/dashboard');
            else if (role === 'admin') navigate('/admin/dashboard');
            else if (role === 'coach') navigate('/coach/dashboard');
            else if (role === 'parent') navigate('/parent/dashboard');
            else throw new Error('Accès refusé. Rôle non autorisé.');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTotpVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_URL}/auth/2fa/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ temp_token: tempToken, code: totpCode }),
                credentials: 'include',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Invalid code');

            localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('role', data.role);

            if (data.role === 'super_admin') navigate('/saas/dashboard');
            else if (data.role === 'admin') navigate('/admin/dashboard');
            else navigate('/coach/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBiometricLogin = async () => {
        setBiometricLoading(true);
        setError('');
        try {
            const creds = await loginWithBiometric();
            if (!creds) return; // cancelled

            // Auto-fill and submit with saved credentials
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: creds.username, password: creds.password }),
                credentials: 'include',
            });
            const data = await res.json();
            if (!res.ok) {
                // Saved creds no longer valid — clear them
                await clearBiometricCredentials();
                setBiometricReady(false);
                throw new Error(data.detail || 'Biometric login failed');
            }

            if (data.requires_2fa && data.temp_token) {
                setTempToken(data.temp_token);
                setStep('totp');
                return;
            }

            localStorage.setItem('user_id', data.user_id);
            const role = data.role;
            localStorage.setItem('role', role);
            if (role === 'super_admin') navigate('/saas/dashboard');
            else if (role === 'admin') navigate('/admin/dashboard');
            else if (role === 'coach') navigate('/coach/dashboard');
            else navigate('/parent/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setBiometricLoading(false);
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
            {/* Ambient glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600 opacity-10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-600 opacity-10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500 opacity-5 blur-[140px] rounded-full pointer-events-none" />

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
                        {t('auth.adminLogin')}
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

                    {/* ── 2FA TOTP step ── */}
                    {step === 'totp' ? (
                        <form onSubmit={handleTotpVerify} className="space-y-5">
                            <div className="text-center mb-2">
                                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.3)' }}>
                                    <KeyRound size={24} className="text-indigo-400" />
                                </div>
                                <h3 className="text-white font-black text-base">
                                    {isRTL ? 'رمز المصادقة الثنائية' : 'Code d\'authentification'}
                                </h3>
                                <p className="text-indigo-300/60 text-xs mt-1">
                                    {isRTL ? 'أدخل الرمز من تطبيق المصادقة' : 'Entrez le code de votre application'}
                                </p>
                            </div>

                            {error && (
                                <div className="flex items-center gap-3 p-4 rounded-xl text-sm font-semibold"
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                                    <AlertCircle size={16} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                required
                                autoFocus
                                placeholder="000000"
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                className="w-full py-4 text-center text-2xl font-black tracking-[0.4em] text-white rounded-xl outline-none transition-all"
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1.5px solid rgba(255,255,255,0.1)',
                                    letterSpacing: '0.4em',
                                }}
                                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />

                            <button
                                type="submit"
                                disabled={loading || totpCode.length !== 6}
                                className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all flex items-center justify-center gap-3"
                                style={{
                                    background: (loading || totpCode.length !== 6) ? 'rgba(79,70,229,0.4)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    boxShadow: (loading || totpCode.length !== 6) ? 'none' : '0 8px 32px rgba(79,70,229,0.4)',
                                }}
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Shield size={18} />}
                                {loading
                                    ? (isRTL ? 'جاري التحقق...' : 'Vérification...')
                                    : (isRTL ? 'تحقق' : 'Vérifier')}
                            </button>

                            <button type="button" onClick={() => { setStep('credentials'); setError(''); setTotpCode(''); }}
                                className="w-full text-xs font-semibold text-indigo-400/60 hover:text-indigo-300 transition-colors">
                                {isRTL ? '← رجوع' : '← Retour'}
                            </button>
                        </form>
                    ) : /* ── Locked state ── */ isLocked ? (
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
                                    background: loading ? 'rgba(79,70,229,0.5)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    boxShadow: loading ? 'none' : '0 8px 32px rgba(79,70,229,0.4)',
                                }}
                                onMouseEnter={e => !loading && (e.target.style.transform = 'translateY(-1px)')}
                                onMouseLeave={e => !loading && (e.target.style.transform = 'translateY(0px)')}
                            >
                                {loading ? (
                                    <><Loader2 size={18} className="animate-spin" /> {isRTL ? 'جاري التحقق...' : 'Vérification...'}</>
                                ) : (
                                    <><Sparkles size={18} /> {t('auth.loginButton')}</>
                                )}
                            </button>

                            <div className="text-center">
                                <button type="button"
                                    onClick={() => navigate('/saas/login?mode=forgot')}
                                    className="text-xs font-semibold text-indigo-400/70 hover:text-indigo-300 transition-colors">
                                    {isRTL ? 'نسيت كلمة المرور؟' : 'Mot de passe oublié?'}
                                </button>
                            </div>

                            {/* ── Divider ── */}
                            <div className="flex items-center gap-3 mt-1">
                                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                    {isRTL ? 'أو' : 'ou'}
                                </span>
                                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                            </div>

                            {/* ── Parent Signup Link ── */}
                            <button
                                type="button"
                                onClick={() => navigate('/parent/signup')}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${isRTL ? 'flex-row-reverse' : ''}`}
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1.5px solid rgba(255,255,255,0.12)',
                                    color: 'rgba(255,255,255,0.85)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                            >
                                <Sparkles size={16} />
                                {isRTL ? 'إنشاء حساب ولي أمر جديد' : "S'inscrire en tant que parent"}
                            </button>

                            {/* ── QR Code Login ── */}
                            <button
                                type="button"
                                onClick={() => navigate('/qr-login')}
                                className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 ${isRTL ? 'flex-row-reverse' : ''}`}
                                style={{
                                    background: 'rgba(79,70,229,0.1)',
                                    border: '1.5px solid rgba(79,70,229,0.3)',
                                    color: 'rgba(165,160,255,0.9)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,70,229,0.2)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(79,70,229,0.1)'; }}
                            >
                                <QrCode size={18} />
                                {isRTL ? '📱 سجل الدخول بـ QR Code' : '📱 Connexion par QR Code'}
                            </button>

                            {/* ── Biometric Login ── */}
                            {biometricReady && (
                                <button
                                    type="button"
                                    onClick={handleBiometricLogin}
                                    disabled={biometricLoading}
                                    className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 ${isRTL ? 'flex-row-reverse' : ''}`}
                                    style={{
                                        background: 'rgba(16,185,129,0.1)',
                                        border: '1.5px solid rgba(16,185,129,0.3)',
                                        color: 'rgba(110,231,183,0.9)',
                                    }}
                                    onMouseEnter={e => { if (!biometricLoading) e.currentTarget.style.background = 'rgba(16,185,129,0.18)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; }}
                                >
                                    {biometricLoading
                                        ? <Loader2 size={18} className="animate-spin" />
                                        : <Fingerprint size={18} />
                                    }
                                    {isRTL ? '🔐 تسجيل بالبصمة' : '🔐 Connexion par empreinte'}
                                </button>
                            )}
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

export default AdminLogin;
