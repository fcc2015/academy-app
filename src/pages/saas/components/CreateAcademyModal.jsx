import React from 'react';
import { Building2, X, MapPin, Loader2 } from 'lucide-react';

export default function CreateAcademyModal({
    showCreate,
    setShowCreate,
    creating,
    createError,
    createForm,
    setCreateForm,
    handleCreate,
    ROLLOUT_CITIES
}) {
    if (!showCreate) return null;

    return (
        <div className="modal-backdrop">
            <div className="modal-content max-w-xl flex flex-col" style={{ maxHeight: '90vh' }}>
                <div className="flex justify-between items-center p-6 border-b border-surface-200 shrink-0">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-surface-600" />
                        <h3 className="text-lg font-semibold text-surface-900">Provision New Academy</h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCreate(false)}
                        className="text-surface-400 hover:text-surface-900"
                    >
                        <X size={22} />
                    </button>
                </div>
                <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">
                    {createError && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
                            {createError}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">
                                Academy Name *
                            </label>
                            <input
                                required
                                className="input"
                                name="name"
                                value={createForm.name}
                                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="e.g., Elite Soccer Academy"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> City
                            </label>
                            <select
                                className="input"
                                value={createForm.city}
                                onChange={e => setCreateForm(f => ({ ...f, city: e.target.value }))}
                            >
                                <option value="">— Select —</option>
                                {ROLLOUT_CITIES.filter(c => c !== 'Other').map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">
                                Subdomain
                            </label>
                            <input
                                className="input"
                                value={createForm.subdomain}
                                onChange={e => setCreateForm(f => ({ ...f, subdomain: e.target.value }))}
                                placeholder="elite-soccer"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-surface-600 mb-2 uppercase tracking-wider">
                                Plan *
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'free',       name: 'Free',       desc: '15 players · 1 admin',   gradient: 'from-slate-400 to-slate-600',     icon: '🆓' },
                                    { id: 'pro',        name: 'Pro',        desc: '100 players · 4 admins', gradient: 'from-blue-500 to-cyan-600',        icon: '⚡' },
                                    { id: 'enterprise', name: 'Enterprise', desc: 'Unlimited + 🏢 Branches', gradient: 'from-violet-500 to-purple-600',   icon: '👑' },
                                ].map(p => {
                                    const selected = createForm.plan_id === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setCreateForm(f => ({ ...f, plan_id: p.id }))}
                                            className={`p-3 rounded-xl border-2 text-center transition-all ${
                                                selected
                                                    ? `bg-gradient-to-br ${p.gradient} text-white border-transparent shadow-lg`
                                                    : 'bg-white border-surface-200 text-surface-700 hover:border-surface-300'
                                            }`}
                                        >
                                            <div className="text-xl mb-1">{p.icon}</div>
                                            <div className="text-sm font-black uppercase tracking-wider">{p.name}</div>
                                            <div className={`text-[10px] mt-1 ${selected ? 'text-white/90' : 'text-surface-500'}`}>{p.desc}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">
                                Notes
                            </label>
                            <input
                                className="input"
                                value={createForm.notes}
                                onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="Internal notes..."
                            />
                        </div>
                    </div>

                    <div className="border-t border-surface-200 pt-4">
                        <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-4">
                            Initial Admin Account
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">
                                    Admin Full Name *
                                </label>
                                <input
                                    required
                                    className="input"
                                    value={createForm.admin_name}
                                    onChange={e => setCreateForm(f => ({ ...f, admin_name: e.target.value }))}
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">
                                    Admin Email *
                                </label>
                                <input
                                    required
                                    type="email"
                                    className="input"
                                    value={createForm.admin_email}
                                    onChange={e => setCreateForm(f => ({ ...f, admin_email: e.target.value }))}
                                    placeholder="jane@elite.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">
                                    Admin Password *
                                </label>
                                <input
                                    required
                                    type="password"
                                    className="input"
                                    minLength="6"
                                    value={createForm.admin_password}
                                    onChange={e => setCreateForm(f => ({ ...f, admin_password: e.target.value }))}
                                    placeholder="Min. 6 characters"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                        <button
                            type="button"
                            onClick={() => setShowCreate(false)}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creating}
                            className="btn btn-brand w-[140px] justify-center"
                        >
                            {creating ? <Loader2 size={16} className="animate-spin" /> : 'Provision'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
