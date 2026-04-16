import { useState, useEffect } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    TrendingUp, Users, Building2, DollarSign,
    Activity, AlertTriangle, RefreshCw, Loader2
} from 'lucide-react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';

const PLAN_COLORS = { free: '#10b981', pro: '#3b82f6', enterprise: '#8b5cf6' };
const CITY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

function shortMonth(ym) {
    const [y, m] = ym.split('-');
    const d = new Date(Number(y), Number(m) - 1);
    return d.toLocaleString('default', { month: 'short' });
}

const CustomTooltip = ({ active, payload, label, suffix = '' }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-surface-200 rounded-xl shadow-xl p-3 text-xs">
            <p className="font-bold text-surface-700 mb-2">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-surface-500">{p.name}:</span>
                    <span className="font-bold text-surface-800">{p.value}{suffix}</span>
                </div>
            ))}
        </div>
    );
};

export default function SaasAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchAnalytics = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await authFetch(`${API_URL}/saas/analytics`);
            if (res.ok) {
                setData(await res.json());
            } else {
                setError('Failed to load analytics.');
            }
        } catch {
            setError('Network error.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAnalytics(); }, []);

    if (loading) return (
        <div className="py-32 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
    );

    if (error) return (
        <div className="py-20 flex flex-col items-center gap-3 text-rose-500">
            <AlertTriangle className="w-8 h-8" />
            <p className="text-sm font-medium">{error}</p>
            <button onClick={fetchAnalytics} className="btn btn-secondary text-xs">Retry</button>
        </div>
    );

    const kpis = [
        {
            label: 'Current MRR',
            value: `${(data.current_mrr || 0).toLocaleString()} MAD`,
            icon: DollarSign,
            gradient: 'from-violet-500 to-purple-600',
            shadow: 'shadow-violet-500/20',
        },
        {
            label: 'Total Academies',
            value: data.total_academies,
            icon: Building2,
            gradient: 'from-indigo-500 to-blue-600',
            shadow: 'shadow-indigo-500/20',
        },
        {
            label: 'Active Academies',
            value: data.active_academies,
            icon: Activity,
            gradient: 'from-emerald-500 to-teal-600',
            shadow: 'shadow-emerald-500/20',
        },
        {
            label: 'ARPU',
            value: `${data.arpu || 0} MAD`,
            icon: TrendingUp,
            gradient: 'from-amber-500 to-orange-500',
            shadow: 'shadow-amber-500/20',
        },
        {
            label: 'Suspended',
            value: data.suspended_academies,
            icon: Users,
            gradient: 'from-rose-500 to-pink-600',
            shadow: 'shadow-rose-500/20',
        },
        {
            label: 'Churn Rate',
            value: `${data.churn_rate || 0}%`,
            icon: AlertTriangle,
            gradient: 'from-slate-500 to-slate-700',
            shadow: 'shadow-slate-500/20',
        },
    ];

    // Format growth data with short month labels
    const growthData = (data.monthly_growth || []).map(d => ({
        ...d, label: shortMonth(d.month)
    }));
    const revenueData = (data.monthly_revenue || []).map(d => ({
        ...d, label: shortMonth(d.month)
    }));

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="page-title">Analytics</h2>
                    <p className="page-subtitle">Platform growth, revenue & distribution insights.</p>
                </div>
                <button onClick={fetchAnalytics} className="btn btn-secondary">
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {kpis.map((k, i) => (
                    <div key={i} className={`bg-gradient-to-br ${k.gradient} rounded-2xl p-4 text-white shadow-lg ${k.shadow} hover-lift`}>
                        <div className="p-2 rounded-xl bg-white/20 w-fit mb-3">
                            <k.icon className="w-4 h-4" />
                        </div>
                        <p className="text-xl font-black tabular-nums leading-tight">{k.value}</p>
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mt-1">{k.label}</p>
                    </div>
                ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Academy Growth */}
                <div className="premium-card p-6">
                    <h3 className="text-sm font-bold text-surface-800 mb-5 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-500" />
                        Academy Growth (12 months)
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={growthData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradNew" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                            <Area type="monotone" dataKey="total" name="Total" stroke="#6366f1" strokeWidth={2} fill="url(#gradTotal)" />
                            <Area type="monotone" dataKey="new" name="New" stroke="#10b981" strokeWidth={2} fill="url(#gradNew)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* MRR Trend */}
                <div className="premium-card p-6">
                    <h3 className="text-sm font-bold text-surface-800 mb-5 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-violet-500" />
                        Revenue Trend (12 months)
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip content={<CustomTooltip suffix=" MAD" />} />
                            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#8b5cf6" strokeWidth={2} fill="url(#gradRevenue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Plan Distribution */}
                <div className="premium-card p-6">
                    <h3 className="text-sm font-bold text-surface-800 mb-5 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        Plan Distribution
                    </h3>
                    {data.plan_distribution?.length > 0 ? (
                        <div className="flex items-center gap-6">
                            <ResponsiveContainer width="50%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={data.plan_distribution}
                                        dataKey="count"
                                        nameKey="plan"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={80}
                                        paddingAngle={3}
                                    >
                                        {data.plan_distribution.map((entry, i) => (
                                            <Cell key={i} fill={PLAN_COLORS[entry.plan] || '#94a3b8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [v, n]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-3">
                                {data.plan_distribution.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full" style={{ background: PLAN_COLORS[p.plan] || '#94a3b8' }} />
                                            <span className="text-sm font-semibold text-surface-700 capitalize">{p.plan}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-surface-900">{p.count}</span>
                                            <span className="text-[10px] text-surface-400 font-medium">
                                                {data.total_academies > 0
                                                    ? Math.round(p.count / data.total_academies * 100)
                                                    : 0}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="py-10 text-center text-surface-400 text-sm">No data yet.</div>
                    )}
                </div>

                {/* City Distribution */}
                <div className="premium-card p-6">
                    <h3 className="text-sm font-bold text-surface-800 mb-5 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        City Distribution
                    </h3>
                    {data.city_distribution?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                                data={data.city_distribution}
                                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="city" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="count" name="Academies" radius={[6, 6, 0, 0]}>
                                    {data.city_distribution.map((_, i) => (
                                        <Cell key={i} fill={CITY_COLORS[i % CITY_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="py-10 text-center text-surface-400 text-sm">No data yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
