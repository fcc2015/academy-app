import { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import { Loader2, Plus, Ban, CheckCircle2, X } from 'lucide-react';

export default function SaasAcademies() {
    const { dir } = useLanguage();
    const [academies, setAcademies] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        subdomain: '',
        admin_name: '',
        admin_email: '',
        admin_password: ''
    });
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    const fetchAcademies = async () => {
        try {
            const res = await authFetch(`${API_URL}/saas/academies`);
            if (res.ok) {
                const data = await res.json();
                setAcademies(data);
            }
        } catch (error) {
            console.error("Failed to fetch academies", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAcademies();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        setCreating(true);
        try {
            const res = await authFetch(`${API_URL}/saas/academies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (res.ok) {
                setShowModal(false);
                setFormData({ name: '', subdomain: '', admin_name: '', admin_email: '', admin_password: '' });
                fetchAcademies();
            } else {
                setError(data.detail || 'Failed to provision academy.');
            }
        } catch (err) {
            console.error("Creation error:", err);
            setError('Network error occurred.');
        } finally {
            setCreating(false);
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        setActionLoading(id);
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            const res = await authFetch(`${API_URL}/saas/academies/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                setAcademies(academies.map(acc => acc.id === id ? { ...acc, status: newStatus } : acc));
            }
        } catch (err) {
            console.error("Toggle status error:", err);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6" dir={dir}>
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-100 tracking-tight">Academies Management</h2>
                    <p className="text-slate-400 mt-1">View and manage all active client academies.</p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition-colors font-semibold"
                >
                    <Plus size={18} /> Add Academy
                </button>
            </div>

            {loading ? (
                <div className="py-20 text-center text-emerald-500"><Loader2 className="w-8 h-8 mx-auto animate-spin" /></div>
            ) : (
                <div className="bg-[#1e293b]/50 border border-slate-800 rounded-2xl overflow-hidden mt-8">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-800">
                                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Academy Name</th>
                                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Created At</th>
                                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
                                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {academies.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-8 text-slate-500">No academies found.</td></tr>
                            ) : (
                                academies.map(acc => (
                                    <tr key={acc.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                        <td className="py-4 px-6 font-semibold text-slate-200">{acc.name || 'Unnamed Academy'}</td>
                                        <td className="py-4 px-6 text-slate-400">{new Date(acc.created_at).toLocaleDateString()}</td>
                                        <td className="py-4 px-6">
                                            {acc.status === 'suspended' ? (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5 w-max">
                                                    <Ban className="w-3.5 h-3.5" /> Suspended
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 w-max">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button 
                                                onClick={() => toggleStatus(acc.id, acc.status || 'active')}
                                                disabled={actionLoading === acc.id}
                                                className={`p-2 rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2 ml-auto ${
                                                    acc.status === 'suspended' 
                                                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' 
                                                    : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                                                }`}
                                            >
                                                {actionLoading === acc.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : acc.status === 'suspended' ? (
                                                    <>Activate</>
                                                ) : (
                                                    <>Suspend</>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Academy Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white tracking-tight">Provision New Academy</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Academy Name</label>
                                <input required type="text" name="name" value={formData.name} onChange={handleChange} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500" 
                                    placeholder="e.g., Elite Soccer Academy" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Subdomain (Optional)</label>
                                <input type="text" name="subdomain" value={formData.subdomain} onChange={handleChange} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500" 
                                    placeholder="e.g., elite-soccer" />
                            </div>

                            <div className="border-t border-slate-800 my-4 pt-4">
                                <h4 className="text-sm uppercase tracking-wider font-bold text-slate-500 mb-4">Initial Admin Account</h4>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Admin Full Name</label>
                                <input required type="text" name="admin_name" value={formData.admin_name} onChange={handleChange} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500" 
                                    placeholder="Jane Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Admin Email</label>
                                <input required type="email" name="admin_email" value={formData.admin_email} onChange={handleChange} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500" 
                                    placeholder="jane@elitesoccer.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-1">Admin Password</label>
                                <input required type="password" name="admin_password" value={formData.admin_password} onChange={handleChange} 
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500" 
                                    placeholder="Min. 6 characters" minLength="6" />
                            </div>

                            <div className="pt-4 flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-slate-300 hover:text-white font-semibold transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={creating} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl transition-colors font-bold flex items-center gap-2 w-[160px] justify-center">
                                    {creating ? <Loader2 size={18} className="animate-spin" /> : "Provision"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
