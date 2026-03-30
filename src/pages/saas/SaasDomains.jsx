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
            await authFetch(`${API_URL}/saas/academies/${academyId}/domain`, {
                method: 'DELETE'
            });
            fetchAcademies();
        } catch (err) {
            console.error("Failed to remove domain:", err);
        }
    };

    const [verifyResult, setVerifyResult] = useState(null);

    const handleVerifyDomain = async (academyId) => {
        setVerifying(academyId);
        setVerifyResult(null);
        try {
            const res = await authFetch(`${API_URL}/saas/academies/${academyId}/domain/verify`, {
                method: 'POST'
            });
            if (res.ok) {
                const data = await res.json();
                setVerifyResult(data);
                fetchAcademies();
                // Auto-dismiss after 5 seconds
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
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-100 tracking-tight">Domain Management</h2>
                    <p className="text-slate-400 mt-1">Assign and manage custom domains for client academies.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl transition-colors font-bold text-sm shadow-lg shadow-emerald-600/20"
                >
                    <Plus size={16} /> Assign Domain
                </button>
            </div>

            {/* DNS Instructions Banner */}
            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-5 mt-6">
                <div className="flex gap-4">
                    <div className="p-2.5 bg-blue-500/15 rounded-xl h-max">
                        <Shield className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-blue-300 mb-1">DNS Configuration Guide</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            For each custom domain, the academy admin must create a <strong className="text-blue-300">CNAME record</strong> pointing to{' '}
                            <code className="px-1.5 py-0.5 bg-slate-800 rounded text-blue-300 text-[11px] font-mono">jolly-kangaroo-3c3d92.netlify.app</code>
                            {' '}in their DNS provider. SSL certificates are automatically provisioned via Let's Encrypt.
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10">
                        <Globe className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Domains</p>
                        <p className="text-2xl font-black text-slate-100 mt-0.5">{academiesWithDomains.length}</p>
                    </div>
                </div>
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-amber-500/10">
                        <AlertCircle className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending Setup</p>
                        <p className="text-2xl font-black text-slate-100 mt-0.5">
                            {academiesWithDomains.filter(a => a.domain_status === 'pending').length}
                        </p>
                    </div>
                </div>
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-violet-500/10">
                        <CheckCircle2 className="w-6 h-6 text-violet-400" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Verified</p>
                        <p className="text-2xl font-black text-slate-100 mt-0.5">
                            {academiesWithDomains.filter(a => a.domain_status === 'verified').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Verification Result Toast */}
            {verifyResult && (
                <div className={`mt-4 rounded-2xl p-4 border flex items-start gap-3 animate-fade-in ${
                    verifyResult.status === 'verified' 
                    ? 'bg-emerald-500/10 border-emerald-500/20' 
                    : 'bg-amber-500/10 border-amber-500/20'
                }`}>
                    {verifyResult.status === 'verified' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                        <p className={`text-sm font-bold ${verifyResult.status === 'verified' ? 'text-emerald-300' : 'text-amber-300'}`}>
                            {verifyResult.domain} — {verifyResult.status === 'verified' ? '✅ Domain Verified!' : '⏳ Pending DNS Setup'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {verifyResult.cname_target && `CNAME → ${verifyResult.cname_target} • `}
                            {verifyResult.resolved_ip && `IP: ${verifyResult.resolved_ip} • `}
                            {verifyResult.status !== 'verified' && 'Please configure CNAME record and try again.'}
                        </p>
                    </div>
                    <button onClick={() => setVerifyResult(null)} className="ml-auto text-slate-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Domains Table */}
            {loading ? (
                <div className="py-20 flex justify-center text-emerald-500"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : (
                <div className="bg-[#1e293b]/50 border border-slate-800 rounded-2xl overflow-hidden mt-4">
                    <div className="p-5 border-b border-slate-800/60">
                        <h3 className="text-base font-bold text-slate-200">Assigned Domains</h3>
                    </div>
                    {academiesWithDomains.length === 0 ? (
                        <div className="p-12 text-center">
                            <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400 font-semibold">No domains assigned yet</p>
                            <p className="text-slate-500 text-sm mt-1">Click "Assign Domain" above to get started.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-widest font-bold">
                                    <th className="p-4 font-semibold">Academy</th>
                                    <th className="p-4 font-semibold">Custom Domain</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {academiesWithDomains.map(acc => (
                                    <tr key={acc.id} className="hover:bg-slate-800/20 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400 font-bold text-xs">
                                                    {(acc.name || 'A').charAt(0)}
                                                </div>
                                                <span className="font-semibold text-slate-200 text-sm">{acc.name || 'Unnamed'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm font-mono text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/15">
                                                    {acc.custom_domain}
                                                </code>
                                                <a href={`https://${acc.custom_domain}`} target="_blank" rel="noreferrer"
                                                    className="text-slate-500 hover:text-blue-400 transition-colors">
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {acc.domain_status === 'verified' ? (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full w-max border border-emerald-500/15">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full w-max border border-amber-500/15">
                                                    <AlertCircle className="w-3.5 h-3.5" /> Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center gap-2 justify-end">
                                                <button
                                                    onClick={() => handleVerifyDomain(acc.id)}
                                                    disabled={verifying === acc.id}
                                                    className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
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
                                                    className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800">
                            <h3 className="text-xl font-bold text-white tracking-tight">Assign Custom Domain</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={22} />
                            </button>
                        </div>
                        <form onSubmit={handleAssignDomain} className="p-6 space-y-5">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Academy</label>
                                <select
                                    required
                                    value={formData.academy_id}
                                    onChange={(e) => setFormData({ ...formData, academy_id: e.target.value })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm"
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
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Custom Domain</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. academy.example.com"
                                    value={formData.custom_domain}
                                    onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value.toLowerCase().trim() })}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors text-sm font-mono"
                                />
                                <p className="text-[11px] text-slate-500 mt-2">
                                    The academy admin must point this domain via CNAME to your Netlify deployment.
                                </p>
                            </div>

                            <div className="pt-2 flex gap-3 justify-end">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 rounded-xl text-slate-300 hover:text-white font-semibold transition-colors text-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl transition-colors font-bold flex items-center gap-2 text-sm">
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
