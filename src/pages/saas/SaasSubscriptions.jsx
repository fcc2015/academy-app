import { useState, useEffect } from 'react';
import { CreditCard, History, CheckCircle2, Loader2, Ban, X, Zap, Star, Crown, Clock, DollarSign, RefreshCw, ArrowUpRight, Calculator, Users, UserCog, Dumbbell, ShieldCheck, Bell, Send } from 'lucide-react';
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
    const [verifyingOrder, setVerifyingOrder] = useState(null); // paypal_order_id being verified
    const [daysAhead, setDaysAhead] = useState(7);
    const [sendingReminders, setSendingReminders] = useState(false);
    const [reminderResult, setReminderResult] = useState(null);

    useEffect(() => {
        fetchData();
        const params = new URLSearchParams(window.location.search);
        const paymentStatus = params.get('payment');
        const paypalOrderId = params.get('token');       // PayPal returns token=ORDER_ID
        const academyId = params.get('academy_id');
        const planId = params.get('plan_id');

        if (paymentStatus === 'success' && paypalOrderId) {
            window.history.replaceState({}, '', '/saas/subscriptions');
            // Capture the PayPal payment
            authFetch(`${API_URL}/payments/gateway/capture-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    order_id: paypalOrderId,
                    academy_id: academyId || '',
                    plan_id: planId || null,
                })
            }).then(res => res.json()).then(data => {
                if (data.success) {
                    toast.success('Payment confirmed! Subscription activated.');
                    fetchData();
                } else {
                    toast.error('Payment capture failed. Contact support.');
                }
            }).catch(() => toast.error('Payment verification failed.'));
        } else if (paymentStatus === 'success') {
            window.history.replaceState({}, '', '/saas/subscriptions');
            toast.success('Payment received! Refreshing...');
            fetchData();
        } else if (paymentStatus === 'cancelled') {
            window.history.replaceState({}, '', '/saas/subscriptions');
            toast.error('Payment cancelled.');
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
                    upgrade_type: 'upgrade'
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

    const handleVerifyOrder = async (paypalOrderId) => {
        setVerifyingOrder(paypalOrderId);
        try {
            const res = await authFetch(`${API_URL}/payments/gateway/verify-order/${paypalOrderId}`, {
                method: 'POST',
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message || 'Payment verified and activated!');
                // Refresh transactions and academies
                if (selectedAcademy) await viewHistory(selectedAcademy);
                fetchData();
            } else {
                toast.error(data.message || `Cannot verify: status is ${data.status}`);
            }
        } catch (err) {
            toast.error('Verification request failed.');
        } finally {
            setVerifyingOrder(null);
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

    const handleSendReminders = async () => {
        setSendingReminders(true);
        setReminderResult(null);
        try {
            const res = await authFetch(`${API_URL}/saas/renewals/trigger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ days_ahead: daysAhead }),
            });
            if (res.ok) {
                const data = await res.json();
                setReminderResult(data);
                if (data.reminders_sent > 0) {
                    toast.success(`${data.reminders_sent} reminder(s) sent!`);
                } else {
                    toast.success('No renewals due — nothing to send.');
                }
            } else {
                toast.error('Failed to trigger reminders.');
            }
        } catch (err) {
            toast.error('Network error.');
        } finally {
            setSendingReminders(false);
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
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-surface-900 tracking-tight">Academy Plans <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">&amp; Platform Billing</span></h2>
                    <p className="text-surface-500 mt-1 font-medium">Manage SaaS plans (Free / Pro / Enterprise) for each client academy.</p>
                </div>
            </div>

            {/* Stats Cards — Premium Gradient */}
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

            {/* Renewal Reminders */}
            <div className="premium-card p-6">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                            <Bell className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-extrabold text-surface-900">Renewal Reminders</h3>
                            <p className="text-xs text-surface-400 mt-0.5">Notify paid academies whose subscription renews soon</p>
                        </div>
                    </div>
                    {reminderResult && (
                        <div className="flex items-center gap-3 text-xs font-bold">
                            <span className="px-2.5 py-1 rounded-lg bg-surface-100 text-surface-600">
                                {reminderResult.checked} checked
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                                {reminderResult.due_soon} due soon
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {reminderResult.reminders_sent} sent
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-surface-600 uppercase tracking-wider whitespace-nowrap">Send if renewing within</label>
                        <select
                            value={daysAhead}
                            onChange={e => setDaysAhead(Number(e.target.value))}
                            className="input w-28 text-sm"
                            disabled={sendingReminders}
                        >
                            <option value={3}>3 days</option>
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                        </select>
                    </div>
                    <button
                        onClick={handleSendReminders}
                        disabled={sendingReminders}
                        className="btn flex items-center gap-2 px-5 py-2 bg-amber-500 text-white hover:bg-amber-600 border-0 font-bold text-sm"
                    >
                        {sendingReminders
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                            : <><Send className="w-4 h-4" /> Send Reminders</>
                        }
                    </button>
                </div>
                {reminderResult?.academies?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-surface-100">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 mb-2">Reminded academies</p>
                        <div className="flex flex-wrap gap-2">
                            {reminderResult.academies.map((a, i) => (
                                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                                    <Clock className="w-3 h-3" />
                                    {a.name}
                                    <span className="text-amber-500 font-normal">· {a.days_until === 0 ? 'today' : `${a.days_until}d`}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Plan Cards — Premium Redesign */}
            <div>
                <h3 className="text-lg font-extrabold text-surface-800 mb-6 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-violet-500" /> Available Plans
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PLANS.map(plan => {
                        const Icon = plan.icon;
                        const count = academies.filter(a => a.plan_id === plan.id && a.status !== 'suspended').length;
                        
                        const colorMap = {
                            emerald: { gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', iconBg: 'bg-emerald-100', badge: 'bg-emerald-500', shadow: 'shadow-emerald-500/15', check: 'text-emerald-500' },
                            blue: { gradient: 'from-indigo-600 via-blue-600 to-cyan-500', bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-300', iconBg: 'bg-indigo-100', badge: 'bg-indigo-600', shadow: 'shadow-indigo-500/25', check: 'text-indigo-500' },
                            violet: { gradient: 'from-violet-600 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', iconBg: 'bg-violet-100', badge: 'bg-violet-600', shadow: 'shadow-violet-500/15', check: 'text-violet-500' },
                        };
                        const c = colorMap[plan.color] || colorMap.emerald;

                        return (
                            <div key={plan.id} className={`relative rounded-[1.5rem] transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 ${
                                plan.recommended
                                    ? `bg-white border-2 ${c.border} shadow-2xl ${c.shadow} ring-1 ring-indigo-100`
                                    : 'bg-white border border-surface-200 shadow-lg shadow-surface-900/5 hover:shadow-xl'
                            }`}>
                                {plan.recommended && (
                                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${c.badge} text-white shadow-lg ${c.shadow}`}>
                                        ⭐ Most Popular
                                    </div>
                                )}
                                
                                {/* Card Header with Gradient */}
                                <div className={`bg-gradient-to-r ${c.gradient} rounded-t-[1.5rem] p-6 pb-8 text-white relative overflow-hidden`}>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-12 -mt-12 blur-xl"></div>
                                    <div className="flex items-center gap-3 mb-4 relative z-10">
                                        <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-lg">{plan.name}</h4>
                                            <p className="text-[10px] font-bold text-white/70">{count} active {count === 1 ? 'academy' : 'academies'}</p>
                                        </div>
                                    </div>
                                    <div className="relative z-10">
                                        <span className="text-4xl font-black">{plan.price === 0 ? 'FREE' : plan.price}</span>
                                        {plan.price > 0 && <span className="text-sm font-bold text-white/70 ml-1">{plan.currency}/month</span>}
                                    </div>
                                </div>

                                {/* Limits Badge Row */}
                                <div className="px-6 -mt-4 relative z-10">
                                    <div className={`grid grid-cols-3 gap-2 p-3 ${c.bg} rounded-xl border ${c.border} shadow-sm`}>
                                        <div className="text-center">
                                            <Users className={`w-3.5 h-3.5 ${c.text} mx-auto mb-0.5`} />
                                            <p className="text-[9px] text-surface-500 font-bold uppercase">Players</p>
                                            <p className={`text-sm font-black ${c.text}`}>{formatLimit(plan.limits.players)}</p>
                                        </div>
                                        <div className="text-center">
                                            <UserCog className={`w-3.5 h-3.5 ${c.text} mx-auto mb-0.5`} />
                                            <p className="text-[9px] text-surface-500 font-bold uppercase">Admins</p>
                                            <p className={`text-sm font-black ${c.text}`}>{formatLimit(plan.limits.admins)}</p>
                                        </div>
                                        <div className="text-center">
                                            <Dumbbell className={`w-3.5 h-3.5 ${c.text} mx-auto mb-0.5`} />
                                            <p className="text-[9px] text-surface-500 font-bold uppercase">Coaches</p>
                                            <p className={`text-sm font-black ${c.text}`}>{formatLimit(plan.limits.coaches)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Features */}
                                <div className="px-6 py-5">
                                    <ul className="space-y-2.5">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-center gap-2.5 text-[13px] text-surface-600 font-medium">
                                                <CheckCircle2 className={`w-4 h-4 ${c.check} shrink-0`} />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Academies Billing Table */}
            {loading ? (
                <div className="py-20 flex justify-center text-emerald-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : (
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
                                                            onClick={() => { setSelectedAcademy(acc); setShowPlanModal(true); setShowProRata(null); }}
                                                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-100"
                                                            title="Upgrade / Change Plan"
                                                        >
                                                            <ArrowUpRight className="w-4 h-4" />
                                                        </button>
                                                        <button
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
            )}

            {/* ═══ UPGRADE PLAN MODAL WITH PRO-RATA ═══ */}
            {showPlanModal && selectedAcademy && (
                <div className="modal-backdrop">
                    <div className="bg-white border border-surface-200 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-surface-200">
                            <div>
                                <h3 className="text-lg font-semibold text-surface-900">Change Plan</h3>
                                <p className="text-sm text-surface-500 mt-0.5">For: <strong className="text-surface-800">{selectedAcademy.name}</strong>
                                    {selectedAcademy.plan_id && (
                                        <span className="ml-2 text-xs text-surface-400">
                                            Current: <strong className="text-emerald-600">{PLANS.find(p => p.id === selectedAcademy.plan_id)?.name || 'None'}</strong>
                                        </span>
                                    )}
                                </p>
                            </div>
                            <button onClick={() => { setShowPlanModal(false); setSelectedAcademy(null); setShowProRata(null); }} className="text-surface-400 hover:text-surface-900 transition-colors">
                                <X size={22} />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {PLANS.map(plan => {
                                const Icon = plan.icon;
                                const isCurrentPlan = selectedAcademy.plan_id === plan.id;
                                const currentPlan = PLANS.find(p => p.id === selectedAcademy.plan_id);
                                const isUpgrade = currentPlan && plan.price > currentPlan.price;
                                const proRata = !isCurrentPlan && currentPlan
                                    ? calculateProRata(currentPlan, plan, selectedAcademy.billing_cycle_start)
                                    : null;
                                const isPreview = showProRata === plan.id;

                                return (
                                    <div key={plan.id} className={`border rounded-xl p-5 transition-all ${
                                        isCurrentPlan
                                            ? 'border-emerald-300 bg-emerald-50'
                                            : isPreview
                                                ? 'border-blue-300 bg-blue-50 scale-[1.02]'
                                                : 'border-surface-200 bg-surface-50 hover:border-surface-300'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Icon className={`w-5 h-5 text-${plan.color}-500`} />
                                            <span className="font-semibold text-surface-800">{plan.name}</span>
                                            {isUpgrade && <ArrowUpRight className="w-4 h-4 text-emerald-600 ml-auto" />}
                                        </div>
                                        <p className="text-2xl font-bold text-surface-900 mb-1">{plan.price === 0 ? 'FREE' : plan.price} <span className="text-sm font-medium text-surface-500">{plan.price > 0 ? `${plan.currency}/mo` : ''}</span></p>

                                        {/* Resource Limits in modal */}
                                        <div className="grid grid-cols-3 gap-1 mb-3 p-2 bg-surface-100 rounded-lg border border-surface-200">
                                            <div className="text-center">
                                                <p className="text-[9px] text-surface-500 font-semibold">Players</p>
                                                <p className="text-xs font-bold text-surface-800">{formatLimit(plan.limits.players)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] text-surface-500 font-semibold">Admins</p>
                                                <p className="text-xs font-bold text-surface-800">{formatLimit(plan.limits.admins)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] text-surface-500 font-semibold">Coaches</p>
                                                <p className="text-xs font-bold text-surface-800">{formatLimit(plan.limits.coaches)}</p>
                                            </div>
                                        </div>

                                        <ul className="space-y-1.5 my-3">
                                            {plan.features.slice(0, 4).map((f, i) => (
                                                <li key={i} className="text-[11px] text-surface-600 flex items-center gap-1.5">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {f}
                                                </li>
                                            ))}
                                        </ul>

                                        {/* Pro-Rata Preview */}
                                        {isPreview && proRata && (
                                            <div className="my-3 p-3 bg-blue-50 border border-blue-200 rounded-xl animate-fade-in">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Calculator className="w-3.5 h-3.5 text-blue-600" />
                                                    <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Pro-Rata Calculation</span>
                                                </div>
                                                <div className="space-y-1.5 text-[11px]">
                                                    <div className="flex justify-between">
                                                        <span className="text-surface-500">Days remaining</span>
                                                        <span className="text-surface-800 font-bold">{proRata.daysRemaining} / {proRata.totalDays} days</span>
                                                    </div>
                                                    {proRata.credit > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-surface-500">Credit (unused {currentPlan?.name})</span>
                                                            <span className="text-emerald-600 font-bold">-{proRata.credit} MAD</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between">
                                                        <span className="text-surface-500">New plan ({proRata.daysRemaining}d)</span>
                                                        <span className="text-surface-800 font-bold">+{proRata.newCost} MAD</span>
                                                    </div>
                                                    <div className="flex justify-between pt-2 border-t border-blue-200">
                                                        <span className="text-blue-700 font-semibold">Amount to pay now</span>
                                                        <span className="text-lg font-bold text-surface-900">{proRata.amount} MAD</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2 mt-3">
                                            {isCurrentPlan ? (
                                                <button disabled className="w-full py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 cursor-default border border-emerald-200">
                                                    ✓ Current Plan
                                                </button>
                                            ) : currentPlan && plan.price < currentPlan.price ? (
                                                <button disabled className="w-full py-2 rounded-lg text-xs font-semibold bg-surface-100 text-surface-400 cursor-not-allowed border border-surface-200">
                                                    Downgrade not available
                                                </button>
                                            ) : (
                                                <>
                                                    {/* Preview Pro-Rata button (upgrade only) */}
                                                    {currentPlan && isUpgrade && !isPreview && (
                                                        <button
                                                            onClick={() => setShowProRata(plan.id)}
                                                            className="w-full py-2 rounded-lg text-xs font-semibold bg-surface-100 text-surface-700 hover:bg-surface-200 transition-colors flex items-center justify-center gap-1.5 border border-surface-200"
                                                        >
                                                            <Calculator className="w-3.5 h-3.5" />
                                                            Calculate Upgrade
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleAssignPlan(selectedAcademy, plan.id)}
                                                        disabled={assigningPlan}
                                                        className="w-full py-2 rounded-lg text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-500 text-white"
                                                    >
                                                        {assigningPlan ? 'Processing...' : isUpgrade ? '⬆ Upgrade Now' : 'Assign Plan'}
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
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <div className="flex justify-between items-center p-6 border-b border-surface-200">
                            <div>
                                <h3 className="text-lg font-semibold text-surface-900">Payment History</h3>
                                <p className="text-sm text-surface-500 mt-0.5">{selectedAcademy.name}</p>
                            </div>
                            <button onClick={() => { setShowHistoryModal(false); setSelectedAcademy(null); setTransactions([]); }} className="text-surface-400 hover:text-surface-900 transition-colors">
                                <X size={22} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[400px] overflow-y-auto">
                            {loadingTx ? (
                                <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>
                            ) : transactions.length === 0 ? (
                                <div className="py-8 text-center">
                                    <History className="w-10 h-10 text-surface-300 mx-auto mb-3" />
                                    <p className="text-surface-400 text-sm font-medium">No transactions yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {transactions.map((tx, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-surface-50 border border-surface-200 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${tx.status === 'completed' ? 'bg-emerald-50' : tx.status === 'pending' ? 'bg-amber-50' : 'bg-rose-50'}`}>
                                                    {tx.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                                                     tx.status === 'pending' ? <Clock className="w-4 h-4 text-amber-600" /> :
                                                     <Ban className="w-4 h-4 text-rose-600" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-surface-800">{tx.amount} {tx.currency || 'USD'}</p>
                                                    <p className="text-[10px] text-surface-400">{tx.description || ''}</p>
                                                    <p className="text-[10px] text-surface-400">{tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}</p>
                                                    {tx.paypal_order_id && (
                                                        <p className="text-[10px] text-surface-300 font-mono">#{tx.paypal_order_id.slice(0, 16)}...</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                                                    tx.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    tx.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-rose-50 text-rose-600 border-rose-200'
                                                }`}>
                                                    {tx.status}
                                                </span>
                                                {tx.status === 'pending' && tx.paypal_order_id && (
                                                    <button
                                                        onClick={() => handleVerifyOrder(tx.paypal_order_id)}
                                                        disabled={verifyingOrder === tx.paypal_order_id}
                                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
                                                        title="Manually verify this payment with PayPal"
                                                    >
                                                        {verifyingOrder === tx.paypal_order_id
                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                            : <ShieldCheck className="w-3 h-3" />}
                                                        Verify
                                                    </button>
                                                )}
                                            </div>
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
