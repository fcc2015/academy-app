import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../components/Toast';
import { API_URL } from '../../config';
import {
    Check, ChevronRight, Star, Users, Phone, Mail, MapPin, Instagram, Facebook,
    Shield, Trophy, BarChart3, Zap, Globe, Crown, Clock, X, Menu,
    ArrowRight, CheckCircle2, Loader2, MessageSquare, FileText, RotateCcw,
    Lock, Headphones, TrendingUp, Layout, Database, Smartphone
} from 'lucide-react';

const PLANS = [
    {
        id: 'free', name: 'Free', price: 0, currency: 'MAD', period: '/mois',
        color: '#10b981', glow: 'rgba(16,185,129,0.15)',
        icon: '🎯',
        features: ["Jusqu'à 15 joueurs", "1 Admin", "1 Entraîneur", "Présences basiques", "Support email"],
        limits: { players: 15, admins: 1, coaches: 1 },
        cta: "Commencer Gratuitement",
        popular: false,
    },
    {
        id: 'pro', name: 'Pro', price: 499, currency: 'MAD', period: '/mois',
        color: '#6366f1', glow: 'rgba(99,102,241,0.2)',
        icon: '⭐',
        features: ["Jusqu'à 100 joueurs", "4 Admins", "10 Entraîneurs", "Évaluations complètes", "Rapports financiers", "Support prioritaire"],
        limits: { players: 100, admins: 4, coaches: 10 },
        cta: "Choisir Pro",
        popular: true,
    },
    {
        id: 'enterprise', name: 'Enterprise', price: 999, currency: 'MAD', period: '/mois',
        color: '#f59e0b', glow: 'rgba(245,158,11,0.15)',
        icon: '👑',
        features: ["Joueurs illimités", "Admins illimités", "Entraîneurs illimités", "Domaine personnalisé", "Analytics avancés", "Accès API", "Support 24/7"],
        limits: { players: -1, admins: -1, coaches: -1 },
        cta: "Choisir Enterprise",
        popular: false,
    },
];

const FEATURES = [
    { icon: Users, title: "Gestion des Joueurs", desc: "Profils complets, suivi médical, catégories d'âge et historique de performance de chaque joueur.", color: '#6366f1' },
    { icon: BarChart3, title: "Finances & Paiements", desc: "Suivi des cotisations, gestion des dépenses, rapports financiers détaillés et PayPal intégré.", color: '#10b981' },
    { icon: Trophy, title: "Tournois & Matchs", desc: "Planification des matchs, gestion des tournois, résultats et classements en temps réel.", color: '#f59e0b' },
    { icon: Shield, title: "Sécurité Multi-Tenant", desc: "Isolation totale des données entre académies. Chaque académie a son espace sécurisé.", color: '#ec4899' },
    { icon: Smartphone, title: "Interface Mobile", desc: "Application responsive accessible depuis n'importe quel appareil, n'importe où.", color: '#06b6d4' },
    { icon: TrendingUp, title: "Évaluations & Stats", desc: "Évaluez vos joueurs, suivez leur progression et générez des rapports de performance.", color: '#8b5cf6' },
    { icon: MessageSquare, title: "Chat Intégré", desc: "Communication directe entre coaches, admins et parents dans un espace sécurisé.", color: '#f97316' },
    { icon: Database, title: "Données Centralisées", desc: "Toutes vos données en un seul endroit : présences, kits, inventaire, blessures.", color: '#14b8a6' },
];

const NAV_LINKS = [
    { id: 'features', label: 'Fonctionnalités' },
    { id: 'pricing', label: 'Tarifs' },
    { id: 'about', label: 'À propos' },
    { id: 'contact', label: 'Contact' },
];

export default function SaasLanding() {
    const toast = useToast();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('');
    const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', academy: '', message: '' });
    const [contactStatus, setContactStatus] = useState(null);
    const [paypalLoading, setPaypalLoading] = useState(null);
    const [activeTab, setActiveTab] = useState(null); // 'privacy' | 'refund' | null
    const [yearlyMode, setYearlyMode] = useState(false);
    const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
    const [paymentMethodForm, setPaymentMethodForm] = useState({ type: 'bank_transfer', bank_name: '', iban: '', holder_name: '', notes: '' });
    const [paymentMethodStatus, setPaymentMethodStatus] = useState(null);
    const [showPostPaymentReg, setShowPostPaymentReg] = useState(false);
    const [postPaymentForm, setPostPaymentForm] = useState({ academy_name: '', country: '', city: '', admin_name: '', admin_email: '', admin_email_confirm: '', admin_password: '', admin_password_confirm: '' });
    const [postPaymentStatus, setPostPaymentStatus] = useState(null);
    const [isGoogleUser, setIsGoogleUser] = useState(false); // true if user authenticated via Google OAuth
    const [postPaymentError, setPostPaymentError] = useState('');

    // Free academy registration modal
    const [showRegModal, setShowRegModal] = useState(false);
    const [regForm, setRegForm] = useState({ academy_name: '', admin_name: '', admin_email: '', admin_email_confirm: '', admin_password: '', admin_password_confirm: '' });
    const [regStatus, setRegStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [regError, setRegError] = useState('');

    // Wake up Render backend on page load (free tier cold start)
    useEffect(() => {
        const api = API_URL.includes('localhost') ? 'https://academy-backend-4dln.onrender.com' : API_URL;
        fetch(`${api}/health`).catch(() => {});
    }, []);

    // Auto-open registration form if coming back from Google OAuth after payment
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('setup') === 'true') {
            const email = decodeURIComponent(params.get('email') || '');
            const hasToken = !!localStorage.getItem('token');
            setIsGoogleUser(hasToken);
            setPostPaymentForm(f => ({ ...f, admin_email: email }));
            setShowPostPaymentReg(true);
            window.history.replaceState({}, '', '/saas-platform');
        }
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 30);
            const sections = ['features', 'pricing', 'about', 'contact'];
            for (const s of sections.reverse()) {
                const el = document.getElementById(s);
                if (el && window.scrollY >= el.offsetTop - 100) {
                    setActiveSection(s);
                    break;
                }
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Handle PayPal return (after user pays and gets redirected back)
    const [paymentResult, setPaymentResult] = useState(null); // null | 'capturing' | 'success' | 'error'
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const payment = params.get('payment');
        const token = params.get('token'); // PayPal order ID

        if (payment === 'success' && token) {
            setPaymentResult('capturing');
            // Auto-capture the payment
            fetch(`${API_URL}/payments/gateway/capture-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: token,
                    academy_id: params.get('academy_id') || 'pending',
                    plan_id: params.get('plan_id') || null
                })
            })
            .then(r => r.json())
            .then(data => {
                setPaymentResult(data.success ? 'success' : 'error');
            })
            .catch(() => setPaymentResult('error'));

            // Clean URL
            window.history.replaceState({}, '', '/saas-platform');
        } else if (payment === 'cancelled') {
            setPaymentResult('cancelled');
            window.history.replaceState({}, '', '/saas-platform');
        }
    }, []);

    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMobileOpen(false);
    };

    const handleContact = async (e) => {
        e.preventDefault();
        setContactStatus('loading');
        try {
            const res = await fetch(`${API_URL}/public/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'saas_inquiry', ...contactForm })
            });
            setContactStatus(res.ok ? 'success' : 'error');
            if (res.ok) setContactForm({ name: '', email: '', phone: '', academy: '', message: '' });
        } catch {
            setContactStatus('error');
        }
    };

    const openRegModal = () => {
        setRegForm({ academy_name: '', admin_name: '', admin_email: '', admin_password: '' });
        setRegStatus(null);
        setRegError('');
        setShowRegModal(true);
    };

    const handleRegisterAcademy = async (e) => {
        e.preventDefault();
        setRegError('');
        // Validate confirmations
        if (regForm.admin_email !== regForm.admin_email_confirm) {
            setRegStatus('error');
            setRegError('Les adresses email ne correspondent pas.');
            return;
        }
        if (regForm.admin_password !== regForm.admin_password_confirm) {
            setRegStatus('error');
            setRegError('Les mots de passe ne correspondent pas.');
            return;
        }
        setRegStatus('loading');
        try {
            const res = await fetch(`${API_URL}/public/register-academy`, {
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
                setRegStatus('success');
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            } else {
                setRegStatus('error');
                setRegError(data.detail || 'Erreur lors de la création.');
            }
        } catch {
            setRegStatus('error');
            setRegError('Connexion échouée. Veuillez réessayer.');
        }
    };

    const handlePayPal = async (plan) => {
        if (plan.price === 0) {
            openRegModal();
            return;
        }
        setPaypalLoading(plan.id);
        try {
            // Convert MAD to USD for PayPal (approximate rate: 1 USD ≈ 10 MAD)
            const amountMAD = yearlyMode ? Math.round(plan.price * 12 * 0.85) : plan.price;
            const amountUSD = Math.max(1, Math.round(amountMAD / 10 * 100) / 100);

            // Use production backend for PayPal (reliable network) with local fallback
            const PAYPAL_API = API_URL.includes('localhost')
                ? 'https://academy-backend-4dln.onrender.com'
                : API_URL;

            // Wake up Render backend (free tier sleeps after 15min)
            try { await fetch(`${PAYPAL_API}/health`, { signal: AbortSignal.timeout(8000) }); } catch {}

            const res = await fetch(`${PAYPAL_API}/payments/gateway/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academy_id: 'pending_signup',
                    plan_id: plan.id,
                    amount: amountUSD,
                    currency: 'USD',
                    description: `${plan.name} Plan — Academy SaaS (${amountMAD} MAD)`,
                    source: 'saas_landing'
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.approve_url) {
                    window.location.href = data.approve_url;
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.detail || "Erreur de paiement. Veuillez réessayer.");
            }
        } catch {
            toast.error("Connexion échouée. Veuillez réessayer.");
        } finally {
            setPaypalLoading(null);
        }
    };

    const getPrice = (plan) => {
        if (plan.price === 0) return { display: 'GRATUIT', sub: 'Pour toujours' };
        const p = yearlyMode ? Math.round(plan.price * 0.85) : plan.price;
        return { display: p, sub: yearlyMode ? '/mois · facturé annuellement' : '/mois' };
    };

    return (
        <div className="min-h-screen overflow-x-hidden" style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif", background: '#f8fafc' }}>

            {/* ─── PAYMENT RESULT OVERLAY ─── */}
            {paymentResult && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: 20, padding: '40px 32px',
                        maxWidth: 420, width: '90%', textAlign: 'center',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
                    }}>
                        {paymentResult === 'capturing' && (
                            <>
                                <Loader2 size={48} style={{ margin: '0 auto 16px', color: '#6366f1', animation: 'spin 1s linear infinite' }} />
                                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Traitement du paiement...</h3>
                                <p style={{ color: '#64748b', marginTop: 8 }}>Veuillez patienter pendant la confirmation.</p>
                            </>
                        )}
                        {paymentResult === 'success' && (
                            <>
                                <CheckCircle2 size={56} style={{ margin: '0 auto 16px', color: '#10b981' }} />
                                <h3 style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>Paiement Réussi! 🎉</h3>
                                <p style={{ color: '#64748b', marginTop: 8 }}>Créez maintenant votre académie.</p>
                                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <button onClick={() => { setPaymentResult(null); setShowPostPaymentReg(true); }}
                                        style={{ padding: '13px 32px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
                                        Créer mon académie →
                                    </button>
                                </div>
                            </>
                        )}
                        {paymentResult === 'error' && (
                            <>
                                <X size={48} style={{ margin: '0 auto 16px', color: '#ef4444', background: '#fef2f2', borderRadius: '50%', padding: 8 }} />
                                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>Erreur de Paiement</h3>
                                <p style={{ color: '#64748b', marginTop: 8 }}>Le paiement n'a pas pu être finalisé. Veuillez réessayer.</p>
                                <button onClick={() => setPaymentResult(null)}
                                    style={{ marginTop: 24, padding: '12px 32px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                                    Fermer
                                </button>
                            </>
                        )}
                        {paymentResult === 'cancelled' && (
                            <>
                                <RotateCcw size={48} style={{ margin: '0 auto 16px', color: '#f59e0b' }} />
                                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>Paiement Annulé</h3>
                                <p style={{ color: '#64748b', marginTop: 8 }}>Vous avez annulé le paiement. Aucun montant n'a été débité.</p>
                                <button onClick={() => setPaymentResult(null)}
                                    style={{ marginTop: 24, padding: '12px 32px', background: '#64748b', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>
                                    Retour
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ─── POST PAYMENT REGISTRATION MODAL ─── */}
            {showPostPaymentReg && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ background: '#fff', borderRadius: 24, padding: '36px 32px', maxWidth: 480, width: '100%', boxShadow: '0 30px 80px rgba(0,0,0,0.35)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>🏟️</div>
                            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0 }}>Créer votre Académie</h3>
                            <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>Remplissez les informations pour activer votre espace.</p>
                        </div>

                        {postPaymentStatus === 'success' ? (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                <CheckCircle2 size={56} style={{ color: '#10b981', margin: '0 auto 16px' }} />
                                <h4 style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>Académie créée! 🎉</h4>
                                <p style={{ color: '#64748b', marginTop: 8 }}>
                                    {isGoogleUser ? 'Votre académie est prête. Accédez à votre tableau de bord.' : 'Connectez-vous avec vos identifiants.'}
                                </p>
                                <button onClick={() => { window.location.href = '/admin/dashboard'; }}
                                    style={{ marginTop: 20, padding: '12px 32px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
                                    Accéder au Dashboard →
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                setPostPaymentStatus('loading');
                                setPostPaymentError('');
                                try {
                                    const API = API_URL.includes('localhost') ? 'https://academy-backend-4dln.onrender.com' : API_URL;
                                    const token = localStorage.getItem('token');
                                    let res, data;

                                    if (token) {
                                        // Google user already authenticated — just setup academy
                                        res = await fetch(`${API}/public/setup-academy`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                            body: JSON.stringify({
                                                academy_name: postPaymentForm.academy_name,
                                                country: postPaymentForm.country,
                                                city: postPaymentForm.city
                                            })
                                        });
                                        data = await res.json();
                                        if (res.ok && data.success) {
                                            localStorage.setItem('role', 'admin');
                                            setIsGoogleUser(true);
                                            setPostPaymentStatus('success');
                                        } else {
                                            setPostPaymentStatus('error');
                                            setPostPaymentError(data.detail || 'Erreur lors de la création.');
                                        }
                                    } else {
                                        // Validate email & password confirmation
                                        if (postPaymentForm.admin_email !== postPaymentForm.admin_email_confirm) {
                                            setPostPaymentStatus('error');
                                            setPostPaymentError('Les adresses email ne correspondent pas.');
                                            return;
                                        }
                                        if (postPaymentForm.admin_password !== postPaymentForm.admin_password_confirm) {
                                            setPostPaymentStatus('error');
                                            setPostPaymentError('Les mots de passe ne correspondent pas.');
                                            return;
                                        }
                                        // Email/password — create new account
                                        res = await fetch(`${API}/public/register-academy`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                academy_name: `${postPaymentForm.academy_name}${postPaymentForm.city ? ' — ' + postPaymentForm.city : ''}`,
                                                admin_name: postPaymentForm.admin_name,
                                                admin_email: postPaymentForm.admin_email,
                                                admin_password: postPaymentForm.admin_password
                                            })
                                        });
                                        data = await res.json();
                                        if (res.ok && data.success) {
                                            // Auto-login after registration
                                            try {
                                                const loginRes = await fetch(`${API}/auth/login`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ email: postPaymentForm.admin_email, password: postPaymentForm.admin_password })
                                                });
                                                const loginData = await loginRes.json();
                                                if (loginRes.ok && loginData.access_token) {
                                                    localStorage.setItem('token', loginData.access_token);
                                                    localStorage.setItem('role', loginData.role);
                                                    localStorage.setItem('user_id', loginData.user_id);
                                                    localStorage.setItem('token_expires', Date.now() + 24 * 60 * 60 * 1000);
                                                }
                                            } catch {}
                                            setPostPaymentStatus('success');
                                        } else {
                                            setPostPaymentStatus('error');
                                            setPostPaymentError(data.detail || 'Erreur lors de la création.');
                                        }
                                    }
                                } catch {
                                    setPostPaymentStatus('error');
                                    setPostPaymentError('Connexion échouée. Réessayez.');
                                }
                            }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                                {/* Academy info — shown to all users */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <input required placeholder="Nom de l'académie *" value={postPaymentForm.academy_name}
                                        onChange={e => setPostPaymentForm({ ...postPaymentForm, academy_name: e.target.value })}
                                        style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', gridColumn: '1 / -1' }} />
                                    <input placeholder="Pays" value={postPaymentForm.country}
                                        onChange={e => setPostPaymentForm({ ...postPaymentForm, country: e.target.value })}
                                        style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                                    <input placeholder="Ville" value={postPaymentForm.city}
                                        onChange={e => setPostPaymentForm({ ...postPaymentForm, city: e.target.value })}
                                        style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                                </div>

                                {/* Admin account fields — only for non-Google users */}
                                {!isGoogleUser && (
                                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                                        <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, fontWeight: 600 }}>COMPTE ADMINISTRATEUR</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            <input required placeholder="Nom complet *" value={postPaymentForm.admin_name}
                                                onChange={e => setPostPaymentForm({ ...postPaymentForm, admin_name: e.target.value })}
                                                style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />

                                            <input required type="email" placeholder="Email *" value={postPaymentForm.admin_email}
                                                onChange={e => setPostPaymentForm({ ...postPaymentForm, admin_email: e.target.value })}
                                                style={{ padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${postPaymentForm.admin_email_confirm && postPaymentForm.admin_email !== postPaymentForm.admin_email_confirm ? '#ef4444' : '#e2e8f0'}`, fontSize: 14, outline: 'none' }} />
                                            <input required type="email" placeholder="Confirmer l'email *" value={postPaymentForm.admin_email_confirm}
                                                onChange={e => setPostPaymentForm({ ...postPaymentForm, admin_email_confirm: e.target.value })}
                                                style={{ padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${postPaymentForm.admin_email_confirm && postPaymentForm.admin_email !== postPaymentForm.admin_email_confirm ? '#ef4444' : postPaymentForm.admin_email_confirm && postPaymentForm.admin_email === postPaymentForm.admin_email_confirm ? '#10b981' : '#e2e8f0'}`, fontSize: 14, outline: 'none' }} />

                                            <input required type="password" placeholder="Mot de passe (min. 6 car.) *" value={postPaymentForm.admin_password}
                                                onChange={e => setPostPaymentForm({ ...postPaymentForm, admin_password: e.target.value })}
                                                style={{ padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${postPaymentForm.admin_password_confirm && postPaymentForm.admin_password !== postPaymentForm.admin_password_confirm ? '#ef4444' : '#e2e8f0'}`, fontSize: 14, outline: 'none' }} />
                                            <input required type="password" placeholder="Confirmer le mot de passe *" value={postPaymentForm.admin_password_confirm}
                                                onChange={e => setPostPaymentForm({ ...postPaymentForm, admin_password_confirm: e.target.value })}
                                                style={{ padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${postPaymentForm.admin_password_confirm && postPaymentForm.admin_password !== postPaymentForm.admin_password_confirm ? '#ef4444' : postPaymentForm.admin_password_confirm && postPaymentForm.admin_password === postPaymentForm.admin_password_confirm ? '#10b981' : '#e2e8f0'}`, fontSize: 14, outline: 'none' }} />
                                        </div>
                                    </div>
                                )}

                                {/* Google user badge */}
                                {isGoogleUser && (
                                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <img src="https://www.google.com/favicon.ico" width={16} height={16} alt="G" />
                                        <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>Connecté via Google — saisissez juste le nom de l'académie</span>
                                    </div>
                                )}

                                {postPaymentError && (
                                    <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, background: '#fef2f2', padding: '10px 14px', borderRadius: 10 }}>{postPaymentError}</p>
                                )}

                                <button type="submit" disabled={postPaymentStatus === 'loading'}
                                    style={{ padding: '13px', background: 'linear-gradient(135deg, #6366f1, #10b981)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: 15, marginTop: 4 }}>
                                    {postPaymentStatus === 'loading' ? 'Création en cours...' : 'Créer mon académie 🚀'}
                                </button>

                                {/* Google option — only for non-authenticated users */}
                                {!isGoogleUser && (
                                    <>
                                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>— ou —</div>
                                        <button type="button" onClick={() => {
                                            localStorage.setItem('pending_saas_registration', 'true');
                                            const redirectTo = `${window.location.origin}/auth/callback`;
                                            window.location.href = `https://kbhnqntteexatihidhkn.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
                                        }}
                                            style={{ padding: '12px', background: '#fff', color: '#1e293b', border: '2px solid #e2e8f0', borderRadius: 12, fontWeight: 600, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                            <img src="https://www.google.com/favicon.ico" width={18} height={18} alt="G" />
                                            Continuer avec Google
                                        </button>
                                    </>
                                )}

                                <button type="button" onClick={() => { setShowPostPaymentReg(false); setPostPaymentStatus(null); setIsGoogleUser(false); }}
                                    style={{ padding: '10px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                                    Annuler
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ─── PAYMENT METHOD MODAL ─── */}
            {showPaymentMethodModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 20, padding: '36px 28px', maxWidth: 460, width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>Ajouter un moyen de paiement</h3>
                        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>Ajoutez un virement bancaire ou autre méthode.</p>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                            {['bank_transfer', 'cash', 'check'].map(t => (
                                <button key={t} onClick={() => setPaymentMethodForm({ ...paymentMethodForm, type: t })}
                                    style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: paymentMethodForm.type === t ? '2px solid #6366f1' : '2px solid #e2e8f0', background: paymentMethodForm.type === t ? '#ede9fe' : '#f8fafc', color: paymentMethodForm.type === t ? '#6366f1' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                                    {t === 'bank_transfer' ? '🏦 Virement' : t === 'cash' ? '💵 Cash' : '📄 Chèque'}
                                </button>
                            ))}
                        </div>

                        {paymentMethodForm.type === 'bank_transfer' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <input placeholder="Nom de la banque" value={paymentMethodForm.bank_name}
                                    onChange={e => setPaymentMethodForm({ ...paymentMethodForm, bank_name: e.target.value })}
                                    style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                                <input placeholder="IBAN / RIB" value={paymentMethodForm.iban}
                                    onChange={e => setPaymentMethodForm({ ...paymentMethodForm, iban: e.target.value })}
                                    style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                                <input placeholder="Nom du titulaire" value={paymentMethodForm.holder_name}
                                    onChange={e => setPaymentMethodForm({ ...paymentMethodForm, holder_name: e.target.value })}
                                    style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
                            </div>
                        )}
                        <textarea placeholder="Notes (optionnel)" value={paymentMethodForm.notes}
                            onChange={e => setPaymentMethodForm({ ...paymentMethodForm, notes: e.target.value })}
                            style={{ width: '100%', marginTop: 10, padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 70, boxSizing: 'border-box' }} />

                        {paymentMethodStatus === 'success' && (
                            <p style={{ color: '#10b981', fontWeight: 600, marginTop: 10 }}>✅ Moyen de paiement enregistré!</p>
                        )}

                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                            <button onClick={() => { setShowPaymentMethodModal(false); setPaymentMethodStatus(null); }}
                                style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 600, cursor: 'pointer' }}>
                                Annuler
                            </button>
                            <button onClick={async () => {
                                setPaymentMethodStatus('loading');
                                try {
                                    await fetch(`${API_URL}/public/requests`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ type: 'payment_method', name: paymentMethodForm.holder_name || 'N/A', message: JSON.stringify(paymentMethodForm) })
                                    });
                                    setPaymentMethodStatus('success');
                                    setTimeout(() => { setShowPaymentMethodModal(false); setPaymentMethodStatus(null); }, 2000);
                                } catch { setPaymentMethodStatus('error'); }
                            }}
                                style={{ flex: 1, padding: '11px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                                {paymentMethodStatus === 'loading' ? '...' : 'Enregistrer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── NAVBAR ─── */}
            <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
                style={{
                    background: isScrolled ? 'rgba(255,255,255,0.94)' : 'transparent',
                    backdropFilter: isScrolled ? 'blur(20px)' : 'none',
                    borderBottom: isScrolled ? '1px solid rgba(148,163,184,0.12)' : 'none',
                    boxShadow: isScrolled ? '0 4px 24px rgba(0,0,0,0.06)' : 'none',
                }}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
                            AS
                        </div>
                        <div>
                            <span className="font-black text-sm" style={{ color: isScrolled ? '#0f172a' : 'white', letterSpacing: '-0.01em' }}>
                                Academy<span style={{ color: '#6366f1' }}>SaaS</span>
                            </span>
                            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: isScrolled ? '#94a3b8' : 'rgba(255,255,255,0.5)', lineHeight: 1 }}>Platform</p>
                        </div>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-7">
                        {NAV_LINKS.map(link => (
                            <button key={link.id} onClick={() => scrollTo(link.id)}
                                className="text-sm font-semibold transition-colors"
                                style={{ color: activeSection === link.id ? '#6366f1' : isScrolled ? '#475569' : 'rgba(255,255,255,0.7)' }}>
                                {link.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => window.location.href = '/saas/login'}
                            className="hidden sm:block px-4 py-2 rounded-xl text-sm font-bold transition-all"
                            style={{ color: isScrolled ? '#475569' : 'rgba(255,255,255,0.8)', border: `1.5px solid ${isScrolled ? 'rgba(148,163,184,0.3)' : 'rgba(255,255,255,0.2)'}` }}>
                            Se connecter
                        </button>
                        <button onClick={() => scrollTo('pricing')}
                            className="px-4 py-2 rounded-xl text-sm font-black text-white transition-all hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
                            Démarrer
                        </button>
                        <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)}>
                            {mobileOpen ? <X size={22} style={{ color: isScrolled ? '#0f172a' : 'white' }} /> : <Menu size={22} style={{ color: isScrolled ? '#0f172a' : 'white' }} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileOpen && (
                    <div className="md:hidden px-4 pb-4 space-y-1 border-t" style={{ background: 'rgba(255,255,255,0.97)', borderColor: 'rgba(148,163,184,0.15)' }}>
                        {NAV_LINKS.map(link => (
                            <button key={link.id} onClick={() => scrollTo(link.id)}
                                className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                                {link.label}
                            </button>
                        ))}
                        <button onClick={() => window.location.href = '/saas/login'}
                            className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-slate-500">
                            Se connecter
                        </button>
                    </div>
                )}
            </nav>

            {/* ─── HERO ─── */}
            <header className="relative min-h-screen flex items-center" style={{
                background: 'linear-gradient(135deg, #0f0c29 0%, #312e81 50%, #1e1b4b 100%)',
                overflow: 'hidden'
            }}>
                {/* BG blobs */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full opacity-25 blur-[120px]" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
                    <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full opacity-20 blur-[100px]" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-[80px]" style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />
                    {/* Grid */}
                    <div className="absolute inset-0 opacity-[0.04]" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
                        backgroundSize: '60px 60px'
                    }} />
                </div>

                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center pt-24 pb-16 w-full">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8"
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ animation: 'pulse 2s infinite' }} />
                        Plateforme SaaS #1 pour les Académies de Football
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6"
                        style={{ letterSpacing: '-0.03em' }}>
                        Gérez votre académie<br />
                        <span style={{
                            background: 'linear-gradient(135deg, #818cf8, #c084fc, #f59e0b)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                        }}>
                            avec excellence
                        </span>
                    </h1>

                    <p className="text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10 font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        La solution complète pour gérer joueurs, entraîneurs, finances, tournois et bien plus —
                        tout dans une plateforme sécurisée et intuitive.
                    </p>

                    <div className="flex flex-wrap justify-center gap-4">
                        <button onClick={() => scrollTo('pricing')}
                            className="flex items-center gap-2.5 px-7 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}>
                            Voir les tarifs <ChevronRight size={18} />
                        </button>
                        <button onClick={() => scrollTo('features')}
                            className="flex items-center gap-2.5 px-7 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-white/10"
                            style={{ color: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(255,255,255,0.15)' }}>
                            Découvrir les fonctionnalités
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto">
                        {[
                            { number: '+50', label: 'Académies actives' },
                            { number: '+5000', label: 'Joueurs gérés' },
                            { number: '99.9%', label: 'Uptime garanti' },
                            { number: '24/7', label: 'Support Enterprise' },
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-2xl sm:text-3xl font-black text-white mb-1" style={{
                                    background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                                }}>{stat.number}</div>
                                <div className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(to top, #f8fafc, transparent)' }} />
            </header>

            {/* ─── FEATURES ─── */}
            <section id="features" className="py-24 px-4" style={{ background: '#f8fafc' }}>
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-4" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                            Fonctionnalités
                        </span>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4" style={{ letterSpacing: '-0.025em' }}>
                            Tout ce dont votre académie<br />a besoin
                        </h2>
                        <p className="text-slate-500 max-w-xl mx-auto font-medium leading-relaxed">
                            Une plateforme complète construite spécifiquement pour les académies de football professionnelles.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {FEATURES.map((f, i) => {
                            const Icon = f.icon;
                            return (
                                <div key={i} className="group p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-2 hover:shadow-xl cursor-default"
                                    style={{ background: 'white', border: '1px solid rgba(148,163,184,0.12)' }}>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                                        style={{ background: `${f.color}12` }}>
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
            <section id="pricing" className="py-24 px-4" style={{ background: 'linear-gradient(180deg, white 0%, #eef2ff 100%)' }}>
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-10">
                        <span className="inline-block text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-4" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                            Tarifs
                        </span>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4" style={{ letterSpacing: '-0.025em' }}>
                            Choisissez votre plan
                        </h2>
                        <p className="text-slate-500 max-w-xl mx-auto font-medium mb-8">
                            Plans transparents, sans frais cachés. Commencez gratuitement.
                        </p>

                        {/* Toggle Monthly/Yearly */}
                        <div className="inline-flex items-center gap-3 p-1 rounded-2xl" style={{ background: 'rgba(99,102,241,0.08)' }}>
                            <button onClick={() => setYearlyMode(false)}
                                className="px-5 py-2 rounded-xl text-sm font-bold transition-all"
                                style={{ background: !yearlyMode ? 'white' : 'transparent', color: !yearlyMode ? '#6366f1' : '#64748b', boxShadow: !yearlyMode ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
                                Mensuel
                            </button>
                            <button onClick={() => setYearlyMode(true)}
                                className="px-5 py-2 rounded-xl text-sm font-bold transition-all"
                                style={{ background: yearlyMode ? 'white' : 'transparent', color: yearlyMode ? '#6366f1' : '#64748b', boxShadow: yearlyMode ? '0 2px 8px rgba(0,0,0,0.08)' : 'none' }}>
                                Annuel <span className="ml-2 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">-15%</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                        {PLANS.map((plan) => {
                            const pricing = getPrice(plan);
                            return (
                                <div key={plan.id}
                                    className="relative rounded-3xl p-7 flex flex-col transition-all duration-300 hover:-translate-y-1"
                                    style={{
                                        background: 'white',
                                        border: plan.popular ? `2px solid ${plan.color}` : '1px solid rgba(148,163,184,0.15)',
                                        boxShadow: plan.popular ? `0 20px 60px ${plan.glow}` : '0 4px 16px rgba(0,0,0,0.05)',
                                    }}>
                                    {plan.popular && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-widest text-white"
                                            style={{ background: `linear-gradient(135deg, ${plan.color}, #8b5cf6)` }}>
                                            ⭐ Plus Populaire
                                        </div>
                                    )}

                                    <div className="text-3xl mb-2">{plan.icon}</div>
                                    <span className="inline-block text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg mb-4"
                                        style={{ background: `${plan.glow}`, color: plan.color, border: `1px solid ${plan.color}25` }}>
                                        {plan.name}
                                    </span>

                                    <div className="mb-5">
                                        <div className="flex items-baseline gap-1">
                                            {plan.price === 0 ? (
                                                <span className="text-4xl font-black text-slate-900">GRATUIT</span>
                                            ) : (
                                                <>
                                                    <span className="text-4xl font-black text-slate-900">{pricing.display}</span>
                                                    <span className="text-sm font-semibold text-slate-400">MAD</span>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium mt-1">{pricing.sub}</p>
                                    </div>

                                    {/* Limits */}
                                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl mb-5" style={{ background: '#f8fafc', border: '1px solid rgba(148,163,184,0.1)' }}>
                                        {[
                                            { label: 'Joueurs', val: plan.limits.players },
                                            { label: 'Admins', val: plan.limits.admins },
                                            { label: 'Coaches', val: plan.limits.coaches },
                                        ].map((l, i) => (
                                            <div key={i} className="text-center">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{l.label}</p>
                                                <p className="text-sm font-black text-slate-700 mt-0.5">{l.val === -1 ? '∞' : l.val}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <ul className="space-y-3 mb-7 flex-1">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                                                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                                    style={{ background: `${plan.glow}`, color: plan.color }}>
                                                    <Check size={12} strokeWidth={3} />
                                                </span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA Button */}
                                    {plan.price === 0 ? (
                                        <button onClick={openRegModal}
                                            className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                            style={{ background: 'transparent', color: plan.color, border: `2px solid ${plan.color}40` }}>
                                            {plan.cta} <ArrowRight size={16} />
                                        </button>
                                    ) : (
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => handlePayPal(plan)}
                                                disabled={paypalLoading === plan.id}
                                                className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider text-white transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                                style={{ background: plan.popular ? `linear-gradient(135deg, ${plan.color}, #8b5cf6)` : plan.color, boxShadow: `0 8px 24px ${plan.glow}` }}>
                                                {paypalLoading === plan.id ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.383 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
                                                        </svg>
                                                        Payer via PayPal
                                                    </>
                                                )}
                                            </button>
                                            <p className="text-center text-[10px] text-slate-400 font-medium">
                                                Paiement sécurisé · Annulable à tout moment
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── À PROPOS ─── */}
            <section id="about" className="py-24 px-4" style={{ background: '#f8fafc' }}>
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <span className="inline-block text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-5" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                                À propos
                            </span>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-5" style={{ letterSpacing: '-0.025em' }}>
                                Qui sommes-nous ?
                            </h2>
                            <p className="text-slate-600 leading-relaxed font-medium mb-4">
                                AcademySaaS est une plateforme de gestion dédiée aux académies de football. Nous avons développé cette solution après avoir constaté le manque d'outils adaptés aux besoins spécifiques des clubs et académies sportives.
                            </p>
                            <p className="text-slate-600 leading-relaxed font-medium mb-6">
                                Notre équipe est composée de développeurs passionnés de football qui comprennent les défis quotidiens des gestionnaires d'académies : suivi des joueurs, gestion financière, communication avec les parents, organisation des tournois.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { icon: Shield, label: 'Sécurisé & Fiable', color: '#10b981' },
                                    { icon: Globe, label: 'Multi-langue', color: '#6366f1' },
                                    { icon: Headphones, label: 'Support Dédié', color: '#f59e0b' },
                                    { icon: Layout, label: 'Interface Intuitive', color: '#ec4899' },
                                ].map((item, i) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'white', border: '1px solid rgba(148,163,184,0.12)' }}>
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}12` }}>
                                                <Icon size={16} style={{ color: item.color }} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{item.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Services */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-black text-slate-900 mb-5">Nos Services</h3>
                            {[
                                { title: "Installation & Configuration", desc: "On s'occupe de la configuration complète de votre espace académie.", icon: '⚙️' },
                                { title: "Formation & Onboarding", desc: "Formation de votre équipe administrative pour une prise en main rapide.", icon: '🎓' },
                                { title: "Migration de données", desc: "Importation de vos données existantes vers la plateforme.", icon: '📊' },
                                { title: "Support technique continu", desc: "Une équipe dédiée disponible pour résoudre vos problèmes.", icon: '🛠️' },
                                { title: "Personnalisation", desc: "Adaptation de la plateforme à l'identité visuelle de votre académie.", icon: '🎨' },
                            ].map((s, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl transition-all hover:shadow-md"
                                    style={{ background: 'white', border: '1px solid rgba(148,163,184,0.12)' }}>
                                    <span className="text-2xl shrink-0">{s.icon}</span>
                                    <div>
                                        <h4 className="font-black text-slate-900 text-sm">{s.title}</h4>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── CONTACT ─── */}
            <section id="contact" className="py-24 px-4" style={{ background: 'linear-gradient(180deg, #eef2ff 0%, white 100%)' }}>
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <span className="inline-block text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-4" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                            Contact
                        </span>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4" style={{ letterSpacing: '-0.025em' }}>
                            Contactez-nous
                        </h2>
                        <p className="text-slate-500 max-w-xl mx-auto font-medium">
                            Intéressé par notre plateforme ? Notre équipe vous répond sous 24h.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        {/* Info */}
                        <div className="space-y-6">
                            {[
                                { icon: Mail, color: '#6366f1', label: 'contact@academysaas.ma', href: 'mailto:contact@academysaas.ma' },
                                { icon: Phone, color: '#10b981', label: '+212 600-000000', href: 'tel:+212600000000' },
                                { icon: MapPin, color: '#f59e0b', label: 'Casablanca, Maroc', href: null },
                            ].map((item, i) => {
                                const Icon = item.icon;
                                return (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${item.color}12`, color: item.color }}>
                                            <Icon size={20} />
                                        </div>
                                        {item.href ? (
                                            <a href={item.href} className="text-slate-700 font-semibold text-sm hover:text-indigo-600 transition-colors">{item.label}</a>
                                        ) : (
                                            <span className="text-slate-700 font-semibold text-sm">{item.label}</span>
                                        )}
                                    </div>
                                );
                            })}

                            <div className="flex gap-3 pt-4">
                                {[Instagram, Facebook].map((Icon, i) => (
                                    <button key={i} className="w-11 h-11 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
                                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                        <Icon size={18} />
                                    </button>
                                ))}
                            </div>

                            {/* Quick Links */}
                            <div className="pt-6 space-y-3">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Liens Utiles</h4>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setActiveTab('privacy')}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all"
                                        style={{ border: '1px solid rgba(99,102,241,0.2)' }}>
                                        <Lock size={12} /> Politique de Confidentialité
                                    </button>
                                    <button onClick={() => setActiveTab('refund')}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all"
                                        style={{ border: '1px solid rgba(99,102,241,0.2)' }}>
                                        <RotateCcw size={12} /> Politique de Remboursement
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="rounded-2xl p-7" style={{ background: 'white', border: '1px solid rgba(148,163,184,0.12)', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
                            <form onSubmit={handleContact} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nom complet</label>
                                        <input type="text" required value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                                            placeholder="Votre nom"
                                            className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                                            style={{ background: '#f8fafc', border: '1.5px solid rgba(148,163,184,0.2)', color: '#0f172a' }}
                                            onFocus={e => e.target.style.borderColor = '#6366f1'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(148,163,184,0.2)'} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Académie</label>
                                        <input type="text" value={contactForm.academy} onChange={e => setContactForm({ ...contactForm, academy: e.target.value })}
                                            placeholder="Nom de l'académie"
                                            className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                                            style={{ background: '#f8fafc', border: '1.5px solid rgba(148,163,184,0.2)', color: '#0f172a' }}
                                            onFocus={e => e.target.style.borderColor = '#6366f1'}
                                            onBlur={e => e.target.style.borderColor = 'rgba(148,163,184,0.2)'} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Email</label>
                                    <input type="email" required value={contactForm.email}
                                        onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                                        pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
                                        title="Email valide requis"
                                        placeholder="email@academie.ma"
                                        className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                                        style={{ background: '#f8fafc', border: '1.5px solid rgba(148,163,184,0.2)', color: '#0f172a' }}
                                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(148,163,184,0.2)'} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Téléphone</label>
                                    <input type="tel" value={contactForm.phone}
                                        onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                                        pattern="^\+?[0-9]{8,15}$"
                                        title="Numéro de téléphone valide"
                                        placeholder="+212 6..."
                                        className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                                        style={{ background: '#f8fafc', border: '1.5px solid rgba(148,163,184,0.2)', color: '#0f172a' }}
                                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(148,163,184,0.2)'} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Message</label>
                                    <textarea required rows="4" value={contactForm.message}
                                        onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                                        placeholder="Décrivez vos besoins..."
                                        className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all resize-none"
                                        style={{ background: '#f8fafc', border: '1.5px solid rgba(148,163,184,0.2)', color: '#0f172a' }}
                                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(148,163,184,0.2)'} />
                                </div>

                                {contactStatus === 'success' && (
                                    <div className="p-3 rounded-xl flex items-center gap-2 text-sm font-bold" style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }}>
                                        <CheckCircle2 size={16} /> Message envoyé ! On vous répond sous 24h.
                                    </div>
                                )}
                                {contactStatus === 'error' && (
                                    <div className="p-3 rounded-xl text-sm font-bold" style={{ background: 'rgba(239,68,68,0.06)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.15)' }}>
                                        ⚠️ Erreur. Réessayez ou contactez-nous par email.
                                    </div>
                                )}

                                <button type="submit" disabled={contactStatus === 'loading'}
                                    className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)', opacity: contactStatus === 'loading' ? 0.7 : 1 }}>
                                    {contactStatus === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <><MessageSquare size={16} /> Envoyer le message</>}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── FOOTER ─── */}
            <footer style={{ background: '#0f0c29', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="max-w-5xl mx-auto px-4 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-2.5 mb-4">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>AS</div>
                                <span className="font-black text-white text-sm">Academy<span style={{ color: '#818cf8' }}>SaaS</span></span>
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                La plateforme de gestion complète pour les académies de football. Gérez joueurs, finances, tournois et plus encore.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-black text-white text-xs uppercase tracking-widest mb-4">Navigation</h4>
                            <ul className="space-y-2">
                                {NAV_LINKS.map(link => (
                                    <li key={link.id}>
                                        <button onClick={() => scrollTo(link.id)} className="text-xs font-semibold transition-colors hover:text-indigo-400" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                            {link.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-black text-white text-xs uppercase tracking-widest mb-4">Légal</h4>
                            <ul className="space-y-2">
                                <li>
                                    <button onClick={() => setActiveTab('privacy')} className="text-xs font-semibold transition-colors hover:text-indigo-400 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        <Lock size={10} /> Confidentialité
                                    </button>
                                </li>
                                <li>
                                    <button onClick={() => setActiveTab('refund')} className="text-xs font-semibold transition-colors hover:text-indigo-400 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        <RotateCcw size={10} /> Remboursement
                                    </button>
                                </li>
                                <li>
                                    <a href="/saas/login" className="text-xs font-semibold transition-colors hover:text-indigo-400" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                        Espace Admin
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-6 flex items-center justify-between flex-wrap gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>© 2025 AcademySaaS. Tous droits réservés.</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Fait avec ❤️ au Maroc</p>
                    </div>
                </div>
            </footer>

            {/* ─── PRIVACY MODAL ─── */}
            {activeTab && (
                <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)' }}
                    onClick={() => setActiveTab(null)}>
                    <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-3xl p-8"
                        style={{ background: 'white', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}
                        onClick={e => e.stopPropagation()}>
                        <button onClick={() => setActiveTab(null)}
                            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                            <X size={18} />
                        </button>

                        {activeTab === 'privacy' ? (
                            <>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                                        <Lock size={20} style={{ color: '#6366f1' }} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900">Politique de Confidentialité</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">Dernière mise à jour : Avril 2025</p>
                                    </div>
                                </div>
                                <div className="space-y-5 text-sm text-slate-600 leading-relaxed">
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-2">1. Collecte des Données</h4>
                                        <p>Nous collectons uniquement les données nécessaires au fonctionnement de la plateforme : nom d'académie, email de contact, informations de paiement (traitées par PayPal), et données relatives aux joueurs inscrits dans votre académie.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-2">2. Utilisation des Données</h4>
                                        <p>Vos données sont utilisées exclusivement pour fournir nos services. Nous ne les vendons jamais à des tiers. Chaque académie dispose d'un espace isolé (multi-tenant) garantissant que vos données ne sont jamais accessibles par d'autres académies.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-2">3. Sécurité</h4>
                                        <p>Toutes les données sont chiffrées en transit (HTTPS/TLS) et au repos. Nous utilisons Supabase (infrastructure PostgreSQL sécurisée) avec Row Level Security (RLS) pour garantir l'isolation totale des données.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-2">4. Cookies</h4>
                                        <p>Nous utilisons des cookies essentiels pour maintenir votre session. Aucun cookie de tracking publicitaire n'est utilisé.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-2">5. Droits</h4>
                                        <p>Vous avez le droit d'accéder, modifier ou supprimer vos données à tout moment. Contactez-nous à <strong>privacy@academysaas.ma</strong> pour exercer ces droits.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-2">6. Contact</h4>
                                        <p>Pour toute question relative à la confidentialité : <strong>contact@academysaas.ma</strong></p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                                        <RotateCcw size={20} style={{ color: '#f59e0b' }} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900">Politique de Remboursement</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">Dernière mise à jour : Avril 2025</p>
                                    </div>
                                </div>
                                <div className="space-y-5 text-sm text-slate-600 leading-relaxed">
                                    <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                        <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
                                        <p className="font-semibold text-slate-700">Nous offrons une garantie de satisfaction de <strong>14 jours</strong> sur tous nos plans payants.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-2">Conditions de Remboursement</h4>
                                        <ul className="space-y-2">
                                            {[
                                                "Demande de remboursement dans les 14 jours suivant le paiement",
                                                "Le plan n'a pas été utilisé de manière intensive (moins de 50% des fonctionnalités)",
                                                "Raison valide fournie par l'académie",
                                            ].map((item, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <Check size={14} className="shrink-0 mt-0.5" style={{ color: '#6366f1' }} />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-2">Cas Non Remboursables</h4>
                                        <ul className="space-y-2">
                                            {[
                                                "Demandes après 14 jours d'utilisation",
                                                "Plans Free (gratuits)",
                                                "Downgrade de plan (remboursement pro-rata uniquement)",
                                                "Abus ou violation des conditions d'utilisation",
                                            ].map((item, i) => (
                                                <li key={i} className="flex items-start gap-2 text-slate-500">
                                                    <X size={14} className="shrink-0 mt-0.5 text-red-400" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 mb-2">Processus de Remboursement</h4>
                                        <p>Pour demander un remboursement, envoyez un email à <strong>billing@academysaas.ma</strong> avec votre ID d'académie et la raison de votre demande. Le remboursement sera traité sous 5-7 jours ouvrés via PayPal.</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ─── FREE ACADEMY REGISTRATION MODAL ─── */}
            {showRegModal && (
                <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
                    style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)' }}
                    onClick={() => setShowRegModal(false)}>
                    <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[28px] p-8"
                        style={{ background: 'white', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}
                        onClick={e => e.stopPropagation()}>

                        <button onClick={() => setShowRegModal(false)}
                            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                            <X size={18} />
                        </button>

                        {/* Header */}
                        <div className="mb-6">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                                style={{ background: 'rgba(16,185,129,0.1)' }}>
                                <Zap size={24} style={{ color: '#10b981' }} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                Créer votre Académie
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 font-medium">
                                Commencez gratuitement — votre espace sera prêt en quelques secondes.
                            </p>
                        </div>

                        {regStatus === 'success' ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'rgba(16,185,129,0.1)' }}>
                                    <CheckCircle2 size={32} style={{ color: '#10b981' }} />
                                </div>
                                <h4 className="text-lg font-black text-slate-900 mb-2">Académie créée avec succès ! 🎉</h4>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-4">
                                    Votre espace est prêt. Vous allez être redirigé vers la page de connexion...
                                </p>
                                <p className="text-xs text-indigo-500 font-bold">
                                    Connectez-vous avec : {regForm.admin_email}
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleRegisterAcademy} className="space-y-4">
                                {/* Academy Name */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                        Nom de l'Académie
                                    </label>
                                    <input
                                        type="text" required
                                        value={regForm.academy_name}
                                        onChange={e => setRegForm({ ...regForm, academy_name: e.target.value })}
                                        placeholder="Ex: FC Atlas Academy"
                                        className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                                        style={{ background: '#f8fafc', border: '1.5px solid rgba(148,163,184,0.2)', color: '#0f172a' }}
                                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(148,163,184,0.2)'}
                                    />
                                </div>

                                {/* Admin Name */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                        Nom de l'administrateur
                                    </label>
                                    <input
                                        type="text" required
                                        value={regForm.admin_name}
                                        onChange={e => setRegForm({ ...regForm, admin_name: e.target.value })}
                                        placeholder="Votre nom complet"
                                        className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                                        style={{ background: '#f8fafc', border: '1.5px solid rgba(148,163,184,0.2)', color: '#0f172a' }}
                                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(148,163,184,0.2)'}
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                        Email
                                    </label>
                                    <input
                                        type="email" required
                                        value={regForm.admin_email}
                                        onChange={e => setRegForm({ ...regForm, admin_email: e.target.value })}
                                        placeholder="admin@votre-academie.ma"
                                        className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                                        style={{ background: '#f8fafc', border: `1.5px solid ${regForm.admin_email_confirm && regForm.admin_email !== regForm.admin_email_confirm ? '#ef4444' : 'rgba(148,163,184,0.2)'}`, color: '#0f172a' }}
                                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                                        onBlur={e => e.target.style.borderColor = regForm.admin_email_confirm && regForm.admin_email !== regForm.admin_email_confirm ? '#ef4444' : 'rgba(148,163,184,0.2)'}
                                    />
                                </div>

                                {/* Confirm Email */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                        Confirmer l'Email
                                    </label>
                                    <input
                                        type="email" required
                                        value={regForm.admin_email_confirm}
                                        onChange={e => setRegForm({ ...regForm, admin_email_confirm: e.target.value })}
                                        placeholder="Retaper l'email"
                                        className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                                        style={{ background: '#f8fafc', border: `1.5px solid ${regForm.admin_email_confirm ? (regForm.admin_email === regForm.admin_email_confirm ? '#10b981' : '#ef4444') : 'rgba(148,163,184,0.2)'}`, color: '#0f172a' }}
                                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                                        onBlur={e => e.target.style.borderColor = regForm.admin_email_confirm ? (regForm.admin_email === regForm.admin_email_confirm ? '#10b981' : '#ef4444') : 'rgba(148,163,184,0.2)'}
                                    />
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                        Mot de passe
                                    </label>
                                    <input
                                        type="password" required
                                        minLength={6}
                                        value={regForm.admin_password}
                                        onChange={e => setRegForm({ ...regForm, admin_password: e.target.value })}
                                        placeholder="Min. 6 caractères"
                                        className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                                        style={{ background: '#f8fafc', border: `1.5px solid ${regForm.admin_password_confirm && regForm.admin_password !== regForm.admin_password_confirm ? '#ef4444' : 'rgba(148,163,184,0.2)'}`, color: '#0f172a' }}
                                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                                        onBlur={e => e.target.style.borderColor = regForm.admin_password_confirm && regForm.admin_password !== regForm.admin_password_confirm ? '#ef4444' : 'rgba(148,163,184,0.2)'}
                                    />
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                        Confirmer le Mot de passe
                                    </label>
                                    <input
                                        type="password" required
                                        value={regForm.admin_password_confirm}
                                        onChange={e => setRegForm({ ...regForm, admin_password_confirm: e.target.value })}
                                        placeholder="Retaper le mot de passe"
                                        className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                                        style={{ background: '#f8fafc', border: `1.5px solid ${regForm.admin_password_confirm ? (regForm.admin_password === regForm.admin_password_confirm ? '#10b981' : '#ef4444') : 'rgba(148,163,184,0.2)'}`, color: '#0f172a' }}
                                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                                        onBlur={e => e.target.style.borderColor = regForm.admin_password_confirm ? (regForm.admin_password === regForm.admin_password_confirm ? '#10b981' : '#ef4444') : 'rgba(148,163,184,0.2)'}
                                    />
                                </div>

                                {/* Error message */}
                                {regStatus === 'error' && (
                                    <div className="p-3 rounded-xl text-sm font-semibold flex items-center gap-2"
                                        style={{ background: 'rgba(239,68,68,0.06)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.15)' }}>
                                        ⚠️ {regError}
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={regStatus === 'loading'}
                                    className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                                    style={{
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
                                        opacity: regStatus === 'loading' ? 0.7 : 1,
                                    }}>
                                    {regStatus === 'loading' ? (
                                        <><Loader2 size={16} className="animate-spin" /> Création en cours...</>
                                    ) : (
                                        <><Zap size={16} /> Créer mon Académie Gratuitement</>
                                    )}
                                </button>

                                <p className="text-center text-[10px] text-slate-400 font-medium">
                                    En créant votre académie, vous acceptez nos conditions d'utilisation.
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
