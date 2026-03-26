import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronRight, Star, Users, Phone, MapPin, Instagram,
    X, Shield, Trophy, Target, Heart, Facebook, Mail,
    Sparkles, ArrowRight, Check, Zap, Globe, Loader2
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const LandingPage = () => {
    const navigate = useNavigate();
    const { t, isRTL, dir, lang } = useLanguage();
    const [isRegModalOpen, setIsRegModalOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Contact Form State
    const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
    const [contactStatus, setContactStatus] = useState(null);

    // Registration Form State
    const [regForm, setRegForm] = useState({ name: '', player_name: '', phone: '', birth_date: '', address: '', plan_name: '' });
    const [regStatus, setRegStatus] = useState(null);
    const [regError, setRegError] = useState(null);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [landingPlans, setLandingPlans] = useState([]);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        fetch(`${API_URL}/plans/public`)
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                const sorted = [...data].sort((a, b) => {
                    const aIsFree = a.billing_cycles?.includes('free');
                    const bIsFree = b.billing_cycles?.includes('free');
                    if (aIsFree && !bIsFree) return 1;
                    if (!aIsFree && bIsFree) return -1;
                    return (a.sort_order ?? 99) - (b.sort_order ?? 99);
                });
                setLandingPlans(sorted);
            })
            .catch(() => { });
    }, []);

    const openRegModal = (planName = '') => {
        setRegForm(prev => ({ ...prev, plan_name: planName }));
        setRegStatus(null);
        setRegError(null);
        setGoogleLoading(false);
        setIsRegModalOpen(true);
    };

    const handleGoogleSignup = async () => {
        setGoogleLoading(true);
        try {
            const redirectTo = `${window.location.origin}/auth/callback`;
            const oauthUrl = `https://kbhnqntteexatihidhkn.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
            window.location.href = oauthUrl;
        } catch {
            setGoogleLoading(false);
            setRegError(isRTL ? 'فشل الاتصال بـ Google' : 'Connexion Google échouée');
        }
    };

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        setContactStatus('loading');
        try {
            const res = await fetch(`${API_URL}/public/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'contact', ...contactForm })
            });
            if (res.ok) {
                setContactStatus('success');
                setContactForm({ name: '', email: '', message: '' });
                setTimeout(() => setContactStatus(null), 4000);
            } else {
                setContactStatus('error');
            }
        } catch {
            setContactStatus('error');
        }
    };

    const handleRegSubmit = async (e) => {
        e.preventDefault();
        setRegStatus('loading');
        try {
            const res = await fetch(`${API_URL}/public/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'registration', ...regForm })
            });
            if (res.ok) {
                setRegStatus('success');
                setRegForm({ name: '', player_name: '', phone: '', birth_date: '', address: '', plan_name: '' });
                setTimeout(() => { setRegStatus(null); setIsRegModalOpen(false); }, 5000);
            } else {
                setRegStatus('error');
                const errData = await res.json().catch(() => ({}));
                setRegError(errData.detail || t('landing.regSubtitle'));
            }
        } catch {
            setRegStatus('error');
            setRegError(lang === 'ar' ? 'فشل الاتصال بالخادم' : 'Erreur de connexion au serveur');
        }
    };

    const planColorStyles = {
        gold:   { accent: '#f59e0b', glow: 'rgba(245,158,11,0.2)', featured: true  },
        silver: { accent: '#818cf8', glow: 'rgba(129,140,248,0.2)', featured: false },
        bronze: { accent: '#94a3b8', glow: 'rgba(148,163,184,0.2)', featured: false },
        blue:   { accent: '#06b6d4', glow: 'rgba(6,182,212,0.2)',   featured: false },
        free:   { accent: '#10b981', glow: 'rgba(16,185,129,0.2)',   featured: false },
    };

    const features = [
        { icon: Target, title: t('landing.proTraining'), desc: t('landing.proTrainingDesc'), color: '#4f46e5', bg: 'rgba(79,70,229,0.08)' },
        { icon: Trophy, title: t('landing.tournaments'), desc: t('landing.tournamentsDesc'), color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
        { icon: Shield, title: t('landing.insurance'),   desc: t('landing.insuranceDesc'),   color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
        { icon: Heart,  title: t('landing.monitoring'),  desc: t('landing.monitoringDesc'),  color: '#ec4899', bg: 'rgba(236,72,153,0.08)' },
    ];

    return (
        <div className="min-h-screen overflow-x-hidden" dir={dir}
            style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif", background: '#f8fafc' }}>

            {/* ─── NAVBAR ─── */}
            <nav
                className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
                style={{
                    background: isScrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
                    backdropFilter: isScrolled ? 'blur(20px)' : 'none',
                    borderBottom: isScrolled ? '1px solid rgba(148,163,184,0.12)' : 'none',
                    boxShadow: isScrolled ? '0 4px 24px rgba(0,0,0,0.06)' : 'none',
                }}
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div className={`flex items-center gap-2.5 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`} onClick={() => window.scrollTo(0,0)}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm"
                            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}>
                            FA
                        </div>
                        <span className={`font-black text-base ${isScrolled ? 'text-slate-900' : 'text-white'}`} style={{ letterSpacing: '-0.01em' }}>
                            Football Academy
                        </span>
                    </div>

                    {/* Desktop nav links */}
                    <div className={`hidden md:flex items-center gap-7 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {[
                            { href: '#features', label: t('landing.services') },
                            { href: '#pricing',  label: t('landing.pricing')  },
                            { href: '#contact',  label: t('landing.contact')  },
                        ].map(link => (
                            <a key={link.href} href={link.href}
                                className={`text-sm font-700 transition-colors ${isScrolled ? 'text-slate-500 hover:text-indigo-600' : 'text-white/70 hover:text-white'}`}
                                style={{ fontWeight: 600 }}>
                                {link.label}
                            </a>
                        ))}
                    </div>

                    {/* Nav Actions */}
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <LanguageSwitcher />
                        <button
                            onClick={() => navigate('/login')}
                            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                            style={{
                                color: isScrolled ? '#475569' : 'rgba(255,255,255,0.8)',
                                border: `1.5px solid ${isScrolled ? 'rgba(148,163,184,0.3)' : 'rgba(255,255,255,0.15)'}`,
                            }}
                        >
                            {t('landing.login')}
                        </button>
                        <button
                            onClick={() => openRegModal('')}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black text-white transition-all"
                            style={{
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                            }}
                        >
                            {t('landing.joinUs')}
                        </button>
                    </div>
                </div>
            </nav>

            {/* ─── HERO ─── */}
            <header
                className="relative min-h-screen flex items-center"
                style={{
                    background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #1a0533 100%)',
                    overflow: 'hidden',
                }}
            >
                {/* Background mesh */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full opacity-20 blur-[100px]"
                        style={{ background: 'radial-gradient(circle, #4f46e5, transparent)' }} />
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-[80px]"
                        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-[60px]"
                        style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />
                    {/* Grid pattern */}
                    <div className="absolute inset-0 opacity-5"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                            backgroundSize: '60px 60px'
                        }} />
                </div>

                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center pt-24 pb-16 w-full">
                    {/* Season badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8 animate-fade-in"
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-glow-pulse" />
                        {t('landing.seasonText')}
                    </div>

                    {/* Hero Title */}
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6 animate-fade-in delay-100"
                        style={{ letterSpacing: '-0.03em' }}>
                        {t('landing.heroTitle')}<br />
                        <span style={{
                            background: 'linear-gradient(135deg, #818cf8, #c084fc, #f59e0b)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}>
                            {t('landing.heroHighlight')}
                        </span>
                    </h1>

                    <p className="text-base sm:text-lg text-white/55 max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-in delay-200">
                        {t('landing.heroSubtitle')}
                    </p>

                    {/* CTA Buttons */}
                    <div className={`flex flex-wrap justify-center gap-4 animate-fade-in delay-300 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button
                            onClick={() => openRegModal('')}
                            className={`flex items-center gap-2.5 px-7 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95 ${isRTL ? 'flex-row-reverse' : ''}`}
                            style={{
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                boxShadow: '0 8px 32px rgba(79,70,229,0.4)',
                            }}
                        >
                            <Sparkles size={18} />
                            {t('landing.registerNow')}
                        </button>
                        <a
                            href="#contact"
                            className={`flex items-center gap-2.5 px-7 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-white/10 ${isRTL ? 'flex-row-reverse' : ''}`}
                            style={{ color: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(255,255,255,0.15)' }}
                        >
                            {t('landing.contact')}
                        </a>
                    </div>

                    {/* Stats Bar */}
                    <div className={`mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto animate-fade-in delay-400`}>
                        {[
                            { number: '+500', label: t('landing.statsPlayers') },
                            { number: '+25',  label: t('landing.statsCoaches') },
                            { number: '+10',  label: t('landing.statsExperience') },
                            { number: '98%',  label: t('landing.statsSatisfaction') },
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-2xl sm:text-3xl font-black text-white mb-1"
                                    style={{
                                        background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                    }}>
                                    {stat.number}
                                </div>
                                <div className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom wave */}
                <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{
                    background: 'linear-gradient(to top, #f8fafc, transparent)'
                }} />
            </header>

            {/* ─── FEATURES ─── */}
            <section id="features" className="py-24 px-4">
                <div className="max-w-5xl mx-auto">
                    {/* Section Label */}
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-4"
                            style={{ background: 'rgba(79,70,229,0.08)', color: '#4f46e5' }}>
                            {t('landing.whyUs')}
                        </span>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4" style={{ letterSpacing: '-0.025em' }}>
                            {t('landing.bestOffer')}
                        </h2>
                        <p className="text-slate-500 max-w-xl mx-auto font-medium leading-relaxed">
                            {t('landing.featuresDesc')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((f, i) => {
                            const Icon = f.icon;
                            return (
                                <div key={i}
                                    className="group p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default animate-fade-in"
                                    style={{
                                        background: 'white',
                                        border: '1px solid rgba(148,163,184,0.12)',
                                        animationDelay: `${i * 0.1}s`
                                    }}>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                                        style={{ background: f.bg }}>
                                        <Icon size={22} style={{ color: f.color }} />
                                    </div>
                                    <h3 className="font-black text-slate-900 mb-2 text-[15px]">{f.title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium">{f.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── PRICING ─── */}
            <section id="pricing" className="py-24 px-4" style={{ background: 'linear-gradient(180deg, white 0%, #f0f4ff 100%)' }}>
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-4"
                            style={{ background: 'rgba(79,70,229,0.08)', color: '#4f46e5' }}>
                            {t('landing.packages')}
                        </span>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4" style={{ letterSpacing: '-0.025em' }}>
                            {lang === 'ar' ? 'باقات' : ''} <span style={{
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}>{lang === 'ar' ? 'الاشتراك' : t('landing.packages')}</span>
                        </h2>
                        <p className="text-slate-500 max-w-xl mx-auto font-medium">{t('landing.packagesSubtitle')}</p>
                    </div>

                    <div className={`grid gap-6 ${landingPlans.length > 0 ? `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(landingPlans.length, 3)}` : 'grid-cols-1 sm:grid-cols-3'}`}>
                        {(landingPlans.length > 0 ? landingPlans : [
                            { id: 1, name: lang === 'ar' ? 'النحاسي' : 'Bronze', color: 'bronze', annual_price: 1600, monthly_price: 150, billing_cycles: ['annual', 'monthly'], features: [lang === 'ar' ? 'حصص تدريبية أسبوعية' : 'Weekly sessions', lang === 'ar' ? 'قميص تدريب مجاني' : 'Free kit', lang === 'ar' ? 'تأمين شامل' : 'Full insurance'] },
                            { id: 2, name: lang === 'ar' ? 'الفضي' : 'Silver', color: 'silver', annual_price: 2000, monthly_price: 200, billing_cycles: ['annual', 'monthly'], features: [lang === 'ar' ? 'كل ميزات النحاسي' : 'All Bronze', lang === 'ar' ? 'قميص مباريات' : 'Match kit', lang === 'ar' ? 'المشاركة في البطولات' : 'Tournaments'] },
                            { id: 3, name: lang === 'ar' ? 'الذهبي' : 'Gold', color: 'gold', annual_price: 2900, monthly_price: 260, billing_cycles: ['annual', 'monthly'], features: [lang === 'ar' ? 'جميع ميزات الفضي' : 'All Silver', lang === 'ar' ? 'ملابس حصرية' : 'Exclusive gear', lang === 'ar' ? 'Golden challenges' : 'Golden challenges'] },
                        ]).map((plan, index) => {
                            const midIndex = Math.floor((landingPlans.length - 1) / 2);
                            const isFeatured = landingPlans.length > 0
                                ? (index === midIndex && !plan.billing_cycles?.includes('free'))
                                : plan.color === 'gold' || plan.color === 'silver';
                            const isFree = plan.billing_cycles?.includes('free');
                            const styles = planColorStyles[plan.color] || planColorStyles.bronze;

                            return (
                                <div key={plan.id}
                                    className="relative rounded-2xl p-6 flex flex-col transition-all duration-300 hover:-translate-y-1"
                                    style={{
                                        background: 'white',
                                        border: isFeatured ? `2px solid ${styles.accent}` : '1px solid rgba(148,163,184,0.15)',
                                        boxShadow: isFeatured ? `0 16px 48px ${styles.glow}` : '0 4px 16px rgba(0,0,0,0.05)',
                                    }}>
                                    {isFeatured && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white"
                                            style={{ background: `linear-gradient(135deg, ${styles.accent}, #7c3aed)` }}>
                                            ⭐ {t('landing.popular')}
                                        </div>
                                    )}
                                    {isFree && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white"
                                            style={{ background: '#10b981' }}>
                                            🎁 {t('landing.freeLabel')}
                                        </div>
                                    )}

                                    {/* Plan name */}
                                    <div className="mb-5">
                                        <span className="inline-block text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg mb-3"
                                            style={{ background: `${styles.glow}25`, color: styles.accent, border: `1px solid ${styles.accent}25` }}>
                                            {plan.name}
                                        </span>
                                        {isFree ? (
                                            <div>
                                                <div className="text-4xl font-black text-slate-900">{t('landing.freeLabel')}</div>
                                                <div className="text-sm text-slate-400 font-medium mt-1">{t('landing.freeBadge')}</div>
                                            </div>
                                        ) : plan.billing_cycles?.includes('annual') && plan.annual_price ? (
                                            <div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-4xl font-black text-slate-900">{plan.annual_price}</span>
                                                    <span className="text-sm font-semibold text-slate-400">{t('landing.perYear')}</span>
                                                </div>
                                                {plan.billing_cycles?.includes('monthly') && plan.monthly_price && (
                                                    <div className="text-sm text-slate-400 font-medium mt-1">
                                                        {t('landing.orPerMonth').replace('{amount}', plan.monthly_price)}
                                                    </div>
                                                )}
                                            </div>
                                        ) : plan.billing_cycles?.includes('monthly') && plan.monthly_price ? (
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-black text-slate-900">{plan.monthly_price}</span>
                                                <span className="text-sm font-semibold text-slate-400">{t('landing.perMonth')}</span>
                                            </div>
                                        ) : (
                                            <div className="text-3xl font-black text-slate-900">{t('landing.freeLabel')}</div>
                                        )}
                                    </div>

                                    {/* Features */}
                                    {plan.features?.length > 0 && (
                                        <ul className="space-y-3 mb-8 flex-1">
                                            {plan.features.map((f, fi) => (
                                                <li key={fi} className={`flex items-center gap-3 text-sm font-medium text-slate-600 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                                        style={{ background: `${styles.glow}40`, color: styles.accent }}>
                                                        <Check size={12} strokeWidth={3} />
                                                    </span>
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {/* CTA */}
                                    <button
                                        onClick={() => openRegModal(plan.name)}
                                        className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${isRTL ? 'flex flex-row-reverse' : 'flex'} items-center justify-center gap-2`}
                                        style={{
                                            background: isFeatured
                                                ? `linear-gradient(135deg, ${styles.accent}, #7c3aed)`
                                                : 'transparent',
                                            color: isFeatured ? 'white' : styles.accent,
                                            border: isFeatured ? 'none' : `2px solid ${styles.accent}40`,
                                            boxShadow: isFeatured ? `0 8px 24px ${styles.glow}` : 'none',
                                        }}
                                    >
                                        {isFree ? t('landing.joinFree') : t('landing.choosePackage').replace('{name}', plan.name)}
                                        <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── CONTACT ─── */}
            <section id="contact" className="py-24 px-4" style={{ background: '#f8fafc' }}>
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-4"
                            style={{ background: 'rgba(79,70,229,0.08)', color: '#4f46e5' }}>
                            {t('landing.contact')}
                        </span>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4" style={{ letterSpacing: '-0.025em' }}>
                            {t('landing.contactTitle')}
                        </h2>
                        <p className="text-slate-500 max-w-xl mx-auto font-medium">{t('landing.contactSubtitle')}</p>
                    </div>

                    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 ${isRTL ? 'direction-rtl' : ''}`}>
                        {/* Contact Info */}
                        <div className="space-y-6">
                            {[
                                { icon: MapPin,  color: '#4f46e5', label: t('landing.address')           },
                                { icon: Phone,   color: '#10b981', label: '+212 600-000000'               },
                                { icon: Mail,    color: '#f59e0b', label: 'info@football-academy.ma'      },
                            ].map((item, i) => {
                                const Icon = item.icon;
                                return (
                                    <div key={i} className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ background: `${item.color}12`, color: item.color }}>
                                            <Icon size={20} />
                                        </div>
                                        <span className="text-slate-700 font-semibold text-sm">{item.label}</span>
                                    </div>
                                );
                            })}
                            <div className={`flex gap-3 pt-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                {[Instagram, Facebook].map((Icon, i) => (
                                    <button key={i} className="w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110"
                                        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                                        <Icon size={18} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="rounded-2xl p-6 sm:p-8"
                            style={{ background: 'white', border: '1px solid rgba(148,163,184,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
                            <form onSubmit={handleContactSubmit} className="space-y-4">
                                <input
                                    type="text" required
                                    placeholder={t('landing.placeholderName')}
                                    value={contactForm.name}
                                    onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                                    style={{ background: '#f8fafc', border: '1.5px solid rgba(148,163,184,0.2)', color: '#0f172a' }}
                                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(148,163,184,0.2)'}
                                />
                                <input
                                    type="email" required
                                    placeholder={t('landing.placeholderEmail')}
                                    value={contactForm.email}
                                    onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                                    style={{ background: '#f8fafc', border: '1.5px solid rgba(148,163,184,0.2)', color: '#0f172a' }}
                                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(148,163,184,0.2)'}
                                />
                                <textarea
                                    required rows="4"
                                    placeholder={t('landing.placeholderMessage')}
                                    value={contactForm.message}
                                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all resize-none"
                                    style={{ background: '#f8fafc', border: '1.5px solid rgba(148,163,184,0.2)', color: '#0f172a' }}
                                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(148,163,184,0.2)'}
                                />

                                {contactStatus === 'success' && (
                                    <div className="p-3 rounded-xl text-sm font-bold animate-fade-in"
                                        style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}>
                                        {t('landing.sendSuccess')}
                                    </div>
                                )}
                                {contactStatus === 'error' && (
                                    <div className="p-3 rounded-xl text-sm font-bold animate-fade-in"
                                        style={{ background: 'rgba(239,68,68,0.06)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.15)' }}>
                                        {lang === 'ar' ? 'حدث خطأ. حاول مجددا.' : 'Une erreur est survenue. Réessayez.'}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={contactStatus === 'loading'}
                                    className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                                    style={{
                                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                        boxShadow: '0 4px 16px rgba(79,70,229,0.3)',
                                        opacity: contactStatus === 'loading' ? 0.7 : 1
                                    }}
                                >
                                    {contactStatus === 'loading' ? t('landing.sending') : t('landing.sendMessage')}
                                    <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── FOOTER ─── */}
            <footer style={{ background: '#0f0c29', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="max-w-5xl mx-auto px-4 py-12">
                    <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div>
                            <div className={`flex items-center gap-2.5 mb-4 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs"
                                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>FA</div>
                                <span className="font-black text-white text-sm">Football Academy</span>
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                {t('landing.footerDesc')}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-black text-white text-xs uppercase tracking-widest mb-4">
                                {t('landing.quickLinks')}
                            </h4>
                            <ul className="space-y-2">
                                {[
                                    { href: '#features', label: t('landing.services') },
                                    { href: '#pricing',  label: t('landing.pricing')  },
                                    { href: '#contact',  label: t('landing.contact')  },
                                ].map(link => (
                                    <li key={link.href}>
                                        <a href={link.href} className="text-xs font-semibold transition-colors hover:text-indigo-400"
                                            style={{ color: 'rgba(255,255,255,0.4)' }}>
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-black text-white text-xs uppercase tracking-widest mb-4">
                                {t('landing.contact')}
                            </h4>
                            <ul className="space-y-2">
                                <li><a href="tel:+212600000000" className="text-xs font-semibold hover:text-indigo-400 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>+212 600-000000</a></li>
                                <li><a href="mailto:info@football-academy.ma" className="text-xs font-semibold hover:text-indigo-400 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>info@football-academy.ma</a></li>
                                <li><span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>{t('landing.address')}</span></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-6 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{t('landing.allRights')}</p>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <Globe size={12} style={{ color: 'rgba(255,255,255,0.25)' }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
                                {lang === 'ar' ? 'العربية' : lang === 'fr' ? 'Français' : 'English'}
                            </span>
                        </div>
                    </div>
                </div>
            </footer>

            {/* ─── REGISTRATION MODAL ─── */}
            {isRegModalOpen && (
                <div
                    className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
                    style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(8px)' }}
                    onClick={() => setIsRegModalOpen(false)}
                    dir={dir}
                >
                    <div
                        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[28px] p-8 animate-fade-in-scale"
                        style={{ background: 'white', boxShadow: '0 32px 80px rgba(0,0,0,0.2)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setIsRegModalOpen(false)}
                            className={`absolute top-5 ${isRTL ? 'left-5' : 'right-5'} p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all`}
                        >
                            <X size={18} />
                        </button>

                        {/* Modal Header */}
                        <div className={`mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                                <Sparkles size={20} className="text-white" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                {t('landing.regTitle')} {regForm.plan_name ? `(${regForm.plan_name})` : ''}
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 font-medium">{t('landing.regSubtitle')}</p>
                        </div>

                        {regStatus === 'success' ? (
                            <div className="text-center py-8 animate-fade-in">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'rgba(16,185,129,0.1)' }}>
                                    <Check size={32} style={{ color: '#10b981' }} />
                                </div>
                                <h4 className="text-lg font-black text-slate-900 mb-2">{t('landing.regSuccess')}</h4>
                                <p className="text-sm text-slate-500 font-medium">{t('landing.regSuccessDesc')}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleRegSubmit} className="space-y-4">
                                {[
                                    { key: 'name',        label: t('landing.parentLabel'), type: 'text',  placeholder: '' },
                                    { key: 'player_name', label: t('landing.playerLabel'), type: 'text',  placeholder: '' },
                                    { key: 'phone',       label: t('landing.phoneLabel'),  type: 'tel',   placeholder: '' },
                                    { key: 'birth_date',  label: t('landing.birthLabel'),  type: 'date',  placeholder: '' },
                                    { key: 'address',     label: t('landing.addressLabel'), type: 'text', placeholder: '' },
                                ].map(field => (
                                    <div key={field.key}>
                                        <label className={`block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            {field.label}
                                        </label>
                                        <input
                                            type={field.type}
                                            required
                                            value={regForm[field.key]}
                                            onChange={e => setRegForm({ ...regForm, [field.key]: e.target.value })}
                                            className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                                            style={{ background: '#f8fafc', border: '1.5px solid rgba(148,163,184,0.2)', color: '#0f172a' }}
                                            onFocus={e => e.target.style.borderColor = '#6366f1'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(148,163,184,0.2)'}
                                        />
                                    </div>
                                ))}

                                {regStatus === 'error' && (
                                    <div className="p-3 rounded-xl text-sm font-semibold animate-fade-in"
                                        style={{ background: 'rgba(239,68,68,0.06)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.15)' }}>
                                        ⚠️ {regError}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={regStatus === 'loading'}
                                    className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                                    style={{
                                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                        boxShadow: '0 4px 20px rgba(79,70,229,0.3)',
                                        opacity: regStatus === 'loading' ? 0.7 : 1,
                                    }}
                                >
                                    {regStatus === 'loading' ? t('landing.sending') : t('landing.confirmReg')}
                                </button>

                                {/* ── Divider ── */}
                                <div className="flex items-center gap-3 my-2">
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        {isRTL ? 'أو' : 'ou'}
                                    </span>
                                    <div className="flex-1 h-px bg-slate-200" />
                                </div>

                                {/* ── Google Sign-In ── */}
                                <button
                                    type="button"
                                    onClick={handleGoogleSignup}
                                    disabled={googleLoading}
                                    className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 ${isRTL ? 'flex-row-reverse' : ''}`}
                                    style={{
                                        background: '#f8fafc',
                                        border: '1.5px solid rgba(148,163,184,0.2)',
                                        color: '#334155',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.3)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.2)'; }}
                                >
                                    {googleLoading ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 48 48">
                                            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.6 2.4 30.1 0 24 0 14.7 0 6.7 5.4 2.9 13.3l7.9 6.1C12.5 13.2 17.8 9.5 24 9.5z"/>
                                            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.1z"/>
                                            <path fill="#FBBC05" d="M10.8 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C1 16.5 0 20.1 0 24s1 7.5 2.9 10.7l7.9-6.1z"/>
                                            <path fill="#34A853" d="M24 48c6.1 0 11.2-2 14.9-5.4l-7.6-5.9c-2 1.4-4.6 2.2-7.3 2.2-6.2 0-11.5-3.7-13.2-9l-7.9 6.1C6.7 42.6 14.7 48 24 48z"/>
                                        </svg>
                                    )}
                                    {isRTL ? 'التسجيل عبر حساب Google' : 'S\'inscrire via Google'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
