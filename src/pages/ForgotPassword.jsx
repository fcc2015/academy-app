import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';
import { Mail, Lock, ArrowRight, CheckCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';

const STEPS = ['email', 'otp', 'password', 'success'];

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0); // 0=email, 1=otp, 2=password, 3=success
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    // ── Step 1: Send OTP ──────────────────────────────────────
    const sendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            // Always advance (to prevent email enumeration)
            setStep(1);
            startResendTimer();
        } catch {
            setError('Erreur réseau. Réessayez.');
        } finally {
            setLoading(false);
        }
    };

    const startResendTimer = () => {
        setResendTimer(60);
        const iv = setInterval(() => {
            setResendTimer(prev => {
                if (prev <= 1) { clearInterval(iv); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    // ── OTP input handling ────────────────────────────────────
    const handleOtpChange = (val, idx) => {
        if (!/^\d*$/.test(val)) return;
        const next = [...otp];
        next[idx] = val.slice(-1);
        setOtp(next);
        if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
    };
    const handleOtpKeyDown = (e, idx) => {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) document.getElementById(`otp-${idx - 1}`)?.focus();
    };
    const handleOtpPaste = (e) => {
        const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (text.length === 6) setOtp(text.split(''));
        e.preventDefault();
    };

    // ── Step 2: Verify OTP ────────────────────────────────────
    const verifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        const code = otp.join('');
        if (code.length < 6) { setError('Entrez les 6 chiffres.'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/verify-reset-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.detail || 'Code incorrect.'); return; }
            setStep(2);
        } catch {
            setError('Erreur réseau. Réessayez.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 3: Reset Password ────────────────────────────────
    const resetPassword = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) { setError('Minimum 6 caractères.'); return; }
        if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: otp.join(''), new_password: password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.detail || 'Erreur.'); return; }
            setStep(3);
        } catch {
            setError('Erreur réseau. Réessayez.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] font-sans p-6">
            <div className="w-full max-w-[420px] bg-white/5 backdrop-blur-[20px] border border-white/10 rounded-3xl p-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-[20px] mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl">⚽</div>
                    <h1 className="text-white text-xl font-black m-0">
                        {step === 0 && 'Mot de passe oublié'}
                        {step === 1 && 'Vérification'}
                        {step === 2 && 'Nouveau mot de passe'}
                        {step === 3 && 'Succès !'}
                    </h1>
                    <p className="text-white/50 text-xs mt-2">
                        {step === 0 && 'Entrez votre email pour recevoir un code'}
                        {step === 1 && `Code envoyé à ${email}`}
                        {step === 2 && 'Choisissez un nouveau mot de passe'}
                        {step === 3 && 'Mot de passe réinitialisé avec succès'}
                    </p>
                </div>

                {/* Progress dots */}
                {step < 3 && (
                    <div className="flex justify-center gap-2 mb-8">
                        {[0, 1, 2].map(i => (
                            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-6' : 'w-2'} ${i <= step ? 'bg-indigo-500' : 'bg-white/15'}`} />
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-5 text-red-300 text-xs text-center">{error}</div>
                )}

                {/* ── Step 0: Email ── */}
                {step === 0 && (
                    <form onSubmit={sendOtp}>
                        <label className="block text-white/60 text-[11px] font-bold mb-2 tracking-widest uppercase">
                            Email
                        </label>
                        <div className="relative mb-6">
                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                            <input
                                type="email" value={email} onChange={e => setEmail(e.target.value)}
                                required placeholder="votre@email.com"
                                className="w-full box-border bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-3 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <button type="submit" disabled={loading} className={`w-full py-3.5 rounded-xl border-none text-white font-black text-sm cursor-pointer flex items-center justify-center gap-2 ${loading ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-[1.02] transition-transform shadow-lg shadow-indigo-500/20'}`}>
                            {loading ? 'Envoi...' : <><span>Envoyer le code</span><ArrowRight size={16} /></>}
                        </button>
                    </form>
                )}

                {/* ── Step 1: OTP ── */}
                {step === 1 && (
                    <form onSubmit={verifyOtp}>
                        <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
                            {otp.map((digit, i) => (
                                <input
                                    key={i} id={`otp-${i}`} type="text" inputMode="numeric"
                                    value={digit} maxLength={1}
                                    onChange={e => handleOtpChange(e.target.value, i)}
                                    onKeyDown={e => handleOtpKeyDown(e, i)}
                                    className={`w-12 h-14 text-center text-xl font-black rounded-xl outline-none transition-all duration-200 ${digit ? 'bg-indigo-500/15 border-2 border-indigo-500 text-white' : 'bg-white/5 border border-white/10 text-white focus:border-indigo-500'}`}
                                />
                            ))}
                        </div>
                        <button type="submit" disabled={loading} className={`w-full py-3.5 rounded-xl border-none text-white font-black text-sm cursor-pointer flex items-center justify-center gap-2 mb-4 ${loading ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-[1.02] transition-transform shadow-lg shadow-indigo-500/20'}`}>
                            {loading ? 'Vérification...' : <><span>Vérifier le code</span><ArrowRight size={16} /></>}
                        </button>
                        <div className="text-center">
                            {resendTimer > 0 ? (
                                <span className="text-white/40 text-xs">
                                    Renvoyer dans {resendTimer}s
                                </span>
                            ) : (
                                <button type="button" onClick={sendOtp} className="bg-none border-none text-indigo-400 text-xs cursor-pointer font-bold inline-flex items-center gap-1 hover:text-indigo-300">
                                    <RefreshCw size={13} /> Renvoyer le code
                                </button>
                            )}
                        </div>
                    </form>
                )}

                {/* ── Step 2: New Password ── */}
                {step === 2 && (
                    <form onSubmit={resetPassword}>
                        {[
                            { label: 'Nouveau mot de passe', val: password, set: setPassword },
                            { label: 'Confirmer', val: confirm, set: setConfirm },
                        ].map(({ label, val, set }, i) => (
                            <div key={i} className="mb-4">
                                <label className="block text-white/60 text-[11px] font-bold mb-2 tracking-widest uppercase">
                                    {label}
                                </label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        type={showPass ? 'text' : 'password'} value={val}
                                        onChange={e => set(e.target.value)} required minLength={6}
                                        placeholder="••••••••"
                                        className="w-full box-border bg-white/5 border border-white/10 rounded-xl py-3 px-10 text-white text-sm outline-none focus:border-indigo-500 transition-colors"
                                    />
                                    {i === 0 && (
                                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-none border-none text-white/30 cursor-pointer hover:text-white transition-colors">
                                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <button type="submit" disabled={loading} className={`w-full py-3.5 rounded-xl border-none text-white font-black text-sm cursor-pointer flex items-center justify-center gap-2 mt-4 ${loading ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-[1.02] transition-transform shadow-lg shadow-indigo-500/20'}`}>
                            {loading ? 'Enregistrement...' : <><span>Réinitialiser</span><Lock size={16} /></>}
                        </button>
                    </form>
                )}

                {/* ── Step 3: Success ── */}
                {step === 3 && (
                    <div className="text-center">
                        <div className="w-18 h-18 rounded-full mx-auto mb-6 bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                            <CheckCircle size={36} className="text-emerald-500" />
                        </div>
                        <p className="text-white/60 text-sm mb-8 leading-relaxed">
                            Votre mot de passe a été réinitialisé. Connectez-vous maintenant.
                        </p>
                        <button onClick={() => navigate('/login')} className="w-full py-3.5 rounded-xl border-none bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-sm cursor-pointer hover:scale-[1.02] transition-transform shadow-lg shadow-indigo-500/20">
                            Se connecter →
                        </button>
                    </div>
                )}

                {/* Back to login */}
                {step < 3 && (
                    <div className="text-center mt-6">
                        <Link to="/login" className="text-white/40 text-xs hover:text-white transition-colors">
                            ← Retour à la connexion
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
