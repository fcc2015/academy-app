import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, CheckCircle, XCircle, Search, Star, Trash2 } from 'lucide-react';

const TryoutsManagement = () => {
    const [tryouts, setTryouts] = useState([]);
    const [selectedTryout, setSelectedTryout] = useState(null);
    const [candidates, setCandidates] = useState([]);
    
    useEffect(() => {
        fetchTryouts();
    }, []);

    const fetchTryouts = async () => {
        const res = await authFetch(`${API_URL}/tryouts/`);
        if (res.ok) setTryouts(await res.json());
    };

    const loadCandidates = async (tryout) => {
        setSelectedTryout(tryout);
        const res = await authFetch(`${API_URL}/tryouts/${tryout.id}/candidates`);
        if (res.ok) setCandidates(await res.json());
    };

    const addTryout = async (e) => {
        e.preventDefault();
        const data = {
            name: e.target.name.value,
            date: e.target.date.value,
            time: e.target.time.value
        };
        const res = await authFetch(`${API_URL}/tryouts/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            e.target.reset();
            fetchTryouts();
        }
    };

    const addCandidate = async (e) => {
        e.preventDefault();
        const data = {
            full_name: e.target.full_name.value,
            age: parseInt(e.target.age.value),
            position: e.target.position.value,
            phone: e.target.phone.value
        };
        const res = await authFetch(`${API_URL}/tryouts/${selectedTryout.id}/candidates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            e.target.reset();
            loadCandidates(selectedTryout);
        }
    };

    const updateCandidateStatus = async (id, status) => {
        const res = await authFetch(`${API_URL}/tryouts/candidates/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) loadCandidates(selectedTryout);
    };

    return (
        <div className="animate-fade-in pb-10">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Tryouts (اختبارات)</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Tryouts List */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 premium-shadow">
                    <h3 className="font-bold text-lg mb-4">Create Tryout</h3>
                    <form onSubmit={addTryout} className="space-y-3 mb-6">
                        <input name="name" placeholder="Name (e.g. Summer U14)" required className="w-full px-3 py-2 border rounded-xl" />
                        <input name="date" type="date" required className="w-full px-3 py-2 border rounded-xl" />
                        <input name="time" type="time" required className="w-full px-3 py-2 border rounded-xl" />
                        <button className="w-full bg-indigo-600 text-white font-bold py-2 rounded-xl">Create</button>
                    </form>

                    <h3 className="font-bold text-lg mb-4">Existing Tryouts</h3>
                    <div className="space-y-2">
                        {tryouts.map(t => (
                            <div 
                                key={t.id} 
                                onClick={() => loadCandidates(t)}
                                className={`p-3 border rounded-xl cursor-pointer ${selectedTryout?.id === t.id ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50'}`}
                            >
                                <div className="font-bold">{t.name}</div>
                                <div className="text-sm text-slate-500">{t.date}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Candidates List */}
                <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 premium-shadow">
                    {selectedTryout ? (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-xl">{selectedTryout.name} Candidates</h3>
                            </div>
                            
                            <form onSubmit={addCandidate} className="flex gap-2 mb-6">
                                <input name="full_name" placeholder="Full Name" required className="flex-1 px-3 py-2 border rounded-xl" />
                                <input name="age" type="number" placeholder="Age" required className="w-20 px-3 py-2 border rounded-xl" />
                                <input name="position" placeholder="Pos" required className="w-24 px-3 py-2 border rounded-xl" />
                                <input name="phone" placeholder="Phone" className="flex-1 px-3 py-2 border rounded-xl" />
                                <button className="bg-emerald-600 text-white font-bold px-4 rounded-xl flex items-center gap-2"><UserPlus size={18}/> Add</button>
                            </form>

                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-slate-400 border-b">
                                        <th className="pb-2">Name</th>
                                        <th className="pb-2">Age</th>
                                        <th className="pb-2">Position</th>
                                        <th className="pb-2">Status</th>
                                        <th className="pb-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidates.map(c => (
                                        <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                                            <td className="py-3 font-bold">{c.full_name}</td>
                                            <td>{c.age}</td>
                                            <td>{c.position}</td>
                                            <td>
                                                <span className={`px-2 py-1 text-xs rounded-md font-bold ${
                                                    c.status === 'Accepted' ? 'bg-emerald-100 text-emerald-700' :
                                                    c.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-slate-100'
                                                }`}>{c.status}</span>
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button onClick={() => updateCandidateStatus(c.id, 'Accepted')} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><CheckCircle size={18}/></button>
                                                    <button onClick={() => updateCandidateStatus(c.id, 'Rejected')} className="text-red-600 hover:bg-red-50 p-1 rounded"><XCircle size={18}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    ) : (
                        <div className="text-center text-slate-400 py-20">Select a tryout to manage candidates</div>
                    )}
                </div>
            </div>
        </div>
    );
};
export default TryoutsManagement;
