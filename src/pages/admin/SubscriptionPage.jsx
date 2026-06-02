import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import { Check, Loader2, Crown, Zap, Star, Sparkles, AlertCircle, Shield, Users, UserCog, Dumbbell, Calendar, CreditCard } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../components/Toast';

// SaaS platform plans — fetched display only, NOT editable by academy admin
const SAAS_PLANS = [
    {
        id: 'free',
        nameAr: 'مجاني',
        nameFr: 'Gratuit',
        nameEn: 'Free',
        price: 0,
        priceUSD: 0,
        icon: Zap,
        gradient: 'from-slate-500 to-slate-700',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-600',
        limits: { players: 15, admins: 1, coaches: 1 },
        features: {
            ar: ['15 لاعب كحد أقصى', 'مدير واحد', 'مدرب واحد', 'الوظائف الأساسية'],
            fr: ['15 joueurs max', '1 administrateur', '1 entraîneur', 'Fonctions de base'],
            en: ['15 players max', '1 admin', '1 coach', 'Basic features'],
        },
    },
    {
        id: 'pro',
        nameAr: 'احترافية',
        nameFr: 'Pro',
        nameEn: 'Pro',
        price: 499,
        priceUSD: 49,
        icon: Star,
        gradient: 'from-blue-500 to-cyan-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-600',
        popular: true,
        limits: { players: 100, admins: 4, coaches: 10 },
        features: {
            ar: ['100 لاعب', '4 إداريين', '10 مدربين', 'تقارير متقدمة', 'دعم بالأولوية'],
            fr: ['100 joueurs', '4 administrateurs', '10 entraîneurs', 'Rapports avancés', 'Support prioritaire'],
            en: ['100 players', '4 admins', '10 coaches', 'Advanced reports', 'Priority support'],
        },
    },
    {
        id: 'enterprise',
        nameAr: 'متطورة',
        nameFr: 'Enterprise',
        nameEn: 'Enterprise',
        price: 999,
        priceUSD: 99,
        icon: Crown,
        gradient: 'from-violet-500 to-purple-600',
        bg: 'bg-violet-50',
        border: 'border-violet-200',
        text: 'text-violet-600',
        limits: { players: -1, admins: -1, coaches: -1 },
        features: {
            ar: ['لاعبون غير محدودين', 'إداريون غير محدودين', 'مدربون غير محدودون', '🏢 إدارة الفروع', 'مسؤولون مساعدون', 'دعم مخصص 24/7'],
            fr: ['Joueurs illimités', 'Admins illimités', 'Coachs illimités', '🏢 Gestion des branches', 'Sous-admins', 'Support dédié 24/7'],
            en: ['Unlimited players', 'Unlimited admins', 'Unlimited coaches', '🏢 Branch management', 'Sub-admins', 'Dedicated support 24/7'],
        },
    },
];

const SubscriptionPage = () => {
    const { isRTL, dir, language } = useLanguage();
    const toast = useToast();
    const [planInfo, setPlanInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [upgradingPlan, setUpgradingPlan] = useState(null);
    const [paymentResult, setPaymentResult] = useState(null);
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

    const lang = language === 'ar' ? 'ar' : language === 'fr' ? 'fr' : 'en';
    const formatLimit = (v) => v === -1 ? '∞' : v;

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
                        toast.success(lang === 'ar' ? 'تمت الترقية بنجاح!' : 'Mise à niveau réussie!');
                        fetchPlan();
                    } else {
                        setPaymentResult('error');
                        toast.error(lang === 'ar' ? 'فشلت عملية الترقية' : 'Échec de la mise à niveau');
                    }
                })
                .catch(() => { setPaymentResult('error'); toast.error('Payment error'); });
            window.history.replaceState({}, '', '/admin/subscription');
        } else if (payment === 'cancelled') {
            setPaymentResult('cancelled');
            toast.error(lang === 'ar' ? 'تم إلغاء عملية الدفع' : 'Paiement annulé');
            window.history.replaceState({}, '', '/admin/subscription');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUpgrade = async (plan) => {
        if (!planInfo?.academy_id) {
            toast.error(lang === 'ar' ? 'تعذر تحديد الأكاديمية' : 'Academy not found');
            return;
        }
        if (plan.id === planInfo.plan_id) return;
        if (plan.id === 'free') {
            toast.info(lang === 'ar' ? 'للنزول إلى الخطة المجانية، تواصل مع الدعم' : 'Contact support to downgrade');
            return;
        }
        setUpgradingPlan(plan.id);
        const yearlyPrice = plan.price * 10;
        const amount = billingCycle === 'yearly' ? yearlyPrice : plan.priceUSD;
        try {
            const res = await authFetch(`${API_URL}/payments/gateway/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academy_id: planInfo.academy_id,
                    plan_id: plan.id,
                    billing_cycle_type: billingCycle,
                    amount,
                    currency: 'USD',
                    description: `${plan.nameEn} Plan — ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} (${billingCycle === 'yearly' ? yearlyPrice : plan.price} MAD)`,
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
            throw new Error(err.detail || 'Payment failed');
        } catch (e) {
            toast.error(e.message || 'Connection error');
        } finally {
            setUpgradingPlan(null);
        }
    };

    const currentPlanId = planInfo?.plan_id || 'free';
    const currentPlan = SAAS_PLANS.find(p => p.id === currentPlanId) || SAAS_PLANS[0];

    const t = {
        ar: {
            title: 'اشتراك المنصة',
            subtitle: 'خطة أكاديميتك في منصة SaaS',
            description: 'هذه هي خطة اشتراك أكاديميتك في المنصة. ليست عروض اللاعبين.',
            currentPlan: 'خطتك الحالية',
            popular: 'الأكثر شعبية',
            month: '/ شهر',
            year: '/ سنة',
            upgrade: 'ترقية الآن',
            current: 'الخطة الحالية',
            contactSupport: 'تواصل مع الدعم',
            note: '💳 الدفع يتم بشكل آمن عبر PayPal. الترقية تتم فوراً بعد الدفع. للتراجع عن الاشتراك تواصل مع الدعم.',
            capturing: 'جارٍ تأكيد الدفع...',
            cancelled: 'تم إلغاء عملية الدفع.',
            free: 'مجاني',
            usageTitle: 'استهلاك الحدود',
            players: 'لاعبين',
            admins: 'إداريين',
            coaches: 'مدربين',
            warning: '⚠️ هذه خطط المنصة وليست عروض اللاعبين. لإدارة عروض اللاعبين، اذهب إلى الإعدادات.',
        },
        fr: {
            title: 'Abonnement Plateforme',
            subtitle: "Le plan de votre académie sur la plateforme SaaS",
            description: "C'est le plan d'abonnement de votre académie. Ce ne sont PAS les offres des joueurs.",
            currentPlan: 'Plan actuel',
            popular: 'Le plus populaire',
            month: '/ mois',
            year: '/ an',
            upgrade: 'Passer au supérieur',
            current: 'Plan actuel',
            contactSupport: 'Contacter le support',
            note: '💳 Le paiement est sécurisé via PayPal. La mise à niveau est instantanée.',
            capturing: 'Confirmation du paiement...',
            cancelled: 'Paiement annulé.',
            free: 'Gratuit',
            usageTitle: 'Utilisation des limites',
            players: 'joueurs',
            admins: 'admins',
            coaches: 'coachs',
            warning: '⚠️ Ce sont les plans de la plateforme, PAS les offres des joueurs. Pour gérer les offres joueurs, allez dans les Paramètres.',
        },
        en: {
            title: 'Platform Subscription',
            subtitle: "Your academy's plan on the SaaS platform",
            description: "This is your academy's platform subscription. These are NOT player plans.",
            currentPlan: 'Current Plan',
            popular: 'Most Popular',
            month: '/ month',
            year: '/ year',
            upgrade: 'Upgrade Now',
            current: 'Current Plan',
            contactSupport: 'Contact Support',
            note: '💳 Payments are processed securely via PayPal. Upgrade is instant after payment.',
            capturing: 'Confirming payment...',
            cancelled: 'Payment was cancelled.',
            free: 'Free',
            usageTitle: 'Usage Limits',
            players: 'players',
            admins: 'admins',
            coaches: 'coaches',
            warning: '⚠️ These are PLATFORM plans, NOT player subscription offers. To manage player offers, go to Settings.',
        },
    }[lang];

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in" dir={dir}>
            {/* Header */}
            <div className={`mb-8 ${isRTL ? 'text-right' : 'text-left'}`}>
                <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                    <Sparkles className="text-violet-600" size={32} />
                    {t.title}
                </h1>
                <p className="text-slate-500 mt-2">{t.subtitle}</p>
            </div>

            {/* Suspended Banner */}
            {planInfo?.status === 'suspended' && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="text-red-600 shrink-0" size={24} />
                    <div>
                        <p className="font-black text-red-900 text-sm">
                            {lang === 'ar' ? '⛔ أكاديميتك موقوفة' : lang === 'fr' ? '⛔ Votre académie est suspendue' : '⛔ Your academy is suspended'}
                        </p>
                        <p className="text-xs text-red-700 mt-0.5">
                            {lang === 'ar' ? 'تجديد اشتراكك لاستعادة الوصول الكامل.' : lang === 'fr' ? 'Renouvelez votre abonnement pour restaurer l\'accès complet.' : 'Renew your subscription to restore full access.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Warning: this is NOT player plans */}
            <div className={`mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                <span className="font-bold text-amber-900 text-sm">{t.warning}</span>
            </div>

            {paymentResult === 'capturing' && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
                    <Loader2 className="animate-spin text-blue-600" />
                    <span className="font-bold text-blue-900">{t.capturing}</span>
                </div>
            )}
            {paymentResult === 'cancelled' && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="text-amber-600" />
                    <span className="font-bold text-amber-900">{t.cancelled}</span>
                </div>
            )}

            {/* Current Plan Summary */}
            {!loading && (
                <div className={`mb-8 p-6 bg-gradient-to-br ${currentPlan.gradient} rounded-3xl text-white shadow-xl relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className={`flex items-center gap-4 relative z-10 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                        <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                            <Shield size={28} />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">{t.currentPlan}</div>
                            <div className="text-2xl font-black">{currentPlan[`name${lang.charAt(0).toUpperCase() + lang.slice(1)}`]}</div>
                        </div>
                        <div className={`${isRTL ? 'mr-auto' : 'ml-auto'} text-right`}>
                            <div className="text-3xl font-black">
                                {currentPlan.price === 0 ? t.free : `${currentPlan.price} MAD`}
                            </div>
                            {currentPlan.price > 0 && <div className="text-xs text-white/60">{t.month}</div>}
                            {/* Show subscription end date if available */}
                            {planInfo?.billing_cycle_end && currentPlan.price > 0 && (
                                <div className="mt-1 text-[10px] font-bold text-white/70 flex items-center gap-1 justify-end">
                                    <Calendar size={10} />
                                    {lang === 'ar' ? 'ينتهي:' : lang === 'fr' ? 'Expire:' : 'Renews:'}{' '}
                                    {new Date(planInfo.billing_cycle_end).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Limits */}
                    <div className={`mt-4 grid grid-cols-3 gap-3 relative z-10`}>
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                            <Users size={16} className="mx-auto mb-1 text-white/80" />
                            <div className="text-xs text-white/60">{t.players}</div>
                            <div className="text-lg font-black">{formatLimit(currentPlan.limits.players)}</div>
                        </div>
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                            <UserCog size={16} className="mx-auto mb-1 text-white/80" />
                            <div className="text-xs text-white/60">{t.admins}</div>
                            <div className="text-lg font-black">{formatLimit(currentPlan.limits.admins)}</div>
                        </div>
                        <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                            <Dumbbell size={16} className="mx-auto mb-1 text-white/80" />
                            <div className="text-xs text-white/60">{t.coaches}</div>
                            <div className="text-lg font-black">{formatLimit(currentPlan.limits.coaches)}</div>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-violet-600" size={40} />
                </div>
            ) : (
                <>
                    {/* Billing Cycle Toggle */}
                    <div className="flex justify-center mb-8">
                        <div className="flex items-center gap-1 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                                    billingCycle === 'monthly'
                                        ? 'bg-white text-slate-900 shadow-md border border-slate-200'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {lang === 'ar' ? 'شهري' : lang === 'fr' ? 'Mensuel' : 'Monthly'}
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
                                    billingCycle === 'yearly'
                                        ? 'bg-white text-slate-900 shadow-md border border-slate-200'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {lang === 'ar' ? 'سنوي' : lang === 'fr' ? 'Annuel' : 'Yearly'}
                                <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                                    {lang === 'ar' ? 'وفر 17%' : lang === 'fr' ? '-17%' : 'Save 17%'}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                    {SAAS_PLANS.map(plan => {
                        const Icon = plan.icon;
                        const isCurrent = plan.id === currentPlanId;
                        const isLoadingThis = upgradingPlan === plan.id;
                        const planName = plan[`name${lang.charAt(0).toUpperCase() + lang.slice(1)}`];
                        const features = plan.features[lang] || plan.features.en;
                        const monthlyMAD = plan.price;
                        const yearlyMAD = plan.price * 10;
                        const displayMAD = billingCycle === 'yearly' ? yearlyMAD : monthlyMAD;
                        const displayUSD = billingCycle === 'yearly' ? plan.priceUSD * 10 : plan.priceUSD;

                        return (
                            <div
                                key={plan.id}
                                className={`relative bg-white rounded-3xl border-2 ${
                                    isCurrent
                                        ? 'border-violet-500 shadow-xl shadow-violet-100'
                                        : 'border-slate-100 hover:border-slate-200'
                                } p-6 flex flex-col transition-all hover:-translate-y-1`}
                            >
                                {plan.popular && !isCurrent && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-black px-3 py-1 rounded-full shadow">
                                        {t.popular}
                                    </div>
                                )}
                                {isCurrent && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-black px-3 py-1 rounded-full shadow">
                                        {t.currentPlan}
                                    </div>
                                )}

                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg mb-4`}>
                                    <Icon className="text-white" size={28} />
                                </div>

                                <h3 className="text-2xl font-black text-slate-900 mb-1">{planName}</h3>

                                <div className="mb-3">
                                    {plan.price === 0 ? (
                                        <span className="text-3xl font-black text-slate-900">{t.free}</span>
                                    ) : (
                                        <>
                                            <span className="text-3xl font-black text-slate-900">{displayMAD}</span>
                                            <span className="text-slate-500 mr-1"> MAD{billingCycle === 'yearly' ? t.year : t.month}</span>
                                            <div className="text-xs text-slate-400 mt-0.5">≈ ${displayUSD} USD</div>
                                            {billingCycle === 'yearly' && plan.price > 0 && (
                                                <div className="mt-1 text-[10px] font-black text-emerald-600">
                                                    {lang === 'ar' ? '🎁 شهرين مجاناً!' : lang === 'fr' ? '🎁 2 mois offerts !' : '🎁 2 months free!'}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Limits badges */}
                                <div className={`grid grid-cols-3 gap-1 p-2 ${plan.bg} rounded-xl border ${plan.border} mb-4`}>
                                    <div className="text-center">
                                        <Users className={`w-3 h-3 ${plan.text} mx-auto mb-0.5`} />
                                        <p className="text-[8px] text-slate-500 font-bold uppercase">{t.players}</p>
                                        <p className={`text-sm font-black ${plan.text}`}>{formatLimit(plan.limits.players)}</p>
                                    </div>
                                    <div className="text-center">
                                        <UserCog className={`w-3 h-3 ${plan.text} mx-auto mb-0.5`} />
                                        <p className="text-[8px] text-slate-500 font-bold uppercase">{t.admins}</p>
                                        <p className={`text-sm font-black ${plan.text}`}>{formatLimit(plan.limits.admins)}</p>
                                    </div>
                                    <div className="text-center">
                                        <Dumbbell className={`w-3 h-3 ${plan.text} mx-auto mb-0.5`} />
                                        <p className="text-[8px] text-slate-500 font-bold uppercase">{t.coaches}</p>
                                        <p className={`text-sm font-black ${plan.text}`}>{formatLimit(plan.limits.coaches)}</p>
                                    </div>
                                </div>

                                <ul className="space-y-2.5 mb-6 flex-1">
                                    {features.map((f, i) => (
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
                                            {lang === 'ar' ? 'جارٍ التحويل...' : 'Processing...'}
                                        </span>
                                    ) : isCurrent ? (
                                        t.current
                                    ) : plan.id === 'free' ? (
                                        t.contactSupport
                                    ) : (
                                        t.upgrade
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
                </>
            )}

            <div className={`mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-100 ${isRTL ? 'text-right' : ''}`}>
                <p className="text-xs text-slate-500 leading-relaxed">
                    {t.note}
                </p>
            </div>
        </div>
    );
};

export default SubscriptionPage;
