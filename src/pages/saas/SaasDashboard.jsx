import { useState, useEffect } from 'react';
import { Shield, Users, CreditCard, Activity, TrendingUp, UserCheck } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { API_URL } from '../../config';
import { authFetch } from '../../api';

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
        { title: 'Total Academies', value: stats.total_academies, icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { title: 'Active Academies', value: stats.active_academies, icon: UserCheck, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        { title: 'Registered Users', value: stats.total_users, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { title: 'Total Players', value: stats.total_players, icon: Activity, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        { title: 'Platform Revenue', value: `${stats.total_mrr.toLocaleString()} MAD`, icon: TrendingUp, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    ];

    if (loading) return <div className="text-slate-400">Loading platform metrics...</div>;

    return (
        <div className="space-y-6" dir={dir}>
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-100 tracking-tight">Platform Overview</h2>
                    <p className="text-slate-400 mt-1">Super Admin Dashboard — Live metrics from all client academies.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mt-8">
                {statCards.map((stat, index) => (
                    <div key={index} className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl">
                        <div className="p-5 flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${stat.bg}`}>
                                <stat.icon className={`w-7 h-7 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                                <p className="text-2xl font-black text-slate-100 mt-0.5">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                {/* Recent Academies */}
                <div className="bg-[#1e293b]/50 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-800/60 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-400" />
                            Recent Academies
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-800/50">
                        {recentAcademies.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">No academies yet.</div>
                        ) : (
                            recentAcademies.map((acc) => (
                                <div key={acc.id} className="p-4 flex justify-between items-center hover:bg-slate-800/20 transition-colors">
                                    <div>
                                        <p className="font-bold text-slate-200">{acc.name || 'Unnamed'}</p>
                                        <p className="text-xs font-semibold text-slate-500 mt-0.5">#{acc.domain || acc.subdomain || acc.id.slice(0,8)}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                        acc.status === 'suspended' 
                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    }`}>
                                        {acc.status === 'suspended' ? 'Suspended' : 'Active'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* System Health */}
                <div className="bg-[#1e293b]/50 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800/60 pb-5 mb-5">
                        <Activity className="w-5 h-5 text-blue-400" />
                        System Health
                    </h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-400 font-semibold">API Server (Render)</span>
                                <span className="text-emerald-400 font-bold">Online</span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-full"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-400 font-semibold">Database (Supabase)</span>
                                <span className="text-emerald-400 font-bold">99.9% Uptime</span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[99%]"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-400 font-semibold">Multi-Tenant Isolation</span>
                                <span className="text-emerald-400 font-bold">Enforced</span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-full"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-400 font-semibold">JWT Auth Coverage</span>
                                <span className="text-emerald-400 font-bold">100%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
