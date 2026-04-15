import { useState, useEffect } from 'react';
import { Globe, Plus, CheckCircle2, AlertCircle, Loader2, X, ExternalLink, Trash2, RefreshCw, Shield } from 'lucide-react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';

export default function SaasDomains() {
    const [academies, setAcademies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ academy_id: '', custom_domain: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [verifying, setVerifying] = useState(null);
    const [verifyResult, setVerifyResult] = useState(null);

    const fetchAcademies = async () => {
        try {
            const res = await authFetch(`${API_URL}/saas/academies`);
            if (res.ok) {
                const data = await res.json();
                setAcademies(data);
            }
        } catch (err) {
            console.error("Failed to fetch academies:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAcademies(); }, []);

    const handleAssignDomain = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const res = await authFetch(`${API_URL}/saas/academies/${formData.academy_id}/domain`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ custom_domain: formData.custom_domain })
            });
            if (res.ok) {
                setShowModal(false);
                setFormData({ academy_id: '', custom_domain: '' });
                fetchAcademies();
            } else {
                const data = await res.json();
                setError(data.detail || 'Failed to assign domain.');
            }
        } catch (err) {
            setError('Network error.');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveDomain = async (academyId) => {
        try {
            await authFetch(`${API_URL}/saas/academies/${academyId}/domain`, { method: 'DELETE' });
            fetchAcademies();
        } catch (err) {
            console.error("Failed to remove domain:", err);
        }
    };

    const handleVerifyDomain = async (academyId) => {
        setVerifying(academyId);
        setVerifyResult(null);
        try {
            const res = await authFetch(`${API_URL}/saas/academies/${academyId}/domain/verify`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setVerifyResult(data);
                fetchAcademies();
                setTimeout(() => setVerifyResult(null), 5000);
            }
        } catch (err) {
            console.error("Verify failed:", err);
        } finally {
            setTimeout(() => setVerifying(null), 800);
        }
    };

    const academiesWithDomains = academies.filter(a => a.custom_domain);
    const academiesWithoutDomains = academies.filter(a => !a.custom_domain);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="page-title">Domain Management</h2>
                    <p className="page-subtitle">Assign and manage custom domains for client academies.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn btn-brand">
                    <Plus size={16} /> Assign Domain
                </button>
            </div>

            {/* DNS Instructions Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex gap-4">
                    <div className="p-2.5 bg-blue-100 rounded-xl h-max">
                        <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-blue-800 mb-1">DNS Configuration Guide</h3>
                        <p className="text-xs text-blue-600 leading-relaxed">
                            For each custom domain, the academy admin must create a <strong>CNAME record</strong> pointing to{' '}
                            <code className="px-1.5 py-0.5 bg-blue-100 border border-blue-200 rounded text-blue-700 text-[11px] font-mono">jolly-kangaroo-3c3d92.netlify.app</code>
                            {' '}in their DNS provider. SSL certificates are automatically provisioned via Let's Encrypt.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="premium-card p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-50">
                        <Globe className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider">Active Domains</p>
                        <p className="text-2xl font-bold text-surface-900 mt-0.5">{academiesWithDomains.length}</p>
                    </div>
                </div>
                <div className="premium-card p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-amber-50">
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider">Pending Setup</p>
                        <p className="text-2xl font-bold text-surface-900 mt-0.5">
                            {academiesWithDomains.filter(a => a.domain_status === 'pending').length}
                        </p>
                    </div>
                </div>
                <div className="premium-card p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-violet-50">
                        <CheckCircle2 className="w-6 h-6 text-violet-600" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider">Verified</p>
                        <p className="text-2xl font-bold text-surface-900 mt-0.5">
                            {academiesWithDomains.filter(a => a.domain_status === 'verified').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Verification Result Toast */}
            {verifyResult && (
                <div className={`rounded-xl p-4 border flex items-start gap-3 animate-fade-in ${
                    verifyResult.status === 'verified'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                    {verifyResult.status === 'verified' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                        <p className={`text-sm font-semibold ${verifyResult.status === 'verified' ? 'text-emerald-800' : 'text-amber-800'}`}>
                            {verifyResult.domain} — {verifyResult.status === 'verified' ? '✅ Domain Verified!' : '⏳ Pending DNS Setup'}
                        </p>
                        <p className="text-xs text-surface-500 mt-1">
                            {verifyResult.cname_target && `CNAME → ${verifyResult.cname_target} • `}
                            {verifyResult.resolved_ip && `IP: ${verifyResult.resolved_ip} • `}
                            {verifyResult.status !== 'verified' && 'Please configure CNAME record and try again.'}
                        </p>
                    </div>
                    <button onClick={() => setVerifyResult(null)} className="ml-auto text-surface-400 hover:text-surface-700 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Domains Table */}
            {loading ? (
                <div className="py-20 flex justify-center text-emerald-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : (
                <div className="table-container">
                    <div className="p-5 border-b border-surface-200">
                        <h3 className="text-sm font-semibold text-surface-900">Assigned Domains</h3>
                    </div>
                    {academiesWithDomains.length === 0 ? (
                        <div className="p-12 text-center">
                            <Globe className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                            <p className="text-surface-500 font-medium">No domains assigned yet</p>
                            <p className="text-surface-400 text-sm mt-1">Click "Assign Domain" above to get started.</p>
                        </div>
                    ) : (
                        <table className="table-premium w-full text-left">
                            <thead>
                                <tr>
                                    <th>Academy</th>
                                    <th>Custom Domain</th>
                                    <th>Status</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {academiesWithDomains.map(acc => (
                                    <tr key={acc.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                                                    {(acc.name || 'A').charAt(0)}
                                                </div>
                                                <span className="font-medium text-surface-900 text-sm">{acc.name || 'Unnamed'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm font-mono text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                                    {acc.custom_domain}
                                                </code>
                                                <a href={`https://${acc.custom_domain}`} target="_blank" rel="noreferrer"
                                                    className="text-surface-400 hover:text-blue-600 transition-colors">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                        </td>
                                        <td>
                                            {acc.domain_status === 'verified' ? (
                                                <span className="badge badge-active flex items-center gap-1.5 w-max">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                                                </span>
                                            ) : (
                                                <span className="badge badge-pending flex items-center gap-1.5 w-max">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center gap-2 justify-end">
                                                <button
                                                    onClick={() => handleVerifyDomain(acc.id)}
                                                    disabled={verifying === acc.id}
                                                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-100"
                                                    title="Verify DNS"
                                                >
                                                    {verifying === acc.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveDomain(acc.id)}
                                                    className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors border border-rose-100"
                                                    title="Remove Domain"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Assign Domain Modal */}
            {showModal && (
                <div className="modal-backdrop">
                    <div className="modal-content">
                        <div className="flex justify-between items-center p-6 border-b border-surface-200">
                            <h3 className="text-lg font-semibold text-surface-900">Assign Custom Domain</h3>
                            <button onClick={() => setShowModal(false)} className="text-surface-400 hover:text-surface-900 transition-colors">
                                <X size={22} />
                            </button>
                        </div>
                        <form onSubmit={handleAssignDomain} className="p-6 space-y-5">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm font-medium flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">Select Academy</label>
                                <select
                                    required
                                    value={formData.academy_id}
                                    onChange={(e) => setFormData({ ...formData, academy_id: e.target.value })}
                                    className="input"
                                >
                                    <option value="">Choose an academy...</option>
                                    {academiesWithoutDomains.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name || 'Unnamed Academy'}</option>
                                    ))}
                                    {academiesWithDomains.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} (replace: {acc.custom_domain})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-surface-700 mb-2">Custom Domain</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. academy.example.com"
                                    value={formData.custom_domain}
                                    onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value.toLowerCase().trim() })}
                                    className="input font-mono"
                                />
                                <p className="text-[11px] text-surface-400 mt-2">
                                    The academy admin must point this domain via CNAME to your Netlify deployment.
                                </p>
                            </div>

                            <div className="pt-2 flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="btn btn-brand">
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                                    Assign Domain
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
