import { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import {
    Loader2, Mail, Send, FileText, Users, CheckCircle2,
    AlertTriangle, X, ChevronDown, Search
} from 'lucide-react';

const TEMPLATE_ICONS = {
    welcome: '🎉',
    payment_receipt: '💳',
    renewal_reminder: '⏰',
    suspension_notice: '⚠️',
    custom: '✏️',
};

export default function SaasEmails() {
    const [templates, setTemplates] = useState([]);
    const [academies, setAcademies] = useState([]);
    const [loading, setLoading] = useState(true);

    // Send form
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [selectedAcademies, setSelectedAcademies] = useState(new Set());
    const [variables, setVariables] = useState({});
    const [customSubject, setCustomSubject] = useState('');
    const [customBody, setCustomBody] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [search, setSearch] = useState('');
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [tRes, aRes] = await Promise.all([
                    authFetch(`${API_URL}/saas/emails/templates`),
                    authFetch(`${API_URL}/saas/academies`),
                ]);
                if (tRes.ok) setTemplates(await tRes.json());
                if (aRes.ok) setAcademies(await aRes.json());
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filteredAcademies = academies.filter(a => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (a.name || '').toLowerCase().includes(q) ||
               (a.subdomain || '').toLowerCase().includes(q);
    });

    const toggleAcademy = (id) => {
        setSelectedAcademies(prev => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });
    };

    const selectAll = () => {
        if (selectedAcademies.size === academies.length) {
            setSelectedAcademies(new Set());
        } else {
            setSelectedAcademies(new Set(academies.map(a => a.id)));
        }
    };

    const handleSend = async () => {
        if (!selectedTemplate || selectedAcademies.size === 0) return;
        setSending(true);
        setResult(null);
        try {
            const payload = {
                template: selectedTemplate.id,
                academy_ids: [...selectedAcademies],
                variables,
            };
            if (selectedTemplate.id === 'custom') {
                payload.custom_subject = customSubject;
                payload.custom_body = customBody;
            }
            const res = await authFetch(`${API_URL}/saas/emails/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setResult(await res.json());
            } else {
                setResult({ error: 'Failed to send emails.' });
            }
        } catch {
            setResult({ error: 'Network error.' });
        } finally {
            setSending(false);
        }
    };

    if (loading) return (
        <div className="py-32 flex justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h2 className="page-title">Email System</h2>
                <p className="page-subtitle">Send templated emails to academy administrators.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Template Selection + Variables */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Templates */}
                    <div className="premium-card p-6">
                        <h3 className="text-sm font-bold text-surface-800 mb-4 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-500" />
                            Choose Template
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {templates.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setSelectedTemplate(t);
                                        setVariables({});
                                        setResult(null);
                                    }}
                                    className={`p-4 rounded-xl border-2 text-left transition-all hover-lift ${
                                        selectedTemplate?.id === t.id
                                            ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                            : 'border-surface-200 bg-white hover:border-surface-300'
                                    }`}
                                >
                                    <span className="text-2xl mb-2 block">{TEMPLATE_ICONS[t.id] || '📧'}</span>
                                    <p className="text-sm font-bold text-surface-900">{t.name}</p>
                                    <p className="text-[10px] text-surface-400 mt-1 truncate">{t.subject}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Template Variables / Custom Content */}
                    {selectedTemplate && (
                        <div className="premium-card p-6 animate-fade-in">
                            <h3 className="text-sm font-bold text-surface-800 mb-4 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-violet-500" />
                                {selectedTemplate.id === 'custom' ? 'Compose Email' : 'Template Variables'}
                            </h3>

                            {selectedTemplate.id === 'custom' ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Subject *</label>
                                        <input className="input" value={customSubject}
                                            onChange={e => setCustomSubject(e.target.value)}
                                            placeholder="Email subject..." />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Body *</label>
                                        <textarea className="input h-40 resize-none" value={customBody}
                                            onChange={e => setCustomBody(e.target.value)}
                                            placeholder="Write your email content here..." />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedTemplate.variables
                                        .filter(v => !['academy_name', 'login_url', 'date', 'plan'].includes(v))
                                        .map(v => (
                                            <div key={v}>
                                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">
                                                    {v.replace(/_/g, ' ')}
                                                </label>
                                                <input className="input"
                                                    value={variables[v] || ''}
                                                    onChange={e => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                                                    placeholder={`Enter ${v.replace(/_/g, ' ')}...`} />
                                            </div>
                                        ))}
                                    {selectedTemplate.variables.filter(v => !['academy_name', 'login_url', 'date', 'plan'].includes(v)).length === 0 && (
                                        <p className="text-sm text-surface-400 py-2">
                                            ✅ No additional variables needed. Academy name, plan, and date will auto-fill.
                                        </p>
                                    )}

                                    {/* Preview */}
                                    <div className="mt-4 p-4 rounded-xl bg-surface-50 border border-surface-100">
                                        <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Preview</p>
                                        <p className="text-sm font-bold text-surface-800 mb-2">{selectedTemplate.subject}</p>
                                        <div className="text-xs text-surface-500 whitespace-pre-wrap leading-relaxed border-t border-surface-100 pt-2">
                                            {templates.find(t => t.id === selectedTemplate.id)?.subject || ''}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Academy Selection + Send */}
                <div className="space-y-6">
                    <div className="premium-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-surface-800 flex items-center gap-2">
                                <Users className="w-4 h-4 text-emerald-500" />
                                Recipients
                            </h3>
                            <button onClick={selectAll} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700">
                                {selectedAcademies.size === academies.length ? 'Deselect all' : 'Select all'}
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative mb-3">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search..." className="input pl-8 text-xs py-2" />
                        </div>

                        {/* Selection count */}
                        <div className="text-xs font-bold text-indigo-600 mb-3">
                            {selectedAcademies.size} of {academies.length} selected
                        </div>

                        {/* Academy list */}
                        <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                            {filteredAcademies.map(a => (
                                <button
                                    key={a.id}
                                    onClick={() => toggleAcademy(a.id)}
                                    className={`w-full flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all text-xs ${
                                        selectedAcademies.has(a.id)
                                            ? 'border-indigo-300 bg-indigo-50'
                                            : 'border-surface-100 bg-white hover:bg-surface-50'
                                    }`}
                                >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                        selectedAcademies.has(a.id)
                                            ? 'bg-indigo-500 border-indigo-500 text-white'
                                            : 'border-surface-300'
                                    }`}>
                                        {selectedAcademies.has(a.id) && <CheckCircle2 className="w-3 h-3" />}
                                    </div>
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0"
                                        style={{ background: a.primary_color || '#6366f1' }}>
                                        {(a.name || 'A').charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-surface-900 truncate">{a.name}</p>
                                        <p className="text-[9px] text-surface-400">{a.plan_id || 'free'} • {a.status || 'active'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Send Button */}
                    <button
                        onClick={handleSend}
                        disabled={!selectedTemplate || selectedAcademies.size === 0 || sending}
                        className="btn btn-brand w-full py-3 text-sm justify-center disabled:opacity-50"
                    >
                        {sending ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                        ) : (
                            <><Send className="w-4 h-4" /> Send to {selectedAcademies.size} Academies</>
                        )}
                    </button>

                    {/* Result */}
                    {result && (
                        <div className={`rounded-xl p-4 text-sm animate-fade-in ${
                            result.error
                                ? 'bg-red-50 border border-red-200 text-red-600'
                                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                        }`}>
                            {result.error ? (
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    {result.error}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 font-bold">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Sent to {result.sent} academies
                                        {result.failed > 0 && <span className="text-amber-600">({result.failed} failed)</span>}
                                    </div>
                                    {result.details?.slice(0, 5).map((d, i) => (
                                        <div key={i} className="text-xs flex items-center gap-1 pl-6">
                                            <Mail className="w-3 h-3" /> {d.academy} — {d.email}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
