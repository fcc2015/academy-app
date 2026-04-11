import { useState, useEffect } from 'react';
import { CreditCard, History, Building2, CheckCircle2, Loader2, Ban, Plus, Eye, X, Zap, Star, Crown, Clock, DollarSign, ExternalLink, RefreshCw, ArrowUpRight, ArrowDownRight, Calculator, Users, UserCog, Dumbbell } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { API_URL } from '../../config';
import { authFetch } from '../../api';

const PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'MAD',
        period: '/month',
        icon: Zap,
        color: 'emerald',
        features: ['Up to 15 Players', '1 Admin', '1 Coach', 'Basic Attendance', 'Email Support'],
        limits: { players: 15, admins: 1, coaches: 1 },
        recommended: false,
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 499,
        currency: 'MAD',
        period: '/month',
        icon: Star,
        color: 'blue',
        features: ['Up to 100 Players', '4 Admins', '10 Coaches', 'Full Evaluations', 'Financial Reports', 'Priority Support'],
        limits: { players: 100, admins: 4, coaches: 10 },
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
        features: ['Unlimited Players', 'Unlimited Admins', 'Unlimited Coaches', 'Custom Domain', 'Advanced Analytics', 'API Access', '24/7 Support'],
        limits: { players: -1, admins: -1, coaches: -1 },
        recommended: false,
    },
];

// Pro-rata calculation helper
function calculateProRata(currentPlan, newPlan, billingCycleStart) {
    if (!currentPlan || !newPlan) return { amount: newPlan?.price || 0, daysRemaining: 30, totalDays: 30, credit: 0 };
    
    const now = new Date();
    const cycleStart = billingCycleStart ? new Date(billingCycleStart) : new Date(now.getFullYear(), now.getMonth(), 1);
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
    
    const totalDays = Math.ceil((cycleEnd - cycleStart) / (1000 * 60 * 60 * 24));
    const daysUsed = Math.ceil((now - cycleStart) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, totalDays - daysUsed);
    
    // Credit from current plan (unused days)
    const dailyRateCurrent = currentPlan.price / totalDays;
    const credit = Math.round(dailyRateCurrent * daysRemaining);
    
    // Cost for new plan (remaining days)
    const dailyRateNew = newPlan.price / totalDays;
    const newCost = Math.round(dailyRateNew * daysRemaining);
    
    // Pro-rata amount = new cost - credit
    const amount = Math.max(0, newCost - credit);
    
    return { amount, daysRemaining, totalDays, daysUsed, credit, newCost, dailyRateCurrent, dailyRateNew };
}

export default function SaasSubscriptions() {
    const toast = useToast();
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
    const [showProRata, setShowProRata] = useState(null); // planId being previewed

    useEffect(() => {
        fetchData();
        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') === 'success') {
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
            const currentPlan = PLANS.find(p => p.id === academy.plan_id);
            const newPlan = PLANS.find(p => p.id === planId);
            const proRata = calculateProRata(currentPlan, newPlan, academy.billing_cycle_start);
            
            const res = await authFetch(`${API_URL}/saas/academies/${academy.id}/plan`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    plan_id: planId,
                    pro_rata_amount: proRata.amount,
                    pro_rata_credit: proRata.credit,
                    upgrade_type: currentPlan && newPlan && newPlan.price > currentPlan.price ? 'upgrade' : 'downgrade'
                })
            });
            if (res.ok) {
                fetchData();
                setShowPlanModal(false);
                setSelectedAcademy(null);
                setShowProRata(null);
            }
        } catch (err) {
            console.error("Failed to assign plan:", err);
        } finally {
            setAssigningPlan(false);
        }
    };

    const handlePayPalCheckout = async (academy, planId) => {
        setPaymentProcessing(academy.id);
        const currentPlan = PLANS.find(p => p.id === academy.plan_id);
        const newPlan = PLANS.find(p => p.id === planId);
        if (!newPlan) return;
        
        const proRata = calculateProRata(currentPlan, newPlan, academy.billing_cycle_start);
        const chargeAmount = currentPlan ? proRata.amount : newPlan.price;
        
        try {
            const res = await authFetch(`${API_URL}/payments/gateway/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academy_id: academy.id,
                    plan_id: planId,
                    amount: chargeAmount,
                    currency: 'USD',
                    description: currentPlan 
                        ? `Upgrade ${currentPlan.name} → ${newPlan.name} (Pro-Rata: ${chargeAmount} MAD)`
                        : `${newPlan.name} Plan - ${academy.name}`
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.approve_url) {
                    window.open(data.approve_url, '_blank');
                }
            } else {
                const err = await res.json();
                toast.error(err.detail || 'Payment failed');
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

    const mrr = academies.reduce((sum, a) => {
        const plan = PLANS.find(p => p.id === a.plan_id);
        return sum + (plan && a.status !== 'suspended' ? plan.price : 0);
    }, 0);

    const formatLimit = (v) => v === -1 ? '∞' : v;

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

            {/* Plan Cards with Limits */}
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
                                    ? 'border-blue-500/40 bg-blue-500/5 shadow-lg shadow-blue-500/10'
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
                                    <span className="text-3xl font-black text-slate-100">{plan.price === 0 ? 'FREE' : plan.price}</span>
                                    {plan.price > 0 && <span className="text-sm text-slate-400 font-semibold"> {plan.currency}{plan.period}</span>}
                                </div>
                                {/* Resource Limits */}
                                <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50">
                                    <div className="text-center">
                                        <Users className={`w-3.5 h-3.5 text-${plan.color}-400 mx-auto mb-1`} />
                                        <p className="text-[10px] text-slate-500 font-bold">Players</p>
                                        <p className="text-sm font-black text-slate-200">{formatLimit(plan.limits.players)}</p>
                                    </div>
                                    <div className="text-center">
                                        <UserCog className={`w-3.5 h-3.5 text-${plan.color}-400 mx-auto mb-1`} />
                                        <p className="text-[10px] text-slate-500 font-bold">Admins</p>
                                        <p className="text-sm font-black text-slate-200">{formatLimit(plan.limits.admins)}</p>
                                    </div>
                                    <div className="text-center">
                                        <Dumbbell className={`w-3.5 h-3.5 text-${plan.color}-400 mx-auto mb-1`} />
                                        <p className="text-[10px] text-slate-500 font-bold">Coaches</p>
                                        <p className="text-sm font-black text-slate-200">{formatLimit(plan.limits.coaches)}</p>
                                    </div>
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
                                    <th className="p-4 font-semibold">Limits</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold">Last Payment</th>
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {academies.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center py-8 text-slate-500">No academies found.</td></tr>
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
                                                    {plan ? (
                                                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                                                            <span title="Players">{formatLimit(plan.limits.players)} 👤</span>
                                                            <span title="Admins">{formatLimit(plan.limits.admins)} 🛡️</span>
                                                            <span title="Coaches">{formatLimit(plan.limits.coaches)} 🏋️</span>
                                                        </div>
                                                    ) : <span className="text-xs text-slate-600">—</span>}
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
                                                            onClick={() => { setSelectedAcademy(acc); setShowPlanModal(true); setShowProRata(null); }}
                                                            className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                                            title="Upgrade / Change Plan"
                                                        >
                                                            <ArrowUpRight className="w-4 h-4" />
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

            {/* ═══ UPGRADE PLAN MODAL WITH PRO-RATA ═══ */}
            {showPlanModal && selectedAcademy && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Change Plan</h3>
                                <p className="text-sm text-slate-400 mt-0.5">For: <strong className="text-slate-200">{selectedAcademy.name}</strong>
                                    {selectedAcademy.plan_id && (
                                        <span className="ml-2 text-xs text-slate-500">
                                            Current: <strong className="text-emerald-400">{PLANS.find(p => p.id === selectedAcademy.plan_id)?.name || 'None'}</strong>
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button onClick={() => { setShowPlanModal(false); setSelectedAcademy(null); setShowProRata(null); }} className="text-slate-400 hover:text-white transition-colors">
                                <X size={22} />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {PLANS.map(plan => {
                                const Icon = plan.icon;
                                const isCurrentPlan = selectedAcademy.plan_id === plan.id;
                                const currentPlan = PLANS.find(p => p.id === selectedAcademy.plan_id);
                                const isUpgrade = currentPlan && plan.price > currentPlan.price;
                                const isDowngrade = currentPlan && plan.price < currentPlan.price;
                                const proRata = !isCurrentPlan && currentPlan 
                                    ? calculateProRata(currentPlan, plan, selectedAcademy.billing_cycle_start) 
                                    : null;
                                const isPreview = showProRata === plan.id;

                                return (
                                    <div key={plan.id} className={`border rounded-xl p-5 transition-all ${
                                        isCurrentPlan
                                            ? 'border-emerald-500/50 bg-emerald-500/5'
                                            : isPreview
                                                ? 'border-blue-500/50 bg-blue-500/5 scale-[1.02]'
                                                : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icon className={`w-5 h-5 text-${plan.color}-400`} />
                                            <span className="font-bold text-slate-200">{plan.name}</span>
                                            {isUpgrade && <ArrowUpRight className="w-4 h-4 text-emerald-400 ml-auto" />}
                                            {isDowngrade && <ArrowDownRight className="w-4 h-4 text-amber-400 ml-auto" />}
                                        </div>
                                        <p className="text-2xl font-black text-white mb-1">{plan.price === 0 ? 'FREE' : plan.price} <span className="text-sm font-medium text-slate-400">{plan.price > 0 ? `${plan.currency}/mo` : ''}</span></p>
                                        
                                        {/* Resource Limits in modal */}
                                        <div className="grid grid-cols-3 gap-1 mb-3 p-2 bg-slate-900/50 rounded-lg border border-slate-700/40">
                                            <div className="text-center">
                                                <p className="text-[9px] text-slate-500 font-bold">Players</p>
                                                <p className="text-xs font-black text-slate-300">{formatLimit(plan.limits.players)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] text-slate-500 font-bold">Admins</p>
                                                <p className="text-xs font-black text-slate-300">{formatLimit(plan.limits.admins)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] text-slate-500 font-bold">Coaches</p>
                                                <p className="text-xs font-black text-slate-300">{formatLimit(plan.limits.coaches)}</p>
                                            </div>
                                        </div>

                                        <ul className="space-y-1.5 my-3">
                                            {plan.features.slice(0, 4).map((f, i) => (
                                                <li key={i} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {f}
                                                </li>
                                            ))}
                                        </ul>

                                        {/* Pro-Rata Preview */}
                                        {isPreview && proRata && (
                                            <div className="my-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-fade-in">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Calculator className="w-3.5 h-3.5 text-blue-400" />
                                                    <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Pro-Rata Calculation</span>
                                                </div>
                                                <div className="space-y-1.5 text-[11px]">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">Days remaining</span>
                                                        <span className="text-slate-200 font-bold">{proRata.daysRemaining} / {proRata.totalDays} days</span>
                                                    </div>
                                                    {proRata.credit > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-slate-400">Credit (unused {currentPlan?.name})</span>
                                                            <span className="text-emerald-400 font-bold">-{proRata.credit} MAD</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">New plan ({proRata.daysRemaining}d)</span>
                                                        <span className="text-slate-200 font-bold">+{proRata.newCost} MAD</span>
                                                    </div>
                                                    <div className="flex justify-between pt-2 border-t border-blue-500/20">
                                                        <span className="text-blue-300 font-bold">Amount to pay now</span>
                                                        <span className="text-lg font-black text-white">{proRata.amount} MAD</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2 mt-3">
                                            {isCurrentPlan ? (
                                                <button disabled className="w-full py-2 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 cursor-default border border-emerald-500/20">
                                                    ✓ Current Plan
                                                </button>
                                            ) : (
                                                <>
                                                    {/* Preview Pro-Rata button */}
                                                    {currentPlan && !isPreview && (
                                                        <button
                                                            onClick={() => setShowProRata(plan.id)}
                                                            className="w-full py-2 rounded-lg text-xs font-bold bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-colors flex items-center justify-center gap-1.5"
                                                        >
                                                            <Calculator className="w-3.5 h-3.5" />
                                                            {isUpgrade ? 'Calculate Upgrade' : 'Calculate Downgrade'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleAssignPlan(selectedAcademy, plan.id)}
                                                        disabled={assigningPlan}
                                                        className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                                                            isUpgrade ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                                                            isDowngrade ? 'bg-amber-600 hover:bg-amber-500 text-white' :
                                                            'bg-slate-700 hover:bg-slate-600 text-white'
                                                        }`}
                                                    >
                                                        {assigningPlan ? 'Processing...' : isUpgrade ? '⬆ Upgrade Now' : isDowngrade ? '⬇ Downgrade' : 'Assign Plan'}
                                                    </button>
                                                    {plan.price > 0 && (
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
                                                            Pay {proRata ? `${proRata.amount} MAD` : ''} via PayPal
                                                        </button>
                                                    )}
                                                </>
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
                                                    <p className="text-[10px] text-slate-500">{tx.description || ''}</p>
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
