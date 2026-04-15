import { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import { Loader2, Plus, Ban, CheckCircle2, X } from 'lucide-react';

export default function SaasAcademies() {
    const { dir } = useLanguage();
    const [academies, setAcademies] = useState([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => { fetchAcademies(); }, []);

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
        <div className="space-y-6 animate-fade-in" dir={dir}>
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="page-title">Academies Management</h2>
                    <p className="page-subtitle">View and manage all active client academies.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn btn-brand"
                >
                    <Plus size={16} /> Add Academy
                </button>
            </div>

            {loading ? (
                <div className="py-20 text-center text-emerald-500"><Loader2 className="w-8 h-8 mx-auto animate-spin" /></div>
            ) : (
                <div className="table-container">
                    <table className="table-premium w-full text-left">
                        <thead>
                            <tr>
                                <th>Academy Name</th>
                                <th>Created At</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {academies.length === 0 ? (
                                <tr><td colSpan="4" className="text-center py-8 text-surface-400">No academies found.</td></tr>
                            ) : (
                                academies.map(acc => (
                                    <tr key={acc.id}>
                                        <td className="font-semibold text-surface-900">{acc.name || 'Unnamed Academy'}</td>
                                        <td className="text-surface-500">{new Date(acc.created_at).toLocaleDateString()}</td>
                                        <td>
                                            {acc.status === 'suspended' ? (
                                                <span className="badge badge-suspended flex items-center gap-1.5 w-max">
                                                    <Ban className="w-3.5 h-3.5" /> Suspended
                                                </span>
                                            ) : (
                                                <span className="badge badge-active flex items-center gap-1.5 w-max">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-right">
                                            <button
                                                onClick={() => toggleStatus(acc.id, acc.status || 'active')}
                                                disabled={actionLoading === acc.id}
                                                className={`btn text-xs px-3 py-1.5 ml-auto ${
                                                    acc.status === 'suspended'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                    : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                                                }`}
                                            >
                                                {actionLoading === acc.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : acc.status === 'suspended' ? 'Activate' : 'Suspend'}
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
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <div className="flex justify-between items-center p-6 border-b border-surface-200">
                            <h3 className="text-lg font-semibold text-surface-900">Provision New Academy</h3>
                            <button onClick={() => setShowModal(false)} className="text-surface-400 hover:text-surface-900 transition-colors">
                                <X size={22} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-1">Academy Name</label>
                                <input required type="text" name="name" value={formData.name} onChange={handleChange}
                                    className="input" placeholder="e.g., Elite Soccer Academy" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-1">Subdomain (Optional)</label>
                                <input type="text" name="subdomain" value={formData.subdomain} onChange={handleChange}
                                    className="input" placeholder="e.g., elite-soccer" />
                            </div>

                            <div className="border-t border-surface-200 my-4 pt-4">
                                <h4 className="text-xs uppercase tracking-wider font-semibold text-surface-400 mb-4">Initial Admin Account</h4>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-1">Admin Full Name</label>
                                <input required type="text" name="admin_name" value={formData.admin_name} onChange={handleChange}
                                    className="input" placeholder="Jane Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-1">Admin Email</label>
                                <input required type="email" name="admin_email" value={formData.admin_email} onChange={handleChange}
                                    className="input" placeholder="jane@elitesoccer.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-1">Admin Password</label>
                                <input required type="password" name="admin_password" value={formData.admin_password} onChange={handleChange}
                                    className="input" placeholder="Min. 6 characters" minLength="6" />
                            </div>

                            <div className="pt-4 flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={creating} className="btn btn-brand w-[140px] justify-center">
                                    {creating ? <Loader2 size={16} className="animate-spin" /> : "Provision"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
