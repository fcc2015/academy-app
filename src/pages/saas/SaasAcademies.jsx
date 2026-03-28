import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { API_URL } from '../../config';
import { Loader2, Plus, Settings } from 'lucide-react';

export default function SaasAcademies() {
    const { dir } = useLanguage();
    const [academies, setAcademies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAcademies = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_URL}/saas/academies`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
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
        fetchAcademies();
    }, []);

    return (
        <div className="space-y-6" dir={dir}>
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-100 tracking-tight">Academies Management</h2>
                    <p className="text-slate-400 mt-1">View and manage all active client academies.</p>
                </div>
                <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition-colors font-semibold">
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
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="p-2 bg-slate-800 text-slate-300 hover:text-emerald-400 rounded-lg transition-colors">
                                                <Settings size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
