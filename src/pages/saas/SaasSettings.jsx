import { useState, useEffect } from 'react';
import { Save, Loader2, CheckCircle2, Shield, Database, Globe, Key, RefreshCw, AlertCircle, CreditCard, Zap, Star, Crown, Users, UserCog, Dumbbell } from 'lucide-react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import { SkeletonDashboard } from '../../components/Skeleton';

export default function SaasSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('general');
    const [paypalStatus, setPaypalStatus] = useState(null);

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

    useEffect(() => {
        fetchSettings();
        fetchPaypalStatus();
    }, []);

    const fetchSettings = async () => {
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
    };

    const fetchPaypalStatus = async () => {
        try {
            const res = await fetch(`${API_URL}/payments/gateway/status`);
            if (res.ok) {
                const data = await res.json();
                setPaypalStatus(data);
            }
        } catch (err) {
            console.error("Failed to fetch PayPal status:", err);
        }
    };

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
        } catch (err) {
            setError('Network error.');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

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

    const tabs = [
        { id: 'general', label: 'General', icon: Globe },
        { id: 'plans', label: 'Plans & Limits', icon: Crown },
        { id: 'paypal', label: 'PayPal', icon: CreditCard },
        { id: 'automations', label: 'Automations', icon: RefreshCw },
    ];

    if (loading) return <SkeletonDashboard />;

    const PlanCard = ({ planKey, icon: Icon, colorBg, colorBorder, colorText  }) => {
        const nameKey = `plan_${planKey}_name`;
        const priceKey = `plan_${planKey}_price`;
        const playersKey = `plan_${planKey}_max_players`;
        const adminsKey = `plan_${planKey}_max_admins`;
        const coachesKey = `plan_${planKey}_max_coaches`;
        const isUnlimited = (val) => val === -1;

        return (
            <div className={`border ${colorBorder} bg-white rounded-2xl p-6 transition-all hover:shadow-md`}>
                <div className="flex items-center gap-3 mb-5">
                    <div className={`p-2.5 rounded-xl ${colorBg}`}>
                        <Icon className={`w-5 h-5 ${colorText}`} />
                    </div>
                    <input
                        type="text"
                        value={config[nameKey]}
                        onChange={e => handleChange(nameKey, e.target.value)}
                        className="bg-transparent font-bold text-lg text-surface-900 border-none outline-none w-full"
                    />
                </div>

                <div className="mb-5">
                    <label className="block text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">Monthly Price (MAD)</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={config[priceKey]}
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
                    ].map(({ key, label, icon: FieldIcon, default: def }) => (
                        <div key={key}>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                                <FieldIcon className="w-3 h-3" /> {label}
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={isUnlimited(config[key]) ? '' : config[key]}
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
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="page-title">System Settings</h2>
                    <p className="page-subtitle">Configure global SaaS platform settings.</p>
                </div>
                <div className="flex items-center gap-3">
                    {saved && (
                        <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium animate-fade-in">
                            <CheckCircle2 className="w-4 h-4" /> Saved!
                        </span>
                    )}
                    <button onClick={handleSave} disabled={saving} className="btn btn-brand">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Changes'}
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
                        <PlanCard planKey="free" icon={Zap} colorBg="bg-emerald-50" colorBorder="border-emerald-200" colorText="text-emerald-600" />
                        <PlanCard planKey="pro" icon={Star} colorBg="bg-blue-50" colorBorder="border-blue-200" colorText="text-blue-600" />
                        <PlanCard planKey="enterprise" icon={Crown} colorBg="bg-violet-50" colorBorder="border-violet-200" colorText="text-violet-600" />
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
