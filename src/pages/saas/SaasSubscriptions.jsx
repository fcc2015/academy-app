import { useState, useEffect } from 'react';
import { CreditCard, History, Building2, CheckCircle2, Loader2, Ban, Plus, Eye, X, Zap, Star, Crown, Clock, DollarSign, ExternalLink, RefreshCw } from 'lucide-react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';

const PLANS = [
    {
        id: 'starter',
        name: 'Starter',
        price: 299,
        currency: 'MAD',
        period: '/month',
        icon: Zap,
        color: 'emerald',
        features: ['Up to 50 Players', '2 Coaches', 'Basic Attendance', 'Email Support'],
        recommended: false,
    },
    {
        id: 'pro',
        name: 'Professional',
        price: 599,
        currency: 'MAD',
        period: '/month',
        icon: Star,
        color: 'blue',
        features: ['Up to 200 Players', '10 Coaches', 'Full Evaluations', 'Financial Reports', 'Priority Support'],
        recommended: true,
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 999,
        currency: 'MAD',
        period: '/month',
        icon: Crown,
        color: 'violet',
        features: ['Unlimited Players', 'Unlimited Coaches', 'Custom Domain', 'Advanced Analytics', 'API Access', '24/7 Support'],
        recommended: false,
    },
];

export default function SaasSubscriptions() {
    const [academies, setAcademies] = useState([]);
    const [stats, setStats] = useState({ total_academies: 0, active_academies: 0, total_mrr: 0 });
    const [loading, setLoading] = useState(true);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [selectedAcademy, setSelectedAcademy] = useState(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [loadingTx, setLoadingTx] = useState(false);
    const [assigningPlan, setAssigningPlan] = useState(false);
    const [paymentProcessing, setPaymentProcessing] = useState(null);

    useEffect(() => {
        fetchData();
        // Check for PayPal return
        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') === 'success') {
            // Clear query params
            window.history.replaceState({}, '', '/saas/subscriptions');
        }
    }, []);

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

    const handleAssignPlan = async (academy, planId) => {
        setAssigningPlan(true);
        try {
            const res = await authFetch(`${API_URL}/saas/academies/${academy.id}/plan`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_id: planId })
            });
            if (res.ok) {
                fetchData();
                setShowPlanModal(false);
                setSelectedAcademy(null);
            }
        } catch (err) {
            console.error("Failed to assign plan:", err);
        } finally {
            setAssigningPlan(false);
        }
    };

    const handlePayPalCheckout = async (academy, planId) => {
        setPaymentProcessing(academy.id);
        const plan = PLANS.find(p => p.id === planId);
        if (!plan) return;
        try {
            const res = await authFetch(`${API_URL}/payments/gateway/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academy_id: academy.id,
                    plan_id: planId,
                    amount: plan.price,
                    currency: 'USD',
                    description: `${plan.name} Plan - ${academy.name}`
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.approve_url) {
                    window.open(data.approve_url, '_blank');
                }
            } else {
                const err = await res.json();
                alert(err.detail || 'Payment failed');
            }
        } catch (err) {
            console.error("PayPal checkout error:", err);
        } finally {
            setPaymentProcessing(null);
        }
    };

    const viewHistory = async (academy) => {
        setSelectedAcademy(academy);
        setShowHistoryModal(true);
        setLoadingTx(true);
        try {
            const res = await authFetch(`${API_URL}/payments/gateway/transactions/${academy.id}`);
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (err) {
            console.error("Failed to load transactions:", err);
        } finally {
            setLoadingTx(false);
        }
    };

    const activeCount = academies.filter(a => a.status !== 'suspended').length;
    const suspendedCount = academies.filter(a => a.status === 'suspended').length;

    // Calculate MRR from assigned plans
    const mrr = academies.reduce((sum, a) => {
        const plan = PLANS.find(p => p.id === a.plan_id);
        return sum + (plan && a.status !== 'suspended' ? plan.price : 0);
    }, 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-100 tracking-tight">Subscriptions & Billing</h2>
                    <p className="text-slate-400 mt-1">Manage billing, plans, and payments for all client academies.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mt-6">
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-emerald-500/10"><CreditCard className="w-7 h-7 text-emerald-400" /></div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Plans</p>
                        <p className="text-2xl font-black text-slate-100 mt-0.5">{activeCount}</p>
                    </div>
                </div>
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-blue-500/10"><DollarSign className="w-7 h-7 text-blue-400" /></div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Monthly MRR</p>
                        <p className="text-2xl font-black text-slate-100 mt-0.5">{mrr.toLocaleString()} MAD</p>
                    </div>
                </div>
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-violet-500/10"><History className="w-7 h-7 text-violet-400" /></div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</p>
                        <p className="text-2xl font-black text-slate-100 mt-0.5">{stats.total_mrr?.toLocaleString() || 0} MAD</p>
                    </div>
                </div>
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-amber-500/10"><Ban className="w-7 h-7 text-amber-400" /></div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Suspended</p>
                        <p className="text-2xl font-black text-slate-100 mt-0.5">{suspendedCount}</p>
                    </div>
                </div>
            </div>

            {/* Pricing Plans Cards */}
            <div className="mt-8">
                <h3 className="text-lg font-bold text-slate-200 mb-5 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-violet-400" /> Available Plans
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {PLANS.map(plan => {
                        const Icon = plan.icon;
                        const count = academies.filter(a => a.plan_id === plan.id && a.status !== 'suspended').length;
                        return (
                            <div key={plan.id} className={`relative border rounded-2xl p-6 transition-all duration-200 hover:scale-[1.02] ${
                                plan.recommended
                                    ? `border-${plan.color}-500/40 bg-${plan.color}-500/5 shadow-lg shadow-${plan.color}-500/10`
                                    : 'border-slate-800 bg-[#1e293b]/50'
                            }`}>
                                {plan.recommended && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                                        Most Popular
                                    </div>
                                )}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-2.5 rounded-xl bg-${plan.color}-500/10`}>
                                        <Icon className={`w-5 h-5 text-${plan.color}-400`} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-200">{plan.name}</h4>
                                        <p className="text-[10px] text-slate-500 font-semibold">{count} active {count === 1 ? 'academy' : 'academies'}</p>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <span className="text-3xl font-black text-slate-100">{plan.price}</span>
                                    <span className="text-sm text-slate-400 font-semibold"> {plan.currency}{plan.period}</span>
                                </div>
                                <ul className="space-y-2">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex items-center gap-2 text-xs text-slate-400">
                                            <CheckCircle2 className={`w-3.5 h-3.5 text-${plan.color}-400 shrink-0`} />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Academies Billing Table */}
            {loading ? (
                <div className="py-20 flex justify-center text-emerald-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : (
                <div className="mt-8 border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-slate-800/60 flex justify-between items-center">
                        <h3 className="text-base font-bold text-slate-200">Academy Billing Overview</h3>
                        <button onClick={fetchData} className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800/50">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-widest font-bold">
                                    <th className="p-4 font-semibold">Academy</th>
                                    <th className="p-4 font-semibold">Current Plan</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold">Last Payment</th>
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {academies.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-8 text-slate-500">No academies found.</td></tr>
                                ) : (
                                    academies.map(acc => {
                                        const plan = PLANS.find(p => p.id === acc.plan_id);
                                        return (
                                            <tr key={acc.id} className="hover:bg-slate-800/20 transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 font-bold text-xs">
                                                            {(acc.name || 'A').charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-200 text-sm">{acc.name || 'Unnamed'}</p>
                                                            <p className="text-[10px] text-slate-500">#{acc.id?.slice(0, 8)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {plan ? (
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-${plan.color}-500/10 text-${plan.color}-400 border border-${plan.color}-500/15`}>
                                                            <plan.icon className="w-3 h-3" /> {plan.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-500 font-medium">No plan</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    {acc.subscription_status === 'active' || (acc.status !== 'suspended' && acc.plan_id) ? (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full w-max border border-emerald-500/15">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                                        </span>
                                                    ) : acc.status === 'suspended' ? (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-400/10 px-3 py-1 rounded-full w-max border border-rose-500/15">
                                                            <Ban className="w-3.5 h-3.5" /> Suspended
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full w-max border border-amber-500/15">
                                                            <Clock className="w-3.5 h-3.5" /> Unpaid
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-xs text-slate-400">
                                                        {acc.last_payment_at ? new Date(acc.last_payment_at).toLocaleDateString() : '—'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <button
                                                            onClick={() => { setSelectedAcademy(acc); setShowPlanModal(true); }}
                                                            className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                                            title="Assign Plan"
                                                        >
                                                            <CreditCard className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => viewHistory(acc)}
                                                            className="p-2 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors"
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
            )}

            {/* Assign Plan Modal */}
            {showPlanModal && selectedAcademy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Select Plan</h3>
                                <p className="text-sm text-slate-400 mt-0.5">For: <strong className="text-slate-200">{selectedAcademy.name}</strong></p>
                            </div>
                            <button onClick={() => { setShowPlanModal(false); setSelectedAcademy(null); }} className="text-slate-400 hover:text-white transition-colors">
                                <X size={22} />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {PLANS.map(plan => {
                                const Icon = plan.icon;
                                const isCurrentPlan = selectedAcademy.plan_id === plan.id;
                                return (
                                    <div key={plan.id} className={`border rounded-xl p-5 transition-all cursor-pointer hover:scale-[1.03] ${
                                        isCurrentPlan
                                            ? 'border-emerald-500/50 bg-emerald-500/5'
                                            : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icon className={`w-5 h-5 text-${plan.color}-400`} />
                                            <span className="font-bold text-slate-200">{plan.name}</span>
                                        </div>
                                        <p className="text-2xl font-black text-white mb-1">{plan.price} <span className="text-sm font-medium text-slate-400">{plan.currency}/mo</span></p>
                                        <ul className="space-y-1.5 my-4">
                                            {plan.features.map((f, i) => (
                                                <li key={i} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {f}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="space-y-2 mt-4">
                                            <button
                                                onClick={() => handleAssignPlan(selectedAcademy, plan.id)}
                                                disabled={isCurrentPlan || assigningPlan}
                                                className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                                                    isCurrentPlan 
                                                        ? 'bg-emerald-500/10 text-emerald-400 cursor-default border border-emerald-500/20'
                                                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                                                }`}
                                            >
                                                {isCurrentPlan ? '✓ Current Plan' : assigningPlan ? 'Assigning...' : 'Assign Plan'}
                                            </button>
                                            {!isCurrentPlan && (
                                                <button
                                                    onClick={() => handlePayPalCheckout(selectedAcademy, plan.id)}
                                                    disabled={paymentProcessing === selectedAcademy.id}
                                                    className="w-full py-2 rounded-lg text-xs font-bold bg-[#0070ba] hover:bg-[#003087] text-white transition-all flex items-center justify-center gap-2"
                                                >
                                                    {paymentProcessing === selectedAcademy.id ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.383 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/></svg>
                                                    )}
                                                    Pay with PayPal
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Payment History Modal */}
            {showHistoryModal && selectedAcademy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Payment History</h3>
                                <p className="text-sm text-slate-400 mt-0.5">{selectedAcademy.name}</p>
                            </div>
                            <button onClick={() => { setShowHistoryModal(false); setSelectedAcademy(null); setTransactions([]); }} className="text-slate-400 hover:text-white transition-colors">
                                <X size={22} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[400px] overflow-y-auto">
                            {loadingTx ? (
                                <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 text-emerald-400 animate-spin" /></div>
                            ) : transactions.length === 0 ? (
                                <div className="py-8 text-center">
                                    <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-500 text-sm font-medium">No transactions yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {transactions.map((tx, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${tx.status === 'completed' ? 'bg-emerald-500/10' : tx.status === 'pending' ? 'bg-amber-500/10' : 'bg-rose-500/10'}`}>
                                                    {tx.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> :
                                                     tx.status === 'pending' ? <Clock className="w-4 h-4 text-amber-400" /> :
                                                     <Ban className="w-4 h-4 text-rose-400" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-200">{tx.amount} {tx.currency || 'USD'}</p>
                                                    <p className="text-[10px] text-slate-500">{tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}</p>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                                tx.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                                tx.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                                                'bg-rose-500/10 text-rose-400'
                                            }`}>
                                                {tx.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
