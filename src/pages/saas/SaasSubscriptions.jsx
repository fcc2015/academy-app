import { useState, useEffect } from 'react';
import { CreditCard, History, Building2, CheckCircle2, Loader2, Ban, Users } from 'lucide-react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';

export default function SaasSubscriptions() {
    const [academies, setAcademies] = useState([]);
    const [stats, setStats] = useState({ total_academies: 0, active_academies: 0, total_mrr: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [academiesRes, statsRes] = await Promise.all([
                    authFetch(`${API_URL}/saas/academies`),
                    authFetch(`${API_URL}/saas/stats`)
                ]);

                if (academiesRes.ok) {
                    const data = await academiesRes.json();
                    setAcademies(data);
                }
                
                if (statsRes.ok) {
                    const data = await statsRes.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch subscription data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const activeCount = academies.filter(a => a.status !== 'suspended').length;
    const suspendedCount = academies.filter(a => a.status === 'suspended').length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-100 tracking-tight">Subscriptions & Billing</h2>
                    <p className="text-slate-400 mt-1">Manage billing status for all client academies.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6 flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/10">
                        <CreditCard className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Active Plans</p>
                        <p className="text-3xl font-black text-slate-100 mt-1">{activeCount}</p>
                    </div>
                </div>
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6 flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-rose-500/10">
                        <History className="w-8 h-8 text-rose-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</p>
                        <p className="text-3xl font-black text-slate-100 mt-1">{stats.total_mrr.toLocaleString()} MAD</p>
                    </div>
                </div>
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6 flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-amber-500/10">
                        <Ban className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Suspended</p>
                        <p className="text-3xl font-black text-slate-100 mt-1">{suspendedCount}</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center text-emerald-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : (
                <div className="mt-8 border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-800/60">
                        <h3 className="text-lg font-bold text-slate-200">Academy Billing Overview</h3>
                    </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-widest font-bold">
                                <th className="p-4 font-semibold">Academy</th>
                                <th className="p-4 font-semibold">Subdomain</th>
                                <th className="p-4 font-semibold">Created</th>
                                <th className="p-4 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {academies.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-8 text-slate-500">No academies found.</td></tr>
                            ) : (
                                academies.map(acc => (
                                    <tr key={acc.id} className="hover:bg-slate-800/20 transition-colors">
                                        <td className="p-4 font-medium text-slate-200 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                                                {(acc.name || 'U').charAt(0)}
                                            </div>
                                            {acc.name || 'Unnamed Academy'}
                                        </td>
                                        <td className="p-4 text-slate-400 text-sm">
                                            {acc.subdomain ? (
                                                <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-semibold">{acc.subdomain}</span>
                                            ) : (
                                                <span className="text-slate-600">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-slate-400 text-sm">{new Date(acc.created_at).toLocaleDateString()}</td>
                                        <td className="p-4">
                                            {acc.status === 'suspended' ? (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-400/10 px-3 py-1 rounded-full w-max">
                                                    <Ban className="w-3.5 h-3.5" />
                                                    Suspended
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full w-max">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                </div>
            )}
        </div>
    );
}
