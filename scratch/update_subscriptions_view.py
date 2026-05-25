import re

filepath = r"c:\Users\hp\Desktop\python_learning\academy-app\src\pages\saas\SaasSubscriptions.jsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find the start of the return statement
start_marker = '    return (\n        <div className="space-y-8 animate-fade-in">'
idx = content.find(start_marker)
if idx == -1:
    print("Start marker not found!")
    exit(1)

# The return block ends at the last closing parenthesis and semicolon before the end of the file.
# Let's look for the end of the function. SaasSubscriptions ends with:
#     );
# }
end_marker = '\n    );\n}'
end_idx = content.rfind(end_marker)
if end_idx == -1:
    print("End marker not found!")
    exit(1)

new_return_block = """    return (
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
                daysAhead={daysAhead}
                setDaysAhead={setDaysAhead}
                sendingReminders={sendingReminders}
                handleSendReminders={handleSendReminders}
                reminderResult={reminderResult}
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
                transactions={transactions}
                loadingTx={loadingTx}
                verifyingOrder={verifyingOrder}
                handleVerifyOrder={handleVerifyOrder}
            />
        </div>"""

new_content = content[:idx] + new_return_block + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("SaasSubscriptions.jsx refactored successfully!")
