import { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import {
    Loader2, Plus, X, Megaphone, ToggleLeft, ToggleRight,
    Trash2, Eye, MousePointerClick, BarChart3, Upload,
    Users, Calendar, Link as LinkIcon, AlertCircle, Edit, Check
} from 'lucide-react';

export default function SaasAds() {
    const [ads, setAds] = useState([]);
    const [academies, setAcademies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [selectedAdId, setSelectedAdId] = useState(null);

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

    // Handle single target role toggle
    const handleRoleToggle = (roleVal) => {
        setForm(f => {
            const current = f.target_roles || [];
            const updated = current.includes(roleVal)
                ? current.filter(r => r !== roleVal)
                : [...current, roleVal];
            return { ...f, target_roles: updated };
        });
    };

    // Handle single category toggle
    const handleCategoryToggle = (catVal) => {
        setForm(f => {
            const current = f.target_categories || [];
            const updated = current.includes(catVal)
                ? current.filter(c => c !== catVal)
                : [...current, catVal];
            return { ...f, target_categories: updated };
        });
    };

    // Handle image upload
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

    // Open create modal
    const openCreateModal = () => {
        setModalMode('create');
        setSubmitError('');
        setUploadError('');
        setForm({
            title: '',
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

    // Open edit modal
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

    // Handle form submit
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

    // Toggle ad status instantly
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

    // Delete ad
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

    // Stats calculations
    const totalAds = ads.length;
    const activeAds = ads.filter(a => a.is_active).length;
    const totalViews = ads.reduce((acc, curr) => acc + (curr.views_count || 0), 0);
    const totalClicks = ads.reduce((acc, curr) => acc + (curr.clicks_count || 0), 0);
    const avgCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00';

    // Filters logic
    const filteredAds = ads.filter(ad => {
        const matchesSearch = ad.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || (ad.target_roles || []).includes(roleFilter);
        const matchesStatus = statusFilter === 'all' || 
            (statusFilter === 'active' && ad.is_active) || 
            (statusFilter === 'inactive' && !ad.is_active);
        const matchesAdType = adTypeFilter === 'all' || (ad.ad_type || 'general') === adTypeFilter;
        return matchesSearch && matchesRole && matchesStatus && matchesAdType;
    });

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="page-title text-surface-900 font-bold tracking-tight text-3xl">Visual Ads Manager</h2>
                    <p className="page-subtitle text-surface-500 text-sm mt-1">
                        Design, target, and monitor promo banners displayed to coaches, parents, and players.
                    </p>
                </div>
                <button onClick={openCreateModal} className="btn btn-brand bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center gap-2">
                    <Plus size={16} /> New Advertisement
                </button>
            </div>

            {/* Analytics Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                    { label: 'Total Banners', value: totalAds, gradient: 'from-indigo-500 to-blue-600', icon: Megaphone },
                    { label: 'Active', value: activeAds, gradient: 'from-emerald-500 to-teal-600', icon: Check },
                    { label: 'Total Views', value: totalViews, gradient: 'from-violet-500 to-purple-600', icon: Eye },
                    { label: 'Total Clicks', value: totalClicks, gradient: 'from-amber-500 to-orange-600', icon: MousePointerClick },
                    { label: 'Average CTR', value: `${avgCtr}%`, gradient: 'from-rose-500 to-pink-600', icon: BarChart3 },
                ].map((s, i) => (
                    <div key={i} className={`bg-gradient-to-br ${s.gradient} rounded-2xl p-4 text-white shadow-lg hover-lift transition-all relative overflow-hidden`}>
                        <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-10">
                            <s.icon className="w-24 h-24" />
                        </div>
                        <div className="p-2 rounded-xl bg-white/20 w-fit mb-2"><s.icon className="w-4 h-4" /></div>
                        <p className="text-2xl font-black tracking-tight tabular-nums">{s.value}</p>
                        <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-surface-200 shadow-sm">
                <input
                    type="text"
                    placeholder="Search advertisement by title..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="input flex-1 focus:ring-indigo-500"
                />
                <div className="flex flex-wrap gap-4">
                    <select
                        value={adTypeFilter}
                        onChange={e => setAdTypeFilter(e.target.value)}
                        className="input min-w-[140px]"
                    >
                        <option value="all">All Tiers</option>
                        <option value="general">General (Free)</option>
                        <option value="pro">Pro (Medium)</option>
                        <option value="1to1">1-to-1 (Premium)</option>
                    </select>
                    <select
                        value={roleFilter}
                        onChange={e => setRoleFilter(e.target.value)}
                        className="input min-w-[140px]"
                    >
                        <option value="all">All Roles</option>
                        <option value="parent">Parent</option>
                        <option value="coach">Coach</option>
                        <option value="player">Player</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="input min-w-[140px]"
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>
                </div>
            </div>

            {/* Ads Grid */}
            {loading ? (
                <div className="py-20 text-center"><Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin" /></div>
            ) : filteredAds.length === 0 ? (
                <div className="py-16 text-center text-surface-400 bg-white rounded-2xl border border-dashed border-surface-200">
                    <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30 text-surface-400" />
                    <p className="text-sm font-medium">No advertisements match your search or filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAds.map(ad => {
                        const adCtr = ad.views_count > 0 
                            ? ((ad.clicks_count / ad.views_count) * 100).toFixed(2) 
                            : '0.00';
                        return (
                            <div key={ad.id} className={`premium-card bg-white rounded-2xl border border-surface-200 shadow-sm relative overflow-hidden flex flex-col group hover:shadow-md transition-all ${
                                !ad.is_active ? 'opacity-65' : ''
                            }`}>
                                {/* Media Preview Container */}
                                <div className="h-44 bg-surface-50 border-b border-surface-150 relative overflow-hidden shrink-0">
                                    {ad.media_url ? (
                                        <img 
                                            src={ad.media_url} 
                                            alt={ad.title} 
                                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-surface-300">
                                            <Megaphone className="w-12 h-12 opacity-20" />
                                        </div>
                                    )}
                                    
                                    {/* Action link indicator */}
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

                                    {/* Active/Inactive badge status floating */}
                                    <span className={`absolute bottom-3 left-3 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest text-white shadow-sm ${
                                        ad.is_active ? 'bg-emerald-500' : 'bg-surface-500'
                                    }`}>
                                        {ad.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                {/* Content Details */}
                                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                    <div className="space-y-2">
                                        <h3 className="font-bold text-surface-900 group-hover:text-indigo-600 transition-colors text-base line-clamp-1">
                                            {ad.title}
                                        </h3>

                                        {/* Target roles and categories badges */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {/* Ad Type Badge */}
                                            {ad.ad_type === '1to1' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
                                                    1to1: {academies.find(ac => ac.id === ad.academy_id)?.name || 'All Academies'}
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

                                            {ad.target_roles?.map(role => (
                                                <span key={role} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                                                    <Users size={10} />
                                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                                </span>
                                            ))}
                                            {ad.target_categories?.length > 0 ? (
                                                ad.target_categories.map(cat => (
                                                    <span key={cat} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                        {cat}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-150">
                                                    All Categories
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ad Analytics Breakdown */}
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
                                            <p className="font-bold text-indigo-600 text-sm">{adCtr}%</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
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
                    })}
                </div>
            )}

            {/* Create & Edit Modal backdrop */}
            {showModal && (
                <div className="modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="modal-content bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-surface-200 overflow-hidden animate-scale-up">
                        
                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-surface-200 bg-surface-50">
                            <div className="flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-indigo-500" />
                                <h3 className="text-lg font-bold text-surface-900">
                                    {modalMode === 'create' ? 'Create New Ad Banner' : 'Edit Ad Banner'}
                                </h3>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-surface-400 hover:text-surface-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {submitError && (
                                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    {submitError}
                                </div>
                            )}

                            {/* Title Field */}
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Ad Title *</label>
                                <input 
                                    required 
                                    type="text"
                                    className="input focus:ring-indigo-500 w-full"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="e.g. 15% discount on Kits this Summer!" 
                                />
                            </div>

                            {/* Image Media upload field */}
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
                                    
                                    {/* Upload trigger button */}
                                    <label className="btn btn-secondary border border-surface-300 hover:bg-surface-50 cursor-pointer flex items-center gap-1.5 text-xs">
                                        {uploading ? (
                                            <Loader2 size={14} className="animate-spin text-indigo-500" />
                                        ) : (
                                            <Upload size={14} />
                                        )}
                                        Upload
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            className="hidden" 
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                        />
                                    </label>
                                </div>
                                {uploadError && (
                                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                        <AlertCircle size={12} />
                                        {uploadError}
                                    </p>
                                )}
                                {form.media_url && (
                                    <div className="mt-2.5 rounded-lg overflow-hidden border border-surface-200 h-28 bg-surface-50">
                                        <img 
                                            src={form.media_url} 
                                            alt="Preview" 
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Action Link Field */}
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Target Click Link (Optional)</label>
                                <input 
                                    type="text"
                                    className="input focus:ring-indigo-500 w-full"
                                    value={form.link_url}
                                    onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                                    placeholder="e.g. https://myacademy.com/promos/kits" 
                                />
                            </div>

                            {/* Ad Type (Tier) Selection */}
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Ad Tier / Type *</label>
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

                            {/* Target Academy for 1to1 Ads */}
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
                                            <option key={ac.id} value={ac.id}>
                                                {ac.name} ({ac.subdomain})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Target Roles Checkbox Selection */}
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Target Roles *</label>
                                <p className="text-xs text-surface-400 mb-2">Select which user types see this ad banner. Leave unchecked to target everyone.</p>
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

                            {/* Target Categories Checkbox Selection */}
                            <div>
                                <label className="block text-xs font-bold text-surface-600 mb-1.5 uppercase tracking-wider">Target Squad Categories</label>
                                <p className="text-xs text-surface-400 mb-2">Display ad only to players/parents in specific categories. Uncheck all to target all categories.</p>
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

                            {/* Active Status Checkbox */}
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={form.is_active}
                                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                    className="w-4 h-4 text-indigo-600 border-surface-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="is_active" className="text-xs font-bold text-surface-700 uppercase tracking-wider select-none cursor-pointer">
                                    Activate Ad instantly upon saving
                                </label>
                            </div>

                            {/* Buttons footer */}
                            <div className="flex gap-3 justify-end pt-4 border-t border-surface-100">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)} 
                                    className="btn btn-secondary border border-surface-300"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting} 
                                    className="btn btn-brand bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 w-[150px] justify-center rounded-xl"
                                >
                                    {submitting ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        modalMode === 'create' ? 'Create Ad' : 'Save Changes'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
