import { API_URL } from '../../config';
import { authFetch, logout } from '../../api';
import { impersonateUser } from '../../utils/impersonate';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Search,
    Plus,
    Trash2,
    Loader2,
    AlertCircle,
    Filter,
    Smartphone,
    Download,
    X,
    Edit2,
    Play,
    CheckCircle,
    Check,
    Clock,
    QrCode,
    Trophy,
    MapPin,
    Eye,
    User,
    Heart,
    CreditCard,
    Activity,
    LogIn,
    Key,
    Shirt,
    CheckCircle2
} from 'lucide-react';
import Swal from 'sweetalert2';
import PlayerBadgeModal from '../../components/PlayerBadgeModal';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import AttendanceHeatmap from '../../components/AttendanceHeatmap';
import MedicalCard from '../../components/MedicalCard';
import PaymentTimeline from '../../components/PaymentTimeline';

import PlayerProfileModal from './components/PlayerProfileModal';
import PlayerMatchesModal from './components/PlayerMatchesModal';
import PlayerModal from './components/PlayerModal';
import PendingRequestsTable from './components/PendingRequestsTable';
import PlayersTable from './components/PlayersTable';

const PlayersManagement = () => {
    const { t, isRTL, dir } = useLanguage();
    const navigate = useNavigate();
    const [players, setPlayers] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
    const [page, setPage] = useState(1);
    const [proOnly, setProOnly] = useState(false);

    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
    const [isMatchesModalOpen, setIsMatchesModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [resolvingRequestId, setResolvingRequestId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null, type: '' });
    const toast = useToast();

    useEffect(() => {
        return () => document.body.classList.remove('modal-open');
    }, []);

    useEffect(() => {
        setSelectedPlayerIds([]);
    }, [page, searchTerm, proOnly]);

    const [formData, setFormData] = useState({
        full_name: '', parent_name: '', parent_whatsapp: '', parent_email: '', birth_date: '', address: '',
        u_category: 'U11', technical_level: 'B', subscription_type: 'Monthly',
        discount_type: 'none', discount_value: '', account_status: 'Pending', photo_url: '',
        blood_type: '', medical_cert_valid_until: '', transport_zone: '', allergies: '', emergency_contact: ''
    });

    const [subscriptionPlans, setSubscriptionPlans] = useState([]);
    const [settings, setSettings] = useState(null);
    const [modalStep, setModalStep] = useState(1);
    const [branches, setBranches] = useState([]);

    const fetchPlayers = async () => {
        setLoading(true);
        setFetchError(null);

        // Players (critical)
        try {
            const res = await authFetch(`${API_URL}/players/`);
            if (res.ok) {
                const data = await res.json();
                setPlayers(Array.isArray(data) ? data : []);
            } else {
                if (res.status === 401) {
                    // Unauthorized – likely token expired; force logout
                    logout();
                }
                setFetchError(isRTL ? 'فشل تحميل اللاعبين من الخادم' : 'Failed to load players from server');
            }
        } catch {
            setFetchError(isRTL ? 'تعذر الاتصال بالخادم. تأكد من أن السيرفر شغال.' : 'Cannot connect to server. Make sure the backend is running on port 8000.');
        }

        // Plans (non-critical)
        try {
            const res = await authFetch(`${API_URL}/plans/`);
            if (res.ok) setSubscriptionPlans(await res.json());
        } catch { /* ignore */ }

        // Pending requests (non-critical)
        try {
            const res = await authFetch(`${API_URL}/public/admin/requests?request_status=active`);
            if (res.ok) setPendingRequests(await res.json() || []);
        } catch { /* ignore */ }

        // Settings (non-critical)
        try {
            const res = await authFetch(`${API_URL}/settings/`);
            if (res.ok) setSettings(await res.json());
        } catch { /* ignore */ }

        // Branches (non-critical)
        try {
            const res = await authFetch(`${API_URL}/branches/`);
            if (res.ok) setBranches(await res.json() || []);
        } catch { /* ignore */ }

        setLoading(false);
    };

    useEffect(() => {
        fetchPlayers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDelete = (userId) => {
        setConfirmDialog({ isOpen: true, id: userId, type: 'player' });
    };

    const confirmDeletePlayer = async () => {
        const userId = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null, type: '' });
        try {
            const res = await authFetch(`${API_URL}/players/${userId}`, { method: 'DELETE' });
            if (res.ok) setPlayers(players.filter(p => p.user_id !== userId));
        } catch (err) { showBanner(err.message, 'error'); }
    };

    const handleBulkStatusChange = async (newStatus) => {
        const result = await Swal.fire({
            title: isRTL ? 'تعديل حالة اللاعبين؟' : 'Change Status for Selected Players?',
            text: isRTL 
                ? `هل أنت متأكد من تغيير حالة اللاعبين المحددين (${selectedPlayerIds.length}) إلى: ${newStatus === 'Active' ? 'نشط' : 'مجمّد'}؟`
                : `Are you sure you want to change the status of ${selectedPlayerIds.length} selected players to ${newStatus}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: isRTL ? 'نعم، تغيير' : 'Yes, change',
            cancelButtonText: t('common.cancel'),
            confirmButtonColor: '#4f46e5'
        });
        if (!result.isConfirmed) return;

        setIsSubmitting(true);
        try {
            const promises = selectedPlayerIds.map(id => 
                authFetch(`${API_URL}/players/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ account_status: newStatus })
                })
            );
            const responses = await Promise.all(promises);
            const successfulIds = [];
            for (let i = 0; i < responses.length; i++) {
                if (responses[i].ok) {
                    successfulIds.push(selectedPlayerIds[i]);
                }
            }
            
            if (successfulIds.length > 0) {
                setPlayers(prev => prev.map(p => 
                    successfulIds.includes(p.user_id) ? { ...p, account_status: newStatus } : p
                ));
                showBanner(isRTL 
                    ? `تم تحديث ${successfulIds.length} لاعبين بنجاح!` 
                    : `Successfully updated ${successfulIds.length} players!`,
                    'success'
                );
                setSelectedPlayerIds([]);
            } else {
                showBanner(isRTL ? 'فشل تحديث حالة اللاعبين' : 'Failed to update players', 'error');
            }
        } catch (err) {
            showBanner(err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBulkDelete = async () => {
        const result = await Swal.fire({
            title: isRTL ? 'حذف اللاعبين المحددين؟' : 'Delete Selected Players?',
            text: isRTL 
                ? `هل أنت متأكد من حذف اللاعبين المحددين (${selectedPlayerIds.length}) نهائياً؟ هذا الإجراء لا يمكن التراجع عنه!`
                : `Are you sure you want to permanently delete ${selectedPlayerIds.length} selected players? This cannot be undone!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: isRTL ? 'نعم، حذف الكل' : 'Yes, delete all',
            cancelButtonText: t('common.cancel'),
            confirmButtonColor: '#ef4444'
        });
        if (!result.isConfirmed) return;

        setIsSubmitting(true);
        try {
            const promises = selectedPlayerIds.map(id => 
                authFetch(`${API_URL}/players/${id}`, { method: 'DELETE' })
            );
            const responses = await Promise.all(promises);
            const successfulIds = [];
            for (let i = 0; i < responses.length; i++) {
                if (responses[i].ok) {
                    successfulIds.push(selectedPlayerIds[i]);
                }
            }
            
            if (successfulIds.length > 0) {
                setPlayers(prev => prev.filter(p => !successfulIds.includes(p.user_id)));
                showBanner(isRTL 
                    ? `تم حذف ${successfulIds.length} لاعبين بنجاح!` 
                    : `Successfully deleted ${successfulIds.length} players!`,
                    'success'
                );
                setSelectedPlayerIds([]);
            } else {
                showBanner(isRTL ? 'فشل حذف اللاعبين المحددين' : 'Failed to delete selected players', 'error');
            }
        } catch (err) {
            showBanner(err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };



    // Compute U category from birth date based on football season
    // (season starts in September; player's age at season start determines U)
    const computeUCategory = (birthDateStr, ageCategories) => {
        if (!birthDateStr || !ageCategories?.length) return null;
        const birth = new Date(birthDateStr);
        if (isNaN(birth)) return null;
        const today = new Date();
        // If we're past July, season is the current calendar year, else previous
        const seasonYear = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
        const ageAtSeasonStart = seasonYear - birth.getFullYear();
        const targetU = `U${ageAtSeasonStart}`;
        // Prefer exact match; otherwise the first entry whose prefix matches (U11 -> "U11 A", "U11 ELITE")
        const exact = ageCategories.find(c => c.toUpperCase() === targetU);
        if (exact) return exact;
        const prefix = ageCategories.find(c =>
            c.toUpperCase() === targetU ||
            c.toUpperCase().startsWith(targetU + ' ') ||
            c.toUpperCase().startsWith(targetU + '-')
        );
        if (prefix) return prefix;
        if (ageAtSeasonStart >= 18) {
            const senior = ageCategories.find(c => c.toLowerCase().includes('senior'));
            if (senior) return senior;
        }
        return null;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            if (name === 'birth_date' && value) {
                const auto = computeUCategory(value, settings?.age_categories);
                if (auto) newData.u_category = auto;
            }
            return newData;
        });
    };

    const showBanner = (message, type = 'success') => {
        if (type === 'error') toast.error(message);
        else toast.success(message);
    };

    const openAddModal = () => {
        setFormData({
            full_name: '', parent_name: '', parent_whatsapp: '', parent_email: '', birth_date: '', address: '',
            u_category: settings?.age_categories?.[0] || 'U11', technical_level: 'B',
            subscription_type: 'Monthly', discount_type: 'none', discount_value: '',
            account_status: 'Pending', photo_url: '',
            blood_type: '', medical_cert_valid_until: '', transport_zone: '', allergies: '', emergency_contact: '',
            branch_id: ''
        });
        setResolvingRequestId(null); setModalStep(1); setIsAddModalOpen(true);
    };

    const reviewRequest = (req) => {
        setFormData({
            full_name: req.player_name || '', parent_name: req.name || '', parent_whatsapp: req.phone || '',
            parent_email: req.email || '', birth_date: req.birth_date || '', address: req.address || '',
            u_category: settings?.age_categories?.[0] || 'U11', technical_level: 'B',
            subscription_type: req.plan_name || 'Monthly', discount_type: 'none', discount_value: '',
            account_status: 'Pending', photo_url: '',
            blood_type: '', medical_cert_valid_until: '', transport_zone: '', allergies: '', emergency_contact: '',
            branch_id: ''
        });
        setResolvingRequestId(req.id); setModalStep(1); setIsAddModalOpen(true);
    };

    const openEditModal = (player) => {
        setCurrentPlayer(player);
        setFormData({ ...player, discount_type: player.discount_type || 'none' });
        setModalStep(1); setIsEditModalOpen(true);
    };

    const openMatchesModal = (player) => {
        setCurrentPlayer(player);
        setIsMatchesModalOpen(true);
    };

    const openProfileModal = (player) => {
        setCurrentPlayer(player);
        setIsProfileModalOpen(true);
    };

    const handleAddSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            const payload = {
                ...data, user_id: generateUUID(),
                discount_type: data.discount_type === 'none' ? null : data.discount_type,
                discount_value: data.discount_value === '' || data.discount_value === null || data.discount_value === undefined ? null : parseFloat(data.discount_value),
                birth_date: data.birth_date || null,
                medical_cert_valid_until: data.medical_cert_valid_until || null,
                blood_type: data.blood_type || null,
                transport_zone: data.transport_zone || null,
                allergies: data.allergies || null,
                emergency_contact: data.emergency_contact || null,
                parent_email: data.parent_email || null
            };
            const res = await authFetch(`${API_URL}/players/`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (res.ok) {
                const responseData = await res.json();
                setPlayers([responseData, ...players]);
                setIsAddModalOpen(false); setModalStep(1);

                // ─── Auto-add player to the chat group of their U category ──
                try {
                    const grpRes = await authFetch(`${API_URL}/chat/groups`);
                    if (grpRes.ok) {
                        const groups = await grpRes.json();
                        const target = (groups || []).find(g =>
                            g.category && g.category.toUpperCase() === (responseData.u_category || '').toUpperCase()
                        );
                        if (target) {
                            await authFetch(`${API_URL}/chat/groups/${target.id}/add_member`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    user_id: responseData.user_id,
                                    user_name: responseData.full_name,
                                    user_role: 'player',
                                    is_moderator: false,
                                }),
                            });
                        }
                    }
                } catch (chatErr) {
                    console.warn('Auto-add to chat group failed:', chatErr);
                }

                // Show prominent success confirmation using SweetAlert2
                if (responseData.temp_password && responseData.parent_email) {
                    Swal.fire({
                        title: isRTL ? '✅ تم التسجيل + حساب الأب!' : '✅ Registered + Parent Account!',
                        html: `
                            <div style="text-align:${isRTL ? 'right' : 'left'};direction:${isRTL ? 'rtl' : 'ltr'}">
                                <p style="font-weight:700;color:#334155;margin-bottom:12px">${isRTL ? `تم تسجيل اللاعب <b>${responseData.full_name}</b> بنجاح.` : `Player <b>${responseData.full_name}</b> registered successfully.`}</p>
                                <div style="background:linear-gradient(135deg,#eef2ff,#e0e7ff);border-radius:16px;padding:16px;border:1px solid #c7d2fe">
                                    <p style="font-size:11px;font-weight:900;color:#6366f1;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${isRTL ? '🔐 بيانات دخول ولي الأمر' : '🔐 Parent Login Credentials'}</p>
                                    <div style="background:#fff;border-radius:12px;padding:12px;font-family:monospace;font-size:14px;font-weight:700;color:#1e293b;border:1px solid #e2e8f0">
                                        <div style="margin-bottom:6px"><span style="color:#64748b;font-size:11px;font-family:sans-serif">${isRTL ? 'الإيميل:' : 'Email:'}</span><br/>${responseData.parent_email}</div>
                                        <div><span style="color:#64748b;font-size:11px;font-family:sans-serif">${isRTL ? 'كلمة السر:' : 'Password:'}</span><br/>${responseData.temp_password}</div>
                                    </div>
                                    <p style="font-size:10px;color:#f59e0b;font-weight:700;margin-top:8px">⚠️ ${isRTL ? 'أرسل هاد المعلومات للأب عبر WhatsApp!' : 'Send these credentials to the parent via WhatsApp!'}</p>
                                </div>
                            </div>
                        `,
                        icon: 'success',
                        confirmButtonText: isRTL ? '📋 نسخ المعلومات' : '📋 Copy Credentials',
                        showCancelButton: true,
                        cancelButtonText: isRTL ? 'إغلاق' : 'Close',
                        confirmButtonColor: '#4f46e5',
                        background: '#ffffff',
                        customClass: {
                            popup: 'rounded-3xl shadow-2xl border border-slate-100',
                            title: 'font-black text-slate-800 text-xl',
                            confirmButton: 'px-8 py-3.5 rounded-2xl font-black tracking-widest uppercase text-sm'
                        }
                    }).then((result) => {
                        if (result.isConfirmed) {
                            const text = `${isRTL ? 'بيانات الدخول للتطبيق' : 'App Login Credentials'}:\nEmail: ${responseData.parent_email}\nPassword: ${responseData.temp_password}`;
                            navigator.clipboard.writeText(text).then(() => {
                                toast.success(isRTL ? 'تم النسخ!' : 'Copied!');
                            }).catch(() => {
                                window.prompt(isRTL ? 'انسخ هاد المعلومات:' : 'Copy these credentials:', text);
                            });
                        }
                    });
                } else if (responseData.parent_email && responseData.is_new_parent === false) {
                    Swal.fire({
                        title: isRTL ? '✅ تم التسجيل والربط!' : '✅ Registered & Linked!',
                        text: isRTL ? `تم تسجيل اللاعب ${responseData.full_name} بنجاح وتم ربطه بحساب ولي الأمر الموجود مسبقاً (${responseData.parent_email}).` : `Player ${responseData.full_name} registered successfully and linked to existing parent account (${responseData.parent_email}).`,
                        icon: 'success',
                        confirmButtonText: isRTL ? 'حسناً' : 'OK',
                        confirmButtonColor: '#4f46e5',
                        background: '#ffffff',
                        customClass: {
                            popup: 'rounded-3xl shadow-2xl border border-slate-100',
                            title: 'font-black text-slate-800 text-xl',
                            confirmButton: 'px-8 py-3.5 rounded-2xl font-black tracking-widest uppercase text-sm'
                        }
                    });
                } else {
                    Swal.fire({
                        title: isRTL ? 'نجاح!' : 'Success!',
                        text: isRTL ? `تم تسجيل اللاعب ${responseData.full_name} بنجاح.` : `Player ${responseData.full_name} registered successfully.`,
                        icon: 'success',
                        confirmButtonText: isRTL ? 'تأكيد' : 'OK',
                        confirmButtonColor: '#4f46e5',
                        background: '#ffffff',
                        customClass: {
                            popup: 'rounded-3xl shadow-2xl border border-slate-100',
                            title: 'font-black text-slate-800 text-2xl',
                            htmlContainer: 'font-bold text-slate-500 mb-4',
                            confirmButton: 'px-8 py-3.5 rounded-2xl font-black tracking-widest uppercase text-sm'
                        }
                    });
                }

                if (resolvingRequestId) {
                    try {
                        await authFetch(`${API_URL}/public/admin/requests/${resolvingRequestId}`,
                            { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) });
                        setPendingRequests(prev => prev.filter(r => r.id !== resolvingRequestId));
                    } catch { setPendingRequests(prev => prev.filter(r => r.id !== resolvingRequestId)); }
                }
            } else {
                const errData = await res.json();
                let errorMsg = isRTL ? 'فشل في إضافة اللاعب' : 'Failed to add player';
                if (Array.isArray(errData.detail)) errorMsg = errData.detail.map(e => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join('\n');
                else if (errData.detail) errorMsg = errData.detail;
                showBanner(`${isRTL ? 'خطأ' : 'Error'}: ${errorMsg}`, 'error');
            }
        } catch (err) {
            showBanner((isRTL ? 'فشل الاتصال بالخادم: ' : 'Server connection failed: ') + err.message, 'error');
        } finally { setIsSubmitting(false); }
    };

    const handleEditSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            const payload = {
                ...data,
                discount_type: data.discount_type === 'none' ? null : data.discount_type,
                discount_value: data.discount_value === '' || data.discount_value === null || data.discount_value === undefined ? null : parseFloat(data.discount_value),
                birth_date: data.birth_date || null,
                medical_cert_valid_until: data.medical_cert_valid_until || null,
                blood_type: data.blood_type || null,
                transport_zone: data.transport_zone || null,
                allergies: data.allergies || null,
                emergency_contact: data.emergency_contact || null
            };
            const res = await authFetch(`${API_URL}/players/${currentPlayer.user_id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (res.ok) {
                const updatedData = await res.json();
                setPlayers(players.map(p => p.user_id === updatedData.user_id ? updatedData : p));
                setIsEditModalOpen(false); setModalStep(1);
                showBanner(isRTL ? 'تم تحديث البيانات بنجاح!' : 'Data updated successfully!', 'success');
            } else {
                const errData = await res.json();
                let errorMsg = isRTL ? 'فشل في التعديل' : 'Failed to edit';
                if (Array.isArray(errData.detail)) errorMsg = errData.detail.map(e => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join('\n');
                else if (errData.detail) errorMsg = errData.detail;
                showBanner(`${isRTL ? 'خطأ' : 'Error'}: ${errorMsg}`, 'error');
            }
        } catch (err) {
            showBanner((isRTL ? 'فشل الاتصال بالخادم: ' : 'Server connection failed: ') + err.message, 'error');
        } finally { setIsSubmitting(false); }
    };

    const updateRequestStatus = async (id, newStatus) => {
        try {
            const res = await authFetch(`${API_URL}/public/admin/requests/${id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                setPendingRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
                showBanner(isRTL ? 'تم تحديث حالة الطلب' : 'Request status updated', 'success');
            } else {
                showBanner(isRTL ? 'فشل تحديث الطلب' : 'Failed to update request', 'error');
            }
        } catch (err) { showBanner(err.message, 'error'); }
    };

    const deleteRequest = (id) => {
        setConfirmDialog({ isOpen: true, id, type: 'request' });
    };

    const confirmDeleteRequest = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null, type: '' });
        try {
            const res = await authFetch(`${API_URL}/public/admin/requests/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setPendingRequests(prev => prev.filter(r => r.id !== id));
                showBanner(isRTL ? 'تم الحذف بنجاح' : 'Deleted successfully', 'success');
            } else {
                showBanner(isRTL ? 'فشل حذف الطلب' : 'Failed to delete request', 'error');
            }
        } catch (err) { showBanner(err.message, 'error'); }
    };

    const PAGE_SIZE = 20;
    const proCount = players.filter(p => p.technical_level === 'A').length;
    const filteredPlayers = players.filter(p => {
        const matchesSearch = p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.parent_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesPro = !proOnly || p.technical_level === 'A';
        return matchesSearch && matchesPro;
    });
    const totalPages = Math.ceil(filteredPlayers.length / PAGE_SIZE);
    const pagedPlayers = filteredPlayers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className={`animate-fade-in ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Header */}
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        {t('players.title').split(' ')[0]} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{t('players.title').split(' ').slice(1).join(' ')}</span>
                        <span className="bg-indigo-600 text-white text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest">{players.length} {t('common.total')}</span>
                        {proCount > 0 && (
                            <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900 text-[10px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest shadow-lg shadow-amber-500/30 border border-amber-300">
                                <Trophy size={11} fill="currentColor" />
                                {proCount} PRO
                            </span>
                        )}
                    </h1>
                </div>
                <div className={`flex items-center gap-3 w-full md:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <button onClick={openAddModal} className={`flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:-translate-y-1 transition-all active:scale-95 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Plus size={18} />
                        <span>{t('players.addPlayer')}</span>
                    </button>
                    <button className={`flex-1 md:flex-none flex items-center justify-center gap-2 bg-white text-slate-400 border border-slate-200 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:text-slate-600 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Download size={18} />
                        <span className="hidden sm:inline">{t('common.export')}</span>
                    </button>
                </div>
            </div>

            {/* Toast notifications handled by global Toast provider */}

            {/* Pending Requests */}
            <PendingRequestsTable
                pendingRequests={pendingRequests}
                isRTL={isRTL}
                dir={dir}
                t={t}
                reviewRequest={reviewRequest}
                updateRequestStatus={updateRequestStatus}
                deleteRequest={deleteRequest}
            />

            {/* Players Table */}
            <PlayersTable
                isRTL={isRTL}
                dir={dir}
                t={t}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                proOnly={proOnly}
                setProOnly={setProOnly}
                proCount={proCount}
                fetchError={fetchError}
                loading={loading}
                players={filteredPlayers}
                openAddModal={openAddModal}
                fetchPlayers={fetchPlayers}
                openProfileModal={openProfileModal}
                openMatchesModal={openMatchesModal}
                setCurrentPlayer={setCurrentPlayer}
                setIsBadgeModalOpen={setIsBadgeModalOpen}
                openEditModal={openEditModal}
                handleDelete={handleDelete}
                navigate={navigate}
                selectedPlayerIds={selectedPlayerIds}
                setSelectedPlayerIds={setSelectedPlayerIds}
            />

            {/* Floating Bulk Actions Bar */}
            {selectedPlayerIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 z-50 animate-slide-up border border-slate-800">
                    <div className="flex items-center gap-2 border-r border-slate-800 pr-6">
                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                            {isRTL ? `تم تحديد ${selectedPlayerIds.length}` : `${selectedPlayerIds.length} Selected`}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleBulkStatusChange('Active')}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                        >
                            {isRTL ? 'تفعيل' : 'Activate'}
                        </button>
                        <button
                            onClick={() => handleBulkStatusChange('Suspended')}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                        >
                            {isRTL ? 'تجميد' : 'Suspend'}
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                        >
                            {isRTL ? 'حذف' : 'Delete'}
                        </button>
                        <button
                            onClick={() => setSelectedPlayerIds([])}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                            title={isRTL ? 'إلغاء التحديد' : 'Deselect All'}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <PlayerModal
                isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleAddSubmit} title={t('players.addPlayer')} isEdit={false}
                modalStep={modalStep} setModalStep={setModalStep} formData={formData}
                handleInputChange={handleInputChange} subscriptionPlans={subscriptionPlans}
                isSubmitting={isSubmitting} settings={settings} t={t} isRTL={isRTL} dir={dir}
                branches={branches}
            />
            {isEditModalOpen && (
                <PlayerModal
                    isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}
                    onSubmit={handleEditSubmit} title={t('players.editPlayer')} isEdit={true}
                    modalStep={modalStep} setModalStep={setModalStep} formData={formData}
                    handleInputChange={handleInputChange} subscriptionPlans={subscriptionPlans}
                    isSubmitting={isSubmitting} settings={settings} t={t} isRTL={isRTL} dir={dir}
                    branches={branches}
                />
            )}
            <PlayerBadgeModal player={currentPlayer} isOpen={isBadgeModalOpen} onClose={() => setIsBadgeModalOpen(false)} academyName={settings?.academy_name} academyLogo={settings?.logo_url} branchName={currentPlayer?.branch_id ? branches.find(b => b.id === currentPlayer.branch_id)?.name : null} />
            <PlayerMatchesModal player={currentPlayer} isOpen={isMatchesModalOpen} onClose={() => setIsMatchesModalOpen(false)} t={t} isRTL={isRTL} dir={dir} />
            <PlayerProfileModal player={currentPlayer} isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} isRTL={isRTL} dir={dir} />

            <ConfirmDialog
                isOpen={confirmDialog.isOpen && confirmDialog.type === 'player'}
                onConfirm={confirmDeletePlayer}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null, type: '' })}
                isRTL={isRTL}
                title={isRTL ? 'حذف اللاعب' : 'Delete Player'}
                message={isRTL ? 'هل أنت متأكد من حذف هذا اللاعب نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.' : 'Are you sure you want to permanently delete this player? This cannot be undone.'}
            />
            <ConfirmDialog
                isOpen={confirmDialog.isOpen && confirmDialog.type === 'request'}
                onConfirm={confirmDeleteRequest}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null, type: '' })}
                isRTL={isRTL}
                title={isRTL ? 'حذف الطلب' : 'Delete Request'}
                message={isRTL ? 'هل أنت متأكد من حذف هذا الطلب نهائياً؟' : 'Are you sure you want to permanently delete this request?'}
            />
        </div>
    );
};

export default PlayersManagement;
