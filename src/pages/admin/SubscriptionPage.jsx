import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import { Check, Loader2, Crown, Zap, Star, Sparkles, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../components/Toast';

const PLANS = [
    {
        id: 'free',
        name: 'مجاني',
        price: 0,
        priceUSD: 0,
        icon: Star,
        gradient: 'from-slate-400 to-slate-600',
        features: [
            '15 لاعب',
            'مدير واحد',
            'مدرب واحد',
            'الوظائف الأساسية',
        ],
    },
    {
        id: 'pro',
        name: 'احترافية',
        price: 499,   // MAD/month
        priceUSD: 49,
        icon: Zap,
        gradient: 'from-blue-500 to-cyan-600',
        popular: true,
        features: [
            '100 لاعب',
            '4 إداريين',
            '10 مدربين',
            'تقارير متقدمة',
            'دعم بالأولوية',
        ],
    },
    {
        id: 'enterprise',
        name: 'متطورة (Enterprise)',
        price: 999,   // MAD/month
        priceUSD: 99,
        icon: Crown,
        gradient: 'from-violet-500 to-purple-600',
        features: [
            'لاعبون غير محدودين',
            'إداريون غير محدودين',
            'مدربون غير محدودون',
            '🏢 إدارة الفروع',
            'مسؤولون مساعدون لكل فرع',
            'دعم مخصص 24/7',
        ],
    },
];

const SubscriptionPage = () => {
    const { isRTL } = useLanguage();
    const toast = useToast();
    const [planInfo, setPlanInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [upgradingPlan, setUpgradingPlan] = useState(null);
    const [paymentResult, setPaymentResult] = useState(null);

    const fetchPlan = async () => {
        try {
            const res = await authFetch(`${API_URL}/settings/plan`);
            if (res.ok) setPlanInfo(await res.json());
        } catch {/* ignore */} finally { setLoading(false); }
    };

    useEffect(() => { fetchPlan(); }, []);

    // Handle PayPal return
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const payment = params.get('payment');
        const token = params.get('token');
        const academy_id = params.get('academy_id');
        const plan_id = params.get('plan_id');

        if (payment === 'success' && token && academy_id) {
            setPaymentResult('capturing');
            authFetch(`${API_URL}/payments/gateway/capture-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: token, academy_id, plan_id }),
            })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        setPaymentResult('success');
                        toast.success('تمت الترقية بنجاح!');
                        fetchPlan();
                    } else {
                        setPaymentResult('error');
                        toast.error('فشلت عملية الترقية');
                    }
                })
                .catch(() => { setPaymentResult('error'); toast.error('خطأ في تأكيد الدفع'); });
            window.history.replaceState({}, '', '/admin/subscription');
        } else if (payment === 'cancelled') {
            setPaymentResult('cancelled');
            toast.error('تم إلغاء عملية الدفع');
            window.history.replaceState({}, '', '/admin/subscription');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUpgrade = async (plan) => {
        if (!planInfo?.academy_id) {
            toast.error('تعذر تحديد الأكاديمية');
            return;
        }
        if (plan.id === planInfo.plan_id) return;
        if (plan.id === 'free') {
            toast.info('للنزول إلى الخطة المجانية، تواصل مع الدعم');
            return;
        }
        setUpgradingPlan(plan.id);
        try {
            const res = await authFetch(`${API_URL}/payments/gateway/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academy_id: planInfo.academy_id,
                    plan_id: plan.id,
                    amount: plan.priceUSD,
                    currency: 'USD',
                    description: `${plan.name} Plan — Academy SaaS (${plan.price} MAD/mo)`,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.approve_url) {
                    window.location.href = data.approve_url;
                    return;
                }
                throw new Error('No PayPal URL returned');
            }
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'فشل في بدء عملية الدفع');
        } catch (e) {
            toast.error(e.message || 'خطأ في الاتصال');
        } finally {
            setUpgradingPlan(null);
        }
    };

    const currentPlanId = planInfo?.plan_id || 'free';

    return (
        <div className="p-6 max-w-7xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className={`mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                    <Sparkles className="text-violet-600" size={32} />
                    اشتراك الأكاديمية
                </h1>
                <p className="text-slate-500 mt-2">اختر الخطة المناسبة لاحتياجاتك. الترقية تتم فوراً عبر PayPal.</p>
            </div>

            {paymentResult === 'capturing' && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
                    <Loader2 className="animate-spin text-blue-600" />
                    <span className="font-bold text-blue-900">جارٍ تأكيد الدفع...</span>
                </div>
            )}
            {paymentResult === 'cancelled' && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="text-amber-600" />
                    <span className="font-bold text-amber-900">تم إلغاء عملية الدفع.</span>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-violet-600" size={40} />
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-3">
                    {PLANS.map(plan => {
                        const Icon = plan.icon;
                        const isCurrent = plan.id === currentPlanId;
                        const isLoadingThis = upgradingPlan === plan.id;
                        return (
                            <div
                                key={plan.id}
                                className={`relative bg-white rounded-3xl border-2 ${
                                    isCurrent
                                        ? 'border-violet-500 shadow-xl shadow-violet-100'
                                        : 'border-slate-100 hover:border-slate-200'
                                } p-6 flex flex-col transition-all`}
                            >
                                {plan.popular && !isCurrent && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-black px-3 py-1 rounded-full shadow">
                                        الأكثر شعبية
                                    </div>
                                )}
                                {isCurrent && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-black px-3 py-1 rounded-full shadow">
                                        خطتك الحالية
                                    </div>
                                )}

                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg mb-4`}>
                                    <Icon className="text-white" size={28} />
                                </div>

                                <h3 className="text-2xl font-black text-slate-900 mb-1">{plan.name}</h3>

                                <div className="mb-5">
                                    {plan.price === 0 ? (
                                        <span className="text-3xl font-black text-slate-900">مجاني</span>
                                    ) : (
                                        <>
                                            <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                                            <span className="text-slate-500 mr-1">د.م / شهر</span>
                                            <div className="text-xs text-slate-400 mt-0.5">≈ ${plan.priceUSD} USD</div>
                                        </>
                                    )}
                                </div>

                                <ul className="space-y-2.5 mb-6 flex-1">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className={`flex items-start gap-2 text-sm text-slate-700 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                            <Check className="text-emerald-500 mt-0.5 shrink-0" size={16} />
                                            <span>{f}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleUpgrade(plan)}
                                    disabled={isCurrent || isLoadingThis}
                                    className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all ${
                                        isCurrent
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            : `bg-gradient-to-r ${plan.gradient} text-white shadow-lg hover:-translate-y-0.5 disabled:opacity-60`
                                    }`}
                                >
                                    {isLoadingThis ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 className="animate-spin" size={16} />
                                            جارٍ التحويل...
                                        </span>
                                    ) : isCurrent ? (
                                        'الخطة الحالية'
                                    ) : plan.id === 'free' ? (
                                        'تواصل مع الدعم'
                                    ) : (
                                        'ترقية الآن'
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs text-slate-500 leading-relaxed">
                    💳 الدفع يتم بشكل آمن عبر PayPal. تتم الترقية تلقائياً بعد إتمام الدفع. للتراجع عن الاشتراك أو الانتقال إلى خطة أقل، تواصل مع الدعم.
                </p>
            </div>
        </div>
    );
};

export default SubscriptionPage;
