import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    PlusCircle,
    RefreshCw,
    FileText,
    X,
    DollarSign,
    MinusCircle
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import InvoiceModal from '../../components/InvoiceModal';

// Subcomponents
import FinancesKpiCards from './components/FinancesKpiCards';
import PaymentModal from './components/PaymentModal';
import ExpenseModal from './components/ExpenseModal';
import PaymentsTable from './components/PaymentsTable';
import ExpensesTable from './components/ExpensesTable';

const FinancesManagement = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t, isRTL, dir } = useLanguage();
    const toast = useToast();
    const [payments, setPayments] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [players, setPlayers] = useState([]);
    const [activeTab, setActiveTab] = useState('revenues');
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
    const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null, type: '' });
    const [invoicePayment, setInvoicePayment] = useState(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const showBanner = (message, type = 'success') => {
        if (type === 'error') toast.error(message);
        else toast.success(message);
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
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        }
    }, [location.state?.timestamp]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [paymentsRes, playersRes, settingsRes, expensesRes] = await Promise.all([
                authFetch(`${API_URL}/finances/payments`),
                authFetch(`${API_URL}/players/`),
                authFetch(`${API_URL}/settings/`),
                authFetch(`${API_URL}/finances/expenses`)
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
            const res = await authFetch(`${API_URL}/coupons/validate/${couponCodeInput.trim()}`);
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
            const res = await authFetch(`${API_URL}/finances/payments/${payment.id}`, {
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
            const res = await authFetch(isEditMode ? `${API_URL}/finances/payments/${editingId}` : `${API_URL}/finances/payments`, {
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
            const res = await authFetch(`${API_URL}/finances/payments/${paymentId}`, { method: 'DELETE' });
            if (res.ok) { setPayments(prev => prev.filter(p => p.id !== paymentId)); showBanner('تم الحذف بنجاح', 'success'); }
        } catch { showBanner('خطأ في الحذف', 'error'); }
    };

    const runAlertCheck = async () => {
        setIsCheckingAlerts(true);
        try {
            const res = await authFetch(`${API_URL}/finances/alert-check`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
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
            const res = await authFetch(editingExpenseId ? `${API_URL}/finances/expenses/${editingExpenseId}` : `${API_URL}/finances/expenses`, {
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
            const res = await authFetch(`${API_URL}/finances/expenses/${id}`, { method: 'DELETE' });
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
                    <button
                        onClick={() => navigate('/saas/analytics')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
                        title="Exporter le Rapport"
                    >
                        <FileText size={18} />
                        <span>{isRTL ? 'تصدير التقرير' : 'Rapport'}</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <FinancesKpiCards
                totalRevenue={totalRevenue}
                pendingAmount={pendingAmount}
                totalExpenses={totalExpenses}
                netProfit={netProfit}
                t={t}
                isRTL={isRTL}
            />

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
            {activeTab === 'revenues' ? (
                <PaymentsTable
                    isLoading={isLoading}
                    filteredPayments={filteredPayments}
                    t={t}
                    isRTL={isRTL}
                    dir={dir}
                    setReceiptUrl={setReceiptUrl}
                    setIsReceiptModalOpen={setIsReceiptModalOpen}
                    handleQuickPay={handleQuickPay}
                    handleDeletePayment={handleDeletePayment}
                    setInvoicePayment={setInvoicePayment}
                    handleEditClick={handleEditClick}
                    navigate={navigate}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                />
            ) : (
                <ExpensesTable
                    isLoading={isLoading}
                    filteredExpenses={filteredExpenses}
                    t={t}
                    isRTL={isRTL}
                    dir={dir}
                    handleEditExpenseClick={handleEditExpenseClick}
                    handleDeleteExpense={handleDeleteExpense}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                />
            )}

            {/* Modals */}
            <PaymentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSubmit={handleSubmitPayment}
                isEditMode={isEditMode}
                formData={formData}
                handleInputChange={handleInputChange}
                players={players}
                isSubmitting={isLoading}
                couponCodeInput={couponCodeInput}
                setCouponCodeInput={setCouponCodeInput}
                appliedCoupon={appliedCoupon}
                handleRemoveCoupon={handleRemoveCoupon}
                handleApplyCoupon={handleApplyCoupon}
                couponError={couponError}
                amountBreakdown={amountBreakdown}
                isRTL={isRTL}
            />

            <ExpenseModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                onSubmit={handleSubmitExpense}
                editingExpenseId={editingExpenseId}
                expenseFormData={expenseFormData}
                handleExpenseChange={handleExpenseChange}
            />

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
                confirmText="نعم، وصلنا"
            />

            <InvoiceModal
                isOpen={!!invoicePayment}
                onClose={() => setInvoicePayment(null)}
                payment={invoicePayment}
                academyName={academySettings?.academy_name}
                academyLogo={academySettings?.logo_url}
                isRTL={isRTL}
            />

            {/* Receipt Modal */}
            {isReceiptModalOpen && receiptUrl && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in" onClick={() => setIsReceiptModalOpen(false)}>
                    <div className="relative max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-black text-slate-800">{isRTL ? 'إيصال الدفع' : 'Payment Receipt'}</h3>
                            <button onClick={() => setIsReceiptModalOpen(false)} className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 bg-slate-100/50 flex justify-center items-center min-h-[300px]">
                            {receiptUrl.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/) ? (
                                <img src={receiptUrl} alt="Receipt" className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-sm border border-slate-200" />
                            ) : (
                                <iframe src={receiptUrl} className="w-full h-[70vh] rounded-xl shadow-sm border border-slate-200 bg-white" title="Receipt Preview" />
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-white flex justify-center gap-4">
                            <a href={receiptUrl} target="_blank" rel="noreferrer" className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                                <FileText size={16} />
                                {isRTL ? 'فتح في نافذة جديدة' : 'Open in New Tab'}
                            </a>
                            <button onClick={() => setIsReceiptModalOpen(false)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-colors">
                                {isRTL ? 'إغلاق' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinancesManagement;
