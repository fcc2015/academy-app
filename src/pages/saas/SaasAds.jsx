import { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import {
    Loader2, Plus, X, Megaphone, ToggleLeft, ToggleRight,
    Trash2, Eye, MousePointerClick, BarChart3, Upload,
    Users, Calendar, Link as LinkIcon, AlertCircle, Edit, Check,
    Globe, Zap, Target, TrendingUp, Sparkles, Copy, Info
} from 'lucide-react';

const TABS = [
    { id: 'google', label: 'Google Ads', icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'custom', label: 'Custom Ads', icon: Megaphone, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', gradient: 'from-indigo-500 to-violet-500' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', gradient: 'from-emerald-500 to-teal-500' },
];

const GOOGLE_AD_TEMPLATES = [
    {
        title: 'Sponsored: Grow your tech career with Google Certificates. Learn Python, Data, or UX at your own pace.',
        media_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60',
        link_url: 'https://grow.google/certificates/',
    },
    {
        title: 'Sponsored: Reach more customers with simple, automated Google Ads campaigns. Start your trial today!',
        media_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60',
        link_url: 'https://ads.google.com',
    },
];

export default function SaasAds() {
    const [ads, setAds] = useState([]);
    const [academies, setAcademies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('google');
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [selectedAdId, setSelectedAdId] = useState(null);
    const [creatingTemplate, setCreatingTemplate] = useState(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [adTypeFilter, setAdTypeFilter] = useState('all');

    // Form state
    const [form, setForm] = useState({
        title: '',
        media_url: '',
        link_url: '',
        target_roles: [],
        target_categories: [],
        is_active: true,
        ad_type: 'general',
        academy_id: ''
    });

    const categoryOptions = ['U9', 'U11', 'U13', 'U15', 'U17', 'U19', 'Seniors'];
    const roleOptions = [
        { value: 'parent', label: 'Parent' },
        { value: 'coach', label: 'Coach' },
        { value: 'player', label: 'Player' }
    ];

    // Derived: split ads into Google vs Custom
    const googleAds = ads.filter(a => (a.title || '').startsWith('Sponsored:'));
    const customAds = ads.filter(a => !(a.title || '').startsWith('Sponsored:'));

    const fetchAds = async () => {
        try {
            const res = await authFetch(`${API_URL}/advertisements/`);
            if (res.ok) {
                setAds(await res.json());
            }
        } catch (e) {
            console.error('Error fetching advertisements:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchAcademies = async () => {
        try {
            const res = await authFetch(`${API_URL}/saas/academies`);
            if (res.ok) {
                setAcademies(await res.json());
            }
        } catch (e) {
            console.error('Error fetching academies:', e);
        }
    };

    useEffect(() => {
        fetchAds();
        fetchAcademies();
    }, []);

    const handleRoleToggle = (roleVal) => {
        setForm(f => {
            const current = f.target_roles || [];
            const updated = current.includes(roleVal)
                ? current.filter(r => r !== roleVal)
                : [...current, roleVal];
            return { ...f, target_roles: updated };
        });
    };

    const handleCategoryToggle = (catVal) => {
        setForm(f => {
            const current = f.target_categories || [];
            const updated = current.includes(catVal)
                ? current.filter(c => c !== catVal)
                : [...current, catVal];
            return { ...f, target_categories: updated };
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setUploadError('');
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await authFetch(`${API_URL}/storage/upload`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setForm(f => ({ ...f, media_url: data.url || data.public_url }));
            } else {
                const data = await res.json();
                setUploadError(data.detail || 'Upload failed.');
            }
        } catch (err) {
            setUploadError('Network error uploading file.');
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    // Open create modal for custom ads
    const openCreateModal = (isGoogle = false) => {
        setModalMode('create');
        setSubmitError('');
        setUploadError('');
        setForm({
            title: isGoogle ? 'Sponsored: ' : '',
            media_url: '',
            link_url: '',
            target_roles: [],
            target_categories: [],
            is_active: true,
            ad_type: 'general',
            academy_id: ''
        });
        setShowModal(true);
    };

    // Quick-create Google Ad from template
    const createFromTemplate = async (template, index) => {
        setCreatingTemplate(index);
        const payload = {
            title: template.title,
            media_url: template.media_url,
            link_url: template.link_url,
            target_roles: [],
            target_categories: [],
            is_active: true,
            ad_type: 'general',
            academy_id: null
        };
        try {
            const res = await authFetch(`${API_URL}/advertisements/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                fetchAds();
            }
        } catch (e) {
            console.error('Error creating template ad:', e);
        } finally {
            setCreatingTemplate(null);
        }
    };

    const openEditModal = (ad) => {
        setModalMode('edit');
        setSubmitError('');
        setUploadError('');
        setSelectedAdId(ad.id);
        setForm({
            title: ad.title,
            media_url: ad.media_url,
            link_url: ad.link_url || '',
            target_roles: ad.target_roles || [],
            target_categories: ad.target_categories || [],
            is_active: ad.is_active ?? true,
            ad_type: ad.ad_type || 'general',
            academy_id: ad.academy_id || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');
        setSubmitting(true);

        const payload = {
            title: form.title.trim(),
            media_url: form.media_url.trim(),
            link_url: form.link_url.trim() || null,
            target_roles: form.target_roles,
            target_categories: form.target_categories,
            is_active: form.is_active,
            ad_type: form.ad_type,
            academy_id: form.ad_type === '1to1' && form.academy_id ? form.academy_id : null
        };

        try {
            const endpoint = modalMode === 'create'
                ? `${API_URL}/advertisements/`
                : `${API_URL}/advertisements/${selectedAdId}`;
            const method = modalMode === 'create' ? 'POST' : 'PATCH';

            const res = await authFetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setShowModal(false);
                fetchAds();
            } else {
                const data = await res.json();
                setSubmitError(data.detail || `Failed to ${modalMode} advertisement.`);
            }
        } catch {
            setSubmitError('Network error.');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleActive = async (ad) => {
        const payload = {
            title: ad.title,
            media_url: ad.media_url,
            link_url: ad.link_url,
            target_roles: ad.target_roles || [],
            target_categories: ad.target_categories || [],
            is_active: !ad.is_active,
            ad_type: ad.ad_type || 'general',
            academy_id: ad.academy_id || null
        };

        try {
            const res = await authFetch(`${API_URL}/advertisements/${ad.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setAds(prev => prev.map(a => a.id === ad.id ? { ...a, is_active: !ad.is_active } : a));
            }
        } catch (e) {
            console.error('Error toggling active state:', e);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this advertisement?')) return;

        try {
            const res = await authFetch(`${API_URL}/advertisements/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setAds(prev => prev.filter(a => a.id !== id));
            }
        } catch (e) {
            console.error('Error deleting advertisement:', e);
        }
    };

    // Stats
    const totalAds = ads.length;
    const activeAds = ads.filter(a => a.is_active).length;
    const totalViews = ads.reduce((acc, curr) => acc + (curr.views_count || 0), 0);
    const totalClicks = ads.reduce((acc, curr) => acc + (curr.clicks_count || 0), 0);
    const avgCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00';
    const googleViews = googleAds.reduce((acc, curr) => acc + (curr.views_count || 0), 0);
    const googleClicks = googleAds.reduce((acc, curr) => acc + (curr.clicks_count || 0), 0);
    const customViews = customAds.reduce((acc, curr) => acc + (curr.views_count || 0), 0);
    const customClicks = customAds.reduce((acc, curr) => acc + (curr.clicks_count || 0), 0);

    // Filters for custom ads
    const filteredCustomAds = customAds.filter(ad => {
        const matchesSearch = ad.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || (ad.target_roles || []).includes(roleFilter);
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && ad.is_active) ||
            (statusFilter === 'inactive' && !ad.is_active);
        const matchesAdType = adTypeFilter === 'all' || (ad.ad_type || 'general') === adTypeFilter;
        return matchesSearch && matchesRole && matchesStatus && matchesAdType;
    });

    // ─── Render Ad Card ─────────────────────────────────────────────
    const renderAdCard = (ad, isGoogleStyle = false) => {
        const adCtr = ad.views_count > 0
            ? ((ad.clicks_count / ad.views_count) * 100).toFixed(2)
            : '0.00';
        return (
            <div key={ad.id} className={`premium-card bg-white rounded-2xl border shadow-sm relative overflow-hidden flex flex-col group hover:shadow-md transition-all ${
                !ad.is_active ? 'opacity-65' : ''
            } ${isGoogleStyle ? 'border-blue-200' : 'border-surface-200'}`}>
                {/* Media Preview */}
                <div className={`h-44 border-b relative overflow-hidden shrink-0 ${isGoogleStyle ? 'bg-blue-50 border-blue-100' : 'bg-surface-50 border-surface-150'}`}>
                    {ad.media_url ? (
                        <img
                            src={ad.media_url}
                            alt={ad.title}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-300"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-surface-300">
                            {isGoogleStyle ? <Globe className="w-12 h-12 opacity-20" /> : <Megaphone className="w-12 h-12 opacity-20" />}
                        </div>
                    )}

                    {ad.link_url && (
                        <a
                            href={ad.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors shadow"
                            title={ad.link_url}
                        >
                            <LinkIcon size={14} />
                        </a>
                    )}

                    {/* Badges */}
                    <div className="absolute bottom-3 left-3 flex gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest text-white shadow-sm ${
                            ad.is_active ? 'bg-emerald-500' : 'bg-surface-500'
                        }`}>
                            {ad.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {isGoogleStyle && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest text-white shadow-sm bg-blue-500">
                                Google Ad
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                        <h3 className={`font-bold transition-colors text-base line-clamp-2 ${isGoogleStyle ? 'text-blue-900 group-hover:text-blue-600' : 'text-surface-900 group-hover:text-indigo-600'}`}>
                            {isGoogleStyle ? ad.title.replace('Sponsored: ', '') : ad.title}
                        </h3>

                        <div className="flex flex-wrap gap-1.5">
                            {/* Ad Type Badge */}
                            {!isGoogleStyle && (
                                <>
                                    {ad.ad_type === '1to1' ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
                                            1to1: {academies.find(ac => ac.id === ad.academy_id)?.name || 'All'}
                                        </span>
                                    ) : ad.ad_type === 'pro' ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                            Pro Tier
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                            General / Free
                                        </span>
                                    )}
                                </>
                            )}

                            {isGoogleStyle && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                    Free Plan Only
                                </span>
                            )}

                            {ad.target_roles?.map(role => (
                                <span key={role} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    <Users size={10} />
                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-surface-50 rounded-xl border border-surface-150 text-center">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">Views</p>
                            <p className="font-bold text-surface-800 text-sm">{ad.views_count || 0}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">Clicks</p>
                            <p className="font-bold text-surface-800 text-sm">{ad.clicks_count || 0}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">CTR</p>
                            <p className={`font-bold text-sm ${isGoogleStyle ? 'text-blue-600' : 'text-indigo-600'}`}>{adCtr}%</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between text-xs text-surface-400 pt-2 border-t border-surface-100">
                        <span className="flex items-center gap-1 text-[11px]">
                            <Calendar size={12} />
                            {new Date(ad.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => toggleActive(ad)}
                                className={`flex items-center gap-1 font-bold transition-colors ${
                                    ad.is_active ? 'text-emerald-500 hover:text-emerald-600' : 'text-surface-400 hover:text-surface-600'
                                }`}
                                title="Toggle Active Status"
                            >
                                {ad.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                            </button>
                            <button
                                onClick={() => openEditModal(ad)}
                                className="p-1.5 rounded-lg text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                                title="Edit Ad"
                            >
                                <Edit size={14} />
                            </button>
                            <button
                                onClick={() => handleDelete(ad.id)}
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete Ad"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ─── RENDER ──────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="page-title text-surface-900 font-bold tracking-tight text-3xl flex items-center gap-2">
                        <Megaphone className="w-8 h-8 text-indigo-500" />
                        Ads Command Center
                    </h2>
                    <p className="page-subtitle text-surface-500 text-sm mt-1">
                        Control Google Ads & custom advertiser campaigns from one place.
                    </p>
                </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: 'Total Ads', value: totalAds, gradient: 'from-indigo-500 to-blue-600', icon: Megaphone },
                    { label: 'Active', value: activeAds, gradient: 'from-emerald-500 to-teal-600', icon: Check },
                    { label: 'Total Views', value: totalViews.toLocaleString(), gradient: 'from-violet-500 to-purple-600', icon: Eye },
                    { label: 'Total Clicks', value: totalClicks.toLocaleString(), gradient: 'from-amber-500 to-orange-600', icon: MousePointerClick },
                    { label: 'Avg CTR', value: `${avgCtr}%`, gradient: 'from-rose-500 to-pink-600', icon: TrendingUp },
                ].map((s, i) => (
                    <div key={i} className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-4 text-white shadow-lg hover-lift transition-all relative overflow-hidden`}>
                        <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-10">
                            <s.icon className="w-20 h-20" />
                        </div>
                        <div className="p-1.5 rounded-xl bg-white/20 w-fit mb-2"><s.icon className="w-4 h-4" /></div>
                        <p className="text-xl font-black tracking-tight tabular-nums">{s.value}</p>
                        <p className="text-[9px] font-bold text-white/80 uppercase tracking-wider mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-surface-200 shadow-sm">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                            activeTab === tab.id
                                ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
                                : 'text-surface-500 hover:bg-surface-50'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {tab.id === 'google' && googleAds.length > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                activeTab === tab.id ? 'bg-white/25' : 'bg-blue-100 text-blue-600'
                            }`}>{googleAds.length}</span>
                        )}
                        {tab.id === 'custom' && customAds.length > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                activeTab === tab.id ? 'bg-white/25' : 'bg-indigo-100 text-indigo-600'
                            }`}>{customAds.length}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ══════════ TAB: Google Ads ══════════ */}
            {activeTab === 'google' && (
                <div className="space-y-6">
                    {/* Info Banner */}
                    <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-sky-50 border border-blue-200 rounded-2xl p-5">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-xl bg-blue-500 text-white shadow-lg shrink-0">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-blue-900 text-lg">Google Ads — Free Plan Monetization</h3>
                                <p className="text-blue-700 text-sm mt-1 leading-relaxed">
                                    Google Ads are <strong>automatically injected</strong> as rotating banners for academies on the <strong>Free plan</strong>.
                                    Pro and Enterprise academies never see these ads. Create, edit, enable or disable them here.
                                </p>
                                <div className="flex flex-wrap gap-3 mt-3">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                        <Check size={12} /> Auto-injected for Free plan
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                        <X size={12} /> Hidden from Pro plan
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-violet-100 text-violet-700 border border-violet-200">
                                        <X size={12} /> Hidden from Enterprise
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Template Creation */}
                    {googleAds.length === 0 && (
                        <div className="bg-white border border-dashed border-blue-300 rounded-2xl p-6">
                            <div className="text-center mb-4">
                                <Sparkles className="w-8 h-8 mx-auto text-blue-400 mb-2" />
                                <h4 className="font-bold text-surface-800">Quick Start — Create Google Ad Templates</h4>
                                <p className="text-sm text-surface-500 mt-1">Click a template below to instantly create a Google Ad banner</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {GOOGLE_AD_TEMPLATES.map((tpl, i) => (
                                    <button
                                        key={i}
                                        onClick={() => createFromTemplate(tpl, i)}
                                        disabled={creatingTemplate !== null}
                                        className="text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl p-4 transition-all group"
                                    >
                                        <div className="flex gap-3 items-start">
                                            <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-blue-200">
                                                <img src={tpl.media_url} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-blue-800 line-clamp-2">{tpl.title.replace('Sponsored: ', '')}</p>
                                                <p className="text-[10px] text-blue-500 mt-1 truncate">{tpl.link_url}</p>
                                            </div>
                                            <div className="shrink-0">
                                                {creatingTemplate === i ? (
                                                    <Loader2 size={16} className="animate-spin text-blue-500" />
                                                ) : (
                                                    <Plus size={16} className="text-blue-400 group-hover:text-blue-600" />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action buttons for Google Ads */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => openCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all text-sm"
                        >
                            <Plus size={16} /> New Google Ad
                        </button>
                    </div>

                    {/* Google Ads Grid */}
                    {loading ? (
                        <div className="py-20 text-center"><Loader2 className="w-8 h-8 mx-auto text-blue-500 animate-spin" /></div>
                    ) : googleAds.length === 0 ? (
                        <div className="py-12 text-center text-surface-400 bg-white rounded-2xl border border-dashed border-surface-200">
                            <Globe className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm font-medium">No Google Ads yet. Use templates above or create one manually.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {googleAds.map(ad => renderAdCard(ad, true))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════ TAB: Custom Ads ══════════ */}
            {activeTab === 'custom' && (
                <div className="space-y-6">
                    {/* Action bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-surface-800 text-lg flex items-center gap-2">
                                <Target className="w-5 h-5 text-indigo-500" />
                                Custom Advertiser Campaigns
                            </h3>
                            <p className="text-sm text-surface-500 mt-0.5">Ads from sponsors, partners, or your own promotions — targeted by role, category, and plan tier.</p>
                        </div>
                        <button
                            onClick={() => openCreateModal(false)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all text-sm"
                        >
                            <Plus size={16} /> New Campaign Ad
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-surface-200 shadow-sm">
                        <input
                            type="text"
                            placeholder="Search by title..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="input flex-1 focus:ring-indigo-500"
                        />
                        <div className="flex flex-wrap gap-3">
                            <select value={adTypeFilter} onChange={e => setAdTypeFilter(e.target.value)} className="input min-w-[140px]">
                                <option value="all">All Tiers</option>
                                <option value="general">General (Free)</option>
                                <option value="pro">Pro (Medium)</option>
                                <option value="1to1">1-to-1 (Premium)</option>
                            </select>
                            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input min-w-[130px]">
                                <option value="all">All Roles</option>
                                <option value="parent">Parent</option>
                                <option value="coach">Coach</option>
                                <option value="player">Player</option>
                            </select>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input min-w-[130px]">
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {/* Custom Ads Grid */}
                    {loading ? (
                        <div className="py-20 text-center"><Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" /></div>
                    ) : filteredCustomAds.length === 0 ? (
                        <div className="py-16 text-center text-surface-400 bg-white rounded-2xl border border-dashed border-surface-200">
                            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium">No custom ads match your filters.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCustomAds.map(ad => renderAdCard(ad, false))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════ TAB: Analytics ══════════ */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    <h3 className="font-bold text-surface-800 text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        Performance Breakdown
                    </h3>

                    {/* Comparison Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Google Ads Performance */}
                        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
                                <Globe className="w-32 h-32" />
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 rounded-xl bg-white/20"><Globe className="w-5 h-5" /></div>
                                <h4 className="font-bold text-lg">Google Ads</h4>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">{googleAds.length} ads</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-white/70 text-xs font-bold uppercase">Views</p>
                                    <p className="text-2xl font-black">{googleViews.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-white/70 text-xs font-bold uppercase">Clicks</p>
                                    <p className="text-2xl font-black">{googleClicks.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-white/70 text-xs font-bold uppercase">CTR</p>
                                    <p className="text-2xl font-black">{googleViews > 0 ? ((googleClicks / googleViews) * 100).toFixed(2) : '0.00'}%</p>
                                </div>
                            </div>
                            <p className="text-white/60 text-xs mt-3">Auto-injected for Free plan academies</p>
                        </div>

                        {/* Custom Ads Performance */}
                        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
                                <Megaphone className="w-32 h-32" />
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-2 rounded-xl bg-white/20"><Megaphone className="w-5 h-5" /></div>
                                <h4 className="font-bold text-lg">Custom Campaigns</h4>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">{customAds.length} ads</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-white/70 text-xs font-bold uppercase">Views</p>
                                    <p className="text-2xl font-black">{customViews.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-white/70 text-xs font-bold uppercase">Clicks</p>
                                    <p className="text-2xl font-black">{customClicks.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-white/70 text-xs font-bold uppercase">CTR</p>
                                    <p className="text-2xl font-black">{customViews > 0 ? ((customClicks / customViews) * 100).toFixed(2) : '0.00'}%</p>
                                </div>
                            </div>
                            <p className="text-white/60 text-xs mt-3">General, Pro & 1-to-1 advertiser campaigns</p>
                        </div>
                    </div>

                    {/* All Ads Table */}
                    <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-surface-200 bg-surface-50">
                            <h4 className="font-bold text-surface-800 flex items-center gap-2">
                                <BarChart3 size={16} className="text-emerald-500" />
                                All Ads Performance
                            </h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-surface-50 border-b border-surface-200">
                                        <th className="text-left px-5 py-3 font-bold text-surface-500 text-xs uppercase tracking-wider">Ad</th>
                                        <th className="text-left px-4 py-3 font-bold text-surface-500 text-xs uppercase tracking-wider">Type</th>
                                        <th className="text-center px-4 py-3 font-bold text-surface-500 text-xs uppercase tracking-wider">Status</th>
                                        <th className="text-right px-4 py-3 font-bold text-surface-500 text-xs uppercase tracking-wider">Views</th>
                                        <th className="text-right px-4 py-3 font-bold text-surface-500 text-xs uppercase tracking-wider">Clicks</th>
                                        <th className="text-right px-5 py-3 font-bold text-surface-500 text-xs uppercase tracking-wider">CTR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-100">
                                    {ads.map(ad => {
                                        const isGoogle = (ad.title || '').startsWith('Sponsored:');
                                        const ctr = ad.views_count > 0 ? ((ad.clicks_count / ad.views_count) * 100).toFixed(2) : '0.00';
                                        return (
                                            <tr key={ad.id} className="hover:bg-surface-50 transition-colors">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        {ad.media_url ? (
                                                            <img src={ad.media_url} alt="" className="w-10 h-7 rounded-md object-cover border border-surface-200" />
                                                        ) : (
                                                            <div className="w-10 h-7 rounded-md bg-surface-100 flex items-center justify-center">
                                                                <Megaphone size={12} className="text-surface-300" />
                                                            </div>
                                                        )}
                                                        <span className="font-medium text-surface-800 truncate max-w-[200px]">
                                                            {isGoogle ? ad.title.replace('Sponsored: ', '') : ad.title}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        isGoogle ? 'bg-blue-100 text-blue-700' :
                                                        ad.ad_type === 'pro' ? 'bg-amber-100 text-amber-700' :
                                                        ad.ad_type === '1to1' ? 'bg-violet-100 text-violet-700' :
                                                        'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {isGoogle ? 'Google' : ad.ad_type === 'pro' ? 'Pro' : ad.ad_type === '1to1' ? '1to1' : 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        ad.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-100 text-surface-500'
                                                    }`}>
                                                        {ad.is_active ? 'Active' : 'Off'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-surface-700 tabular-nums">{(ad.views_count || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-right font-bold text-surface-700 tabular-nums">{(ad.clicks_count || 0).toLocaleString()}</td>
                                                <td className="px-5 py-3 text-right font-bold text-indigo-600 tabular-nums">{ctr}%</td>
                                            </tr>
                                        );
                                    })}
                                    {ads.length === 0 && (
                                        <tr><td colSpan={6} className="px-5 py-8 text-center text-surface-400 text-sm">No ads to display</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ Create & Edit Modal ══════════ */}
            {showModal && (
                <div className="modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="modal-content bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-surface-200 overflow-hidden animate-scale-up">

                        <div className="flex justify-between items-center px-6 py-4 border-b border-surface-200 bg-surface-50">
                            <div className="flex items-center gap-2">
                                {form.title.startsWith('Sponsored:') ? (
                                    <Globe className="w-5 h-5 text-blue-500" />
                                ) : (
                                    <Megaphone className="w-5 h-5 text-indigo-500" />
                                )}
                                <h3 className="text-lg font-bold text-surface-900">
                                    {modalMode === 'create' ? (form.title.startsWith('Sponsored:') ? 'Create Google Ad' : 'Create Campaign Ad') : 'Edit Ad Banner'}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-surface-400 hover:text-surface-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {submitError && (
                                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    {submitError}
                                </div>
                            )}

                            {/* Google Ad hint */}
                            {form.title.startsWith('Sponsored:') && (
                                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-sm text-blue-700 flex items-start gap-2">
                                    <Info size={16} className="shrink-0 mt-0.5" />
                                    <span>Google Ads must start with <strong>"Sponsored:"</strong> — they are only shown to Free plan academies.</span>
                                </div>
                            )}

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Ad Title *</label>
                                <input
                                    required
                                    type="text"
                                    className="input focus:ring-indigo-500 w-full"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder={form.title.startsWith('Sponsored:') ? 'Sponsored: Your Google Ad text here...' : 'e.g. 15% discount on Kits this Summer!'}
                                />
                            </div>

                            {/* Image */}
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Ad Creative Image *</label>
                                <div className="flex gap-3">
                                    <input
                                        required
                                        type="text"
                                        className="input focus:ring-indigo-500 flex-1 text-sm font-mono"
                                        value={form.media_url}
                                        onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
                                        placeholder="https://example.com/ad-image.jpg"
                                    />
                                    <label className="btn btn-secondary border border-surface-300 hover:bg-surface-50 cursor-pointer flex items-center gap-1.5 text-xs">
                                        {uploading ? <Loader2 size={14} className="animate-spin text-indigo-500" /> : <Upload size={14} />}
                                        Upload
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                                    </label>
                                </div>
                                {uploadError && (
                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={12} />{uploadError}</p>
                                )}
                                {form.media_url && (
                                    <div className="mt-2.5 rounded-lg overflow-hidden border border-surface-200 h-28 bg-surface-50">
                                        <img src={form.media_url} alt="Preview" className="w-full h-full object-contain" />
                                    </div>
                                )}
                            </div>

                            {/* Link */}
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Target Click Link</label>
                                <input
                                    type="text"
                                    className="input focus:ring-indigo-500 w-full"
                                    value={form.link_url}
                                    onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                                    placeholder="https://example.com/promo"
                                />
                            </div>

                            {/* Ad Type — hide for Google ads */}
                            {!form.title.startsWith('Sponsored:') && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Ad Tier *</label>
                                        <select
                                            required
                                            className="input focus:ring-indigo-500 w-full"
                                            value={form.ad_type}
                                            onChange={e => setForm(f => ({ ...f, ad_type: e.target.value, academy_id: e.target.value === '1to1' ? f.academy_id : '' }))}
                                        >
                                            <option value="general">General Ad (Free Plan)</option>
                                            <option value="pro">Pro Ad (Medium Plan)</option>
                                            <option value="1to1">1-to-1 Ad (Premium/Enterprise Plan)</option>
                                        </select>
                                    </div>

                                    {form.ad_type === '1to1' && (
                                        <div>
                                            <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Target Academy *</label>
                                            <select
                                                required
                                                className="input focus:ring-indigo-500 w-full"
                                                value={form.academy_id}
                                                onChange={e => setForm(f => ({ ...f, academy_id: e.target.value }))}
                                            >
                                                <option value="">Select an Academy...</option>
                                                {academies.map(ac => (
                                                    <option key={ac.id} value={ac.id}>{ac.name} ({ac.subdomain})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Target Roles */}
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Target Roles</label>
                                <p className="text-xs text-surface-400 mb-2">Select which users see this ad. Leave unchecked for everyone.</p>
                                <div className="flex gap-3">
                                    {roleOptions.map(opt => {
                                        const isSelected = form.target_roles.includes(opt.value);
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => handleRoleToggle(opt.value)}
                                                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                                                    isSelected
                                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-300'
                                                        : 'bg-white border-surface-300 hover:bg-surface-50 text-surface-700'
                                                }`}
                                            >
                                                {isSelected && <Check size={12} />}
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Target Categories */}
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Target Categories</label>
                                <div className="flex flex-wrap gap-2">
                                    {categoryOptions.map(cat => {
                                        const isSelected = form.target_categories.includes(cat);
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => handleCategoryToggle(cat)}
                                                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                                                    isSelected
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
                                                        : 'bg-white border-surface-300 hover:bg-surface-50 text-surface-700'
                                                }`}
                                            >
                                                {isSelected && <Check size={12} />}
                                                {cat}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={form.is_active}
                                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                    className="w-4 h-4 text-indigo-600 border-surface-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="is_active" className="text-xs font-bold text-surface-700 uppercase tracking-wider select-none cursor-pointer">
                                    Activate instantly
                                </label>
                            </div>

                            {/* Submit */}
                            <div className="flex gap-3 justify-end pt-4 border-t border-surface-100">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary border border-surface-300">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`btn font-bold px-5 w-[150px] justify-center rounded-xl text-white ${
                                        form.title.startsWith('Sponsored:') ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'
                                    }`}
                                >
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : modalMode === 'create' ? 'Create Ad' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
