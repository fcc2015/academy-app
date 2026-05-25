import React from 'react';
import { X, ArrowUpRight, CheckCircle2, Calculator, Loader2, Calendar, CreditCard, ShieldCheck, Dumbbell, UserCog, Users, ArrowUpRight as ArrowUpRightIcon } from 'lucide-react';

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
    loadingTx,
    verifyingOrder,
    handleVerifyOrder
}) {
    return (
        <>
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
                                        </div>

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
                                                            type="button"
                                                            onClick={() => setShowProRata(plan.id)}
                                                            className="w-full py-2 rounded-lg text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-300 transition-colors"
                                                        >
                                                            Preview Pro-rata Cost
                                                        </button>
                                                    )}

                                                    {/* Free instant activation / Admin override */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAssignPlan(selectedAcademy, plan.id)}
                                                        disabled={assigningPlan}
                                                        className="w-full py-2 rounded-lg text-xs font-bold bg-surface-900 text-white hover:bg-surface-800 transition-colors"
                                                    >
                                                        {assigningPlan ? 'Applying...' : 'Instant Override (No Charge)'}
                                                    </button>

                                                    {/* Paid checkout via PayPal */}
                                                    {plan.price > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePayPalCheckout(selectedAcademy, plan.id)}
                                                            disabled={paymentProcessing === selectedAcademy.id}
                                                            className="w-full py-2 rounded-lg text-xs font-black bg-amber-400 text-amber-950 hover:bg-amber-500 border-0 shadow-sm transition-colors flex items-center justify-center gap-1.5"
                                                        >
                                                            {paymentProcessing === selectedAcademy.id ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : (
                                                                'Pay now with PayPal'
                                                            )}
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

            {/* ═══ TRANSACTION HISTORY MODAL ═══ */}
            {showHistoryModal && selectedAcademy && (
                <div className="modal-backdrop">
                    <div className="bg-white border border-surface-200 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b border-surface-200 shrink-0">
                            <div>
                                <h3 className="text-lg font-semibold text-surface-900">Payment &amp; Billing History</h3>
                                <p className="text-xs text-surface-500 mt-1">Academy: <strong>{selectedAcademy.name}</strong></p>
                            </div>
                            <button onClick={() => { setShowHistoryModal(false); setSelectedAcademy(null); setTransactions([]); }} className="text-surface-400 hover:text-surface-900 transition-colors">
                                <X size={22} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            {loadingTx ? (
                                <div className="py-12 flex justify-center text-emerald-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
                            ) : transactions.length === 0 ? (
                                <div className="py-16 text-center text-surface-400 font-medium">No transactions found for this academy.</div>
                            ) : (
                                <div className="space-y-4">
                                    {transactions.map(tx => (
                                        <div key={tx.id} className="border border-surface-100 rounded-xl p-4 flex items-center justify-between hover:bg-surface-50/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${tx.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    <CreditCard className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-surface-900 text-sm">{tx.description || `Plan: ${tx.plan_id}`}</p>
                                                    <div className="flex items-center gap-3 text-xs text-surface-400 mt-1">
                                                        <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                                                        <span>•</span>
                                                        <span className="font-mono">ID: {tx.paypal_order_id || 'manual'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-surface-900 text-base">{tx.amount} {tx.currency || 'USD'}</p>
                                                <div className="flex items-center gap-2 mt-1.5 justify-end">
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        tx.status === 'completed' 
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                                                    }`}>
                                                        {tx.status}
                                                    </span>
                                                    {tx.status === 'pending' && tx.paypal_order_id && (
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
