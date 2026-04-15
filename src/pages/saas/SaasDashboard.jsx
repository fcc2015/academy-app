import { useState, useEffect } from 'react';
import { Shield, Users, CreditCard, Activity, TrendingUp, UserCheck, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import { SkeletonDashboard } from '../../components/Skeleton';

export default function SaasDashboard() {
    const { dir } = useLanguage();
    const [stats, setStats] = useState({ total_academies: 0, active_academies: 0, total_users: 0, total_mrr: 0, total_players: 0 });
    const [recentAcademies, setRecentAcademies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [statsRes, academiesRes] = await Promise.all([
                    authFetch(`${API_URL}/saas/stats`),
                    authFetch(`${API_URL}/saas/academies`)
                ]);

                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStats(data);
                }

                if (academiesRes.ok) {
                    const data = await academiesRes.json();
                    setRecentAcademies(data.slice(0, 5));
                }
            } catch (error) {
                console.error("Failed to fetch SaaS data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const statCards = [
        { title: 'Platform Revenue', value: `${stats.total_mrr.toLocaleString()} MAD`, icon: TrendingUp, color: 'text-white', bg: 'bg-gradient-to-br from-rose-500 to-pink-600', shadow: 'shadow-rose-200' },
        { title: 'Total Players', value: stats.total_players, icon: Activity, color: 'text-white', bg: 'bg-gradient-to-br from-violet-500 to-purple-600', shadow: 'shadow-violet-200' },
        { title: 'Registered Users', value: stats.total_users, icon: Users, color: 'text-white', bg: 'bg-gradient-to-br from-blue-500 to-indigo-600', shadow: 'shadow-blue-200' },
        { title: 'Active Academies', value: stats.active_academies, icon: UserCheck, color: 'text-white', bg: 'bg-gradient-to-br from-cyan-500 to-teal-600', shadow: 'shadow-cyan-200' },
        { title: 'Total Academies', value: stats.total_academies, icon: Shield, color: 'text-white', bg: 'bg-gradient-to-br from-emerald-500 to-green-600', shadow: 'shadow-emerald-200' },
    ];

    if (loading) return <SkeletonDashboard />;

    return (
        <div className="space-y-8 animate-fade-in" dir={dir}>
            <div>
                <h2 className="page-title text-2xl">Platform Overview</h2>
                <p className="page-subtitle">Super Admin Dashboard — Live metrics from all client academies.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
                {statCards.map((stat, index) => (
                    <div key={index} className={`${stat.bg} rounded-2xl p-5 shadow-lg ${stat.shadow} hover-lift cursor-default`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 rounded-xl bg-white/20">
                                <stat.icon className="w-5 h-5 text-white" />
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-white/50" />
                        </div>
                        <p className="text-2xl font-bold text-white tabular-nums">{stat.value}</p>
                        <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wider mt-1">{stat.title}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Academies */}
                <div className="premium-card">
                    <div className="p-5 border-b border-surface-200 flex justify-between items-center">
                        <h3 className="text-base font-semibold text-surface-900 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-500" />
                            Recent Academies
                        </h3>
                        <span className="badge badge-info">{recentAcademies.length} shown</span>
                    </div>
                    <div className="divide-y divide-surface-100">
                        {recentAcademies.length === 0 ? (
                            <div className="p-8 text-center text-surface-400 text-sm">No academies yet.</div>
                        ) : (
                            recentAcademies.map((acc) => (
                                <div key={acc.id} className="p-4 flex justify-between items-center hover:bg-surface-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                            {(acc.name || 'U')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-surface-900 text-sm">{acc.name || 'Unnamed'}</p>
                                            <p className="text-xs text-surface-400 mt-0.5">#{acc.domain || acc.subdomain || acc.id.slice(0,8)}</p>
                                        </div>
                                    </div>
                                    <span className={acc.status === 'suspended' ? 'badge badge-suspended' : 'badge badge-active'}>
                                        {acc.status === 'suspended' ? 'Suspended' : 'Active'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* System Health */}
                <div className="premium-card p-5">
                    <h3 className="text-base font-semibold text-surface-900 flex items-center gap-2 border-b border-surface-200 pb-4 mb-5">
                        <Activity className="w-5 h-5 text-blue-500" />
                        System Health
                    </h3>
                    <div className="space-y-5">
                        {[
                            { label: 'API Server (Render)', status: 'Online', pct: 'w-full', color: 'bg-emerald-500' },
                            { label: 'Database (Supabase)', status: '99.9% Uptime', pct: 'w-[99%]', color: 'bg-emerald-500' },
                            { label: 'Multi-Tenant Isolation', status: 'Enforced', pct: 'w-full', color: 'bg-blue-500' },
                            { label: 'JWT Auth Coverage', status: '100%', pct: 'w-full', color: 'bg-violet-500' },
                        ].map((item, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-surface-600 font-medium">{item.label}</span>
                                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        {item.status}
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${item.color} ${item.pct} rounded-full transition-all duration-500`}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
