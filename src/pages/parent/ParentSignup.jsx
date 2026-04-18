import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';
import { Sparkles, Loader2, Mail, Lock, User, Phone, Users, Shield, Eye, EyeOff, Check, AlertCircle, Building2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const ParentSignup = () => {
    const navigate = useNavigate();
    const { isRTL, dir } = useLanguage();

    const [form, setForm] = useState({
        full_name: '', email: '', password: '', phone: '', academy_id: '', child_name: ''
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
                            className="w-full pl-10 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-400 appearance-none"
                        >
                            <option value="" className="bg-slate-800">
                                {isRTL ? 'اختر الأكاديمية' : 'Sélectionner une académie'}
                            </option>
                            {academies.map(a => (
                                <option key={a.id} value={a.id} className="bg-slate-800">{a.name}</option>
                            ))}
                        </select>
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
