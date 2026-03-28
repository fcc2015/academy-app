import React, { useState, useEffect } from 'react';
import { Shield, Users, CreditCard, Activity, TrendingUp } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { API_URL } from '../../config';

export default function SaasDashboard() {
    const { dir } = useLanguage();
    const [stats, setStats] = useState({ total_academies: 0, total_users: 0, total_mrr: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/saas/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch SaaS stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const statCards = [
        { title: 'Total Academies', value: stats.total_academies, icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { title: 'Registered Users', value: stats.total_users, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { title: 'Platform MRR', value: `$${stats.total_mrr}`, icon: TrendingUp, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        { title: 'Active Subscriptions', value: stats.total_academies, icon: CreditCard, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    ];

    if (loading) return <div className="text-slate-400">Loading platform metrics...</div>;

    return (
        <div className="space-y-6" dir={dir}>
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-100 tracking-tight">Platform Overview</h2>
                    <p className="text-slate-400 mt-1">Super Admin Dashboard for FC Casablanca SaaS.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
                {statCards.map((stat, index) => (
                    <div key={index} className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl">
                        <div className="p-6 flex items-center gap-4">
                            <div className={`p-4 rounded-2xl ${stat.bg}`}>
                                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                                <p className="text-3xl font-black text-slate-100 mt-1">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 bg-[#1e293b]/50 border border-slate-800 rounded-2xl p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
                <Activity className="w-16 h-16 text-slate-600 mb-4" />
                <h3 className="text-slate-300 font-bold text-lg">Detailed charts incoming in v2</h3>
                <p className="text-slate-500">Subscription growth and MRR analytics will appear here.</p>
            </div>
        </div>
    );
}
