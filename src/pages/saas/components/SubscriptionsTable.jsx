import { CreditCard, DollarSign, History, Ban, RefreshCw, ArrowUpRight, CheckCircle2, Clock, Loader2 } from 'lucide-react';

export default function SubscriptionsTable({
    loading,
    academies,
    activeCount,
    suspendedCount,
    mrr,
    stats,
    PLANS,
    formatLimit,
    fetchData,
    setSelectedAcademy,
    setShowPlanModal,
    setShowProRata,
    viewHistory
}) {
    if (loading) {
        return (
            <div className="py-20 flex justify-center text-emerald-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger-children">
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-500/20 hover-lift">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm"><CreditCard className="w-5 h-5" /></div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-100">Active Plans</p>
                    </div>
                    <p className="text-4xl font-black relative z-10 tabular-nums">{activeCount}</p>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-violet-500/20 hover-lift">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm"><DollarSign className="w-5 h-5" /></div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-violet-100">Monthly MRR</p>
                    </div>
                    <p className="text-4xl font-black relative z-10 tabular-nums">{mrr.toLocaleString()} <span className="text-lg font-bold text-violet-200">MAD</span></p>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20 hover-lift">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm"><History className="w-5 h-5" /></div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-100">Total Revenue</p>
                    </div>
                    <p className="text-4xl font-black relative z-10 tabular-nums">{stats.total_mrr?.toLocaleString() || 0} <span className="text-lg font-bold text-blue-200">MAD</span></p>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-amber-500/20 hover-lift">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm"><Ban className="w-5 h-5" /></div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-100">Suspended</p>
                    </div>
                    <p className="text-4xl font-black relative z-10 tabular-nums">{suspendedCount}</p>
                </div>
            </div>

            {/* Academies Billing Table */}
            <div className="mt-8 bg-white border border-surface-200 rounded-[1.5rem] overflow-hidden shadow-lg shadow-surface-900/5">
                <div className="p-5 border-b border-surface-100 flex justify-between items-center bg-surface-50/50">
                    <h3 className="text-base font-extrabold text-surface-800">Academy Billing Overview</h3>
                    <button onClick={fetchData} className="text-surface-400 hover:text-surface-700 transition-colors p-2 rounded-lg hover:bg-surface-100">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-50 text-surface-500 text-[10px] uppercase tracking-widest font-bold border-b border-surface-100">
                                <th className="p-4 font-bold">Academy</th>
                                <th className="p-4 font-bold">Current Plan</th>
                                <th className="p-4 font-bold">Limits</th>
                                <th className="p-4 font-bold">Status</th>
                                <th className="p-4 font-bold">Last Payment</th>
                                <th className="p-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-100">
                            {academies.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-8 text-surface-400 font-medium">No academies found.</td></tr>
                            ) : (
                                academies.map(acc => {
                                    const plan = PLANS.find(p => p.id === acc.plan_id);
                                    return (
                                        <tr key={acc.id} className="hover:bg-surface-50/80 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black text-sm shadow-sm">
                                                        {(acc.name || 'A').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-surface-800 text-sm">{acc.name || 'Unnamed'}</p>
                                                        <p className="text-[10px] text-surface-400">#{acc.id?.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {plan ? (
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-${plan.color}-50 text-${plan.color}-600 border border-${plan.color}-200`}>
                                                        <plan.icon className="w-3 h-3" /> {plan.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-surface-400 font-medium">No plan</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {plan ? (
                                                    <div className="flex items-center gap-3 text-[10px] font-bold text-surface-500">
                                                        <span title="Players">{formatLimit(plan.limits.players)} 👤</span>
                                                        <span title="Admins">{formatLimit(plan.limits.admins)} 🛡️</span>
                                                        <span title="Coaches">{formatLimit(plan.limits.coaches)} 🏋️</span>
                                                    </div>
                                                ) : <span className="text-xs text-surface-300">—</span>}
                                            </td>
                                            <td className="p-4">
                                                {acc.subscription_status === 'active' || (acc.status !== 'suspended' && acc.plan_id) ? (
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full w-max border border-emerald-200">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                                    </span>
                                                ) : acc.status === 'suspended' ? (
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-full w-max border border-rose-200">
                                                        <Ban className="w-3.5 h-3.5" /> Suspended
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full w-max border border-amber-200">
                                                        <Clock className="w-3.5 h-3.5" /> Unpaid
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className="text-xs text-surface-500 font-medium">
                                                    {acc.last_payment_at ? new Date(acc.last_payment_at).toLocaleDateString() : '—'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center gap-2 justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSelectedAcademy(acc); setShowPlanModal(true); setShowProRata(null); }}
                                                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-100"
                                                        title="Upgrade / Change Plan"
                                                    >
                                                        <ArrowUpRight className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => viewHistory(acc)}
                                                        className="p-2 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors border border-violet-100"
                                                        title="Payment History"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
