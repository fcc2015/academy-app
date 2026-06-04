import { useState, useEffect } from 'react';
import { CreditCard, History, CheckCircle2, Loader2, Ban, X, Zap, Star, Crown, Clock, DollarSign, RefreshCw, ArrowUpRight, Calculator, Users, UserCog, Dumbbell, ShieldCheck, Bell, Send } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import SubscriptionsTable from './components/SubscriptionsTable';
import SubscriptionDetailModal from './components/SubscriptionDetailModal';

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
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function fetchData() {
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
    }

    const handleAssignPlan = async (academy, planId, cycleType) => {
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
                    billing_cycle_type: cycleType || billingCycle,
                    pro_rata_amount: proRata.amount,
                    pro_rata_credit: proRata.credit,
                    upgrade_type: 'upgrade'
                })
            });
            if (res.ok) {
                toast.success(`Plan updated to ${planId} (${cycleType || billingCycle})`);
                fetchData();
                setShowPlanModal(false);
                setSelectedAcademy(null);
                setShowProRata(null);
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.detail || 'Failed to assign plan');
            }
        } catch (err) {
            console.error("Failed to assign plan:", err);
            toast.error('Connection error');
        } finally {
            setAssigningPlan(false);
        }
    };

    const handlePayPalCheckout = async (academy, planId, cycleType) => {
        setPaymentProcessing(academy.id);
        const currentPlan = PLANS.find(p => p.id === academy.plan_id);
        const newPlan = PLANS.find(p => p.id === planId);
        if (!newPlan) return;
        
        const cycle = cycleType || billingCycle;
        const basePrice = cycle === 'yearly' ? newPlan.price * 10 : newPlan.price;
        const proRata = calculateProRata(currentPlan, newPlan, academy.billing_cycle_start);
        const chargeAmount = currentPlan ? proRata.amount : basePrice;
        
        try {
            const res = await authFetch(`${API_URL}/payments/gateway/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academy_id: academy.id,
                    plan_id: planId,
                    billing_cycle_type: cycle,
                    amount: chargeAmount,
                    currency: 'USD',
                    source: 'saas_dashboard_paypal',
                    description: currentPlan 
                        ? `Upgrade ${currentPlan.name} → ${newPlan.name} (Pro-Rata: ${chargeAmount} MAD)`
                        : `${newPlan.name} Plan — ${cycle === 'yearly' ? 'Yearly' : 'Monthly'} — ${academy.name}`
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
            toast.error('Connection error');
        } finally {
            setPaymentProcessing(null);
        }
    };

    // SaaS subscriptions ONLY — routes to Lemon Squeezy via source='saas_dashboard'
    const handleLemonSqueezyCheckout = async (academy, planId, cycleType) => {
        setPaymentProcessing(academy.id);
        const newPlan = PLANS.find(p => p.id === planId);
        if (!newPlan) return;

        const cycle = cycleType || billingCycle;
        const basePrice = cycle === 'yearly' ? newPlan.price * 10 : newPlan.price;

        try {
            const res = await authFetch(`${API_URL}/payments/gateway/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academy_id: academy.id,
                    plan_id: planId,
                    billing_cycle_type: cycle,
                    amount: basePrice,
                    currency: 'USD',
                    source: 'saas_dashboard',   // ← Lemon Squeezy path (SaaS → Academy)
                    description: `${newPlan.name} Plan — ${cycle === 'yearly' ? 'Yearly' : 'Monthly'} — ${academy.name}`
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
            console.error("Lemon Squeezy checkout error:", err);
            toast.error('Connection error');
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
        } catch {
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
        } catch {
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
            <SubscriptionsTable
                loading={loading}
                academies={academies}
                activeCount={activeCount}
                suspendedCount={suspendedCount}
                mrr={mrr}
                stats={stats}
                PLANS={PLANS}
                formatLimit={formatLimit}
                fetchData={fetchData}
                setSelectedAcademy={setSelectedAcademy}
                setShowPlanModal={setShowPlanModal}
                setShowProRata={setShowProRata}
                viewHistory={viewHistory}
            />

            <SubscriptionDetailModal
                showPlanModal={showPlanModal}
                setShowPlanModal={setShowPlanModal}
                selectedAcademy={selectedAcademy}
                setSelectedAcademy={setSelectedAcademy}
                showHistoryModal={showHistoryModal}
                setShowHistoryModal={setShowHistoryModal}
                PLANS={PLANS}
                formatLimit={formatLimit}
                calculateProRata={calculateProRata}
                showProRata={showProRata}
                setShowProRata={setShowProRata}
                assigningPlan={assigningPlan}
                handleAssignPlan={handleAssignPlan}
                paymentProcessing={paymentProcessing}
                handlePayPalCheckout={handlePayPalCheckout}
                handleLemonSqueezyCheckout={handleLemonSqueezyCheckout}
                transactions={transactions}
                setTransactions={setTransactions}
                loadingTx={loadingTx}
                verifyingOrder={verifyingOrder}
                handleVerifyOrder={handleVerifyOrder}
                billingCycle={billingCycle}
                setBillingCycle={setBillingCycle}
            />
        </div>
    );
}
