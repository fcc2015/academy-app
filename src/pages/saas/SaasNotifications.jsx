import { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle, AlertTriangle, Loader2, RefreshCw, Users, UserCog, Dumbbell, Zap, Star, Crown } from 'lucide-react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';

const PLANS = {
    free:       { name: 'Free',       limits: { players: 15,   admins: 1, coaches: 1  } },
    pro:        { name: 'Pro',        limits: { players: 100,  admins: 4, coaches: 10 } },
    enterprise: { name: 'Enterprise', limits: { players: -1,   admins: -1, coaches: -1 } },
};

const THRESHOLDS = [
    { pct: 50,  label: '50%',  color: 'blue',   icon: AlertCircle,   desc: 'Half of plan limit reached' },
    { pct: 75,  label: '75%',  color: 'amber',  icon: AlertTriangle, desc: 'Three-quarters reached — plan upgrade recommended' },
    { pct: 90,  label: '90%',  color: 'orange', icon: AlertTriangle, desc: 'Critical — approaching plan limit' },
    { pct: 100, label: '100%', color: 'rose',   icon: AlertCircle,   desc: 'Plan limit exceeded — action required' },
];

function usagePct(current, limit) {
    if (limit === -1) return 0; // unlimited
    if (!limit || limit === 0) return 100;
    return Math.min(100, Math.round((current / limit) * 100));
}

function getBarColor(pct) {
    if (pct >= 100) return 'bg-rose-500';
    if (pct >= 90)  return 'bg-orange-500';
    if (pct >= 75)  return 'bg-amber-500';
    if (pct >= 50)  return 'bg-blue-500';
    return 'bg-emerald-500';
}

function getAlertLevel(pct) {
    if (pct >= 100) return { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-700',   label: 'CRITICAL' };
    if (pct >= 90)  return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'HIGH' };
    if (pct >= 75)  return { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  label: 'WARNING' };
    if (pct >= 50)  return { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   label: 'NOTICE' };
    return null;
}

export default function SaasNotifications() {
    const [academies, setAcademies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rules, setRules] = useState({
        pct50: true,
        pct75: true,
        pct90: true,
        pct100: true,
    });
    const [savingRules, setSavingRules] = useState(false);
    const [savedOk, setSavedOk] = useState(false);

    const fetchAcademies = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/saas/academies`);
            if (res.ok) {
                const data = await res.json();
                setAcademies(data);
            }
        } catch (err) {
            console.error('Failed to fetch academies:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAcademies(); }, []);

    // Enrich each academy with usage %
    const enriched = academies.map(acc => {
        const plan = PLANS[acc.plan_id] || PLANS.free;
        const players  = usagePct(acc.players_count  || 0, plan.limits.players);
        const admins   = usagePct(acc.admins_count   || 0, plan.limits.admins);
        const coaches  = usagePct(acc.coaches_count  || 0, plan.limits.coaches);
        const maxPct   = Math.max(players, admins, coaches);
        return { ...acc, plan, usage: { players, admins, coaches }, maxPct };
    });

    const atRisk    = enriched.filter(a => a.maxPct >= 75).sort((a, b) => b.maxPct - a.maxPct);
    const healthy   = enriched.filter(a => a.maxPct < 75);
    const critical  = enriched.filter(a => a.maxPct >= 100).length;
    const high      = enriched.filter(a => a.maxPct >= 90 && a.maxPct < 100).length;
    const warning   = enriched.filter(a => a.maxPct >= 75 && a.maxPct < 90).length;

    const [triggerResult, setTriggerResult] = useState(null);

    const handleTriggerNotifications = async () => {
        setSavingRules(true);
        setTriggerResult(null);
        try {
            const activeThresholds = [
                rules.pct50  && 50,
                rules.pct75  && 75,
                rules.pct90  && 90,
                rules.pct100 && 100,
            ].filter(Boolean);

            const res = await authFetch(`${API_URL}/saas/notifications/trigger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ thresholds: activeThresholds }),
            });
            if (res.ok) {
                const data = await res.json();
                setTriggerResult(data);
                setSavedOk(true);
                setTimeout(() => setSavedOk(false), 3000);
            }
        } catch (err) {
            console.error('Trigger failed:', err);
        }
        setSavingRules(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="page-title">Notifications</h2>
                    <p className="page-subtitle">Auto-alerts based on academy plan usage thresholds.</p>
                </div>
                <button onClick={fetchAcademies} className="btn btn-secondary">
                    <RefreshCw size={15} /> Refresh
                </button>
            </div>

            {/* Alert summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="premium-card p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-50"><AlertCircle className="w-5 h-5 text-rose-600" /></div>
                    <div>
                        <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Critical</p>
                        <p className="text-2xl font-bold text-surface-900">{critical}</p>
                    </div>
                </div>
                <div className="premium-card p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-orange-50"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
                    <div>
                        <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">High</p>
                        <p className="text-2xl font-bold text-surface-900">{high}</p>
                    </div>
                </div>
                <div className="premium-card p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-50"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
                    <div>
                        <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Warning</p>
                        <p className="text-2xl font-bold text-surface-900">{warning}</p>
                    </div>
                </div>
                <div className="premium-card p-4 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
                    <div>
                        <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider">Healthy</p>
                        <p className="text-2xl font-bold text-surface-900">{healthy.length}</p>
                    </div>
                </div>
            </div>

            {/* Notification Rules */}
            <div className="premium-card p-5">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-sm font-semibold text-surface-900">Auto-Notification Rules</h3>
                        <p className="text-xs text-surface-400 mt-0.5">Sends in-app alert to academy admin when usage reaches threshold</p>
                    </div>
                    <button
                        onClick={handleTriggerNotifications}
                        disabled={savingRules}
                        className="btn btn-brand text-xs px-3 py-1.5"
                    >
                        {savingRules ? <Loader2 size={13} className="animate-spin" /> : savedOk ? <CheckCircle2 size={13} /> : <Bell size={13} />}
                        {savedOk ? `Sent ${triggerResult?.notifications_sent ?? ''}!` : 'Trigger Now'}
                    </button>
                </div>
                {triggerResult && (
                    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 animate-fade-in">
                        ✅ {triggerResult.notifications_sent} notification(s) sent to at-risk academies.
                        {triggerResult.details?.map(d => (
                            <span key={d.academy} className="ml-2 font-semibold">{d.academy} ({d.threshold}%)</span>
                        ))}
                    </div>
                )}
                <div className="divide-y divide-surface-100">
                    {THRESHOLDS.map(t => {
                        const key = `pct${t.pct}`;
                        const Icon = t.icon;
                        return (
                            <div key={t.pct} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-${t.color}-50`}>
                                        <Icon className={`w-4 h-4 text-${t.color}-600`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-surface-800">{t.label} Usage Reached</p>
                                        <p className="text-xs text-surface-400">{t.desc}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setRules(r => ({ ...r, [key]: !r[key] }))}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${rules[key] ? 'bg-emerald-500' : 'bg-surface-300'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${rules[key] ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* At-Risk Academies */}
            <div className="premium-card">
                <div className="p-5 border-b border-surface-200">
                    <h3 className="text-sm font-semibold text-surface-900">Usage Monitor</h3>
                    <p className="text-xs text-surface-400 mt-0.5">Academies at 75%+ of plan limits are flagged</p>
                </div>
                {loading ? (
                    <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 text-emerald-500 animate-spin" /></div>
                ) : atRisk.length === 0 ? (
                    <div className="p-10 text-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                        <p className="text-surface-500 font-medium text-sm">All academies are within safe usage limits</p>
                    </div>
                ) : (
                    <div className="divide-y divide-surface-100">
                        {atRisk.map(acc => {
                            const alert = getAlertLevel(acc.maxPct);
                            return (
                                <div key={acc.id} className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-surface-100 border border-surface-200 flex items-center justify-center text-surface-700 font-bold text-sm">
                                                {(acc.name || 'A').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-surface-900 text-sm">{acc.name || 'Unnamed'}</p>
                                                <p className="text-xs text-surface-400">{acc.plan?.name} Plan</p>
                                            </div>
                                        </div>
                                        {alert && (
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${alert.bg} ${alert.border} ${alert.text}`}>
                                                {alert.label}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {[
                                            { label: 'Players',  pct: acc.usage.players,  Icon: Users },
                                            { label: 'Admins',   pct: acc.usage.admins,   Icon: UserCog },
                                            { label: 'Coaches',  pct: acc.usage.coaches,  Icon: Dumbbell },
                                        ].map(({ label, pct, Icon }) => (
                                            <div key={label} className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5 w-20 shrink-0">
                                                    <Icon className="w-3.5 h-3.5 text-surface-400" />
                                                    <span className="text-xs text-surface-500">{label}</span>
                                                </div>
                                                <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${getBarColor(pct)}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-semibold text-surface-700 w-9 text-right">{pct}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* All Academies Usage Table */}
            {!loading && healthy.length > 0 && (
                <div className="table-container">
                    <div className="p-5 border-b border-surface-200">
                        <h3 className="text-sm font-semibold text-surface-900">Healthy Academies</h3>
                    </div>
                    <table className="table-premium w-full text-left">
                        <thead>
                            <tr>
                                <th>Academy</th>
                                <th>Plan</th>
                                <th>Players</th>
                                <th>Admins</th>
                                <th>Coaches</th>
                            </tr>
                        </thead>
                        <tbody>
                            {healthy.map(acc => (
                                <tr key={acc.id}>
                                    <td className="font-medium text-surface-900">{acc.name || 'Unnamed'}</td>
                                    <td className="text-surface-500">{acc.plan?.name}</td>
                                    {[acc.usage.players, acc.usage.admins, acc.usage.coaches].map((pct, i) => (
                                        <td key={i}>
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${getBarColor(pct)}`} style={{ width: `${pct}%` }} />
                                                </div>
                                                <span className="text-xs text-surface-500">{pct}%</span>
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
