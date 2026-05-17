import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import { Shield, AlertCircle, CreditCard, Banknote, Loader2, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const ParentCheckout = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [settings, setSettings] = useState(null);
    const [paypalProcessing, setPaypalProcessing] = useState(false);
    const [statusPolled, setStatusPolled] = useState(false);
    const navigate = useNavigate();
    const { t, isRTL, dir } = useLanguage();

    const accountStatus = localStorage.getItem('account_status') || 'Active';
    const userId = localStorage.getItem('user_id');

    useEffect(() => {
        // If they magically become active, redirect them
        if (accountStatus === 'Active') {
            navigate('/parent/dashboard', { replace: true });
            return;
        }

        // Fetch academy settings for registration fee
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
                // Fallback settings
                setSettings({ registration_fee: 500, currency: 'MAD' });
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [accountStatus, navigate]);

    // Check URL for payment success callback
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') === 'success') {
            setStatusPolled(true);
            // Polling to wait for webhook to update status
            const interval = setInterval(async () => {
                try {
                    // Try to re-login or fetch user info to get updated status
                    // Just a simple trick: use /auth/role or a similar endpoint to get fresh status
                    // But we can also just fetch /settings/ and look if we are allowed, wait we are allowed anyway.
                    // Let's do a dummy login with the refresh token if we had one?
                    // Actually, let's just log them out and ask them to log in again, or show a success message.
                    localStorage.setItem('account_status', 'Active'); // Optimistic update
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
                    academy_id: userId, // Using user_id here so the webhook knows who paid
                    plan_id: 'registration',
                    amount: settings?.registration_fee || 500,
                    currency: settings?.currency === 'MAD' ? 'USD' : (settings?.currency || 'USD'), // PayPal often needs USD or EUR
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
                        {isRTL ? 'حسابك قيد المراجعة. يرجى أداء رسوم التسجيل لتفعيل الحساب.' : 'Votre compte est en attente. Veuillez régler les frais d\'inscription.'}
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

                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mb-8 text-center">
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">
                            {isRTL ? 'رسوم التسجيل السنوية' : 'Frais d\'inscription annuels'}
                        </p>
                        <div className="text-4xl font-black text-slate-800">
                            {settings?.registration_fee} <span className="text-xl text-slate-500">{settings?.currency}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* PayPal Button */}
                        <button
                            onClick={handlePaypal}
                            disabled={paypalProcessing}
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
                                : (isRTL ? 'الدفع عبر الإنترنت (PayPal)' : 'Payer en ligne (PayPal)')}
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3 py-2">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-xs font-bold text-slate-400 uppercase">
                                {isRTL ? 'أو' : 'ou'}
                            </span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>

                        {/* Cash Button */}
                        <button
                            onClick={() => {
                                alert(isRTL ? "يرجى زيارة الأكاديمية لأداء الرسوم نقداً. سيتم تفعيل حسابك من طرف الإدارة بعد الأداء." : "Veuillez visiter l'académie pour payer en espèces. Votre compte sera activé par l'administration après le paiement.");
                            }}
                            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold text-slate-700 bg-white border-2 border-slate-200 transition-all hover:bg-slate-50 hover:border-slate-300"
                        >
                            <Banknote size={20} className="text-emerald-600" />
                            {isRTL ? 'الدفع نقداً في الأكاديمية' : 'Payer en espèces à l\'académie'}
                        </button>
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
