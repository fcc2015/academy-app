import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, CheckCircle2, Shield, Bell, Database, Globe, Key, RefreshCw, AlertCircle, CreditCard, Zap, Star, Crown, Users, UserCog, Dumbbell } from 'lucide-react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';

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
        // Plan: Free
        plan_free_name: 'Free',
        plan_free_price: 0,
        plan_free_max_players: 15,
        plan_free_max_admins: 1,
        plan_free_max_coaches: 1,
        // Plan: Pro
        plan_pro_name: 'Pro',
        plan_pro_price: 499,
        plan_pro_max_players: 100,
        plan_pro_max_admins: 4,
        plan_pro_max_coaches: 10,
        // Plan: Enterprise
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
        <label className="flex items-center justify-between p-4 bg-slate-800/20 border border-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors">
            <div>
                <h4 className="font-bold text-slate-200 text-sm">{label}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </div>
            <div
                onClick={() => onChange(!checked)}
                className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 shrink-0 ml-4 ${checked ? 'bg-emerald-500' : 'bg-slate-700'}`}
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

    if (loading) {
        return (
            <div className="py-20 flex justify-center text-emerald-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
        );
    }

    const PlanCard = ({ planKey, icon: Icon, color, colorBg, colorBorder, colorText }) => {
        const nameKey = `plan_${planKey}_name`;
        const priceKey = `plan_${planKey}_price`;
        const playersKey = `plan_${planKey}_max_players`;
        const adminsKey = `plan_${planKey}_max_admins`;
        const coachesKey = `plan_${planKey}_max_coaches`;
        const isUnlimited = (val) => val === -1;
        
        return (
            <div className={`border ${colorBorder} bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6 transition-all hover:scale-[1.01]`}>
                <div className="flex items-center gap-3 mb-5">
                    <div className={`p-2.5 rounded-xl ${colorBg}`}>
                        <Icon className={`w-5 h-5 ${colorText}`} />
                    </div>
                    <div>
                        <input
                            type="text"
                            value={config[nameKey]}
                            onChange={e => handleChange(nameKey, e.target.value)}
                            className="bg-transparent font-bold text-lg text-slate-100 border-none outline-none w-full"
                        />
                    </div>
                </div>

                {/* Price */}
                <div className="mb-5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Monthly Price (MAD)</label>
                    <div className="relative">
                        <input
                            type="number"
                            value={config[priceKey]}
                            onChange={e => handleChange(priceKey, parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors text-sm pr-16"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">MAD/mo</span>
                    </div>
                </div>

                {/* Limits */}
                <div className="space-y-3">
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            <Users className="w-3 h-3" /> Max Players
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={isUnlimited(config[playersKey]) ? '' : config[playersKey]}
                                onChange={e => handleChange(playersKey, e.target.value === '' ? -1 : parseInt(e.target.value) || 0)}
                                placeholder="∞ Unlimited"
                                disabled={isUnlimited(config[playersKey])}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors text-sm disabled:opacity-40"
                            />
                            <button
                                onClick={() => handleChange(playersKey, isUnlimited(config[playersKey]) ? 50 : -1)}
                                className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors ${isUnlimited(config[playersKey]) ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-600'}`}
                            >
                                ∞
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            <UserCog className="w-3 h-3" /> Max Admins
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={isUnlimited(config[adminsKey]) ? '' : config[adminsKey]}
                                onChange={e => handleChange(adminsKey, e.target.value === '' ? -1 : parseInt(e.target.value) || 0)}
                                placeholder="∞ Unlimited"
                                disabled={isUnlimited(config[adminsKey])}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors text-sm disabled:opacity-40"
                            />
                            <button
                                onClick={() => handleChange(adminsKey, isUnlimited(config[adminsKey]) ? 2 : -1)}
                                className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors ${isUnlimited(config[adminsKey]) ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-600'}`}
                            >
                                ∞
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            <Dumbbell className="w-3 h-3" /> Max Coaches
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={isUnlimited(config[coachesKey]) ? '' : config[coachesKey]}
                                onChange={e => handleChange(coachesKey, e.target.value === '' ? -1 : parseInt(e.target.value) || 0)}
                                placeholder="∞ Unlimited"
                                disabled={isUnlimited(config[coachesKey])}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors text-sm disabled:opacity-40"
                            />
                            <button
                                onClick={() => handleChange(coachesKey, isUnlimited(config[coachesKey]) ? 5 : -1)}
                                className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors ${isUnlimited(config[coachesKey]) ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-600'}`}
                            >
                                ∞
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-100 tracking-tight">System Settings</h2>
                    <p className="text-slate-400 mt-1">Configure global SaaS platform settings.</p>
                </div>
                <div className="flex items-center gap-3">
                    {saved && (
                        <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-bold animate-fade-in">
                            <CheckCircle2 className="w-4 h-4" /> Saved!
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800 mt-4">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
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
                    <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6">
                        <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-4 mb-5 flex items-center gap-2">
                            <Globe className="w-4.5 h-4.5 text-emerald-400" /> Platform Configuration
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Platform Name</label>
                                <input type="text" value={config.platform_name} onChange={e => handleChange('platform_name', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Support Email</label>
                                <input type="email" value={config.support_email} onChange={e => handleChange('support_email', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Default Free Trial (Days)</label>
                                <input type="number" value={config.default_trial_days} onChange={e => handleChange('default_trial_days', parseInt(e.target.value) || 0)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors text-sm" />
                            </div>
                        </div>
                    </div>

                    <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6">
                        <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-4 mb-5 flex items-center gap-2">
                            <Key className="w-4.5 h-4.5 text-amber-400" /> Advanced
                        </h3>
                        <div className="space-y-3">
                            <Toggle
                                label="Maintenance Mode"
                                desc="Show maintenance page to all academy clients."
                                checked={config.maintenance_mode}
                                onChange={v => handleChange('maintenance_mode', v)}
                            />
                            <div className="mt-4 p-4 bg-slate-800/20 border border-slate-700/50 rounded-xl">
                                <h4 className="font-bold text-slate-300 text-sm mb-2 flex items-center gap-2">
                                    <Database className="w-4 h-4 text-emerald-400" /> System Status
                                </h4>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Backend API</span>
                                        <span className="text-emerald-400 font-bold">● Connected</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">PayPal Gateway</span>
                                        <span className={`font-bold ${paypalStatus?.configured ? (paypalStatus?.mode === 'sandbox' ? 'text-amber-400' : 'text-emerald-400') : 'text-rose-400'}`}>
                                            {paypalStatus?.configured ? (paypalStatus?.mode === 'sandbox' ? '● Sandbox' : '● Live') : '● Not Configured'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Database</span>
                                        <span className="text-emerald-400 font-bold">● Supabase</span>
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
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-blue-300">Plan Limits Configuration</p>
                            <p className="text-xs text-blue-400/70 mt-1">
                                Define the resource limits for each plan. Set -1 or click ∞ for unlimited. These limits are enforced when academies try to add players, coaches, or admins.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <PlanCard
                            planKey="free"
                            icon={Zap}
                            color="emerald"
                            colorBg="bg-emerald-500/10"
                            colorBorder="border-emerald-500/20"
                            colorText="text-emerald-400"
                        />
                        <PlanCard
                            planKey="pro"
                            icon={Star}
                            color="blue"
                            colorBg="bg-blue-500/10"
                            colorBorder="border-blue-500/20"
                            colorText="text-blue-400"
                        />
                        <PlanCard
                            planKey="enterprise"
                            icon={Crown}
                            color="violet"
                            colorBg="bg-violet-500/10"
                            colorBorder="border-violet-500/20"
                            colorText="text-violet-400"
                        />
                    </div>

                    {/* Preview Summary */}
                    <div className="mt-6 border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800/60">
                            <h4 className="text-sm font-bold text-slate-300">Plans Summary Preview</h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-widest font-bold">
                                        <th className="p-4">Plan</th>
                                        <th className="p-4 text-center">Price</th>
                                        <th className="p-4 text-center">Players</th>
                                        <th className="p-4 text-center">Admins</th>
                                        <th className="p-4 text-center">Coaches</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {['free', 'pro', 'enterprise'].map(key => {
                                        const fmt = (v) => v === -1 ? '∞' : v;
                                        return (
                                            <tr key={key} className="hover:bg-slate-800/20">
                                                <td className="p-4 font-bold text-slate-200 text-sm">{config[`plan_${key}_name`]}</td>
                                                <td className="p-4 text-center text-sm text-slate-300">{config[`plan_${key}_price`] === 0 ? <span className="text-emerald-400 font-bold">FREE</span> : <>{config[`plan_${key}_price`]} <span className="text-slate-500 text-xs">MAD</span></>}</td>
                                                <td className="p-4 text-center text-sm text-slate-300 font-mono">{fmt(config[`plan_${key}_max_players`])}</td>
                                                <td className="p-4 text-center text-sm text-slate-300 font-mono">{fmt(config[`plan_${key}_max_admins`])}</td>
                                                <td className="p-4 text-center text-sm text-slate-300 font-mono">{fmt(config[`plan_${key}_max_coaches`])}</td>
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
                    <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6">
                        <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-4 mb-5 flex items-center gap-2">
                            <CreditCard className="w-4.5 h-4.5 text-blue-400" /> PayPal Configuration
                        </h3>
                        <div className="space-y-4">
                            <Toggle
                                label="Sandbox Mode"
                                desc="Use PayPal sandbox for testing. Disable for live payments."
                                checked={config.paypal_sandbox}
                                onChange={v => handleChange('paypal_sandbox', v)}
                            />

                            <div className={`p-4 rounded-xl border ${config.paypal_sandbox ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-2 h-2 rounded-full ${config.paypal_sandbox ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
                                    <span className={`text-sm font-bold ${config.paypal_sandbox ? 'text-amber-300' : 'text-emerald-300'}`}>
                                        {config.paypal_sandbox ? 'SANDBOX MODE' : 'LIVE / PRODUCTION MODE'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    {config.paypal_sandbox
                                        ? 'Payments will use PayPal sandbox. No real money will be charged.'
                                        : '⚠️ LIVE MODE — Real payments will be processed. Make sure your credentials are correct!'
                                    }
                                </p>
                            </div>

                            <div className="mt-2 p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    <strong className="text-slate-300">💡 Note:</strong> PayPal Client ID and Client Secret are configured as environment variables on your backend server (Render). 
                                    To update them, go to your <strong className="text-blue-400">Render Dashboard → Environment Variables</strong>.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6">
                        <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-4 mb-5 flex items-center gap-2">
                            <Shield className="w-4.5 h-4.5 text-emerald-400" /> Gateway Status
                        </h3>

                        {paypalStatus ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl text-center">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Status</p>
                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${paypalStatus.configured ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                                            <div className={`w-2.5 h-2.5 rounded-full ${paypalStatus.configured ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                                            {paypalStatus.configured ? 'Connected' : 'Not Configured'}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl text-center">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Mode</p>
                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${paypalStatus.mode === 'sandbox' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                                            {paypalStatus.mode === 'sandbox' ? '🧪 Sandbox' : '🔴 Live'}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">PayPal API Endpoints</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">Create Order</span>
                                            <code className="text-emerald-400 bg-slate-900 px-2 py-1 rounded text-[10px] font-mono">/payments/gateway/create-order</code>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">Capture Order</span>
                                            <code className="text-emerald-400 bg-slate-900 px-2 py-1 rounded text-[10px] font-mono">/payments/gateway/capture-order</code>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-400">Webhook</span>
                                            <code className="text-emerald-400 bg-slate-900 px-2 py-1 rounded text-[10px] font-mono">/payments/gateway/webhook</code>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={fetchPaypalStatus}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/50 border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition-colors text-sm"
                                >
                                    <RefreshCw className="w-4 h-4" /> Refresh Status
                                </button>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-slate-500">
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
                    <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6">
                        <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-4 mb-5 flex items-center gap-2">
                            <RefreshCw className="w-4.5 h-4.5 text-violet-400" /> Automation Rules
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
