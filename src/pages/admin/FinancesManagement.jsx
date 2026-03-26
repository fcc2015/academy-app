import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    DollarSign,
    CreditCard,
    TrendingUp,
    Search,
    PlusCircle,
    Monitor,
    MoreVertical,
    CheckCircle,
    Clock,
    Smartphone,
    Trash2,
    Edit2,
    X,
    Filter,
    Check,
    Receipt,
    RefreshCw,
    BellRing,
    MinusCircle,
    Tag,
    FileText,
    Activity
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';


const FinancesManagement = () => {
    const location = useLocation();
    const { t, isRTL, dir } = useLanguage();
    const [payments, setPayments] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [players, setPlayers] = useState([]);
    const [activeTab, setActiveTab] = useState('revenues'); // 'revenues' or 'expenses'
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [academySettings, setAcademySettings] = useState(null);
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');
    const [amountBreakdown, setAmountBreakdown] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [alertHistory, setAlertHistory] = useState([]);
    const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);
    const [statusBanner, setStatusBanner] = useState({ show: false, message: '', type: 'success', id: 0 });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null, type: '' });

    const showBanner = (message, type = 'success') => {
        const id = Date.now();
        setStatusBanner({ show: true, message, type, id });
        setTimeout(() => setStatusBanner(prev => prev.id === id ? { ...prev, show: false } : prev), 5000);
    };

    // Form State
    const [formData, setFormData] = useState({
        user_id: '',
        amount: '',
        payment_method: 'Cash',
        status: 'Completed',
        notes: ''
    });
    const [expenseFormData, setExpenseFormData] = useState({
        amount: '',
        category: 'Équipement',
        description: '',
        expense_date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
        if (location.state?.timestamp) {
            // Short delay to ensure DOM is ready before scrolling
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        }
    }, [location.state?.timestamp]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [paymentsRes, playersRes, settingsRes, expensesRes] = await Promise.all([
                fetch(`${API_URL}/finances/payments`),
                fetch(`${API_URL}/players/`),
                fetch(`${API_URL}/settings/`),
                fetch(`${API_URL}/finances/expenses`)
            ]);
            
            if (paymentsRes.ok) setPayments(await paymentsRes.json() || []);
            if (playersRes.ok) setPlayers(await playersRes.json() || []);
            if (settingsRes.ok) setAcademySettings(await settingsRes.json());
            if (expensesRes.ok) setExpenses(await expensesRes.json() || []);
        } catch (err) {
            console.error('Error fetching finances data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const calculateAmount = () => {
        if (!formData.user_id || !academySettings || isEditMode) return;
        const player = players.find(p => p.user_id === formData.user_id);
        if (!player) return;

        let basePrice = 0;
        let breakdown = [];

        if (player.subscription_type === 'Free') {
            basePrice = 0; breakdown.push({ label: 'اشتراك مجاني (دعم)', value: 0 });
        } else {
            const plan = academySettings.subscription_plans?.find(p => p.name === player.subscription_type);
            basePrice = plan?.monthly_price || academySettings.monthly_subscription || 0;
            breakdown.push({ label: `سعر العرض الأساسي (${player.subscription_type})`, value: basePrice });
        }

        let currentTotal = basePrice;

        // Pro-Rata adjustment
        if (academySettings.enable_prorata && player.subscription_type !== 'Annual' && player.subscription_type !== 'Free') {
            const today = new Date();
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const remainingDays = daysInMonth - today.getDate() + 1;
            const proratedAmount = (basePrice / daysInMonth) * remainingDays;
            if (remainingDays < daysInMonth) {
                const deduction = basePrice - proratedAmount;
                currentTotal -= deduction;
                breakdown.push({ label: 'تعديل تناسبي (Pro-Rata)', value: -deduction, isDeduction: true });
            }
        }

        // Apply Player Personal Discount
        if (player.discount_type && player.discount_type !== 'none' && player.subscription_type !== 'Free') {
            let discountVal = player.discount_type === 'percentage' ? currentTotal * (player.discount_value / 100) : player.discount_value;
            if (discountVal > 0) {
                currentTotal -= discountVal;
                breakdown.push({ label: 'خصم خاص باللاعب', value: -discountVal, isDeduction: true });
            }
        }

        // Apply Coupon
        if (appliedCoupon && currentTotal > 0) {
            let couponDiscountVal = appliedCoupon.discount_type === 'percentage' ? currentTotal * (appliedCoupon.discount_value / 100) : appliedCoupon.discount_value;
            if (couponDiscountVal > 0) {
                currentTotal -= couponDiscountVal;
                breakdown.push({ label: `كوبون (${appliedCoupon.code})`, value: -couponDiscountVal, isDeduction: true });
            }
        }

        currentTotal = Math.max(0, currentTotal);
        setAmountBreakdown({ originalBase: basePrice, lines: breakdown, finalAmount: currentTotal });
        setFormData(prev => ({ ...prev, amount: currentTotal.toFixed(2) }));
    };

    useEffect(() => {
        calculateAmount();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.user_id, appliedCoupon, academySettings, isEditMode]);

    const handleApplyCoupon = async () => {
        if (!couponCodeInput.trim()) return;
        setCouponError('');
        try {
            const res = await fetch(`${API_URL}/coupons/validate/${couponCodeInput.trim()}`);
            if (!res.ok) throw new Error('الرمز غير صالح');
            setAppliedCoupon(await res.json());
            setCouponCodeInput('');
        } catch (err) {
            setCouponError(err.message);
            setAppliedCoupon(null);
        }
    };

    const handleRemoveCoupon = () => { setAppliedCoupon(null); setCouponCodeInput(''); };

    const handleAddClick = () => {
        setFormData({ user_id: '', amount: '', payment_method: 'Cash', status: 'Completed', notes: '' });
        setEditingId(null); setIsEditMode(false); setAppliedCoupon(null); setCouponCodeInput(''); setAmountBreakdown(null); setIsAddModalOpen(true);
    };

    const handleEditClick = (payment) => {
        setFormData({
            user_id: payment.user_id || payment.users?.id || '',
            amount: payment.amount || '',
            payment_method: payment.payment_method || 'Cash',
            status: payment.status || 'Completed',
            notes: payment.notes || ''
        });
        setEditingId(payment.id); setIsEditMode(true); setAppliedCoupon(null); setCouponCodeInput(''); setAmountBreakdown(null); setIsAddModalOpen(true);
    };

    const handleQuickPay = async (payment) => {
        setConfirmDialog({ isOpen: true, id: payment.id, type: 'quickpay', data: payment });
    };

    const doQuickPay = async (payment) => {
        try {
            const payload = { ...payment, status: 'Completed', payment_date: new Date().toISOString() };
            const { users, players, ...cleanPayload } = payload;
            const _unusedUsers = users;
            const _unusedPlayers = players;
            const res = await fetch(`${API_URL}/finances/payments/${payment.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanPayload)
            });
            if (res.ok) { fetchData(); showBanner('تم تأكيد الاستلام بنجاح!', 'success'); }
            else { showBanner('فشل تأكيد الاستلام', 'error'); }
        } catch { showBanner('خطأ في الاتصال بالخادم', 'error'); }
    };

    const handleSubmitPayment = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                user_id: formData.user_id,
                amount: parseFloat(formData.amount),
                payment_method: formData.payment_method,
                status: formData.status,
                notes: formData.notes
            };
            const res = await fetch(isEditMode ? `${API_URL}/finances/payments/${editingId}` : `${API_URL}/finances/payments`, {
                method: isEditMode ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to save');
            setIsAddModalOpen(false);
            fetchData();
            showBanner(isEditMode ? 'تم تحديث البيانات بنجاح!' : 'تم حفظ الدفعة بنجاح!', 'success');
        } catch { showBanner('خطأ في الحفظ', 'error'); }
    };

    const handleDeletePayment = (paymentId) => {
        setConfirmDialog({ isOpen: true, id: paymentId, type: 'payment' });
    };

    const confirmDeletePayment = async () => {
        const paymentId = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null, type: '' });
        try {
            const res = await fetch(`${API_URL}/finances/payments/${paymentId}`, { method: 'DELETE' });
            if (res.ok) { setPayments(prev => prev.filter(p => p.id !== paymentId)); showBanner('تم الحذف بنجاح', 'success'); }
        } catch { showBanner('خطأ في الحذف', 'error'); }
    };

    const runAlertCheck = async () => {
        setIsCheckingAlerts(true);
        try {
            const res = await fetch(`${API_URL}/finances/alert-check`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setAlertHistory(data.details || []);
                showBanner(`تم الانتهاء! تم إرسال ${data.alerts_sent} تنبيهات بنجاح.`, 'success');
            }
        } catch {
            showBanner('فشل فحص التنبيهات', 'error');
        } finally {
            setIsCheckingAlerts(false);
        }
    };

    const handleExpenseChange = (e) => {
        const { name, value } = e.target;
        setExpenseFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddExpenseClick = () => {
        setExpenseFormData({ amount: '', category: 'Équipement', description: '', expense_date: new Date().toISOString().split('T')[0] });
        setEditingExpenseId(null);
        setIsExpenseModalOpen(true);
    };

    const handleEditExpenseClick = (exp) => {
        setExpenseFormData({ amount: exp.amount, category: exp.category, description: exp.description || '', expense_date: exp.expense_date || new Date().toISOString().split('T')[0] });
        setEditingExpenseId(exp.id);
        setIsExpenseModalOpen(true);
    };

    const handleSubmitExpense = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(editingExpenseId ? `${API_URL}/finances/expenses/${editingExpenseId}` : `${API_URL}/finances/expenses`, {
                method: editingExpenseId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...expenseFormData, amount: parseFloat(expenseFormData.amount) })
            });
            if (!res.ok) throw new Error('Failed to save expense');
            setIsExpenseModalOpen(false);
            fetchData();
            showBanner(editingExpenseId ? 'تم تحديث المصروف بنجاح' : 'تم إضافة المصروف بنجاح', 'success');
        } catch { showBanner('خطأ في الحفظ', 'error'); }
    };

    const handleDeleteExpense = (id) => {
        setConfirmDialog({ isOpen: true, id, type: 'expense' });
    };

    const confirmDeleteExpense = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null, type: '' });
        try {
            const res = await fetch(`${API_URL}/finances/expenses/${id}`, { method: 'DELETE' });
            if (res.ok) { setExpenses(prev => prev.filter(e => e.id !== id)); showBanner('تم حذف المصروف بنجاح', 'success'); }
        } catch { showBanner('خطأ في الحذف', 'error'); }
    };

    const filteredPayments = payments.filter(p => 
        p.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredExpenses = expenses.filter(e => 
        e.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalRevenue = payments.reduce((sum, p) => (p.status === 'Completed' || p.status === 'paid') ? sum + Number(p.amount) : sum, 0);
    const pendingAmount = payments.reduce((sum, p) => (p.status === 'Pending' || p.status === 'pending') ? sum + Number(p.amount) : sum, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    return (
        <div className={`animate-fade-in pb-10 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Status Banner */}
            {statusBanner.show && (
                <div key={statusBanner.id} className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-fade-in">
                    <div className={`flex items-center gap-4 px-8 py-4 rounded-[2rem] shadow-2xl border-2 backdrop-blur-md ${statusBanner.type === 'success' ? 'bg-emerald-600/90 border-emerald-400 text-white' : 'bg-red-600/90 border-red-400 text-white'}`}>
                        {statusBanner.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                        <span className="font-black text-base" dir="ltr">{statusBanner.message}</span>
                        <button onClick={() => setStatusBanner({ ...statusBanner, show: false })} className="ml-4 hover:bg-white/20 p-1 rounded-full"><X size={16} /></button>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 py-1 leading-tight">
                        {t('finances.title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">{t('finances.subtitle')}</span>
                    </h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">{t('finances.description')}</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button
                        onClick={activeTab === 'revenues' ? handleAddClick : handleAddExpenseClick}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                        <PlusCircle size={20} />
                        <span>{activeTab === 'revenues' ? t('finances.newPayment') : 'مصروف جديد'}</span>
                    </button>
                    <button
                        onClick={runAlertCheck}
                        disabled={isCheckingAlerts}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-white border border-slate-200 text-indigo-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        title={t('finances.alertCheck')}
                    >
                        <RefreshCw size={18} className={isCheckingAlerts ? 'animate-spin' : ''} />
                        <span>{t('finances.alertCheck')}</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className={`bg-white p-6 rounded-[2rem] border border-slate-200 premium-shadow relative overflow-hidden group hover:border-emerald-400 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="absolute top-0 left-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 group-hover:scale-110">
                        <DollarSign size={80} />
                    </div>
                    <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                            <TrendingUp size={20} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">
                            {totalRevenue.toLocaleString()} درهم
                        </h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('finances.totalRevenue')}</p>
                    </div>
                </div>

                <div className={`bg-white p-6 rounded-[2rem] border border-slate-200 premium-shadow relative overflow-hidden group hover:border-amber-400 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="absolute top-0 left-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 group-hover:scale-110">
                        <Clock size={80} />
                    </div>
                    <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">
                            <Clock size={20} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">
                            {pendingAmount.toLocaleString()} درهم
                        </h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('finances.pendingAmount')}</p>
                    </div>
                </div>

                <div className={`bg-white p-6 rounded-[2rem] border border-slate-200 premium-shadow relative overflow-hidden group hover:border-red-400 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="absolute top-0 left-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 group-hover:scale-110">
                        <MinusCircle size={80} />
                    </div>
                    <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 rounded-2xl bg-red-50 text-red-600 border border-red-100 shadow-sm">
                            <MinusCircle size={20} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">
                            {totalExpenses.toLocaleString()} درهم
                        </h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">المصاريف</p>
                    </div>
                </div>

                <div className={`bg-emerald-900 p-6 rounded-[2rem] border border-emerald-800 shadow-2xl relative overflow-hidden group hover:border-emerald-500 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-[80px] opacity-20"></div>
                    <div className={`flex items-center justify-between mb-4 relative z-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 rounded-2xl bg-emerald-800/50 text-emerald-300 border border-emerald-700 shadow-sm">
                            <Activity size={20} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-2xl font-black text-white tracking-tighter mb-1">
                            {netProfit.toLocaleString()} درهم
                        </h4>
                        <p className="text-[10px] font-black text-emerald-300/70 uppercase tracking-[0.2em]">الربح الصافي</p>
                    </div>
                </div>
            </div>

            {/* Main Tabs */}
            <div className={`flex gap-4 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                    onClick={() => setActiveTab('revenues')}
                    className={`px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center gap-2 ${
                        activeTab === 'revenues' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    <DollarSign size={16} /> المداخيل (Revenus)
                </button>
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center gap-2 ${
                        activeTab === 'expenses' ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    <MinusCircle size={16} /> المصاريف (Dépenses)
                </button>
            </div>

            {/* Transactions & Expenses Tables */}
            {activeTab === 'revenues' && (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden border-b-8 border-b-slate-900 animate-fade-in">
                    <div className={`px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h3 className={`font-extrabold text-slate-800 text-lg flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Monitor size={20} className="text-emerald-500" /> {t('finances.recentTransactions')}
                    </h3>

                    <div className={`relative w-full sm:w-80`}>
                        <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={18} />
                        <input
                            type="text"
                            placeholder={t('finances.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-sm`}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} border-collapse`} dir={dir}>
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                                <th className="px-8 py-6">{t('finances.playerInfo')}</th>
                                <th className="px-8 py-6">{t('common.amount')}</th>
                                <th className="px-8 py-6">{t('finances.method')}</th>
                                <th className="px-8 py-6">{t('common.date')}</th>
                                <th className="px-8 py-6 text-center">{t('finances.paymentStatus')}</th>
                                <th className="px-8 py-6">{t('finances.control')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">جاري الدخول للأرشيف المالي...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs opacity-50">
                                        لا توجد تسجيلات تطابق البحث
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4 flex-row-reverse text-right">
                                                <div className="text-right">
                                                    <div className="font-extrabold text-slate-900 text-[15px] tracking-tight mb-1">
                                                        {payment.users?.full_name || 'منخرط غير معروف'}
                                                    </div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        {payment.notes || 'بدون ملاحظات'}
                                                    </div>
                                                </div>
                                                {payment.users?.parent_whatsapp && (
                                                    <a 
                                                        href={`https://wa.me/${payment.users.parent_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`أكاديمية أثليتيك: بخصوص أداء مبلغ ${payment.amount} درهم.`)}`} 
                                                        target="_blank" rel="noreferrer"
                                                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all shadow-sm group-hover:scale-110 active:scale-95"
                                                        title="تواصل عبر واتساب"
                                                    >
                                                        <Smartphone size={16} />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-black text-slate-900 text-lg tracking-tighter">{payment.amount} درهم</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-tighter">
                                                {payment.payment_method === 'Cash' ? 'نقداً' : payment.payment_method === 'Card' ? 'بطاقة' : 'تحويل'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-[11px] font-extrabold text-slate-500">
                                                {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('ar-MA') : '—'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            {payment.status === 'Completed' || payment.status === 'paid' ? (
                                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-black border border-emerald-100 uppercase tracking-tighter text-[10px] flex-row-reverse shadow-sm">
                                                    <CheckCircle size={12} /> تم التحصيل
                                                </span>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-700 font-black border border-amber-100 uppercase tracking-tighter text-[10px] flex-row-reverse">
                                                        <Clock size={12} /> قيد المراجعة
                                                    </span>
                                                    <div className="flex gap-2 w-full justify-center">
                                                        <button 
                                                            onClick={() => handleQuickPay(payment)}
                                                            className="flex-1 px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 text-[10px] font-bold"
                                                            title="تأكيد الاستلام"
                                                        >
                                                            <Check size={14} /> تأكيد
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeletePayment(payment.id)}
                                                            className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-all shadow-sm active:scale-95 flex items-center justify-center text-[10px] font-bold"
                                                            title="رفض"
                                                        >
                                                            <X size={14} /> رفض
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-left">
                                            <div className="flex justify-start gap-1">
                                                <button onClick={() => handleEditClick(payment)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-slate-100/50 rounded-xl transition-all"><Edit2 size={18} /></button>
                                                <button onClick={() => handleDeletePayment(payment.id)} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {activeTab === 'expenses' && (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden border-b-8 border-b-red-600 animate-fade-in">
                    <div className={`px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-red-50/30 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <h3 className={`font-extrabold text-red-800 text-lg flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <MinusCircle size={20} className="text-red-500" /> المصاريف المسجلة
                        </h3>

                        <div className={`relative w-full sm:w-80`}>
                            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={18} />
                            <input
                                type="text"
                                placeholder={t('finances.searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-red-500/10 outline-none transition-all shadow-sm`}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto min-h-[400px]">
                        <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} border-collapse`} dir={dir}>
                            <thead>
                                <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                                    <th className="px-8 py-6">الفئة (Category)</th>
                                    <th className="px-8 py-6">المبلغ</th>
                                    <th className="px-8 py-6">التاريخ</th>
                                    <th className="px-8 py-6">الوصف</th>
                                    <th className="px-8 py-6">الوقت والتسجيل</th>
                                    <th className="px-8 py-6">التحكم</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">جاري الدخول للأرشيف المالي...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredExpenses.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs opacity-50">
                                            لا توجد مصاريف مسجلة
                                        </td>
                                    </tr>
                                ) : (
                                    filteredExpenses.map((expense) => (
                                        <tr key={expense.id} className="hover:bg-red-50/30 transition-colors group">
                                            <td className="px-8 py-6">
                                                <span className="font-extrabold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                                                    {expense.category}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="font-black text-red-600 text-lg tracking-tighter">{expense.amount} درهم</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-[11px] font-extrabold text-slate-500">
                                                    {expense.expense_date ? new Date(expense.expense_date).toLocaleDateString('ar-MA') : '—'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-[12px] font-bold text-slate-600 max-w-[200px] truncate">
                                                    {expense.description || 'بدون تفاصيل'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-[10px] font-bold text-slate-400">
                                                {new Date(expense.created_at).toLocaleString('ar-MA')}
                                            </td>
                                            <td className="px-8 py-6 text-left">
                                                <div className={`flex justify-start gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                    <button onClick={() => handleEditExpenseClick(expense)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-slate-100/50 rounded-xl transition-all"><Edit2 size={18} /></button>
                                                    <button onClick={() => handleDeleteExpense(expense.id)} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Alert History Section */}
            {alertHistory.length > 0 && (
                <div className="mt-10 bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden border-b-8 border-b-indigo-900 animate-slide-up">
                    <div className="px-8 py-6 border-b border-slate-100 bg-indigo-50/30 flex items-center justify-between flex-row-reverse">
                        <h3 className="font-extrabold text-indigo-900 text-lg flex items-center gap-3 flex-row-reverse">
                            <BellRing size={20} /> نتائج فحص الأداء الأخير
                        </h3>
                        <button onClick={() => setAlertHistory([])} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-all">إخفاء النتائج</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right" dir="rtl">
                            <thead>
                                <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black border-b border-slate-100">
                                    <th className="px-8 py-4">اللاعب</th>
                                    <th className="px-8 py-4">الحالة الجديدة</th>
                                    <th className="px-8 py-4 text-left">التنبيه</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {alertHistory.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-indigo-50/20 transition-colors">
                                        <td className="px-8 py-4 font-bold text-slate-800 text-sm">{item.player}</td>
                                        <td className="px-8 py-4">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                                                item.new_alert === 'approaching' ? 'bg-blue-100 text-blue-700' :
                                                item.new_alert === 'late' ? 'bg-amber-100 text-amber-700' :
                                                item.new_alert === 'suspended' ? 'bg-red-100 text-red-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {item.new_alert === 'approaching' ? 'قرب الموعد' :
                                                 item.new_alert === 'late' ? 'تأخير في الأداء' :
                                                 item.new_alert === 'suspended' ? 'تنبيه التعليق' :
                                                 item.new_alert === 'terminated' ? 'موقوف نهائياً' : item.new_alert}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-left">
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">تم إرسال الإشعار ✓</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Payment Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in text-right" dir="rtl">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg premium-shadow overflow-hidden border border-slate-200">
                        <div className="px-10 py-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-row-reverse">
                            <h3 className="font-black text-slate-800 text-2xl tracking-tight">{isEditMode ? 'تعديل المعاملة' : 'تسجيل عملية قبض'}</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-all"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmitPayment} className="p-10 space-y-6 text-right">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">اختيار اللاعب / المنخرط</label>
                                <select
                                    name="user_id"
                                    value={formData.user_id}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-right cursor-pointer shadow-sm appearance-none"
                                >
                                    <option value="" disabled>— اختر من القائمة —</option>
                                    {players.map(p => (
                                        <option key={p.user_id} value={p.user_id}>{p.full_name} ({p.u_category})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">المبلغ (درهم)</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleInputChange}
                                        required min="0" step="0.01"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-emerald-500/10 text-right shadow-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الوسيلة</label>
                                    <select
                                        name="payment_method"
                                        value={formData.payment_method}
                                        onChange={handleInputChange}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none text-right shadow-sm cursor-pointer appearance-none"
                                    >
                                        <option value="Cash">نقداً / كاش</option>
                                        <option value="Card">بطاقة بنكية</option>
                                        <option value="Bank Transfer">تحويل / إيداع</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">وضعية التحصيل الآن</label>
                                <div className="grid grid-cols-2 bg-slate-50 p-2 rounded-2xl gap-2 border border-slate-100 flex-row-reverse">
                                    <button
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, status: 'Completed' }))}
                                        className={`py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm ${formData.status === 'Completed' ? 'bg-white text-emerald-600 border border-emerald-100 ring-4 ring-emerald-500/5' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        مؤدى (تم القبض)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(p => ({ ...p, status: 'Pending' }))}
                                        className={`py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm ${formData.status === 'Pending' ? 'bg-white text-amber-600 border border-amber-100 ring-4 ring-amber-500/5' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        معلق (في الانتظار)
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">ملاحظات (اختياري)</label>
                                <input
                                    type="text"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 text-right shadow-sm"
                                    placeholder="مثلا: اشتراك شهر اكتوبر"
                                />
                            </div>

                            {!isEditMode && formData.user_id && (
                                <div className="mt-4 p-8 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden text-right">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-[80px] opacity-10"></div>
                                    <div className="mb-6 relative z-10">
                                        <label className="block text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">كوبون تخفيض</label>
                                        <div className="flex gap-3 flex-row-reverse">
                                            <input
                                                type="text"
                                                value={couponCodeInput}
                                                onChange={(e) => setCouponCodeInput(e.target.value)}
                                                className="flex-1 px-5 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm font-black text-white uppercase placeholder:normal-case focus:border-emerald-500 transition-all outline-none"
                                                placeholder="أدخل الرمز هنا..."
                                                disabled={appliedCoupon !== null}
                                            />
                                            {appliedCoupon ? (
                                                <button type="button" onClick={handleRemoveCoupon} className="px-6 py-3.5 bg-red-500/10 text-red-500 font-black text-[10px] uppercase rounded-xl hover:bg-red-500/20 transition-all">إلغاء</button>
                                            ) : (
                                                <button type="button" onClick={handleApplyCoupon} className="px-6 py-3.5 bg-emerald-600 text-white font-black text-[10px] uppercase rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all">تطبيق</button>
                                            )}
                                        </div>
                                        {couponError && <p className="text-red-400 text-[9px] mt-2 font-black uppercase">{couponError}</p>}
                                    </div>

                                    {amountBreakdown && (
                                        <div className="space-y-4 border-t border-white/10 pt-6 relative z-10">
                                            {amountBreakdown.lines.map((line, idx) => (
                                                <div key={idx} className="flex justify-between items-center flex-row-reverse text-[11px] font-bold">
                                                    <span className="text-slate-400 uppercase tracking-widest">{line.label}</span>
                                                    <span className={`${line.isDeduction ? 'text-red-400' : 'text-slate-100'}`}>
                                                        {line.isDeduction ? '-' : ''}{Math.abs(line.value).toFixed(2)} درهم
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between items-center flex-row-reverse pt-4 mt-2 border-t border-white/10">
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">الإجمالي المستحق</span>
                                                <span className="text-2xl font-black text-white tracking-tighter">{amountBreakdown.finalAmount.toFixed(2)} درهم</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="pt-8 flex gap-4 justify-end items-center border-t border-slate-100 mt-4 flex-row-reverse">
                                <button type="submit" className="flex-1 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/40 transition-all transform active:scale-95">
                                    {isEditMode ? 'تحديث البيانات المذكورة' : 'تأكيد عملية القبض'}
                                </button>
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-10 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Expense Modal */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in text-right" dir="rtl">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg premium-shadow overflow-hidden border border-slate-200">
                        <div className="px-10 py-8 border-b border-slate-100 bg-red-50 flex justify-between items-center flex-row-reverse">
                            <h3 className="font-black text-red-800 text-2xl tracking-tight flex items-center gap-3">
                                <MinusCircle size={24} /> {editingExpenseId ? 'تعديل المصروف' : 'تسجيل مصروف جديد'}
                            </h3>
                            <button onClick={() => setIsExpenseModalOpen(false)} className="text-red-400 hover:text-red-600 p-2 hover:bg-white rounded-full transition-all"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmitExpense} className="p-10 space-y-6 text-right">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">المبلغ المخصوم (درهم)</label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={expenseFormData.amount}
                                        onChange={handleExpenseChange}
                                        required min="0" step="0.01"
                                        className="w-full px-6 py-4 bg-red-50/30 border border-red-100 rounded-2xl text-sm font-black text-red-600 outline-none focus:ring-4 focus:ring-red-500/10 text-right shadow-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">تاريخ المصروف</label>
                                    <input
                                        type="date"
                                        name="expense_date"
                                        value={expenseFormData.expense_date}
                                        onChange={handleExpenseChange}
                                        required
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-slate-500/10 text-right shadow-sm appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">صنف المصروف</label>
                                <select
                                    name="category"
                                    value={expenseFormData.category}
                                    onChange={handleExpenseChange}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm cursor-pointer appearance-none text-right"
                                >
                                    <option value="Salaires">رواتب المدربين (Salaires)</option>
                                    <option value="Équipement">معدات/ألبسة (Équipement)</option>
                                    <option value="Loyer">كراء ملعب (Loyer)</option>
                                    <option value="Transport">نقل (Transport)</option>
                                    <option value="Autre">أخرى (Autre)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">تفاصيل إضافية</label>
                                <textarea
                                    name="description"
                                    value={expenseFormData.description}
                                    onChange={handleExpenseChange}
                                    rows="3"
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-slate-500/10 text-right shadow-sm resize-none"
                                    placeholder="مثلا: كراء الملعب لشهر نونبر، شراء 20 كرة..."
                                ></textarea>
                            </div>

                            <div className="pt-8 flex gap-4 justify-end items-center border-t border-slate-100 mt-4 flex-row-reverse">
                                <button type="submit" className="flex-1 py-5 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red-600/20 hover:shadow-red-600/40 transition-all transform active:scale-95">
                                    {editingExpenseId ? 'تحديث المصروف' : 'تسجيل سحب / مصروف'}
                                </button>
                                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-10 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Dialogs */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen && confirmDialog.type === 'payment'}
                onConfirm={confirmDeletePayment}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null, type: '' })}
                isRTL={isRTL}
                title="حذف الدفعة"
                message="هل أنت متأكد من حذف هذه الدفعة نهائياً؟"
            />
            <ConfirmDialog
                isOpen={confirmDialog.isOpen && confirmDialog.type === 'expense'}
                onConfirm={confirmDeleteExpense}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null, type: '' })}
                isRTL={isRTL}
                title="حذف المصروف"
                message="هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع."
            />
            <ConfirmDialog
                isOpen={confirmDialog.isOpen && confirmDialog.type === 'quickpay'}
                onConfirm={() => confirmDialog.data && doQuickPay(confirmDialog.data) && setConfirmDialog({ isOpen: false, id: null, type: '' })}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null, type: '' })}
                isRTL={isRTL}
                title="تأكيد استلام المبلغ"
                message="هل تأكدت من استلام المبلغ وتسجيله كمؤدى؟"
                confirmText="نعم، وصلنا؜"
            />
        </div>
    );
};

export default FinancesManagement;
