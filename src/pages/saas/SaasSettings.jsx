import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle2, Shield, Database, Globe, Key, RefreshCw, AlertCircle, CreditCard, Zap, Star, Crown, Users, UserCog, Dumbbell, Layout, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import { SkeletonDashboard } from '../../components/Skeleton';

const Toggle = ({ label, desc, checked, onChange }) => (
    <label className="flex items-center justify-between p-4 bg-surface-50 border border-surface-200 rounded-xl cursor-pointer hover:bg-surface-100 transition-colors">
        <div>
            <h4 className="font-medium text-surface-800 text-sm">{label}</h4>
            <p className="text-xs text-surface-500 mt-0.5">{desc}</p>
        </div>
        <div
            onClick={() => onChange(!checked)}
            className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 shrink-0 ml-4 ${checked ? 'bg-emerald-500' : 'bg-surface-300'}`}
        >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-1'}`} />
        </div>
    </label>
);

const PlanCard = ({ planKey, icon, colorBg, colorBorder, colorText, config, handleChange }) => {
    const nameKey = `plan_${planKey}_name`;
    const priceKey = `plan_${planKey}_price`;
    const playersKey = `plan_${planKey}_max_players`;
    const adminsKey = `plan_${planKey}_max_admins`;
    const coachesKey = `plan_${planKey}_max_coaches`;
    const isUnlimited = (val) => val === -1;
    const IconComponent = icon;

    return (
        <div className={`border ${colorBorder} bg-white rounded-2xl p-6 transition-all hover:shadow-md`}>
            <div className="flex items-center gap-3 mb-5">
                <div className={`p-2.5 rounded-xl ${colorBg}`}>
                    <IconComponent className={`w-5 h-5 ${colorText}`} />
                </div>
                <input
                    type="text"
                    value={config[nameKey] || ''}
                    onChange={e => handleChange(nameKey, e.target.value)}
                    className="bg-transparent font-bold text-lg text-surface-900 border-none outline-none w-full"
                />
            </div>

            <div className="mb-5">
                <label className="block text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">Monthly Price (MAD)</label>
                <div className="relative">
                    <input
                        type="number"
                        value={config[priceKey] || 0}
                        onChange={e => handleChange(priceKey, parseInt(e.target.value) || 0)}
                        className="input pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-surface-400 font-medium">MAD/mo</span>
                </div>
            </div>

            <div className="space-y-3">
                {[
                    { key: playersKey, label: 'Max Players', icon: Users, default: 50 },
                    { key: adminsKey, label: 'Max Admins', icon: UserCog, default: 2 },
                    { key: coachesKey, label: 'Max Coaches', icon: Dumbbell, default: 5 },
                ].map(({ key, label, icon: FieldIcon, default: def }) => {
                    const IconComponent = FieldIcon;
                    return (
                        <div key={key}>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                                <IconComponent className="w-3 h-3" /> {label}
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={isUnlimited(config[key]) ? '' : (config[key] || 0)}
                                    onChange={e => handleChange(key, e.target.value === '' ? -1 : parseInt(e.target.value) || 0)}
                                    placeholder="∞ Unlimited"
                                    disabled={isUnlimited(config[key])}
                                    className="input flex-1 disabled:opacity-40"
                                />
                                <button
                                    onClick={() => handleChange(key, isUnlimited(config[key]) ? def : -1)}
                                    className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                        isUnlimited(config[key])
                                        ? 'bg-violet-50 text-violet-600 border border-violet-200'
                                        : 'bg-surface-100 text-surface-500 border border-surface-200 hover:border-surface-300'
                                    }`}
                                >∞</button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function SaasSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('general');
    const [paypalStatus, setPaypalStatus] = useState(null);
    const [lemonsqueezyStatus, setLemonsqueezyStatus] = useState(null);
    const [loadingLs, setLoadingLs] = useState(false);

    const [config, setConfig] = useState({
        platform_name: 'Academy SaaS Platform',
        support_email: 'support@academy.com',
        default_trial_days: 14,
        auto_provision: true,
        email_notifications: true,
        auto_backup: true,
        maintenance_mode: false,
        paypal_sandbox: true,
        plan_free_name: 'Free',
        plan_free_price: 0,
        plan_free_max_players: 15,
        plan_free_max_admins: 1,
        plan_free_max_coaches: 1,
        plan_pro_name: 'Pro',
        plan_pro_price: 499,
        plan_pro_max_players: 100,
        plan_pro_max_admins: 4,
        plan_pro_max_coaches: 10,
        plan_enterprise_name: 'Enterprise',
        plan_enterprise_price: 999,
        plan_enterprise_max_players: -1,
        plan_enterprise_max_admins: -1,
        plan_enterprise_max_coaches: -1,
    });

    // Landing page settings
    const [landing, setLanding] = useState({
        hero_title: '', hero_subtitle: '', hero_cta_text: '',
        features_title: '', features_subtitle: '',
        pricing_title: '',
        about_title: '', about_text: '',
        contact_email: '', contact_phone: '', contact_address: '',
        facebook_url: '', instagram_url: '', youtube_url: '', twitter_url: '', linkedin_url: '',
        footer_text: '',
        top_bar_enabled: false, top_bar_text: '', top_bar_cta_text: '', top_bar_cta_url: '',
        top_bar_bg_color: '#6366f1', top_bar_dismissible: true,
    });

    // Feature cards (stored as JSON in features_subtitle)
    const DEFAULT_FEATURES = [
        { title: 'Gestion des Joueurs', desc: "Profils complets, suivi médical, catégories d'âge et historique de performance." },
        { title: 'Finances & Paiements', desc: 'Suivi des cotisations, gestion des dépenses, rapports financiers et PayPal intégré.' },
        { title: 'Tournois & Matchs', desc: 'Planification des matchs, gestion des tournois, résultats et classements en temps réel.' },
        { title: 'Sécurité Multi-Tenant', desc: 'Isolation totale des données entre académies. Chaque académie a son espace sécurisé.' },
        { title: 'Interface Mobile', desc: "Application responsive accessible depuis n'importe quel appareil." },
        { title: 'Évaluations & Stats', desc: 'Évaluez vos joueurs, suivez leur progression et générez des rapports.' },
        { title: 'Chat Intégré', desc: 'Communication directe entre coaches, admins et parents dans un espace sécurisé.' },
        { title: 'Données Centralisées', desc: 'Toutes vos données en un seul endroit : présences, kits, inventaire, blessures.' },
    ];
    const [featuresCards, setFeaturesCards] = useState(DEFAULT_FEATURES);
    const [featuresSubtitleText, setFeaturesSubtitleText] = useState('');
    const [landingSaving, setLandingSaving] = useState(false);
    const [landingSaved, setLandingSaved] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchPaypalStatus();
        fetchLemonsqueezyStatus();
        fetchLanding();
    }, []);

    async function fetchLanding() {
        try {
            const res = await authFetch(`${API_URL}/saas/landing-settings`);
            if (res.ok) {
                const data = await res.json();
                setLanding(prev => ({ ...prev, ...Object.fromEntries(Object.entries(data).filter(([k]) => k in prev)) }));
                // Parse features_subtitle as JSON if possible
                const fs = data.features_subtitle || '';
                try {
                    const parsed = JSON.parse(fs);
                    if (parsed && parsed.cards) {
                        setFeaturesCards(parsed.cards);
                        setFeaturesSubtitleText(parsed.subtitle || '');
                    } else {
                        setFeaturesSubtitleText(fs);
                    }
                } catch {
                    setFeaturesSubtitleText(fs);
                }
            }
        } catch { /* ignore */ }
    }

    const saveLanding = async () => {
        setLandingSaving(true);
        setLandingSaved(false);
        setError('');
        try {
            // Encode features cards + subtitle into features_subtitle as JSON
            const payload = {
                ...landing,
                features_subtitle: JSON.stringify({ subtitle: featuresSubtitleText, cards: featuresCards }),
            };
            const res = await authFetch(`${API_URL}/saas/landing-settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setLandingSaved(true);
                setTimeout(() => setLandingSaved(false), 2500);
            } else {
                const data = await res.json().catch(() => ({}));
                setError(data.detail || 'Failed to save landing settings.');
            }
        } catch (e) {
            setError('Network error: ' + (e.message || 'unknown'));
        } finally {
            setLandingSaving(false);
        }
    };

    async function fetchSettings() {
        try {
            const res = await authFetch(`${API_URL}/saas/settings`);
            if (res.ok) {
                const data = await res.json();
                if (data && Object.keys(data).length > 0) {
                    setConfig(prev => ({ ...prev, ...data }));
                }
            }
        } catch (err) {
            console.error("Failed to fetch settings:", err);
        } finally {
            setLoading(false);
        }
    }

    async function fetchPaypalStatus() {
        try {
            const res = await fetch(`${API_URL}/payments/gateway/status`);
            if (res.ok) {
                const data = await res.json();
                setPaypalStatus(data);
            }
        } catch (err) {
            console.error("Failed to fetch PayPal status:", err);
        }
    }

    async function fetchLemonsqueezyStatus() {
        setLoadingLs(true);
        try {
            const res = await fetch(`${API_URL}/payments/gateway/lemonsqueezy/status`);
            if (res.ok) {
                const data = await res.json();
                setLemonsqueezyStatus(data);
            }
        } catch (err) {
            console.error("Failed to fetch Lemon Squeezy status:", err);
        } finally {
            setLoadingLs(false);
        }
    }

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSaved(false);
        try {
            const res = await authFetch(`${API_URL}/saas/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            } else {
                const data = await res.json();
                setError(data.detail || 'Failed to save settings.');
            }
        } catch {
            setError('Network error.');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Globe },
        { id: 'landing', label: 'Landing Page', icon: Layout },
        { id: 'plans', label: 'Plans & Limits', icon: Crown },
        { id: 'paypal', label: 'PayPal', icon: CreditCard },
        { id: 'lemonsqueezy', label: 'Lemon Squeezy', icon: Star },
        { id: 'automations', label: 'Automations', icon: RefreshCw },
    ];

    if (loading) return <SkeletonDashboard />;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="page-title">System Settings</h2>
                    <p className="page-subtitle">Configure global SaaS platform settings.</p>
                </div>
                <div className="flex items-center gap-3">
                    {(saved || landingSaved) && (
                        <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium animate-fade-in">
                            <CheckCircle2 className="w-4 h-4" /> Saved!
                        </span>
                    )}
                    <button
                        onClick={activeTab === 'landing' ? saveLanding : handleSave}
                        disabled={activeTab === 'landing' ? landingSaving : saving}
                        className="btn btn-brand"
                    >
                        {(activeTab === 'landing' ? landingSaving : saving)
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Save className="w-4 h-4" />}
                        {(activeTab === 'landing' ? landingSaving : saving) ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-surface-100 p-1.5 rounded-xl border border-surface-200">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === tab.id
                                    ? 'bg-white text-surface-900 shadow-sm border border-surface-200'
                                    : 'text-surface-500 hover:text-surface-800 hover:bg-surface-50'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── TAB: General ── */}
            {activeTab === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="premium-card p-6">
                        <h3 className="text-sm font-semibold text-surface-900 border-b border-surface-200 pb-4 mb-5 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-emerald-500" /> Platform Configuration
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Platform Name</label>
                                <input type="text" value={config.platform_name} onChange={e => handleChange('platform_name', e.target.value)} className="input" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Support Email</label>
                                <input type="email" value={config.support_email} onChange={e => handleChange('support_email', e.target.value)} className="input" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Default Free Trial (Days)</label>
                                <input type="number" value={config.default_trial_days} onChange={e => handleChange('default_trial_days', parseInt(e.target.value) || 0)} className="input" />
                            </div>
                        </div>
                    </div>

                    <div className="premium-card p-6">
                        <h3 className="text-sm font-semibold text-surface-900 border-b border-surface-200 pb-4 mb-5 flex items-center gap-2">
                            <Key className="w-4 h-4 text-amber-500" /> Advanced
                        </h3>
                        <div className="space-y-3">
                            <Toggle
                                label="Maintenance Mode"
                                desc="Show maintenance page to all academy clients."
                                checked={config.maintenance_mode}
                                onChange={v => handleChange('maintenance_mode', v)}
                            />
                            <div className="mt-4 p-4 bg-surface-50 border border-surface-200 rounded-xl">
                                <h4 className="font-medium text-surface-800 text-sm mb-2 flex items-center gap-2">
                                    <Database className="w-4 h-4 text-emerald-500" /> System Status
                                </h4>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-surface-500">Backend API</span>
                                        <span className="text-emerald-600 font-semibold">● Connected</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-surface-500">PayPal Gateway</span>
                                        <span className={`font-semibold ${paypalStatus?.configured ? (paypalStatus?.mode === 'sandbox' ? 'text-amber-600' : 'text-emerald-600') : 'text-rose-600'}`}>
                                            {paypalStatus?.configured ? (paypalStatus?.mode === 'sandbox' ? '● Sandbox' : '● Live') : '● Not Configured'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-surface-500">Database</span>
                                        <span className="text-emerald-600 font-semibold">● Supabase</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: Landing Page ── */}
            {activeTab === 'landing' && (
                <div>
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <Layout className="w-5 h-5 text-violet-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-violet-800">Public marketing site (`/saas-platform`)</p>
                            <p className="text-xs text-violet-600 mt-1">
                                Edit hero copy, section titles, contact info and social links. Changes go live immediately.
                            </p>
                        </div>
                    </div>

                    {/* ─── Top Bar Manager ─── */}
                    <div className="bg-white rounded-2xl border border-slate-200 mb-5 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                📢 Top Announcement Bar
                            </h4>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={!!landing.top_bar_enabled}
                                    onChange={e => setLanding(prev => ({ ...prev, top_bar_enabled: e.target.checked }))}
                                    className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                                />
                                <span className="text-xs font-bold text-slate-600">{landing.top_bar_enabled ? 'Enabled' : 'Disabled'}</span>
                            </label>
                        </div>
                        <div className={`p-5 space-y-3 ${!landing.top_bar_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                            {/* Live preview */}
                            <div className="rounded-lg overflow-hidden border border-slate-200">
                                <div className="text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-3" style={{ background: landing.top_bar_bg_color || '#6366f1' }}>
                                    <span>{landing.top_bar_text || 'Your announcement here'}</span>
                                    {landing.top_bar_cta_text && (
                                        <span className="px-2 py-0.5 rounded bg-white/20 backdrop-blur-sm">{landing.top_bar_cta_text} →</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Bar Text</label>
                                <input type="text" value={landing.top_bar_text || ''}
                                    onChange={e => setLanding(prev => ({ ...prev, top_bar_text: e.target.value }))}
                                    placeholder="🎉 Limited offer: 30% off all plans!"
                                    className="input" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">CTA Text</label>
                                    <input type="text" value={landing.top_bar_cta_text || ''}
                                        onChange={e => setLanding(prev => ({ ...prev, top_bar_cta_text: e.target.value }))}
                                        placeholder="Claim now"
                                        className="input" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">CTA URL</label>
                                    <input type="text" value={landing.top_bar_cta_url || ''}
                                        onChange={e => setLanding(prev => ({ ...prev, top_bar_cta_url: e.target.value }))}
                                        placeholder="https://... or #pricing"
                                        dir="ltr"
                                        className="input" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Background Color</label>
                                    <div className="flex gap-2 items-center">
                                        <input type="color" value={landing.top_bar_bg_color || '#6366f1'}
                                            onChange={e => setLanding(prev => ({ ...prev, top_bar_bg_color: e.target.value }))}
                                            className="h-10 w-16 border border-slate-200 rounded cursor-pointer" />
                                        <input type="text" value={landing.top_bar_bg_color || ''}
                                            onChange={e => setLanding(prev => ({ ...prev, top_bar_bg_color: e.target.value }))}
                                            placeholder="#6366f1"
                                            dir="ltr"
                                            className="input flex-1 font-mono text-sm" />
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer pb-2.5">
                                    <input type="checkbox"
                                        checked={!!landing.top_bar_dismissible}
                                        onChange={e => setLanding(prev => ({ ...prev, top_bar_dismissible: e.target.checked }))}
                                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                                    <span className="text-xs font-bold text-slate-600">Allow visitors to dismiss</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {[
                        { title: 'Hero', fields: [
                            { k: 'hero_title', label: 'Hero Title', placeholder: 'Build a thriving sports academy.' },
                            { k: 'hero_subtitle', label: 'Hero Subtitle', placeholder: 'Multi-tenant SaaS for football academies — players, finances, branches.' },
                            { k: 'hero_cta_text', label: 'CTA Button Text', placeholder: 'Start free trial' },
                        ]},
                        { title: 'Sections', fields: [
                            { k: 'features_title', label: 'Features Section Title', placeholder: 'Everything you need to run a modern academy' },
                            { k: 'pricing_title', label: 'Pricing Section Title', placeholder: 'Simple pricing' },
                            { k: 'about_title', label: 'About Section Title', placeholder: 'About us' },
                        ]},
                        { title: 'About Text', fields: [
                            { k: 'about_text', label: 'About Body Text', placeholder: 'We help academy owners grow…', textarea: true },
                        ]},
                        { title: 'Contact', fields: [
                            { k: 'contact_email', label: 'Contact Email', placeholder: 'support@example.com' },
                            { k: 'contact_phone', label: 'Contact Phone', placeholder: '+212 600 000 000' },
                            { k: 'contact_address', label: 'Contact Address', placeholder: 'Casablanca, Morocco' },
                        ]},
                        { title: 'Social Links', fields: [
                            { k: 'facebook_url', label: 'Facebook URL', placeholder: 'https://facebook.com/...' },
                            { k: 'instagram_url', label: 'Instagram URL', placeholder: 'https://instagram.com/...' },
                            { k: 'youtube_url', label: 'YouTube URL', placeholder: 'https://youtube.com/@...' },
                            { k: 'twitter_url', label: 'Twitter/X URL', placeholder: 'https://x.com/...' },
                            { k: 'linkedin_url', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/...' },
                        ]},
                        { title: 'Footer', fields: [
                            { k: 'footer_text', label: 'Footer Text', placeholder: '© 2026 Academy SaaS. All rights reserved.' },
                        ]},
                    ].map(group => (
                        <div key={group.title} className="bg-white rounded-2xl border border-slate-200 mb-5 overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{group.title}</h4>
                            </div>
                            <div className="p-5 space-y-3">
                                {group.fields.map(f => (
                                    <div key={f.k}>
                                        <label className="block text-xs font-bold text-slate-600 mb-1.5">{f.label}</label>
                                        {f.textarea ? (
                                            <textarea
                                                rows={5}
                                                value={landing[f.k] || ''}
                                                onChange={e => setLanding(prev => ({ ...prev, [f.k]: e.target.value }))}
                                                placeholder={f.placeholder}
                                                className="input resize-none"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={landing[f.k] || ''}
                                                onChange={e => setLanding(prev => ({ ...prev, [f.k]: e.target.value }))}
                                                placeholder={f.placeholder}
                                                className="input"
                                                dir={f.k.includes('url') ? 'ltr' : undefined}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Features Subtitle */}
                    <div className="bg-white rounded-2xl border border-slate-200 mb-5 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Features Subtitle</h4>
                        </div>
                        <div className="p-5">
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Subtitle Text</label>
                            <input
                                type="text"
                                value={featuresSubtitleText}
                                onChange={e => setFeaturesSubtitleText(e.target.value)}
                                placeholder="15+ tools, one platform"
                                className="input"
                            />
                        </div>
                    </div>

                    {/* Feature Cards Editor */}
                    <div className="bg-white rounded-2xl border border-slate-200 mb-5 overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Feature Cards (8)</h4>
                            <button
                                type="button"
                                onClick={() => setFeaturesCards(DEFAULT_FEATURES)}
                                className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-lg hover:bg-violet-100 transition-colors"
                            >Reset to Defaults</button>
                        </div>
                        <div className="p-5 space-y-3">
                            {featuresCards.map((card, i) => (
                                <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-white transition-colors">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                                        <input
                                            type="text"
                                            value={card.title}
                                            onChange={e => {
                                                const next = [...featuresCards];
                                                next[i] = { ...next[i], title: e.target.value };
                                                setFeaturesCards(next);
                                            }}
                                            placeholder="Feature title"
                                            className="input flex-1 !py-1.5 text-sm font-semibold"
                                        />
                                    </div>
                                    <textarea
                                        rows={2}
                                        value={card.desc}
                                        onChange={e => {
                                            const next = [...featuresCards];
                                            next[i] = { ...next[i], desc: e.target.value };
                                            setFeaturesCards(next);
                                        }}
                                        placeholder="Feature description"
                                        className="input resize-none text-xs"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <a href="/saas-platform" target="_blank" rel="noreferrer" className="btn btn-secondary">
                            <Globe size={16} /> Preview
                        </a>
                        <button onClick={saveLanding} disabled={landingSaving} className="btn btn-brand min-w-[140px] justify-center">
                            {landingSaving ? <Loader2 size={16} className="animate-spin" /> : landingSaved ? <><CheckCircle2 size={16} /> Saved</> : <><Save size={16} /> Save Landing</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ── TAB: Plans & Limits ── */}
            {activeTab === 'plans' && (
                <div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-blue-800">Plan Limits Configuration</p>
                            <p className="text-xs text-blue-600 mt-1">
                                Define the resource limits for each plan. Set -1 or click ∞ for unlimited. These limits are enforced when academies try to add players, coaches, or admins.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <PlanCard planKey="free" icon={Zap} colorBg="bg-emerald-50" colorBorder="border-emerald-200" colorText="text-emerald-600" config={config} handleChange={handleChange} />
                        <PlanCard planKey="pro" icon={Star} colorBg="bg-blue-50" colorBorder="border-blue-200" colorText="text-blue-600" config={config} handleChange={handleChange} />
                        <PlanCard planKey="enterprise" icon={Crown} colorBg="bg-violet-50" colorBorder="border-violet-200" colorText="text-violet-600" config={config} handleChange={handleChange} />
                    </div>

                    {/* Preview Summary */}
                    <div className="mt-6 premium-card overflow-hidden">
                        <div className="p-4 border-b border-surface-200">
                            <h4 className="text-sm font-semibold text-surface-800">Plans Summary Preview</h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="table-premium w-full text-left">
                                <thead>
                                    <tr>
                                        <th>Plan</th>
                                        <th className="text-center">Price</th>
                                        <th className="text-center">Players</th>
                                        <th className="text-center">Admins</th>
                                        <th className="text-center">Coaches</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {['free', 'pro', 'enterprise'].map(key => {
                                        const fmt = (v) => v === -1 ? '∞' : v;
                                        return (
                                            <tr key={key}>
                                                <td className="font-semibold text-surface-800">{config[`plan_${key}_name`]}</td>
                                                <td className="text-center">{config[`plan_${key}_price`] === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : <>{config[`plan_${key}_price`]} <span className="text-surface-400 text-xs">MAD</span></>}</td>
                                                <td className="text-center font-mono">{fmt(config[`plan_${key}_max_players`])}</td>
                                                <td className="text-center font-mono">{fmt(config[`plan_${key}_max_admins`])}</td>
                                                <td className="text-center font-mono">{fmt(config[`plan_${key}_max_coaches`])}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: PayPal ── */}
            {activeTab === 'paypal' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="premium-card p-6">
                        <h3 className="text-sm font-semibold text-surface-900 border-b border-surface-200 pb-4 mb-5 flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-blue-500" /> PayPal Configuration
                        </h3>
                        <div className="space-y-4">
                            <Toggle
                                label="Sandbox Mode"
                                desc="Use PayPal sandbox for testing. Disable for live payments."
                                checked={config.paypal_sandbox}
                                onChange={v => handleChange('paypal_sandbox', v)}
                            />

                            <div className={`p-4 rounded-xl border ${config.paypal_sandbox ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-2 h-2 rounded-full ${config.paypal_sandbox ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                                    <span className={`text-sm font-semibold ${config.paypal_sandbox ? 'text-amber-700' : 'text-emerald-700'}`}>
                                        {config.paypal_sandbox ? 'SANDBOX MODE' : 'LIVE / PRODUCTION MODE'}
                                    </span>
                                </div>
                                <p className="text-xs text-surface-600 mt-1">
                                    {config.paypal_sandbox
                                        ? 'Payments will use PayPal sandbox. No real money will be charged.'
                                        : '⚠️ LIVE MODE — Real payments will be processed. Make sure your credentials are correct!'
                                    }
                                </p>
                            </div>

                            <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl">
                                <p className="text-xs text-surface-600 leading-relaxed">
                                    <strong className="text-surface-800">💡 Note:</strong> PayPal Client ID and Client Secret are configured as environment variables on your backend server (Render).
                                    To update them, go to your <strong className="text-blue-600">Render Dashboard → Environment Variables</strong>.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="premium-card p-6">
                        <h3 className="text-sm font-semibold text-surface-900 border-b border-surface-200 pb-4 mb-5 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-500" /> Gateway Status
                        </h3>

                        {paypalStatus ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl text-center">
                                        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Status</p>
                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${paypalStatus.configured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                                            <div className={`w-2.5 h-2.5 rounded-full ${paypalStatus.configured ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                            {paypalStatus.configured ? 'Connected' : 'Not Configured'}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl text-center">
                                        <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Mode</p>
                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${paypalStatus.mode === 'sandbox' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                            {paypalStatus.mode === 'sandbox' ? '🧪 Sandbox' : '🔴 Live'}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl">
                                    <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">PayPal API Endpoints</p>
                                    <div className="space-y-2">
                                        {[
                                            { label: 'Create Order', path: '/payments/gateway/create-order' },
                                            { label: 'Capture Order', path: '/payments/gateway/capture-order' },
                                            { label: 'Webhook', path: '/payments/gateway/webhook' },
                                        ].map(ep => (
                                            <div key={ep.path} className="flex items-center justify-between text-xs">
                                                <span className="text-surface-500">{ep.label}</span>
                                                <code className="text-emerald-700 bg-surface-100 px-2 py-1 rounded text-[10px] font-mono border border-surface-200">{ep.path}</code>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={fetchPaypalStatus}
                                    className="btn btn-secondary w-full justify-center"
                                >
                                    <RefreshCw className="w-4 h-4" /> Refresh Status
                                </button>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-surface-400">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                <p className="text-xs">Loading PayPal status...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB: Lemon Squeezy ── */}
            {activeTab === 'lemonsqueezy' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="premium-card p-6">
                            <h3 className="text-sm font-semibold text-surface-900 border-b border-surface-200 pb-4 mb-5 flex items-center gap-2">
                                <Star className="w-4 h-4 text-amber-500 animate-pulse" /> Lemon Squeezy Integration
                            </h3>

                            {lemonsqueezyStatus ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl text-center">
                                            <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Connection Status</p>
                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${lemonsqueezyStatus.configured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                                                <div className={`w-2.5 h-2.5 rounded-full ${lemonsqueezyStatus.configured ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                                {lemonsqueezyStatus.configured ? 'Connected' : 'Disconnected'}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl text-center">
                                            <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-2">Active Mode</p>
                                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${lemonsqueezyStatus.mode === 'sandbox' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                                {lemonsqueezyStatus.mode === 'sandbox' ? '🧪 Sandbox / Test' : '🔴 Live / Production'}
                                            </div>
                                        </div>
                                    </div>

                                    {lemonsqueezyStatus.configured && (
                                        <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-surface-500 font-medium">Store Name:</span>
                                                <span className="text-surface-900 font-bold">{lemonsqueezyStatus.store_name}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-surface-500 font-medium">Store ID:</span>
                                                <span className="text-surface-900 font-mono font-bold">{lemonsqueezyStatus.store_id}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-surface-500 font-medium">Signing Secret:</span>
                                                <span className={`font-semibold ${lemonsqueezyStatus.signing_secret_configured ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {lemonsqueezyStatus.signing_secret_configured ? '✅ Configured' : '❌ Not Configured'}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl">
                                        <p className="text-xs text-surface-600 leading-relaxed">
                                            <strong className="text-surface-800">💡 Security Notice:</strong> Lemon Squeezy API keys and webhook secret signing keys are loaded securely from environment variables (Secrets) to protect your financial credentials.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-center text-surface-400">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    <p className="text-xs">Checking Lemon Squeezy status...</p>
                                </div>
                            )}
                        </div>

                        {/* Webhook Info */}
                        <div className="premium-card p-6">
                            <h3 className="text-sm font-semibold text-surface-900 border-b border-surface-200 pb-4 mb-5 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-emerald-500" /> Webhook Integration
                            </h3>

                            {lemonsqueezyStatus ? (
                                <div className="space-y-4">
                                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                        <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wide mb-1">Target Webhook URL</h4>
                                        <p className="text-xs text-indigo-700 leading-relaxed mb-3">
                                            Configure this webhook URL inside your Lemon Squeezy dashboard to sync active subscription states automatically.
                                        </p>
                                        <code className="block w-full p-2.5 bg-slate-900 text-slate-100 rounded text-[11px] font-mono select-all overflow-x-auto border border-slate-800">
                                            {lemonsqueezyStatus.webhook_target_url}
                                        </code>
                                    </div>

                                    {lemonsqueezyStatus.webhooks && lemonsqueezyStatus.webhooks.length > 0 ? (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Active Webhooks on Store</p>
                                            {lemonsqueezyStatus.webhooks.map((wh, idx) => (
                                                <div key={idx} className="p-3 bg-surface-50 border border-surface-200 rounded-xl flex flex-col gap-1.5">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="font-mono font-semibold text-surface-900 overflow-hidden text-ellipsis whitespace-nowrap max-w-[70%]">{wh.url}</span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${wh.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'} border`}>
                                                            {wh.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-[9px] text-surface-500 font-medium">Events: {wh.events.join(', ')}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800">
                                            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold">No Active Webhook Found</p>
                                                <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                                                    Please configure the webhook target URL in your Lemon Squeezy dashboard settings to ensure subscriptions renew correctly.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <button
                                        onClick={fetchLemonsqueezyStatus}
                                        className="btn btn-secondary w-full justify-center"
                                        disabled={loadingLs}
                                    >
                                        {loadingLs ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        Refresh Webhooks Status
                                    </button>
                                </div>
                            ) : (
                                <div className="py-8 text-center text-surface-400">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    <p className="text-xs">Checking webhooks...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Products and Variants */}
                    <div className="premium-card p-6">
                        <h3 className="text-sm font-semibold text-surface-900 border-b border-surface-200 pb-4 mb-5 flex items-center gap-2">
                            <Crown className="w-4 h-4 text-violet-500" /> Store Products & Variant Configuration
                        </h3>

                        {lemonsqueezyStatus ? (
                            lemonsqueezyStatus.variants && lemonsqueezyStatus.variants.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="table-premium w-full text-left">
                                        <thead>
                                            <tr>
                                                <th>Product Name</th>
                                                <th>Variant Name</th>
                                                <th className="text-center">Variant ID</th>
                                                <th className="text-center">Price</th>
                                                <th className="text-center">SaaS Config Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lemonsqueezyStatus.variants.map((v, idx) => {
                                                const SYSTEM_IDS = ["1748453", "1748330", "1748483", "1748646", "1748545"];
                                                const matchesSystem = SYSTEM_IDS.includes(String(v.variant_id));
                                                return (
                                                    <tr key={idx}>
                                                        <td className="font-semibold text-surface-800">{v.product_name}</td>
                                                        <td className="text-surface-600">{v.variant_name}</td>
                                                        <td className="text-center font-mono font-medium">{v.variant_id}</td>
                                                        <td className="text-center font-bold text-surface-700">${v.price.toFixed(2)}</td>
                                                        <td className="text-center">
                                                            {matchesSystem ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Matches SaaS
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-surface-100 text-surface-500 border border-surface-200">
                                                                    Custom Variant
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-6 text-center text-surface-400">
                                    <Zap className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                                    <p className="text-sm font-medium">No products or variants found in this store.</p>
                                </div>
                            )
                        ) : (
                            <div className="py-8 text-center text-surface-400">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                <p className="text-xs">Checking variants...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB: Automations ── */}
            {activeTab === 'automations' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="premium-card p-6">
                        <h3 className="text-sm font-semibold text-surface-900 border-b border-surface-200 pb-4 mb-5 flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-violet-500" /> Automation Rules
                        </h3>
                        <div className="space-y-3">
                            <Toggle
                                label="Auto-provision Academies"
                                desc="Automatically create schema and user when payment succeeds."
                                checked={config.auto_provision}
                                onChange={v => handleChange('auto_provision', v)}
                            />
                            <Toggle
                                label="Email Notifications"
                                desc="Send platform updates to all active academy admins."
                                checked={config.email_notifications}
                                onChange={v => handleChange('email_notifications', v)}
                            />
                            <Toggle
                                label="Database Backups"
                                desc="Run automatic nightly backups via Supabase."
                                checked={config.auto_backup}
                                onChange={v => handleChange('auto_backup', v)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
