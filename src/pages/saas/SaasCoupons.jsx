import { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import {
    Loader2, Plus, X, Ticket, ToggleLeft, ToggleRight,
    Trash2, Copy, CheckCircle2, Percent, DollarSign, AlertTriangle
} from 'lucide-react';

export default function SaasCoupons() {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [copied, setCopied] = useState(null);
    const [form, setForm] = useState({
        code: '', discount_type: 'percentage', discount_value: '', is_active: true
    });

    const fetchCoupons = async () => {
        try {
            const res = await authFetch(`${API_URL}/coupons/`);
            if (res.ok) setCoupons(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCoupons(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateError('');
        setCreating(true);
        try {
            const res = await authFetch(`${API_URL}/coupons/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    code: form.code.toUpperCase().trim(),
                    discount_value: parseFloat(form.discount_value),
                }),
            });
            if (res.ok) {
                setShowCreate(false);
                setForm({ code: '', discount_type: 'percentage', discount_value: '', is_active: true });
                fetchCoupons();
            } else {
                const data = await res.json();
                setCreateError(data.detail || 'Failed to create coupon.');
            }
        } catch {
            setCreateError('Network error.');
        } finally {
            setCreating(false);
        }
    };

    const toggleActive = async (coupon) => {
        const newStatus = !coupon.is_active;
        try {
            const res = await authFetch(`${API_URL}/coupons/${coupon.id}/toggle?is_active=${newStatus}`, { method: 'PATCH' });
            if (res.ok) {
                setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: newStatus } : c));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id) => {
        try {
            const res = await authFetch(`${API_URL}/coupons/${id}`, { method: 'DELETE' });
            if (res.ok) setCoupons(prev => prev.filter(c => c.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
    };

    // Auto-generate random code
    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'ACAD-';
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
        setForm(f => ({ ...f, code }));
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="page-title">Coupon Codes</h2>
                    <p className="page-subtitle">Create discount codes for academy subscriptions.</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="btn btn-brand">
                    <Plus size={16} /> New Coupon
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Coupons', value: coupons.length, gradient: 'from-indigo-500 to-blue-600', icon: Ticket },
                    { label: 'Active', value: coupons.filter(c => c.is_active).length, gradient: 'from-emerald-500 to-teal-600', icon: CheckCircle2 },
                    { label: 'Inactive', value: coupons.filter(c => !c.is_active).length, gradient: 'from-slate-500 to-slate-700', icon: AlertTriangle },
                ].map((s, i) => (
                    <div key={i} className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-4 text-white shadow-lg hover-lift`}>
                        <div className="p-2 rounded-xl bg-white/20 w-fit mb-2"><s.icon className="w-4 h-4" /></div>
                        <p className="text-2xl font-black tabular-nums">{s.value}</p>
                        <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Coupons Grid */}
            {loading ? (
                <div className="py-20 text-center"><Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" /></div>
            ) : coupons.length === 0 ? (
                <div className="py-16 text-center text-surface-400">
                    <Ticket className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No coupons yet. Create your first one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {coupons.map(coupon => (
                        <div key={coupon.id} className={`premium-card p-5 relative overflow-hidden transition-all ${
                            !coupon.is_active ? 'opacity-60' : ''
                        }`}>
                            {/* Decorative corner */}
                            <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-[60px] ${
                                coupon.discount_type === 'percentage' ? 'bg-violet-100' : 'bg-emerald-100'
                            }`} />

                            <div className="relative">
                                {/* Code */}
                                <div className="flex items-center gap-2 mb-3">
                                    <div className={`p-2 rounded-xl ${
                                        coupon.discount_type === 'percentage' ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600'
                                    }`}>
                                        {coupon.discount_type === 'percentage' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1">
                                        <button onClick={() => copyCode(coupon.code)}
                                            className="font-mono font-black text-lg text-surface-900 hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                                            {coupon.code}
                                            {copied === coupon.code
                                                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                : <Copy className="w-3.5 h-3.5 text-surface-300" />
                                            }
                                        </button>
                                    </div>
                                </div>

                                {/* Discount */}
                                <div className="mb-3">
                                    <span className={`text-2xl font-black ${
                                        coupon.discount_type === 'percentage' ? 'text-violet-600' : 'text-emerald-600'
                                    }`}>
                                        {coupon.discount_type === 'percentage'
                                            ? `${coupon.discount_value}%`
                                            : `${coupon.discount_value} MAD`
                                        }
                                    </span>
                                    <span className="text-xs text-surface-400 ml-1.5 font-medium">
                                        {coupon.discount_type === 'percentage' ? 'off' : 'discount'}
                                    </span>
                                </div>

                                {/* Meta */}
                                <div className="flex items-center justify-between text-xs text-surface-400">
                                    <span>{new Date(coupon.created_at).toLocaleDateString()}</span>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => toggleActive(coupon)}
                                            className={`flex items-center gap-1 font-bold transition-colors ${
                                                coupon.is_active ? 'text-emerald-500' : 'text-surface-400'
                                            }`}>
                                            {coupon.is_active
                                                ? <><ToggleRight className="w-5 h-5" /> Active</>
                                                : <><ToggleLeft className="w-5 h-5" /> Inactive</>
                                            }
                                        </button>
                                        <button onClick={() => handleDelete(coupon.id)}
                                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div className="modal-backdrop">
                    <div className="modal-content max-w-md">
                        <div className="flex justify-between items-center p-6 border-b border-surface-200">
                            <div className="flex items-center gap-2">
                                <Ticket className="w-5 h-5 text-indigo-500" />
                                <h3 className="text-lg font-bold text-surface-900">New Coupon</h3>
                            </div>
                            <button onClick={() => setShowCreate(false)} className="text-surface-400 hover:text-surface-900">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            {createError && (
                                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">{createError}</div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Coupon Code *</label>
                                <div className="flex gap-2">
                                    <input required className="input flex-1 font-mono uppercase"
                                        value={form.code}
                                        onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                        placeholder="e.g., ACAD-SUMMER24" />
                                    <button type="button" onClick={generateCode}
                                        className="btn btn-secondary text-xs shrink-0">Generate</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Type *</label>
                                    <select className="input" value={form.discount_type}
                                        onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}>
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (MAD)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Value *</label>
                                    <input required type="number" min="1" step="0.01" className="input"
                                        value={form.discount_value}
                                        onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                                        placeholder={form.discount_type === 'percentage' ? 'e.g., 20' : 'e.g., 50'} />
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end pt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" disabled={creating} className="btn btn-brand w-[130px] justify-center">
                                    {creating ? <Loader2 size={16} className="animate-spin" /> : 'Create Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
