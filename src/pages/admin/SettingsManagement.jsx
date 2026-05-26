import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { SkeletonDashboard } from '../../components/Skeleton';
import {
    Settings,
    Save,
    Globe,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    Image as ImageIcon,
    Building,
    CheckCircle,
    Tag,
    Star,
    Plus,
    Trash2,
    Edit2,
    X,
    Check,
    Calendar,
    AlertCircle,
    ShieldCheck,
    ShieldOff,
    KeyRound,
    Loader2,
    QrCode,
    LandPlot,
    Trophy
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

import GeneralBrandingSection from './components/GeneralBrandingSection';
import FinancialPolicySection from './components/FinancialPolicySection';
import LandingPageEditorSection from './components/LandingPageEditorSection';
import MembershipPlansSection from './components/MembershipPlansSection';
import CouponsSection from './components/CouponsSection';
import SecuritySection from './components/SecuritySection';

const SettingsManagement = () => {
    const [settings, setSettings] = useState(null);
    const [coupons, setCoupons] = useState([]);
    const [newCoupon, setNewCoupon] = useState({ code: '', discount_type: 'percentage', discount_value: '' });
    const [newCategoryInput, setNewCategoryInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
    const toast = useToast();

    // ─── Branding States ────────────────────────────────────────
    const [primaryColor, setPrimaryColor] = useState('#4f46e5');
    const [secondaryColor, setSecondaryColor] = useState('#7c3aed');
    const [aboutText, setAboutText] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const showBanner = (message, type = 'success') => {
        if (type === 'error') toast.error(message);
        else toast.success(message);
    };

    // ─── Change Password State ──────────────────────────────────
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwSaving, setPwSaving] = useState(false);

    const handleChangePassword = async () => {
        if (pwForm.next !== pwForm.confirm) {
            showBanner('New passwords do not match.', 'error');
            return;
        }
        if (pwForm.next.length < 8) {
            showBanner('New password must be at least 8 characters.', 'error');
            return;
        }
        setPwSaving(true);
        try {
            const res = await authFetch(`${API_URL}/auth/change-password`, {
                method: 'POST',
                body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Failed');
            showBanner('Password changed. Logging you out…');
            setTimeout(() => {
                localStorage.clear();
                window.location.href = '/login';
            }, 1500);
        } catch (err) {
            showBanner(err.message, 'error');
        } finally {
            setPwSaving(false);
        }
    };

    // ─── 2FA State ─────────────────────────────────────────────
    const [twoFA, setTwoFA] = useState({ enabled: false, loading: true });
    const [twoFASetup, setTwoFASetup] = useState(null); // { qr_code, secret }
    const [twoFACode, setTwoFACode] = useState('');
    const [twoFAAction, setTwoFAAction] = useState(null); // 'enable' | 'disable' | null
    const [twoFASaving, setTwoFASaving] = useState(false);

    const fetch2FAStatus = async () => {
        try {
            const res = await authFetch(`${API_URL}/auth/2fa/status`);
            if (res.ok) {
                const data = await res.json();
                setTwoFA({ enabled: data.totp_enabled, loading: false });
            }
        } catch { setTwoFA(s => ({ ...s, loading: false })); }
    };

    const handle2FASetup = async () => {
        setTwoFASaving(true);
        try {
            const res = await authFetch(`${API_URL}/auth/2fa/setup`, { method: 'POST' });
            if (!res.ok) throw new Error('Setup failed');
            const data = await res.json();
            setTwoFASetup(data);
            setTwoFAAction('enable');
            setTwoFACode('');
        } catch { showBanner('Failed to start 2FA setup', 'error'); }
        finally { setTwoFASaving(false); }
    };

    const handle2FAEnable = async () => {
        setTwoFASaving(true);
        try {
            const res = await authFetch(`${API_URL}/auth/2fa/enable`, {
                method: 'POST',
                body: JSON.stringify({ code: twoFACode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Invalid code');
            setTwoFA({ enabled: true, loading: false });
            setTwoFASetup(null);
            setTwoFAAction(null);
            setTwoFACode('');
            showBanner('2FA enabled successfully');
        } catch (err) { showBanner(err.message, 'error'); }
        finally { setTwoFASaving(false); }
    };

    const handle2FADisable = async () => {
        setTwoFASaving(true);
        try {
            const res = await authFetch(`${API_URL}/auth/2fa/disable`, {
                method: 'POST',
                body: JSON.stringify({ code: twoFACode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Invalid code');
            setTwoFA({ enabled: false, loading: false });
            setTwoFAAction(null);
            setTwoFACode('');
            showBanner('2FA disabled');
        } catch (err) { showBanner(err.message, 'error'); }
        finally { setTwoFASaving(false); }
    };

    // Plans state
    const [plans, setPlans] = useState([]);
    const [editingPlan, setEditingPlan] = useState(null); // plan being edited
    const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
    const [newPlanData, setNewPlanData] = useState({ name: '', description: '', monthly_price: '', annual_price: '', billing_cycles: ['monthly'], features: [], color: 'gold', sort_order: 0 });
    const [newFeatureInput, setNewFeatureInput] = useState('');
    const [editFeatureInput, setEditFeatureInput] = useState('');
    const [confirmDeletePlanId, setConfirmDeletePlanId] = useState(null);

    useEffect(() => {
        fetchSettings();
        fetchCoupons();
        fetchPlans();
        fetch2FAStatus();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await authFetch(`${API_URL}/plans/`);
            if (res.ok) setPlans(await res.json());
        } catch (err) { console.error('Error fetching plans:', err); }
    };

    const handleCreatePlan = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newPlanData,
                monthly_price: newPlanData.monthly_price ? parseFloat(newPlanData.monthly_price) : null,
                annual_price: newPlanData.annual_price ? parseFloat(newPlanData.annual_price) : null,
            };
            const res = await authFetch(`${API_URL}/plans/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setNewPlanData({ name: '', description: '', monthly_price: '', annual_price: '', billing_cycles: ['monthly'], features: [], color: 'gold', sort_order: 0 });
                setIsCreatePlanOpen(false);
                fetchPlans();
            }
        } catch (err) { console.error('Error creating plan:', err); }
    };

    const handleSaveEditPlan = async () => {
        try {
            const payload = {
                ...editingPlan,
                monthly_price: editingPlan.monthly_price !== '' ? parseFloat(editingPlan.monthly_price) || null : null,
                annual_price: editingPlan.annual_price !== '' ? parseFloat(editingPlan.annual_price) || null : null,
            };
            const res = await authFetch(`${API_URL}/plans/${editingPlan.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) { setEditingPlan(null); fetchPlans(); }
        } catch (err) { console.error('Error saving plan:', err); }
    };

    const handleDeletePlan = async (id) => {
        try {
            const res = await authFetch(`${API_URL}/plans/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setConfirmDeletePlanId(null);
                fetchPlans();
            } else {
                console.error('Delete failed:', await res.text());
            }
        } catch (err) { console.error('Error deleting plan:', err); }
    };

    const handleTogglePlan = async (plan) => {
        await authFetch(`${API_URL}/plans/${plan.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: !plan.is_active })
        });
        fetchPlans();
    };



    const addFeatureTo = (input, setter, stateSetter) => {
        if (!input.trim()) return;
        setter(prev => ({ ...prev, features: [...(prev.features || []), input.trim()] }));
        stateSetter('');
    };

    const removeFeatureFrom = (index, setter) => {
        setter(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));
    };

    const planColorMap = {
        gold: { bg: 'from-yellow-50 to-amber-100', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-800', dot: 'bg-yellow-500' },
        silver: { bg: 'from-slate-50 to-slate-100', border: 'border-slate-300', badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
        bronze: { bg: 'from-orange-50 to-orange-100', border: 'border-orange-300', badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-600' },
        blue: { bg: 'from-blue-50 to-blue-100', border: 'border-blue-300', badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' },
    };

    const fetchCoupons = async () => {
        try {
            const res = await authFetch(`${API_URL}/coupons/`);
            if (res.ok) setCoupons(await res.json());
        } catch (error) {
            console.error('Error fetching coupons:', error);
        }
    };

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const res = await authFetch(`${API_URL}/settings/`);
            if (res.ok) {
                const data = await res.json();
                // Parse branding colors serialized in about_text as JSON
                const rawAbout = data.about_text || '';
                if (rawAbout.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(rawAbout);
                        if (parsed && typeof parsed === 'object') {
                            setPrimaryColor(parsed.primary_color || '#4f46e5');
                            setSecondaryColor(parsed.secondary_color || '#7c3aed');
                            setAboutText(parsed.about_text || '');
                            document.documentElement.style.setProperty('--color-primary', parsed.primary_color || '#4f46e5');
                            document.documentElement.style.setProperty('--color-secondary', parsed.secondary_color || '#7c3aed');
                        }
                    } catch { setAboutText(rawAbout); }
                } else {
                    setAboutText(rawAbout);
                }
                setSettings(data);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Logo Upload ─────────────────────────────────────────────
    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !settings?.id) return;
        setUploadingLogo(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await authFetch(
                `${API_URL}/storage/upload/profile-image?entity_type=academy&entity_id=${settings.academy_id || settings.id}`,
                { method: 'POST', body: fd }
            );
            if (!res.ok) throw new Error('Upload failed');
            const { url } = await res.json();
            setSettings(prev => ({ ...prev, logo_url: url }));
            showBanner('تم رفع الشعار بنجاح!', 'success');
        } catch (err) {
            showBanner('فشل رفع الشعار: ' + err.message, 'error');
        } finally {
            setUploadingLogo(false);
        }
    };

    // ─── Apply CSS variables live on color change ─────────────────
    React.useEffect(() => {
        document.documentElement.style.setProperty('--color-primary', primaryColor || '#4f46e5');
    }, [primaryColor]);

    React.useEffect(() => {
        document.documentElement.style.setProperty('--color-secondary', secondaryColor || '#7c3aed');
    }, [secondaryColor]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const addAgeCategory = (e) => {
        e.preventDefault();
        if (!newCategoryInput.trim() || !settings) return;
        const cat = newCategoryInput.trim();
        if (settings.age_categories?.includes(cat)) {
            setNewCategoryInput('');
            return;
        }
        setSettings(prev => ({
            ...prev,
            age_categories: [...(prev.age_categories || []), cat]
        }));
        setNewCategoryInput('');
    };

    const removeAgeCategory = (catToRemove) => {
        setSettings(prev => ({
            ...prev,
            age_categories: prev.age_categories.filter(c => c !== catToRemove)
        }));
    };

    // ─── Terrains Management ────────────────────────────────────
    const [newTerrain, setNewTerrain] = useState({ name: '', size: '5/5' });
    const TERRAIN_SIZES = ['5/5', '6/6', '7/7', '8/8', '9/9', '11/11'];

    const addTerrain = (e) => {
        e?.preventDefault?.();
        if (!newTerrain.name.trim() || !settings) return;
        const list = settings.terrains || [];
        const next = [...list, { name: newTerrain.name.trim(), size: newTerrain.size }];
        setSettings(prev => ({ ...prev, terrains: next }));
        setNewTerrain({ name: '', size: '5/5' });
    };

    const removeTerrain = (idx) => {
        setSettings(prev => ({
            ...prev,
            terrains: (prev.terrains || []).filter((_, i) => i !== idx),
        }));
    };

    // ─── Tournaments List Management ────────────────────────────
    const [newTournamentInput, setNewTournamentInput] = useState('');
    const DEFAULT_TOURNAMENTS = ['CHALLENGER CHAMPIONNAT', 'GOLDEN CHAMPIONNAT', 'MASTER LEAGUE', 'MATCH AMICAL'];

    const addTournament = (e) => {
        e?.preventDefault?.();
        const val = newTournamentInput.trim().toUpperCase();
        if (!val || !settings) return;
        const list = settings.tournaments_list || [];
        if (list.includes(val)) { setNewTournamentInput(''); return; }
        setSettings(prev => ({ ...prev, tournaments_list: [...list, val] }));
        setNewTournamentInput('');
    };

    const addTournamentPreset = (val) => {
        if (!settings) return;
        const list = settings.tournaments_list || [];
        if (list.includes(val)) return;
        setSettings(prev => ({ ...prev, tournaments_list: [...list, val] }));
    };

    const removeTournament = (val) => {
        setSettings(prev => ({
            ...prev,
            tournaments_list: (prev.tournaments_list || []).filter(t => t !== val),
        }));
    };

    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        try {
            const res = await authFetch(`${API_URL}/coupons/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newCoupon,
                    discount_value: parseFloat(newCoupon.discount_value)
                })
            });
            if (res.ok) {
                setNewCoupon({ code: '', discount_type: 'percentage', discount_value: '' });
                fetchCoupons();
                showBanner('Coupon created successfully!', 'success');
            } else {
                showBanner('Error creating coupon', 'error');
            }
        } catch (error) {
            console.error('Error creating coupon:', error);
            showBanner('Error creating coupon: ' + error.message, 'error');
        }
    };

    const handleDeleteCoupon = (id) => {
        setConfirmDialog({ isOpen: true, id });
    };

    const confirmDeleteCoupon = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        try {
            await authFetch(`${API_URL}/coupons/${id}`, { method: 'DELETE' });
            fetchCoupons();
        } catch (error) {
            console.error('Error deleting coupon:', error);
        }
    };

    const handleToggleCoupon = async (id, currentStatus) => {
        try {
            await authFetch(`${API_URL}/coupons/${id}/toggle?is_active=${!currentStatus}`, { method: 'PATCH' });
            fetchCoupons();
        } catch (error) {
            console.error('Error toggling coupon:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            // Serialize branding colors + about text into about_text JSON
            const serializedAbout = JSON.stringify({
                primary_color: primaryColor || '#4f46e5',
                secondary_color: secondaryColor || '#7c3aed',
                about_text: aboutText || '',
            });

            const cleanedSettings = { ...settings, about_text: serializedAbout };
            if (!cleanedSettings.season_start) delete cleanedSettings.season_start;
            if (!cleanedSettings.season_end) delete cleanedSettings.season_end;

            const res = await authFetch(`${API_URL}/settings/${settings.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanedSettings)
            });

            if (res.ok) {
                setSaveSuccess(true);
                const updated = await res.json();
                // Re-parse the response to keep state clean
                setSettings(updated);
                showBanner('تم حفظ الإعدادات بنجاح!', 'success');
                setTimeout(() => setSaveSuccess(false), 3000);
            } else {
                const err = await res.json().catch(() => ({}));
                showBanner(`خطأ: ${err.detail || 'فشل حفظ الإعدادات'}`, 'error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            showBanner('فشل الاتصال. هل الخادم يعمل؟', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <SkeletonDashboard />;

    if (!settings) {
        return (
            <div className="animate-fade-in py-20 text-center" dir="rtl">
                <AlertCircle className="mx-auto text-amber-400 mb-4" size={48} />
                <h2 className="text-xl font-bold text-slate-800 mb-2">لم يتم العثور على إعدادات الأكاديمية</h2>
                <p className="text-sm text-slate-500 mb-6">جاري إنشاء الإعدادات الافتراضية...</p>
                <button
                    onClick={() => { setIsLoading(true); fetchSettings(); }}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                >
                    إعادة المحاولة
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-20 text-right" dir="rtl">
            {/* Toast handled by global provider */}
            <div className="flex justify-between items-center mb-10 flex-row-reverse">
                <div className="text-right">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                        إعدادات <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">الأكاديمية</span>
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">الإعدادات العامة والهوية البصرية</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* General Information */}
                <GeneralBrandingSection
                    settings={settings}
                    handleInputChange={handleInputChange}
                    newCategoryInput={newCategoryInput}
                    setNewCategoryInput={setNewCategoryInput}
                    addAgeCategory={addAgeCategory}
                    removeAgeCategory={removeAgeCategory}
                    newTerrain={newTerrain}
                    setNewTerrain={setNewTerrain}
                    TERRAIN_SIZES={TERRAIN_SIZES}
                    addTerrain={addTerrain}
                    removeTerrain={removeTerrain}
                    newTournamentInput={newTournamentInput}
                    setNewTournamentInput={setNewTournamentInput}
                    DEFAULT_TOURNAMENTS={DEFAULT_TOURNAMENTS}
                    addTournament={addTournament}
                    addTournamentPreset={addTournamentPreset}
                    removeTournament={removeTournament}
                    primaryColor={primaryColor}
                    setPrimaryColor={setPrimaryColor}
                    secondaryColor={secondaryColor}
                    setSecondaryColor={setSecondaryColor}
                    uploadingLogo={uploadingLogo}
                    handleLogoUpload={handleLogoUpload}
                />

                {/* Right Column: Pricing, Landing Page Editor, Save */}
                <div className="space-y-8">
                    <FinancialPolicySection
                        settings={settings}
                        handleInputChange={handleInputChange}
                        setSettings={setSettings}
                    />

                    <div className="bg-white rounded-3xl p-6 border border-slate-200 premium-shadow">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${saveSuccess ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl'
                                }`}
                        >
                            {isSaving ? 'Saving...' : saveSuccess ? <><CheckCircle size={20} /> Changes Saved</> : <><Save size={20} /> Update Profile</>}
                        </button>
                    </div>

                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 border-dashed text-center">
                        <Globe className="mx-auto text-slate-300 mb-3" size={32} />
                        <h4 className="font-bold text-slate-800 text-sm mb-1">الصفحة الرئيسية العامة</h4>
                        <p className="text-[12px] text-slate-500 font-medium leading-relaxed">أي تغييرات تقوم بها هنا ستنعكس فوراً على واجهة الأكاديمية.</p>
                    </div>

                    <LandingPageEditorSection
                        settings={settings}
                        handleInputChange={handleInputChange}
                        aboutText={aboutText}
                        setAboutText={setAboutText}
                    />
                </div>
            </form>

            <MembershipPlansSection
                plans={plans}
                editingPlan={editingPlan}
                setEditingPlan={setEditingPlan}
                isCreatePlanOpen={isCreatePlanOpen}
                setIsCreatePlanOpen={setIsCreatePlanOpen}
                newPlanData={newPlanData}
                setNewPlanData={setNewPlanData}
                newFeatureInput={newFeatureInput}
                setNewFeatureInput={setNewFeatureInput}
                editFeatureInput={editFeatureInput}
                setEditFeatureInput={setEditFeatureInput}
                confirmDeletePlanId={confirmDeletePlanId}
                setConfirmDeletePlanId={setConfirmDeletePlanId}
                handleCreatePlan={handleCreatePlan}
                handleSaveEditPlan={handleSaveEditPlan}
                handleDeletePlan={handleDeletePlan}
                handleTogglePlan={handleTogglePlan}
                addFeatureTo={addFeatureTo}
                removeFeatureFrom={removeFeatureFrom}
                planColorMap={planColorMap}
            />

            <CouponsSection
                settings={settings}
                newCoupon={newCoupon}
                setNewCoupon={setNewCoupon}
                handleCreateCoupon={handleCreateCoupon}
                coupons={coupons}
                handleToggleCoupon={handleToggleCoupon}
                handleDeleteCoupon={handleDeleteCoupon}
            />

            <SecuritySection
                twoFA={twoFA}
                twoFAAction={twoFAAction}
                setTwoFAAction={setTwoFAAction}
                twoFASetup={twoFASetup}
                setTwoFASetup={setTwoFASetup}
                twoFACode={twoFACode}
                setTwoFACode={setTwoFACode}
                twoFASaving={twoFASaving}
                handle2FASetup={handle2FASetup}
                handle2FAEnable={handle2FAEnable}
                handle2FADisable={handle2FADisable}
                pwForm={pwForm}
                setPwForm={setPwForm}
                pwSaving={pwSaving}
                handleChangePassword={handleChangePassword}
            />

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onConfirm={confirmDeleteCoupon}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
                isRTL={false}
                title="Delete Coupon"
                message="Are you sure you want to delete this coupon? This cannot be undone."
            />
        </div>
    );
};

export default SettingsManagement;
