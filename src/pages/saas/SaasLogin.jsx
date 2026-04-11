import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2, Lock, Mail, AlertCircle, Sparkles, UserPlus, Building2, CheckCircle2, User } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { isAuthenticated } from '../../api';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kbhnqntteexatihidhkn.supabase.co';

// Rate-limiting store (in-memory, reset on refresh)
const loginAttempts = { count: 0, lockedUntil: null };

// Clear any non-admin session before rendering (synchronous, before any hooks)
(function clearNonAdminSession() {
    const role = localStorage.getItem('role');
    if (role && role !== 'admin' && role !== 'super_admin') {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('user_id');
        localStorage.removeItem('token_expires');
    }
})();

const SaasLogin = () => {
    const [mode, setMode] = useState('login'); // 'login' | 'register'

    // Login state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [lockSecondsLeft, setLockSecondsLeft] = useState(0);

    // Register state
    const [regForm, setRegForm] = useState({
        academy_name: '', admin_name: '',
        admin_email: '', admin_email_confirm: '',
        admin_password: '', admin_password_confirm: ''
    });
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [showRegPasswordConfirm, setShowRegPasswordConfirm] = useState(false);
    const [regLoading, setRegLoading] = useState(false);
    const [regError, setRegError] = useState('');
    const [regSuccess, setRegSuccess] = useState(false);

    const navigate = useNavigate();
    const { t, isRTL, dir } = useLanguage();

    useEffect(() => {
        if (isAuthenticated()) {
            const role = localStorage.getItem('role');
            if (role === 'super_admin') { navigate('/saas/dashboard', { replace: true }); return; }
            else if (role === 'admin') { navigate('/admin/dashboard', { replace: true }); return; }
            // parent/coach have no business here — clear their session
            else if (role === 'coach' || role === 'parent') {
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('user_id');
                localStorage.removeItem('token_expires');
            }
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
        if (loginAttempts.lockedUntil && Date.now() < loginAttempts.lockedUntil) { setIsLocked(true); return; }
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
                loginAttempts.count += 1;
                if (loginAttempts.count >= 5) {
                    loginAttempts.lockedUntil = Date.now() + 5 * 60 * 1000;
                    loginAttempts.count = 0;
                    setIsLocked(true);
                    setLockSecondsLeft(300);
                }
                throw new Error(data.detail || 'Identifiants incorrects');
            }
            loginAttempts.count = 0;
            loginAttempts.lockedUntil = null;
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('token_expires', Date.now() + 24 * 60 * 60 * 1000);
            if (data.role === 'super_admin') {
                navigate('/saas/dashboard');
            } else if (data.role === 'admin') {
                navigate('/admin/dashboard');
            } else {
                throw new Error('Access Denied.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setRegError('');
        if (regForm.admin_email !== regForm.admin_email_confirm) {
            setRegError('Les adresses email ne correspondent pas.');
            return;
        }
        if (regForm.admin_password !== regForm.admin_password_confirm) {
            setRegError('Les mots de passe ne correspondent pas.');
            return;
        }
        if (regForm.admin_password.length < 6) {
            setRegError('Le mot de passe doit contenir au moins 6 caractères.');
            return;
        }
        setRegLoading(true);
        try {
            const API = API_URL.includes('localhost') ? 'https://academy-backend-4dln.onrender.com' : API_URL;
            const res = await fetch(`${API}/public/register-academy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academy_name: regForm.academy_name,
                    admin_name: regForm.admin_name,
                    admin_email: regForm.admin_email,
                    admin_password: regForm.admin_password
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setRegSuccess(true);
                // Auto-login after successful registration
                const loginRes = await fetch(`${API}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: regForm.admin_email, password: regForm.admin_password })
                });
                const loginData = await loginRes.json();
                if (loginRes.ok && loginData.access_token) {
                    localStorage.setItem('token', loginData.access_token);
                    localStorage.setItem('role', loginData.role);
                    localStorage.setItem('user_id', loginData.user_id);
                    localStorage.setItem('token_expires', Date.now() + 24 * 60 * 60 * 1000);
                    setTimeout(() => { navigate('/admin/dashboard'); }, 1500);
                } else {
                    // fallback: go to login tab with email pre-filled
                    setTimeout(() => {
                        setMode('login');
                        setEmail(regForm.admin_email);
                        setRegSuccess(false);
                        setRegForm({ academy_name: '', admin_name: '', admin_email: '', admin_email_confirm: '', admin_password: '', admin_password_confirm: '' });
                    }, 2000);
                }
            } else {
                setRegError(data.detail || 'Erreur lors de la création.');
            }
        } catch {
            setRegError('Connexion échouée. Veuillez réessayer.');
        } finally {
            setRegLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        try {
            const redirectTo = `${window.location.origin}/auth/callback`;
            window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
        } catch {
            setGoogleLoading(false);
            setError('Connexion Google échouée');
        }
    };

    const inputStyle = {
        background: 'rgba(255,255,255,0.06)',
        border: '1.5px solid rgba(255,255,255,0.1)',
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-8"
            dir={dir}
            style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>

            {/* Ambient glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600 opacity-20 blur-[130px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-amber-600 opacity-20 blur-[110px] rounded-full pointer-events-none" />

            <div className="relative w-full max-w-md mx-4">
                {/* Logo */}
                <div className="text-center mb-6 flex flex-col items-center">
                    <img src="/logo.png" alt="Logo" className="h-24 object-contain mb-3 drop-shadow-2xl"
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    <div className="hidden items-center justify-center w-14 h-14 rounded-[16px] mb-3"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 8px 32px rgba(79,70,229,0.5)' }}>
                        <Shield size={24} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">
                        {mode === 'login' ? (isRTL ? 'دخول الإدارة العامة (SaaS)' : 'SaaS Admin Portal') : (isRTL ? 'إنشاء أكاديمية جديدة' : 'Créer votre Académie')}
                    </h1>
                    <p className="text-sm text-indigo-300/70 mt-1 font-medium">
                        {mode === 'login' ? (isRTL ? 'بوابة الإدارة المحمية' : 'Portail d\'administration sécurisé') : (isRTL ? 'ابدأ مجاناً — جاهز في ثوانٍ' : 'Commencez — prêt en quelques secondes')}
                    </p>
                </div>

                {/* Mode Tabs */}
                <div className="flex rounded-2xl p-1 mb-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button onClick={() => { setMode('login'); setError(''); }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all duration-200 flex items-center justify-center gap-2"
                        style={{ background: mode === 'login' ? 'rgba(99,102,241,0.4)' : 'transparent', color: mode === 'login' ? '#a5b4fc' : 'rgba(255,255,255,0.4)', border: mode === 'login' ? '1px solid rgba(99,102,241,0.3)' : 'none' }}>
                        <Lock size={14} />
                        {isRTL ? 'تسجيل الدخول' : 'Se connecter'}
                    </button>
                    <button onClick={() => { setMode('register'); setRegError(''); setRegSuccess(false); }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all duration-200 flex items-center justify-center gap-2"
                        style={{ background: mode === 'register' ? 'rgba(16,185,129,0.3)' : 'transparent', color: mode === 'register' ? '#6ee7b7' : 'rgba(255,255,255,0.4)', border: mode === 'register' ? '1px solid rgba(16,185,129,0.3)' : 'none' }}>
                        <UserPlus size={14} />
                        {isRTL ? 'إنشاء حساب' : 'Créer un compte'}
                    </button>
                </div>

                {/* Form Card */}
                <div className="rounded-[28px] p-8 relative"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}>

                    {/* ── LOGIN MODE ── */}
                    {mode === 'login' && (
                        <>
                            {isLocked ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                        <Lock size={28} className="text-red-400" />
                                    </div>
                                    <h3 className="text-white font-black text-lg mb-2">
                                        {isRTL ? 'تم إيقاف الوصول مؤقتاً' : 'Accès temporairement bloqué'}
                                    </h3>
                                    <p className="text-red-300/80 text-sm font-medium">
                                        {isRTL ? `انتظر ${lockSecondsLeft}ث` : `Attendez ${lockSecondsLeft}s`}
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
                                    {error && (
                                        <div className="flex items-center gap-3 p-4 rounded-xl text-sm font-semibold"
                                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                                            <AlertCircle size={16} className="shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-indigo-300/70 mb-2">
                                            {t('auth.email')}
                                        </label>
                                        <div className="relative">
                                            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                                                <Mail size={16} className="text-indigo-400/60" />
                                            </div>
                                            <input type="email" required autoComplete="username"
                                                placeholder="admin@academy.ma"
                                                value={email} onChange={e => setEmail(e.target.value)}
                                                className={`w-full py-3.5 text-sm font-medium text-white placeholder-white/25 rounded-xl transition-all outline-none ${isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'}`}
                                                style={inputStyle}
                                                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-widest text-indigo-300/70 mb-2">
                                            {t('auth.password')}
                                        </label>
                                        <div className="relative">
                                            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                                                <Lock size={16} className="text-indigo-400/60" />
                                            </div>
                                            <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password"
                                                placeholder="••••••••••"
                                                value={password} onChange={e => setPassword(e.target.value)}
                                                className={`w-full py-3.5 text-sm font-medium text-white placeholder-white/25 rounded-xl transition-all outline-none ${isRTL ? 'pr-11 pl-11' : 'pl-11 pr-11'}`}
                                                style={inputStyle}
                                                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.7)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                                className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center text-indigo-400/60 hover:text-indigo-300`}>
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {loginAttempts.count > 0 && loginAttempts.count < 5 && (
                                        <p className="text-xs text-amber-400/80 font-semibold">
                                            ⚠️ {5 - loginAttempts.count} tentative(s) restante(s)
                                        </p>
                                    )}

                                    <button type="submit" disabled={loading}
                                        className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all flex items-center justify-center gap-3 mt-2"
                                        style={{ background: loading ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg, #059669, #10b981)', boxShadow: loading ? 'none' : '0 8px 32px rgba(16,185,129,0.4)' }}>
                                        {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : <><Sparkles size={18} /> Enter SaaS Portal</>}
                                    </button>

                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>ou</span>
                                        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                    </div>

                                    <button type="button" onClick={handleGoogleLogin} disabled={googleLoading}
                                        className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>
                                        {googleLoading ? <Loader2 size={18} className="animate-spin" /> : (
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
                        </>
                    )}

                    {/* ── REGISTER MODE ── */}
                    {mode === 'register' && (
                        <>
                            {regSuccess ? (
                                <div className="text-center py-10">
                                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                                        <CheckCircle2 size={32} className="text-emerald-400" />
                                    </div>
                                    <h4 className="text-white font-black text-lg mb-2">Académie créée! 🎉</h4>
                                    <p className="text-emerald-300/80 text-sm font-medium">Redirection vers la connexion...</p>
                                </div>
                            ) : (
                                <form onSubmit={handleRegister} className="space-y-4">
                                    {regError && (
                                        <div className="flex items-center gap-3 p-3 rounded-xl text-sm font-semibold"
                                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                                            <AlertCircle size={15} className="shrink-0" />
                                            <span>{regError}</span>
                                        </div>
                                    )}

                                    {/* Academy Name */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-300/60 mb-1.5">
                                            {isRTL ? 'اسم الأكاديمية' : "Nom de l'Académie"} *
                                        </label>
                                        <div className="relative">
                                            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none`}>
                                                <Building2 size={15} className="text-indigo-400/50" />
                                            </div>
                                            <input type="text" required
                                                placeholder="Ex: FC Atlas Academy"
                                                value={regForm.academy_name}
                                                onChange={e => setRegForm({ ...regForm, academy_name: e.target.value })}
                                                className={`w-full py-3 text-sm font-medium text-white placeholder-white/20 rounded-xl outline-none ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'}`}
                                                style={inputStyle}
                                                onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.6)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                        </div>
                                    </div>

                                    {/* Admin Name */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-300/60 mb-1.5">
                                            {isRTL ? 'اسم المدير' : 'Nom complet'} *
                                        </label>
                                        <div className="relative">
                                            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none`}>
                                                <User size={15} className="text-indigo-400/50" />
                                            </div>
                                            <input type="text" required
                                                placeholder={isRTL ? 'الاسم الكامل' : 'Votre nom complet'}
                                                value={regForm.admin_name}
                                                onChange={e => setRegForm({ ...regForm, admin_name: e.target.value })}
                                                className={`w-full py-3 text-sm font-medium text-white placeholder-white/20 rounded-xl outline-none ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'}`}
                                                style={inputStyle}
                                                onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.6)'}
                                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-300/60 mb-1.5">Email *</label>
                                        <div className="relative">
                                            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none`}>
                                                <Mail size={15} className="text-indigo-400/50" />
                                            </div>
                                            <input type="email" required
                                                placeholder="admin@votre-academie.ma"
                                                value={regForm.admin_email}
                                                onChange={e => setRegForm({ ...regForm, admin_email: e.target.value })}
                                                className={`w-full py-3 text-sm font-medium text-white placeholder-white/20 rounded-xl outline-none ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'}`}
                                                style={{ ...inputStyle, borderColor: regForm.admin_email_confirm && regForm.admin_email !== regForm.admin_email_confirm ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)' }}
                                                onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.6)'}
                                                onBlur={e => e.target.style.borderColor = regForm.admin_email_confirm && regForm.admin_email !== regForm.admin_email_confirm ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)'} />
                                        </div>
                                    </div>

                                    {/* Confirm Email */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-300/60 mb-1.5">
                                            {isRTL ? 'تأكيد الإيميل' : "Confirmer l'email"} *
                                        </label>
                                        <div className="relative">
                                            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none`}>
                                                <Mail size={15} style={{ color: regForm.admin_email_confirm ? (regForm.admin_email === regForm.admin_email_confirm ? '#34d399' : '#f87171') : 'rgba(99,102,241,0.5)' }} />
                                            </div>
                                            <input type="email" required
                                                placeholder={isRTL ? 'أعد كتابة الإيميل' : "Retaper l'email"}
                                                value={regForm.admin_email_confirm}
                                                onChange={e => setRegForm({ ...regForm, admin_email_confirm: e.target.value })}
                                                className={`w-full py-3 text-sm font-medium text-white placeholder-white/20 rounded-xl outline-none ${isRTL ? 'pr-10 pl-3.5' : 'pl-10 pr-3.5'}`}
                                                style={{ ...inputStyle, borderColor: regForm.admin_email_confirm ? (regForm.admin_email === regForm.admin_email_confirm ? 'rgba(52,211,153,0.6)' : 'rgba(239,68,68,0.6)') : 'rgba(255,255,255,0.1)' }}
                                                onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.6)'}
                                                onBlur={e => e.target.style.borderColor = regForm.admin_email_confirm ? (regForm.admin_email === regForm.admin_email_confirm ? 'rgba(52,211,153,0.6)' : 'rgba(239,68,68,0.6)') : 'rgba(255,255,255,0.1)'} />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-300/60 mb-1.5">
                                            {isRTL ? 'كلمة المرور' : 'Mot de passe'} *
                                        </label>
                                        <div className="relative">
                                            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none`}>
                                                <Lock size={15} className="text-indigo-400/50" />
                                            </div>
                                            <input type={showRegPassword ? 'text' : 'password'} required minLength={6}
                                                placeholder="Min. 6 caractères"
                                                value={regForm.admin_password}
                                                onChange={e => setRegForm({ ...regForm, admin_password: e.target.value })}
                                                className={`w-full py-3 text-sm font-medium text-white placeholder-white/20 rounded-xl outline-none ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
                                                style={{ ...inputStyle, borderColor: regForm.admin_password_confirm && regForm.admin_password !== regForm.admin_password_confirm ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)' }}
                                                onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.6)'}
                                                onBlur={e => e.target.style.borderColor = regForm.admin_password_confirm && regForm.admin_password !== regForm.admin_password_confirm ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)'} />
                                            <button type="button" onClick={() => setShowRegPassword(!showRegPassword)}
                                                className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3.5' : 'right-0 pr-3.5'} flex items-center text-indigo-400/50 hover:text-indigo-300`}>
                                                {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Password */}
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-300/60 mb-1.5">
                                            {isRTL ? 'تأكيد كلمة المرور' : 'Confirmer le mot de passe'} *
                                        </label>
                                        <div className="relative">
                                            <div className={`absolute inset-y-0 ${isRTL ? 'right-0 pr-3.5' : 'left-0 pl-3.5'} flex items-center pointer-events-none`}>
                                                <Lock size={15} style={{ color: regForm.admin_password_confirm ? (regForm.admin_password === regForm.admin_password_confirm ? '#34d399' : '#f87171') : 'rgba(99,102,241,0.5)' }} />
                                            </div>
                                            <input type={showRegPasswordConfirm ? 'text' : 'password'} required
                                                placeholder={isRTL ? 'أعد كتابة كلمة المرور' : 'Retaper le mot de passe'}
                                                value={regForm.admin_password_confirm}
                                                onChange={e => setRegForm({ ...regForm, admin_password_confirm: e.target.value })}
                                                className={`w-full py-3 text-sm font-medium text-white placeholder-white/20 rounded-xl outline-none ${isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10'}`}
                                                style={{ ...inputStyle, borderColor: regForm.admin_password_confirm ? (regForm.admin_password === regForm.admin_password_confirm ? 'rgba(52,211,153,0.6)' : 'rgba(239,68,68,0.6)') : 'rgba(255,255,255,0.1)' }}
                                                onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.6)'}
                                                onBlur={e => e.target.style.borderColor = regForm.admin_password_confirm ? (regForm.admin_password === regForm.admin_password_confirm ? 'rgba(52,211,153,0.6)' : 'rgba(239,68,68,0.6)') : 'rgba(255,255,255,0.1)'} />
                                            <button type="button" onClick={() => setShowRegPasswordConfirm(!showRegPasswordConfirm)}
                                                className={`absolute inset-y-0 ${isRTL ? 'left-0 pl-3.5' : 'right-0 pr-3.5'} flex items-center text-indigo-400/50 hover:text-indigo-300`}>
                                                {showRegPasswordConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                    </div>

                                    <button type="submit" disabled={regLoading}
                                        className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all flex items-center justify-center gap-3 mt-2"
                                        style={{ background: regLoading ? 'rgba(16,185,129,0.4)' : 'linear-gradient(135deg, #059669, #10b981)', boxShadow: regLoading ? 'none' : '0 8px 32px rgba(16,185,129,0.35)', opacity: regLoading ? 0.8 : 1 }}>
                                        {regLoading ? <><Loader2 size={18} className="animate-spin" /> {isRTL ? 'جارٍ الإنشاء...' : 'Création en cours...'}</> : <><UserPlus size={18} /> {isRTL ? 'إنشاء الأكاديمية' : 'Créer mon Académie'}</>}
                                    </button>

                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>ou</span>
                                        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                    </div>

                                    <button type="button" onClick={handleGoogleLogin} disabled={googleLoading}
                                        className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>
                                        {googleLoading ? <Loader2 size={18} className="animate-spin" /> : (
                                            <svg width="18" height="18" viewBox="0 0 48 48">
                                                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.6 2.4 30.1 0 24 0 14.7 0 6.7 5.4 2.9 13.3l7.9 6.1C12.5 13.2 17.8 9.5 24 9.5z"/>
                                                <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.1z"/>
                                                <path fill="#FBBC05" d="M10.8 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C1 16.5 0 20.1 0 24s1 7.5 2.9 10.7l7.9-6.1z"/>
                                                <path fill="#34A853" d="M24 48c6.1 0 11.2-2 14.9-5.4l-7.6-5.9c-2 1.4-4.6 2.2-7.3 2.2-6.2 0-11.5-3.7-13.2-9l-7.9 6.1C6.7 42.6 14.7 48 24 48z"/>
                                            </svg>
                                        )}
                                        {isRTL ? 'التسجيل بـ Google' : "S'inscrire avec Google"}
                                    </button>
                                </form>
                            )}
                        </>
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
