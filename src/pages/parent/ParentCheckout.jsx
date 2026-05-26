import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import {
    Shield, AlertCircle, CreditCard, Banknote, Loader2, CheckCircle,
    Building2, Copy, ChevronDown, ChevronUp, Smartphone, Zap
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const ParentCheckout = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [settings, setSettings] = useState(null);
    const [paypalProcessing, setPaypalProcessing] = useState(false);
    const [stripeProcessing, setStripeProcessing] = useState(false);
    const [cashProvider, setCashProvider] = useState(null); // 'wafacash' | 'cashplus'
    const [cashProcessing, setCashProcessing] = useState(false);
    const [cashCode, setCashCode] = useState(null);
    const [statusPolled, setStatusPolled] = useState(false);
    const [showCashSection, setShowCashSection] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const navigate = useNavigate();
    const { t, isRTL, dir } = useLanguage();

    const accountStatus = localStorage.getItem('account_status') || 'Active';
    const userId = localStorage.getItem('user_id');

    useEffect(() => {
        if (accountStatus === 'Active') {
            navigate('/parent/dashboard', { replace: true });
            return;
        }
        const fetchSettings = async () => {
            try {
                const res = await authFetch(`${API_URL}/settings/`);
                if (res.ok) {
                    const data = await res.json();
                    setSettings(data);
                } else {
                    throw new Error("Could not fetch academy settings");
                }
            } catch (err) {
                console.error(err);
                setSettings({ registration_fee: 500, currency: 'MAD' });
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [accountStatus, navigate]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') === 'success') {
            setStatusPolled(true);
            const interval = setInterval(() => {
                try {
                    localStorage.setItem('account_status', 'Active');
                    navigate('/parent/dashboard', { replace: true });
                    window.location.reload();
                } catch (e) {}
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [navigate]);

    const handlePaypal = async () => {
        setPaypalProcessing(true);
        setError('');
        try {
            const res = await authFetch(`${API_URL}/payments/gateway/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academy_id: userId,
                    plan_id: 'registration',
                    amount: settings?.registration_fee || 500,
                    currency: settings?.currency === 'MAD' ? 'USD' : (settings?.currency || 'USD'),
                    description: `Academy Registration Fee - Parent ${userId}`,
                    source: 'parent_checkout'
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Failed to initialize payment');
            if (data.approve_url) {
                window.location.href = data.approve_url;
            } else {
                throw new Error("No approval URL returned from PayPal");
            }
        } catch (err) {
            setError(err.message);
            setPaypalProcessing(false);
        }
    };

    const handleStripe = async () => {
        setStripeProcessing(true);
        setError('');
        try {
            const res = await authFetch(`${API_URL}/payments/gateway/stripe/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academy_id: userId,
                    plan_id: 'registration',
                    amount: settings?.registration_fee || 500,
                    currency: 'MAD',
                    description: `Academy Registration Fee - Parent ${userId}`
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Stripe payment failed');
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                throw new Error("No checkout URL returned from Stripe");
            }
        } catch (err) {
            setError(err.message);
            setStripeProcessing(false);
        }
    };

    const handleCashPayment = async (provider) => {
        setCashProvider(provider);
        setCashProcessing(true);
        setError('');
        setCashCode(null);
        try {
            const res = await authFetch(`${API_URL}/payments/gateway/cash/generate-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academy_id: userId,
                    plan_id: 'registration',
                    amount: settings?.registration_fee || 500,
                    provider
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Failed to generate cash code');
            setCashCode(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setCashProcessing(false);
        }
    };

    const copyCode = () => {
        if (cashCode?.payment_code) {
            navigator.clipboard.writeText(cashCode.payment_code).then(() => {
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
            });
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    if (statusPolled) {
        return (
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-emerald-100">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">
                        {isRTL ? 'تمت عملية الدفع بنجاح!' : 'Paiement réussi!'}
                    </h2>
                    <p className="text-slate-500 font-medium mb-6">
                        {isRTL ? 'جاري تفعيل حسابك، يرجى الانتظار...' : 'Activation de votre compte en cours...'}
                    </p>
                    <Loader2 size={24} className="animate-spin text-emerald-500 mx-auto" />
                </div>
            </div>
        );
    }

    // Cash code display screen
    if (cashCode) {
        return (
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-50" dir={dir}>
                <div className="bg-white rounded-[24px] shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">
                    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-center">
                        <div className="w-16 h-16 bg-white/10 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/20">
                            <Building2 size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-white">
                            {cashCode.provider}
                        </h2>
                        <p className="text-emerald-100 text-sm mt-1">
                            {isRTL ? 'رمز الدفع الخاص بك' : 'Votre code de paiement'}
                        </p>
                    </div>

                    <div className="p-8 space-y-6">
                        {/* Payment Code Display */}
                        <div className="bg-slate-50 border-2 border-dashed border-emerald-300 rounded-2xl p-6 text-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                                {isRTL ? 'رمز المرجع' : 'Code de référence'}
                            </p>
                            <div className="text-3xl font-black tracking-[0.2em] text-slate-800 font-mono my-3">
                                {cashCode.payment_code}
                            </div>
                            <button
                                onClick={copyCode}
                                className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-sm hover:bg-emerald-100 transition-colors border border-emerald-200"
                            >
                                <Copy size={14} />
                                {codeCopied
                                    ? (isRTL ? 'تم النسخ!' : 'Copié!')
                                    : (isRTL ? 'نسخ الرمز' : 'Copier le code')}
                            </button>
                        </div>

                        {/* Amount */}
                        <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between border border-slate-200">
                            <span className="font-bold text-slate-600 text-sm">
                                {isRTL ? 'المبلغ الواجب دفعه' : 'Montant à payer'}
                            </span>
                            <span className="text-2xl font-black text-slate-800">
                                {cashCode.amount} <span className="text-sm text-slate-500">MAD</span>
                            </span>
                        </div>

                        {/* Instructions */}
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                            <p className="text-xs font-black text-amber-700 uppercase tracking-wider">
                                {isRTL ? 'التعليمات' : 'Instructions'}
                            </p>
                            <p className="text-sm text-amber-800 leading-relaxed">
                                {isRTL
                                    ? `توجه إلى أقرب وكالة ${cashCode.provider} وقم بتحويل المبلغ ${cashCode.amount} درهم باستخدام الرمز: ${cashCode.payment_code}. سيتم تفعيل حسابك تلقائياً بعد تأكيد الدفع من الإدارة.`
                                    : cashCode.instructions
                                }
                            </p>
                        </div>

                        {/* Pending notice */}
                        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <Smartphone className="text-blue-500 mt-0.5 shrink-0" size={18} />
                            <p className="text-sm text-blue-700 font-medium">
                                {isRTL
                                    ? 'سيتم تفعيل حسابك خلال 24 ساعة من استلام الدفع. تواصل مع إدارة الأكاديمية إذا واجهت أي مشكلة.'
                                    : 'Votre compte sera activé dans les 24h après réception du paiement. Contactez l\'administration si vous avez des questions.'}
                            </p>
                        </div>

                        <button
                            onClick={() => setCashCode(null)}
                            className="w-full py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            {isRTL ? 'العودة إلى خيارات الدفع' : 'Retour aux options de paiement'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-50" dir={dir}>
            <div className="bg-white rounded-[24px] shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">

                {/* Header */}
                <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 opacity-20 blur-[80px] rounded-full pointer-events-none" />
                    <div className="w-16 h-16 bg-white/10 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/20">
                        <Shield size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        {isRTL ? 'تفعيل الحساب' : 'Activation du compte'}
                    </h2>
                    <p className="text-indigo-200 text-sm mt-2 font-medium">
                        {isRTL
                            ? 'حسابك قيد المراجعة. يرجى أداء رسوم التسجيل لتفعيل الحساب.'
                            : 'Votre compte est en attente. Veuillez régler les frais d\'inscription.'}
                    </p>
                </div>

                {/* Body */}
                <div className="p-8">
                    {error && (
                        <div className="flex items-center gap-3 p-4 rounded-xl text-sm font-semibold mb-6 animate-fade-in bg-red-50 text-red-600 border border-red-200">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Fee display */}
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mb-8 text-center">
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">
                            {isRTL ? 'رسوم التسجيل السنوية' : 'Frais d\'inscription annuels'}
                        </p>
                        <div className="text-4xl font-black text-slate-800">
                            {settings?.registration_fee} <span className="text-xl text-slate-500">{settings?.currency}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* PayPal Button */}
                        <button
                            onClick={handlePaypal}
                            disabled={paypalProcessing || stripeProcessing || cashProcessing}
                            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none"
                            style={{ background: 'linear-gradient(135deg, #0070ba, #1546a0)' }}
                        >
                            {paypalProcessing ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <CreditCard size={20} />
                            )}
                            {paypalProcessing
                                ? (isRTL ? 'جاري التحويل...' : 'Redirection...')
                                : (isRTL ? 'الدفع عبر PayPal' : 'Payer avec PayPal')}
                        </button>

                        {/* Stripe Button */}
                        <button
                            onClick={handleStripe}
                            disabled={paypalProcessing || stripeProcessing || cashProcessing}
                            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none"
                            style={{ background: 'linear-gradient(135deg, #635bff, #9d68ff)' }}
                        >
                            {stripeProcessing ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <Zap size={20} />
                            )}
                            {stripeProcessing
                                ? (isRTL ? 'جاري التحويل...' : 'Redirection...')
                                : (isRTL ? 'الدفع بالبطاقة البنكية (Stripe)' : 'Payer par carte (Stripe)')}
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3 py-1">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                {isRTL ? 'أو' : 'ou'}
                            </span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>

                        {/* Moroccan Cash Section */}
                        <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setShowCashSection(v => !v)}
                                disabled={paypalProcessing || stripeProcessing}
                                className="w-full flex items-center justify-between px-5 py-4 font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Banknote size={20} className="text-emerald-600" />
                                    {isRTL ? 'الدفع عبر وكالات الصرف المغربية' : 'Payer via agences de transfert Maroc'}
                                </div>
                                {showCashSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>

                            {showCashSection && (
                                <div className="p-5 space-y-3 border-t border-slate-200 animate-fade-in">
                                    <p className="text-xs text-slate-500 font-medium text-center">
                                        {isRTL
                                            ? 'اختر شبكة الدفع المفضلة لديك'
                                            : 'Choisissez votre réseau de paiement'}
                                    </p>

                                    {/* Wafacash */}
                                    <button
                                        onClick={() => handleCashPayment('wafacash')}
                                        disabled={cashProcessing || paypalProcessing || stripeProcessing}
                                        className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
                                        style={{ background: 'linear-gradient(135deg, #e63c2f, #b92a20)' }}
                                    >
                                        {cashProcessing && cashProvider === 'wafacash' ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Building2 size={18} />
                                        )}
                                        {cashProcessing && cashProvider === 'wafacash'
                                            ? (isRTL ? 'جاري التحضير...' : 'Génération du code...')
                                            : 'Wafacash'}
                                    </button>

                                    {/* CashPlus */}
                                    <button
                                        onClick={() => handleCashPayment('cashplus')}
                                        disabled={cashProcessing || paypalProcessing || stripeProcessing}
                                        className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-xl font-bold text-white transition-all hover:-translate-y-0.5 disabled:opacity-60"
                                        style={{ background: 'linear-gradient(135deg, #1a7f37, #16632c)' }}
                                    >
                                        {cashProcessing && cashProvider === 'cashplus' ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <Building2 size={18} />
                                        )}
                                        {cashProcessing && cashProvider === 'cashplus'
                                            ? (isRTL ? 'جاري التحضير...' : 'Génération du code...')
                                            : 'CashPlus'}
                                    </button>

                                    <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                                        {isRTL
                                            ? 'سيتم توليد رمز مرجعي، أحضره إلى أقرب وكالة لإتمام الدفع'
                                            : 'Un code de référence sera généré. Présentez-le à n\'importe quelle agence pour payer.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
                    <button
                        onClick={() => {
                            localStorage.removeItem('token');
                            localStorage.removeItem('role');
                            localStorage.removeItem('user_id');
                            localStorage.removeItem('account_status');
                            navigate('/login');
                        }}
                        className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                        {isRTL ? 'تسجيل الخروج' : 'Déconnexion'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ParentCheckout;
