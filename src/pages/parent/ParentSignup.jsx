import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_URL } from '../../config';
import { Sparkles, Loader2, Mail, Lock, User, Phone, Users, Shield, Eye, EyeOff, Check, AlertCircle, Building2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const ParentSignup = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlAcademyId = searchParams.get('academy_id');
    const { isRTL, dir } = useLanguage();

    const [form, setForm] = useState({
        full_name: '', email: '', password: '', phone: '', academy_id: urlAcademyId || '', child_name: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [academies, setAcademies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Load available academies (public list)
        fetch(`${API_URL}/public/academies`)
            .then(r => r.ok ? r.json() : [])
            .then(d => setAcademies(Array.isArray(d) ? d : []))
            .catch(() => setAcademies([]));
    }, []);

    const onChange = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    const submit = async (e) => {
        e.preventDefault();
        setError('');

        if (!form.full_name || !form.email || !form.password) {
            setError(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Veuillez remplir tous les champs requis');
            return;
        }
        if (form.password.length < 8) {
            setError(isRTL ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Minimum 8 caractères');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/parent-signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                    full_name: form.full_name.trim(),
                    phone: form.phone || null,
                    academy_id: form.academy_id || null,
                    child_name: form.child_name || null,
                }),
            });
            if (res.ok) {
                const data = await res.json().catch(() => ({}));
                if (data.requires_verification) {
                    setRequiresVerification(true);
                    return;
                }
                
                // Auto-login after signup
                try {
                    const loginRes = await fetch(`${API_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: form.email.trim().toLowerCase(), password: form.password }),
                        credentials: 'include',
                    });
                    if (loginRes.ok) {
                        const loginData = await loginRes.json();
                        localStorage.setItem('user_id', loginData.user_id);
                        localStorage.setItem('role', 'parent');
                        localStorage.setItem('account_status', 'Pending');
                        if (loginData.access_token) localStorage.setItem('token', loginData.access_token);
                        if (loginData.refresh_token) localStorage.setItem('refresh_token', loginData.refresh_token);
                        navigate('/parent/checkout', { replace: true });
                        return;
                    }
                } catch (e) {
                    console.error("Auto-login failed:", e);
                }
                setSuccess(true);
            } else {
                const data = await res.json().catch(() => ({}));
                setError(data.detail || (isRTL ? 'فشل التسجيل' : 'Échec de l\'inscription'));
            }
        } catch {
            setError(isRTL ? 'فشل الاتصال بالخادم' : 'Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    const [requiresVerification, setRequiresVerification] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);

    const handleOtpChange = (val, idx) => {
        if (!/^\d*$/.test(val)) return;
        const next = [...otp];
        next[idx] = val.slice(-1);
        setOtp(next);
        if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
    };

    const handleOtpPaste = (e) => {
        const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (text.length === 6) setOtp(text.split(''));
        e.preventDefault();
    };

    const verifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        const code = otp.join('');
        if (code.length < 6) { setError(isRTL ? 'أدخل الرمز كاملاً' : 'Entrez le code complet'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/verify-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.email.trim().toLowerCase(), code }),
            });
            if (res.ok) {
                setRequiresVerification(false);
                setSuccess(true);
            } else {
                const data = await res.json().catch(() => ({}));
                setError(data.detail || (isRTL ? 'رمز غير صحيح' : 'Code invalide'));
            }
        } catch {
            setError(isRTL ? 'فشل الاتصال' : 'Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    if (requiresVerification) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4"
                style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
                <div className="max-w-md w-full bg-white/5 backdrop-blur-xl rounded-3xl p-10 border border-white/10 text-center" dir={dir}>
                    <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-indigo-500/20 border-2 border-indigo-400/30 flex items-center justify-center">
                        <Mail size={32} className="text-indigo-300" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3">
                        {isRTL ? 'تأكيد البريد الإلكتروني' : 'Vérification Email'}
                    </h2>
                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                        {isRTL
                            ? `أرسلنا رمزاً إلى ${form.email}. يرجى إدخاله أدناه:`
                            : `Nous avons envoyé un code à ${form.email}. Veuillez l'entrer ci-dessous:`}
                    </p>
                    
                    {error && (
                        <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                            {error}
                        </div>
                    )}

                    <form onSubmit={verifyOtp}>
                        <div className="flex gap-2 justify-center mb-8" onPaste={handleOtpPaste}>
                            {otp.map((digit, i) => (
                                <input
                                    key={i} id={`otp-${i}`} type="text" inputMode="numeric"
                                    value={digit} maxLength={1}
                                    onChange={e => handleOtpChange(e.target.value, i)}
                                    className="w-12 h-14 text-center text-xl font-bold rounded-xl text-white outline-none transition-all"
                                    style={{
                                        background: digit ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
                                        border: digit ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)'
                                    }}
                                />
                            ))}
                        </div>
                        <button
                            type="submit" disabled={loading}
                            className="w-full py-3.5 rounded-xl font-black text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : (isRTL ? 'تأكيد' : 'Vérifier')}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4"
                style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
                <div className="max-w-md w-full bg-white/5 backdrop-blur-xl rounded-3xl p-10 border border-white/10 text-center" dir={dir}>
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 border-2 border-emerald-400/30 flex items-center justify-center">
                        <Check size={40} className="text-emerald-300" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3">
                        {isRTL ? 'تم التسجيل بنجاح!' : 'Inscription réussie !'}
                    </h2>
                    <p className="text-slate-300 text-sm leading-relaxed mb-6">
                        {isRTL
                            ? 'حسابك قيد المراجعة. سيتم تفعيله من طرف إدارة الأكاديمية بعد تأكيد الدفع. ستتوصل بإشعار عبر الإيميل.'
                            : 'Votre compte est en cours de révision. Il sera activé par l\'académie après confirmation du paiement.'}
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-3.5 rounded-xl font-black text-white text-sm transition-all hover:scale-105"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                        {isRTL ? 'العودة لتسجيل الدخول' : 'Retour à la connexion'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
            <div className="max-w-md w-full bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl" dir={dir}>
                <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <Users size={26} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-1">
                        {isRTL ? 'تسجيل ولي الأمر' : 'Inscription Parent'}
                    </h1>
                    <p className="text-xs text-slate-400">
                        {isRTL ? 'يتم التفعيل بعد موافقة الإدارة' : 'Activation après validation admin'}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                        <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300">{error}</p>
                    </div>
                )}

                <form onSubmit={submit} className="space-y-3">
                    <Field icon={User} value={form.full_name} onChange={onChange('full_name')}
                        placeholder={isRTL ? 'الاسم الكامل' : 'Nom complet'} required />

                    <Field icon={Mail} type="email" value={form.email} onChange={onChange('email')}
                        placeholder={isRTL ? 'البريد الإلكتروني' : 'Email'} required />

                    <div className="relative">
                        <Lock size={16} className="absolute top-1/2 -translate-y-1/2 text-slate-400 left-3" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={form.password}
                            onChange={onChange('password')}
                            placeholder={isRTL ? 'كلمة المرور (8+ أحرف)' : 'Mot de passe (8+)'}
                            required
                            className="w-full pl-10 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 hover:text-white">
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    <Field icon={Phone} type="tel" value={form.phone} onChange={onChange('phone')}
                        placeholder={isRTL ? 'رقم الهاتف (اختياري)' : 'Téléphone (optionnel)'} />

                    <Field icon={User} value={form.child_name} onChange={onChange('child_name')}
                        placeholder={isRTL ? 'اسم الطفل' : 'Nom de l\'enfant'} />

                    <div className="relative">
                        <Building2 size={16} className="absolute top-1/2 -translate-y-1/2 text-slate-400 left-3" />
                        <select
                            value={form.academy_id}
                            onChange={onChange('academy_id')}
                            disabled={!!urlAcademyId}
                            className={`w-full pl-10 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-400 appearance-none ${urlAcademyId ? 'opacity-80 cursor-not-allowed bg-white/10' : ''}`}
                        >
                            <option value="" className="bg-slate-800">
                                {isRTL ? 'اختر الأكاديمية' : 'Sélectionner une académie'}
                            </option>
                            {academies.map(a => (
                                <option key={a.id} value={a.id} className="bg-slate-800">{a.name}</option>
                            ))}
                        </select>
                        {urlAcademyId && (
                            <div className="absolute top-1/2 -translate-y-1/2 right-3 text-emerald-400">
                                <Check size={16} />
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-xl font-black text-white text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 mt-4"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {isRTL ? 'إنشاء حساب' : 'Créer un compte'}
                    </button>

                    <div className="pt-2 border-t border-white/5 mt-4 text-center">
                        <button type="button" onClick={() => navigate('/login')}
                            className="text-xs text-slate-400 hover:text-white">
                            {isRTL ? 'لديك حساب؟ تسجيل الدخول' : 'Déjà inscrit ? Connexion'}
                        </button>
                    </div>
                </form>

                <div className="mt-5 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex items-start gap-2">
                    <Shield size={14} className="text-indigo-300 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-indigo-200 leading-relaxed">
                        {isRTL
                            ? 'بعد التسجيل، يجب تأكيد الدفع مع إدارة الأكاديمية لتفعيل الحساب.'
                            : 'Après inscription, confirmer le paiement avec l\'académie pour activer.'}
                    </p>
                </div>
            </div>
        </div>
    );
};

const Field = ({ icon: Icon, ...props }) => (
    <div className="relative">
        <Icon size={16} className="absolute top-1/2 -translate-y-1/2 text-slate-400 left-3" />
        <input
            {...props}
            className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-400"
        />
    </div>
);

export default ParentSignup;
