import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import {
    ArrowLeft, Loader2, AlertTriangle, Users, UserCog, GraduationCap,
    CreditCard, Activity, Building2, MapPin, Globe, Calendar,
    Shield, Layers, Eye, DollarSign, Clock, CheckCircle2, Ban,
    Mail, Phone, Briefcase, ChevronRight, FileText, LogIn, ExternalLink
} from 'lucide-react';

const TABS = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'staff', label: 'Staff', icon: UserCog },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'activity', label: 'Activity', icon: Activity },
];

const PLAN_STYLES = {
    free: { bg: 'bg-surface-100', text: 'text-surface-600', label: 'Free' },
    pro: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Pro' },
    enterprise: { bg: 'bg-violet-50', text: 'text-violet-700', label: 'Enterprise' },
};

const ACTIVITY_ICONS = {
    player_added: { icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    coach_added: { icon: GraduationCap, color: 'text-blue-500', bg: 'bg-blue-50' },
    payment: { icon: DollarSign, color: 'text-violet-500', bg: 'bg-violet-50' },
};

function UsageBar({ label, current, limit, icon: Icon }) {
    const unlimited = limit === -1;
    const pct = unlimited ? 0 : limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 100;
    const color = pct >= 90 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500';

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-surface-700">
                    <Icon className="w-3.5 h-3.5 text-surface-400" />
                    {label}
                </span>
                <span className="font-bold text-surface-900 tabular-nums">
                    {current}{unlimited ? '' : ` / ${limit}`}
                    {unlimited && <span className="text-surface-400 ml-1">∞</span>}
                </span>
            </div>
            {!unlimited && (
                <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${color}`}
                        style={{ width: `${pct}%` }} />
                </div>
            )}
        </div>
    );
}

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(d) {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(d);
}

export default function SaasAcademyDetail() {
    const { academyId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('overview');
    const [impersonating, setImpersonating] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            setError('');
            try {
                const res = await authFetch(`${API_URL}/saas/academies/${academyId}/details`);
                if (res.ok) {
                    setData(await res.json());
                } else {
                    setError('Failed to load academy details.');
                }
            } catch {
                setError('Network error.');
            } finally {
                setLoading(false);
            }
        })();
    }, [academyId]);

    if (loading) return (
        <div className="py-32 flex justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
    );

    if (error) return (
        <div className="py-20 flex flex-col items-center gap-3 text-rose-500">
            <AlertTriangle className="w-8 h-8" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={() => navigate('/saas/academies')} className="btn btn-secondary text-xs">← Back</button>
        </div>
    );

    const { academy, admins, coaches, players_recent, squads, payments, limits, activity, stats } = data;
    const plan = academy.plan_id || 'free';
    const ps = PLAN_STYLES[plan] || PLAN_STYLES.free;

    const handleImpersonate = async () => {
        setImpersonating(true);
        try {
            const res = await authFetch(`${API_URL}/saas/impersonate/${academyId}`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (data.method === 'magic_link' && data.action_link) {
                    window.open(data.action_link, '_blank');
                } else {
                    // Fallback: show admin email for manual login
                    alert(`Login as: ${data.admin?.email}\nUse their credentials to login manually.`);
                }
            } else {
                alert('Failed to generate impersonation link.');
            }
        } catch {
            alert('Network error.');
        } finally {
            setImpersonating(false);
        }
    };

    const openInvoice = (paymentId) => {
        window.open(`${API_URL}/saas/invoices/${academyId}/${paymentId}`, '_blank');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ── Header ── */}
            <div className="flex items-start gap-4">
                <button onClick={() => navigate('/saas/academies')}
                    className="mt-1 p-2 rounded-xl bg-surface-100 hover:bg-surface-200 border border-surface-200 transition-colors shrink-0">
                    <ArrowLeft className="w-4 h-4 text-surface-600" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-lg"
                            style={{ background: academy.primary_color || '#6366f1' }}>
                            {(academy.name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-surface-900 leading-tight">{academy.name}</h2>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {academy.subdomain && (
                                    <span className="text-xs text-surface-400 font-medium flex items-center gap-1">
                                        <Globe className="w-3 h-3" /> {academy.subdomain}.academy.com
                                    </span>
                                )}
                                {academy.city && (
                                    <span className="text-xs text-surface-400 font-medium flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {academy.city}
                                    </span>
                                )}
                                <span className="text-xs text-surface-400 font-medium flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {formatDate(academy.created_at)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleImpersonate}
                        disabled={impersonating}
                        className="btn text-xs px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        title="Login as this academy's admin"
                    >
                        {impersonating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                        Login As
                    </button>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase ${ps.bg} ${ps.text}`}>
                        {ps.label}
                    </span>
                    {academy.status === 'suspended' ? (
                        <span className="badge badge-suspended flex items-center gap-1">
                            <Ban className="w-3 h-3" /> Suspended
                        </span>
                    ) : (
                        <span className="badge badge-active flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                    )}
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-surface-100 rounded-xl p-1 w-fit">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                            tab === t.id
                                ? 'bg-white text-surface-900 shadow-sm'
                                : 'text-surface-500 hover:text-surface-700'
                        }`}
                    >
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Tab Content ── */}

            {/* Overview */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        {[
                            { label: 'Players', value: stats.total_players, icon: Users, gradient: 'from-emerald-500 to-teal-600' },
                            { label: 'Coaches', value: stats.total_coaches, icon: GraduationCap, gradient: 'from-blue-500 to-indigo-600' },
                            { label: 'Admins', value: stats.total_admins, icon: Shield, gradient: 'from-violet-500 to-purple-600' },
                            { label: 'Squads', value: stats.total_squads, icon: Layers, gradient: 'from-amber-500 to-orange-500' },
                            { label: 'Revenue', value: `${stats.revenue || 0} MAD`, icon: DollarSign, gradient: 'from-rose-500 to-pink-600' },
                        ].map((k, i) => (
                            <div key={i} className={`bg-gradient-to-br ${k.gradient} rounded-2xl p-4 text-white shadow-lg hover-lift`}>
                                <div className="p-2 rounded-xl bg-white/20 w-fit mb-2">
                                    <k.icon className="w-4 h-4" />
                                </div>
                                <p className="text-xl font-black tabular-nums">{k.value}</p>
                                <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mt-0.5">{k.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Plan Usage + Info */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="premium-card p-6">
                            <h3 className="text-sm font-bold text-surface-800 mb-5 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-indigo-500" />
                                Plan Usage
                            </h3>
                            <div className="space-y-4">
                                <UsageBar label="Players" current={stats.total_players} limit={limits.players} icon={Users} />
                                <UsageBar label="Coaches" current={stats.total_coaches} limit={limits.coaches} icon={GraduationCap} />
                                <UsageBar label="Admins" current={stats.total_admins} limit={limits.admins} icon={Shield} />
                            </div>
                        </div>

                        <div className="premium-card p-6">
                            <h3 className="text-sm font-bold text-surface-800 mb-5 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-violet-500" />
                                Academy Info
                            </h3>
                            <div className="space-y-3 text-sm">
                                {[
                                    { label: 'Academy ID', value: academy.id?.slice(0, 12) + '...' },
                                    { label: 'Subdomain', value: academy.subdomain || '—' },
                                    { label: 'Custom Domain', value: academy.custom_domain || '—' },
                                    { label: 'Domain Status', value: academy.domain_status || '—' },
                                    { label: 'Created', value: formatDate(academy.created_at) },
                                    { label: 'Notes', value: academy.notes || '—' },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-start">
                                        <span className="text-surface-500 font-medium">{item.label}</span>
                                        <span className="text-surface-900 font-semibold text-right max-w-[60%] break-all">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Squads */}
                    {squads.length > 0 && (
                        <div className="premium-card p-6">
                            <h3 className="text-sm font-bold text-surface-800 mb-4 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-amber-500" />
                                Squads ({squads.length})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {squads.map(s => (
                                    <div key={s.id} className="flex items-center gap-2 p-3 rounded-xl bg-surface-50 border border-surface-100">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-black">
                                            {(s.name || 'S').charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-surface-800 truncate">{s.name}</p>
                                            {s.category && <p className="text-[10px] text-surface-400">{s.category}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Staff */}
            {tab === 'staff' && (
                <div className="space-y-6">
                    {/* Admins */}
                    <div className="premium-card p-6">
                        <h3 className="text-sm font-bold text-surface-800 mb-4 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-violet-500" />
                            Admins ({admins.length})
                        </h3>
                        {admins.length > 0 ? (
                            <div className="space-y-3">
                                {admins.map(a => (
                                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 border border-surface-100 hover:border-surface-200 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center font-black text-sm">
                                            {(a.full_name || 'A').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-surface-900">{a.full_name || 'Unnamed'}</p>
                                            <p className="text-xs text-surface-400 flex items-center gap-1">
                                                <Mail className="w-3 h-3" /> {a.email}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${
                                            a.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-surface-100 text-surface-500'
                                        }`}>
                                            {a.status || 'active'}
                                        </span>
                                        <span className="text-[10px] text-surface-400">{formatDate(a.created_at)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-surface-400 py-6 text-center">No admins found.</p>
                        )}
                    </div>

                    {/* Coaches */}
                    <div className="premium-card p-6">
                        <h3 className="text-sm font-bold text-surface-800 mb-4 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-blue-500" />
                            Coaches ({coaches.length})
                        </h3>
                        {coaches.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {coaches.map(c => (
                                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-50 border border-surface-100">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-sm">
                                            {(c.full_name || 'C').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-surface-900">{c.full_name}</p>
                                            <div className="flex items-center gap-3 text-xs text-surface-400">
                                                {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                                                {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                                            </div>
                                            {c.specialty && (
                                                <span className="text-[10px] text-indigo-500 font-medium flex items-center gap-1 mt-0.5">
                                                    <Briefcase className="w-3 h-3" /> {c.specialty}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-surface-400 py-6 text-center">No coaches found.</p>
                        )}
                    </div>
                </div>
            )}

            {/* Players */}
            {tab === 'players' && (
                <div className="premium-card p-6">
                    <h3 className="text-sm font-bold text-surface-800 mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" />
                        Players ({data.players_count})
                        <span className="text-[10px] text-surface-400 font-normal ml-1">(showing latest 20)</span>
                    </h3>
                    {players_recent.length > 0 ? (
                        <div className="table-container">
                            <table className="table-premium w-full text-left">
                                <thead>
                                    <tr>
                                        <th>Player</th>
                                        <th>Position</th>
                                        <th>DOB</th>
                                        <th>Status</th>
                                        <th>Joined</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {players_recent.map(p => (
                                        <tr key={p.id}>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black">
                                                        {(p.full_name || 'P').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-semibold text-surface-900">{p.full_name || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="text-xs text-surface-500">{p.position || '—'}</td>
                                            <td className="text-xs text-surface-400">{p.date_of_birth ? formatDate(p.date_of_birth) : '—'}</td>
                                            <td>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${
                                                    p.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-surface-100 text-surface-500'
                                                }`}>
                                                    {p.status || 'active'}
                                                </span>
                                            </td>
                                            <td className="text-xs text-surface-400">{formatDate(p.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-surface-400 py-8 text-center">No players registered yet.</p>
                    )}
                </div>
            )}

            {/* Payments */}
            {tab === 'payments' && (
                <div className="premium-card p-6">
                    <h3 className="text-sm font-bold text-surface-800 mb-4 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-violet-500" />
                        Payment History ({payments.length})
                    </h3>
                    {payments.length > 0 ? (
                        <div className="table-container">
                            <table className="table-premium w-full text-left">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th className="text-right">Invoice</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((p, i) => (
                                        <tr key={p.id || i}>
                                            <td className="text-sm text-surface-700 font-medium">{p.description || '—'}</td>
                                            <td className="text-sm font-bold text-surface-900 tabular-nums">
                                                {p.amount} {p.currency || 'MAD'}
                                            </td>
                                            <td>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${
                                                    p.status === 'completed' ? 'bg-emerald-50 text-emerald-600'
                                                    : p.status === 'pending' ? 'bg-amber-50 text-amber-600'
                                                    : 'bg-rose-50 text-rose-600'
                                                }`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="text-xs text-surface-400">{formatDate(p.created_at)}</td>
                                            <td className="text-right">
                                                {p.id && (
                                                    <button
                                                        onClick={() => openInvoice(p.id)}
                                                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                                        title="View Invoice"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-surface-400 py-8 text-center">No payments recorded.</p>
                    )}
                </div>
            )}

            {/* Activity */}
            {tab === 'activity' && (
                <div className="premium-card p-6">
                    <h3 className="text-sm font-bold text-surface-800 mb-5 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        Recent Activity
                    </h3>
                    {activity.length > 0 ? (
                        <div className="relative">
                            <div className="absolute left-5 top-0 bottom-0 w-px bg-surface-100" />
                            <div className="space-y-1">
                                {activity.map((a, i) => {
                                    const style = ACTIVITY_ICONS[a.type] || ACTIVITY_ICONS.player_added;
                                    return (
                                        <div key={i} className="flex items-start gap-3 py-3 relative">
                                            <div className={`w-10 h-10 rounded-xl ${style.bg} ${style.color} flex items-center justify-center shrink-0 z-10`}>
                                                <style.icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <p className="text-sm text-surface-800 font-medium">
                                                    <span className="capitalize font-bold">{a.type.replace('_', ' ')}</span>
                                                    <ChevronRight className="w-3 h-3 inline mx-1 text-surface-300" />
                                                    {a.name}
                                                </p>
                                                <p className="text-[10px] text-surface-400 mt-0.5">{timeAgo(a.date)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-surface-400 py-8 text-center">No activity recorded yet.</p>
                    )}
                </div>
            )}
        </div>
    );
}
