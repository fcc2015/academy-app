import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../../config';
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
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
            fontFamily: "'Inter', -apple-system, sans-serif", padding: '24px',
        }}>
            <div style={{
                width: '100%', maxWidth: '420px',
                background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '40px',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '20px', margin: '0 auto 16px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '28px',
                    }}>⚽</div>
                    <h1 style={{ color: 'white', fontSize: '20px', fontWeight: 900, margin: 0 }}>
                        {step === 0 && 'Mot de passe oublié'}
                        {step === 1 && 'Vérification'}
                        {step === 2 && 'Nouveau mot de passe'}
                        {step === 3 && 'Succès !'}
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '8px' }}>
                        {step === 0 && 'Entrez votre email pour recevoir un code'}
                        {step === 1 && `Code envoyé à ${email}`}
                        {step === 2 && 'Choisissez un nouveau mot de passe'}
                        {step === 3 && 'Mot de passe réinitialisé avec succès'}
                    </p>
                </div>

                {/* Progress dots */}
                {step < 3 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{
                                width: i === step ? '24px' : '8px', height: '8px', borderRadius: '4px',
                                background: i <= step ? '#6366f1' : 'rgba(255,255,255,0.15)',
                                transition: 'all 0.3s ease',
                            }} />
                        ))}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '12px', padding: '12px 16px', marginBottom: '20px',
                        color: '#fca5a5', fontSize: '13px', textAlign: 'center',
                    }}>{error}</div>
                )}

                {/* ── Step 0: Email ── */}
                {step === 0 && (
                    <form onSubmit={sendOtp}>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 700, marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                            Email
                        </label>
                        <div style={{ position: 'relative', marginBottom: '24px' }}>
                            <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                            <input
                                type="email" value={email} onChange={e => setEmail(e.target.value)}
                                required placeholder="votre@email.com"
                                style={{
                                    width: '100%', boxSizing: 'border-box',
                                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px', padding: '12px 12px 12px 40px',
                                    color: 'white', fontSize: '14px', outline: 'none',
                                }}
                            />
                        </div>
                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                            background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white', fontWeight: 900, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}>
                            {loading ? 'Envoi...' : <><span>Envoyer le code</span><ArrowRight size={16} /></>}
                        </button>
                    </form>
                )}

                {/* ── Step 1: OTP ── */}
                {step === 1 && (
                    <form onSubmit={verifyOtp}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }} onPaste={handleOtpPaste}>
                            {otp.map((digit, i) => (
                                <input
                                    key={i} id={`otp-${i}`} type="text" inputMode="numeric"
                                    value={digit} maxLength={1}
                                    onChange={e => handleOtpChange(e.target.value, i)}
                                    onKeyDown={e => handleOtpKeyDown(e, i)}
                                    style={{
                                        width: '48px', height: '56px', textAlign: 'center',
                                        fontSize: '22px', fontWeight: 900, borderRadius: '12px',
                                        background: digit ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
                                        border: digit ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                                        color: 'white', outline: 'none',
                                        transition: 'all 0.2s',
                                    }}
                                />
                            ))}
                        </div>
                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                            background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white', fontWeight: 900, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            marginBottom: '16px',
                        }}>
                            {loading ? 'Vérification...' : <><span>Vérifier le code</span><ArrowRight size={16} /></>}
                        </button>
                        <div style={{ textAlign: 'center' }}>
                            {resendTimer > 0 ? (
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                                    Renvoyer dans {resendTimer}s
                                </span>
                            ) : (
                                <button type="button" onClick={sendOtp} style={{
                                    background: 'none', border: 'none', color: '#6366f1',
                                    fontSize: '13px', cursor: 'pointer', fontWeight: 700,
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                }}>
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
                            <div key={i} style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 700, marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                                    {label}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                    <input
                                        type={showPass ? 'text' : 'password'} value={val}
                                        onChange={e => set(e.target.value)} required minLength={6}
                                        placeholder="••••••••"
                                        style={{
                                            width: '100%', boxSizing: 'border-box',
                                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px', padding: '12px 40px 12px 40px',
                                            color: 'white', fontSize: '14px', outline: 'none',
                                        }}
                                    />
                                    {i === 0 && (
                                        <button type="button" onClick={() => setShowPass(!showPass)} style={{
                                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
                                        }}>
                                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '14px', borderRadius: '12px', border: 'none', marginTop: '8px',
                            background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white', fontWeight: 900, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        }}>
                            {loading ? 'Enregistrement...' : <><span>Réinitialiser</span><Lock size={16} /></>}
                        </button>
                    </form>
                )}

                {/* ── Step 3: Success ── */}
                {step === 3 && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 24px',
                            background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <CheckCircle size={36} color="#10b981" />
                        </div>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '32px' }}>
                            Votre mot de passe a été réinitialisé. Connectez-vous maintenant.
                        </p>
                        <button onClick={() => navigate('/login')} style={{
                            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white', fontWeight: 900, fontSize: '14px', cursor: 'pointer',
                        }}>
                            Se connecter →
                        </button>
                    </div>
                )}

                {/* Back to login */}
                {step < 3 && (
                    <div style={{ textAlign: 'center', marginTop: '24px' }}>
                        <Link to="/login" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', textDecoration: 'none' }}>
                            ← Retour à la connexion
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
