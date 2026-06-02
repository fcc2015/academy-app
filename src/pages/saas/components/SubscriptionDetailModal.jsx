import React, { useState } from 'react';
import {
    X, ArrowUpRight, CheckCircle2, Calculator, Loader2, CreditCard,
    Building2, Zap, ShieldCheck, CheckCircle, AlertCircle, Copy
} from 'lucide-react';
import { API_URL } from '../../../config';
import { authFetch } from '../../../api';

export default function SubscriptionDetailModal({
    showPlanModal,
    setShowPlanModal,
    selectedAcademy,
    setSelectedAcademy,
    showHistoryModal,
    setShowHistoryModal,
    PLANS,
    formatLimit,
    calculateProRata,
    showProRata,
    setShowProRata,
    assigningPlan,
    handleAssignPlan,
    paymentProcessing,
    handlePayPalCheckout,
    transactions,
    setTransactions,
    loadingTx,
    verifyingOrder,
    handleVerifyOrder,
    billingCycle = 'monthly',
    setBillingCycle,
}) {
    const [stripeProcessing, setStripeProcessing] = useState(null);   // plan id
    const [cashProcessing, setCashProcessing] = useState(null);       // plan id
    const [cashCodes, setCashCodes] = useState({});                   // planId → { wafacash|cashplus: codeData }
    const [activeCashProvider, setActiveCashProvider] = useState({}); // planId → provider
    const [confirmingDeposit, setConfirmingDeposit] = useState(null); // tx.paypal_order_id
    const [proofRef, setProofRef] = useState('');
    const [confirmResult, setConfirmResult] = useState(null);
    const [codeCopied, setCodeCopied] = useState(null);

    const handleStripeCheckout = async (academy, planId) => {
        setStripeProcessing(planId);
        const newPlan = PLANS.find(p => p.id === planId);
        const currentPlan = PLANS.find(p => p.id === academy.plan_id);
        if (!newPlan) return;
        const basePrice = billingCycle === 'yearly' ? newPlan.price * 10 : newPlan.price;
        const proRata = calculateProRata(currentPlan, newPlan, academy.billing_cycle_start);
        const chargeAmount = currentPlan ? proRata.amount : basePrice;

        try {
            const res = await authFetch(`${API_URL}/payments/gateway/stripe/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academy_id: academy.id,
                    plan_id: planId,
                    billing_cycle_type: billingCycle,
                    amount: chargeAmount || newPlan.price,
                    currency: 'MAD',
                    description: currentPlan
                        ? `Upgrade ${currentPlan.name} → ${newPlan.name} (Pro-Rata: ${chargeAmount} MAD)`
                        : `${newPlan.name} Plan — ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} — ${academy.name}`
                })
            });
            const data = await res.json();
            if (data.checkout_url) {
                window.open(data.checkout_url, '_blank');
            }
        } catch (err) {
            console.error('Stripe error:', err);
        } finally {
            setStripeProcessing(null);
        }
    };

    const handleCashCode = async (academy, planId, provider) => {
        setCashProcessing(planId);
        const newPlan = PLANS.find(p => p.id === planId);
        const currentPlan = PLANS.find(p => p.id === academy.plan_id);
        if (!newPlan) return;
        const basePrice = billingCycle === 'yearly' ? newPlan.price * 10 : newPlan.price;
        const proRata = calculateProRata(currentPlan, newPlan, academy.billing_cycle_start);
        const chargeAmount = currentPlan ? proRata.amount : basePrice;

        try {
            const res = await authFetch(`${API_URL}/payments/gateway/cash/generate-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    academy_id: academy.id,
                    plan_id: planId,
                    billing_cycle_type: billingCycle,
                    amount: chargeAmount || newPlan.price,
                    provider
                })
            });
            const data = await res.json();
            if (data.success) {
                setCashCodes(prev => ({ ...prev, [planId]: { ...(prev[planId] || {}), [provider]: data } }));
                setActiveCashProvider(prev => ({ ...prev, [planId]: provider }));
            }
        } catch (err) {
            console.error('Cash code error:', err);
        } finally {
            setCashProcessing(null);
        }
    };

    const handleConfirmDeposit = async (txId) => {
        if (!proofRef.trim()) return;
        setConfirmingDeposit(txId);
        try {
            const res = await authFetch(`${API_URL}/payments/gateway/cash/confirm-deposit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transaction_id: txId,
                    deposit_proof_reference: proofRef.trim()
                })
            });
            const data = await res.json();
            setConfirmResult({ success: data.success, message: data.message });
            if (data.success) {
                setTransactions(prev =>
                    prev.map(t =>
                        t.paypal_order_id === txId
                            ? { ...t, status: 'completed' }
                            : t
                    )
                );
                setProofRef('');
            }
        } catch {
            setConfirmResult({ success: false, message: 'Network error. Try again.' });
        } finally {
            setConfirmingDeposit(null);
        }
    };

    const copyCode = (code, id) => {
        navigator.clipboard.writeText(code).then(() => {
            setCodeCopied(id);
            setTimeout(() => setCodeCopied(null), 2000);
        });
    };

    const isCashTx = (tx) =>
        tx.paypal_order_id?.startsWith('WC-') || tx.paypal_order_id?.startsWith('CP-');
    const isStripeTx = (tx) => tx.paypal_order_id?.startsWith('stripe_');

    return (
        <>
            {/* ═══ UPGRADE PLAN MODAL ═══ */}
            {showPlanModal && selectedAcademy && (
                <div className="modal-backdrop">
                    <div className="bg-white border border-surface-200 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-surface-200">
                            <div>
                                <h3 className="text-lg font-semibold text-surface-900">Change Plan</h3>
                                <p className="text-sm text-surface-500 mt-0.5">
                                    For: <strong className="text-surface-800">{selectedAcademy.name}</strong>
                                    {selectedAcademy.plan_id && (
                                        <span className="ml-2 text-xs text-surface-400">
                                            Current: <strong className="text-emerald-600">
                                                {PLANS.find(p => p.id === selectedAcademy.plan_id)?.name || 'None'}
                                            </strong>
                                        </span>
                                    )}
                                </p>
                            </div>
                            {/* Billing Cycle Toggle */}
                            {setBillingCycle && (
                                <div className="flex items-center gap-1 p-1 bg-surface-100 rounded-xl border border-surface-200">
                                    <button
                                        onClick={() => setBillingCycle('monthly')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                                            billingCycle === 'monthly'
                                                ? 'bg-white text-indigo-700 shadow-sm border border-surface-200'
                                                : 'text-surface-500 hover:text-surface-700'
                                        }`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        onClick={() => setBillingCycle('yearly')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                                            billingCycle === 'yearly'
                                                ? 'bg-white text-indigo-700 shadow-sm border border-surface-200'
                                                : 'text-surface-500 hover:text-surface-700'
                                        }`}
                                    >
                                        Yearly
                                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-black">-17%</span>
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={() => { setShowPlanModal(false); setSelectedAcademy(null); setShowProRata(null); setCashCodes({}); setActiveCashProvider({}); }}
                                className="text-surface-400 hover:text-surface-900 transition-colors"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {PLANS.map(plan => {
                                const Icon = plan.icon;
                                const isCurrentPlan = selectedAcademy.plan_id === plan.id;
                                const currentPlan = PLANS.find(p => p.id === selectedAcademy.plan_id);
                                const isUpgrade = currentPlan && plan.price > currentPlan.price;
                                const displayPrice = billingCycle === 'yearly' ? plan.price * 10 : plan.price;
                                const proRata = !isCurrentPlan && currentPlan
                                    ? calculateProRata(currentPlan, plan, selectedAcademy.billing_cycle_start)
                                    : null;
                                const isPreview = showProRata === plan.id;
                                const activeProv = activeCashProvider[plan.id];
                                const cashCodeData = activeProv && cashCodes[plan.id]?.[activeProv];

                                return (
                                    <div key={plan.id} className={`border rounded-xl p-5 transition-all flex flex-col justify-between ${
                                        isCurrentPlan
                                            ? 'border-emerald-300 bg-emerald-50'
                                            : isPreview
                                                ? 'border-indigo-300 bg-indigo-50 scale-[1.02]'
                                                : 'border-surface-200 bg-surface-50 hover:border-surface-300'
                                    }`}>
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Icon className={`w-5 h-5 text-${plan.color || 'indigo'}-500`} />
                                                <span className="font-semibold text-surface-800">{plan.name}</span>
                                                {isUpgrade && <ArrowUpRight className="w-4 h-4 text-emerald-600 ml-auto" />}
                                            </div>
                                            <p className="text-2xl font-bold text-surface-900 mb-1">
                                                {plan.price === 0 ? 'FREE' : displayPrice}{' '}
                                                <span className="text-sm font-medium text-surface-500">
                                                    {plan.price > 0 ? `${plan.currency}/${billingCycle === 'yearly' ? 'yr' : 'mo'}` : ''}
                                                </span>
                                                {plan.price > 0 && billingCycle === 'yearly' && (
                                                    <span className="ml-1 text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                                                        2 months free!
                                                    </span>
                                                )}
                                            </p>

                                            {/* Resource Limits */}
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
                                                <div className="my-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl animate-fade-in">
                                                    <div className="flex items-center gap-1.5 mb-2">
                                                        <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                                                        <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">Pro-Rata Calculation</span>
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
                                                        <div className="flex justify-between pt-2 border-t border-indigo-200">
                                                            <span className="text-indigo-700 font-semibold">Amount to pay now</span>
                                                            <span className="text-lg font-bold text-surface-900">{proRata.amount} MAD</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Cash code display (inside plan card) */}
                                            {cashCodeData && (
                                                <div className="my-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl animate-fade-in">
                                                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider mb-2">{cashCodeData.provider} Reference</p>
                                                    <div className="flex items-center gap-2 justify-between">
                                                        <span className="text-base font-black font-mono tracking-widest text-slate-800">{cashCodeData.payment_code}</span>
                                                        <button
                                                            onClick={() => copyCode(cashCodeData.payment_code, `${plan.id}-${activeProv}`)}
                                                            className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors"
                                                        >
                                                            {codeCopied === `${plan.id}-${activeProv}` ? <CheckCircle size={13} /> : <Copy size={13} />}
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-emerald-600 mt-1">Show this code at any {cashCodeData.provider} agency — {cashCodeData.amount} MAD</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
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
                                                    {/* Preview Pro-Rata (upgrade only) */}
                                                    {currentPlan && isUpgrade && !isPreview && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowProRata(plan.id)}
                                                            className="w-full py-2 rounded-lg text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-300 transition-colors"
                                                        >
                                                            Preview Pro-rata Cost
                                                        </button>
                                                    )}

                                                    {/* Admin instant override */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAssignPlan(selectedAcademy, plan.id, billingCycle)}
                                                        disabled={assigningPlan}
                                                        className="w-full py-2 rounded-lg text-xs font-bold bg-surface-900 text-white hover:bg-surface-800 transition-colors"
                                                    >
                                                        {assigningPlan ? 'Applying...' : `Instant Override · ${billingCycle === 'yearly' ? '12 months' : '1 month'}`}
                                                    </button>

                                                    {plan.price > 0 && (
                                                        <>
                                                            {/* PayPal */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePayPalCheckout(selectedAcademy, plan.id, billingCycle)}
                                                                disabled={paymentProcessing === selectedAcademy.id}
                                                                className="w-full py-2 rounded-lg text-xs font-black border-0 shadow-sm transition-colors flex items-center justify-center gap-1.5 text-white"
                                                                style={{ background: 'linear-gradient(135deg, #0070ba, #1546a0)' }}
                                                            >
                                                                {paymentProcessing === selectedAcademy.id ? (
                                                                    <Loader2 size={14} className="animate-spin" />
                                                                ) : (
                                                                    <CreditCard size={13} />
                                                                )}
                                                                Pay via PayPal
                                                            </button>

                                                            {/* Stripe */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStripeCheckout(selectedAcademy, plan.id)}
                                                                disabled={stripeProcessing === plan.id}
                                                                className="w-full py-2 rounded-lg text-xs font-black border-0 shadow-sm transition-colors flex items-center justify-center gap-1.5 text-white"
                                                                style={{ background: 'linear-gradient(135deg, #635bff, #9d68ff)' }}
                                                            >
                                                                {stripeProcessing === plan.id ? (
                                                                    <Loader2 size={14} className="animate-spin" />
                                                                ) : (
                                                                    <Zap size={13} />
                                                                )}
                                                                Pay via Stripe
                                                            </button>

                                                            {/* Moroccan Cash */}
                                                            <div className="grid grid-cols-2 gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCashCode(selectedAcademy, plan.id, 'wafacash')}
                                                                    disabled={cashProcessing === plan.id}
                                                                    className="py-2 rounded-lg text-[11px] font-black text-white flex items-center justify-center gap-1 transition-colors"
                                                                    style={{ background: '#e63c2f' }}
                                                                >
                                                                    {cashProcessing === plan.id && activeCashProvider[plan.id] === 'wafacash' ? (
                                                                        <Loader2 size={12} className="animate-spin" />
                                                                    ) : (
                                                                        <Building2 size={12} />
                                                                    )}
                                                                    Wafacash
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCashCode(selectedAcademy, plan.id, 'cashplus')}
                                                                    disabled={cashProcessing === plan.id}
                                                                    className="py-2 rounded-lg text-[11px] font-black text-white flex items-center justify-center gap-1 transition-colors"
                                                                    style={{ background: '#1a7f37' }}
                                                                >
                                                                    {cashProcessing === plan.id && activeCashProvider[plan.id] === 'cashplus' ? (
                                                                        <Loader2 size={12} className="animate-spin" />
                                                                    ) : (
                                                                        <Building2 size={12} />
                                                                    )}
                                                                    CashPlus
                                                                </button>
                                                            </div>
                                                        </>
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

            {/* ═══ TRANSACTION HISTORY MODAL ═══ */}
            {showHistoryModal && selectedAcademy && (
                <div className="modal-backdrop">
                    <div className="bg-white border border-surface-200 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-surface-200 shrink-0">
                            <div>
                                <h3 className="text-lg font-semibold text-surface-900">Payment &amp; Billing History</h3>
                                <p className="text-xs text-surface-500 mt-1">Academy: <strong>{selectedAcademy.name}</strong></p>
                            </div>
                            <button
                                onClick={() => { setShowHistoryModal(false); setSelectedAcademy(null); setTransactions([]); setConfirmResult(null); }}
                                className="text-surface-400 hover:text-surface-900 transition-colors"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {loadingTx ? (
                                <div className="py-12 flex justify-center text-emerald-500">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="py-16 text-center text-surface-400 font-medium">
                                    No transactions found for this academy.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {transactions.map(tx => (
                                        <div key={tx.id || tx.paypal_order_id} className="border border-surface-100 rounded-xl p-4 hover:bg-surface-50/50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-3 rounded-xl ${
                                                        tx.status === 'completed' ? 'bg-emerald-50 text-emerald-600'
                                                        : tx.status === 'waiting_deposit' ? 'bg-amber-50 text-amber-600'
                                                        : 'bg-slate-50 text-slate-500'
                                                    }`}>
                                                        {isCashTx(tx) ? <Building2 className="w-5 h-5" /> :
                                                         isStripeTx(tx) ? <Zap className="w-5 h-5" /> :
                                                         <CreditCard className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-surface-900 text-sm">
                                                            {tx.description || `Plan: ${tx.plan_id}`}
                                                        </p>
                                                        <div className="flex items-center gap-3 text-xs text-surface-400 mt-1">
                                                            <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                                                            <span>•</span>
                                                            <span className="font-mono">
                                                                {isCashTx(tx) ? `💵 ${tx.paypal_order_id}` :
                                                                 isStripeTx(tx) ? `⚡ Stripe` :
                                                                 `PayPal`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-black text-surface-900 text-base">{tx.amount} {tx.currency || 'USD'}</p>
                                                    <div className="flex items-center gap-2 mt-1.5 justify-end">
                                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                            tx.status === 'completed'
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                                : tx.status === 'waiting_deposit'
                                                                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                                                    : 'bg-slate-50 text-slate-600 border border-slate-100'
                                                        }`}>
                                                            {tx.status === 'waiting_deposit' ? 'Awaiting Cash' : tx.status}
                                                        </span>

                                                        {/* PayPal verify */}
                                                        {tx.status === 'pending' && tx.paypal_order_id && !isCashTx(tx) && !isStripeTx(tx) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleVerifyOrder(tx.paypal_order_id)}
                                                                disabled={verifyingOrder === tx.paypal_order_id}
                                                                className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                                            >
                                                                {verifyingOrder === tx.paypal_order_id ? 'Verifying...' : 'Verify PayPal'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Cash deposit confirmation panel */}
                                            {tx.status === 'waiting_deposit' && isCashTx(tx) && (
                                                <div className="mt-3 pt-3 border-t border-surface-100">
                                                    {confirmResult && confirmingDeposit === null && (
                                                        <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold mb-3 ${
                                                            confirmResult.success
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                                : 'bg-red-50 text-red-600 border border-red-200'
                                                        }`}>
                                                            {confirmResult.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                            {confirmResult.message}
                                                        </div>
                                                    )}
                                                    <p className="text-[10px] font-black text-surface-500 uppercase tracking-wider mb-2">
                                                        Confirm Cash Deposit
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Enter deposit proof reference..."
                                                            value={proofRef}
                                                            onChange={e => setProofRef(e.target.value)}
                                                            className="flex-1 text-xs px-3 py-2 rounded-lg border border-surface-200 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300 font-mono"
                                                        />
                                                        <button
                                                            onClick={() => handleConfirmDeposit(tx.paypal_order_id)}
                                                            disabled={confirmingDeposit === tx.paypal_order_id || !proofRef.trim()}
                                                            className="px-4 py-2 rounded-lg text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                                                        >
                                                            {confirmingDeposit === tx.paypal_order_id ? (
                                                                <Loader2 size={12} className="animate-spin" />
                                                            ) : (
                                                                <ShieldCheck size={12} />
                                                            )}
                                                            Confirm
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] text-surface-400 mt-1.5">
                                                        Code: <strong className="font-mono text-surface-600">{tx.paypal_order_id}</strong> — Enter the deposit receipt number from the agency
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
