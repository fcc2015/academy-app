import { useState, useEffect } from 'react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import {
    Loader2, Plus, X, Megaphone, ToggleLeft, ToggleRight,
    Trash2, Eye, MousePointerClick, BarChart3, Upload,
    Users, Calendar, Link as LinkIcon, AlertCircle, Edit, Check,
    Globe, Zap, Target, TrendingUp, Sparkles, Info, ExternalLink,
    ChevronLeft, ChevronRight, Activity, PieChart, ShieldAlert
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
    Cell, CartesianGrid
} from 'recharts';

const TABS = [
    { id: 'google', label: 'Google Ads Control', icon: Globe, gradient: 'from-blue-600 to-indigo-600', activeBg: 'bg-blue-600 text-white', color: 'text-blue-500' },
    { id: 'custom', label: 'Advertiser Campaigns', icon: Megaphone, gradient: 'from-violet-600 to-purple-600', activeBg: 'bg-violet-600 text-white', color: 'text-violet-500' },
    { id: 'analytics', label: 'Ads Analytics', icon: BarChart3, gradient: 'from-emerald-600 to-teal-600', activeBg: 'bg-emerald-600 text-white', color: 'text-emerald-500' },
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
    {
        title: 'Sponsored: Elevate your designs with Figma. Collaborate in real-time, build rich prototypes, and hand off seamlessly.',
        media_url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&auto=format&fit=crop&q=60',
        link_url: 'https://figma.com',
    }
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

    // Google AdSense settings states (simulation configuration)
    const [adsenseSettings, setAdsenseSettings] = useState({
        publisherId: localStorage.getItem('saas_adsense_pub_id') || 'ca-pub-7182903829103928',
        slotId: localStorage.getItem('saas_adsense_slot_id') || '4829103829',
        isActive: localStorage.getItem('saas_adsense_active') === 'true'
    });
    const [savingAdsense, setSavingAdsense] = useState(false);
    const [showAdsenseSuccess, setShowAdsenseSuccess] = useState(false);

    const handleSaveAdsense = (e) => {
        e.preventDefault();
        setSavingAdsense(true);
        setTimeout(() => {
            localStorage.setItem('saas_adsense_pub_id', adsenseSettings.publisherId);
            localStorage.setItem('saas_adsense_slot_id', adsenseSettings.slotId);
            localStorage.setItem('saas_adsense_active', adsenseSettings.isActive ? 'true' : 'false');
            setSavingAdsense(false);
            setShowAdsenseSuccess(true);
            setTimeout(() => setShowAdsenseSuccess(false), 3000);
        }, 800);
    };

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

    // Open create modal
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
            setSubmitError('Network error occurred.');
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
        if (!window.confirm('Are you sure you want to permanently delete this advertisement?')) return;

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

    // Chart Data formatting for Recharts
    const getChartData = () => {
        return ads.map(ad => {
            const isGoogle = (ad.title || '').startsWith('Sponsored:');
            const truncatedTitle = isGoogle
                ? ad.title.replace('Sponsored: ', '').substring(0, 16) + '...'
                : ad.title.substring(0, 16) + '...';
            const ctr = ad.views_count > 0 ? ((ad.clicks_count / ad.views_count) * 100) : 0;
            return {
                name: truncatedTitle,
                CTR: parseFloat(ctr.toFixed(2)),
                Clicks: ad.clicks_count || 0,
                Views: ad.views_count || 0,
                type: isGoogle ? 'Google' : 'Custom'
            };
        }).sort((a, b) => b.Clicks - a.Clicks).slice(0, 8);
    };

    // ─── Render Ad Card ─────────────────────────────────────────────
    const renderAdCard = (ad, isGoogleStyle = false) => {
        const adCtr = ad.views_count > 0
            ? ((ad.clicks_count / ad.views_count) * 100).toFixed(2)
            : '0.00';
        return (
            <div key={ad.id} className={`premium-card border relative overflow-hidden flex flex-col group hover-lift transition-all duration-300 hover:border-indigo-400 bg-white dark:bg-[#18181b] ${
                !ad.is_active ? 'opacity-60 bg-gray-50/50 dark:bg-gray-900/10' : 'shadow-md shadow-slate-100/50 dark:shadow-none'
            } ${isGoogleStyle ? 'border-blue-100 dark:border-blue-900/30' : 'border-surface-200 dark:border-zinc-800'}`}>
                
                {/* Media Preview & Gradient overlay */}
                <div className={`h-48 border-b relative overflow-hidden shrink-0 ${isGoogleStyle ? 'bg-blue-50/40 border-blue-100' : 'bg-surface-50 border-surface-150'} flex items-center justify-center`}>
                    {ad.media_url ? (
                        <>
                            <img
                                src={ad.media_url}
                                alt={ad.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-zinc-900 dark:to-zinc-800 text-slate-400 dark:text-zinc-500">
                            {isGoogleStyle ? <Globe className="w-14 h-14 opacity-20" /> : <Megaphone className="w-14 h-14 opacity-20" />}
                        </div>
                    )}

                    {ad.link_url && (
                        <a
                            href={ad.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute top-3.5 right-3.5 p-2 rounded-xl bg-white/95 dark:bg-zinc-900/90 text-slate-800 dark:text-white hover:bg-indigo-600 hover:text-white transition-all shadow-md backdrop-blur-sm scale-90 group-hover:scale-100 duration-300"
                            title={ad.link_url}
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}

                    {/* Floating Badges */}
                    <div className="absolute bottom-3.5 left-3.5 flex gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-white shadow backdrop-blur-md ${
                            ad.is_active ? 'bg-emerald-500/90' : 'bg-slate-500/90'
                        }`}>
                            {ad.is_active ? 'Active' : 'Paused'}
                        </span>
                        {isGoogleStyle && (
                            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-white shadow bg-blue-500/90 backdrop-blur-md">
                                Google Ad
                            </span>
                        )}
                    </div>
                </div>

                {/* Content Details */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                        <h3 className={`font-bold transition-colors text-base leading-snug line-clamp-2 dark:text-zinc-100 ${isGoogleStyle ? 'text-blue-950 group-hover:text-blue-600' : 'text-slate-900 group-hover:text-violet-600'}`}>
                            {isGoogleStyle ? ad.title.replace('Sponsored: ', '') : ad.title}
                        </h3>

                        <div className="flex flex-wrap gap-1.5">
                            {/* Ad Type Badges */}
                            {!isGoogleStyle && (
                                <>
                                    {ad.ad_type === '1to1' ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30">
                                            <Target size={10} />
                                            1to1: {academies.find(ac => ac.id === ad.academy_id)?.name || 'Direct'}
                                        </span>
                                    ) : ad.ad_type === 'pro' ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                                            <Zap size={10} />
                                            Pro Academy Tier
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-50 dark:bg-zinc-800/40 text-slate-700 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700/50">
                                            <Globe size={10} />
                                            General (Free)
                                        </span>
                                    )}
                                </>
                            )}

                            {isGoogleStyle && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                    <Globe size={10} />
                                    Free Plan Users
                                </span>
                            )}

                            {ad.target_roles?.map(role => (
                                <span key={role} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50/70 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/20">
                                    <Users size={10} />
                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Quick Analytics Stats with CTR Progress meter */}
                    <div className="space-y-2 pt-2">
                        <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 dark:bg-zinc-900/50 rounded-2xl border border-slate-100 dark:border-zinc-800 text-center">
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Views</p>
                                <p className="font-extrabold text-slate-800 dark:text-zinc-200 text-sm tabular-nums mt-0.5">{ad.views_count || 0}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Clicks</p>
                                <p className="font-extrabold text-slate-800 dark:text-zinc-200 text-sm tabular-nums mt-0.5">{ad.clicks_count || 0}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">CTR</p>
                                <p className={`font-black text-sm mt-0.5 ${isGoogleStyle ? 'text-blue-600 dark:text-blue-400' : 'text-violet-600 dark:text-violet-400'}`}>{adCtr}%</p>
                            </div>
                        </div>

                        {/* Visual CTR Bar */}
                        <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                    parseFloat(adCtr) > 5 ? 'bg-emerald-500' : parseFloat(adCtr) > 2 ? 'bg-indigo-500' : 'bg-rose-400'
                                }`} 
                                style={{ width: `${Math.min(parseFloat(adCtr) * 10, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Actions and Footer row */}
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100 dark:border-zinc-800">
                        <span className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                            <Calendar size={12} />
                            {new Date(ad.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-1.5">
                            {/* Toggle active button */}
                            <button
                                onClick={() => toggleActive(ad)}
                                className={`p-1 rounded-lg transition-all ${
                                    ad.is_active 
                                        ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' 
                                        : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                                }`}
                                title={ad.is_active ? 'Pause Campaign' : 'Resume Campaign'}
                            >
                                {ad.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                            </button>
                            <button
                                onClick={() => openEditModal(ad)}
                                className="p-1.5 rounded-lg text-violet-500 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all"
                                title="Edit Ad Properties"
                            >
                                <Edit size={14} />
                            </button>
                            <button
                                onClick={() => handleDelete(ad.id)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
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

    // Live Simulator Preview Component (used in form modal)
    const AdBannerSimulator = () => {
        const isGoogle = form.title.toLowerCase().startsWith('sponsored:');
        const cleanTitle = isGoogle ? form.title.replace(/sponsored:\s*/i, '') : form.title;
        return (
            <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block mb-1">
                    Live Real-Time Ad Banner Preview:
                </span>
                <div
                    className={`relative w-full overflow-hidden rounded-xl shadow-lg border border-white/10 ${
                        isGoogle
                            ? 'bg-gradient-to-r from-blue-950 via-blue-900 to-cyan-950 text-white'
                            : 'bg-gradient-to-r from-indigo-950 via-indigo-900 to-violet-950 text-white'
                    }`}
                    style={{ minHeight: '56px' }}
                >
                    {/* Background blurred cover */}
                    {form.media_url && (
                        <div
                            className="absolute inset-0 opacity-20 bg-cover bg-center blur-sm scale-110"
                            style={{ backgroundImage: `url(${form.media_url})` }}
                        />
                    )}

                    <div className="relative flex items-center h-14 px-3.5 gap-3">
                        {/* Prev button placeholder */}
                        <div className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/50">
                            <ChevronLeft size={13} />
                        </div>

                        {/* Image preview */}
                        {form.media_url && (
                            <div className="shrink-0 h-9 w-14 rounded-lg overflow-hidden border border-white/20 shadow-sm bg-black/20">
                                <img
                                    src={form.media_url}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}

                        {/* Text and indicators */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                {isGoogle && (
                                    <span className="shrink-0 px-1.5 py-0.5 bg-white/20 text-white/95 text-[8px] font-black rounded uppercase tracking-wider border border-white/30 whitespace-nowrap shadow-sm">
                                        Google Ad
                                    </span>
                                )}
                                <p className="font-extrabold text-xs sm:text-sm leading-tight truncate">
                                    {cleanTitle || 'Placeholder Ad Title (Type below...)'}
                                </p>
                            </div>
                            <div className="flex gap-1 mt-1">
                                <span className="w-4 h-1 rounded-full bg-white" />
                                <span className="w-1 h-1 rounded-full bg-white/40" />
                                <span className="w-1 h-1 rounded-full bg-white/40" />
                            </div>
                        </div>

                        {/* CTA button */}
                        <div
                            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 font-bold text-[10px] rounded-lg shadow-sm border whitespace-nowrap ${
                                isGoogle
                                    ? 'bg-white text-blue-800 border-transparent'
                                    : 'bg-white text-indigo-800 border-transparent'
                            }`}
                        >
                            Learn More
                            <ExternalLink size={10} />
                        </div>

                        {/* Close button placeholder */}
                        <div className="shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/50">
                            <X size={11} />
                        </div>
                    </div>
                    
                    {/* Bottom Progress loader line */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                        <div className="h-full bg-white/40 w-1/3" />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-fade-in text-slate-800 dark:text-zinc-100 max-w-7xl mx-auto pb-10">
            {/* Elegant Premium Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                {/* Visual grid overlay */}
                <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
                
                <div className="relative z-10 space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-indigo-200">
                        <Activity className="w-3.5 h-3.5 animate-pulse text-indigo-300" />
                        SaaS Monetization Engine Active
                    </div>
                    <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <Megaphone className="w-9 h-9 text-indigo-400" />
                        Ads Command Center
                    </h2>
                    <p className="text-slate-300 text-sm max-w-xl font-medium">
                        Control centralized network ads injection, configure custom targeted sponsor campaigns, and track advertiser metrics globally.
                    </p>
                </div>

                <div className="relative z-10 shrink-0 flex flex-wrap gap-3">
                    <button
                        onClick={() => openCreateModal(true)}
                        className="btn bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-5 py-3 rounded-2xl shadow-lg hover:shadow-blue-500/25 transition-all text-xs flex items-center gap-2 border border-blue-500"
                    >
                        <Globe size={15} /> Inject Google Ad
                    </button>
                    <button
                        onClick={() => openCreateModal(false)}
                        className="btn bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-5 py-3 rounded-2xl shadow-lg hover:shadow-indigo-500/25 transition-all text-xs flex items-center gap-2 border border-indigo-500"
                    >
                        <Plus size={15} /> Add Custom Campaign
                    </button>
                </div>
            </div>

            {/* Quick Analytics Stats cards (Interactive SaaS visualizer) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Active / Total Ads', value: `${activeAds} / ${totalAds}`, gradient: 'from-blue-600 to-indigo-600', icon: Megaphone, desc: 'Active ads rotation pool' },
                    { label: 'Google Ad Pool', value: googleAds.length, gradient: 'from-cyan-600 to-blue-600', icon: Globe, desc: 'Google AdSense templates' },
                    { label: 'Global Views', value: totalViews.toLocaleString(), gradient: 'from-violet-600 to-fuchsia-600', icon: Eye, desc: 'Total impressions' },
                    { label: 'Global Clicks', value: totalClicks.toLocaleString(), gradient: 'from-amber-600 to-orange-600', icon: MousePointerClick, desc: 'Total click conversions' },
                    { label: 'Avg CTR Performance', value: `${avgCtr}%`, gradient: 'from-emerald-600 to-teal-600', icon: TrendingUp, desc: 'Click-through-rate average' },
                ].map((s, i) => (
                    <div key={i} className="premium-card p-6 flex flex-col justify-between hover-lift relative overflow-hidden bg-white dark:bg-[#18181b] border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-start">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-none">{s.label}</p>
                            <span className={`p-2 rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-sm`}>
                                <s.icon className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="mt-4 space-y-1">
                            <p className="text-2xl font-black tracking-tight text-slate-800 dark:text-zinc-100 tabular-nums">{s.value}</p>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">{s.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Premium Pill Tabs Navigation */}
            <div className="flex bg-slate-100/80 dark:bg-zinc-900/60 p-1.5 rounded-2xl border border-slate-200/40 dark:border-zinc-800 max-w-2xl">
                {TABS.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                                isActive
                                    ? `bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-md border-b-2 border-indigo-500`
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300 hover:bg-white/40 dark:hover:bg-zinc-800/20'
                            }`}
                        >
                            <tab.icon size={15} className={isActive ? tab.color : 'text-slate-400'} />
                            {tab.label}
                            {tab.id === 'google' && googleAds.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{googleAds.length}</span>
                            )}
                            {tab.id === 'custom' && customAds.length > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">{customAds.length}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ══════════ TAB CONTENT ══════════ */}
            
            {/* TAB: Google Ads Control */}
            {activeTab === 'google' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Informative Gradient Banner */}
                    <div className="bg-gradient-to-r from-blue-50/50 via-cyan-50/20 to-sky-50/30 dark:from-blue-950/20 dark:to-cyan-950/10 border border-blue-150 dark:border-blue-900/30 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className="p-4 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 shrink-0">
                            <Globe className="w-7 h-7" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <h3 className="font-extrabold text-blue-950 dark:text-blue-200 text-lg">Google Ads Injector Overview</h3>
                            <p className="text-blue-800 dark:text-blue-400/90 text-sm leading-relaxed max-w-3xl font-medium">
                                Free academies act as direct traffic revenue channels. Our system injects Google AdSense networks (configured below) directly into their headers and banners. Pro and Enterprise academies are fully premium and protected from network ads.
                            </p>
                            <div className="flex flex-wrap gap-2 pt-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-150 dark:border-emerald-900/30">
                                    <Check size={12} /> Auto-rotates for Free Plan Academies
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-150 dark:border-rose-900/30">
                                    <X size={12} /> Excluded from Pro & medium Plan
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-150 dark:border-rose-900/30">
                                    <X size={12} /> Excluded from Enterprise Plan
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Google AdSense Integration settings (Prepared/Simulated credentials) */}
                    <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
                        <div className="flex justify-between items-start border-b border-slate-100 dark:border-zinc-800/80 pb-4">
                            <div>
                                <h4 className="font-extrabold text-slate-800 dark:text-zinc-100 text-base flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-blue-500" /> Google AdSense SDK Setup (Integration Sandbox)
                                </h4>
                                <p className="text-xs text-slate-450 dark:text-zinc-500 mt-1">Configure your Google AdSense Publisher Credentials. Auto-script injection remains simulated until ready for production linking.</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black bg-blue-50 dark:bg-blue-950/35 text-blue-700 dark:text-blue-400 uppercase tracking-widest border border-blue-100 dark:border-blue-900/30">
                                Pre-Production Mode
                            </span>
                        </div>

                        <form onSubmit={handleSaveAdsense} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                            <div>
                                <label className="block text-[10px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest mb-2">Publisher ID (AdSense Client) *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="ca-pub-7182903829103928"
                                    value={adsenseSettings.publisherId}
                                    onChange={e => setAdsenseSettings(prev => ({ ...prev, publisherId: e.target.value }))}
                                    className="input w-full font-mono text-xs dark:bg-zinc-900 dark:border-zinc-800"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest mb-2">Responsive Banner Slot ID *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="4829103829"
                                    value={adsenseSettings.slotId}
                                    onChange={e => setAdsenseSettings(prev => ({ ...prev, slotId: e.target.value }))}
                                    className="input w-full font-mono text-xs dark:bg-zinc-900 dark:border-zinc-800"
                                />
                            </div>

                            <div className="flex gap-3 justify-between items-center bg-slate-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-850 h-10">
                                <span className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest pl-1.5">Live Script Injection</span>
                                <button
                                    type="button"
                                    onClick={() => setAdsenseSettings(prev => ({ ...prev, isActive: !prev.isActive }))}
                                    className={`w-12 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${adsenseSettings.isActive ? 'bg-blue-600' : 'bg-slate-350 dark:bg-zinc-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${adsenseSettings.isActive ? 'translate-x-[24px]' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="md:col-span-3 flex justify-between items-center pt-2">
                                <div className="text-xs">
                                    {showAdsenseSuccess && (
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-fade-in">
                                            <Check className="w-4 h-4 bg-emerald-100 dark:bg-emerald-950/20 p-0.5 rounded-full" /> 
                                            AdSense Publisher Config cached locally! Setup is prepared.
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={savingAdsense}
                                    className="btn bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md transition-all text-xs flex items-center gap-1.5 min-w-[150px] justify-center"
                                >
                                    {savingAdsense ? <Loader2 size={13} className="animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Save AdSense Setup
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Quick Template Creation */}
                    {googleAds.length === 0 && (
                        <div className="bg-white dark:bg-[#18181b] border border-dashed border-slate-350 dark:border-zinc-800 rounded-3xl p-8 text-center space-y-6">
                            <div className="space-y-2 max-w-md mx-auto">
                                <Sparkles className="w-10 h-10 mx-auto text-blue-500 animate-bounce" />
                                <h4 className="font-extrabold text-slate-800 dark:text-zinc-100 text-lg">Deploy Google AdSense Templates</h4>
                                <p className="text-sm text-slate-500 dark:text-zinc-400">Instantly populate your database with pre-configured AdSense mock campaigns to monetize free academies.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                                {GOOGLE_AD_TEMPLATES.map((tpl, i) => (
                                    <button
                                        key={i}
                                        onClick={() => createFromTemplate(tpl, i)}
                                        disabled={creatingTemplate !== null}
                                        className="text-left bg-slate-50 dark:bg-zinc-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 border border-slate-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-900/40 rounded-2xl p-4 transition-all duration-300 group flex flex-col justify-between h-36"
                                    >
                                        <div className="flex gap-3 items-start">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-zinc-800 bg-zinc-800">
                                                <img src={tpl.media_url} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 line-clamp-2 leading-snug group-hover:text-blue-600">{tpl.title.replace('Sponsored: ', '')}</p>
                                                <p className="text-[9px] text-slate-400 dark:text-zinc-500 mt-1 truncate">{tpl.link_url}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center w-full pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Install Ad</span>
                                            {creatingTemplate === i ? (
                                                <Loader2 size={14} className="animate-spin text-blue-600" />
                                            ) : (
                                                <Plus size={14} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Google Ads Grid */}
                    {loading ? (
                        <div className="py-20 text-center"><Loader2 className="w-10 h-10 mx-auto text-blue-600 animate-spin" /></div>
                    ) : googleAds.length === 0 ? (
                        <div className="py-20 text-center text-slate-400 bg-white dark:bg-[#18181b] rounded-3xl border border-slate-200 dark:border-zinc-800/80 shadow-sm">
                            <Globe className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-bold text-slate-500 dark:text-zinc-400">No active Google Ads in database pool.</p>
                            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Use the template loader above or create a new manually injected Google Ad banner.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {googleAds.map(ad => renderAdCard(ad, true))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: Custom Campaign Manager */}
            {activeTab === 'custom' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Header Controls */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="font-extrabold text-slate-800 dark:text-zinc-100 text-xl flex items-center gap-2">
                                <Target className="w-6 h-6 text-violet-500" />
                                Sponsored Advertiser Campaigns
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium">Create targeted campaigns for specific academies, age category groups, or specific layout roles.</p>
                        </div>
                        <button
                            onClick={() => openCreateModal(false)}
                            className="btn bg-violet-600 hover:bg-violet-700 text-white font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all text-xs flex items-center gap-1.5"
                        >
                            <Plus size={15} /> Add Custom Campaign
                        </button>
                    </div>

                    {/* Filter controls panel */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-[#18181b] p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Search Titles</label>
                            <input
                                type="text"
                                placeholder="Search campaigns..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="input w-full focus:ring-violet-500 focus:border-violet-500 dark:bg-zinc-900"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Ad Tier</label>
                            <select value={adTypeFilter} onChange={e => setAdTypeFilter(e.target.value)} className="input w-full dark:bg-zinc-900">
                                <option value="all">All Tiers / Placements</option>
                                <option value="general">General (Free Plan)</option>
                                <option value="pro">Pro (Medium Plan)</option>
                                <option value="1to1">1-to-1 Sponsor (Premium)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">User Roles</label>
                            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input w-full dark:bg-zinc-900">
                                <option value="all">All User Roles</option>
                                <option value="parent">Parents Only</option>
                                <option value="coach">Coaches Only</option>
                                <option value="player">Players Only</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Status</label>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-full dark:bg-zinc-900">
                                <option value="all">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Paused Only</option>
                            </select>
                        </div>
                    </div>

                    {/* Custom Campaigns Grid */}
                    {loading ? (
                        <div className="py-20 text-center"><Loader2 className="w-10 h-10 mx-auto text-violet-600 animate-spin" /></div>
                    ) : filteredCustomAds.length === 0 ? (
                        <div className="py-20 text-center text-slate-400 bg-white dark:bg-[#18181b] rounded-3xl border border-slate-200 dark:border-zinc-800/80">
                            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-bold text-slate-500 dark:text-zinc-400">No advertiser campaigns match the criteria.</p>
                            <button onClick={() => { setSearchTerm(''); setAdTypeFilter('all'); setRoleFilter('all'); setStatusFilter('all'); }} className="mt-3 text-xs text-indigo-600 hover:text-indigo-800 font-bold underline">Reset Filters</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCustomAds.map(ad => renderAdCard(ad, false))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: Analytics & Chart Breakdown */}
            {activeTab === 'analytics' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Performance breakdown header */}
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-md">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-slate-800 dark:text-zinc-100 text-xl">Conversion Analytics</h3>
                            <p className="text-sm text-slate-500 dark:text-zinc-400">Performance insights, Click Through Rates, and conversions across active campaigns.</p>
                        </div>
                    </div>

                    {/* Dual Stats visual comparisons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Google Ad performance block */}
                        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                            {/* SVG Graph overlay */}
                            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none">
                                <Globe className="w-44 h-44" />
                            </div>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="p-3 rounded-2xl bg-white/10 border border-white/10"><Globe className="w-5 h-5 text-blue-300" /></span>
                                    <div>
                                        <h4 className="font-black text-base text-white">Google AdSense Traffic</h4>
                                        <p className="text-[10px] text-blue-200/70 font-semibold tracking-wide uppercase">Free Plan Injector Network</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-500/30 text-blue-300 border border-blue-500/20">{googleAds.length} ACTIVE ADS</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 pt-2">
                                <div>
                                    <p className="text-[9px] font-bold text-blue-300/80 uppercase tracking-widest">Views</p>
                                    <p className="text-3xl font-black tracking-tight tabular-nums">{googleViews.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-blue-300/80 uppercase tracking-widest">Clicks</p>
                                    <p className="text-3xl font-black tracking-tight tabular-nums">{googleClicks.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-blue-300/80 uppercase tracking-widest">Global CTR</p>
                                    <p className="text-3xl font-black tracking-tight text-blue-400 tabular-nums">{googleViews > 0 ? ((googleClicks / googleViews) * 100).toFixed(2) : '0.00'}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Custom campaign performance block */}
                        <div className="bg-gradient-to-br from-violet-900 to-purple-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none">
                                <Megaphone className="w-44 h-44" />
                            </div>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="p-3 rounded-2xl bg-white/10 border border-white/10"><Megaphone className="w-5 h-5 text-violet-300" /></span>
                                    <div>
                                        <h4 className="font-black text-base text-white">Direct Sponsored Campaigns</h4>
                                        <p className="text-[10px] text-violet-200/70 font-semibold tracking-wide uppercase">Advertiser Contract Traffic</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-purple-500/30 text-purple-300 border border-purple-500/20">{customAds.length} ACTIVE CAMPAIGNS</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 pt-2">
                                <div>
                                    <p className="text-[9px] font-bold text-purple-300/80 uppercase tracking-widest">Views</p>
                                    <p className="text-3xl font-black tracking-tight tabular-nums">{customViews.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-purple-300/80 uppercase tracking-widest">Clicks</p>
                                    <p className="text-3xl font-black tracking-tight tabular-nums">{customClicks.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold text-purple-300/80 uppercase tracking-widest">Global CTR</p>
                                    <p className="text-3xl font-black tracking-tight text-purple-400 tabular-nums">{customViews > 0 ? ((customClicks / customViews) * 100).toFixed(2) : '0.00'}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Real Data Recharts Visualization */}
                    {ads.length > 0 ? (
                        <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
                            <h4 className="font-extrabold text-slate-800 dark:text-zinc-100 text-md flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-500" /> Top Performing Ads Comparison (by Click Conversions)
                            </h4>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={getChartData()} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                                        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                                        <Tooltip 
                                            contentStyle={{ 
                                                background: '#18181b', 
                                                border: 'none', 
                                                borderRadius: '12px', 
                                                color: '#fff', 
                                                fontSize: '11px',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                            }} 
                                        />
                                        <Bar dataKey="Clicks" radius={[8, 8, 0, 0]} maxBarSize={45}>
                                            {getChartData().map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={entry.type === 'Google' ? '#3b82f6' : '#8b5cf6'} 
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex gap-4 justify-center text-xs font-bold pt-2 border-t border-slate-100 dark:border-zinc-800">
                                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-blue-500 block" /> Google AdSense Ad</span>
                                <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-purple-500 block" /> Direct Sponsored Campaign</span>
                            </div>
                        </div>
                    ) : null}

                    {/* Detailed Data Table */}
                    <div className="bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 shadow-sm rounded-3xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/30">
                            <h4 className="font-extrabold text-slate-800 dark:text-zinc-100 text-sm flex items-center gap-2">
                                <BarChart3 size={16} className="text-emerald-500" />
                                Comprehensive Performance Logs
                            </h4>
                            <span className="text-[10px] font-black bg-slate-200/60 dark:bg-zinc-800 px-2.5 py-1 rounded-full text-slate-600 dark:text-zinc-400 uppercase tracking-widest">{ads.length} total</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500">
                                        <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest">Ad Title</th>
                                        <th className="px-4 py-4 font-black text-[10px] uppercase tracking-widest">Type</th>
                                        <th className="px-4 py-4 font-black text-[10px] uppercase tracking-widest text-center">Status</th>
                                        <th className="px-4 py-4 font-black text-[10px] uppercase tracking-widest text-right">Views</th>
                                        <th className="px-4 py-4 font-black text-[10px] uppercase tracking-widest text-right">Clicks</th>
                                        <th className="px-6 py-4 font-black text-[10px] uppercase tracking-widest text-right">CTR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                                    {ads.map(ad => {
                                        const isGoogle = (ad.title || '').startsWith('Sponsored:');
                                        const ctr = ad.views_count > 0 ? ((ad.clicks_count / ad.views_count) * 100).toFixed(2) : '0.00';
                                        return (
                                            <tr key={ad.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-zinc-200">
                                                    <div className="flex items-center gap-3">
                                                        {ad.media_url ? (
                                                            <img src={ad.media_url} alt="" className="w-12 h-8 rounded-lg object-cover border border-slate-250/60 dark:border-zinc-800 shrink-0 bg-zinc-850" />
                                                        ) : (
                                                            <div className="w-12 h-8 rounded-lg bg-slate-100 dark:bg-zinc-850 flex items-center justify-center shrink-0">
                                                                <Megaphone size={12} className="text-slate-400" />
                                                            </div>
                                                        )}
                                                        <span className="truncate max-w-xs block font-bold leading-tight">
                                                            {isGoogle ? ad.title.replace('Sponsored: ', '') : ad.title}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        isGoogle ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' :
                                                        ad.ad_type === 'pro' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400' :
                                                        ad.ad_type === '1to1' ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400' :
                                                        'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                                    }`}>
                                                        {isGoogle ? 'Google' : ad.ad_type === 'pro' ? 'Pro' : ad.ad_type === '1to1' ? '1-to-1' : 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        ad.is_active ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'
                                                    }`}>
                                                        {ad.is_active ? 'Active' : 'Paused'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right font-bold text-slate-600 dark:text-zinc-300 tabular-nums">{(ad.views_count || 0).toLocaleString()}</td>
                                                <td className="px-4 py-4 text-right font-bold text-slate-600 dark:text-zinc-300 tabular-nums">{(ad.clicks_count || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{ctr}%</td>
                                            </tr>
                                        );
                                    })}
                                    {ads.length === 0 && (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">No performance records in history.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ CREATE/EDIT CAMPAIGN MODAL ══════════ */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
                    {/* Width XL for split layout previews */}
                    <div className="bg-white dark:bg-[#18181b] w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden animate-scale-in my-8">

                        {/* Modal Header */}
                        <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30">
                            <div className="flex items-center gap-2.5">
                                <span className={`p-2 rounded-xl text-white shadow-sm ${form.title.startsWith('Sponsored:') ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                                    {form.title.startsWith('Sponsored:') ? <Globe size={18} /> : <Megaphone size={18} />}
                                </span>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-zinc-100">
                                        {modalMode === 'create' ? (form.title.startsWith('Sponsored:') ? 'Create Network Google Ad' : 'Launch Advertiser Campaign') : 'Configure Ad Campaign'}
                                    </h3>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">Campaign Configurator & Simulator</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* 2-Column form and live preview simulator layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-zinc-800/85 max-h-[75vh] overflow-y-auto">
                            
                            {/* LEFT SIDE: Inputs Form */}
                            <form onSubmit={handleSubmit} className="lg:col-span-7 p-8 space-y-6">
                                {submitError && (
                                    <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                                        <AlertCircle size={16} className="shrink-0" />
                                        {submitError}
                                    </div>
                                )}

                                {/* Google Ads title instruction notice */}
                                {form.title.startsWith('Sponsored:') && (
                                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-150 dark:border-blue-900/30 p-4 rounded-2xl text-xs text-blue-800 dark:text-blue-400 font-medium flex items-start gap-2.5">
                                        <Info size={16} className="shrink-0 mt-0.5 text-blue-500" />
                                        <span>Google Adsense network flags must strictly start with the prefix <strong>"Sponsored: "</strong>. This informs our banner engines to inject them solely for non-paying Free Tier accounts.</span>
                                    </div>
                                )}

                                {/* Campaign Title */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Campaign Ad Text *</label>
                                    <input
                                        required
                                        type="text"
                                        className="input focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full dark:bg-zinc-900 dark:border-zinc-800"
                                        value={form.title}
                                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                        placeholder={form.title.startsWith('Sponsored:') ? 'Sponsored: Grow career with Google Python Certificates...' : 'e.g. Get 20% off all soccer kits this month!'}
                                    />
                                </div>

                                {/* Creative Image URL and Upload block */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Creative Banner Image *</label>
                                    <div className="flex gap-3">
                                        <input
                                            required
                                            type="text"
                                            className="input focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 flex-1 text-xs font-mono dark:bg-zinc-900 dark:border-zinc-800"
                                            value={form.media_url}
                                            onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))}
                                            placeholder="https://example.com/creative-image.jpg"
                                        />
                                        <label className="btn btn-secondary shrink-0 border border-slate-200 dark:border-zinc-850 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-1.5 text-xs font-bold rounded-xl">
                                            {uploading ? <Loader2 size={14} className="animate-spin text-indigo-500" /> : <Upload size={14} />}
                                            Upload
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                                        </label>
                                    </div>
                                    {uploadError && (
                                        <p className="text-xs text-rose-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={12} />{uploadError}</p>
                                    )}
                                </div>

                                {/* CTA Link Destination URL */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Call to Action (CTA) Link URL</label>
                                    <input
                                        type="text"
                                        className="input focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full dark:bg-zinc-900 dark:border-zinc-800"
                                        value={form.link_url}
                                        onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                                        placeholder="https://example.com/promo-target"
                                    />
                                </div>

                                {/* Tiers & Targeting Config — hidden for Google network ads */}
                                {!form.title.startsWith('Sponsored:') && (
                                    <div className="space-y-5 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                                        
                                        {/* Ad Placements (Tier Cards selector instead of dropdown) */}
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Ad placement plan tier *</label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {[
                                                    { value: 'general', title: 'General Placements', desc: 'Free plan academies', icon: Globe, border: 'hover:border-slate-400 border-slate-200 dark:border-zinc-800' },
                                                    { value: 'pro', title: 'Pro Placements', desc: 'Pro plan academies', icon: Zap, border: 'hover:border-amber-400 border-slate-200 dark:border-zinc-800' },
                                                    { value: '1to1', title: '1-to-1 Placements', desc: 'Direct targeted sponsor', icon: Target, border: 'hover:border-purple-400 border-slate-200 dark:border-zinc-800' }
                                                ].map(item => {
                                                    const isChecked = form.ad_type === item.value;
                                                    return (
                                                        <button
                                                            key={item.value}
                                                            type="button"
                                                            onClick={() => setForm(f => ({ ...f, ad_type: item.value, academy_id: item.value === '1to1' ? f.academy_id : '' }))}
                                                            className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between h-28 relative ${
                                                                isChecked
                                                                    ? 'bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/10 shadow-sm'
                                                                    : `bg-white dark:bg-zinc-900 ${item.border}`
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-start w-full">
                                                                <item.icon className={`w-5 h-5 ${isChecked ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                                                                {isChecked && <Check className="w-4 h-4 text-indigo-650 bg-indigo-100 dark:bg-indigo-900/60 dark:text-indigo-400 rounded-full p-0.5" />}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black text-slate-800 dark:text-zinc-200">{item.title}</p>
                                                                <p className="text-[10px] text-slate-450 dark:text-zinc-500 mt-0.5">{item.desc}</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Target Academy (for 1to1 Placements) */}
                                        {form.ad_type === '1to1' && (
                                            <div className="animate-slide-up">
                                                <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Target Academy Destination *</label>
                                                <select
                                                    required
                                                    className="input focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full dark:bg-zinc-900 dark:border-zinc-800"
                                                    value={form.academy_id}
                                                    onChange={e => setForm(f => ({ ...f, academy_id: e.target.value }))}
                                                >
                                                    <option value="">Select Target Academy...</option>
                                                    {academies.map(ac => (
                                                        <option key={ac.id} value={ac.id}>{ac.name} ({ac.subdomain || 'no domain'})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Target Roles Selector pills */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">Target Audience Roles</label>
                                    <p className="text-[10px] text-slate-450 dark:text-zinc-500 mb-3">If unchecked, this ad campaign defaults to showing for all user roles globally.</p>
                                    <div className="flex gap-3">
                                        {roleOptions.map(opt => {
                                            const isSelected = form.target_roles.includes(opt.value);
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => handleRoleToggle(opt.value)}
                                                    className={`px-4 py-2 rounded-2xl border text-xs font-black transition-all flex items-center gap-1.5 ${
                                                        isSelected
                                                            ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 border-indigo-300 dark:border-indigo-900/60 ring-2 ring-indigo-500/5'
                                                            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300'
                                                    }`}
                                                >
                                                    {isSelected ? <Check size={12} /> : <Users size={12} className="opacity-40" />}
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Target Age Category Categories Selector */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2.5">Target Age Group Categories</label>
                                    <div className="flex flex-wrap gap-2">
                                        {categoryOptions.map(cat => {
                                            const isSelected = form.target_categories.includes(cat);
                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => handleCategoryToggle(cat)}
                                                    className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1 ${
                                                        isSelected
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900/50'
                                                            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-350'
                                                    }`}
                                                >
                                                    {isSelected && <Check size={11} />}
                                                    {cat}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Instant Activation Toggle checkbox */}
                                <div className="flex items-center gap-3 pt-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={form.is_active}
                                        onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                                        className="w-5 h-5 text-indigo-650 border-slate-300 dark:border-zinc-800 rounded-lg focus:ring-indigo-500 bg-white dark:bg-zinc-900"
                                    />
                                    <label htmlFor="is_active" className="text-xs font-black text-slate-700 dark:text-zinc-300 uppercase tracking-wider select-none cursor-pointer">
                                        Activate Campaign Immediately
                                    </label>
                                </div>
                            </form>

                            {/* RIGHT SIDE: Interactive Device Live Preview Simulator */}
                            <div className="lg:col-span-5 p-8 bg-slate-50/70 dark:bg-zinc-900/20 flex flex-col justify-between space-y-6">
                                <div className="space-y-4">
                                    <h4 className="font-extrabold text-slate-800 dark:text-zinc-200 text-sm flex items-center gap-2">
                                        <Activity size={16} className="text-indigo-500" /> Device Simulator & Banner Preview
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                                        This banner mock updates dynamically in real-time. This allows you to verify copy limits, background image framing, and link badges before deploying live onto academy headers.
                                    </p>

                                    <div className="pt-2">
                                        <AdBannerSimulator />
                                    </div>
                                </div>

                                {/* Creative Image Preview thumbnail large */}
                                <div className="border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl p-4 shadow-inner space-y-3">
                                    <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">Creative Image Asset Spec:</span>
                                    {form.media_url ? (
                                        <div className="relative rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-800 h-44 bg-zinc-950 flex items-center justify-center">
                                            <img src={form.media_url} alt="Large preview" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 h-44 flex flex-col items-center justify-center text-slate-450 dark:text-zinc-500 gap-2">
                                            <Upload className="w-8 h-8 opacity-40" />
                                            <span className="text-xs font-semibold">Image Asset Preview Area</span>
                                        </div>
                                    )}
                                </div>

                                {/* Modal Save/Cancel Controls */}
                                <div className="flex gap-3 justify-end pt-5 border-t border-slate-100 dark:border-zinc-800/80">
                                    <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary dark:border-zinc-800 border-slate-200 py-3 rounded-2xl px-5 font-bold">
                                        Discard
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className={`btn font-black px-6 py-3 rounded-2xl text-white shadow-lg w-[160px] justify-center transition-all ${
                                            form.title.startsWith('Sponsored:') 
                                                ? 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/20' 
                                                : 'bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/20'
                                        }`}
                                    >
                                        {submitting ? <Loader2 size={16} className="animate-spin" /> : modalMode === 'create' ? 'Deploy Campaign' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
