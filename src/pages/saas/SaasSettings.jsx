import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, CheckCircle2, Shield, Bell, Database, Globe, Key, RefreshCw, AlertCircle } from 'lucide-react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';

export default function SaasSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    
    const [config, setConfig] = useState({
        platform_name: 'Academy SaaS Platform',
        support_email: 'support@academy.com',
        default_trial_days: 14,
        max_players_starter: 50,
        max_players_pro: 200,
        max_coaches_starter: 2,
        max_coaches_pro: 10,
        auto_provision: true,
        email_notifications: true,
        auto_backup: true,
        maintenance_mode: false,
        paypal_sandbox: true,
    });

    useEffect(() => {
        fetchSettings();
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
                className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${checked ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-1'}`} />
            </div>
        </label>
    );

    if (loading) {
        return (
            <div className="py-20 flex justify-center text-emerald-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
        );
    }

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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* General Configuration */}
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6">
                    <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-4 mb-5 flex items-center gap-2">
                        <Globe className="w-4.5 h-4.5 text-emerald-400" /> General Configuration
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Platform Name</label>
                            <input
                                type="text"
                                value={config.platform_name}
                                onChange={e => handleChange('platform_name', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Support Email</label>
                            <input
                                type="email"
                                value={config.support_email}
                                onChange={e => handleChange('support_email', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Default Free Trial (Days)</label>
                            <input
                                type="number"
                                value={config.default_trial_days}
                                onChange={e => handleChange('default_trial_days', parseInt(e.target.value) || 0)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Plan Limits */}
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6">
                    <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-4 mb-5 flex items-center gap-2">
                        <Shield className="w-4.5 h-4.5 text-blue-400" /> Plan Limits
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Starter: Max Players</label>
                                <input
                                    type="number"
                                    value={config.max_players_starter}
                                    onChange={e => handleChange('max_players_starter', parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Starter: Max Coaches</label>
                                <input
                                    type="number"
                                    value={config.max_coaches_starter}
                                    onChange={e => handleChange('max_coaches_starter', parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pro: Max Players</label>
                                <input
                                    type="number"
                                    value={config.max_players_pro}
                                    onChange={e => handleChange('max_players_pro', parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pro: Max Coaches</label>
                                <input
                                    type="number"
                                    value={config.max_coaches_pro}
                                    onChange={e => handleChange('max_coaches_pro', parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Automations */}
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6">
                    <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-4 mb-5 flex items-center gap-2">
                        <RefreshCw className="w-4.5 h-4.5 text-violet-400" /> Automations
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

                {/* Advanced */}
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6">
                    <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-4 mb-5 flex items-center gap-2">
                        <Key className="w-4.5 h-4.5 text-amber-400" /> Advanced
                    </h3>
                    <div className="space-y-3">
                        <Toggle
                            label="PayPal Sandbox Mode"
                            desc="Use PayPal sandbox for testing payments. Disable for production."
                            checked={config.paypal_sandbox}
                            onChange={v => handleChange('paypal_sandbox', v)}
                        />
                        <Toggle
                            label="Maintenance Mode"
                            desc="Show maintenance page to all academy clients. SaaS portal remains accessible."
                            checked={config.maintenance_mode}
                            onChange={v => handleChange('maintenance_mode', v)}
                        />

                        {/* API Endpoints Info */}
                        <div className="mt-4 p-4 bg-slate-800/20 border border-slate-700/50 rounded-xl">
                            <h4 className="font-bold text-slate-300 text-sm mb-2 flex items-center gap-2">
                                <Database className="w-4 h-4 text-emerald-400" /> API Status
                            </h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Backend API</span>
                                    <span className="text-emerald-400 font-bold">● Connected</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">PayPal Gateway</span>
                                    <span className={`font-bold ${config.paypal_sandbox ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {config.paypal_sandbox ? '● Sandbox' : '● Live'}
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
        </div>
    );
}
